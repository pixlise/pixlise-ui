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

import { Observable, combineLatest, from, of } from "rxjs";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { InterpreterDataSource } from "./interpreter-data-source";

const { LuaFactory, LuaLibraries } = require("wasmoon");


export class LuaDataQuerier
{
    private static _lua = null;
    private static _context: LuaDataQuerier = null;
    private static _loggedTables = [];
    private static _makeLuaTableTime = 0;
    private static _debug = false;
    private static _luaLibImports = "";
    private static _luaUseReplay = false;

    constructor(
        private _dataSource: InterpreterDataSource,
        private _logTables: boolean = false
    )
    {
    }

    public static initLua(): Observable<void>
    {
        // NOTE: WE NEVER DO THIS:
        // DataQuerier._lua.global.close()
        // DO WE NEED TO???

        console.log("Initializing Lua...");
        return new Observable<void>(
            (observer)=>
            {
                // Initialize a new lua environment factory
                // Pass our hosted wasm file location in here. Simplest method is relative path to served location
                let wasmURI = "assets/lua/glue.wasm";
                console.log("Loading WASM from: "+wasmURI);

                const factory = new LuaFactory(wasmURI);
                const luaOpts = {
                    openStandardLibs: true,
                    injectObjects: false,
                    enableProxy: false,
                    traceAllocations: false
                };
                let lua = factory.createEngine(luaOpts);
                lua.then((eng)=>
                {
                    console.log("Lua Engine created...");

                    // Save this for later
                    LuaDataQuerier._lua = eng;

                    // Load std libs we want
                    let t0 = performance.now();
                    
                    LuaDataQuerier._lua.global.loadLibrary(LuaLibraries.Debug);

                    let t1 = performance.now();
                    console.log("Lua Engine std libs loaded "+(t1-t0).toLocaleString()+"ms...");

                    // Set up the functions Lua can call to get data, eg element()
                    if(!LuaDataQuerier._luaUseReplay)
                    {
                        // NOTE: we DON'T do this if we're replaying, because we want Lua implemented
                        //       functions to hijack these calls instead!
                        LuaDataQuerier.setupPIXLISELuaFunctions();
                    }

                    // Add PIXLISE Lua libraries
                    let libFiles = ["Map.lua"];
                    if(LuaDataQuerier._luaUseReplay)
                    {
                        // Pull in the replay data
                        libFiles.push("FuncRunner.lua");
                    }
                    let libFileResults$ = [];

                    for(let lib of libFiles)
                    {
                        libFileResults$.push(from(fetch("assets/lua/"+lib)));
                    }
                    
                    let allFiles$ = combineLatest(libFileResults$);
                    allFiles$.subscribe(
                        (responses)=>
                        {
                            // At this point we've received all the file responses, now we need to turn them into text
                            let libFileContents$ = [];
                            let libNames = [];

                            for(let resp of responses)
                            {
                                let respItem = resp as Response;
                                
                                let libNameStart = respItem.url.lastIndexOf("/");
                                let libNameEnd = respItem.url.indexOf(".lua");

                                if(libNameStart < 0 || libNameEnd < libNameStart)
                                {
                                    throw new Error("Failed to get lib name from received Lua library: "+respItem.url);
                                }

                                let libName = respItem.url.substring(libNameStart+1, libNameEnd);

                                if(respItem.status != 200)
                                {
                                    throw new Error("Failed to get Lua library: "+libName)
                                }

                                libFileContents$.push(from(respItem.text()));

                                // Remember the names in the order in which they were received
                                libNames.push(libName);

                                // Remember this as an import
                                LuaDataQuerier._luaLibImports += "local "+libName+" = make"+libName+"Lib()\n";
                            }

                            // Once all have loaded, pass them into Lua
                            let allFileContents$ = combineLatest(libFileContents$);
                            allFileContents$.subscribe(
                                (fileContents)=>
                                {
                                    let c = 0;
                                    for(let lib of fileContents)
                                    {
                                        let libName = libNames[c];
                                        let t0 = performance.now();

                                        // Set up constants/functions that can be accessed from Lua
                                        // NOTE: at this point we wrap the Lua module so it looks like a function
                                        let importDef = "function make"+libName+"Lib()\n"+lib+"\nend";
                                        LuaDataQuerier._lua.doStringSync(importDef);

                                        let t1 = performance.now();
                                        console.log("  Added PIXLISE Lua library: "+libName+" in "+(t1-t0).toLocaleString()+"ms...");
                                        c++;
                                    }
                                    observer.complete();
                                },
                                (err)=>
                                {
                                    throw new Error("Failed to download PIXLISE Lua library: "+err+"\n"+err["message"]+"\n"+err["stack"]);
                                }
                            );
                        }
                    );
                }).catch((err)=>
                {
                    console.error(err);
                    observer.error(err);
                });
            }
        );
    }

    private static LuaFunctionNames = ["element", "elementSum", "data", "spectrum", "spectrumDiff", "pseudo", "housekeeping", "diffractionPeaks", "roughness", "position", "makeMap"];
    private static LuaFunctionArgCounts = [3, 2, 2, 3, 3, 1, 1, 2, 0, 1, 1];
    private static LuaFuncs = [LuaDataQuerier.LreadElement, LuaDataQuerier.LreadElementSum, LuaDataQuerier.LreadDataColumn, LuaDataQuerier.LreadSpectrum, LuaDataQuerier.LreadSpectrumDiff, LuaDataQuerier.LreadPseudoIntensity, LuaDataQuerier.LreadHouseKeeping, LuaDataQuerier.LreadDiffractionPeaks, LuaDataQuerier.LreadRoughness, LuaDataQuerier.LreadPosition, LuaDataQuerier.LmakeMap];

    private static setupPIXLISELuaFunctions(): void
    {
        // Implementing original expression language
        let prefix = "";
        if(LuaDataQuerier._debug)
        {
            prefix = "P";
        }

        for(let c = 0; c < LuaDataQuerier.LuaFunctionNames.length; c++)
        {
            LuaDataQuerier._lua.global.set(prefix+LuaDataQuerier.LuaFunctionNames[c], LuaDataQuerier.LuaFuncs[c]);
        }

        // Special simple one, we don't have debugging for this
        LuaDataQuerier._lua.global.set("atomicMass", (symbol)=>
        {
            return periodicTableDB.getMolecularMass(symbol);
        });
    }

    // See: https://github.com/ceifa/wasmoon
    public runQuery(origExpression: string): Observable<PMCDataValues>
    {
        let t0 = performance.now();
        LuaDataQuerier._makeLuaTableTime = 0;

        let exprFuncName = "expression";
        let expression = this.formatLuaCallable(origExpression, exprFuncName);

        // Set context for this run
        LuaDataQuerier._context = this;

        let result = null;
        try
        {
            LuaDataQuerier._loggedTables = [];

            // Run a lua string
            result = LuaDataQuerier._lua.doStringSync(expression);

            // Log the tables
            if(this._logTables)
            {
                this.logTables();
            }
        }
        catch (err)
        {
            console.error(err);
            LuaDataQuerier._lua.global.dumpStack(console.error);
            /* NOTE: This doesn't print any more than the above...
                // Print out everything...
                for(let c = 1; c < 10; c++)
                {
                    const traceback = LuaDataQuerier._lua.global.lua.lua_tolstring(LuaDataQuerier._lua.global.address, -c, null);
                    console.log(traceback);
                }
            */
            throw new Error(err);
        }
        finally
        {
            // Clear the function code that just ran
            LuaDataQuerier._lua.global.set(exprFuncName, null);

            // Clear the context, don't want any Lua code to execute with us around any more
            LuaDataQuerier._context = null;

            // Close the lua environment, so it can be freed
            //LuaDataQuerier._lua.global.close()
        }

        if(result)
        {
            // We got an object back that represents a table in Lua. Here we assume this is a PMCDataValue[] effectively
            // so lets convert it to something we'll use here (PMCDataValues)
            result = this.readLuaTable(result);

let t1 = performance.now();
console.log(">>> Lua expression took: "+(t1-t0).toLocaleString()+"ms, makeTable calls took: "+LuaDataQuerier._makeLuaTableTime+"ms");

            return of(result);
        }

        throw new Error("Expression: "+expression+" did not complete");
    }

    private formatLuaCallable(origExpression: string, luaExprFuncName: string): string
    {
        // Make it into a function, so if we get called again, we overwrite
        let expression = LuaDataQuerier._luaLibImports+"\n";
        if(LuaDataQuerier._luaUseReplay)
        {
            // Reset replay
            expression += "FuncRunner.resetReplay()\n";
        }

        if(LuaDataQuerier._debug)
        {
            expression += `function printMap(m, comment)
    print(comment.." map size: "..#m[1])
    for k, v in ipairs(m[1]) do
        print(v.."="..m[2][k])
    end
end\n`
        }

        expression += "local function "+luaExprFuncName+"()\n"

        expression += origExpression+"\nend\n";

        if(LuaDataQuerier._debug)
        {
            expression += "t0=os.clock()\n";
            expression += "times = {}\n"

            for(let funcName of LuaDataQuerier.LuaFunctionNames)
            {
                expression += `times["${funcName}"] = 0\n`;
            }

            // Add wrappers for our functions
            for(let f = 0; f < LuaDataQuerier.LuaFunctionNames.length; f++)
            {
                // Add a wrapper with timing code around it that accumulates it
                let funcName = LuaDataQuerier.LuaFunctionNames[f];
                expression += "function "+funcName+"(";

                let argList = "";
                for(let c = 0; c < LuaDataQuerier.LuaFunctionArgCounts[f]; c++)
                {
                    if(argList.length > 0)
                    {
                        argList += ",";
                    }

                    argList += "a"+c;
                }
                expression += argList+")";
                expression += `
  local t0=os.clock()
  local funcResult = P${funcName}(${argList})
  local t1=os.clock()
  times["${funcName}"] = times["${funcName}"]+(t1-t0)
  return funcResult
end
`;
            }
        }
        expression += "result = "+luaExprFuncName+"()\n";

        if(LuaDataQuerier._debug)
        {
            expression += "t1=os.clock()\nprint(\"Code ran for: \"..(t1-t0))\nlocal timesTotal=0\n";
            // Print out the table too
            expression += "for k, v in pairs(times) do\n  print(k..\" took: \"..v)\n  timesTotal = timesTotal+v\nend\nprint(\"Total functions: \"..timesTotal)\n"
        }

        expression += "return result\n";
        return expression;
    }

    private static LreadElement(symbol, column, detector)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readElement([symbol, column, detector]));
    }
    private static LreadElementSum(column, detector)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readElementSum([column, detector]));
    }
    private static LreadDataColumn(column, detector)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readMap([column, detector]));
    }
    private static LreadSpectrum(startChannel, endChannel, detector)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readSpectrum([startChannel, endChannel, detector]));
    }
    private static LreadSpectrumDiff(startChannel, endChannel, op)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readSpectrumDifferences([startChannel, endChannel, op]));
    }
    private static LreadPseudoIntensity(elem)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readPseudoIntensity([elem]));
    }
    private static LreadHouseKeeping(column)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readHousekeepingData([column]));
    }
    private static LreadDiffractionPeaks(eVstart, eVend)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readDiffractionData([eVstart, eVend]));
    }
    private static LreadRoughness()
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readRoughnessData([]));
    }
    private static LreadPosition(axis)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.readPosition([axis]));
    }
    private static LmakeMap(value)
    {
        return LuaDataQuerier.makeLuaTable(LuaDataQuerier._context._dataSource.makeMap([value]));
    }

    // Expecting results to come back as table with 2 arrays in it, one for pmc, one for values
    // So Lua code for one:
    // t = {{1,3,7},{3.5,5.7,1.1}}
    // Expecting it come back as:
    // [[1,3,7],[3.5,5.7,1.1]]
    private readLuaTable(table: any): PMCDataValues
    {
        if(table.length != 2)
        {
            throw new Error("Table expected to have arrays, has: "+table.length);
        }

        let values: PMCDataValue[] = [];
        let c = 0;
        for(let pmc of table[0])
        {
            let value: number = table[1][c];
            let isUndef = false;
            if(value === null)
            {
                value = 0;
                isUndef = true;
            }

            values.push(new PMCDataValue(pmc, value, isUndef));
            c++;
        }

        return PMCDataValues.makeWithValues(values);
    }

    private static makeLuaTable(data: PMCDataValues): any
    {
        let t0 = performance.now();
        let pmcs = [];
        let values = [];
        for(let item of data.values)
        {
            //if(item.pmc < 130 && item.pmc > 126)
            {
                pmcs.push(item.pmc);
                values.push(item.isUndefined ? null : item.value);
            }
        }

        let luaTable = [pmcs, values];

        if(LuaDataQuerier._context._logTables)
        {
            // Save table for later
            LuaDataQuerier._loggedTables.push(luaTable);
        }

        let t1 = performance.now();
        
        LuaDataQuerier._makeLuaTableTime += t1-t0;
        return luaTable;
    }

    private logTables()
    {
        let luaTableText = "allTables = {";

        for(let table of LuaDataQuerier._loggedTables)
        {
            luaTableText += " {\n";

            for(let row of table)
            {
                luaTableText += "  {";

                let first = true;
                for(let col of row)
                {
                    if(!first)
                    {
                        luaTableText += ","
                    }
                    luaTableText += col;
                    first = false;
                }

                luaTableText += "},\n";
            }

            luaTableText += " },\n";
        }

        luaTableText += "}"
        console.log(luaTableText);
    }
}
