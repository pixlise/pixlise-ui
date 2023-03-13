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
import { map, mergeMap, concatMap } from "rxjs/operators";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { InterpreterDataSource } from "./interpreter-data-source";
import { randomString } from "src/app/utils/utils";

const { LuaFactory, LuaLibraries } = require("wasmoon");


export class LuaDataQuerier
{
    // An id we use for logging about this Lua runner
    private _id = randomString(4);
    private _logId: string = "";

    private _lua = null;
    private _loggedTables = [];
    private _makeLuaTableTime = 0; // Total time spent returning Tables to Lua from things like element() Lua call
    private _luaLibImports = "";

    private _dataSource: InterpreterDataSource = null;

    constructor(
        private _debug: boolean,
        private _luaUseReplay: boolean,
        private _logTables: boolean
    )
    {
        this._logId = "["+this._id+"] ";
    }

    private initLua(): Observable<void>
    {
        // NOTE: WE NEVER DO THIS:
        // DataQuerier._lua.global.close()
        // DO WE NEED TO???

        let luat0 = performance.now();

        console.log(this._logId+"Initializing Lua...");
        return new Observable<void>(
            (observer)=>
            {
                // Initialize a new lua environment factory
                // Pass our hosted wasm file location in here. Simplest method is relative path to served location
                let wasmURI = "assets/lua/glue.wasm";
                console.log(this._logId+"Loading WASM from: "+wasmURI);

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
                    this._lua = eng;

                    console.log(this._logId+"Lua Engine created...");

                    // Load std libs we want
                    let t0 = performance.now();
                    
                    this._lua.global.loadLibrary(LuaLibraries.Debug);

                    let t1 = performance.now();
                    console.log(this._logId+"Lua Engine std libs loaded "+(t1-t0).toLocaleString()+"ms...");

                    // Set up the functions Lua can call to get data, eg element()
                    if(!this._luaUseReplay)
                    {
                        // NOTE: we DON'T do this if we're replaying, because we want Lua implemented
                        //       functions to hijack these calls instead!
                        this.setupPIXLISELuaFunctions();
                    }

                    // Add PIXLISE Lua libraries
                    let libFiles = ["Map.lua"];
                    if(this._luaUseReplay)
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
                                    throw new Error("Failed to get lib name from received Lua module: "+respItem.url);
                                }

                                let libName = respItem.url.substring(libNameStart+1, libNameEnd);

                                if(respItem.status != 200)
                                {
                                    throw new Error("Failed to get Lua module: "+libName)
                                }

                                libFileContents$.push(from(respItem.text()));

                                // Remember the names in the order in which they were received
                                libNames.push(libName);

                                // Remember this as an import
                                this._luaLibImports += this.makeLuaModuleImportStatement(libName);
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
                                        let libSource = lib as string;

                                        this.installModule(libName, libSource);
                                        c++;
                                    }

                                    let luat1 = performance.now();
                                    console.log(this._logId+"Lua Initialisation took: "+(luat1-luat0).toLocaleString()+"ms...");
                                    observer.next();
                                    observer.complete();
                                },
                                (err)=>
                                {
                                    throw new Error("Failed to download PIXLISE Lua module: "+err+"\n"+err["message"]+"\n"+err["stack"]);
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

    private installModule(moduleName: string, sourceCode: string)
    {
        let t0 = performance.now();

        let importDef = this.makeLuaModuleImport(moduleName, sourceCode);
        this._lua.doStringSync(importDef);

        let t1 = performance.now();
        console.log(this._logId+" Added Lua module: "+moduleName+" in "+(t1-t0).toLocaleString()+"ms...");
    }

    private makeLuaModuleImport(moduleName: string, sourceCode: string): string
    {
        let importDef = "function make"+moduleName+"Lib()\n"+sourceCode+"\nend";
        return importDef;
    }

    private makeLuaModuleImportStatement(moduleName: string): string
    {
        return "local "+moduleName+" = make"+moduleName+"Lib()\n";
    }

    private LuaFunctionArgCounts = [3, 2, 2, 3, 3, 1, 1, 2, 0, 1, 1];
    private LuaCallableFunctions = new Map<string, any>([
        ["element", (a,b,c)=>{return this.LreadElement(a,b,c)}],
        ["elementSum", (a,b)=>{return this.LreadElementSum(a,b)}],
        ["data", (a,b)=>{return this.LreadDataColumn(a,b)}],
        ["spectrum", (a,b,c)=>{return this.LreadSpectrum(a,b,c)}],
        ["spectrumDiff", (a,b,c)=>{return this.LreadSpectrumDiff(a,b,c)}],
        ["pseudo", (a)=>{return this.LreadPseudoIntensity(a)}],
        ["housekeeping", (a)=>{return this.LreadHouseKeeping(a)}],
        ["diffractionPeaks", (a,b)=>{return this.LreadDiffractionPeaks(a,b)}],
        ["roughness", ()=>{return this.LreadRoughness()}],
        ["position", (a)=>{return this.LreadPosition(a)}],
        ["makeMap", (a)=>{return this.LmakeMap(a)}],
    ]);

    private setupPIXLISELuaFunctions(): void
    {
        // Implementing original expression language
        let prefix = "";
        if(this._debug)
        {
            prefix = "P";
        }

        for(let [funcName, func] of this.LuaCallableFunctions)
        {
            this._lua.global.set(prefix+funcName, func);
        }

        // Special simple one, we don't have debugging for this
        this._lua.global.set("atomicMass", (symbol)=>
        {
            return periodicTableDB.getMolecularMass(symbol);
        });
    }

    // See: https://github.com/ceifa/wasmoon
    public runQuery(origExpression: string, modules: Map<string, string>, dataSource: InterpreterDataSource, cleanupLua: boolean): Observable<PMCDataValues>
    {
        this._dataSource = dataSource;

        let t0 = performance.now();
        this._makeLuaTableTime = 0;

        // Run our code in a unique function name for this runner. This is in case there is any possibility of clashing with
        // another Lua runner (there shouldn't be!)
        let exprFuncName = "expr_"+this._id;

        this._loggedTables = [];

        let init$ = of(undefined);
        if(!this._lua)
        {
            init$ = this.initLua();
        }
        
        return init$.pipe(
            concatMap(
                ()=>
                {
                    // Install any modules supplied
                    let imports = "";
                    for(let [moduleName, moduleSource] of modules)
                    {
                        imports += this.makeLuaModuleImportStatement(moduleName);
                        this.installModule(moduleName, moduleSource);
                    }

                    // We're inited, now run!
                    let expression = this.formatLuaCallable(origExpression, exprFuncName, imports);
                    return this.runQueryInternal(expression, exprFuncName, cleanupLua, t0);
                }
            )
        )
    }

    private runQueryInternal(expression: string, exprFuncName: string, cleanupLua: boolean, t0: number): Observable<PMCDataValues>
    {
        let result = null;
        try
        {
            // Run a lua string
            result = this._lua.doStringSync(expression);

            // Log the tables
            if(this._logTables)
            {
                this.logTables();
            }
            
            if(result)
            {
                // We got an object back that represents a table in Lua. Here we assume this is a PMCDataValue[] effectively
                // so lets convert it to something we'll use here (PMCDataValues)
                result = this.readLuaTable(result);

                let t1 = performance.now();
                console.log(this._logId+">>> Lua expression took: "+(t1-t0).toLocaleString()+"ms, makeTable calls took: "+this._makeLuaTableTime+"ms");

                return of(result);
            }
        }
        catch (err)
        {
            console.error(err);
            this._lua.global.dumpStack(console.error);
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
            this._lua.global.set(exprFuncName, null);

            // Close the lua environment, so it can be freed
            if(cleanupLua)
            {
                this._lua.global.close();
                this._lua = null;
                console.log(this._logId+"Lua interpreter shut down");
            }
        }

        throw new Error("Expression: "+expression+" did not complete");
    }

    private formatLuaCallable(origExpression: string, luaExprFuncName: string, moduleImports: string): string
    {
        // Make it into a function, so if we get called again, we overwrite
        let expression = this._luaLibImports+moduleImports+"\n";
        if(this._luaUseReplay)
        {
            // Reset replay
            expression += "FuncRunner.resetReplay()\n";
        }

        if(this._debug)
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

        if(this._debug)
        {
            expression += "t0=os.clock()\n";
            expression += "times = {}\n"

            let luaFunctionNames = Array.from(this.LuaCallableFunctions.keys());
            for(let funcName of luaFunctionNames)
            {
                expression += `times["${funcName}"] = 0\n`;
            }

            // Add wrappers for our functions

            for(let f = 0; f < luaFunctionNames.length; f++)
            {
                // Add a wrapper with timing code around it that accumulates it
                let funcName = luaFunctionNames[f];
                expression += "function "+funcName+"(";

                let argList = "";
                for(let c = 0; c < this.LuaFunctionArgCounts[f]; c++)
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

        if(this._debug)
        {
            expression += "t1=os.clock()\nprint(\"Code ran for: \"..(t1-t0))\nlocal timesTotal=0\n";
            // Print out the table too
            expression += "for k, v in pairs(times) do\n  print(k..\" took: \"..v)\n  timesTotal = timesTotal+v\nend\nprint(\"Total functions: \"..timesTotal)\n"
        }

        expression += "return result\n";
        return expression;
    }

    private LreadElement(symbol, column, detector)
    {
        return this.makeLuaTable(this._dataSource.readElement([symbol, column, detector]));
    }
    private LreadElementSum(column, detector)
    {
        return this.makeLuaTable(this._dataSource.readElementSum([column, detector]));
    }
    private LreadDataColumn(column, detector)
    {
        return this.makeLuaTable(this._dataSource.readMap([column, detector]));
    }
    private LreadSpectrum(startChannel, endChannel, detector)
    {
        return this.makeLuaTable(this._dataSource.readSpectrum([startChannel, endChannel, detector]));
    }
    private LreadSpectrumDiff(startChannel, endChannel, op)
    {
        return this.makeLuaTable(this._dataSource.readSpectrumDifferences([startChannel, endChannel, op]));
    }
    private LreadPseudoIntensity(elem)
    {
        return this.makeLuaTable(this._dataSource.readPseudoIntensity([elem]));
    }
    private LreadHouseKeeping(column)
    {
        return this.makeLuaTable(this._dataSource.readHousekeepingData([column]));
    }
    private LreadDiffractionPeaks(eVstart, eVend)
    {
        return this.makeLuaTable(this._dataSource.readDiffractionData([eVstart, eVend]));
    }
    private LreadRoughness()
    {
        return this.makeLuaTable(this._dataSource.readRoughnessData([]));
    }
    private LreadPosition(axis)
    {
        return this.makeLuaTable(this._dataSource.readPosition([axis]));
    }
    private LmakeMap(value)
    {
        return this.makeLuaTable(this._dataSource.makeMap([value]));
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

    private makeLuaTable(data: PMCDataValues): any
    {
        let t0 = performance.now();
        let pmcs = [];
        let values = [];
        for(let item of data.values)
        {
            pmcs.push(item.pmc);
            values.push(item.isUndefined ? null : item.value);
        }

        let luaTable = [pmcs, values];

        if(this._logTables)
        {
            // Save table for later
            this._loggedTables.push(luaTable);
        }

        let t1 = performance.now();
        
        this._makeLuaTableTime += t1-t0;
        return luaTable;
    }

    private logTables()
    {
        let luaTableText = "allTables = {";

        for(let table of this._loggedTables)
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
                        luaTableText += ",";
                    }
                    luaTableText += col;
                    first = false;
                }

                luaTableText += "},\n";
            }

            luaTableText += " },\n";
        }

        luaTableText += "}";
        console.log(luaTableText);
    }
}