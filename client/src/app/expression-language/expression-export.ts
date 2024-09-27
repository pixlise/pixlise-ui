import { DatePipe } from "@angular/common";
import { Observable, throwError, concatMap, from, switchMap, map, combineLatest } from "rxjs";
import { DataExpression } from "../generated-protos/expressions";
import { DataQueryResult, PMCDataValues } from "./data-values";
import { DataQuerier, EXPR_LANGUAGE_LUA } from "./expression-language";
import { InterpreterDataSource } from "./interpreter-data-source";
import { ExpressionDataSource } from "../modules/pixlisecore/models/expression-data-source";
import { LoadedSources, WidgetDataService } from "../modules/pixlisecore/services/widget-data.service";
import { DataModuleHelpers } from "./data-module-helpers";
import { WidgetExportData } from "../modules/widget/components/widget-export-dialog/widget-export-model";
import { APICachedDataService } from "../modules/pixlisecore/services/apicacheddata.service";
import { loadCodeForExpression } from "./expression-code-load";
import { PredefinedROIID } from "../models/RegionOfInterest";
import { EnergyCalibrationService } from "../modules/pixlisecore/services/energy-calibration.service";
import { SpectrumEnergyCalibration } from "../models/BasicTypes";
import { SpectrumDataService } from "../modules/pixlisecore/services/spectrum-data.service";

export class ExpressionExporter {
  exportExpressionCode(
    expression: DataExpression,
    scanId: string,
    quantId: string,
    cachedDataService: APICachedDataService,
    spectrumDataService: SpectrumDataService,
    energyCalibrationService: EnergyCalibrationService
  ): Observable<WidgetExportData> {
    const result: WidgetExportData = { luas: [], mds: [], csvs: [] };
    const querier = new DataQuerier();

    if (expression.sourceLanguage != EXPR_LANGUAGE_LUA) {
      return throwError(() => new Error("Only expressions written in the Lua programming language can be exported"));
    }

    const req$: any[] = [loadCodeForExpression(expression, cachedDataService), energyCalibrationService.getCurrentCalibration(scanId)];

    const builtInMods = DataModuleHelpers.getBuiltInModuleNames();
    for (const lib of builtInMods) {
      req$.push(DataModuleHelpers.getBuiltInModuleSource(lib));
    }

    return combineLatest(req$).pipe(
      switchMap((resps: any[]) => {
        const sources: LoadedSources = resps[0];
        const calibration: SpectrumEnergyCalibration[] = resps[1];

        // We need a data source because we'll be executing the expression to record results
        // which are then saved in separate CSV files. This allows us to export exactly what
        // goes into an expression as opposed to exporting everything and writing some import
        // code in Lua that knows how to get the required column
        const dataSource = new ExpressionDataSource();

        return dataSource.prepare(cachedDataService, spectrumDataService, scanId, quantId, PredefinedROIID.getAllPointsForScan(scanId), calibration).pipe(
          switchMap(() => {
            const intDataSource = new InterpreterDataSource(dataSource, dataSource, dataSource, dataSource, dataSource);

            // Built-in modules
            for (let c = 2; c < resps.length; c++) {
              const name = builtInMods[c - 2];
              const src = resps[c] as string;

              result.luas!.push({
                fileName: name + ".lua",
                subFolder: "expression",
                data: this.makeExportableModule(name, "", "", src),
              });
            }

            // Each module referenced
            for (const modRef of expression.moduleReferences) {
              let found = false;
              for (const modSrc of sources.modules) {
                if (modRef.version && modRef.moduleId === modSrc.id) {
                  found = true;
                  const verStr = `${modRef.version.major}.${modRef.version.minor}.${modRef.version.patch}`;
                  result.luas!.push({
                    fileName: modSrc.name + "-v" + this.makeSourceCompatibleVersionString(verStr) + ".lua",
                    subFolder: "expression",
                    data: this.makeExportableModule(modSrc.name, verStr, modSrc.id, modSrc.moduleVersion.sourceCode),
                  });

                  break;
                }
              }

              if (!found) {
                throw new Error("Failed to get source code for module: " + modRef.moduleId + "-v" + modRef.version);
              }
            }

            // Exporting: The source of the expression
            if (!sources.expressionSrc) {
              throw new Error("Failed to get source code for expression: " + expression.name);
            }

            result.luas!.push({
              fileName: expression.name + ".lua",
              subFolder: "expression",
              data: this.makeExportableExpression(expression, sources),
            });

            // The main file
            result.luas!.push({
              fileName: "Main.lua",
              subFolder: "expression",
              data: this.makeExportableMainFile(expression.name),
            });

            // The readme file
            result.mds!.push({
              fileName: "README.md",
              subFolder: "expression",
              data: this.makeReadme(expression),
            });

            // Now execute the expression to record all the data it requires

            // Pass in the source and module sources separately
            const modSources = WidgetDataService.makeRunnableModules(sources.modules);

            return querier.runQuery(sources.expressionSrc, modSources, expression.sourceLanguage, intDataSource, true, true).pipe(
              map((queryResult: DataQueryResult) => {
                // NOTE: we save the final result in a CSV so it can be diffed against what is executed by running our exported
                // source code outside PIXLISE.
                // NOTE2: we do save the required data that the expression requested to individual CSV files. Write those to zip file
                for (const [name, data] of queryResult.recordedExpressionInputs) {
                  result.csvs!.push({
                    fileName: name + ".csv",
                    subFolder: "expression/input-data",
                    data: this.makeCSVData(data),
                  });
                }

                if (queryResult.isPMCTable) {
                  result.csvs!.push({
                    fileName: "PIXLISE_output.csv",
                    subFolder: "expression/output-data",
                    data: this.makeCSVData(queryResult.resultValues),
                  });
                }

                // And return the ready to be saved zip
                return result;
              })
            );
          })
        );
      })
    );
  }

  private makeReadme(expr: DataExpression): string {
    const creator = expr.owner?.creatorUser?.name || "unknown";

    const datepipe: DatePipe = new DatePipe("en-US");
    const createTime = datepipe.transform((expr.owner?.createdUnixSec || 0) * 1000, "dd-MMM-YYYY HH:mm:ss");
    const modTime = datepipe.transform(expr.modifiedUnixSec * 1000, "dd-MMM-YYYY HH:mm:ss");
    const nowTime = datepipe.transform(Date.now(), "dd-MMM-YYYY HH:mm:ss");

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
`;
  }

  // Passing src separately because it may have just been looked up, could still be empty in expr...
  private makeExportableExpression(expr: DataExpression, sources: LoadedSources): string {
    const creator = expr.owner?.creatorUser?.name || "unknown";

    const datepipe: DatePipe = new DatePipe("en-US");
    const createTime = datepipe.transform((expr.owner?.createdUnixSec || 0) * 1000, "dd-MMM-YYYY HH:mm:ss");
    const modTime = datepipe.transform(expr.modifiedUnixSec * 1000, "dd-MMM-YYYY HH:mm:ss");
    const nowTime = datepipe.transform(Date.now(), "dd-MMM-YYYY HH:mm:ss");

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
    if (expr.moduleReferences.length > 0) {
      result += "\n-- User module imports:\n";
    }

    // We need to put in the import statements
    for (const ref of expr.moduleReferences) {
      for (const mod of sources.modules) {
        if (ref.moduleId === mod.id && mod.moduleVersion.version) {
          const verStr = `${mod.moduleVersion.version.major}.${mod.moduleVersion.version.minor}.${mod.moduleVersion.version.patch}`;
          result += `local ${mod.name} = require("${mod.name}-v${this.makeSourceCompatibleVersionString(verStr)}")\n`;
        }
      }
    }

    result += "\n-- The expression code starts here:\n";

    result += sources.expressionSrc;

    result += "\n";
    return result;
  }

  private makeExportableModule(modName: string, modVersion: string, modID: string, modSource: string): string {
    // For now, we just put in some comments at the start
    let result = `-- Module exported from PIXLISE (www.pixlise.org)
--     Module name: ${modName}
`;
    if (modVersion) {
      result += `--     Version: ${modVersion}
`;
    }

    if (modID) {
      result += `--     PIXLISE id: ${modID}
`;
    }

    result += modSource;
    return result;
  }

  private makeExportableMainFile(exprName: string): string {
    let builtInRequireLines = "";

    const builtInMods = DataModuleHelpers.getBuiltInModuleNames();
    for (const builtInMod of builtInMods) {
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

  private makeCSVData(pmcData: PMCDataValues): string {
    let result = "";

    for (const item of pmcData.values) {
      if (result.length > 0) {
        result += "\n";
      }

      result += item.pmc + "," + item.value;
    }
    return result;
  }

  private makeSourceCompatibleVersionString(version: string): string {
    return version.replace(/\./g, "_");
  }
}
