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
import { DataQueryResult } from "src/app/expression-language/data-values";
import { InterpreterDataSource } from "./interpreter-data-source";
import { PixliseDataQuerier } from "./interpret-pixlise";
import { LuaDataQuerier } from "./interpret-lua";
import { LuaTranspiler } from "./lua-transpiler";
import { ResultComparer } from "./result-comparer";
import { environment } from "src/environments/environment";

export const EXPR_LANGUAGE_LUA = "LUA";
export const EXPR_LANGUAGE_PIXLANG = "PIXLANG";

export class DataQuerier {
  private _interpretPixlise: PixliseDataQuerier;
  private _interpretLua: LuaDataQuerier;
  private _luaTranspiler: LuaTranspiler | undefined;
  private _resultComparer: ResultComparer | undefined;

  constructor() {
    this._interpretPixlise = new PixliseDataQuerier();
    this._interpretLua = new LuaDataQuerier(environment.luaDebug);
    if (environment.initExpressionLanguageComparer || environment.initLuaTranspiler) {
      this._luaTranspiler = new LuaTranspiler();
    }
    if (environment.initExpressionLanguageComparer) {
      this._resultComparer = new ResultComparer(this._interpretPixlise, this._interpretLua, environment.expressionLanguageCompareDiffAllowed);
    }
  }

  // Run a query (expression code)
  // expression: Source code string to execute
  // modules (Lua only!): Executed before expression source to ensure modules are available for expression
  // dataSource: Used to get any data the expression requires
  // allowAnyResponse: Allows not just PMCDataValues to be returned, but anything the expression gives back. Number, string, object, list, etc
  // recordExpressionInputs (Lua only!): Save any data source data the expression required. Useful for debugging/exporting, not required for normal query runs
  public runQuery(
    expression: string,
    modules: Map<string, string>,
    expressionLanguage: string,
    dataSource: InterpreterDataSource,
    allowAnyResponse: boolean,
    recordExpressionInputs: boolean,
    maxTimeoutMs: number = environment.luaTimeoutMs
  ): Observable<DataQueryResult> {
    // Decide which interperter to run it in
    if (expressionLanguage == EXPR_LANGUAGE_LUA) {
      return this._interpretLua.runQuery(
        expression,
        modules,
        dataSource,
        environment.newLuaPerExpression,
        allowAnyResponse /*, recordExpressionInputs*/,
        maxTimeoutMs
      );
    } else {
      if (this._luaTranspiler) {
        // Transpile to Lua for debugging purposes
        const asLua = this._luaTranspiler.transpile(expression);

        // If we've got a result comparer, run that
        if (this._resultComparer) {
          const line = this._resultComparer.findDifferenceLine(asLua, modules, expression, environment.expressionLanguageCompareSkipLines, dataSource);
          if (line < 0) {
            console.log("No difference between PIXLISE and Lua expressions");
          } else {
            console.log("PIXLISE and Lua expressions differ at line: " + line);
          }
        } else {
          console.log(asLua);
        }
      }

      if (modules.size > 0) {
        //throw new Error("PIXLANG expression called with modules defined");
        console.warn("Ignoring modules: " + modules.keys() + " specified for PIXLANG expression");
      }

      return this._interpretPixlise.runQuery(expression, dataSource);
    }
  }
}
