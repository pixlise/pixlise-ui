// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Injectable } from "@angular/core";
import { DatePipe } from '@angular/common';

import { Observable, of, combineLatest, from } from "rxjs";
import { map, concatMap } from "rxjs/operators";

import * as JSZip from "jszip";

import { DataExpressionService } from "./data-expression.service";
import { DataModuleService, DataModuleSpecificVersionWire, DataModule } from "src/app/services/data-module.service";

import {
    DiffractionPeakQuerierSource,
    //HousekeepingDataQuerierSource,
    //PseudoIntensityDataQuerierSource,
    QuantifiedDataQuerierSource,
    //SpectrumDataQuerierSource
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues, DataQueryResult } from "src/app/expression-language/data-values";
import { DataSetService } from "src/app/services/data-set.service";
import { DataExpression } from "src/app/models/Expression";
import { DataQuerier, EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { InterpreterDataSource } from "src/app/expression-language/interpreter-data-source";


class LoadedSources
{
    constructor(public expressionSrc: string, public modules: Map<string, DataModuleSpecificVersionWire>)
    {
    }
}

@Injectable({
    providedIn: "root"
})
export class ExpressionRunnerService
{
    private _querier: DataQuerier = null;

    constructor(
        private _datasetService: DataSetService,
        private _moduleService: DataModuleService,
        private _exprService: DataExpressionService,
    )
    {
    }

    runExpression(
        expression: DataExpression,
        quantSource: QuantifiedDataQuerierSource,
        diffractionSource: DiffractionPeakQuerierSource,
        allowAnyResponse: boolean = false
    ): Observable<DataQueryResult>
    {
        if(!this._querier)
        {
            this._querier = new DataQuerier();
        }

        // Set up data source for this query. This just holds stuff, doesn't cost much to create it, but needs to
        // be done for every query because quants, diffraction, could change between runs. Dataset is not likely
        // to but here we do it all at once
        let dataSource = new InterpreterDataSource(
            quantSource,
            this._datasetService.datasetLoaded, // pseudoSource
            this._datasetService.datasetLoaded, // housekeepingSource
            this._datasetService.datasetLoaded, // spectrumSource
            diffractionSource,
            this._datasetService.datasetLoaded
        );

        let load$ = this.loadCodeForExpression(expression);
        
        return load$.pipe(
            concatMap(
                (sources: LoadedSources)=>
                {
                    // We now have the ready-to-go source code, run the query
                    // At this point we should have the expression source and 0 or more modules
                    if(!sources.expressionSrc)
                    {
                        throw new Error("loadCodeForExpression did not return expression source code for: "+expression.id);
                    }

                    let modSources = this.makeRunnableModules(sources.modules);

                    // Pass in the source and module sources separately
                    return this._querier.runQuery(sources.expressionSrc, modSources, expression.sourceLanguage, dataSource, allowAnyResponse, false).pipe(
                        map(
                            (queryResult: DataQueryResult)=>
                            {
                                // Save runtime stats for this expression
                                this._exprService.saveExecutionStats(expression.id, queryResult.dataRequired, queryResult.runtimeMs);

                                // Return the results, but filter for PMCs requested, if need be
                                return queryResult;
                            }
                        )
                    );
                }
            )
        );
    }

    private makeRunnableModules(loadedmodules: Map<string, DataModuleSpecificVersionWire>): Map<string, string>
    {
        // Build the map required by runQuery. NOTE: here we pass the module name, not the ID!
        let modSources = new Map<string, string>();
        for(let [modId, mod] of loadedmodules)
        {
            modSources.set(mod.name, mod.version.sourceCode);
        }
        return modSources;
    }

    private loadCodeForExpression(expression: DataExpression): Observable<LoadedSources>
    {
        // Filter out crazy cases
        if(expression.moduleReferences.length > 0 && expression.sourceLanguage != EXPR_LANGUAGE_LUA)
        {
            throw new Error("Expression "+expression.id+" references modules, but source language is not Lua");
        }

        // If we are a simple loaded expression that doesn't have references, early out!
        let result = new LoadedSources(expression.sourceCode, new Map<string, DataModuleSpecificVersionWire>());
        if(expression.sourceCode.length > 0 && expression.moduleReferences.length <= 0)
        {
            return of(result);
        }

        // This can have blank source code because it was retrieved from the API listing call - in which case we need to query it specifically
        // The expression references any number of modules, which may also have blank source code and also needs to be queried directly!
        let waitSource$: Observable<DataExpression> = null;
        let waitModules$: Observable<DataModuleSpecificVersionWire>[] = [];

        if(expression.sourceCode.length <= 0)
        {
            waitSource$ = this._exprService.getExpressionAsync(expression.id);
        }

        for(let ref of expression.moduleReferences)
        {
            waitModules$.push(this._moduleService.getModule(ref.moduleID, ref.version));
        }

        let toWait$: any[] = [];
        if(waitSource$ != null)
        {
            toWait$.push(waitSource$);
        }
        
        toWait$ = [...toWait$, ...waitModules$];

        let allResults$ = combineLatest(toWait$);
        return allResults$.pipe(
            map(
                (sources: unknown[])=>
                {
                    // Check if we loaded source - if we did, it'll be the first item and has a different data type
                    let firstModuleIdx = 0;
                    if(waitSource$ != null)
                    {
                        let expr = sources[0] as DataExpression;

                        // Use the loaded one
                        result.expressionSrc = expr.sourceCode;

                        // Look at the next ones...
                        firstModuleIdx = 1;
                    }

                    // At this point, we should have all the source code we're interested in. Combine them!
                    for(let c = firstModuleIdx; c < sources.length; c++)
                    {
                        let moduleVersion = sources[c] as DataModuleSpecificVersionWire;
                        result.modules.set(moduleVersion.id, moduleVersion);
                    }

                    return result;
                }
            )
        );
    }

    exportExpressionCode(
        expression: DataExpression,
        quantSource: QuantifiedDataQuerierSource,
        diffractionSource: DiffractionPeakQuerierSource,
        ): Observable<Blob>
    {
        if(!this._querier)
        {
            this._querier = new DataQuerier();
        }

        // We need a data source because we'll be executing the expression to record results
        // which are then saved in separate CSV files. This allows us to export exactly what
        // goes into an expression as opposed to exporting everything and writing some import
        // code in Lua that knows how to get the required column
        let dataSource = new InterpreterDataSource(
            quantSource,
            this._datasetService.datasetLoaded, // pseudoSource
            this._datasetService.datasetLoaded, // housekeepingSource
            this._datasetService.datasetLoaded, // spectrumSource
            diffractionSource,
            this._datasetService.datasetLoaded
        );

        let loadSrc$ = this.loadCodeForExpression(expression);
        let builtIns$ = this._moduleService.getBuiltInModules(true);
        
        return combineLatest([loadSrc$, builtIns$]).pipe(
            concatMap(
                (allSources)=>
                {
                    let sources: LoadedSources = allSources[0];
                    let builtInModules: DataModule[] = allSources[1];

                    let zip = new JSZip();

                    // Built-in modules
                    for(let mod of builtInModules)
                    {
                        let ver = mod.versions.get("0.0.0");
                        if(!ver)
                        {
                            throw new Error("Failed to get source code for built-in module: "+mod.name);
                        }
                        zip.file(mod.name+".lua", this.makeExportableModule(mod.name, "", "", ver.sourceCode));
                    }

                    // Each module referenced
                    for(let modRef of expression.moduleReferences)
                    {
                        let mod = sources.modules.get(modRef.moduleID);
                        if(!mod)
                        {
                            throw new Error("Failed to get source code for module: "+modRef.moduleID+"-v"+modRef.version);
                        }

                        zip.file(mod.name+"-v"+this.makeSourceCompatibleVersionString(mod.version.version)+".lua", this.makeExportableModule(
                            mod.name, mod.version.version, mod.id, mod.version.sourceCode
                        ));
                    }

                    // Exporting: The source of the expression
                    if(!sources.expressionSrc)
                    {
                        throw new Error("Failed to get source code for expression: "+expression.name);
                    }

                    zip.file(expression.name+".lua", this.makeExportableExpression(expression, sources));

                    // The main file
                    zip.file("Main.lua", this.makeExportableMainFile(expression.name));

                    // The readme file
                    zip.file("README.md", this.makeReadme(expression));

                    // Now execute the expression to record all the data it requires
                    let modSources = this.makeRunnableModules(sources.modules);

                    // Pass in the source and module sources separately
                    return this._querier.runQuery(sources.expressionSrc, modSources, expression.sourceLanguage, dataSource, true, true).pipe(
                        concatMap(
                            (queryResult: DataQueryResult)=>
                            {
                                // NOTE: we save the final result in a CSV so it can be diffed against what is executed by running our exported
                                // source code outside PIXLISE.
                                // NOTE2: we do save the required data that the expression requested to individual CSV files. Write those to zip file
                                for(let [name, data] of queryResult.recordedExpressionInputs)
                                {
                                    zip.folder("input-data").file(name+".csv", this.makeCSVData(data));
                                }

                                if(queryResult.isPMCTable)
                                {
                                    zip.folder("output-data").file("PIXLISE_output.csv", this.makeCSVData(queryResult.resultValues));
                                }

                                // And return the ready to be saved zip
                                return from(zip.generateAsync({type: "blob"})) as Observable<Blob>;
                            }
                        )
                    );
                }
            )
        );
    }

    private makeReadme(expr: DataExpression): string
    {
        let creator = expr.creator?.name || "unknown";

        const datepipe: DatePipe = new DatePipe('en-US');
        let createTime = datepipe.transform(expr.createUnixTimeSec*1000, 'dd-MMM-YYYY HH:mm:ss');
        let modTime = datepipe.transform(expr.modUnixTimeSec*1000, 'dd-MMM-YYYY HH:mm:ss');
        let nowTime = datepipe.transform(Date.now(), 'dd-MMM-YYYY HH:mm:ss');

        return `# PIXLISE Expression: ${expr.name}

## What is this?

This is an export of the source code for a PIXLISE expression written in the
Lua programming language. You should be able to execute this by running your
Lua interpreter on the Main.lua function included in this directory.

## Where did it come from?
It was exported from PIXLISE, likely at www.pixlise.org.

### Expression details:
- Name: ${expr.name}
- Programming Language: ${expr.sourceLanguage}
- Creator: ${creator}
- Created Time: ${createTime}
- Modified Time: ${modTime}
- Exported Time: ${nowTime}
- PIXLISE id: ${expr.id}

## How to run it
Make sure you have a Lua interpreter installed and available in your terminal
or command prompt window. At time of writing, we are using Lua 5.4 and have
been able to execute this on Windows using the lua.exe downloaded from:

### Windows download
https://sourceforge.net/projects/luabinaries/files/5.4.2/Tools%20Executables/lua-5.4.2_Win64_bin.zip/download

### Linux download
https://sourceforge.net/projects/luabinaries/files/5.4.2/Tools%20Executables/lua-5.4.2_Linux54_64_bin.tar.gz/download

### Mac installation
\`brew install lua\` if you use homebrew (https://brew.sh), otherwise you may have to build from source.

To run this expression, for example on a Windows machine where the lua
executable is called lua54.exe:
\`lua54 Main.lua\`

If the expression executes successfully and returns map data, it will be printed
to stdout in CSV format (as rows of PMCs,values). To do something more substancial
with the output see the comments at the bottom of Main.lua showing how to access
the returned value and do something with it!

## Export contents

The files exported are:
- \`Main.lua\` - To run the expression
- \`PixliseRuntime.lua\` - Emulates functions available in PIXLISE Lua runtime, but
  re-implemented to read data from CSV files included in ./input-data
- All the built-in modules that are included in the runtime provided to any
  expression in PIXLISE, eg Map
- \`${expr.name}.lua\` - The source code of the expression
- All the user-defined modules "required" by the expression
- \`./input-data/\` - Contains all CSV files required to run this expression, loaded
  by code in PixliseRuntime.lua
- \`./output-data/\` - Contains last output from PIXLISE (NOTE: May not exist if
  the expression did not generated valid output)
`
    }

    // Passing src separately because it may have just been looked up, could still be empty in expr...
    private makeExportableExpression(expr: DataExpression, sources: LoadedSources): string
    {
        let creator = expr.creator?.name || "unknown";

        const datepipe: DatePipe = new DatePipe('en-US');
        let createTime = datepipe.transform(expr.createUnixTimeSec*1000, 'dd-MMM-YYYY HH:mm:ss');
        let modTime = datepipe.transform(expr.modUnixTimeSec*1000, 'dd-MMM-YYYY HH:mm:ss');
        let nowTime = datepipe.transform(Date.now(), 'dd-MMM-YYYY HH:mm:ss');

        let result = `-- Expression exported from PIXLISE (www.pixlise.org)
-- Details:
--     Expression name: ${expr.name}
--     Language: ${expr.sourceLanguage}
--     Creator: ${creator}
--     Created Time: ${createTime}
--     Modified Time: ${modTime}
--     Exported Time: ${nowTime}
--     PIXLISE id: ${expr.id}
`;
        if(expr.moduleReferences.length > 0)
        {
            result += "\n-- User module imports:\n";
        }

        // We need to put in the import statements
        for(let ref of expr.moduleReferences)
        {
            let mod = sources.modules.get(ref.moduleID);
            if(mod)
            {
                result += "local "+mod.name+" = require(\""+mod.name+"-v"+this.makeSourceCompatibleVersionString(mod.version.version)+"\")\n";
            }
        }

        result += "\n-- The expression code starts here:\n";

        result += sources.expressionSrc;

        result += "\n";
        return result;
    }

    private makeExportableModule(modName: string, modVersion: string, modID: string, modSource: string): string
    {
        // For now, we just put in some comments at the start
        let result = `-- Module exported from PIXLISE (www.pixlise.org)
--     Module name: ${modName}
`
        if(modVersion)
        {
            result += `--     Version: ${modVersion}
`;
        }

        if(modID)
        {
            result += `--     PIXLISE id: ${modID}
`;
        }

        result += modSource;
        return result;
    }

    private makeExportableMainFile(exprName: string): string
    {
        let builtInRequireLines = "";

        let builtInMods = DataModuleService.getBuiltInModuleNames();
        for(let builtInMod of builtInMods)
        {
            builtInRequireLines += `${builtInMod} = require("${builtInMod}")\n`;
        }

        return `-- The main file to execute when running a PIXLISE-exported expression

-- Allow loading local modules
package.path = package.path..";../?.lua"

-- PIXLISE runtime emulation:
require("PixliseRuntime")

-- Built-in module imports:
${builtInRequireLines}

-- We define a function around the expression code, so we can execute it at will
-- and store its return value as needed
function TheExpression()

-- Include the actual expression
return require("${exprName}")

end

-- Run the expression, write the results to stdout as CSV
local r = TheExpression()
for idx, mapPMC in ipairs(r[1]) do
    print(mapPMC..","..r[2][idx])
end

-- NOTE: This could easily be modified to do something with the value, for example:
-- Map.getPMCValue(TheExpression(), 4) would return the value for PMC 4
-- Outputting as CSV:
-- writeCSV("output.csv", TheExpression())
`;
    }

    private makeCSVData(pmcData: PMCDataValues): string
    {
        let result = "";

        for(let item of pmcData.values)
        {
            if(result.length > 0)
            {
                result += "\n";
            }

            result += item.pmc+","+item.value
        }
        return result;
    }

    private makeSourceCompatibleVersionString(version: string): string
    {
        return version.replace(/\./g, "_");
    }
}