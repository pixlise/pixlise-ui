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
import { ReplaySubject, Subject, Subscription } from "rxjs";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { getQuantifiedDataWithExpression } from "src/app/expression-language/expression-language";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { MistROIItem, PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataExpression, DataExpressionService } from "src/app/services/data-expression.service";
import { DataSetService } from "src/app/services/data-set.service";
import { DiffractionPeakService } from "src/app/services/diffraction-peak.service";
import { QuantificationService, ZStackItem } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { ViewState, ViewStateService } from "src/app/services/view-state.service";
import { RGBA } from "src/app/utils/colours";
import { httpErrorToString, randomString, SentryHelper } from "src/app/utils/utils";


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
    constructor(public exprId: string, public roiId: string, public units: DataUnit = DataUnit.UNIT_DEFAULT)
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
        visible: boolean = false,
        dateAdded: string = null
    )
    {
        super(id, name, locationIndexes, description, imageName, pixelIndexes, shared, creator, mistROIItem, visible, dateAdded);
    }

    // TODO: this is pretty dodgy, there must be a better way. Quickly tried casting RegoinData as ROISavedItem and assignment
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
    constructor(public values: PMCDataValues, public errorType: WidgetDataErrorType, public error: string, public warning: string)
    {
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

    constructor(
        private _roiService: ROIService,
        private _selectionService: SelectionService,
        private _viewStateService: ViewStateService,
        private _exprService: DataExpressionService,
        private _datasetService: DataSetService,
        private _quantService: QuantificationService,
        private _diffractionService: DiffractionPeakService,
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

    // This queries data based on parameters. The assumption is it either returns null, or returns an array with the same
    // amount of items as the input parameters array (what). This is required because code calling this can then know which
    // DataSourceParams is associated with which returned value. The result array may contain null items, but the length
    // should equal "what.length"
    getData(what: DataSourceParams[], continueOnError: boolean): RegionDataResults
    {
        let dataset = this._datasetService.datasetLoaded;

        if(!dataset)
        {
            console.error("getData: No dataset");
            return new RegionDataResults([], "No dataset");
        }

        let result: RegionDataResultItem[] = [];

        for(let query of what)
        {
            // Get region info
            let region = this._regions.get(query.roiId);
            if(!region)
            {
                let errorMsg = "Failed to find region id: \""+query.roiId+"\"";

                if(continueOnError)
                {
                    console.error("getData: "+errorMsg+". Ignored...");
                    result.push(new RegionDataResultItem(null, WidgetDataErrorType.WERR_ROI, errorMsg, null));
                    continue;
                }
                console.error("getData: "+errorMsg);
                return new RegionDataResults([], errorMsg);
            }

            // Get the expression
            let expr = this._exprService.getExpression(query.exprId);
            if(!expr)
            {
                let errorMsg = "Failed to retrieve expression: \""+query.exprId+"\"";

                if(continueOnError)
                {
                    
                    console.error("getData: "+errorMsg+". Ignored...");
                    result.push(new RegionDataResultItem(null, WidgetDataErrorType.WERR_EXPR, errorMsg, null));
                    continue;
                }
                console.error("getData: "+errorMsg);
                return new RegionDataResults([], errorMsg);
            }

            try
            {
                let data = getQuantifiedDataWithExpression(expr.expression, this._quantificationLoaded, dataset, dataset, dataset, this._diffractionService, dataset, region.pmcs);
                data = this.applyUnitConversion(expr, data, query.units);
                result.push(new RegionDataResultItem(data, null, null, data.warning));
            }
            catch (error)
            {
                let errorMsg = error.message;
                SentryHelper.logMsg(true, errorMsg);
                result.push(new RegionDataResultItem(null, WidgetDataErrorType.WERR_QUERY, errorMsg, null));
                //return null;
            }
        }

        return new RegionDataResults(result, "");
    }

    private applyUnitConversion(sourceExpression: DataExpression, data: PMCDataValues, unitsRequested: DataUnit): PMCDataValues
    {
        let result = data;

        // Run through all points and apply the units requested. NOTE: This may not work, eg if we're not in the right source units, we can't
        // convert, so in those cases we do nothing
        let col = DataExpressionService.getPredefinedQuantExpressionElementColumn(sourceExpression.id);
        if(col === "%")
        {
            // We allow conversions here...
            let conversion = 1;
            if(unitsRequested == DataUnit.UNIT_MMOL)
            {
                // Need to parse the elements out of the expression to calculate molecular mass and form a conversion factor
                let formula = DataExpressionService.getPredefinedQuantExpressionElement(sourceExpression.id);
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

        console.log(logmsg+": Region build finished, notifying subscribers...");
        let t0 = performance.now();
        this.widgetData$.next(reason);
        let t1 = performance.now();
        console.log(logmsg+": Subscribers notified in "+(t1-t0).toLocaleString()+"ms");
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
                                this._quantIdLastLoaded = this._quantId/*quant.summary.jobId*/; // Remember that we've loaded this one!
                                this._quantificationLoaded = quant;

                                this.rebuildData(WidgetDataUpdateReason.WUPD_QUANT);

                                // Also notify that there is a new quantification loaded
                                this.quantificationLoaded$.next(quant);
                            },
                            (err)=>
                            {
                                console.error(this._logPrefix+": "+httpErrorToString(err, "Quant failed to load"));
                                // Failed to load a quant, set our state that way
                                this._quantIdLastLoaded = this._quantId/*quant.summary.jobId*/; // Remember that we've failed to load this one!
                                this._quantificationLoaded = null;

                                this.rebuildData(WidgetDataUpdateReason.WUPD_QUANT);

                                // Notify out that we don't have a quant loaded
                                this.quantificationLoaded$.next(null);
                            }
                        );
                    }
                }
                else
                {
                    // No quant to load!
                    this._quantificationLoaded = null;

                    // Don't strictly need to clear this here but might as well...
                    this._quantIdLastLoaded = null;

                    this.rebuildData(WidgetDataUpdateReason.WUPD_QUANT);

                    // Notify out that we don't have a quant loaded
                    this.quantificationLoaded$.next(null);
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
