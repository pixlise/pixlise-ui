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

import { Observable, combineLatest, firstValueFrom, from, lastValueFrom, of } from "rxjs";
import { map, mergeMap, concatMap, catchError, finalize, shareReplay } from "rxjs/operators";
import { PMCDataValue, PMCDataValues, DataQueryResult } from "src/app/expression-language/data-values";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { InterpreterDataSource } from "./interpreter-data-source";
import { SentryHelper, randomString } from "src/app/utils/utils";
import { DataExpressionId } from "./expression-id";
import { DataModuleHelpers } from "./data-module-helpers";
import { environment } from "src/environments/environment";

import { LuaFactory, LuaLibraries, LuaEngine } from "pixlise-wasmoon";
import { ExpressionError } from "./expression-error";

export class LuaDataQuerier {
  // An id we use for logging about this Lua runner
  private _id = randomString(4);
  private _logId: string = "";
  private _execCount: number = -1; // start here, gets incremented before first use

  private _luaInit$: Observable<void> | null = null;
  private _lua: LuaEngine | null = null;
  //private _logTables: boolean = false;
  //private _loggedTables = new Map<string, PMCDataValues>();
  private _makeLuaTableTime = 0; // Total time spent returning Tables to Lua from things like element() Lua call
  private _totalJSFunctionTime = 0; // Total time spent in JS functions called from Lua
  private _debugJSTiming = true; // Enable to debug
  private _jsFuncCalls: string[] = [];
  //private _luaLibImports = "";

  private _runtimeDataRequired: Set<string> = new Set<string>();
  private _runtimeStdOut = "";
  private _runtimeStdErr = "";

  private _dataSource: InterpreterDataSource | null = null;
  private _customInjectFunctionData: Map<string, any> | null = null;

  constructor(
    private _debug: boolean //private _luaUseReplay: boolean,
  ) {
    this._logId = "[" + this._id + "] ";
  }

  shutdown(): void {
    if (!this._lua) {
      // Not inited
      return;
    }

    this._lua.global.setTimeout(0);
    this._lua.global.close();
    this._lua = null;
    this._luaInit$ = null;
    console.log(this._logId + "Lua interpreter shut down");
  }

  private initLua(): Observable<void> {
    // NOTE: WE NEVER DO THIS:
    // DataQuerier._lua.global.close()
    // DO WE NEED TO???

    const luat0 = performance.now();

    console.log(this._logId + "Initializing Lua...");

    // Initialize a new lua environment factory
    // Pass our hosted wasm file location in here. Simplest method is relative path to served location
    const wasmURI = "assets/lua/glue.wasm";
    console.log(this._logId + "Loading WASM from: " + wasmURI);

    const factory = new LuaFactory(
      wasmURI,
      {},
      str => {
        this._runtimeStdOut += str + "\n";
        console.log(str);
      },
      str => {
        if (
          str.indexOf("(error object is not a string)") > -1 || // Not sure what causes these
          str.startsWith("Aborted()") // Lua timed out error!
        ) {
          // Local logging only
          console.error(str);
        } else {
          // We want to learn from this, but if it turns out to be spam, make a condition above for it!
          SentryHelper.logMsg(true, `lua stderr: ${str}`);
        }
        this._runtimeStdErr += str + "\n";
      }
    );
    const luaOpts = {
      openStandardLibs: true,
      injectObjects: false,
      enableProxy: false,
      traceAllocations: false,
    };
    const lua$ = from(factory.createEngine(luaOpts));
    return lua$.pipe(
      mergeMap((eng: LuaEngine) => {
        this._lua = eng;

        console.log(this._logId + "Lua Engine created...");

        // Load std libs we want
        const t0 = performance.now();

        this._lua.global.loadLibrary(LuaLibraries.Debug);

        const t1 = performance.now();
        console.log(this._logId + "Lua Engine std libs loaded " + (t1 - t0).toLocaleString() + "ms...");

        // Set up the functions Lua can call to get data, eg element()
        //if(!this._luaUseReplay)
        {
          // NOTE: we DON'T do this if we're replaying, because we want Lua implemented
          //       functions to hijack these calls instead!
          this.setupPIXLISELuaFunctions();
        }

        // Add PIXLISE Lua libraries
        const builtInLibNames = DataModuleHelpers.getBuiltInModuleNames();
        const libFileResults$ = [];

        for (const lib of builtInLibNames) {
          libFileResults$.push(DataModuleHelpers.getBuiltInModuleSource(lib));
        }

        const allFiles$ = combineLatest(libFileResults$);
        return allFiles$.pipe(
          map(responses => {
            for (let c = 0; c < responses.length; c++) {
              const module = builtInLibNames[c];
              const source = responses[c] as string;

              // Synchronous install - we want this done now, and expect there to be no need for
              // promise resolution here!
              this.installModule(module, source);
            }

            const luat1 = performance.now();
            console.log(this._logId + "Lua Initialisation took: " + (luat1 - luat0).toLocaleString() + "ms...");
          })
        );
      })
    );
  }

  private installModule(moduleName: string, sourceCode: string): void {
    const t0 = performance.now();

    // Leave ample time to install a module
    const maxRunTime = 10000;

    this.runLuaCodeSync(sourceCode, maxRunTime);

    const t1 = performance.now();
    console.log(this._logId + " Added Lua module: " + moduleName + " in " + (t1 - t0).toLocaleString() + "ms...");
  }

  private LuaFunctionArgCounts = [3, 2, 2, 3, 3, 1, 1, 2, 0, 1, 1];
  private LuaCallableFunctions = new Map<string, any>([
    [
      "element_async",
      async (a: any, b: any, c: any) => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedQuantElementExpression(a, b, c));
        return this.makeLuaTableAsync(`element(${a},${b},${c})`, t0, this._dataSource!.readElement([a, b, c]));
      },
    ],
    [
      "elementSum_async",
      async (a: any, b: any) => {
        const t0 = performance.now();
        // Dont save runtime stat here, this works for any quant
        return this.makeLuaTableAsync(`elementSum(${a},${b})`, t0, this._dataSource!.readElementSum([a, b]));
      },
    ],
    [
      "data_async",
      async (a: any, b: any) => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedQuantDataExpression(a, b));
        return this.makeLuaTableAsync(`data(${a}, ${b})`, t0, this._dataSource!.readMap([a, b]));
      },
    ],
    [
      "spectrum_async",
      async (a: any, b: any, c: any) => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataQueryResult.DataTypeSpectrum);
        return this.makeLuaTableAsync(`spectrum(${a},${b},${c})`, t0, this._dataSource!.readSpectrum([a, b, c]));
      },
    ],
    [
      "spectrumDiff_async",
      async (a: any, b: any, c: any) => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataQueryResult.DataTypeSpectrum);
        return this.makeLuaTableAsync(`spectrumDiff(${a},${b},${c})`, t0, this._dataSource!.readSpectrumDifferences([a, b, c]));
      },
    ],
    [
      "pseudo_async",
      async (a: any) => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedPseudoIntensityExpression(a));
        return this.makeLuaTableAsync(`pseudo(${a})`, t0, this._dataSource!.readPseudoIntensity([a]));
      },
    ],
    [
      "housekeeping_async",
      async (a: any) => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataQueryResult.DataTypeHousekeeping + "-" + a);
        return this.makeLuaTableAsync(`housekeeping(${a})`, t0, this._dataSource!.readHousekeepingData([a]));
      },
    ],
    [
      "diffractionPeaks_async",
      async (a: any, b: any) => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataQueryResult.DataTypeDiffraction);
        return this.makeLuaTableAsync(`diffractionPeaks(${a},${b})`, t0, this._dataSource!.readDiffractionData([a, b]));
      },
    ],
    [
      "roughness_async",
      async () => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataQueryResult.DataTypeRoughness);
        return this.makeLuaTableAsync("roughness()", t0, this._dataSource!.readRoughnessData([]));
      },
    ],
    [
      "position_async",
      async (a: any) => {
        const t0 = performance.now();
        this._runtimeDataRequired.add(DataQueryResult.DataTypePosition);
        return this.makeLuaTableAsync(`position(${a})`, t0, this._dataSource!.readPosition([a]));
      },
    ],
    [
      "makeMap_async",
      async (a: any) => {
        const t0 = performance.now();
        return this.makeLuaTableAsync(`makeMap(${a})`, t0, this._dataSource!.makeMap([a]));
      },
    ],
    [
      "getVariogramInputs",
      (useTestData: any) => {
        let values = this._customInjectFunctionData?.get("getVariogramInputs") || [];
        if (values.length === 0 && useTestData) {
          values = [
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 8, value: 3, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 9, value: 9, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 10, value: 13, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 11, value: 13, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 12, value: 6, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 13, value: 2, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 14, value: 1, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 15, value: 1, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 16, value: 0.8, isUndefined: false, label: "" },
            ],
            [
              { pmc: 7, value: 0.75, isUndefined: false, label: "" },
              { pmc: 17, value: 0.85, isUndefined: false, label: "" },
            ],
          ];
        }
        return values;
      },
    ],
  ]);

  private async setupPIXLISELuaFunctions(): Promise<void> {
    if (!this._lua) {
      // Not inited
      return;
    }

    // Implementing original expression language
    let prefix = "";
    if (this._debug) {
      prefix = "P";
    }

    for (const [funcName, func] of this.LuaCallableFunctions) {
      this._lua.global.set(prefix + funcName, func);
    }

    // Special simple ones, we don't have debugging for these
    this._lua.global.set("atomicMass", (symbol: string) => {
      return periodicTableDB.getMolecularMass(symbol);
    });
    this._lua.global.set("exists_async", async (dataType: string, column: string) => {
      if (!this._dataSource) {
        return false;
      }
      return this._dataSource.exists(dataType, column);
    });
  }

  // See: https://github.com/pixlise/wasmoon
  public runQuery(
    sourceCode: string,
    modules: Map<string, string>,
    dataSource: InterpreterDataSource,
    cleanupLua: boolean,
    allowAnyResponse: boolean,
    //recordExpressionInputs: boolean
    maxTimeoutMs: number = environment.luaTimeoutMs,
    customInjectFunctionData: Map<string, any> | null = null
  ): Observable<DataQueryResult> {
    this._execCount++;
    this._dataSource = dataSource;
    this._customInjectFunctionData = customInjectFunctionData;

    const t0 = performance.now();
    this._makeLuaTableTime = 0;
    this._jsFuncCalls = [];
    this._totalJSFunctionTime = 0;

    // Run our code in a unique function name for this runner. This is in case there is any possibility of clashing with
    // another Lua runner (there shouldn't be!)
    const exprFuncName = "expr_" + this._id + "_" + this._execCount;

    if (!this._luaInit$) {
      this._luaInit$ = this.initLua().pipe(
        shareReplay(1),
        catchError(err => {
          // We failed within init$, cleaer our lua variable so we re-init in future
          this._lua = null;
          SentryHelper.logMsg(true, `initLua error: ${err}`);
          throw err;
        })
      );
    }

    return this._luaInit$.pipe(
      concatMap(() => {
        // Here we concat modules with the source we're about to run
        let allSource = "";
        for (const [moduleName, moduleSource] of modules) {
          const retPos = moduleSource.lastIndexOf("return " + moduleName);
          if (retPos == -1) {
            throw new Error("Expected module to end with return statement returning itself");
          }

          allSource += moduleSource.substring(0, retPos) + "\n";
        }

        // We're inited, now run!
        allSource += sourceCode;
        const codeParts = this.formatLuaCallable(allSource, exprFuncName /*, imports*/);
        const execSource = codeParts.join("");
        return this.runQueryInternal(execSource, cleanupLua, t0, allowAnyResponse /*, recordExpressionInputs*/, maxTimeoutMs);
      })
    );
  }

  private runLuaCode(sourceCode: string, timeoutMs: number): Observable<any> {
    if (!this._lua) {
      throw new Error("runLuaCode: Lua not initialised");
    }

    // Set the timeout value
    const endTimeMs = timeoutMs > 0 ? Date.now() + timeoutMs : 0;
    this._lua.global.setTimeout(endTimeMs);

    const p = this._lua.doString(sourceCode);

    return from(p).pipe(
      finalize(() => {
        // Remove timeout as it will run out if we leave it here and things in future will fail
        if (this._lua && this._lua.global) {
          // Check if it's still around though!
          this._lua.global.setTimeout(0);
        }
      })
    );
  }

  private cleanupInjectedFunctions(injectedFunctions: Set<string>): void {
    if (!this._lua || !injectedFunctions || injectedFunctions.size === 0) {
      return;
    }

    for (const funcName of injectedFunctions) {
      let prefix = this._debug ? "P" : "";
      let prefixFuncName = prefix + funcName;

      this._lua.global.set(prefixFuncName, lastValueFrom(of([])));
    }
  }

  private runLuaCodeSync(sourceCode: string, timeoutMs: number): any {
    if (!this._lua) {
      return null;
    }
    this._lua.global.setTimeout(Date.now() + timeoutMs);
    const result = this._lua.doString(sourceCode);
    this._lua.global.setTimeout(0);
    return result;
  }

  private runQueryInternal(
    sourceCode: string,
    cleanupLua: boolean,
    t0: number,
    allowAnyResponse: boolean,
    maxTimeoutMs: number = environment.luaTimeoutMs
    //recordExpressionInputs: boolean,
  ): Observable<DataQueryResult> {
    // Ensure the list of data required is cleared, from here on we're logging what the expression required to run!
    this._runtimeDataRequired.clear();

    // Also clear stdout and stderr here
    this._runtimeStdOut = "";
    this._runtimeStdErr = "";

    // If we want to record tables (well, any inputs) that the expression requires to run, remember this
    //this._logTables = recordExpressionInputs;
    //this._loggedTables.clear();

    return this.runLuaCode(sourceCode, maxTimeoutMs).pipe(
      map(result => {
        if (result) {
          // We still want to return non-PMC table values, so we need to check if we got a table back before transforming it
          let formattedData: any = result;
          let isPMCTable = false;
          if (!allowAnyResponse || this.isPMCArray(result)) {
            // We got an object back that represents a table in Lua. Here we assume this is a PMCDataValue[] effectively
            // so lets convert it to something we'll use here (PMCDataValues)
            formattedData = this.readLuaTable(result);
            isPMCTable = true;
          }

          if (this._debugJSTiming) {
            console.log(`Total JS function time: ${this._totalJSFunctionTime}ms`);
          }

          const runtimeMs = performance.now() - t0;
          return new DataQueryResult(
            formattedData,
            isPMCTable,
            Array.from(this._runtimeDataRequired.keys()),
            runtimeMs,
            this._runtimeStdOut,
            this._runtimeStdErr,
            new Map<string, PMCDataValues>() //this._loggedTables
          );
        }

        throw new Error("Expression: did not return a value");
      }),
      catchError(err => {
        const parsedErr = this.parseLuaError(err, sourceCode, maxTimeoutMs);

        // We may need to reset Lua as we seem to have a resource leak that causes an error after running about 20 expressions
        // TODO: this will need fixing at somepoint!
        if (parsedErr.message.indexOf("memory access out of bounds") >= 0) {
          cleanupLua = true;
        }

        // This was doubling up on log msgs, no point sending to Sentry here because whatever called us should log anyway
        //SentryHelper.logMsg(true, `runLuaCode error: ${parsedErr}`);

        // This prints a bunch of tables out but hasn't proven useful for debugging...
        //this._lua.global.dumpStack(console.error);

        /* NOTE: This doesn't print any more than the above...
                        // Print out everything...
                        for(let c = 1; c < 10; c++)
                        {
                            const traceback = LuaDataQuerier._lua.global.lua.lua_tolstring(LuaDataQuerier._lua.global.address, -c, null);
                            console.log(traceback);
                        }
                    */
        throw parsedErr;
      }),
      finalize(() => {
        // Clean up injected functions
        let injectedFunctionNames = new Set<string>(Array.from(this._customInjectFunctionData?.keys() || []));
        this.cleanupInjectedFunctions(injectedFunctionNames);
        /*
                    NOTE: we used to clear the func name we just ran but it's now a local variable so Lua automatically cleans it up
                    this._lua.global.set(exprFuncName, null);
                    */
        // Close the lua environment, so it can be freed
        if (cleanupLua) {
          this.shutdown();
        }
      })
    );
  }

  private isPMCArray(result: any): boolean {
    return Array.isArray(result) && result.length == 2 && result.every(resultArray => Array.isArray(resultArray));
  }
  /*
    private dumpLua(reason: string)
    {
        if(!this._lua)
        {
            return;
        }

        //this._lua.global.getTable("_G", (e)=>{
        //    console.log(e);
        //});
        
        console.log("]]] LOGGING LUA TABLES: "+reason+" [[[")
        this.runLuaCodeSync(`DebugHelp.listAllTables("", _G, false)`, 1000);
    }
*/
  // For examples, see unit tests
  private parseLuaError(err: any, sourceCode: string, maxTimeoutMs: number = environment.luaTimeoutMs): ExpressionError {
    // At this point, we can look at the error Lua returned and maybe form a more useful error message for users
    // because we supply multi-line source code to Lua, but all its error msgs print out a segment of the first line!
    let errType = "";
    let errMsg = "";
    let errLine = -1;
    let errSourceLine = "";

    if (err?.stack) {
      // We expect: "Error: Lua Error(<error type>/<error number>)\n"
      const errToken = "Error: Lua Error(";
      let startPos = err.stack.indexOf(errToken);
      if (startPos > -1) {
        startPos += errToken.length;
        const endPos = err.stack.indexOf("/", startPos + 1);
        if (endPos > -1) {
          errType = err.stack.substring(startPos, endPos);
        }
      }
    }

    if (err?.message) {
      // Now find the line it's on and an error message

      // Sometimes its an abort message, which happens when the code times out. We don't have
      // a better way of reporting from Lua so try to make a nicer error message here
      if (err.message.startsWith("Aborted()")) {
        return new ExpressionError(`Lua call took longer than limit of ${maxTimeoutMs}ms. Error: ${err.message}`, "", -1, "Runtime", "");
      } else {
        // It appears it can optionally come as:
        // error message
        // stack traceback:
        // [<some source code>]:<number>: <msg>
        //
        // OR just:
        // [<some source code>]:<number>: <msg>
        //
        // So here we determine which this is and read as needed
        const lineNumToken = "]:";
        const lineNumEndToken = ": ";
        let startPos = err.message.indexOf(lineNumToken);
        if (startPos > -1) {
          startPos += lineNumToken.length;
          const endPos = err.message.indexOf(lineNumEndToken, startPos + 1);
          if (endPos > -1) {
            const errLineStr = err.message.substring(startPos, endPos);
            errLine = Number.parseInt(errLineStr);
            errMsg = err.message.substring(endPos + lineNumEndToken.length);
          }
        }

        // If there was a "stack traceback:", error message is at the start of the string
        const stackTracebackPos = err.message.indexOf("stack traceback:");
        if (stackTracebackPos > -1) {
          errMsg = err.message.substring(0, stackTracebackPos - 1);
        }
      }
    }

    // Try to retrieve the source line
    if (errLine > -1) {
      // Now snip out the line from our code, assuming errLine is 1-based!!
      const errLineIdx = errLine - 1;
      const sourceLines = sourceCode.split("\n");
      if (errLineIdx < sourceLines.length) {
        errSourceLine = sourceLines[errLineIdx];
      }
    }

    // If we failed to even work out an error type, stop here
    // At time of writing, these are the possibilities Lua can return
    /*
        Ok = 0,
        Yield = 1,
        ErrorRun = 2,
        ErrorSyntax = 3,
        ErrorMem = 4, <-- Did not see an example of this while deving
        ErrorErr = 5, <-- Did not see an example of this while deving
        ErrorFile = 6 <-- Did not see an example of this while deving
        */
    if ((errType == "ErrorSyntax" || errType == "ErrorRun") && errLine > -1) {
      // Process this as a syntax error, including the relevant fields pointing to source code
      const errTypeStr = errType == "ErrorSyntax" ? "Syntax" : "Runtime";
      return new ExpressionError(`${errTypeStr} error on line ${errLine}: ${errMsg}`, err?.stack, errLine, errType, errSourceLine);
    }
    // else

    // Didn't know how to process it, so stop here
    return err;
  }

  // Returns multiple strings:
  // - Generated code we insert before source is run
  // - The source code itself
  // - Inserted code after source

  private formatLuaCallable(sourceCode: string, luaExprFuncName: string /*, moduleImports: string*/): string[] {
    const result: string[] = [];

    // Make it into a function, so if we get called again, we overwrite
    let genStart = "";
    /*genStart = this._luaLibImports+moduleImports+"\n";
        if(this._luaUseReplay)
        {
            // Reset replay
            genStart += "FuncRunner.resetReplay()\n";
        }
        */

    if (this._debug) {
      // If we're debugging, we wrap the user code in a function and call that, return its result
      // and this makes us able to put some debugging/profiling around it
      genStart += "local function " + luaExprFuncName + "()\n";
    }

    result.push(genStart);

    result.push(sourceCode + "\n");

    if (this._debug) {
      let genEnd = "end\n";

      genEnd += "t0=os.clock()\n";
      genEnd += "times = {}\n";

      const luaFunctionNames = Array.from(this.LuaCallableFunctions.keys());
      for (const funcName of luaFunctionNames) {
        genEnd += `times["${funcName}"] = 0\n`;
      }

      // Add wrappers for our functions

      for (let f = 0; f < luaFunctionNames.length; f++) {
        // Add a wrapper with timing code around it that accumulates it
        const funcName = luaFunctionNames[f];
        genEnd += "function " + funcName + "(";

        let argList = "";
        for (let c = 0; c < this.LuaFunctionArgCounts[f]; c++) {
          if (argList.length > 0) {
            argList += ",";
          }

          argList += "a" + c;
        }
        genEnd += argList + ")";
        genEnd += `
  local t0=os.clock()
  local funcResult = P${funcName}(${argList})
  local t1=os.clock()
  times["${funcName}"] = times["${funcName}"]+(t1-t0)
  return funcResult
end
`;
      }

      genEnd += "result = " + luaExprFuncName + "()\n";

      genEnd += 't1=os.clock()\nprint("Code ran for: "..(t1-t0))\nlocal timesTotal=0\n';
      // Print out the table too
      genEnd += 'for k, v in pairs(times) do\n  print(k.." took: "..v)\n  timesTotal = timesTotal+v\nend\nprint("Total functions: "..timesTotal)\n';

      genEnd += "return result\n";

      result.push(genEnd);
    }

    return result;
  }

  // Expecting results to come back as table with 2 arrays in it, one for pmc, one for values
  // So Lua code for one:
  // t = {{1,3,7},{3.5,5.7,1.1}}
  // Expecting it come back as:
  // [[1,3,7],[3.5,5.7,1.1]]
  private readLuaTable(table: any): PMCDataValues {
    if (!(table instanceof Array) || table?.length != 2 || !(table[0] instanceof Array) || !(table[1] instanceof Array)) {
      throw new Error("Expression did not return map data in expected format");
    }

    // It's looking like map data table, but ensure its 2 sub-tables are of the same length
    if (table[0].length <= 0 || table[0].length != table[1].length) {
      throw new Error("Expression returned incomplete map data: number of PMCs did not match number of values");
    }

    const result = new PMCDataValues();
    result.isBinary = true; // pre-set for detection in addValue
    let c = 0;
    for (const pmc of table[0]) {
      let value: number = table[1][c];
      let isUndef = false;
      if (value === null) {
        value = 0;
        isUndef = true;
      }

      result.addValue(new PMCDataValue(pmc, value, isUndef));
      c++;
    }

    return result;
  }

  /*private makeLuaTable(tableSource: string, data: PMCDataValues): any {
    const t0 = performance.now();
    const pmcs = [];
    const values = [];
    for (const item of data.values) {
      pmcs.push(item.pmc);

      // NOTE: Lua doesn't support nil values in tables. https://www.lua.org/manual/5.3/manual.html#2.1
      // so here we specify an undefined value as a NaN so it doesn't break. May need to consider just
      // excluding those PMCs completely, however then the maps wont be the same size in Lua land...
      values.push(item.isUndefined ? NaN : item.value);
    }

    const luaTable = [pmcs, values];

    if (this._logTables) {
      // Save table for later
      this._loggedTables.set(tableSource, data);
    }

    const t1 = performance.now();

    this._makeLuaTableTime += t1 - t0;
    return luaTable;
  }*/

  private async makeLuaTableAsync(tableSource: string, startTime: number, data: Promise<PMCDataValues>): Promise<any> {
    if (this._debugJSTiming) {
      console.log(tableSource);
      this._jsFuncCalls.push(tableSource);
    }

    return data.then((result: PMCDataValues) => {
      const t0 = performance.now();
      const pmcs = [];
      const values = [];
      for (const item of result.values) {
        pmcs.push(item.pmc);

        // NOTE: Lua doesn't support nil values in tables. https://www.lua.org/manual/5.3/manual.html#2.1
        // so here we specify an undefined value as a NaN so it doesn't break. May need to consider just
        // excluding those PMCs completely, however then the maps wont be the same size in Lua land...
        values.push(item.isUndefined ? NaN : item.value);
      }

      const luaTable = [pmcs, values];

      if (this._debugJSTiming) {
        const t1 = performance.now();
        this._makeLuaTableTime += t1 - t0;
        this._totalJSFunctionTime += t1 - startTime;
      }
      return luaTable;
    });
  }
  /*
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
*/
}
