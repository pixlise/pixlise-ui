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
import { Observable, combineLatest, of, concatMap, mergeMap, throwError } from "rxjs";
import { map, catchError, shareReplay } from "rxjs/operators";
import { PMCDataValue, PMCDataValues, DataQueryResult } from "src/app/expression-language/data-values";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { httpErrorToString, SentryHelper } from "src/app/utils/utils";
import { APIDataService } from "./apidata.service";
import { ExpressionGetReq, ExpressionGetResp, ExpressionWriteExecStatReq } from "src/app/generated-protos/expression-msgs";
import { DataExpression } from "src/app/generated-protos/expressions";
import { DataModuleVersion } from "src/app/generated-protos/modules";
import { DataModuleGetReq, DataModuleGetResp } from "src/app/generated-protos/module-msgs";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { DataQuerier, EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { ExpressionDataSource } from "../models/expression-data-source";
import { InterpreterDataSource } from "src/app/expression-language/interpreter-data-source";
import { APICachedDataService } from "./apicacheddata.service";
import { RegionSettings } from "../../roi/models/roi-region";
import { ROIService } from "../../roi/services/roi.service";
import { getPredefinedExpression } from "src/app/expression-language/predefined-expressions";
import { EnergyCalibrationService } from "./energy-calibration.service";

export type DataModuleVersionWithRef = {
  id: string;
  name: string;
  moduleVersion: DataModuleVersion;
};

export enum DataUnit {
  //UNIT_WEIGHT_PCT,
  UNIT_DEFAULT, // Was ^ but realised we don't know what the underlying unit is... the following only work if possible...
  UNIT_MMOL,
  UNIT_PPM,
}

export class DataSourceParams {
  constructor(
    public scanId: string,
    public exprId: string,
    public quantId: string,
    public roiId: string,
    public units: DataUnit = DataUnit.UNIT_DEFAULT
  ) {}
}

export class WidgetError extends Error {
  constructor(
    message: string,
    public description: string
  ) {
    super(message);
    this.name = "WidgetError";
  }
}

export class RegionDataResultItem {
  constructor(
    public exprResult: DataQueryResult,
    public error: WidgetError | null,
    public warning: string,
    public expression: DataExpression | null,
    public region: RegionSettings | null,
    public query: DataSourceParams,
    public isPMCTable: boolean = true
  ) {}

  get values(): PMCDataValues {
    return this.exprResult?.resultValues;
  }

  // Returns a human-readable identity string that allows working out which query is which. For example
  // in case of an error message on a widget where multiple queries have run, we call this to say
  // this is the query that the error was generated for
  public identity(): string {
    return `scan: "${this.query.scanId}", expr: "${this.expression?.name || ""}" (${this.query.exprId}, ${this.expression?.sourceLanguage || ""}), roi: "${
      this.query.roiId
    }", quant: "${this.query.quantId}"`;
  }
}

export class RegionDataResults {
  private _hasQueryErrors: boolean = false;

  constructor(
    public queryResults: RegionDataResultItem[],
    public error: string
  ) {
    for (const item of queryResults) {
      if (item.error) {
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
  constructor(
    public expressionSrc: string,
    public modules: Map<string, DataModuleVersion>
  ) {}
}

@Injectable({
  providedIn: "root",
})
export class WidgetDataService {
  private _exprRunStatLastNotificationTime = new Map<string, number>();

  public unsavedExpressions: Map<string, DataExpression> = new Map<string, DataExpression>();

  // A cache that hands out existing observables while they are still waiting. This is due to us often getting
  // tons of requests for the same expression because the UI element wanting it got reset while other things loaded.
  // The existing observable is still being worked on, so a new subscriber can be attached to it.
  // NOTE: These items only exist until the observable is completed, it is then removed from the cache so subsequent
  //       requests would re-create the observable again.
  private _inFluxSingleQueryResultCache: Map<string, Observable<DataQueryResult>> = new Map<string, Observable<DataQueryResult>>();

  constructor(
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService,
    private _roiService: ROIService,
    private _energyCalibrationService: EnergyCalibrationService
  ) {}

  // This queries data based on parameters. The assumption is it either returns null, or returns an array with the same
  // amount of items as the input parameters array (what). This is required because code calling this can then know which
  // DataSourceParams is associated with which returned value. The result array may contain null items, but the length
  // should equal "what.length". There are also error values that can be returned.
  getData(what: DataSourceParams[] /*, continueOnError: boolean*/): Observable<RegionDataResults> {
    // Query each one separately and combine results at the end
    const exprResult$: Observable<DataQueryResult>[] = [];
    for (const query of what) {
      exprResult$.push(this.getDataSingle(query, false));
    }

    // Now wait for all expressions to complete
    const exprResults$ = combineLatest(exprResult$);
    return exprResults$.pipe(
      map((results: DataQueryResult[]) => {
        const resultItems = [];
        for (let c = 0; c < results.length; c++) {
          resultItems.push(this.processQueryResult(results[c], what[c]));
        }
        return new RegionDataResults(resultItems, "");
      }),
      catchError(err => {
        console.error(err);
        throw new Error(err);
      })
    );
  }

  private makeCacheKey(query: DataSourceParams, allowAnyResponse: boolean): string {
    return JSON.stringify(query) + "," + allowAnyResponse;
  }

  private getDataSingle(query: DataSourceParams, allowAnyResponse: boolean): Observable<DataQueryResult> {
    // Here we have our first level of caching. This is because a widget can be re-inited/updated due to many things
    // such as UI refresh/colours or settings loading, etc. We don't want each to trigger a whole new run of an
    // expression, so check if we already have an observable we can return for this
    const cacheKey = this.makeCacheKey(query, allowAnyResponse);
    const cached = this._inFluxSingleQueryResultCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Firstly, we need the expression being run - note it could be a "predefined" one, so we have some
    // special handling here that ends up just returning an expression!
    const obs = this.getExpression(query.exprId).pipe(
      concatMap((expr: DataExpression) => {
        return this.runExpression(expr, query.scanId, query.quantId, query.roiId, allowAnyResponse).pipe(
          mergeMap((result: DataQueryResult) => {
            return this._roiService.getRegionSettings(query.roiId).pipe(
              map((roiSettings: RegionSettings) => {
                result.region = roiSettings;

                // Remove from cache, we only want to cache while it's running, subsequent ones should
                // re-run it
                this._inFluxSingleQueryResultCache.delete(cacheKey);

                return result;
              })
            );
          }),
          catchError(err => {
            const errorMsg = httpErrorToString(err, "Expression runtime error"); // We use this function because it can decode many kinds of error class/type

            // Only send stuff to sentry that are exceptional. Common issues just get handled on the client and it can recover from them
            if (
              errorMsg.indexOf("The currently loaded quantification does not contain data for detector") < 0 &&
              errorMsg.indexOf("The currently loaded quantification does not contain column") < 0
            ) {
              SentryHelper.logMsg(true, errorMsg);
            }

            return of(new DataQueryResult(null, false, [], 0, "", "", new Map<string, PMCDataValues>(), errorMsg, expr));
          })
        );
      }),
      shareReplay(1),
      catchError(err => {
        const errorMsg = httpErrorToString(err, "Error getting expression: " + query.exprId);
        console.error(errorMsg);
        return of(new DataQueryResult(null, false, [], 0, "", "", new Map<string, PMCDataValues>(), errorMsg));
      })
    );

    // Add to our cache
    this._inFluxSingleQueryResultCache.set(cacheKey, obs);
    return obs;
  }

  private getExpression(id: string): Observable<DataExpression> {
    // If this is for a "predefined" expression, return one from memory here
    if (DataExpressionId.isPredefinedExpression(id)) {
      const expr = getPredefinedExpression(id);
      if (!expr) {
        return throwError(() => new Error("Failed to create predefined expression for: " + id));
      }
      return of(expr);
    }

    // If we have an unsaved one, return that
    if (this.unsavedExpressions.has(id)) {
      return of(this.unsavedExpressions.get(id)) as Observable<DataExpression>;
    }

    // Must be a real one, retrieve it as normal
    return this._cachedDataService.getExpression(ExpressionGetReq.create({ id })).pipe(
      map((resp: ExpressionGetResp) => {
        if (resp.expression === undefined) {
          throw new Error(`Expression ${id} failed to be read`);
        }

        return resp.expression;
      })
    );
  }

  clearUnsavedExpressions(): void {
    this.unsavedExpressions.clear();
  }

  // Runs an expression with given parameters. If errors are encountered, they will be returned as part of the Observables own
  // error handling interface.
  runExpression(
    expression: DataExpression,
    scanId: string,
    quantId: string,
    roiId: string,
    // TODO: calibration as a parameter?
    allowAnyResponse: boolean,
    isUnsaved: boolean = false
  ): Observable<DataQueryResult> {
    console.log(
      `runExpression for scan: ${scanId}, expr: "${expression.name}" (${expression.id}, ${expression.sourceLanguage}), roi: "${roiId}", quant: "${quantId}"`
    );

    if (isUnsaved) {
      this.unsavedExpressions.set(expression.id, expression);
    }

    const calibration$ = this._energyCalibrationService.getCurrentCalibration(scanId);
    const expr$ = this.loadCodeForExpression(expression);

    // Load both of these
    return combineLatest([calibration$, expr$]).pipe(
      concatMap((loadResult: [SpectrumEnergyCalibration[], LoadedSources]) => {
        const calibration = loadResult[0];
        const sources = loadResult[1];
        // We now have the ready-to-go source code, run the query
        // At this point we should have the expression source and 0 or more modules
        if (!sources.expressionSrc) {
          throw new Error("loadCodeForExpression did not return expression source code for: " + expression.id);
        }

        const modSources = this.makeRunnableModules(sources.modules);

        // Pass in the source and module sources separately
        const querier = new DataQuerier();
        const dataSource = new ExpressionDataSource();

        return dataSource.prepare(this._cachedDataService, scanId, quantId, roiId, calibration).pipe(
          concatMap(() => {
            const intDataSource = new InterpreterDataSource(dataSource, dataSource, dataSource, dataSource, dataSource);

            return querier.runQuery(sources.expressionSrc, modSources, expression.sourceLanguage, intDataSource, allowAnyResponse, false).pipe(
              map((queryResult: DataQueryResult) => {
                console.log(`>>> ${expression.sourceLanguage} expression "${expression.name}" took: ${queryResult.runtimeMs.toLocaleString()}ms`);

                // Save runtime stats for this expression if we haven't done this recently (don't spam)
                const nowMs = Date.now();
                const lastNotify = this._exprRunStatLastNotificationTime.get(expression.id);
                if (!lastNotify || nowMs - lastNotify > 60000) {
                  // Also, normalise it for runtime for 1000 points!
                  let runtimePer1000 = 0;
                  if (queryResult.runtimeMs > 0 && queryResult.resultValues.values.length > 0) {
                    runtimePer1000 = queryResult.runtimeMs / (queryResult.resultValues.values.length / 1000);
                  }

                  // Remember when we notified, so we don't spam
                  this._exprRunStatLastNotificationTime.set(expression.id, nowMs);

                  if (!DataExpressionId.isPredefinedExpression(expression.id) && queryResult.dataRequired.length > 0) {
                    this._dataService
                      .sendExpressionWriteExecStatRequest(
                        ExpressionWriteExecStatReq.create({
                          id: expression.id,
                          stats: {
                            dataRequired: queryResult.dataRequired,
                            runtimeMsPer1000Pts: runtimePer1000,
                            // timeStampUnixSec - filled out by API
                          },
                        })
                      )
                      .subscribe({
                        error: err => {
                          console.error(httpErrorToString(err, "sendExpressionWriteExecStatRequest"));
                        },
                      }); // we don't really do anything different if this passes or fails
                  }
                }

                // Add the other stuff we loaded along the way
                queryResult.expression = expression;

                return queryResult;
              })
            );
          })
        );
      })
    );
  }

  private makeRunnableModules(loadedModules: Map<string, DataModuleVersion>): Map<string, string> {
    // Build the map required by runQuery. NOTE: here we pass the module name, not the ID!
    const modSources = new Map<string, string>();
    for (const [modName, mod] of loadedModules) {
      modSources.set(modName, mod.sourceCode);
    }

    return modSources;
  }

  private loadCodeForExpression(expression: DataExpression): Observable<LoadedSources> {
    // Filter out crazy cases
    if (expression.sourceCode.length <= 0) {
      throw new Error(`Expression ${expression.id} source code is empty`);
    }

    if (expression.moduleReferences.length > 0 && expression.sourceLanguage != EXPR_LANGUAGE_LUA) {
      throw new Error(`Expression ${expression.id} references modules, but source language is not Lua`);
    }

    // If we are a simple loaded expression that doesn't have references, early out!
    const result = new LoadedSources(expression.sourceCode, new Map<string, DataModuleVersion>());
    if (expression.sourceCode.length > 0 && expression.moduleReferences.length <= 0) {
      return of(result);
    }

    // Read the module sources
    const waitModules$: Observable<DataModuleVersionWithRef>[] = [];
    for (const ref of expression.moduleReferences) {
      waitModules$.push(
        this._cachedDataService.getDataModule(DataModuleGetReq.create({ id: ref.moduleId, version: ref.version })).pipe(
          map((value: DataModuleGetResp) => {
            if (value.module === undefined) {
              throw new Error(`Module ${ref.moduleId} version ${ref.version} came back empty`);
            }

            let moduleVersion = value.module.versions.find(
              v => v.version?.major === ref.version?.major && v.version?.minor === ref.version?.minor && v.version?.patch === ref.version?.patch
            );
            if (!moduleVersion) {
              throw new Error(`Module (${ref.moduleId}) does not contain version: ${ref.version}`);
            }

            return { id: value.module.id, name: value.module.name, moduleVersion };
          })
        )
      );
    }

    const allResults$ = combineLatest(waitModules$);
    return allResults$.pipe(
      map((sources: unknown[]) => {
        // At this point, we should have all the source code we're interested in. Combine them!
        for (const src of sources) {
          const version = src as DataModuleVersionWithRef;
          result.modules.set(version.name, version.moduleVersion);
        }

        return result;
      })
    );
  }

  private processQueryResult(result: DataQueryResult, query: DataSourceParams): RegionDataResultItem {
    const pmcValues = result?.resultValues as PMCDataValues;
    if (result.errorMsg || !Array.isArray(pmcValues?.values) || (pmcValues.values.length > 0 && !(pmcValues.values[0] instanceof PMCDataValue))) {
      let msg = result.errorMsg;
      if (!msg) {
        msg = "Result is not a PMC array!";
      }
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
        new WidgetError("Query returned unexpected data type", msg),
        "", // warning
        result.expression,
        result.region,
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
      null,
      unitConverted.warning,
      result.expression,
      result.region,
      query
    );

    return resultItem;
  }

  private applyUnitConversion(sourceExpressionId: string, data: PMCDataValues, unitsRequested: DataUnit): PMCDataValues {
    let result = data;

    // Run through all points and apply the units requested. NOTE: This may not work, eg if we're not in the right source units, we can't
    // convert, so in those cases we do nothing
    const col = DataExpressionId.getPredefinedQuantExpressionElementColumn(sourceExpressionId);
    if (col === "%") {
      // We allow conversions here...
      let conversion = 1;
      if (unitsRequested == DataUnit.UNIT_MMOL) {
        // Need to parse the elements out of the expression to calculate molecular mass and form a conversion factor
        const formula = DataExpressionId.getPredefinedQuantExpressionElement(sourceExpressionId);
        if (formula.length > 0) {
          const mass = periodicTableDB.getMolecularMass(formula);
          if (mass > 0) {
            // Success parsing it, work out the conversion factor:
            // weight % (eg 30%) -> decimal (div by 100)
            // divide by mass
            // mult by 1000 to give mol/kg
            conversion = (1 / 100 / mass) * 1000;
          }
        }
      } else if (unitsRequested == DataUnit.UNIT_PPM) {
        // For now, not supported
      }
      //console.log('applyUnitConversion for '+col+' in '+sourceExpression.id+', conversion='+conversion);
      if (conversion != 1) {
        const values: PMCDataValue[] = [];
        for (const val of data.values) {
          let valToSave = val.value * conversion;
          if (val.isUndefined) {
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
