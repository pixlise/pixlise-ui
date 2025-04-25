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
import { map, catchError, shareReplay, switchMap } from "rxjs/operators";
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
import { MemoisationService } from "./memoisation.service";
import { MemoisedItem } from "src/app/generated-protos/memoisation";
import { MemDataQueryResult, MemPMCDataValue, MemPMCDataValues, MemRegionSettings } from "src/app/generated-protos/memoisation";
import { ROIItem, ROIItemDisplaySettings } from "src/app/generated-protos/roi";
import { Colours, RGBA } from "src/app/utils/colours";
import { ROIShape } from "../../roi/components/roi-shape/roi-shape.component";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { environment } from "src/environments/environment";
import { BuiltInTags } from "../../tags/models/tag.model";
import { SpectrumDataService } from "./spectrum-data.service";
import { SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { loadCodeForExpression } from "src/app/expression-language/expression-code-load";
import { ExpressionMemoisationService } from "./expression-memoisation.service";
import { AuthService, User } from "@auth0/auth0-angular";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
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
    public units: DataUnit = DataUnit.UNIT_DEFAULT,
    public injectedFunctions: Map<string, any> | null = null
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

export class LoadedSources {
  constructor(
    public expressionSrc: string,
    public modules: DataModuleVersionWithRef[]
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
  // NOTE:  These items only exist until the observable is completed, it is then removed from the cache so subsequent
  //        requests would re-create the observable again.
  // NOTE2: Make sure any obs going in here has shareReplay in its pipe, otherwise the observable is re-run and caching
  //        doesn't do anything really!
  private _inFluxSingleQueryResultCache: Map<string, Observable<DataQueryResult>> = new Map<string, Observable<DataQueryResult>>();

  constructor(
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService,
    private _spectrumDataService: SpectrumDataService,
    private _roiService: ROIService,
    private _energyCalibrationService: EnergyCalibrationService,
    private _memoisationService: MemoisationService,
    private _exprMemoisationService: ExpressionMemoisationService,
    private _authService: AuthService,
    private _analysisLayoutService: AnalysisLayoutService
  ) {}

  // This queries data based on parameters. The assumption is it either returns null, or returns an array with the same
  // amount of items as the input parameters array (what). This is required because code calling this can then know which
  // DataSourceParams is associated with which returned value. The result array may contain null items, but the length
  // should equal "what.length". There are also error values that can be returned.
  getData(what: DataSourceParams[], allowAnyResponse: boolean = false): Observable<RegionDataResults> {
    if (what.length <= 0) {
      //throw new Error("No expressions to quantify");
      return of(new RegionDataResults([], "No expressions to calculate"));
    }

    // Query each one separately and combine results at the end
    const exprResult$: Observable<DataQueryResult>[] = [];
    for (const query of what) {
      exprResult$.push(this.getDataSingle(query, allowAnyResponse));
    }

    // Now wait for all expressions to complete
    const exprResults$ = combineLatest(exprResult$);
    return exprResults$.pipe(
      map((results: DataQueryResult[]) => {
        const resultItems = [];
        for (let c = 0; c < results.length; c++) {
          resultItems.push(this.processGetDataResult(results[c], what[c], allowAnyResponse));
        }
        return new RegionDataResults(resultItems, "");
      }),
      catchError(err => {
        const whatDbg = [];
        for (const x of what) {
          whatDbg.push(`Query: expr=${x.exprId}, scan=${x.scanId}, quant=${x.quantId}, roi=${x.roiId}`);
        }
        SentryHelper.logException(new Error(`Uncaught error in getData: ${err}.\nQuery items:\n${whatDbg.join("\n")}`));

        // TODO: make it so getData() never throws an error!
        // return new RegionDataResults([], err);
        throw err;
      })
    );
  }

  private makeCacheKey(query: DataSourceParams, allowAnyResponse: boolean): Observable<string> {
    // We need to strip out anything that doesn't affect the result of the query
    const strippedQuery = {
      scanId: query.scanId,
      exprId: query.exprId,
      quantId: query.quantId,
      roiId: query.roiId,
      units: query.units,
    };

    // We need to get time stamps for each item to make this cache key unique to only this specific version of
    // the quant, scan, ROI, etc

    // Get the cache key so far
    let cacheKeyStart = JSON.stringify(strippedQuery) + ",Resp:" + allowAnyResponse;

    // If it's an unsaved expression, make this prominent so it's easier to filter out
    if (DataExpressionId.isUnsavedExpressionId(query.exprId)) {
      cacheKeyStart = DataExpressionId.UnsavedExpressionPrefix + query.exprId;
    }

    const queryList = [];
    let exprIdIdx = -1;
    let roiIdIdx = -1;
    let scanIdIdx = -1;

    // Only query timestamp for actual expressions, not our predefined internal ones
    if (
      query.exprId &&
      !DataExpressionId.isPredefinedExpression(query.exprId) &&
      !DataExpressionId.isUnsavedExpressionId(query.exprId) &&
      !DataExpressionId.isExpressionGroupId(query.exprId)
    ) {
      exprIdIdx = queryList.length;
      queryList.push(
        this._cachedDataService.getExpression(ExpressionGetReq.create({ id: query.exprId })).pipe(
          catchError(err => {
            throw new Error(`Failed to load expression: ${query.exprId} - ${err}`);
          })
        )
      );
    }

    // Only query timestamp for actual ROIs not predefined internal ones
    if (query.roiId && !PredefinedROIID.isPredefined(query.roiId)) {
      roiIdIdx = queryList.length;
      queryList.push(
        this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: query.roiId })).pipe(
          catchError(err => {
            throw new Error(`Failed to load expression: ${query.roiId} - ${err}`);
          })
        )
      );
    }

    if (query.scanId) {
      // NOTE: here we used to call:
      // this._cachedDataService.getScanList(ScanListReq.create({ searchFilters: { scanId: query.scanId } }))
      // But this proved to be inaccurate, because we may get a different time stamp than we have the spectrum data cached for
      // so instead, we query the bulk spectrum and save its stats - this way our cache key is unique to the downlinked
      // data, not a time stamp

      scanIdIdx = queryList.length;
      queryList.push(
        // Really we don't need the bulk sum, but lets get it because other functionality is caching that kind of request!
        this._spectrumDataService.getSpectra(query.scanId, [], true, true).pipe(
          catchError(err => {
            throw new Error(`Failed to load scan: ${query.scanId} - ${err}`);
          })
        )
      );
    }

    if (queryList.length <= 0) {
      return of(cacheKeyStart);
    }

    return combineLatest(queryList).pipe(
      map((result: (ExpressionGetResp | RegionOfInterestGetResp | SpectrumResp)[]) => {
        let appendKey = "";

        if (exprIdIdx >= 0) {
          const e = result[exprIdIdx] as ExpressionGetResp;
          if (e && e.expression) {
            appendKey += ",exprMod:" + e.expression.modifiedUnixSec;
          }
        }

        if (roiIdIdx >= 0) {
          const r = result[roiIdIdx] as RegionOfInterestGetResp;
          if (r && r.regionOfInterest) {
            appendKey += ",roiMod:" + r.regionOfInterest.modifiedUnixSec;
          }
        }

        if (scanIdIdx >= 0) {
          const s = result[scanIdIdx] as SpectrumResp;
          if (s) {
            appendKey += `,spectra:${s.normalSpectraForScan},${s.dwellSpectraForScan},${s.timeStampUnixSec}`;
          }
        }

        return cacheKeyStart + appendKey;
      })
    );
  }

  private getDataSingle(query: DataSourceParams, allowAnyResponse: boolean): Observable<DataQueryResult> {
    // Here we have our first level of caching. This is because a widget can be re-inited/updated due to many things
    // such as UI refresh/colours or settings loading, etc. We don't want each to trigger a whole new run of an
    // expression, so check if we already have an observable we can return for this
    return this.makeCacheKey(query, allowAnyResponse).pipe(
      concatMap((cacheKey: string) => {
        const cached = this._inFluxSingleQueryResultCache.get(cacheKey);
        if (cached) {
          return cached;
        }

        const obs = this.getDataWithMemoisation(query, allowAnyResponse, cacheKey);

        // Add to our in-flux cache
        this._inFluxSingleQueryResultCache.set(cacheKey, obs); // Make sure any obs going in here has shareReplay in its pipe
        return obs;
      }),
      catchError(err => {
        // Failed to make the cache key, so some request for data failed... form an error that can be displayed for this exact expression
        console.error(`Expression failed in makeCacheKey: ${err}`);

        return of(
          new DataQueryResult(
            null,
            false,
            [],
            0,
            "",
            "",
            new Map<string, PMCDataValues>(),
            new Map<string, string>(),
            err,
            DataExpression.create({
              id: query.exprId,
              name: query.exprId,
            }),
            null
          )
        );
      })
    );
  }

  private getDataWithMemoisation(query: DataSourceParams, allowAnyResponse: boolean, cacheKey: string): Observable<DataQueryResult> {
    // If it's not memomisable, just return the calculated value straight away
    if (environment.disableExpressionMemoisation || DataExpressionId.isPredefinedExpression(query.exprId) || DataExpressionId.isUnsavedExpressionId(query.exprId)) {
      return this.getDataSingleCalculate(query, allowAnyResponse, cacheKey);
    }

    // Try the local cache first
    // TODO: what if expression or ROI is edited??? We need to either clear the cache or store timestamps!
    return this._memoisationService.getMemoised(cacheKey).pipe(
      map((item: MemoisedItem) => {
        // We got something! return this straight away...
        console.info("Query restored from memoised result: " + cacheKey);

        // Also delete from in flux cache here! It gets added before we know if it's in memory yet
        this._inFluxSingleQueryResultCache.delete(cacheKey);

        return this.fromMemoised(item.data);
      }),
      catchError(err => {
        // This may have already logged something in memoisation service, but here we make sure we don't send to sentry
        // if not needed
        // This should've worked...
        //if (!(err instanceof WSError) || (err as WSError).status != ResponseStatus.WS_NOT_FOUND) {
        // But instanceof says it's not a WSError and the cast also fails, so we just check it textually
        const msg = `Error reading ${cacheKey} from memoisationService.get: ${err}. Will calculate instead`;
        if (err && err.message.indexOf(" Not Found") < 0) {
          SentryHelper.logMsg(true, msg);
        } else {
          // Just log it locally
          console.warn(msg);
        }

        // No matter what the error was, we need to now calculate this locally
        return this.getDataSingleCalculate(query, allowAnyResponse, cacheKey);
      }),
      shareReplay(1) // VERY important, without this we run them individually and it defeats the use of _inFluxSingleQueryResultCache
    );
  }

  private getDataSingleCalculate(query: DataSourceParams, allowAnyResponse: boolean, cacheKey: string): Observable<DataQueryResult> {
    // Firstly, we need the expression being run - note it could be a "predefined" one, so we have some
    // special handling here that ends up just returning an expression!
    return this.getExpression(query.exprId).pipe(
      switchMap((expr: DataExpression) => {
        allowAnyResponse = allowAnyResponse || BuiltInTags.hasAllowAnyExpressionResponseTag(expr.tags);
        return this.runExpression(
          expr,
          query.scanId,
          query.quantId,
          query.roiId,
          allowAnyResponse,
          false,
          environment.luaTimeoutMs,
          query.injectedFunctions || null
        ).pipe(
          mergeMap((result: DataQueryResult) => {
            return this._roiService.getRegionSettings(query.roiId).pipe(
              map((roiSettings: RegionSettings) => {
                result.region = roiSettings;

                // Filter to just the PMCs that are contained in the region.
                if (roiSettings.region && roiSettings.region.scanEntryIndexesEncoded.length > 0) {
                  result.resultValues = WidgetDataService.filterForPMCs(result.resultValues, new Set<number>(roiSettings.region.scanEntryIndexesEncoded));
                }

                // Remove from cache, we only want to cache while it's running, subsequent ones should
                // re-run it
                this._inFluxSingleQueryResultCache.delete(cacheKey);

                // Also, add to memoisation cache
                if (!DataExpressionId.isPredefinedExpression(query.exprId) && !DataExpressionId.isUnsavedExpressionId(query.exprId) && result.isPMCTable) {
                  // WARN If we're saving selected points ROI, this will help us detect future issues
                  if (PredefinedROIID.isSelectedPointsROI(query.roiId)) {
                    SentryHelper.logMsg(
                      false,
                      `WARNING: Caching Widget query result for selected points! Scan: ${query.scanId}, Expression: ${query.exprId}, Quant: ${query.quantId}, ROI: ${query.roiId}`
                    );
                  }

                  const encodedResult = this.toMemoised(result);
                  this._memoisationService.memoise(cacheKey, encodedResult, query.scanId, query.quantId, expr.id).subscribe();
                }

                return result;
              })
            );
          }),
          catchError(err => {
            // Make sure we don't have broken stuff cached!
            this._inFluxSingleQueryResultCache.delete(cacheKey);

            let errorMsg = httpErrorToString(err, "Expression error"); // We use this function because it can decode many kinds of error class/type

            // Show what expression it was
            errorMsg += `. Expression was: ["${cacheKey}"]`;

            // Only send stuff to sentry that are exceptional. Common issues just get handled on the client and it can recover from them
            if (
              errorMsg.indexOf("quantification does not contain data for detector") < 0 &&
              errorMsg.indexOf("quantification does not contain column") < 0 &&
              errorMsg.indexOf("no quantification id specified") < 0
            ) {
              SentryHelper.logMsg(true, errorMsg);
            }

            return of(new DataQueryResult(null, false, [], 0, "", "", new Map<string, PMCDataValues>(), new Map<string, string>(), errorMsg, expr));
          })
        );
      }),
      catchError(err => {
        const errorMsg = httpErrorToString(err, "Error getting expression: " + query.exprId);

        // Don't need this in sentry!
        console.error(errorMsg);

        return of(new DataQueryResult(null, false, [], 0, "", "", new Map<string, PMCDataValues>(), new Map<string, string>(), errorMsg));
      })
    );
  }

  public static filterForPMCs(queryResult: PMCDataValues, forPMCs: Set<number>): PMCDataValues {
    const resultValues: PMCDataValue[] = [];

    // Filter for PMCs requested
    // TODO: Modify this so we don't uneccessarily run expressions for PMCs we end up throwing away
    if (forPMCs === null) {
      for (const item of queryResult.values) {
        resultValues.push(item);
      }
    } else {
      // Build a new result only containing PMCs specified
      for (const item of queryResult.values) {
        if (forPMCs.has(item.pmc)) {
          resultValues.push(item);
        }
      }
    }

    return PMCDataValues.makeWithValues(resultValues);
  }

  private toMemoised(result: DataQueryResult): Uint8Array {
    // We copy to protobuf structs which then serialise to binary
    // NOTE: This is an experiment, if it works, maybe we'll switch all code to use these structs!
    const memValues = [];

    for (const val of result.resultValues.values) {
      memValues.push(
        MemPMCDataValue.create({
          pmc: val.pmc,
          value: val.value,
          isUndefined: val.isUndefined,
          label: val.label,
        })
      );
    }

    const memPixelIndexSet = result.region ? Array.from(result.region.pixelIndexSet) : [];

    const memResult = MemDataQueryResult.create({
      resultValues: MemPMCDataValues.create({
        minValue: result.resultValues.valueRange.min,
        maxValue: result.resultValues.valueRange.max,
        values: memValues,
        isBinary: result.resultValues.isBinary,
        warning: result.resultValues.warning,
      }),
      isPMCTable: result.isPMCTable,
    });

    if (result.expression) {
      memResult.expression = result.expression;
    }

    if (result.region) {
      memResult.region = MemRegionSettings.create({
        region: result.region.region,
        displaySettings: ROIItemDisplaySettings.create({
          colour: result.region.displaySettings.colour.asString(),
          shape: result.region.displaySettings.shape,
        }),
        pixelIndexSet: memPixelIndexSet,
      });
    }

    const writer = MemDataQueryResult.encode(memResult);
    const bytes = writer.finish();
    return bytes;
    //const sendbuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }

  private fromMemoised(data: Uint8Array): DataQueryResult {
    // We copy deserialise into protobuf structs which we then copy to our used ones
    // NOTE: This is an experiment, if it works, maybe we'll switch all code to use these structs!
    const memResult = MemDataQueryResult.decode(data);

    const values: PMCDataValue[] = [];
    if (memResult.resultValues) {
      for (const v of memResult.resultValues.values) {
        values.push(new PMCDataValue(v.pmc, v.value, v.isUndefined, v.label));
      }
    }

    const result = new DataQueryResult(
      PMCDataValues.makeWithValues(values),
      memResult.isPMCTable,
      [], // dataRequired
      0, // runtimeMs
      "", // stdout
      "", // stderr
      new Map<string, PMCDataValues>(), // recordedExpressionInputs
      new Map<string, string>(), // recorded expression values
      "", // errorMsg
      memResult.expression
    );

    if (memResult.region && memResult.region.region) {
      result.region = new RegionSettings(memResult.region.region, undefined, new Set<number>(memResult.region.pixelIndexSet));

      if (memResult.region.displaySettings) {
        let shape: ROIShape = "circle";
        if (memResult.region.displaySettings.shape == "triangle") {
          shape = "triangle";
        } else if (memResult.region.displaySettings.shape == "cross") {
          shape = "cross";
        } else if (memResult.region.displaySettings.shape == "square") {
          shape = "square";
        }

        result.region.displaySettings = { colour: RGBA.fromString(memResult.region.displaySettings.colour), shape: shape };

        // If this is an all points ROI, use the scan colour from the active screen configuration instead of the memResult
        if (PredefinedROIID.isAllPointsROI(memResult.region.region.id)) {
          const scanId = PredefinedROIID.getScanIdIfPredefined(memResult.region.region.id);
          const scanConfiguration = this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations?.[scanId];
          const scanRGBA = scanConfiguration ? RGBA.fromString(scanConfiguration.colour) : Colours.GRAY_10;
          result.region.displaySettings.colour = scanRGBA;
        }
      }
    }

    return result;
  }

  private getExpression(id: string): Observable<DataExpression> {
    // If we have an unsaved one, return that
    if (this.unsavedExpressions.has(id)) {
      return of(this.unsavedExpressions.get(id)) as Observable<DataExpression>;
    }

    // If this is for a "predefined" expression, return one from memory here
    if (DataExpressionId.isPredefinedExpression(id)) {
      const expr = getPredefinedExpression(id);
      if (!expr) {
        return throwError(() => new Error("Failed to create predefined expression for: " + id));
      }
      return of(expr);
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

  clearUnsavedExpressionResponses(): Observable<void> {
    this.clearUnsavedExpressions();
    return this._memoisationService.clearUnsavedMemoData();
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
    isUnsaved: boolean = false,
    maxTimeoutMs: number = environment.luaTimeoutMs,
    injectedFunctions: Map<string, any> | null = null
  ): Observable<DataQueryResult> {
    console.log(
      `runExpression for scan: ${scanId}, expr: "${expression.name}" (${expression.id}, ${expression.sourceLanguage}), roi: "${roiId}", quant: "${quantId}"`
    );

    if (isUnsaved) {
      this.unsavedExpressions.set(expression.id, expression);
    }

    const calibration$ = this._energyCalibrationService.getCurrentCalibration(scanId);
    const expr$ = loadCodeForExpression(expression, this._cachedDataService);

    // Load both of these
    return combineLatest([calibration$, expr$, this._authService.user$]).pipe(
      concatMap((loadResult: [SpectrumEnergyCalibration[], LoadedSources, User | null | undefined]) => {
        const calibration = loadResult[0];
        const sources = loadResult[1];
        const user = loadResult[2];
        // We now have the ready-to-go source code, run the query
        // At this point we should have the expression source and 0 or more modules
        if (!sources.expressionSrc) {
          throw new Error("loadCodeForExpression did not return expression source code for: " + expression.id);
        }

        const userId = user?.sub || "";
        if (!userId) {
          throw new Error("No user id loaded for expression runner");
        }

        const modSources = WidgetDataService.makeRunnableModules(sources.modules);

        // Pass in the source and module sources separately
        const querier = new DataQuerier(userId);
        const dataSource = new ExpressionDataSource();

        return dataSource.prepare(this._cachedDataService, this._spectrumDataService, scanId, quantId, roiId, calibration).pipe(
          concatMap(() => {
            const intDataSource = new InterpreterDataSource(expression.id, dataSource, dataSource, dataSource, dataSource, dataSource, this._exprMemoisationService);

            return querier
              .runQuery(sources.expressionSrc, modSources, expression.sourceLanguage, intDataSource, allowAnyResponse, false, maxTimeoutMs, injectedFunctions)
              .pipe(
                map((queryResult: DataQueryResult) => {
                  console.log(`>>> ${expression.sourceLanguage} expression "${expression.name}" took: ${queryResult.runtimeMs.toLocaleString()}ms`);

                  // Save runtime stats for this expression if we haven't done this recently (don't spam)
                  const nowMs = Date.now();
                  const lastNotify = this._exprRunStatLastNotificationTime.get(expression.id);
                  if (!lastNotify || nowMs - lastNotify > 60000) {
                    // Also, normalise it for runtime for 1000 points!
                    let runtimePer1000 = 0;

                    // Need to account for allowAnyResponse edge case
                    const values = queryResult?.resultValues?.values || [];
                    if (queryResult.runtimeMs > 0 && values.length > 0) {
                      runtimePer1000 = queryResult.runtimeMs / (values.length / 1000);
                    }

                    // Remember when we notified, so we don't spam
                    this._exprRunStatLastNotificationTime.set(expression.id, nowMs);

                    if (
                      !DataExpressionId.isPredefinedExpression(expression.id) &&
                      !DataExpressionId.isUnsavedExpressionId(expression.id) &&
                      queryResult.dataRequired.length > 0
                    ) {
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

  public static makeRunnableModules(loadedModules: DataModuleVersionWithRef[]): Map<string, string> {
    // Build the map required by runQuery. NOTE: here we pass the module name, not the ID!
    const modSources = new Map<string, string>();
    for (const mod of loadedModules) {
      modSources.set(mod.name, mod.moduleVersion.sourceCode);
    }

    return modSources;
  }

  private processGetDataResult(result: DataQueryResult, query: DataSourceParams, allowAnyResponse: boolean): RegionDataResultItem {
    const pmcValues = result?.resultValues as PMCDataValues;
    const isPMCTable = Array.isArray(pmcValues?.values) && (pmcValues.values.length <= 0 || pmcValues.values[0] instanceof PMCDataValue);
    // If we have an error OR we require a PMC table as a result and didn't receive one...
    if (result.errorMsg || (!allowAnyResponse && !isPMCTable)) {
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
          result.recordedExpressionInputs,
          result.recordedExpressionInputValues
        ),
        /*result.errorMsg.length > 0
          ? new WidgetError(result.errorMsg, "The expression failed, check configuration and try again")
          :*/ new WidgetError("Expression failed to complete", msg),
        "", // warning
        result.expression,
        result.region,
        query,
        false
      );
    }

    let valuesToWrite: any = null;
    if (isPMCTable) {
      // We're dealing with PMC table data, in which case we support unit conversion
      // Apply unit conversion if needed
      valuesToWrite = this.applyUnitConversion(query.exprId, pmcValues, query.units);
    } else {
      // We're dealing with a non-PMC table data, so we just pass it through
      valuesToWrite = result.resultValues;
    }

    const resultItem = new RegionDataResultItem(
      new DataQueryResult(
        valuesToWrite,
        result.isPMCTable,
        result.dataRequired,
        result.runtimeMs,
        result.stderr,
        result.stderr,
        result.recordedExpressionInputs,
        result.recordedExpressionInputValues
      ),
      null,
      valuesToWrite?.warning || "",
      result.expression,
      result.region,
      query,
      isPMCTable
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
