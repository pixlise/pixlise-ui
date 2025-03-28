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

import { Observable, combineLatest, of } from "rxjs";
import { PixliseDataQuerier } from "./interpret-pixlise";
import { LuaDataQuerier } from "./interpret-lua";
import { PMCDataValues, DataQueryResult } from "src/app/expression-language/data-values";
import { InterpreterDataSource } from "./interpreter-data-source";

export class ResultComparer {
  constructor(
    private _interpretPixlise: PixliseDataQuerier,
    private _interpretLua: LuaDataQuerier,
    private _allowedDifferenceLuaToPIXLISE: number
  ) {}

  // Returns -1 if they are the same
  findDifferenceLine(exprLua: string, modulesLua: Map<string, string>, exprPIXLISE: string, afterLine: number, dataSource: InterpreterDataSource): number {
    let result = -1; // No difference found

    // Run each expression up to the line we're checking, take the variable and check the maps generated
    // so we can stop when they differ
    const exprLuaLines = exprLua.split("\n");
    const exprPIXLISELines = exprPIXLISE.split("\n");
    if (exprLuaLines.length != exprPIXLISELines.length) {
      throw new Error("Expression line lengths didn't match");
    }

    let exprLuaRan = "";
    let exprPIXLISERan = "";

    const lineResultsLua = new Map<string, PMCDataValues>();
    const lineResultsPIXLISE = new Map<string, PMCDataValues>();

    for (let c = 0; c < exprLuaLines.length; c++) {
      const luaParts = this.splitLine(exprLuaLines[c], "--");
      const pixParts = this.splitLine(exprPIXLISELines[c], "//");

      if (luaParts.length != pixParts.length) {
        throw new Error("Expressions differ on line: " + (c + 1));
      }

      if (c >= afterLine && luaParts.length > 0) {
        console.log("Comparing line " + (c + 1) + " of " + exprLuaLines.length + " " + ((c + 1) / exprLuaLines.length) * 100 + "%");

        // Check they're the same var assignment
        if (luaParts[0] != pixParts[0]) {
          throw new Error("Expressions assign to different vars on line: " + (c + 1));
        }

        // Run each one to get the value
        let exprLuaToRun = this.appendTo(exprLuaRan, exprLuaLines[c]);
        exprLuaToRun += "\nreturn " + luaParts[0];

        let exprPIXLISEToRun = this.appendTo(exprPIXLISERan, exprPIXLISELines[c]);
        exprPIXLISEToRun += "\n" + pixParts[0];

        const luaResult$ = this.runLua(exprLuaToRun, modulesLua, dataSource);
        const pixResult$ = this.runPIXLISE(exprPIXLISEToRun, dataSource);

        const allResults$ = combineLatest([luaResult$, pixResult$]);
        allResults$.subscribe(results => {
          const luaResult = results[0];
          const pixResult = results[1];

          if (!this.isEqual(luaResult.resultValues, pixResult.resultValues)) {
            console.log("PIXLISE line: " + exprLuaLines[c]);
            console.log("PIXLISE value for " + pixParts[0] + ":");
            console.log(pixResult);
            console.log("Lua line: " + exprPIXLISELines[c]);
            console.log("Lua value for " + luaParts[0] + ":");
            console.log(luaResult);

            // Run them again so we can step through it in the debugger
            const luaResult2$ = this.runLua(exprLuaToRun, modulesLua, dataSource);
            const pixResult2$ = this.runPIXLISE(exprPIXLISEToRun, dataSource);

            const allResults$ = combineLatest([luaResult2$, pixResult2$]);
            allResults$.subscribe(results => {});

            if (result < 0) {
              // We're only returning the first difference line
              result = c + 1;
            }
          } else {
            // Just check one for weird stuff
            this.checkAndWarn(luaResult.resultValues, c, luaParts[0]);

            lineResultsLua.set(luaParts[0], luaResult.resultValues);
            lineResultsPIXLISE.set(pixParts[0], pixResult.resultValues);
          }
        });
      }

      exprLuaRan = this.appendTo(exprLuaRan, exprLuaLines[c]);
      exprPIXLISERan = this.appendTo(exprPIXLISERan, exprPIXLISELines[c]);
    }

    // Final check
    if (result == -1 && exprLuaLines.length >= afterLine) {
      const luaResultFinal$ = this.runLua(exprLua, modulesLua, dataSource);
      const pixResultFinal$ = this.runPIXLISE(exprPIXLISE, dataSource);

      const allResults$ = combineLatest([luaResultFinal$, pixResultFinal$]);
      allResults$.subscribe(results => {
        if (results !== null && !this.isEqual(results[0].resultValues, results[1].resultValues)) {
          console.log("Expression final values differ!");
          result = exprLuaLines.length - 1;
        }
      });

      //console.log(JSON.stringify(luaResultFinal, null, 2));
      //console.log(JSON.stringify(pixResultFinal, null, 2));
    }

    // Return the first line number we found to differ
    return result;
  }

  private runLua(expression: string, modules: Map<string, string>, dataSource: InterpreterDataSource): Observable<DataQueryResult | null> {
    try {
      return this._interpretLua.runQuery(expression, modules, dataSource, false, false, false);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith("Table expected to have arrays")) {
        throw err;
      }
    }

    // Shut up compiler
    return of(null);
  }

  private runPIXLISE(expression: string, dataSource: InterpreterDataSource): Observable<DataQueryResult | null> {
    try {
      return this._interpretPixlise.runQuery(expression, dataSource);
    } catch (err) {
      if (err instanceof Error && err.message.indexOf("did not result in usable map data") < 0) {
        throw err;
      }
    }

    // Shut up compiler
    return of(null);
  }

  private splitLine(line: string, commentStart: string): string[] {
    const commentPos = line.indexOf(commentStart);
    if (commentPos >= 0) {
      line = line.substring(0, commentPos);
    }

    const eqPos = line.indexOf("=");
    if (eqPos > 0) {
      // Has a variable def
      const varName = line.substring(0, eqPos).trim();
      const expr = line.substring(eqPos + 1).trim();
      return [varName, expr];
    }

    return [];
  }

  private appendTo(script: string, line: string): string {
    let result = "";
    result += script;
    if (script.length > 0) {
      result += "\n";
    }
    result += line;
    return result;
  }

  private isEqual(a: PMCDataValues | null, b: PMCDataValues | null): boolean {
    if (a == null && b == null) {
      return true;
    }

    if (a == null || b == null) {
      return false;
    }

    if (a.values.length != b.values.length) {
      return false;
    }

    for (let c = 0; c < a.values.length; c++) {
      if (
        a.values[c].pmc != b.values[c].pmc ||
        (isNaN(a.values[c].value) || !isFinite(a.values[c].value)) != (isNaN(b.values[c].value) || !isFinite(b.values[c].value)) ||
        //isNaN(a.values[c].value) != isNaN(b.values[c].value) ||
        //isFinite(a.values[c].value) != isFinite(b.values[c].value) ||
        Math.abs(a.values[c].value - b.values[c].value) > this._allowedDifferenceLuaToPIXLISE
      ) {
        console.log(`Difference: ${a.values[c].pmc}, ${a.values[c].value} vs ${b.values[c].pmc}, ${b.values[c].value}`);
        return false;
      }
    }

    return true;
  }

  private checkAndWarn(m: PMCDataValues, line: number, varName: string): void {
    for (let c = 0; c < m.values.length; c++) {
      if (!isFinite(m.values[c].value)) {
        console.log("Not finite: " + m.values[c].pmc + " on line: " + line + ", var=" + varName);
      } else if (isNaN(m.values[c].value)) {
        console.log("NAN: " + m.values[c].pmc + " on line: " + line + ", var=" + varName);
      }
    }
  }
}
