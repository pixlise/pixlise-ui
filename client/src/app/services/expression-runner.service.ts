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

import { Injectable } from "@angular/core";
import { Observable, of, combineLatest } from "rxjs";
import { map } from "rxjs/operators";

import { DataExpressionService } from "./data-expression.service";
import { DataModuleService, DataModuleSpecificVersionWire } from "src/app/services/data-module.service";

import {
    DiffractionPeakQuerierSource,
    //HousekeepingDataQuerierSource,
    //PseudoIntensityDataQuerierSource,
    QuantifiedDataQuerierSource,
    //SpectrumDataQuerierSource
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { DataSetService } from "src/app/services/data-set.service";
import { DataExpression } from "src/app/models/Expression";
import { DataQuerier, EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";


@Injectable({
    providedIn: "root"
})
export class ExpressionRunnerService
{
    private _querier: DataQuerier = null;

    constructor(
        private _datasetService: DataSetService,
        private _moduleService: DataModuleService,
        private _exprService: DataExpressionService,
    )
    {
    }

    runExpression(
        expression: DataExpression,
        quantSource: QuantifiedDataQuerierSource,
        diffractionSource: DiffractionPeakQuerierSource,
        forPMCs: Set<number> = null
    ): Observable<PMCDataValues>
    {
        if(!this._querier)
        {
            this._querier = new DataQuerier(
                quantSource,
                // NOTE: all of these come from the dataset. At one point we weren't sure how they would be available at runtime so we have separate
                // interfaces for each. In future we could still modify this further and break these out again!
                this._datasetService.datasetLoaded, // pseudoSource
                this._datasetService.datasetLoaded, // housekeepingSource
                this._datasetService.datasetLoaded, // spectrumSource
                diffractionSource,
                this._datasetService.datasetLoaded
            );
        }

        return new Observable<PMCDataValues>(
            (observer)=>
            {
                this.loadCodeForExpression(expression).subscribe(
                    (sources: Map<string, string>)=>
                    {
                        // We now have the ready-to-go source code, run the query
                        // At this point we should have the expression source and 0 or more modules
                        let exprSource = sources.get(this._exprKey);
                        if(!exprSource)
                        {
                            throw new Error("loadCodeForExpression did not return expression source code for: "+expression.id)
                        }
                        sources.delete(this._exprKey);

                        // Pass in the source and module sources separately
                        this._querier.runQuery(exprSource, sources, expression.sourceLanguage).subscribe(
                            (queryResult: PMCDataValues)=>
                            {
                                let finalResult = this.filterForPMCs(queryResult, forPMCs);
                                observer.next(finalResult);
                                observer.complete();
                            },
                            (err)=>
                            {
                                observer.error(err);
                            }
                        )
                    },
                    (err)=>
                    {
                        observer.error(err);
                    }
                );
            }
        );
    }

    private _exprKey = "";

    private loadCodeForExpression(expression: DataExpression): Observable<Map<string, string>>
    {
        // Filter out crazy cases
        if(expression.moduleReferences.length > 0 && expression.sourceLanguage != EXPR_LANGUAGE_LUA)
        {
            throw new Error("Expression "+expression.id+" references modules, but source language is not Lua");
        }

        // If we are a simple loaded expression that doesn't have references, early out!
        let result = new Map<string, string>([[this._exprKey, expression.sourceCode]]);
        if(expression.sourceCode.length > 0 && expression.moduleReferences.length <= 0)
        {
            return of(result);
        }

        // This can have blank source code because it was retrieved from the API listing call - in which case we need to query it specifically
        // The expression references any number of modules, which may also have blank source code and also needs to be queried directly!
        let waitSource$: Observable<DataExpression> = null;
        let waitModules$: Observable<DataModuleSpecificVersionWire>[] = [];

        if(expression.sourceCode.length <= 0)
        {
            waitSource$ = this._exprService.getExpressionAsync(expression.id);
        }

        for(let ref of expression.moduleReferences)
        {
            waitModules$.push(this._moduleService.getModule(ref.moduleID, ref.version));
        }

        let toWait$: any[] = [];
        if(waitSource$ != null)
        {
            toWait$.push(waitSource$);
        }
        
        toWait$ = [...toWait$, ...waitModules$];

        let allResults$ = combineLatest(toWait$);
        return allResults$.pipe(
            map(
                (sources: unknown[])=>
                {
                    // Check if we loaded source - if we did, it'll be the first item and has a different data type
                    let readOffset = 0;
                    if(waitSource$ != null)
                    {
                        let expr = sources[0] as DataExpression;

                        // Use the loaded one
                        result.set(this._exprKey, expr.sourceCode);

                        // Look at the next ones...
                        readOffset = 1;
                    }

                    // At this point, we should have all the source code we're interested in. Combine them!
                    for(let c = 0; c < sources.length; c++)
                    {
                        let moduleVersion = sources[c+readOffset] as DataModuleSpecificVersionWire;
                        result.set(moduleVersion.name, moduleVersion.version.sourceCode);
                    }

                    return result;
                }
            )
        );
    }

    private filterForPMCs(queryResult: PMCDataValues, forPMCs: Set<number>): PMCDataValues
    {
        // Filter for PMCs requested
        // TODO: Modify this so we don't uneccessarily run expressions for PMCs we end up throwing away
        if(forPMCs === null)
        {
            return queryResult;
        }

        // Build a new result only containing PMCs specified
        let resultValues: PMCDataValue[] = [];
        for(let item of queryResult.values)
        {
            if(forPMCs.has(item.pmc))
            {
                resultValues.push(item);
            }
        }

        return PMCDataValues.makeWithValues(resultValues);
    }
}