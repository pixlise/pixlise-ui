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
import { map } from "rxjs/operators";
import {
    DiffractionPeakQuerierSource, HousekeepingDataQuerierSource, PseudoIntensityDataQuerierSource, QuantifiedDataQuerierSource, SpectrumDataQuerierSource
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues, QuantOp } from "src/app/expression-language/data-values";
import { DataSet } from "src/app/models/DataSet";
import { InterpreterDataSource } from "./interpreter-data-source";
import { PixliseDataQuerier } from "./interpret-pixlise";
import { LuaDataQuerier } from "./interpret-lua";
import { LuaTranspiler } from "./lua-transpiler";
import { ResultComparer } from "./result-comparer";
import { environment } from "src/environments/environment";

export const LUA_MARKER = "-- LUA\n";

// Helper function to run a query
export function getQuantifiedDataWithExpression(
    expression: string,
    quantSource: QuantifiedDataQuerierSource,
    pseudoSource: PseudoIntensityDataQuerierSource,
    housekeepingSource: HousekeepingDataQuerierSource,
    spectrumSource: SpectrumDataQuerierSource,
    diffractionSource: DiffractionPeakQuerierSource,
    dataset: DataSet,
    forPMCs: Set<number> = null
): Observable<PMCDataValues>
{
    let query = new DataQuerier(quantSource, pseudoSource, housekeepingSource, spectrumSource, diffractionSource, dataset);
    let queryResult = query.runQuery(expression);

    if(forPMCs === null)
    {
        return queryResult;
    }

    return queryResult.pipe(
        map((result: PMCDataValues)=>
        {
            // Build a new result only containing PMCs specified
            let resultValues: PMCDataValue[] = [];
            for(let item of result.values)
            {
                if(forPMCs.has(item.pmc))
                {
                    resultValues.push(item);
                }
            }

            return PMCDataValues.makeWithValues(resultValues);
        }
    ));
}

export class DataQuerier
{
    private _dataSource: InterpreterDataSource = null;
    private _interpretPixlise: PixliseDataQuerier = null;
    private _interpretLua: LuaDataQuerier = null;
    private _luaTranspiler: LuaTranspiler = null;
    private _resultComparer: ResultComparer = null;

    constructor(
        quantDataSource: QuantifiedDataQuerierSource,
        pseudoDataSource: PseudoIntensityDataQuerierSource,
        housekeepingDataSource: HousekeepingDataQuerierSource,
        spectrumDataSource: SpectrumDataQuerierSource,
        diffractionSource: DiffractionPeakQuerierSource,
        dataset: DataSet,
    )
    {
        this._dataSource = new InterpreterDataSource(
            quantDataSource,
            pseudoDataSource,
            housekeepingDataSource,
            spectrumDataSource,
            diffractionSource,
            dataset
        );

        this._interpretPixlise = new PixliseDataQuerier(this._dataSource);
        this._interpretLua = new LuaDataQuerier(this._dataSource, environment.luaDebug);
        if(environment.initExpressionLanguageComparer || environment.initLuaTranspiler)
        {
            this._luaTranspiler = new LuaTranspiler();
        }
        if(environment.initExpressionLanguageComparer)
        {
            this._resultComparer = new ResultComparer(this._interpretPixlise, this._interpretLua, environment.expressionLanguageCompareDiffAllowed);
        }
    }

    public runQuery(expression: string): Observable<PMCDataValues>
    {
        // Decide which interperter to run it in
        if(this.isLUA(expression))
        {
            // Trim the marker
            expression = expression.substring(LUA_MARKER.length);

            return this._interpretLua.runQuery(expression);
        }
        else
        {
            if(this._luaTranspiler)
            {
                // Transpile to Lua for debugging purposes
                let asLua = this._luaTranspiler.transpile(expression);

                // If we've got a result comparer, run that
                if(this._resultComparer)
                {
                    let line = this._resultComparer.findDifferenceLine(asLua, expression, environment.expressionLanguageCompareSkipLines);
                    if(line < 0)
                    {
                        console.log("No difference between PIXLISE and Lua expressions");
                    }
                    else
                    {
                        console.log("PIXLISE and Lua expressions differ at line: "+line);
                    }
                }
                else
                {
                    console.log(asLua);
                }
            }

            return this._interpretPixlise.runQuery(expression);
        }
    }

    private isLUA(expression: string): boolean
    {
        return expression.startsWith(LUA_MARKER);
    }
}
