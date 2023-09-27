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

import { Observable, combineLatest, from } from "rxjs";
import { map, mergeMap, concatMap, catchError, finalize, shareReplay } from "rxjs/operators";
import { PMCDataValue, PMCDataValues, DataQueryResult } from "src/app/expression-language/data-values";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { InterpreterDataSource } from "./interpreter-data-source";
import { randomString } from "src/app/utils/utils";
import { DataExpressionId } from "./expression-id";
import { DataModuleHelpers } from "./data-module-helpers";
import { environment } from "src/environments/environment";

import { LuaFactory, LuaLibraries, LuaEngine } from "../../../../../wasmoon/dist";

export class LuaDataQuerier {
  // An id we use for logging about this Lua runner
  private _id = randomString(4);
  private _logId: string = "";
  private _execCount: number = -1; // start here, gets incremented before first use

  private _luaInit$: Observable<void> | null = null;
  private _lua: LuaEngine | null = null;
  private _logTables: boolean = false;
  private _loggedTables = new Map<string, PMCDataValues>();
  private _makeLuaTableTime = 0; // Total time spent returning Tables to Lua from things like element() Lua call
  //private _luaLibImports = "";

  private _runtimeDataRequired: Set<string> = new Set<string>();
  private _runtimeStdOut = "";
  private _runtimeStdErr = "";

  private _dataSource: InterpreterDataSource | null = null;

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
      {}
      /*,
      str => {
        this._runtimeStdOut += str + "\n";
        console.log(str);
      },
      str => {
        this._runtimeStdErr += str + "\n";
        console.error(str);
      }*/
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

              this.installModule(module, source);
            }

            //this.dumpLua("Init complete");

            const luat1 = performance.now();
            console.log(this._logId + "Lua Initialisation took: " + (luat1 - luat0).toLocaleString() + "ms...");
          })
        );
      })
    );
  }

  private installModule(moduleName: string, sourceCode: string) {
    const t0 = performance.now();
    /*
        let importDef = this.makeLuaModuleImport(moduleName, sourceCode);
        importDef += "\n"+this.makeLuaModuleImportStatement(moduleName);
        this.runLuaCodeSync(importDef, 10000);
*/

    // Leave ample time to install a module
    /*let result =*/ this.runLuaCodeSync(sourceCode, 10000);

    const t1 = performance.now();
    console.log(this._logId + " Added Lua module: " + moduleName + " in " + (t1 - t0).toLocaleString() + "ms...");
  }
  /*
    private makeLuaModuleImport(moduleName: string, sourceCode: string): string
    {
        let importDef = "function make"+moduleName+"Module()\n"+sourceCode+"\nend";
        return importDef;
    }

    private makeLuaModuleImportStatement(moduleName: string): string
    {
        return moduleName+" = make"+moduleName+"Module()\n";
    }
*/
  private LuaFunctionArgCounts = [3, 2, 2, 3, 3, 1, 1, 2, 0, 1, 1];
  private LuaCallableFunctions = new Map<string, any>([
    [
      "element",
      async (a: any, b: any, c: any) => {
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedQuantElementExpression(a, b, c));
        return this.makeLuaTableAsync(`elem-${a}-${b}-${c}`, this._dataSource.readElement([a, b, c]));
      },
    ],
    [
      "elementSum",
      (a: any, b: any) => {
        // Dont save runtime stat here, this works for any quant
        return this.makeLuaTable(`elemSum-${a}-${b}`, this._dataSource.readElementSum([a, b]));
      },
    ],
    [
      "data",
      (a: any, b: any) => {
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedQuantDataExpression(a, b));
        return this.makeLuaTableAsync(`data-${a}-${b}`, this._dataSource.readMap([a, b]));
      },
    ],
    [
      "spectrum",
      (a: any, b: any, c: any) => {
        this._runtimeDataRequired.add(DataQueryResult.DataTypeSpectrum);
        return this.makeLuaTableAsync(`spectrum-${a}-${b}-${c}`, this._dataSource.readSpectrum([a, b, c]));
      },
    ],
    [
      "spectrumDiff",
      (a: any, b: any, c: any) => {
        this._runtimeDataRequired.add(DataQueryResult.DataTypeSpectrum);
        return this.makeLuaTableAsync(`spectrumDiff-${a}-${b}-${c}`, this._dataSource.readSpectrumDifferences([a, b, c]));
      },
    ],
    [
      "pseudo",
      (a: any) => {
        this._runtimeDataRequired.add(DataExpressionId.makePredefinedPseudoIntensityExpression(a));
        return this.makeLuaTableAsync(`pseudo-${a}`, this._dataSource.readPseudoIntensity([a]));
      },
    ],
    [
      "housekeeping",
      (a: any) => {
        this._runtimeDataRequired.add(DataQueryResult.DataTypeHousekeeping + "-" + a);
        return this.makeLuaTableAsync(`housekeeping-${a}`, this._dataSource.readHousekeepingData([a]));
      },
    ],
    [
      "diffractionPeaks",
      (a: any, b: any) => {
        this._runtimeDataRequired.add(DataQueryResult.DataTypeDiffraction);
        return this.makeLuaTableAsync(`diffractionPeaks-${a}-${b}`, this._dataSource.readDiffractionData([a, b]));
      },
    ],
    [
      "roughness",
      () => {
        this._runtimeDataRequired.add(DataQueryResult.DataTypeRoughness);
        return this.makeLuaTableAsync("roughness", this._dataSource.readRoughnessData([]));
      },
    ],
    [
      "position",
      // If function is null, results in: Runtime error on line 1: attempt to call a nil value (global 'position')
      // null /*
      async (a: any) => {
        this._runtimeDataRequired.add(DataQueryResult.DataTypePosition);
/*
        let result = [
          [90, 95, 100, 105, 110, 115],
          [500, 600, 700, 800, 900, 1000],
        ];
        const p = this._dataSource.readPosition([a]);
        p.then((value: PMCDataValues) => {
          result = this.makeLuaTable(`position-${a}`, value);
        });

        return result;
*/
        //return this.makeLuaTable(`position-${a}`, this.getPos());
        // return new Promise(resolve=>resolve(v));
        // return new Promise(resolve => setTimeout(()=>resolve(v), 4000));

        return this.makeLuaTableAsync(`position-${a}`, this._dataSource.readPosition([a])); // Results in: null function or function signature mismatch

        //return this.makeLuaTable(`position-${a}`, this.getPos()); // IF function is NOT async, this draws a ternary, points are below bottom because of negative values! IF async, results in: 121: attempt to index a nil value
        //return [[90,95,100, 105, 110, 115], [500, 600, 700, 800, 900, 1000]]; // IF function is NOT async, this draws a ternary, few points at this expressions corner due to large values
/*
        const p = this._dataSource.readPosition([a]);
        const presult = await p;
        return this.makeLuaTable(`position-${a}`, presult); // Results in: null function or function signature mismatch
        // IF WE set enableProxy to true, this results in a runtime error: 116: one of first 2 arguments expected to be a map
*/
        //return this.makeLuaTable(`position-${a}`, await this._dataSource.readPosition([a])); // Results in: null function or function signature mismatch
        //return new Promise(resolve => { setTimeout(()=>resolve(this.makeLuaTable(`position-${a}`, this.getPos())), 6000); }); // Results in: null function or function signature mismatch
        //return [[90,95,100, 105, 110, 115], [500, 600, 700, null, 900, 1000]]; // Results in: Expression returned incomplete map data: number of PMCs did not match number of values 
        //return "wtf"; // Results in: Runtime error on line 116: [string "-- Copyright (c) 2018-2022 California Institu..."]:116: one of first 2 arguments expected to be a map
        //return new Promise(resolve => {return ([[1,2,3],[10,20,30]]);}); // Results in: null function or function signature mismatch
        //return new Promise(resolve => {resolve([[1,2,3],[10,20,30]]);});// Results in: Runtime error on line 121: attempt to index a nil value
        //return new Promise(() => {}); // Results in: null function or function signature mismatch
        //return new Promise(resolve => {resolve(new Promise(resolve => {resolve([[1,2,3],[10,20,30]]);}))});
        //return new Promise(resolve => {resolve(this.makeLuaTable(`position-${a}`, this.getPos()))});
        //return this.makeLuaTable(`position-${a}`, PMCDataValues.makeWithValues([new PMCDataValue(300, 50)]));
      },
      /*(a: any) => {
        return new Promise(resolve => {
          console.log(resolve);
          setTimeout(resolve, 6000);
        });
      },*/
    ],
    [
      "makeMap",
      (a: any) => {
        return this.makeLuaTableAsync(`makeMap-${a}`, this._dataSource.makeMap([a]));
      },
    ],
  ]);
/*
  private getPos() {
    return PMCDataValues.makeWithValues([
      new PMCDataValue(93, -0.12210600078105927),
      new PMCDataValue(94, -0.12235599756240845),
      new PMCDataValue(95, -0.12260600179433823),
      new PMCDataValue(96, -0.12285599857568741),
      new PMCDataValue(97, -0.12310799956321716),
      new PMCDataValue(98, -0.12336400151252747),
      new PMCDataValue(99, -0.12362000346183777),
      new PMCDataValue(100, -0.12387499958276749),
      new PMCDataValue(101, -0.12413100153207779),
      new PMCDataValue(102, -0.12438599765300751),
      new PMCDataValue(103, -0.12464100122451782),
      new PMCDataValue(104, -0.1248970031738281),
      new PMCDataValue(105, -0.12515200674533844),
      new PMCDataValue(106, -0.12540699541568756),
      new PMCDataValue(107, -0.12566199898719788),
      new PMCDataValue(108, -0.1259160041809082),
      new PMCDataValue(109, -0.12617099285125732),
      new PMCDataValue(110, -0.12642499804496765),
      new PMCDataValue(111, -0.12667900323867798),
      new PMCDataValue(112, -0.1269340068101883),
      new PMCDataValue(113, -0.12718799710273743),
      new PMCDataValue(114, -0.12744200229644775),
      new PMCDataValue(115, -0.1276949942111969),
      new PMCDataValue(116, -0.12794800102710724),
      new PMCDataValue(117, -0.1281999945640564),
      new PMCDataValue(118, -0.12845200300216675),
      new PMCDataValue(119, -0.1287039965391159),
      new PMCDataValue(120, -0.12895600497722626),
      new PMCDataValue(121, -0.12920799851417542),
      new PMCDataValue(122, -0.12945899367332458),
      new PMCDataValue(123, -0.12971100211143494),
      new PMCDataValue(124, -0.1299629956483841),
      new PMCDataValue(125, -0.13021500408649445),
      new PMCDataValue(126, -0.1304669976234436),
      new PMCDataValue(127, -0.13071900606155396),
      new PMCDataValue(128, -0.13094699382781982),
      new PMCDataValue(129, -0.13120099902153015),
      new PMCDataValue(130, -0.13145500421524048),
      new PMCDataValue(131, -0.1317089945077896),
      new PMCDataValue(132, -0.13196200132369995),
      new PMCDataValue(134, -0.13246899843215942),
      new PMCDataValue(135, -0.13272200524806976),
      new PMCDataValue(136, -0.1329749971628189),
      new PMCDataValue(137, -0.13322700560092926),
      new PMCDataValue(138, -0.13347899913787842),
      new PMCDataValue(139, -0.1337299942970276),
      new PMCDataValue(140, -0.13398200273513794),
      new PMCDataValue(141, -0.1342329978942871),
      new PMCDataValue(142, -0.13448500633239746),
      new PMCDataValue(143, -0.13473699986934662),
      new PMCDataValue(144, -0.1349879950284958),
      new PMCDataValue(145, -0.13523900508880615),
      new PMCDataValue(146, -0.1354909986257553),
      new PMCDataValue(147, -0.13574300706386566),
      new PMCDataValue(148, -0.13599400222301483),
      new PMCDataValue(149, -0.136244997382164),
      new PMCDataValue(150, -0.13649700582027435),
      new PMCDataValue(151, -0.13674800097942352),
      new PMCDataValue(152, -0.1369989961385727),
      new PMCDataValue(153, -0.13725100457668304),
      new PMCDataValue(154, -0.13750199973583221),
      new PMCDataValue(155, -0.13775299489498138),
      new PMCDataValue(156, -0.13800400495529175),
      new PMCDataValue(157, -0.13825500011444092),
      new PMCDataValue(158, -0.13850699365139008),
      new PMCDataValue(159, -0.13875700533390045),
      new PMCDataValue(160, -0.1390089988708496),
      new PMCDataValue(161, -0.13925999402999878),
      new PMCDataValue(162, -0.13951100409030914),
      new PMCDataValue(163, -0.1397619992494583),
      new PMCDataValue(164, -0.14001399278640747),
      new PMCDataValue(165, -0.14026500284671783),
      new PMCDataValue(166, -0.140515998005867),
      new PMCDataValue(167, -0.1407659947872162),
      new PMCDataValue(168, -0.14104600250720978),
      new PMCDataValue(169, -0.14129699766635895),
      new PMCDataValue(170, -0.14154799282550812),
      new PMCDataValue(171, -0.14179900288581848),
      new PMCDataValue(172, -0.14204999804496765),
      new PMCDataValue(173, -0.14229999482631683),
      new PMCDataValue(175, -0.1428000032901764),
      new PMCDataValue(176, -0.14305099844932556),
      new PMCDataValue(177, -0.14329999685287476),
      new PMCDataValue(178, -0.14354899525642395),
      new PMCDataValue(179, -0.14379699528217316),
      new PMCDataValue(180, -0.14404599368572235),
      new PMCDataValue(181, -0.14429399371147156),
      new PMCDataValue(182, -0.14454099535942078),
      new PMCDataValue(183, -0.14478899538516998),
      new PMCDataValue(184, -0.1450359970331192),
      new PMCDataValue(185, -0.1452839970588684),
      new PMCDataValue(186, -0.14553099870681763),
      new PMCDataValue(187, -0.14577700197696686),
      new PMCDataValue(188, -0.14602400362491608),
      new PMCDataValue(189, -0.1462700068950653),
      new PMCDataValue(190, -0.14651599526405334),
      new PMCDataValue(191, -0.14676199853420258),
      new PMCDataValue(192, -0.1470080018043518),
      new PMCDataValue(193, -0.14725400507450104),
      new PMCDataValue(194, -0.147498995065689),
      new PMCDataValue(195, -0.14774399995803833),
      new PMCDataValue(196, -0.14799100160598755),
      new PMCDataValue(197, -0.14823700487613678),
      new PMCDataValue(198, -0.14848199486732483),
      new PMCDataValue(199, -0.14872799813747406),
      new PMCDataValue(200, -0.1489730030298233),
      new PMCDataValue(201, -0.14921799302101135),
      new PMCDataValue(202, -0.1494629979133606),
      new PMCDataValue(203, -0.14970800280570984),
      new PMCDataValue(204, -0.1499519944190979),
      new PMCDataValue(205, -0.15019699931144714),
      new PMCDataValue(206, -0.1504410058259964),
      new PMCDataValue(207, -0.15068499743938446),
      new PMCDataValue(208, -0.15108799934387207),
      new PMCDataValue(209, -0.13599400222301),
    ]);
  }
*/
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

    // this._lua.global.set("position", async (ms: number) => {
    //   return new Promise(resolve => setTimeout(resolve, ms));
    // });

    // Special simple ones, we don't have debugging for these
    this._lua.global.set("atomicMass", (symbol: string) => {
      return periodicTableDB.getMolecularMass(symbol);
    });
    this._lua.global.set("exists", (dataType: string, column: string) => {
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
    recordExpressionInputs: boolean
  ): Observable<DataQueryResult> {
    this._execCount++;
    this._dataSource = dataSource;

    const t0 = performance.now();
    this._makeLuaTableTime = 0;

    // Run our code in a unique function name for this runner. This is in case there is any possibility of clashing with
    // another Lua runner (there shouldn't be!)
    const exprFuncName = "expr_" + this._id + "_" + this._execCount;

    if (!this._luaInit$) {
      this._luaInit$ = this.initLua().pipe(
        shareReplay(1),
        catchError(err => {
          // We failed within init$, cleaer our lua variable so we re-init in future
          this._lua = null;
          console.error(err);
          throw err;
        })
      );
    }

    return this._luaInit$.pipe(
      concatMap(() => {
        //this.dumpLua("Pre installing modules");
        // Install any modules supplied
        //let imports = "";
        for (const [moduleName, moduleSource] of modules) {
          //imports += this.makeLuaModuleImportStatement(moduleName);
          this.installModule(moduleName, moduleSource);
        }

        //this.dumpLua("Pre expression run");

        // We're inited, now run!
        const codeParts = this.formatLuaCallable(sourceCode, exprFuncName /*, imports*/);
        return this.runQueryInternal(codeParts.join(""), cleanupLua, t0, allowAnyResponse, recordExpressionInputs);
      })
    );
  }

  private runLuaCode(sourceCode: string, timeoutMs: number): Observable<any> {
    if (!this._lua) {
      throw new Error("runLuaCode: Lua not initialised");
    }

    // Set the timeout value
    this._lua.global.setTimeout(Date.now() + timeoutMs);

    let p = this._lua.doString(sourceCode);

    return from(p).pipe(
      // map(result => {
      //   console.log(result);
      //   return result;
      // }),
      finalize(() => {
        // Remove timeout as it will run out if we leave it here and things in future will fail
        if (this._lua && this._lua.global) {
          // Check if it's still around though!
          this._lua.global.setTimeout(0);
        }
      })
    );
  }

  private runLuaCodeSync(sourceCode: string, timeoutMs: number): any {
    if (!this._lua) {
      return null;
    }
    this._lua.global.setTimeout(Date.now() + timeoutMs);
    const result = this._lua.doStringSync(sourceCode);
    this._lua.global.setTimeout(0);
    return result;
  }

  private runQueryInternal(
    sourceCode: string,
    cleanupLua: boolean,
    t0: number,
    allowAnyResponse: boolean,
    recordExpressionInputs: boolean
  ): Observable<DataQueryResult> {
    // Ensure the list of data required is cleared, from here on we're logging what the expression required to run!
    this._runtimeDataRequired.clear();

    // Also clear stdout and stderr here
    this._runtimeStdOut = "";
    this._runtimeStdErr = "";

    // If we want to record tables (well, any inputs) that the expression requires to run, remember this
    this._logTables = recordExpressionInputs;
    this._loggedTables.clear();

    return this.runLuaCode(sourceCode, environment.luaTimeoutMs).pipe(
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

          const runtimeMs = performance.now() - t0;
          console.log(this._logId + ">>> Lua expression took: " + runtimeMs.toLocaleString() + "ms, makeTable calls took: " + this._makeLuaTableTime + "ms");

          //this.dumpLua("Post expression run");

          return new DataQueryResult(
            formattedData,
            isPMCTable,
            Array.from(this._runtimeDataRequired.keys()),
            runtimeMs,
            this._runtimeStdOut,
            this._runtimeStdErr,
            this._loggedTables
          );
        }

        throw new Error("Expression: did not return a value");
      }),
      catchError(err => {
        const parsedErr = this.parseLuaError(err, sourceCode);

        // We may need to reset Lua as we seem to have a resource leak that causes an error after running about 20 expressions
        // TODO: this will need fixing at somepoint!
        if (parsedErr.message.indexOf("memory access out of bounds") >= 0) {
          cleanupLua = true;
        }

        console.error(parsedErr);

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
  private parseLuaError(err: any, sourceCode: string): Error {
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
      let result = new Error(`${errTypeStr} error on line ${errLine}: ${errMsg}`);
      result["stack"] = err?.stack;
      result["line"] = errLine;
      result["errType"] = errType;
      if (errSourceLine.length >= 0) {
        result["sourceLine"] = errSourceLine;
      }

      return result;
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

    const values: PMCDataValue[] = [];
    let c = 0;
    for (let pmc of table[0]) {
      let value: number = table[1][c];
      let isUndef = false;
      if (value === null) {
        value = 0;
        isUndef = true;
      }

      values.push(new PMCDataValue(pmc, value, isUndef));
      c++;
    }

    return PMCDataValues.makeWithValues(values);
  }

  private makeLuaTable(tableSource: string, data: PMCDataValues): any {
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
  }

  private async makeLuaTableAsync(tableSource: string, data: Promise<PMCDataValues>): Promise<any> {
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

      const t1 = performance.now();

      this._makeLuaTableTime += t1 - t0;
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
