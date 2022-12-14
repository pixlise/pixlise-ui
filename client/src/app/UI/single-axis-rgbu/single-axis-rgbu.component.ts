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

import { Component, ElementRef, Input, OnInit, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subject, Subscription } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import {  RGBUImage } from "src/app/models/RGBUImage";
import { orderVisibleROIs } from "src/app/models/roi";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionService } from "src/app/services/selection.service";
import {  singleAxisRGBUWidgetState, ViewStateService } from "src/app/services/view-state.service";
import {  WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { RatioPickerData, RGBUAxisRatioPickerComponent } from "src/app/UI/rgbuplot/rgbuaxis-ratio-picker/rgbuaxis-ratio-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { SingleAxisRGBUDrawer } from "./drawer";
import { RGBUPlotInteraction } from "../rgbuplot/interaction";
import { RGBUPlotModel } from "../rgbuplot/model";
import { RGBUAxisUnit, RGBUMineralPoint, RGBUPlotData, RGBURatioPoint } from "../rgbuplot/rgbu-data";












@Component({
    selector: "single-axis-rgbu",
    templateUrl: "./single-axis-rgbu.component.html",
    styleUrls: ["./single-axis-rgbu.component.scss"]
})
export class SingleAxisRGBUComponent implements OnInit, OnDestroy
{
    @Input() widgetPosition: string = "";

    public model: RGBUPlotModel = new RGBUPlotModel();
    private _errorMsg: string = "";

    private _axisUnit: RGBUAxisUnit = null;

    public xAxisMinMax: MinMax = new MinMax(0, 5);
    public yAxisMinMax: MinMax = new MinMax(0, 5);

    @Input() public selectedMinXValue: number = null;
    @Input() public selectedMaxXValue: number = null;

    @Input() public xAxisSliderLength: number = 250;
    
    private _rgbuLoaded: RGBUImage = null;
    private _mineralsShown: string[] = [];
    private _visibleROIs: string[] = [];
    private _drawMonochrome: boolean = true;
    private _roiStackedOverlap: boolean = false;

    private _selectionModes: string[] = [RGBUPlotModel.SELECT_SUBTRACT, RGBUPlotModel.SELECT_RESET, RGBUPlotModel.SELECT_ADD];
    private _selectionMode: string = RGBUPlotModel.SELECT_RESET;

    private _subs = new Subscription();

    needsDraw$: Subject<void> = new Subject<void>();

    transform: PanZoom = new PanZoom();
    interaction: CanvasInteractionHandler = null;
    drawer: CanvasDrawer = null;

    keyItems: KeyItem[] = [];

    private _viewInited: boolean = false;

    constructor(
        private _datasetService: DataSetService,
        private _selectionService: SelectionService,
        private _viewStateService: ViewStateService,
        private _widgetDataService: WidgetRegionDataService,
        private _contextImageService: ContextImageService,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit(): void
    {
        // Start with some reasonable axis defaults. These get replaced when view state is loaded
        this._axisUnit = new RGBUAxisUnit(0, 1);

        // Decide what minerals to show initially...
        this._mineralsShown = [];

        // We want to know when a dataset changes, so we know what images are available to us
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                // Only use first RGBU image from dataset if context image hasn't loaded or an RGBU image isn't loaded
                if(dataset && !this._rgbuLoaded)
                {
                    // Get any RGBU images
                    if(dataset.rgbuImages.length <= 0)
                    {
                        // Find any TIF images
                        this._errorMsg = "Citizen opened a dataset with no RGBU imagery";
                    }
                    else
                    {
                        if(!dataset.rgbuImages[0].loadComplete)
                        {
                            // Trigger a load
                            this._datasetService.loadRGBUImage(dataset.rgbuImages[0].path).subscribe(
                                (rgbu: RGBUImage)=>
                                {
                                    this._rgbuLoaded = rgbu;
                                    this.prepareData("tif-loaded");
                                }
                            );
                        }
                        else
                        {
                            this._rgbuLoaded = dataset.rgbuImages[0];
                            this.prepareData("tif-cached");
                        }
                    }
                }
            }
        ));

        // We want to keep the RGBU image in sync with the loaded context image so user can switch RGBU images
        this._subs.add(this._contextImageService.mdl$.subscribe(
            ()=>
            {
                this._subs.add(this._contextImageService.mdl.contextImageItemShowing$.subscribe(
                    (contextImageItemShowing)=>
                    {
                        if(contextImageItemShowing && contextImageItemShowing.rgbuSourceImage)
                        {
                            this._rgbuLoaded = contextImageItemShowing.rgbuSourceImage;
                            this.prepareData("context-image-changed");
                        }
                    }
                ));
            }
        ));

        this._subs.add(this._selectionService.selection$.subscribe(
            ()=>
            {
                this.prepareData("selection-changed");
            }
        ));

        // Get ROI info from widget data service, because it aggregates ROIs and their colour from view state, etc
        this._subs.add(this._widgetDataService.widgetData$.subscribe(
            (reason: WidgetDataUpdateReason)=>
            {
                if(!this._viewInited)
                {
                    console.log("Restoring single axis rgbu view state...");
                    let loadedState = this._widgetDataService.viewState.singleAxisRGBU.get(this.widgetPosition);
                    if(loadedState)
                    {
                        this._mineralsShown = loadedState.minerals,
                        this._axisUnit = new RGBUAxisUnit(
                            RGBUPlotModel.channelToIdx(loadedState.channelA), 
                            RGBUPlotModel.channelToIdx(loadedState.channelB)
                        );
                        this.roiStackedOverlap = loadedState.roiStackedOverlap;
                    }
                    else
                    {
                        console.warn("Failed to find view state for single axis rgbu: "+this.widgetPosition);
                    }

                    this._viewInited = true;
                }
                else
                {
                    // Not the first one, check if we can ignore
                    if(reason != WidgetDataUpdateReason.WUPD_ROI_COLOURS)
                    {
                        // Don't care!
                        return;
                    }
                }

                this.prepareData("widget-data");
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private prepareData(reason: string): void
    {
        console.log("singleAxisRGBU prepareData reason: "+reason);
        if(!this._rgbuLoaded)
        {
            console.error("RGBU plot: No RGBU image loaded. Skipping...");
            return;
        }

        this.model = new RGBUPlotModel();
        this.model.selectionMode = this._selectionMode;

        let t0 = performance.now();

        // Calculate the ratio points. For this we need well defined ratios
        let data: RGBUPlotData = null;
        
        if(!this._axisUnit)
        {
            let pts: RGBURatioPoint[] = [];
            let xMinMax = new MinMax();
            let yMinMax = new MinMax();

            yMinMax.expand(0);
            yMinMax.expand(Math.max(...pts.map(point => point.count)));

            let errorMsg = "";//'Citizen has not chosen axis units';

            xMinMax.expand(0);
            xMinMax.expand(1);

            data = new RGBUPlotData(this._axisUnit, this._axisUnit, pts, 0, 0, xMinMax, yMinMax, [], errorMsg, 0, 0, "");
        }
        else
        {
            // Calculate the points
            data = this.calcPoints(this._rgbuLoaded);
        }

        this.model.raw = data;

        // Setup for drawing
        let inter = new RGBUPlotInteraction(this.model, this._selectionService, this._datasetService);

        this.interaction = inter;

        this.drawer = new SingleAxisRGBUDrawer(this.model);
        
        let t1 = performance.now();
        this.needsDraw$.next();
        let t2 = performance.now();


        console.log("singleAxisRGBU prepareData took: "+(t1-t0).toLocaleString()+"ms, needsDraw$ took: "+(t2-t1).toLocaleString()+"ms");
    }

    private setInitRange(xMinMax: MinMax): void
    {
        this.selectedMinXValue = this.selectedMinXValue || 0;
        this.selectedMaxXValue = this.selectedMaxXValue || xMinMax.max;

        // 5 seems to work well for both axes, as used by DTU
        const minAxisMax = 5;

        this.xAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(this._axisUnit.numeratorChannelIdx, this._axisUnit.denominatorChannelIdx);
        this.xAxisMinMax.expand(0);
        this.xAxisMinMax.expand(Math.max(xMinMax.max*1.2, minAxisMax));

        this.yAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(this._axisUnit.numeratorChannelIdx, this._axisUnit.denominatorChannelIdx);
        this.yAxisMinMax.expand(minAxisMax);
    }

    private calcPoints(rgbu: RGBUImage): RGBUPlotData
    {
        let currentSelection = this._selectionService.getCurrentSelection();
        let currSelPixels = currentSelection.pixelSelection.selectedPixels;
        let cropSelection = currentSelection.cropSelection;
        console.log("RECALC", currentSelection)

        let selectedXRange = null;
        if(this.selectedMinXValue !== null && this.selectedMaxXValue !== null) 
        {
            selectedXRange = new MinMax(this.selectedMinXValue, this.selectedMaxXValue);
        }

        let [pts, srcPixelIdxs, xMinMax, yMinMax, xAxisMinMax, yAxisMinMax, xAxisRawMinMax] = this.model.generatePoints(
            rgbu,
            cropSelection,
            this._axisUnit,
            this._axisUnit,
            selectedXRange
        );

        this.setInitRange(xAxisRawMinMax);

        const xBinCount = 200;
        const yBinCount = 200;

        const xBinSize = 1 / (xBinCount-1);
        const yBinSize = 1 / (yBinCount-1);

        // Minimize RGBU data into specified amounts of x and y bins
        let [countMinMax, binCounts, binMemberInfo, visibleROIs, binSrcPixels] = this.model.minimizeRGBUData(
            xBinCount,
            yBinCount,
            this._visibleROIs,
            pts,
            xMinMax,
            yMinMax,
            currSelPixels,
            srcPixelIdxs,
            this._widgetDataService,
        );

        // Generate ratio points for newly binned data
        let [ratioPoints, colourKey] = this.model.generateRGBURatioPoints(
            xBinCount,
            yBinCount,
            binCounts,
            xMinMax,
            yMinMax,
            Math.log(countMinMax.max),
            this._drawMonochrome,
            binMemberInfo,
            visibleROIs,
            currSelPixels,
            binSrcPixels,
            false,
            this.roiStackedOverlap
        );

        const allMinerals = RGBUPlotModel.getMineralPointsForAxes(this._axisUnit, this._axisUnit);
        let shownMinerals: RGBUMineralPoint[] = allMinerals.filter(mineral => this._mineralsShown.indexOf(mineral.name) >= 0);

        yAxisMinMax = new MinMax(0, Math.max(...ratioPoints.map(point => point.combinedCount)) * 1.2);
        let rgbuPlotData = new RGBUPlotData(
            this._axisUnit,
            this._axisUnit,
            ratioPoints,
            xBinSize,
            yBinSize,
            xAxisMinMax,
            yAxisMinMax,
            shownMinerals,
            "",
            rgbu.r.width,
            rgbu.r.height,
            rgbu.path
        );

        if(this.roiStackedOverlap) 
        {
            this.keyItems = visibleROIs.map(roi => (new KeyItem(roi.id, roi.name, roi.colour)));
        }
        else 
        {
            this.keyItems = Object.entries(colourKey).map(([key, keyColour]) => (new KeyItem(key, key, keyColour)));
        }

        return rgbuPlotData;
    }

    get cursorShown(): string
    {
        let cursor = "";
        if(this.model)
        {
            cursor = this.model.cursorShown;
        }
        return cursor;
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorSingleAxisRGBU;
    }

    get isSolo(): IconButtonState
    {
        return this._viewStateService.isSoloView(this.thisSelector, this.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    onToggleSolo(): void
    {
        this._viewStateService.toggleSoloView(this.thisSelector, this.widgetPosition);
    }

    get errorMsg(): string
    {
        if(this._errorMsg)
        {
            return this._errorMsg;
        }

        if(!this.model || !this.model.raw || !this.model.raw.errorMsg)
        {
            return "";
        }

        return "Citizen provided bad parameters: "+this.model.raw.errorMsg;
    }

    get roiStackedOverlap(): boolean
    {
        return this._roiStackedOverlap;
    }

    set roiStackedOverlap(value: boolean)
    {
        this._roiStackedOverlap = value;
    }

    onToggleROIOStackedOverlap(event): void
    {
        this._roiStackedOverlap = !this._roiStackedOverlap;
        let reason = "roi-stacked-overlap";
        this.prepareData(reason);
        this.saveState(reason);
    }

    get selectionModes(): string[]
    {
        return this._selectionModes;
    }

    get currentSelectionMode(): string
    {
        return this._selectionMode;
    }

    onChangeSelectionMode(mode: string): void
    {
        // Check that it's one of the selected ones
        if(this._selectionModes.indexOf(mode) >= 0)
        {
            this._selectionMode = mode;

            // Set on our model too so interaction class can see it
            if(this.model)
            {
                this.model.selectionMode = mode;
            }
        }
    }

    onSelectionExclude(): void
    {
        this.model.excludeSelection(this._selectionService, this._datasetService.datasetLoaded);
    }

    onSelectionClear(): void
    {
        this._selectionService.clearSelection();
    }

    onMinerals(event): void
    {
        RGBUPlotModel.selectMinerals(this.dialog, this._mineralsShown, (mineralsShown) => 
        {
            if(mineralsShown)
            {
                this._mineralsShown = mineralsShown;
                const reason = "mineral-choice";
                this.saveState(reason);
                this.prepareData(reason);
            }
        });
    }

    onRegions(event): void
    {
        const dialogConfig = new MatDialogConfig();

        dialogConfig.data = new ROIPickerData(false, false, true, false, this._visibleROIs, false, true, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (visibleROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(visibleROIs)
                {
                    this._visibleROIs = orderVisibleROIs(visibleROIs);

                    const reason = "rois-dialog";
                    this.saveState(reason);
                    this.prepareData(reason);
                }
            }
        );
    }

    onAxisClick(): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = {
            axis: new RGBUAxisUnit(this._axisUnit.numeratorChannelIdx, this._axisUnit.denominatorChannelIdx),
            range: new MinMax(this.selectedMinXValue, this.selectedMaxXValue),
        };


        const dialogRef = this.dialog.open(RGBUAxisRatioPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: RatioPickerData)=>
            {
                if(result)
                {
                    let resultCopy = new RGBUAxisUnit(result.axis.numeratorChannelIdx, result.axis.denominatorChannelIdx);
                    this._axisUnit = resultCopy;
                    this.selectedMinXValue = result.range.min;
                    this.selectedMaxXValue = result.range.max;
                    const reason = "axis-swap";
                    this.saveState(reason);
                    this.prepareData(reason);
                }
            }
        );
    }

    onChangeXAxis(event): void
    {
        this.selectedMinXValue = event.minValue;
        this.selectedMaxXValue = event.maxValue;
        if(event.finish) 
        {
            this.prepareData("scaling x axis");
        }
    }


    private saveState(reason: string): void
    {
        console.log("RGBU plot saveState called due to: "+reason);
        this._viewStateService.setSingleAxisRGBUState(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): singleAxisRGBUWidgetState
    {
        let toSave = new singleAxisRGBUWidgetState(
            this._mineralsShown,
            RGBUPlotModel.idxToChannel(this._axisUnit.numeratorChannelIdx),
            RGBUPlotModel.idxToChannel(this._axisUnit.denominatorChannelIdx),
            this.roiStackedOverlap
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
}
