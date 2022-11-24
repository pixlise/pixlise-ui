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

import { Component, ElementRef, HostListener, Input, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subject, Subscription } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import { RGBUImage } from "src/app/models/RGBUImage";
import { orderVisibleROIs } from "src/app/models/roi";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { rgbuPlotWidgetState, ViewStateService } from "src/app/services/view-state.service";
import { WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { RatioPickerData, RGBUAxisRatioPickerComponent } from "src/app/UI/rgbuplot/rgbuaxis-ratio-picker/rgbuaxis-ratio-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { RGBUPlotDrawer } from "./drawer";
import { RGBUPlotInteraction } from "./interaction";
import { RGBUPlotModel } from "./model";
import { RGBUAxisUnit, RGBUMineralPoint, RGBUPlotData, RGBURatioPoint } from "./rgbu-data";












@Component({
    selector: "rgbu-plot",
    templateUrl: "./rgbuplot.component.html",
    styleUrls: ["./rgbuplot.component.scss"]
})
export class RGBUPlotComponent implements OnInit, OnDestroy, AfterViewInit
{
    @Input() widgetPosition: string = "";

    public model: RGBUPlotModel = new RGBUPlotModel();
    private _errorMsg: string = "";

    private _xAxisUnit: RGBUAxisUnit = null;
    private _yAxisUnit: RGBUAxisUnit = null;

    public xAxisMinMax: MinMax = new MinMax(0, 5);
    public yAxisMinMax: MinMax = new MinMax(0, 5);

    @Input() public selectedMinXValue: number = null;
    @Input() public selectedMaxXValue: number = null;

    @Input() public selectedMinYValue: number = null;
    @Input() public selectedMaxYValue: number = null;

    @Input() public yAxisSliderLength: number = 150;
    @Input() public xAxisSliderLength: number = 250;

    private _rgbuLoaded: RGBUImage = null;
    private _mineralsShown: string[] = [];
    private _visibleROIs: string[] = [];
    private _drawMonochrome: boolean = false;

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
        this._xAxisUnit = new RGBUAxisUnit(0, 1);
        this._yAxisUnit = new RGBUAxisUnit(2, 3);

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
            (sel: SelectionHistoryItem)=>
            {
                if(this._viewInited)
                {
                    this.prepareData("selection");
                }
            }
        ));

        // Get ROI info from widget data service, because it aggregates ROIs and their colour from view state, etc
        this._subs.add(this._widgetDataService.widgetData$.subscribe(
            (reason: WidgetDataUpdateReason)=>
            {
                if(!this._viewInited)
                {
                    console.log("Restoring rgbu plot view state...");

                    let loadedState = this._widgetDataService.viewState.rgbuPlots.get(this.widgetPosition);
                    if(loadedState)
                    {
                        this._mineralsShown = loadedState.minerals,
                        this._xAxisUnit = new RGBUAxisUnit(
                            RGBUPlotModel.channelToIdx(loadedState.xChannelA), 
                            RGBUPlotModel.channelToIdx(loadedState.xChannelB)
                        );

                        this._yAxisUnit = new RGBUAxisUnit(
                            RGBUPlotModel.channelToIdx(loadedState.yChannelA), 
                            RGBUPlotModel.channelToIdx(loadedState.yChannelB)
                        );

                        if(loadedState.drawMonochrome !== undefined)
                        {
                            this._drawMonochrome = loadedState.drawMonochrome;
                        }

                        this.selectedMinXValue = loadedState?.selectedMinXValue || null;
                        this.selectedMaxXValue = loadedState?.selectedMaxXValue || null;
                        this.selectedMinYValue = loadedState?.selectedMinYValue || null;
                        this.selectedMaxYValue = loadedState?.selectedMaxYValue || null;
                    }
                    else
                    {
                        console.warn("Failed to find view state for rgbu plot: "+this.widgetPosition);
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

    ngAfterViewInit(): void
    {
        this.onResize();
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    private prepareData(reason: string): void
    {
        if(!this._viewInited)
        {
            // Not inited yet, maybe called for reason other than widget-data, eg tif loaded...
            return;
        }

        console.log("RGBUPlot prepareData reason: "+reason);
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
        
        if(!this._xAxisUnit || !this._yAxisUnit)
        {
            let pts: RGBURatioPoint[] = [];
            let xMinMax = new MinMax();
            let yMinMax = new MinMax();
            let errorMsg = "";//'Citizen has not chosen axis units';

            xMinMax.expand(0);
            xMinMax.expand(1);
            yMinMax.expand(0);
            yMinMax.expand(1);

            data = new RGBUPlotData(this._xAxisUnit, this._yAxisUnit, pts, 0, 0, xMinMax, yMinMax, [], errorMsg, 0, 0, "");
        }
        else
        {
            // Calculate the points
            data = this.calcPoints(this._rgbuLoaded);
        }

        this.model.raw = data;

        let t1 = performance.now();

        // Setup for drawing
        let inter = new RGBUPlotInteraction(this.model, this._selectionService, this._datasetService);

        let t2 = performance.now();

        this.interaction = inter;

        this.drawer = new RGBUPlotDrawer(this.model);
        
        let t3 = performance.now();
        this.needsDraw$.next();
        let t4 = performance.now();

        console.log("  RGBUPlot prepareData took: "+(t1-t0).toLocaleString()+"ms+"+(t2-t1).toLocaleString()+"ms+"+(t3-t2).toLocaleString()+"ms, needsDraw$ took: "+(t4-t3).toLocaleString()+"ms");
    }

    private setInitRange(xMinMax: MinMax, yMinMax: MinMax): void
    {
        this.selectedMinXValue = this.selectedMinXValue || 0;
        this.selectedMinYValue = this.selectedMinYValue || 0;
        this.selectedMaxXValue = this.selectedMaxXValue || xMinMax.max;
        this.selectedMaxYValue = this.selectedMaxYValue || yMinMax.max;

        // 5 seems to work well for both axes, as used by DTU
        const minAxisMax = 5;

        this.xAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(this._xAxisUnit.numeratorChannelIdx, this._xAxisUnit.denominatorChannelIdx);
        this.xAxisMinMax.expand(0);
        this.xAxisMinMax.expand(Math.max(xMinMax.max*1.2, minAxisMax));

        this.yAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(this._yAxisUnit.numeratorChannelIdx, this._yAxisUnit.denominatorChannelIdx);
        this.yAxisMinMax.expand(0);
        this.yAxisMinMax.expand(Math.max(yMinMax.max*1.2, minAxisMax));
    }

    private calcPoints(rgbu: RGBUImage): RGBUPlotData
    {
        let t0 = performance.now();

        let currentSelection = this._selectionService.getCurrentSelection();
        let currSelPixels = currentSelection.pixelSelection.selectedPixels;
        let cropSelection = currentSelection.cropSelection;

        let selectedXRange = null;
        if(this.selectedMinXValue !== null && this.selectedMaxXValue !== null) 
        {
            selectedXRange = new MinMax(this.selectedMinXValue, this.selectedMaxXValue);
        }
        let selectedYRange = null;
        if(this.selectedMinYValue !== null && this.selectedMaxYValue !== null) 
        {
            selectedYRange = new MinMax(this.selectedMinYValue, this.selectedMaxYValue);
        }

        let [pts, srcPixelIdxs, xMinMax, yMinMax, xAxisMinMax, yAxisMinMax, xAxisRawMinMax, yAxisRawMinMax] = this.model.generatePoints(
            rgbu,
            cropSelection,
            this._xAxisUnit,
            this._yAxisUnit,
            selectedXRange,
            selectedYRange
        );

        let t1 = performance.now();

        this.setInitRange(xAxisRawMinMax, yAxisRawMinMax);
 
        const xBinCount = 200;
        const yBinCount = 200;

        const xBinSize = 1 / (xBinCount-1);
        const yBinSize = 1 / (yBinCount-1);

        let t2 = performance.now();

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

        let t3 = performance.now();

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
            binSrcPixels
        );

        let t4 = performance.now();

        const allMinerals = RGBUPlotModel.getMineralPointsForAxes(this._xAxisUnit, this._yAxisUnit);
        let shownMinerals: RGBUMineralPoint[] = allMinerals.filter(mineral => this._mineralsShown.indexOf(mineral.name) >= 0);

        let rgbuPlotData = new RGBUPlotData(
            this._xAxisUnit,
            this._yAxisUnit,
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

        let t5 = performance.now();

        this.keyItems = Object.entries(colourKey).map(([key, keyColour]) => (new KeyItem(key, key, keyColour)));

        let t6 = performance.now();

        //console.log("  RGBUPlot calcPoints took: "+(t1-t0).toLocaleString()+"ms+"+(t2-t1).toLocaleString()+"ms+"+(t3-t2).toLocaleString()+"ms+"+(t4-t3).toLocaleString()+"ms+"+(t5-t4).toLocaleString()+"ms+"+(t6-t5).toLocaleString()+"ms. Total="+(t6-t0).toLocaleString()+"ms");

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
        return ViewStateService.widgetSelectorRGBUPlot;
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

    get drawMonochrome(): boolean
    {
        return this._drawMonochrome;
    }

    onToggleDrawMonochrome(event): void
    {
        this._drawMonochrome = !this._drawMonochrome;

        let reason = "draw-colour-toggle";
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

    onAxisClick(axis: string): void
    {
        const dialogConfig = new MatDialogConfig();

        let exprId = [];
        if(axis == "X")
        {
            dialogConfig.data = {
                axis: new RGBUAxisUnit(this._xAxisUnit.numeratorChannelIdx, this._xAxisUnit.denominatorChannelIdx),
                range: new MinMax(this.selectedMinXValue, this.selectedMaxXValue),
            };
        }
        else if(axis == "Y")
        {
            dialogConfig.data = {
                axis: new RGBUAxisUnit(this._yAxisUnit.numeratorChannelIdx, this._yAxisUnit.denominatorChannelIdx),
                range: new MinMax(this.selectedMinYValue, this.selectedMaxYValue),
            };
        }
        else
        {
            console.error("Unknown axis for rgbu plot axis setting: "+axis);
            return;
        }

        const dialogRef = this.dialog.open(RGBUAxisRatioPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: RatioPickerData)=>
            {
                if(result)
                {
                    if(result.axis)
                    {
                        let resultCopy = new RGBUAxisUnit(result.axis.numeratorChannelIdx, result.axis.denominatorChannelIdx);
                        if(axis == "X")
                        {
                            this._xAxisUnit = resultCopy;
                        }
                        else if(axis == "Y")
                        {
                            this._yAxisUnit = resultCopy;
                        }
                        else
                        {
                            console.error("Unknown axis for rgbu plot axis setting: "+axis);
                            return;
                        }
                    }
                    if(result.range)
                    {
                        if(axis == "X")
                        {
                            this.selectedMinXValue = result.range.min;
                            this.selectedMaxXValue = result.range.max;
                        }
                        else if(axis == "Y")
                        {
                            this.selectedMinYValue = result.range.min;
                            this.selectedMaxYValue = result.range.max;
                        }
                        else
                        {
                            console.error("Unknown axis for rgbu plot axis setting: "+axis);
                            return;
                        }
                    }

                    const reason = "axis-swap-"+axis;
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
            this.saveState("scaling x axis");
        }
    }

    onChangeYAxis(event): void
    {
        this.selectedMinYValue = event.minValue;
        this.selectedMaxYValue = event.maxValue;
        if(event.finish) 
        {
            this.prepareData("scaling y axis");
            this.saveState("scaling y axis");
        }
    }

    private saveState(reason: string): void
    {
        console.log("RGBU plot saveState called due to: "+reason);
        this._viewStateService.setRGBUPlotState(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): rgbuPlotWidgetState
    {
        let toSave = new rgbuPlotWidgetState(
            this._mineralsShown,
            RGBUPlotModel.idxToChannel(this._yAxisUnit.numeratorChannelIdx),
            RGBUPlotModel.idxToChannel(this._yAxisUnit.denominatorChannelIdx),
            RGBUPlotModel.idxToChannel(this._xAxisUnit.numeratorChannelIdx),
            RGBUPlotModel.idxToChannel(this._xAxisUnit.denominatorChannelIdx),
            this._drawMonochrome,
            this.selectedMinXValue,
            this.selectedMaxXValue,
            this.selectedMinYValue,
            this.selectedMaxYValue,
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

    @HostListener("window:resize", ["$event"])
    onResize()
    {
        let canvas = document.querySelector(`#${this.widgetPosition} canvas`);
        if(!canvas || !canvas.clientHeight || !canvas.clientWidth)
        {
            return;
        }
        let [canvasHeight, canvasWidth] = [canvas.clientHeight, canvas.clientWidth];
        this.yAxisSliderLength = Math.max(canvasHeight/2 - 12, 20);
        this.xAxisSliderLength = Math.max(canvasWidth/2 - 12, 20);
    }
}
