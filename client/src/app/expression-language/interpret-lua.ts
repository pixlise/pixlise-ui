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

import { Observable } from "rxjs";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { InterpreterDataSource } from "./interpreter-data-source";

const { LuaFactory, LuaLibraries } = require('wasmoon')


export class LuaDataQuerier
{
    private static _lua = null;
    private static _context: LuaDataQuerier = null;

    constructor(
        private _dataSource: InterpreterDataSource
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
                lua.then((eng)=>{
                    console.log("Lua Engine created...");

                    // Save this for later
                    LuaDataQuerier._lua = eng;

                    // Load std libs we want
                    let t0 = performance.now();
                    
                    LuaDataQuerier._lua.global.loadLibrary(LuaLibraries.Debug);

                    let t1 = performance.now();
                    console.log("Lua Engine std libs loaded "+(t1-t0).toLocaleString()+"ms...");

                    // Add PIXLISE-lib to Lua
                    fetch("assets/lua/Map.lua").then(
                        (response: Response)=>
                        {
                            response.text().then(
                                (lib: string)=>
                                {
                                    let t0 = performance.now();

                                    // Set up constants/functions that can be accessed from Lua
                                    // NOTE: at this point we wrap the Lua module so it looks like a function
                                    let libAsFunction = "function makeMapLib()\n"+lib+"\nend";
                                    LuaDataQuerier.setupLua(libAsFunction);

                                    let t1 = performance.now();
                                    console.log("Lua Engine made ready in "+(t1-t0).toLocaleString()+"ms...");
                                    observer.complete();
                                }
                            )
                            .catch(()=>
                            {
                                throw new Error("Failed to apply PIXLISE Lua library");
                            });
                        }
                    )
                    .catch(()=>
                    {
                        throw new Error("Failed to download PIXLISE Lua library");
                    });
                })
                .catch((err)=>{
                    console.error(err);
                    observer.error(err);
                });
            }
        );
    }

    private static setupLua(pixliseLib: string): void
    {
        LuaDataQuerier._lua.doStringSync(pixliseLib);

        // Implementing original expression language
        LuaDataQuerier._lua.global.set("element", LuaDataQuerier.LreadElement);
        LuaDataQuerier._lua.global.set("elementSum", LuaDataQuerier.LreadElementSum);
        LuaDataQuerier._lua.global.set("data", LuaDataQuerier.LreadDataColumn);
        LuaDataQuerier._lua.global.set("spectrum", LuaDataQuerier.LreadSpectrum);
        LuaDataQuerier._lua.global.set("spectrumDiff", LuaDataQuerier.LreadSpectrumDiff);
        LuaDataQuerier._lua.global.set("pseudo", LuaDataQuerier.LreadPseudoIntensity);
        LuaDataQuerier._lua.global.set("housekeeping", LuaDataQuerier.LreadHouseKeeping);
        LuaDataQuerier._lua.global.set("diffractionPeaks", LuaDataQuerier.LreadDiffractionPeaks);
        LuaDataQuerier._lua.global.set("roughness", LuaDataQuerier.LreadRoughness);
        LuaDataQuerier._lua.global.set("position", LuaDataQuerier.LreadPosition);
        LuaDataQuerier._lua.global.set("makeMap", LuaDataQuerier.LmakeMap);
        LuaDataQuerier._lua.global.set("atomicMass", (symbol)=>
        {
            return periodicTableDB.getMolecularMass(symbol);
        });
    }

    // See: https://github.com/ceifa/wasmoon
    public runQuery(expression: string): PMCDataValues
    {
        let t0 = performance.now();

        // Make it into a function, so if we get called again, we overwrite
        expression = "Map = makeMapLib()\nfunction main()\n"+expression+"\nend\nreturn main()\n"

        // Set context for this run
        LuaDataQuerier._context = this;

        let result = null;
        try
        {
            // Run a lua string
            result = LuaDataQuerier._lua.doStringSync(expression);
        }
        catch (err)
        {
            console.error(err);
            LuaDataQuerier._lua.global.dumpStack(console.error);
/*
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
            LuaDataQuerier._lua.global.set("main", null);

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
console.log(">>> Lua expression took: "+(t1-t0).toLocaleString()+"ms");

            return result;
        }

        throw new Error("Expression: "+expression+" did not complete");
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

    // Expecting results to come back as maps that we encode to pass in
    // So Lua code for one:
    // t = {{1,3.5},{3,5.7},{7,1.1}}
    // Expecting it come back as:
    // [[1,3.5],[3,5.7],[7,1.1]]
    private readLuaTable(table: any): PMCDataValues
    {
        let values: PMCDataValue[] = [];
        let c = 0;
        for(let row of table)
        {
            if(row.length != 2)
            {
                throw new Error("Table row["+c+"] is not 2 items");
            }

            let pmc = Number.parseInt(row[0]);
            if(isNaN(pmc))
            {
                throw new Error("Returned value from expression has invalid field: "+row[0]);
            }

            let value: number = row[1];
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

    private static makeLuaTable(values: PMCDataValues): any
    {
        let arr = [];
        for(let item of values.values)
        {
            arr.push([item.pmc, item.isUndefined ? null : item.value]);
        }
        return arr;
    }
}
