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

import { Component, ElementRef, Input, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subject, Subscription } from "rxjs";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { MinMax } from "src/app/models/BasicTypes";
import { distanceBetweenPoints, Point } from "src/app/models/Geometry";
import { orderVisibleROIs, PredefinedROIID } from "src/app/models/roi";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { DataExpressionId } from "src/app/models/Expression";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionService } from "src/app/services/selection.service";
import { variogramState, ViewStateService } from "src/app/services/view-state.service";
import { DataSourceParams, RegionDataResults, WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { SliderValue } from "src/app/UI/atoms/slider/slider.component";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { ExpressionPickerComponent, ExpressionPickerData } from "src/app/UI/expression-picker/expression-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { RGBA } from "src/app/utils/colours";
import { xor_sum } from "src/app/utils/utils";
import { VariogramDrawer } from "./drawer";
import { VariogramInteraction } from "./interaction";
import { VariogramModel } from "./model";
import { VariogramData, VariogramPoint, VariogramPointGroup } from "./vario-data";


@Component({
    selector: "app-variogram-widget",
    templateUrl: "./variogram-widget.component.html",
    styleUrls: ["./variogram-widget.component.scss"]
})
export class VariogramWidgetComponent implements OnInit
{
    @Input() widgetPosition: string = "";

    private _variogramModel: VariogramModel = new VariogramModel();

    private _subs = new Subscription();
    private _visibleROIs: string[] = [];
    private _expressionIds: string[] = [];

    expressionNames: string[] = [];

    drawModeVector: boolean = false;

    needsDraw$: Subject<void> = new Subject<void>();

    transform: PanZoom = new PanZoom();
    interaction: CanvasInteractionHandler = null;
    drawer: CanvasDrawer = null;

    keyItems: KeyItem[] = [];

    distanceSliderMin: number = 0;
    distanceSliderMax: number = 0;

    binSliderMin: number = 1;
    binSliderMax: number = 1;

    private _viewInited: boolean = false;

    xorLeft: boolean = false;
    xorRight: boolean = false;

    constructor(
        private _exprService: DataExpressionService,
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
        private _widgetDataService: WidgetRegionDataService,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._widgetDataService.widgetData$.subscribe(
            (updReason: WidgetDataUpdateReason)=>
            {
                if(!this._viewInited)
                {
                    console.log("Restoring variogram widget view state...");

                    let loadedState = this._widgetDataService.viewState.variogramState.get(this.widgetPosition);
                    if(loadedState)
                    {
                        this._expressionIds = Array.from(loadedState.expressionIDs);
                        this._visibleROIs = orderVisibleROIs(loadedState.visibleROIs);

                        this._variogramModel.varioModel = loadedState.varioModel;
                        this._variogramModel.maxDistance = loadedState.maxDistance;
                        this._variogramModel.binCount = loadedState.binCount;
                        this.drawModeVector = loadedState.drawModeVector;
                    }
                    else
                    {
                        console.warn("Failed to find view state for binary plot: "+this.widgetPosition);
                    }

                    this._viewInited = true;
                }
                else
                {
                    // Not the first one, check if we can ignore?
                    if(updReason == WidgetDataUpdateReason.WUPD_SELECTION && this._visibleROIs.indexOf(PredefinedROIID.SelectedPoints) == -1)
                    {
                        // We're not showing selection, so ignore
                        return;
                    }

                    if(updReason == WidgetDataUpdateReason.WUPD_REMAINING_POINTS && this._visibleROIs.indexOf(PredefinedROIID.RemainingPoints) == -1)
                    {
                        // We're not showing selection, so ignore
                        return;
                    }
                }

                // Region info has been updated, rebuild our chart
                this.prepareData("widget-data", updReason);
            }
        ));
    }

    ngOnDestroy()
    {
        //console.warn('N-ary ['+this.id+'] ngOnDestroy');
        this._subs.unsubscribe();
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorVariogram;
    }

    get isSolo(): IconButtonState
    {
        return this._viewStateService.isSoloView(this.thisSelector, this.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    onToggleSolo(): void
    {
        this._viewStateService.toggleSoloView(this.thisSelector, this.widgetPosition);
    }

    get cursorShown(): string
    {
        let cursor = "";
        if(this._variogramModel)
        {
            cursor = this._variogramModel.cursorShown;
        }
        return cursor;
    }

    get varioModelIsExponential(): boolean
    {
        return this._variogramModel.varioModel == VariogramModel.varioModelExponential;
    }

    get varioModelIsSpherical(): boolean
    {
        return this._variogramModel.varioModel == VariogramModel.varioModelSpherical;
    }

    get varioModelIsGaussian(): boolean
    {
        return this._variogramModel.varioModel == VariogramModel.varioModelGaussian;
    }

    onModelExponential(): void
    {
        this._variogramModel.varioModel = VariogramModel.varioModelExponential;
        this.prepareData("model-exponential", null);
    }

    onModelSpherical(): void
    {
        this._variogramModel.varioModel = VariogramModel.varioModelSpherical;
        this.prepareData("model-spherical", null);
    }

    onModelGaussian(): void
    {
        this._variogramModel.varioModel = VariogramModel.varioModelGaussian;
        this.prepareData("model-gaussian", null);
    }

    get maxDistance(): number
    {
        return this._variogramModel.maxDistance;
    }

    get binNumber(): number
    {
        return this._variogramModel.binCount;
    }

    onChangeDistance(event: SliderValue)
    {
        this._variogramModel.maxDistance = event.value;

        //console.log(event);
        if(event.finish)
        {
            // Recalculate
            const reason = "max-distance";
            this.saveState(reason);
            this.prepareData(reason, null);
        }
    }

    onChangeBins(event: SliderValue)
    {
        this._variogramModel.binCount = Math.floor(event.value);

        if(event.finish)
        {
            // Recalculate
            const reason = "bin-number";
            this.saveState(reason);
            this.prepareData(reason, null);
        }
    }

    get errorMsg(): string
    {
        if(!this._variogramModel || !this._variogramModel.raw || !this._variogramModel.raw.errorMsg)
        {
            return "";
        }

        return "Citizen provided bad parameters: "+this._variogramModel.raw.errorMsg;
    }

    setDrawModeVector(drawVector: boolean): void
    {
        this.drawModeVector = drawVector;

        const reason = "draw-mode";
        this.saveState(reason);
        this.prepareData(reason, null);
    }

    setCombiningAlgorithm(xor: boolean, left: boolean): void
    {
        if(left)
        {
            this.xorLeft = xor;
        }
        else
        {
            this.xorRight = xor;
        }
        
        const reason = "combining-alg";
        this.saveState(reason);
        this.prepareData(reason, null);
    }

    private saveState(reason: string): void
    {
        console.log("variogram saveState called due to: "+reason);
        this._viewStateService.setVariogram(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): variogramState
    {
        let toSave = new variogramState(
            this._expressionIds,
            this._visibleROIs,
            this._variogramModel.varioModel,
            this._variogramModel.maxDistance,
            this._variogramModel.binCount,
            this.drawModeVector
        );
        return toSave;
    }

    // CanvasDrawer
    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.drawer)
        {
            this.drawer.drawWorldSpace(screenContext, drawParams);
        }
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(this.drawer)
        {
            this.drawer.drawScreenSpace(screenContext, drawParams);
        }
    }

    onRegions(event): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ROIPickerData(true, true, true, false, this._visibleROIs, true, false, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (visibleROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(visibleROIs)
                {
                    // Ensure selected points is last, so it's drawn on top of everything else
                    this._visibleROIs = orderVisibleROIs(visibleROIs);

                    const reason = "rois-dialog";
                    this.saveState(reason);
                    this.prepareData(reason, null);
                }
            }
        );
    }

    onExpressions(): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        dialogConfig.data = new ExpressionPickerData("Plot Axis", this._expressionIds, false, false, false);

        const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (displayIds: string[])=>
            {
                // Result should be a list of element symbol strings
                if(displayIds && displayIds.length > 0)
                {
                    this._expressionIds = displayIds;

                    if(this._expressionIds.length > 2)
                    {
                        this._expressionIds = this._expressionIds.slice(0, 2);
                    }

                    const reason = "expression-picker";
                    this.saveState(reason);
                    this.prepareData(reason, null);
                }
            }
        );
    }

    private prepareData(reason: string, widgetUpdReason: WidgetDataUpdateReason): void
    {
        console.log("Variogram prepareData reason: "+reason);

        // Get the slider bounds, these are dataset dependent
        //if(widgetUpdReason == WidgetDataUpdateReason.WUPD_DATASET)
        {
            this.recalcSliderBounds();
        }

        let t0 = performance.now();
        this.setDefaultsIfNeeded(widgetUpdReason);

        // Use widget data service to rebuild our data model
        let query: DataSourceParams[] = [];

        // Query each region for both expressions if we have any...
        if(this._expressionIds.length > 0)
        {
            for(let roiId of this._visibleROIs)
            {
                for(let exprId of this._expressionIds)
                {
                    query.push(new DataSourceParams(exprId, roiId, ""));
                }
            }

            this._widgetDataService.getData(query, false).subscribe(
                (queryData=>
                {
                    this.processQueryResult(t0, queryData);
                })
            )
        }
        else
        {
            this.processQueryResult(t0, null);
        }
    }

    private processQueryResult(t0: number, queryData: RegionDataResults)
    {
        let title = "";
        if(queryData && !queryData.hasQueryErrors() && this._expressionIds.length > 0)
        {
            this.expressionNames = [];
            for(let exprId of this._expressionIds)
            {
                let expr = this._exprService.getExpression(exprId);
                let label = expr.getExpressionShortDisplayName(12).shortName;
                this.expressionNames.push(expr.name);

                if(title.length > 0)
                {
                    title += " / ";
                }
                title += label;
            }
        }

        let varioPoints: VariogramPoint[][] = [];
        let errorStr = "";

        if(!this._variogramModel.binCount || this._variogramModel.binCount < this.binSliderMin)
        {
            errorStr = "invalid bin count";
        }
        else if(!this._variogramModel.maxDistance || this._variogramModel.maxDistance < this.distanceSliderMin)
        {
            errorStr = "invalid max distance";
        }
        else
        {
            if(!queryData)
            {
                errorStr = "invalid expressions or ROIs selected";
            }
            else
            {
                if(queryData.error)
                {
                    errorStr = "error: "+queryData.error;
                }
                else
                {
                    let valsOnly: PMCDataValues[] = [];
                    for(let result of queryData.queryResults)
                    {
                        valsOnly.push(result.values);
                    }
                    varioPoints = this.calcAllVariogramPoints(valsOnly);

                    if(varioPoints.length <= 0)
                    {
                        errorStr = "failed to get expression data";
                    }
                }
            }
        }

        // Decide what to draw
        let dispPoints: VariogramPointGroup[] = [];
        let dispMinMax = new MinMax();
        let queryIdx = 0;
        for(let pts of varioPoints)
        {
            let region = queryData.queryResults[queryIdx].region;
            if(!region.colour)
            {
                continue;
            }

            // Find the minmax
            let ptValueRange = new MinMax();
            for(let pt of pts)
            {
                ptValueRange.expand(pt.meanValue);
            }

            let ptGroup = new VariogramPointGroup(RGBA.fromWithA(region.colour, 1), region.shape, pts, ptValueRange);
            dispPoints.push(ptGroup);
            dispMinMax.expandByMinMax(ptValueRange);

            queryIdx++;
        }

        //console.log('  Variogram max distance included '+totalCalcs+' points');

        let variogramData: VariogramData = new VariogramData(title, dispPoints, dispMinMax, errorStr);

        this.interaction = new VariogramInteraction(this._variogramModel, this._selectionService, this._datasetService);
        this.drawer = new VariogramDrawer(this._variogramModel);

        this._variogramModel.raw = variogramData;

        let t1 = performance.now();
        this.needsDraw$.next();
        let t2 = performance.now();

        console.log("  Variogram prepareData took: "+(t1-t0).toLocaleString()+"ms, needsDraw$ took: "+(t2-t1).toLocaleString()+"ms");
    }

    private setDefaultsIfNeeded(widgetUpdReason: WidgetDataUpdateReason): void
    {
        if(
            this._expressionIds.length <= 0 ||
            (
                widgetUpdReason == WidgetDataUpdateReason.WUPD_QUANT &&
                DataExpressionId.hasPseudoIntensityExpressions(this._expressionIds)
            )
        )
        {
            let exprs = this._exprService.getStartingExpressions(this._widgetDataService.quantificationLoaded);
            if(exprs.length > 0)
            {
                console.log("  Variogram: Defaulting to first expression...");
                this._expressionIds = [exprs[0]];
            }
            else
            {
                console.warn("  Variogram: failed to default to first expression");
                this._expressionIds = [];
            }
        }

        // If no ROI selected, use all points
        if(this._visibleROIs.length <= 0)
        {
            this._visibleROIs = PredefinedROIID.defaultROIs;
        }
    }

    private calcAllVariogramPoints(queryData: PMCDataValues[]): VariogramPoint[][]
    {
        const dataset = this._datasetService.datasetLoaded;

        let result: VariogramPoint[][] = [];
        for(let c = 0; c < queryData.length; c++)
        {
            const data = queryData[c];
            if(!data)
            {
                return [];
            }

            let pts: Point[] = [];
            for(let val of data.values)
            {
                let pt: Point = null;
                let locIdx = dataset.pmcToLocationIndex.get(val.pmc);

                if(
                    locIdx != undefined &&
                    locIdx >= 0 &&
                    this._datasetService.datasetLoaded.experiment
                )
                {
                    let locs = dataset.experiment.getLocationsList();
                    if(locs && locIdx < locs.length)
                    {
                        const beam = locs[locIdx].getBeam();
                        if(beam)
                        {
                            pt = new Point(beam.getX(), beam.getY());
                            if(dataset.beamUnitsInMeters)
                            {
                                pt.x *= 1000;
                                pt.y *= 1000;
                            }
                        }
                    }
                }

                pts.push(pt);
            }

            // If we're only showing 1 expression, we use that as elem 1+2, as we're drawing a Variogram
            // If we have 2 expressions, we use those as elem1, elem2 respectively, and drawing a Co-variogram
            let data2 = data;
            if(this._expressionIds.length > 1)
            {
                data2 = queryData[c+1];
                c++; // consume the next one!
            }
            result.push(this.calcCrossVariogramPoints(data, data2, pts));
        }

        return result;
    }

    private calcCrossVariogramPoints(elem1: PMCDataValues, elem2: PMCDataValues, coords: Point[]): VariogramPoint[]
    {
        let result: VariogramPoint[] = [];

        const binWidth = this._variogramModel.maxDistance / this._variogramModel.binCount;
        for(let c = 0; c < this._variogramModel.binCount; c++)
        {
            result.push(new VariogramPoint(binWidth*(c+1), 0, 0, 0));
        }

        for(let c = 0; c < elem1.values.length; c++)
        {
            if(elem1.values[c].pmc != elem2.values[c].pmc)
            {
                console.error("calcCrossVariogramPoints failed, elem1 PMC order doesn't match elem2");
                return [];
            }

            for(let i = 0; i < elem1.values.length; i++)
            {
                if(c != i && coords[c] && coords[i])
                {
                    // Find distance between points
                    let dist = distanceBetweenPoints(coords[c], coords[i]);

                    if(dist < this._variogramModel.maxDistance)
                    {
                        // Find the right bin
                        let binIdx = Math.floor(dist / binWidth);

                        // Cross-variogram point:
                        // difference in elem1 * difference in elem 2
                        let lvalue = this.xorLeft ? xor_sum(elem1.values[c].value, elem1.values[i].value) : (elem1.values[c].value-elem1.values[i].value);
                        let rvalue = this.xorRight ? xor_sum(elem2.values[c].value, elem2.values[i].value) : (elem2.values[c].value-elem2.values[i].value);

                        result[binIdx].sum += lvalue * rvalue;
                        result[binIdx].count++;
                    }
                }
            }
        }

        // Calculate all the means
        for(let c = 0; c < result.length; c++)
        {
            if(result[c].count > 0)
            {
                result[c].meanValue = 0.5 * result[c].sum / result[c].count;
            }
            else
            {
                result[c].meanValue = null;
            }
        }

        return result;
    }

    recalcSliderBounds(): void
    {
        // If slider values were invalid, we reset it here to 1/2
        let valuesWereDefaults = false;
        if(this.distanceSliderMin == 0 && this.distanceSliderMax == 0 && this.binSliderMin == 1 && this.binSliderMax == 1)
        {
            valuesWereDefaults = true;
        }

        this.distanceSliderMin = this.distanceSliderMax = 0;
        this.binSliderMin = this.binSliderMax = 1;

        if(!this._datasetService.datasetLoaded)
        {
            return;
        }

        const dataset = this._datasetService.datasetLoaded;

        // Min distance is actually the point display radius, though we can go a bit smaller
        this.distanceSliderMin = dataset.minXYDistance_mm;
        this.distanceSliderMax = Math.max(
            dataset.locationPointXSize,
            dataset.locationPointYSize
        );
        if(dataset.beamUnitsInMeters)
        {
            this.distanceSliderMax *= 1000.0;
        }

        this.binSliderMax = dataset.locationCount;

        if(valuesWereDefaults)
        {
            // Start off with some reasonable defaults
            this._variogramModel.maxDistance = (this.distanceSliderMin+this.distanceSliderMax)/2;
            this._variogramModel.binCount = Math.floor((this.binSliderMin+this.binSliderMax)/2);
        }
    }
}
