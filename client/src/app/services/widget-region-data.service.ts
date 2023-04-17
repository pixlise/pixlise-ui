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
import { ReplaySubject, Subject, Subscription, Observable, combineLatest, of } from "rxjs";
import { map, catchError, tap } from "rxjs/operators";
import { PMCDataValue, PMCDataValues, DataQueryResult } from "src/app/expression-language/data-values";
import { ExpressionRunnerService } from "src/app/services/expression-runner.service";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { MistROIItem, PredefinedROIID, ROIItem, ROISavedItem } from "src/app/models/roi";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpression, DataExpressionId } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { QuantificationService, ZStackItem } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { ViewState, ViewStateService } from "src/app/services/view-state.service";
import { RGBA } from "src/app/utils/colours";
import { httpErrorToString, randomString, SentryHelper } from "src/app/utils/utils";
import { environment } from "src/environments/environment";


/* WidgetRegionDataService : The widget data source!

Widgets are complicated views of our data, and the primitive single-intent services resulted
in code duplication for each widget where it needed to interact with the:
- View state: for finding what ROIs were selected, what colour/quantification was applied
- ROI service: to get PMCs for an ROI
- Dataset service: to be notified that a new dataset has loaded/access dataset
- Quantification service: to be notified that a quantification has loaded/access the quant
- Data Expression service: to load expression string
- Selection service: to get list of selected PMCs

Along with various helper functions to run a query and get data

All the above has been implemented once in this service, and widgets can just subscribe here
to be notified when something changed, so they can recalculate their display model
*/

export enum DataUnit
{
    //UNIT_WEIGHT_PCT,
    UNIT_DEFAULT, // Was ^ but realised we don't know what the underlying unit is... the following only work if possible...
    UNIT_MMOL,
    UNIT_PPM
}

export class DataSourceParams
{
    constructor(
        public exprId: string,
        public roiId: string,
        public datasetId: string,
        public units: DataUnit = DataUnit.UNIT_DEFAULT
        )
    {
    }
}

export class RegionData extends ROISavedItem
{
    constructor(
        id: string,
        name: string,
        locationIndexes: number[],
        description: string,
        imageName: string,
        pixelIndexes: Set<number>,
        shared: boolean,
        creator: ObjectCreator,
        public colour: RGBA,
        public pmcs: Set<number>,
        public shape: string,
        mistROIItem: MistROIItem = null,
        tags: string[] = [],
        visible: boolean = false,
        createUnixTimeSec: number = 0,
        modUnixTimeSec: number = 0
    )
    {
        super(id, name, locationIndexes, description, imageName, pixelIndexes, shared, creator, mistROIItem, tags, visible, createUnixTimeSec, modUnixTimeSec);
    }

    convertToROIItem()
    {
        return new ROIItem(
            this.name,
            this.locationIndexes,
            this.description,
            this.imageName,
            Array.from(this.pixelIndexes),
            this.mistROIItem,
            this.tags
        );
    }

    // TODO: this is pretty dodgy, there must be a better way. Quickly tried casting RegionData as ROISavedItem and assignment
    // operator but that probably copied the object because the values never made it into the map storing RegionData...
    setROISavedItemFields(roi: ROISavedItem): void
    {
        this.id = roi.id;
        this.name = roi.name;
        this.locationIndexes = roi.locationIndexes;
        this.description = roi.description;
        this.pixelIndexes = roi.pixelIndexes;
        this.imageName = roi.imageName;
        this.shared = roi.shared;
        this.creator = roi.creator;
        this.mistROIItem = roi.mistROIItem;
        this.createUnixTimeSec = roi.createUnixTimeSec;
        this.modUnixTimeSec = roi.modUnixTimeSec;
        this.tags = roi.tags;
    }
}

export enum WidgetDataUpdateReason
{
    WUPD_ROIS = "rios",
    WUPD_SELECTION = "selection",
    WUPD_ROI_COLOURS = "roi-colours",
    WUPD_ROI_SHAPES = "roi-shapes",
    WUPD_QUANT = "quant",
    WUPD_EXPRESSIONS = "expr-updated",
    WUPD_DATASET = "dataset",
    WUPD_REMAINING_POINTS = "remaining-pts",
    WUPD_VIEW_STATE = "view-state"
}

export enum WidgetDataErrorType
{
    WERR_ROI = "roi",
    WERR_EXPR = "expr",
    WERR_QUERY = "query"
}

export class RegionDataResultItem
{
    constructor(
        public exprResult: DataQueryResult,
        public errorType: WidgetDataErrorType,
        public error: string,
        public warning: string,
        public expression: DataExpression,
        public region: RegionData,
        public query: DataSourceParams,
        public isPMCTable: boolean = true,
    )
    {
    }

    get values(): PMCDataValues
    {
        return this.exprResult?.resultValues;
    }
}

export class RegionDataResults
{
    private _hasQueryErrors: boolean = false;

    constructor(public queryResults: RegionDataResultItem[], public error: string)
    {
        for(let item of queryResults)
        {
            if(item.error)
            {
                this._hasQueryErrors = true;
                break;
            }
        }
    }

    hasQueryErrors(): boolean
    {
        return this._hasQueryErrors;
    }
}

// Query result cache item to store the results of running an expression
// These results should only be used if they are not too old, and the ROI and expression referenced have not
// been updated since this was stored! So we will periodically throw away old ones
class QueryCacheItem
{
    constructor(
        public params: string,
        public runtimeMs: number,
        public cacheUnixTimeMs: number,
        public calculatedResult: DataQueryResult,
        public lastAccessUnixTimeMs: number,
    )
    {
    }
}

class QueryResultCache
{
    private _queryResultCache: Map<string, QueryCacheItem> = new Map<string, QueryCacheItem>();
    private _lastPurgeUnixTimeMs: number = Date.now();

    constructor(
        private _expressionResultCacheThresholdMs,
        private _unusedTimeoutMs: number,
        private _purgeFrequencyMs: number)
    {
    }

    addCachedResult(exprId: string, runtimeMs: number, calculatedResult: DataQueryResult)
    {
        // Add to the cache if we want to cache it
        if(runtimeMs < this._expressionResultCacheThresholdMs)
        {
            // We don't cache this one because it runs quick enough, and we prefer not to store more memory
            return;
        }

        let key = this.makeKey(exprId);
        let nowUnixMs = Date.now();
        this._queryResultCache.set(key, new QueryCacheItem(exprId, runtimeMs, nowUnixMs, calculatedResult, nowUnixMs));

        console.log("  Cached query result for: "+key+", calc duration: "+Math.floor(runtimeMs)+"ms");

        // Garbage collect
        this.purgeOldItems();
    }

    getCachedResult(exprId: string, expressionModUnixTimeSec: number): DataQueryResult
    {
        // Search the cache
        let key = this.makeKey(exprId);
        let item = this._queryResultCache.get(key);

        if(!item)
        {
            console.log("  No cached query found for: "+key);
            return null;
        }

        // Check that this cache item is NEWER than the ROI and Expression last modified time
        // because if someone modified one of these we don't want to be returning the previous result
        let cacheUnixTimeSec = item.cacheUnixTimeMs/1000;
        if(cacheUnixTimeSec < expressionModUnixTimeSec)
        {
            console.log("  Found outdated (expr) cache item, deleted for: "+key);
            this._queryResultCache.delete(key);
            return null;
        }

        let nowUnixMs = Date.now();
        item.lastAccessUnixTimeMs = nowUnixMs;
        console.log("  Found cached query item for: "+key+", calc duration was: "+Math.floor(item.runtimeMs)+"ms");

        return item.calculatedResult;
    }

    clear()
    {
        this._queryResultCache.clear();
    }

    private makeKey(exprId: string): string
    {
        return exprId; // Nothing exotic to do with it now that we're only caching by expression ID
    }

    private purgeOldItems()
    {
        let nowUnixMs = Date.now();
        if(this._lastPurgeUnixTimeMs-nowUnixMs < this._purgeFrequencyMs)
        {
            // Don't purge, don't need to do this that often...
            return;
        }

        this._lastPurgeUnixTimeMs = nowUnixMs;

        // Purge anything that hasn't been accessed in a while
        for(let [key, item] of this._queryResultCache)
        {
            let accessedAgoMs = nowUnixMs-item.lastAccessUnixTimeMs;
            if(accessedAgoMs > this._unusedTimeoutMs)
            {
                console.log("  Deleting (timeout) old cache item for: "+key);
                this._queryResultCache.delete(key);
            }
        }
    }
}

@Injectable({
    providedIn: "root"
})
export class WidgetRegionDataService
{
    private _subs = new Subscription();
    private _viewStateRelatedSubs = new Subscription();
    private _quantLoad$: Subscription = null;

    // Raw incoming data, we remember these so rebuildData can do its job
    private _rois: Map<string, ROISavedItem> = null;
    private _roiColours: Map<string, string> = null;
    private _roiShapes: Map<string, string> = null;
    private _quantId: string = null; // null=not loaded yet
    private _quantIdLastLoaded: string = null; // This is the quant ID we last loaded (or got an error for). So we know not to continually re-request it
    private _quantificationLoaded: QuantificationLayer = null;

    private _expressionsLoaded: boolean = false;
    private _multiQuantLoaded: boolean = false;
    private _loadedViewState: ViewState = null;

    // The data created by rebuildData, we notify widgets through widgetData$ that this is updated
    private _regions: Map<string, RegionData> = new Map<string, RegionData>();

    widgetData$: Subject<WidgetDataUpdateReason> = new ReplaySubject<WidgetDataUpdateReason>(1);
    quantificationLoaded$: Subject<QuantificationLayer> = new ReplaySubject<QuantificationLayer>(1);

    private _logPrefix = "  >>> WidgetRegionDataService["+randomString(4)+"]";

    // Query result cache - for slow queries we cache their result
    private _resultCache: QueryResultCache = new QueryResultCache(environment.expressionResultCacheThresholdMs, 60000, 10000);

    constructor(
        private _roiService: ROIService,
        private _selectionService: SelectionService,
        private _viewStateService: ViewStateService,
        private _exprService: DataExpressionService,
        private _datasetService: DataSetService,
        private _quantService: QuantificationService,
        private _diffractionService: DiffractionPeakService,
        private _exprRunnerService: ExpressionRunnerService,
    )
    {
        // Subscribe for things that aren't dataset dependent...
        this._expressionsLoaded = false;
        this._loadedViewState = null;

        // We only subscribe for dataset to listen for null datasets when we should be clearing and resetting
        this.resubscribeDataset();

        this.resubscribeExpressions();
        this.resubscribeSelection();

        // Now subscribe for view state - this is always subscribed but if we get an update, we then
        // resubscribe to all the others
        this.resubscribeViewStateLoaded();
    }

    private resetFlagsForDatasetSubscriptions(): void
    {
        // Here we clear everything, as we expect the other subscriptions to come AFTER a new dataset
        this._rois = null;
        this._roiColours = null;
        this._roiShapes = null;
        this._quantId = null;
        this._quantIdLastLoaded = null;
        this._quantificationLoaded = null;
        this._multiQuantLoaded = false;
    }

    private resubscribeForViewState(): void
    {
        // Forget any cached query results
        this._resultCache.clear();

        // Reset all our subscriptions
        this._viewStateRelatedSubs.unsubscribe();
        this._viewStateRelatedSubs = new Subscription();

        // Clear all data that we have loaded from these subscriptions - this ensures we won't trigger for every
        // one coming in - we want to wait till all have arrived!
        this.resetFlagsForDatasetSubscriptions();

        // Subscribe - these are all things we subscribe for AFTER we get a view state

        // These are part of the view state service. It needs to make sure these are up to date
        // before notifying viewState$
        this.resubscribeViewStateROIColours();
        this.resubscribeViewStateROIShapes();
        this.resubscribeViewStateQuantLoaded();

        // ROI service, needs to clear ROIs when new dataset is loaded otherwise we end up with
        // old ROIs until service refresh is triggered
        this.resubscribeROIs();

        // Quant service needs to clear the z-stack when new dataset is loaded, otherwise we'll
        // end up with old zstack infos and the wrong RemainingPoints ROI generated
        this.resubscribeMultiQuantROIs();
    }

    get regions(): Map<string, RegionData>
    {
        return this._regions;
    }

    get quantificationLoaded(): QuantificationLayer
    {
        return this._quantificationLoaded;
    }

    get viewState(): ViewState
    {
        return this._loadedViewState;
    }

    // Provided as a convenience for not having to have a dataset service as well in anything that calls us
    get dataset(): DataSet
    {
        return this._datasetService.datasetLoaded;
    }

    // This queries data based on parameters. The assumption is it either returns null, or returns an array with the same
    // amount of items as the input parameters array (what). This is required because code calling this can then know which
    // DataSourceParams is associated with which returned value. The result array may contain null items, but the length
    // should equal "what.length". There are also error values that can be returned.
    // NOTE: If a dataset ID is specified (in case of combined datasets), the output PMCs will be relative to that dataset
    //       so they won't be unique against the PMCs for the overall dataset anymore!
    getData(what: DataSourceParams[], continueOnError: boolean): Observable<RegionDataResults>
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            console.error("getData: No dataset");
            return of(new RegionDataResults([], "No dataset"));
        }

        // The queries often will be for the same expression ID but for multiple regions. We run the (unique) expressions all at once
        // and then sort out which ROI the data are for
        let queryByExprId = new Map<string, DataSourceParams[]>();
        for(let query of what)
        {
            // If we have a dataset ID specified, and it doesn't match our dataset ID we error out if the dataset is not a "combined" one.
            if(query.datasetId && !dataset.isCombinedDataset())
            {
                if(query.datasetId == dataset.getId())
                {
                    // It matches our dataset ID: someone was just silly so we clear it to create less confusion later when the expression runs
                    query.datasetId = "";
                }
                else
                {
                    return of(new RegionDataResults([], "Queried for dataset ID: "+query.datasetId+" when not in combined dataset!"));
                }
            }

            if(!queryByExprId.has(query.exprId))
            {
                queryByExprId.set(query.exprId, []);
            }

            queryByExprId.get(query.exprId).push(query);
        }

        let exprRuns: DataExpression[] = [];
        let exprResult$: Observable<DataQueryResult>[] = [];
        for(let [exprId, queries] of queryByExprId)
        {
            // Get the expression
            let expr = this._exprService.getExpression(exprId);
            if(!expr)
            {
                let errorMsg = "Failed to retrieve expression: \""+exprId+"\"";

                if(continueOnError)
                {
                    console.error("getData: "+errorMsg+". Ignored...");

                    // Fail it on the first query item
                    exprRuns.push(expr);
                    exprResult$.push(of(new DataQueryResult([], false, [], 0, "", "", new Map<string, PMCDataValues>())));
                    //result$.push(of(new RegionDataResultItem(null, WidgetDataErrorType.WERR_EXPR, errorMsg, null, null, null, queries[0])));
                    continue;
                }

                console.error("getData: "+errorMsg);
                return of(new RegionDataResults([], errorMsg));
            }

            // Run the expression and remember the order in which we ran them...
            exprRuns.push(expr);

            // Check cache for already-run expression
            let cachedResult = this._resultCache.getCachedResult(exprId, expr.modUnixTimeSec);
            if(cachedResult !== null)
            {
                exprResult$.push(of(cachedResult));
            }
            else
            {
                exprResult$.push(
                    this._exprRunnerService.runExpression(expr, this._quantificationLoaded, this._diffractionService, false).pipe(
                        tap(
                            (result: DataQueryResult)=>
                            {
                                this._resultCache.addCachedResult(exprId, result.runtimeMs, result);
                            }
                        ),
                        catchError(
                            (err)=>
                            {
                                let errorMsg = httpErrorToString(err, "WidgetRegionDataService.getData catchError");

                                // Only send stuff to sentry that are exceptional. Common issues just get handled on the client and it can recover from them
                                if(
                                    errorMsg.indexOf("The currently loaded quantification does not contain data for detector") < 0 &&
                                    errorMsg.indexOf("The currently loaded quantification does not contain column") < 0
                                )
                                {
                                    SentryHelper.logMsg(true, errorMsg);
                                }

                                //return of(new DataQueryResult(null, WidgetDataErrorType.WERR_QUERY, errorMsg, null, expr, region, query));
                                throw errorMsg;
                            }
                        )
                    )
                );
            }
        }

        // Now wait for all expressions to complete
        let exprResults$ = combineLatest(exprResult$);
        return exprResults$.pipe(
            map(
                (results: DataQueryResult[])=>
                {
                    return this.buildResult(what, exprRuns, results, continueOnError);
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

    private buildResult(what: DataSourceParams[], exprRuns: DataExpression[], exprResults: DataQueryResult[], continueOnError: boolean): RegionDataResults
    {
        let dataset = this._datasetService.datasetLoaded;
        let outputResult = new RegionDataResults([], "");

        // We got data back for an expression, look up what else it was supposed to include
        let exprResultById = new Map<string, DataQueryResult>();
        let exprById = new Map<string, DataExpression>();

        for(let c = 0; c < exprResults.length; c++)
        {
            // Get the expression that ran
            const expr = exprRuns[c];
            const exprResult = exprResults[c];

            exprResultById.set(expr.id, exprResult);
            exprById.set(expr.id, expr);
        }

        // Now run through all the original query stuff, in that order, and apply the ROI and unit conversions
        // to form output data
        for(let query of what)
        {
            let region: RegionData = null;
            if(query.roiId != null)
            {
                region = this._regions.get(query.roiId);
                if(!region)
                {
                    let errorMsg = "Failed to find region id: \""+query.roiId+"\"";

                    if(continueOnError)
                    {
                        console.error("getData: "+errorMsg+". Ignored...");
                        outputResult.queryResults.push(new RegionDataResultItem(null, WidgetDataErrorType.WERR_ROI, errorMsg, null, null, null, query));
                        continue;
                    }
                    console.error("getData: "+errorMsg);
                    return new RegionDataResults([], errorMsg);
                }
            }

            // Get the expression result for this query item
            let exprResult = exprResultById.get(query.exprId);
            if(!exprResult || !exprResult.resultValues)
            {
                let errorMsg = "Failed to get result for expression: "+query.exprId;
                
                // This expression failed, so anything expecting data from here should just get an error
                outputResult.queryResults.push(new RegionDataResultItem(null, WidgetDataErrorType.WERR_ROI, errorMsg, null, null, null, query));
                continue;
            }
            
            // At this point, we have to decide what PMCs to return for this query item. If we have an ROI specified, we are only querying
            // for its PMCs BUT datasetId filters this further, because if we have one specified (in the case of combined datasets), we need to
            // only include PMCs for that dataset!
            let pmcsToQuery = region ? region.pmcs : null;
            let pmcOffset = 0;

            if(query.datasetId)
            {
                // Get the offset for this dataset ID
                pmcOffset = dataset.getIdOffsetForSubDataset(query.datasetId);

                // We're filtering down!
                if(!pmcsToQuery)
                {
                    // No PMCs given, so just get all for the given dataset ID
                    pmcsToQuery = this.getPMCsForDatasetId(query.datasetId, dataset);
                }
                else
                {
                    // Region PMCs are specified, so filter down to only those for the given dataset!
                    pmcsToQuery = this.filterPMCsForDatasetId(region.pmcs, query.datasetId, dataset);
                }
            }

            const expr = exprById.get(query.exprId);
            let processedResult = this.processQueryResult(exprResult.resultValues, query, expr, region, pmcOffset, pmcsToQuery);
            outputResult.queryResults.push(processedResult);
        }

        return outputResult;
    }

    // Runs an expression with given parameters. If errors are encountered, they will be returned as part of the Observables own
    // error handling interface.
    runAsyncExpression(query: DataSourceParams, expr: DataExpression, allowAnyResponse: boolean): Observable<DataQueryResult>
    {
        return this._exprRunnerService.runExpression(expr, this._quantificationLoaded, this._diffractionService, allowAnyResponse);
    }
    
    private processQueryResult(
        result: DataQueryResult,
        query: DataSourceParams,
        expr: DataExpression,
        region: RegionData,
        pmcOffset: number,
        forPMCs: Set<number>
    ): RegionDataResultItem
    {
        let pmcValues = result?.resultValues as PMCDataValues;
        if(!Array.isArray(pmcValues?.values) || (pmcValues.values.length > 0 && !(pmcValues.values[0] instanceof PMCDataValue)))
        {
            return new RegionDataResultItem(result, WidgetDataErrorType.WERR_QUERY, "Result is not a PMC array!", null, expr, region, query, false);
        }

        // Filter to only the PMCs we're interested in
        let filteredPMCValues = this.filterForPMCs(pmcValues, forPMCs);

        // Apply unit conversion if needed
        let unitConverted = this.applyUnitConversion(expr, filteredPMCValues, query.units);

        // Also change the PMC values to be dataset-relative in the case of combined dataset
        if(pmcOffset > 0)
        {
            for(let c = 0; c < unitConverted.values.length; c++)
            {
                unitConverted.values[c].pmc -= pmcOffset;
            }
        }

        // Put this back in the result
        result.resultValues = unitConverted;

        let resultItem = new RegionDataResultItem(result, null, null, unitConverted.warning, expr, region, query);
        return resultItem;
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

    // This is really just a convenience thing - this service already has all the things required to call export on the expression runner
    exportExpressionCode(expr: DataExpression): Observable<Blob>
    {
        return this._exprRunnerService.exportExpressionCode(expr, this._quantificationLoaded, this._diffractionService);
    }

    private getPMCsForDatasetId(datasetId: string, dataset: DataSet): Set<number>
    {
        let locIdxs = dataset.getLocationIdxsForSubDataset(datasetId);
        let locations = dataset.experiment.getLocationsList();

        let pmcsToQuery = new Set<number>();

        // Convert each to a PMC & use it
        for(let locIdx of locIdxs)
        {
            let loc = locations[locIdx];
            let pmc = Number.parseInt(loc.getId());
            if(pmc != undefined)
            {
                // NOTE: here we're using the PMC that's for the whole dataset, so it has the source offset included already!
                pmcsToQuery.add(pmc);
            }
        }

        return pmcsToQuery;
    }

    private filterPMCsForDatasetId(regionPMCs: Set<number>, datasetId: string, dataset: DataSet): Set<number>
    {
        let locIdxs = dataset.getLocationIdxsForSubDataset(datasetId);

        let pmcsToQuery = new Set<number>();
        for(let regionPMC of regionPMCs)
        {
            let locIdx = dataset.pmcToLocationIndex.get(regionPMC);

            // See if it exists in the loc idxs for the sub-dataset
            if(locIdxs.size === 0 || locIdxs.has(locIdx))
            {
                // We're adding it!
                pmcsToQuery.add(regionPMC);
            }
        }

        return pmcsToQuery;
    }

    private applyUnitConversion(sourceExpression: DataExpression, data: PMCDataValues, unitsRequested: DataUnit): PMCDataValues
    {
        let result = data;

        // Run through all points and apply the units requested. NOTE: This may not work, eg if we're not in the right source units, we can't
        // convert, so in those cases we do nothing
        let col = DataExpressionId.getPredefinedQuantExpressionElementColumn(sourceExpression.id);
        if(col === "%")
        {
            // We allow conversions here...
            let conversion = 1;
            if(unitsRequested == DataUnit.UNIT_MMOL)
            {
                // Need to parse the elements out of the expression to calculate molecular mass and form a conversion factor
                let formula = DataExpressionId.getPredefinedQuantExpressionElement(sourceExpression.id);
                if(formula.length > 0)
                {
                    let mass = periodicTableDB.getMolecularMass(formula);
                    if(mass > 0)
                    {
                        // Success parsing it, work out the conversion factor:
                        // weight % (eg 30%) -> decimal (div by 100)
                        // divide by mass
                        // mult by 1000 to give mol/kg
                        conversion = 1/100/mass*1000;
                    }
                }
            }
            else if(unitsRequested == DataUnit.UNIT_PPM)
            {
                // For now, not supported
            }
            //console.log('applyUnitConversion for '+col+' in '+sourceExpression.id+', conversion='+conversion);
            if(conversion != 1)
            {
                let values: PMCDataValue[] = [];
                for(let val of data.values)
                {
                    let valToSave = val.value*conversion;
                    if(val.isUndefined)
                    {
                        valToSave = 0;
                    }

                    values.push(new PMCDataValue(val.pmc, valToSave, val.isUndefined));
                }
                result = PMCDataValues.makeWithValues(values);
            }
        }

        return result;
    }

    private rebuildData(reason: WidgetDataUpdateReason): void
    {
        let logmsg = this._logPrefix+" rebuildData reason="+reason;
        let skipReasons = [];

        let dataset = this._datasetService.datasetLoaded;
        let selection = this._selectionService.getCurrentSelection();

        // Rebuild our view of the world
        if(!this._rois)
        {
            skipReasons.push("ROIs");
        }
        if(!this._roiColours)
        {
            skipReasons.push("ROI Colours");
        }
        if(!this._roiShapes)
        {
            skipReasons.push("ROI Shapes");
        }
        if(this._quantId == null)
        {
            skipReasons.push("Quant ID");
        }
        if(!dataset)
        {
            skipReasons.push("dataset");
        }
        if(!this._expressionsLoaded)
        {
            skipReasons.push("expressions");
        }
        if(!this._multiQuantLoaded)
        {
            skipReasons.push("multi-quant-rois");
        }
        if(!this._loadedViewState)
        {
            skipReasons.push("view-state");
        }

        if(skipReasons.length > 0)
        {
            console.log(logmsg+": skipped - ["+skipReasons.join(",")+"] not loaded yet...");
            return; // Actually skip running this, we don't have enough data...
        }

        console.log(logmsg+": Everything loaded, building region data...");        

        this._regions.clear();

        // Run through each data store and ensure we have something stored for any referenced ROI ID
        for(let [roiId, roi] of this._rois)
        {
            let region = this.ensureRegionStored(roiId);

            // Set the region values
            region.setROISavedItemFields(roi);

            // Convert the location indexes to PMCs
            region.pmcs = dataset.getPMCsForLocationIndexes(roi.locationIndexes, false);
            region.locationIndexes = Array.from(roi.locationIndexes);
        }

        for(let [roiId, colour] of this._roiColours)
        {
            let region = this.ensureRegionStored(roiId);
            let clr = RGBA.fromString(colour);
            region.colour = RGBA.fromWithA(clr, 0.5);
        }

        for(let [roiId, shape] of this._roiShapes)
        {
            let region = this.ensureRegionStored(roiId);
            region.shape = shape;
        }

        // Ensure the "special" regions of the entire dataset and the selection are stored too

        // This is all we had before... all points + selection. NOTE: Original colours were
        // all points=Colours.GRAY_10, alpha=0.4
        // selection =Colours.CONTEXT_PURPLE, alpha=0.7
        let allPointsRegion = this.ensureRegionStored(PredefinedROIID.AllPoints);
        allPointsRegion.setROISavedItemFields(new ROISavedItem(PredefinedROIID.AllPoints, "Dataset", [], "Built-in region representing all points in the dataset", "", new Set<number>(), false, null));
        allPointsRegion.colour = RGBA.fromWithA(ViewStateService.AllPointsColour, 0.4);
        allPointsRegion.shape = "circle";
        allPointsRegion.pmcs = new Set<number>(dataset.pmcToLocationIndex.keys());

        let selectedPointsRegion = this.ensureRegionStored(PredefinedROIID.SelectedPoints);
        selectedPointsRegion.setROISavedItemFields(new ROISavedItem(PredefinedROIID.SelectedPoints, "Selection", [], "Built-in region representing the selected points in the dataset", "", new Set<number>(), false, null));
        selectedPointsRegion.colour = RGBA.fromWithA(ViewStateService.SelectedPointsColour, 0.7);
        selectedPointsRegion.shape = "circle";
        selectedPointsRegion.pmcs = selection.beamSelection.getSelectedPMCs();
        selectedPointsRegion.locationIndexes = Array.from(selection.beamSelection.locationIndexes);

        // Also, if we have a multi-quant in progress, we want a region representing the "remaining points" which aren't in any of the ROIs
        if(this._quantService.multiQuantZStack.length > 0) // if no ROIs, we don't show at all
        {
            let remainingPointsRegion = this.ensureRegionStored(PredefinedROIID.RemainingPoints);
            remainingPointsRegion.setROISavedItemFields(new ROISavedItem(PredefinedROIID.RemainingPoints, ViewStateService.RemainingPointsLabel, [], "Built-in region representing the points that are not a member of any ROIs in the multi-quant currently in progress", "", new Set<number>(), false, null));
            remainingPointsRegion.colour = RGBA.fromWithA(ViewStateService.RemainingPointsColour, 0.7);
            remainingPointsRegion.shape = "circle";

            let pmcs = this.getRemainingPMCs();
            remainingPointsRegion.pmcs = new Set(pmcs);
            remainingPointsRegion.locationIndexes = [];

            for(let pmc of pmcs)
            {
                let idx = dataset.pmcToLocationIndex.get(pmc);
                if(!isNaN(idx))
                {
                    remainingPointsRegion.locationIndexes.push(idx);
                }
            }
        }

        console.log(logmsg+": Generated "+this._regions.size+" regions.");

        //console.log(logmsg+": Region build finished, notifying subscribers...");
        //let t0 = performance.now();
        this.widgetData$.next(reason);
        //let t1 = performance.now();
        //console.log(logmsg+": Subscribers notified in "+(t1-t0).toLocaleString()+"ms");
    }

    getRemainingPMCs(): number[]
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            console.warn("getRemainingPMCs when no dataset available in WidgetRegionDataService");
            return [];
        }
        return this._quantService.getRemainingPMCs(dataset.locationPointCache, this._rois);
    }

    private ensureRegionStored(roiId: string): RegionData
    {
        let region = this._regions.get(roiId);
        if(!region)
        {
            region = new RegionData(
                // ROISavedItem fields
                roiId,
                "",
                [],
                "",
                "",
                new Set<number>(),
                false,
                null,
                // And the rest
                null,
                new Set<number>(),
                ""
            );
            this._regions.set(roiId, region);
        }

        return region;
    }

    private resubscribeDataset()
    {
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                if(!dataset)
                {
                    // Dataset is unloading, clear and reset ourself, we don't want to be listening
                    // to anything until we get a viewState!

                    // We've just received a new view state. We need to resubscribe to everything at this point
                    this._viewStateRelatedSubs.unsubscribe();
                    this._viewStateRelatedSubs = new Subscription();

                    this.resetFlagsForDatasetSubscriptions();
                }
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeDataset"));
            },
            ()=>
            {
                this.resubscribeDataset();
            }
        ));
    }

    // Non-dataset related subscriptions
    private resubscribeExpressions()
    {
        this._subs.add(this._exprService.expressionsUpdated$.subscribe(
            ()=>
            {
                this._expressionsLoaded = true;
                this.rebuildData(WidgetDataUpdateReason.WUPD_EXPRESSIONS);
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeExpressions"));
            },
            ()=>
            {
                this.resubscribeExpressions();
            }
        ));
    }

    private resubscribeSelection()
    {
        this._subs.add(this._selectionService.selection$.subscribe(
            (selection: SelectionHistoryItem)=>
            {
                // Selection changed, if we don't have regions yet, rebuild all, otherwise we just need
                // to update the selected points region
                if(this._regions.size <= 0)
                {
                    this.rebuildData(WidgetDataUpdateReason.WUPD_SELECTION);
                }
                else
                {
                    // Update the selected points region
                    let region = this.ensureRegionStored(PredefinedROIID.SelectedPoints);
                    region.pmcs = selection.beamSelection.getSelectedPMCs();
                    region.locationIndexes = Array.from(selection.beamSelection.locationIndexes);

                    this.widgetData$.next(WidgetDataUpdateReason.WUPD_SELECTION);
                }
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeSelection"));
            },
            ()=>
            {
                this.resubscribeSelection();
            }
        ));
    }

    // View state subscription - we store the view state and this is where we resubscribe to everything else
    private resubscribeViewStateLoaded()
    {
        this._subs.add(this._viewStateService.viewState$.subscribe(
            (viewState: ViewState)=>
            {
                this._loadedViewState = viewState;

                // Subscribe for the other stuff
                this.resubscribeForViewState();

                // No need for this, the above should notify plenty...
                //this.rebuildData(WidgetDataUpdateReason.WUPD_VIEW_STATE);
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeViewStateLoaded"));
            },
            ()=>
            {
                this.resubscribeViewStateLoaded();
            }
        ));
    }

    // View-state (and dataset) related subscriptions
    private resubscribeROIs()
    {
        this._viewStateRelatedSubs.add(this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this._rois = rois;
                this.rebuildData(WidgetDataUpdateReason.WUPD_ROIS);
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeROIs"));
            },
            ()=>
            {
                this.resubscribeROIs();
            }
        ));
    }

    private resubscribeViewStateROIColours()
    {
        this._viewStateRelatedSubs.add(this._viewStateService.roiColours$.subscribe(
            (roiColours: Map<string, string>)=>
            {
                this._roiColours = roiColours;
                this.rebuildData(WidgetDataUpdateReason.WUPD_ROI_COLOURS);
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeViewStateROIColours"));
            },
            ()=>
            {
                this.resubscribeViewStateROIColours();
            }
        ));
    }

    private resubscribeViewStateROIShapes()
    {
        this._viewStateRelatedSubs.add(this._viewStateService.roiShapes$.subscribe(
            (roiShapes: Map<string, string>)=>
            {
                this._roiShapes = roiShapes;
                this.rebuildData(WidgetDataUpdateReason.WUPD_ROI_SHAPES);
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeViewStateROIShapes"));
            },
            ()=>
            {
                this.resubscribeViewStateROIShapes();
            }
        ));
    }

    private resubscribeViewStateQuantLoaded()
    {
        this._viewStateRelatedSubs.add(this._viewStateService.appliedQuantification$.subscribe(
            (quantID: string)=>
            {
                // If we already know of this, don't do anything
                if(this._quantId == quantID)
                {
                    return;
                }

                // Either view state or user has just given us a new quant ID to be loaded
                this._quantId = quantID;

                // If already loading a quant, cancel
                if(this._quantLoad$)
                {
                    this._quantLoad$.unsubscribe();
                    this._quantLoad$ = null;
                }

                // Now we load the quant if there is one, and if we haven't already loaded it
                if(this._quantId && this._quantId.length > 0)
                {
                    if(this._quantIdLastLoaded != this._quantId)
                    {
                        this._quantLoad$ = this._quantService.getQuantification(this._quantId).subscribe(
                            (quant: QuantificationLayer)=>
                            {
                                // At this point we also notify the expression service what quant detectors and elements are available
                                this._exprService.setQuantDataAvailable(quant.getElementList(), quant.getDetectors());

                                // Remember that we've loaded this...
                                this.onQuantChange(this._quantId, quant);
                            },
                            (err)=>
                            {
                                console.error(this._logPrefix+": "+httpErrorToString(err, "Quant failed to load"));

                                // Saving the ID so we remember that we've failed to load this one!
                                this.onQuantChange(this._quantId, null);
                            }
                        );
                    }
                }
                else
                {
                    this.onQuantChange(null, null);
                }
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeViewStateQuantLoaded"));
            },
            ()=>
            {
                this.resubscribeViewStateQuantLoaded();
            }
        ));
    }

    // Handles a quant change
    private onQuantChange(quantId: string, quant: QuantificationLayer): void
    {
        // With a new quant loading anything we have cached is invalidated
        this._resultCache.clear();
        
        // Save stuff
        this._quantificationLoaded = quant;
        this._quantIdLastLoaded = quantId;

        this.rebuildData(WidgetDataUpdateReason.WUPD_QUANT);

        // Notify about this quant
        this.quantificationLoaded$.next(quant);
    }

    private resubscribeMultiQuantROIs()
    {
        this._viewStateRelatedSubs.add(this._quantService.multiQuantZStack$.subscribe(
            (zStack: ZStackItem[])=>
            {
                // Rebuild the list of RemainingPoints
                this._multiQuantLoaded = true;
                this.rebuildData(WidgetDataUpdateReason.WUPD_REMAINING_POINTS);
            },
            (err)=>
            {
                console.error(httpErrorToString(err, this._logPrefix+" resubscribeMultiQuantROIs"));
            },
            ()=>
            {
                this.resubscribeMultiQuantROIs();
            }
        ));
    }
}
