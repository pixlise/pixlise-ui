/* eslint-disable prettier/prettier */
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
import { ReplaySubject, Subject, Subscription, Observable, combineLatest, of, concatMap } from "rxjs";
import { map, catchError, tap } from "rxjs/operators";
import { PMCDataValue, PMCDataValues, DataQueryResult } from "src/app/expression-language/data-values";
import { ExpressionRunnerService } from "src/app/services/expression-runner.service";
import { ObjectCreator, SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { MistROIItem, PredefinedROIID, ROIItem, ROISavedItem } from "src/app/models/roi";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { QuantificationService, ZStackItem } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { ViewState, ViewStateService } from "src/app/services/view-state.service";
import { RGBA } from "src/app/utils/colours";
import { httpErrorToString, randomString, SentryHelper } from "src/app/utils/utils";
import { environment } from "src/environments/environment";
import { APIDataService } from "./apidata.service";
import { ExpressionGetReq, ExpressionGetResp, ExpressionWriteExecStatReq } from "src/app/generated-protos/expression-msgs";
import { DataExpression } from "src/app/generated-protos/expressions";
import { DataModule } from "src/app/generated-protos/modules";
import { DataModuleGetReq, DataModuleGetResp } from "src/app/generated-protos/module-msgs";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { DataQuerier, EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { ExpressionDataSource } from "../models/expression-data-source";
import { InterpreterDataSource } from "src/app/expression-language/interpreter-data-source";



export enum DataUnit {
    //UNIT_WEIGHT_PCT,
    UNIT_DEFAULT, // Was ^ but realised we don't know what the underlying unit is... the following only work if possible...
    UNIT_MMOL,
    UNIT_PPM
}

export class DataSourceParams {
    constructor(
        public scanId: string,
        public exprId: string,
        public quantId: string,
        public roiId: string,
        public units: DataUnit = DataUnit.UNIT_DEFAULT
    ) {
    }
}

export enum WidgetDataErrorType {
    WERR_NONE = "none",
    WERR_ROI = "roi",
    WERR_EXPR = "expr",
    WERR_QUERY = "query"
}

export class RegionDataResultItem {
    constructor(
        public exprResult: DataQueryResult,
        public errorType: WidgetDataErrorType,
        public error: string,
        public warning: string,
        public query: DataSourceParams,
        public isPMCTable: boolean = true,
    ) {
    }

    get values(): PMCDataValues {
        return this.exprResult?.resultValues;
    }
}

export class RegionDataResults {
    private _hasQueryErrors: boolean = false;

    constructor(public queryResults: RegionDataResultItem[], public error: string) {
        for(const item of queryResults) {
            if(item.error) {
                this._hasQueryErrors = true;
                break;
            }
        }
    }

    hasQueryErrors(): boolean {
        return this._hasQueryErrors;
    }
}


class LoadedSources {
    constructor(public expressionSrc: string, public modules: Map<string, DataModule>) {}
}

@Injectable({
    providedIn: "root"
})
export class WidgetDataService
{
    // Query result cache - for slow queries we cache their result
    //private _resultCache: QueryResultCache = new QueryResultCache(environment.expressionResultCacheThresholdMs, 60000, 10000);

    constructor(
        private _dataService: APIDataService
        /*
        private _roiService: ROIService,
        private _selectionService: SelectionService,
        private _viewStateService: ViewStateService,
        private _exprService: DataExpressionService,
        private _datasetService: DataSetService,
        private _quantService: QuantificationService,
        private _diffractionService: DiffractionPeakService,
        private _exprRunnerService: ExpressionRunnerService,*/
    ) {
    }

    // This queries data based on parameters. The assumption is it either returns null, or returns an array with the same
    // amount of items as the input parameters array (what). This is required because code calling this can then know which
    // DataSourceParams is associated with which returned value. The result array may contain null items, but the length
    // should equal "what.length". There are also error values that can be returned.
    getData(what: DataSourceParams[]/*, continueOnError: boolean*/): Observable<RegionDataResults> {
        // Query each one separately and combine results at the end
        const exprResult$: Observable<DataQueryResult>[] = [];
        for (const query of what) {
            exprResult$.push(this.getDataSingle(query, false));
        }

        // Now wait for all expressions to complete
        const exprResults$ = combineLatest(exprResult$);
        return exprResults$.pipe(
            map(
                (results: DataQueryResult[])=> {
                    const resultItems = [];
                    for (let c = 0; c < results.length; c++) {
                        resultItems.push(this.processQueryResult(results[c], what[c]));
                    }
                    return new RegionDataResults(resultItems, "");
                }
            ),
            catchError(
                (err)=>
                {
                    console.error(err);
                    throw new Error(err);
                }
            )
        );
    }

    private getDataSingle(query: DataSourceParams, allowAnyResponse: boolean): Observable<DataQueryResult> {
        // Firstly, we need the expression being run
        return this._dataService.sendExpressionGetRequest(ExpressionGetReq.create({id: query.exprId})).pipe(
            concatMap(
                (resp: ExpressionGetResp)=>{
                    if (resp.expression === undefined) {
                        throw new Error(`Expression ${query.exprId} failed to be read`);
                    }

                    return this.runExpression(resp.expression, query.scanId, query.quantId, query.roiId, allowAnyResponse).pipe(
                        catchError(
                            (err)=> {
                                const errorMsg = httpErrorToString(err, "WidgetDataService.getData catchError");

                                // Only send stuff to sentry that are exceptional. Common issues just get handled on the client and it can recover from them
                                if(
                                    errorMsg.indexOf("The currently loaded quantification does not contain data for detector") < 0 &&
                                    errorMsg.indexOf("The currently loaded quantification does not contain column") < 0
                                ) {
                                    SentryHelper.logMsg(true, errorMsg);
                                }

                                return of(new DataQueryResult(null, false, [], 0, "", "", new Map<string, PMCDataValues>(), errorMsg));
                            }
                        )
                    );
                }
            )
        );
    }

    // Runs an expression with given parameters. If errors are encountered, they will be returned as part of the Observables own
    // error handling interface.
    private runExpression(
        expression: DataExpression,
        scanId: string,
        quantId: string,
        roiId: string,
        // TODO: calibration as a parameter?
        allowAnyResponse: boolean
    ): Observable<DataQueryResult> {
        return this.loadCodeForExpression(expression).pipe(
            concatMap(
                (sources: LoadedSources) => {
                    // We now have the ready-to-go source code, run the query
                    // At this point we should have the expression source and 0 or more modules
                    if(!sources.expressionSrc) {
                        throw new Error("loadCodeForExpression did not return expression source code for: "+expression.id);
                    }
                    
                    const modSources = this.makeRunnableModules(sources.modules);

                    // Pass in the source and module sources separately
                    const querier = new DataQuerier();
                    const dataSource = new ExpressionDataSource();

                    // TODO: look up the calibration value here!!
                    const calibration: SpectrumEnergyCalibration[] = [];
                    
                    return dataSource.prepare(this._dataService, scanId, quantId, roiId, calibration).pipe(
                        concatMap(
                            () => {
                                const intDataSource = new InterpreterDataSource(
                                    dataSource,
                                    dataSource,
                                    dataSource,
                                    dataSource,
                                    dataSource,
                                );

                                return querier.runQuery(sources.expressionSrc, modSources, expression.sourceLanguage, intDataSource, allowAnyResponse, false).pipe(
                                    map(
                                        (queryResult: DataQueryResult)=>
                                        {
                                            // Save runtime stats for this expression
                                            this._dataService.sendExpressionWriteExecStatRequest(ExpressionWriteExecStatReq.create({
                                                id: expression.id,
                                                stats: {
                                                    dataRequired: queryResult.dataRequired,
                                                    runtimeMs: queryResult.runtimeMs
                                                    // timeStampUnixSec - filled out by API
                                                }
                                            })).subscribe(); // we don't really do anything different if this passes or fails
            
                                            // Return the results, but filter for PMCs requested, if need be
                                            return queryResult;
                                        }
                                    )
                                );
                            }
                        )
                    )
                }
            )
        );
    }

    private makeRunnableModules(loadedmodules: Map<string, DataModule>): Map<string, string> {
        // Build the map required by runQuery. NOTE: here we pass the module name, not the ID!
        const modSources = new Map<string, string>();
        for(const [modId, mod] of loadedmodules) {
            if (mod.versions.length != 1) {
                throw new Error(`Module ${modId} expected 1 version, got: ${mod.versions.length}`);
            }

            modSources.set(mod.name, mod.versions[0].sourceCode);
        }

        return modSources;
    }

    private loadCodeForExpression(expression: DataExpression): Observable<LoadedSources> {
        // Filter out crazy cases
        if(expression.sourceCode.length <= 0) {
            throw new Error(`Expression ${expression.id} source code is empty`);
        }

        if(expression.moduleReferences.length > 0 && expression.sourceLanguage != EXPR_LANGUAGE_LUA) {
            throw new Error(`Expression ${expression.id} references modules, but source language is not Lua`);
        }

        // If we are a simple loaded expression that doesn't have references, early out!
        const result = new LoadedSources(expression.sourceCode, new Map<string, DataModule>());
        if(expression.sourceCode.length > 0 && expression.moduleReferences.length <= 0) {
            return of(result);
        }

        // Read the module sources
        const waitModules$: Observable<DataModule>[] = [];
        for(const ref of expression.moduleReferences) {
            waitModules$.push(this._dataService.sendDataModuleGetRequest(DataModuleGetReq.create({id: ref.moduleId, version: ref.version})).pipe(
                map(
                    (value: DataModuleGetResp)=> {
                        if (value.module === undefined) {
                            throw new Error(`Module ${ref.moduleId} version ${ref.version} came back empty`);
                        }
                        return value.module;
                    }
                )
            ));
        }

        const allResults$ = combineLatest(waitModules$);
        return allResults$.pipe(
            map(
                (sources: unknown[])=>
                {
                    // At this point, we should have all the source code we're interested in. Combine them!
                    for (const src of sources) {
                        const moduleVersion = src as DataModule;
                        result.modules.set(moduleVersion.id, moduleVersion);
                    }

                    return result;
                }
            )
        );
    }
    
    private processQueryResult(
        result: DataQueryResult,
        query: DataSourceParams,
    ): RegionDataResultItem
    {
        const pmcValues = result?.resultValues as PMCDataValues;
        if(!Array.isArray(pmcValues?.values) || (pmcValues.values.length > 0 && !(pmcValues.values[0] instanceof PMCDataValue))) {
            return new RegionDataResultItem(
                new DataQueryResult(
                    result.resultValues,
                    result.isPMCTable,
                    result.dataRequired,
                    result.runtimeMs,
                    result.stderr,
                    result.stderr,
                    result.recordedExpressionInputs
                ),
                WidgetDataErrorType.WERR_QUERY,
                "Result is not a PMC array!",
                "", // warning
                query,
                false
            );
        }

        // Apply unit conversion if needed
        const unitConverted = this.applyUnitConversion(query.exprId, pmcValues, query.units);

        const resultItem = new RegionDataResultItem(
            new DataQueryResult(
                unitConverted, // Put this in the result
                result.isPMCTable,
                result.dataRequired,
                result.runtimeMs,
                result.stderr,
                result.stderr,
                result.recordedExpressionInputs
            ),
            WidgetDataErrorType.WERR_NONE,
            "", // error
            unitConverted.warning,
            query
        );

        return resultItem;
    }

    private applyUnitConversion(sourceExpressionId: string, data: PMCDataValues, unitsRequested: DataUnit): PMCDataValues {
        let result = data;

        // Run through all points and apply the units requested. NOTE: This may not work, eg if we're not in the right source units, we can't
        // convert, so in those cases we do nothing
        const  col = DataExpressionId.getPredefinedQuantExpressionElementColumn(sourceExpressionId);
        if(col === "%") {
            // We allow conversions here...
            let conversion = 1;
            if(unitsRequested == DataUnit.UNIT_MMOL) {
                // Need to parse the elements out of the expression to calculate molecular mass and form a conversion factor
                const formula = DataExpressionId.getPredefinedQuantExpressionElement(sourceExpressionId);
                if(formula.length > 0) {
                    const mass = periodicTableDB.getMolecularMass(formula);
                    if(mass > 0) {
                        // Success parsing it, work out the conversion factor:
                        // weight % (eg 30%) -> decimal (div by 100)
                        // divide by mass
                        // mult by 1000 to give mol/kg
                        conversion = 1/100/mass*1000;
                    }
                }
            }
            else if(unitsRequested == DataUnit.UNIT_PPM) {
                // For now, not supported
            }
            //console.log('applyUnitConversion for '+col+' in '+sourceExpression.id+', conversion='+conversion);
            if(conversion != 1) {
                const values: PMCDataValue[] = [];
                for(let val of data.values) {
                    let valToSave = val.value*conversion;
                    if(val.isUndefined) {
                        valToSave = 0;
                    }

                    values.push(new PMCDataValue(val.pmc, valToSave, val.isUndefined));
                }
                result = PMCDataValues.makeWithValues(values);
            }
        }

        return result;
    }
}
