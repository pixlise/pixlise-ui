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

import { LuaDataQuerier } from "src/app/expression-language/interpret-lua";
//import { InterpreterDataSource } from "./interpreter-data-source";
import { PMCDataValue, PMCDataValues, DataQueryResult } from "src/app/expression-language/data-values";

export const mockFuncs = ["getScanId", "getQuantId", "getInstrument", "getMaxSpectrumChannel", "getElevAngle"];
export function setupMock(ds: any) {
  ds.getScanId.and.returnValue("scan123");
  ds.getQuantId.and.returnValue("quant123");
  ds.getInstrument.and.returnValue("PIXL_FM");
  ds.getMaxSpectrumChannel.and.returnValue(4096);
  ds.getElevAngle.and.returnValue(70);
}
describe("LuaDataQuerier parseLuaError()", () => {
  it("should parse (JS function err)", () => {
    const err = new Error(
      'element() expression expects 3 parameters: element, datatype, detector Id. Received: ["Fe","%",null]\nstack traceback:\n\t[string "local Map = makeMapLib()..."]:7: in local \'expr_4fab_5\'\n\t[string "local Map = makeMapLib()..."]:9: in main chunk'
    );
    err.stack =
      'Error: element() expression expects 3 parameters: element, datatype, detector Id. Received: ["Fe","%",null]\n    at InterpreterDataSource.readElement (http://localhost:4200/main.js:54096:19) [<root>]\n    at LuaDataQuerier.LreadElement (http://localhost:4200/main.js:53475:51) [<root>]\n    at http://localhost:4200/main.js:53144:52 [<root>]\n    at http://localhost:4200/vendor.js:142222:33 [<root>]\n    at http://localhost:4200/assets/lua/glue.wasm:wasm-function[322]:0x207fd [<root>]\n    at http://localhost:4200/assets/lua/glue.wasm:wasm-function[260]:0x1a6a8 [<root>]\n    at http://localhost:4200/assets/lua/glue.wasm:wasm-function[219]:0x15ccc [<root>]\n    at http://localhost:4200/assets/lua/glue.wasm:wasm-function[620]:0x38c42 [<root>]\n    at lb (http://localhost:4200/vendor.js:146145:18) [<root>]\n    at http://localhost:4200/assets/lua/glue.wasm:wasm-function[146]:0xbb10 [<root>]\n    at http://localhost:4200/assets/lua/glue.wasm:wasm-function[433]:0x2e938 [<root>]\n    at c.ccall (http://localhost:4200/vendor.js:146183:17) [<root>]\n    at LuaWasm.pointersToBeFreed [as lua_resume] (http://localhost:4200/vendor.js:146660:41) [<root>]\n    at Thread.resume (http://localhost:4200/vendor.js:141522:36) [<root>]';

    const lua = new LuaDataQuerier(false, "user123");
    const err2 = lua["parseLuaError"](err, "1\n2\n3\n4\n5\n6\n7\n8\n");

    expect(err2.message).toEqual(err.message);
    expect(err2.stack).toEqual(err.stack);
  });

  it("should parse (Syntax error)", () => {
    const err = new Error('[string "local Map = makeMapLib()..."]:7: unfinished string near \'"A)\'');
    err.stack =
      "Error: Lua Error(ErrorSyntax/3)\n    at Thread.assertOk (http://localhost:4200/vendor.js:141840:23) [<root>]\n    at Thread.loadString (http://localhost:4200/vendor.js:141507:14) [<root>]\n    at http://localhost:4200/vendor.js:142799:49 [<root>]\n    at http://localhost:4200/vendor.js:142827:11 [<root>]\n    at Generator.next (<anonymous>) [<root>]\n    at asyncGeneratorStep (http://localhost:4200/vendor.js:149744:24) [<root>]\n    at _next (http://localhost:4200/vendor.js:149766:9) [<root>]\n    at http://localhost:4200/vendor.js:149773:7 [<root>]\n    at new ZoneAwarePromise (http://localhost:4200/polyfills.js:5756:33) [<root>]\n    at http://localhost:4200/vendor.js:149762:12 [<root>]\n    at LuaEngine.callByteCode (http://localhost:4200/vendor.js:142838:9) [<root>]\n    at LuaEngine.doString (http://localhost:4200/vendor.js:142799:19) [<root>]\n    at LuaDataQuerier.runQueryInternal (http://localhost:4200/main.js:53302:69) [<root>]\n    at MergeMapSubscriber.project (http://localhost:4200/main.js:53298:25) [<root>]";

    const lua = new LuaDataQuerier(false, "user123");
    const err2 = lua["parseLuaError"](err, "1\n2\n3\n4\n5\n6\n7\n8\n");

    expect(err2.line).toEqual(7);
    expect(err2.message).toEqual("Syntax error on line 7: unfinished string near '\"A)'");
    expect(err2.stack).toEqual(err.stack);
    expect(err2.sourceLine).toEqual("7");
    expect(err2.errType).toEqual("ErrorSyntax");
  });

  it("should parse (Different syntax error)", () => {
    const err = new Error("[string \"local Map = makeMapLib()...\"]:7: 'end' expected (to close 'function' at line 4) near ')'");
    err.stack =
      "Error: Lua Error(ErrorSyntax/3)\n    at Thread.assertOk (http://localhost:4200/vendor.js:141840:23) [<root>]\n    at Thread.loadString (http://localhost:4200/vendor.js:141507:14) [<root>]\n    at http://localhost:4200/vendor.js:142799:49 [<root>]\n    at http://localhost:4200/vendor.js:142827:11 [<root>]\n    at Generator.next (<anonymous>) [<root>]\n    at asyncGeneratorStep (http://localhost:4200/vendor.js:149744:24) [<root>]\n    at _next (http://localhost:4200/vendor.js:149766:9) [<root>]\n    at http://localhost:4200/vendor.js:149773:7 [<root>]\n    at new ZoneAwarePromise (http://localhost:4200/polyfills.js:5756:33) [<root>]\n    at http://localhost:4200/vendor.js:149762:12 [<root>]\n    at LuaEngine.callByteCode (http://localhost:4200/vendor.js:142838:9) [<root>]\n    at LuaEngine.doString (http://localhost:4200/vendor.js:142799:19) [<root>]\n    at LuaDataQuerier.runQueryInternal (http://localhost:4200/main.js:53302:69) [<root>]\n    at MergeMapSubscriber.project (http://localhost:4200/main.js:53298:25) [<root>]";

    const lua = new LuaDataQuerier(false, "user123");
    const err2 = lua["parseLuaError"](err, "1\n2\n3\n4\n5\n6\n7\n8\n");

    expect(err2.line).toEqual(7);
    expect(err2.message).toEqual("Syntax error on line 7: 'end' expected (to close 'function' at line 4) near ')'");
    expect(err2.stack).toEqual(err.stack);
    expect(err2.sourceLine).toEqual("7");
    expect(err2.errType).toEqual("ErrorSyntax");
  });

  it("should parse (Runtime error)", () => {
    const err = new Error(
      '[string "local Map = makeMapLib()..."]:5: attempt to call a nil value (field \'addd\')\nstack traceback:\n\t[string "local Map = makeMapLib()..."]:8: in main chunk'
    );
    err.stack =
      "Error: Lua Error(ErrorRun/2)\n    at Thread.assertOk (http://localhost:4200/vendor.js:141840:23) [<root>]\n    at http://localhost:4200/vendor.js:141589:17 [<root>]\n    at Generator.next (<anonymous>) [<root>]\n    at asyncGeneratorStep (http://localhost:4200/vendor.js:149744:24) [<root>]\n    at _next (http://localhost:4200/vendor.js:149766:9) [<root>]\n    at http://localhost:4200/vendor.js:149773:7 [<root>]\n    at new ZoneAwarePromise (http://localhost:4200/polyfills.js:5756:33) [<root>]\n    at http://localhost:4200/vendor.js:149762:12 [<root>]\n    at Thread.run (http://localhost:4200/vendor.js:141597:9) [<root>]\n    at http://localhost:4200/vendor.js:142828:39 [<root>]\n    at Generator.next (<anonymous>) [<root>]\n    at asyncGeneratorStep (http://localhost:4200/vendor.js:149744:24) [<root>]\n    at _next (http://localhost:4200/vendor.js:149766:9) [<root>]\n    at http://localhost:4200/vendor.js:149773:7 [<root>]";

    const lua = new LuaDataQuerier(false, "user123");
    const err2 = lua["parseLuaError"](err, "1\n2\n3\n4\n5\n6\n7\n8\n");

    expect(err2["line"]).toEqual(5);
    expect(err2.message).toEqual("Runtime error on line 5: [string \"local Map = makeMapLib()...\"]:5: attempt to call a nil value (field 'addd')");
    expect(err2.stack).toEqual(err.stack);
    expect(err2["sourceLine"]).toEqual("5");
    expect(err2["errType"]).toEqual("ErrorRun");
  });

  it("should parse (Calling error in lua function)", () => {
    const err = new Error(
      '[string "local Map = makeMapLib()..."]:6: Something went wrong\nstack traceback:\n\t[string "local Map = makeMapLib()..."]:6: in local \'expr_6a3a_2\'\n\t[string "local Map = makeMapLib()..."]:9: in main chunk'
    );
    err.stack =
      "Error: Lua Error(ErrorRun/2)\n    at Thread.assertOk (http://localhost:4200/vendor.js:141840:23) [<root>]\n    at http://localhost:4200/vendor.js:141589:17 [<root>]\n    at Generator.next (<anonymous>) [<root>]\n    at asyncGeneratorStep (http://localhost:4200/vendor.js:149744:24) [<root>]\n    at _next (http://localhost:4200/vendor.js:149766:9) [<root>]\n    at http://localhost:4200/vendor.js:149773:7 [<root>]\n    at new ZoneAwarePromise (http://localhost:4200/polyfills.js:5756:33) [<root>]\n    at http://localhost:4200/vendor.js:149762:12 [<root>]\n    at Thread.run (http://localhost:4200/vendor.js:141597:9) [<root>]\n    at http://localhost:4200/vendor.js:142828:39 [<root>]\n    at Generator.next (<anonymous>) [<root>]\n    at asyncGeneratorStep (http://localhost:4200/vendor.js:149744:24) [<root>]\n    at _next (http://localhost:4200/vendor.js:149766:9) [<root>]\n    at http://localhost:4200/vendor.js:149773:7 [<root>]";

    const lua = new LuaDataQuerier(false, "user123");
    const err2 = lua["parseLuaError"](err, "1\n2\n3\n4\n5\n6\n7\n8\n");

    expect(err2.line).toEqual(6);
    expect(err2.message).toEqual('Runtime error on line 6: [string "local Map = makeMapLib()..."]:6: Something went wrong');
    expect(err2.stack).toEqual(err.stack);
    expect(err2.sourceLine).toEqual("6");
    expect(err2.errType).toEqual("ErrorRun");
  });
});

describe("LuaDataQuerier runQuery()", () => {
  it("should run simple func returning string", done => {
    const lua = new LuaDataQuerier(false, "user123");
    const ds = jasmine.createSpyObj("InterpreterDataSource", ["readElement", ...mockFuncs], []);
    setupMock(ds);

    lua.runQuery('return "hello".."world"..333', new Map<string, string>(), ds, true, true, false).subscribe(
      // Result
      value => {
        const exp = new DataQueryResult("helloworld333", false, [], value.runtimeMs, "", "", new Map<string, PMCDataValues>(), new Map<string, string>(), "");
        expect(value.runtimeMs > 0);
        expect(value).toEqual(exp);
      },
      // Error handler
      err => {
        fail("Expected value");
      },
      // Finalizer
      done
    );
  });

  it("should reject string result if asked to", done => {
    const lua = new LuaDataQuerier(false, "user123");
    const ds = jasmine.createSpyObj("InterpreterDataSource", ["readElement", ...mockFuncs], []);
    setupMock(ds);

    lua.runQuery('return "hello".."world"..333', new Map<string, string>(), ds, true, false, false).subscribe(
      // Result
      null,
      // Error handler
      err => {
        expect(err.message).toEqual("Expression did not return map data in expected format");
        done();
      }
    );
  });

  it("should run simple func returning number", done => {
    const lua = new LuaDataQuerier(false, "user123");
    const ds = jasmine.createSpyObj("InterpreterDataSource", ["readElement", ...mockFuncs], []);
    setupMock(ds);

    lua.runQuery("return 3+4", new Map<string, string>(), ds, true, true, false).subscribe(
      // Result
      value => {
        const exp = new DataQueryResult(7, false, [], value.runtimeMs, "", "", new Map<string, PMCDataValues>(), new Map<string, string>(), "");
        expect(value.runtimeMs > 0);
        expect(value).toEqual(exp);
      },
      // Error handler
      null,
      // Finalizer
      done
    );
  });

  it("should run fail if unknown lua func called", done => {
    const lua = new LuaDataQuerier(false, "user123");
    const ds = jasmine.createSpyObj("InterpreterDataSource", ["readElement", ...mockFuncs], []);
    setupMock(ds);

    lua.runQuery('return nonExistantFunc("Ca", "%", "B")', new Map<string, string>(), ds, true, true, false).subscribe(
      // Result
      null,
      // Error handler
      err => {
        expect(err.message).toEqual("Runtime error on line 7: attempt to call a nil value (global 'nonExistantFunc')");
        done();
      }
    );
  });

  it("should run simple expression", done => {
    const lua = new LuaDataQuerier(false, "user123");
    const ds = jasmine.createSpyObj("InterpreterDataSource", ["readElement", ...mockFuncs], []);
    const Ca = PMCDataValues.makeWithValues([new PMCDataValue(4, 10), new PMCDataValue(5, 11), new PMCDataValue(7, 12)]);
    setupMock(ds);
    ds.readElement.and.returnValue(Promise.resolve(Ca));

    lua.runQuery('return element("Ca", "%", "B")', new Map<string, string>(), ds, true, true, false).subscribe(
      // Result
      value => {
        const exp = new DataQueryResult(Ca, true, ["expr-elem-Ca-%(B)"], value.runtimeMs, "", "", new Map<string, PMCDataValues>(), new Map<string, string>(), "");
        expect(value).toEqual(exp);
      },
      // Error handler
      null,
      // Finalizer
      done
    );
  });

  it("works with PIXLISE supplied consts", done => {
    const lua = new LuaDataQuerier(false, "user123");
    const ds = jasmine.createSpyObj("InterpreterDataSource", mockFuncs, []);
    setupMock(ds);

    lua
      .runQuery(`return instrument..","..scanId..","..quantId..","..maxSpectrumChannel..","..elevAngle`, new Map<string, string>(), ds, true, true, false)
      .subscribe({
        // Result
        next: value => {
          expect(value.resultValues).toEqual("PIXL_FM,scan123,quant123,4096,70");
        },
        // Error handler
        //error: null,
        // Finalizer
        complete: done,
      });
  });

  /* Input recording no longer works since everything went async
  it("should run simple expression (and record inputs)", done => {
    const lua = new LuaDataQuerier(false);
    const ds = jasmine.createSpyObj("InterpreterDataSource", ["readElement"], []);
    const Ca = PMCDataValues.makeWithValues([new PMCDataValue(4, 10), new PMCDataValue(5, 11), new PMCDataValue(7, 12)]);
    ds.readElement.and.returnValue(Promise.resolve(Ca));

    lua.runQuery('return element("Ca", "%", "B")', new Map<string, string>(), ds, true, true, true).subscribe(
      // Result
      value => {
        const exp = new DataQueryResult(Ca, true, ["expr-elem-Ca-%(B)"], value.runtimeMs, "", "", new Map<string, PMCDataValues>([["elem-Ca-%-B", Ca]]), new Map<string, string>(), "");
        expect(value).toEqual(exp);
      },
      // Error handler
      null,
      // Finalizer
      done
    );
  });*/
});

describe("LuaDataQuerier runQuery() caching", () => {
  it("should save expression cache value when requested", done => {
    const lua = new LuaDataQuerier(false, "user123");
    const ds = jasmine.createSpyObj("InterpreterDataSource", ["readElement", "memoise", "getMemoised", ...mockFuncs], []);
    setupMock(ds);

    const mapValues = PMCDataValues.makeWithValues([
      new PMCDataValue(5, 3.45),
      new PMCDataValue(7, 7.93),
      new PMCDataValue(8, 4.33),
      new PMCDataValue(9, 20.37),
      new PMCDataValue(1055, 10.72),
      new PMCDataValue(1056, 12.29),
    ]);

    const jsCachedItem = {
      anum: 72.94,
      elements: ["CaO", "FeT", "MnT"],
      amap: [
        [5, 7, 8, 9, 1055, 1056],
        [3.45, 7.93, 4.33, 20.37, 10.72, 12.29],
      ],
    };

    //ds.readElement.and.returnValue(Promise.resolve(Ca));
    ds.memoise.and.callFake((args: any[]) => {
      const k = args[0];
      expect(k).toEqual("GeoData");

      const v = args[1];
      expect(v).toEqual(jsCachedItem);
      // console.log("memoise: " + k);
      // console.log(args[1]);
      return Promise.resolve(true);
    });
    ds.getMemoised.and.callFake((args: any[]) => {
      const k = args[0];
      if (k == "GeoData") {
        return Promise.resolve(jsCachedItem);
      }
      return Promise.resolve(null);
    });

    lua
      .runQuery(
        `local amap = {{5, 7, 8, 9, 1055, 1056}, {3.45, 7.93, 4.33, 20.37, 10.72, 12.29}}
local tocache = {}
tocache["amap"] = amap
tocache["anum"] = 72.94
tocache["elements"] = {"CaO", "FeT", "MnT"}

--print(DebugHelp.printTable("tocache", tocache))
local x = writeCache("GeoData", tocache)
if x ~= true then
  return "writeCache(GeoData) unexpected result: "..x
end

local notHere = readCache("DoesntExist", false)
if notHere ~= nil then
  return "readCache(DoesntExist, false) unexpected result: "..notHere
end

local readWorked = readCache("GeoData", false)
if readWorked == nil or
    readWorked["anum"] ~= 72.94 or
    readWorked["elements"][1] ~= "CaO" or
    readWorked["elements"][2] ~= "FeT" or
    readWorked["elements"][3] ~= "MnT" or
    #readWorked["amap"] ~= 2 or
    #readWorked["amap"][1] ~= 6 or
    readWorked["amap"][1][4] ~= 9 or
    readWorked["amap"][2][4] ~= 20.37 then
  print("BAD RESULT: ")
  DebugHelp.printTable("readWorked", readWorked)

  return "readCache(GeoData, false) returned unexpected value"
end

return readWorked["amap"]`,
        new Map<string, string>(),
        ds,
        true,
        true,
        false
      )
      .subscribe(
        // Result
        value => {
          const exp = new DataQueryResult(mapValues, true, [], value.runtimeMs, "", "", new Map<string, PMCDataValues>(), new Map<string, string>(), "");
          expect(value).toEqual(exp);
        },
        // Error handler
        null,
        // Finalizer
        done
      );
  });
});
