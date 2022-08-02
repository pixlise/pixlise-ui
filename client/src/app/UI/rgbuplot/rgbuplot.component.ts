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
import { Point } from "src/app/models/Geometry";
import { PixelSelection } from "src/app/models/PixelSelection";
import { FloatImage, RGBUImage } from "src/app/models/RGBUImage";
import { orderVisibleROIs } from "src/app/models/roi";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { rgbuPlotWidgetState, ViewStateService } from "src/app/services/view-state.service";
import { RegionData, WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";
import { KeyItem } from "src/app/UI/atoms/widget-key-display/widget-key-display.component";
import { RGBUAxisRatioPickerComponent } from "src/app/UI/rgbuplot/rgbuaxis-ratio-picker/rgbuaxis-ratio-picker.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { ColourRamp, Colours, RGBA } from "src/app/utils/colours";
import { RGBUPlotDrawer } from "./drawer";
import { RGBUPlotInteraction } from "./interaction";
import { RGBUPlotModel } from "./model";
import { RGBUAxisUnit, RGBUMineralPoint, RGBUMineralRatios, RGBUPlotData, RGBURatioPoint } from "./rgbu-data";












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
        this._mineralsShown = [];//Array.from(RGBUMineralRatios.names);

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
                this.prepareData("selection");
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
                            this.channelToIdx(loadedState.xChannelA), 
                            this.channelToIdx(loadedState.xChannelB)
                        );

                        this._yAxisUnit = new RGBUAxisUnit(
                            this.channelToIdx(loadedState.yChannelA), 
                            this.channelToIdx(loadedState.yChannelB)
                        );

                        if(loadedState.drawMonochrome !== undefined)
                        {
                            this._drawMonochrome = loadedState.drawMonochrome;
                        }
                    }
                    else
                    {
                        console.warn("Failed to find view state for rgbu plot: "+this.widgetPosition);
                    }

                    this._viewInited = false;
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

                this.prepareData("roi-colours");
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

        // Setup for drawing
        let inter = new RGBUPlotInteraction(this.model, this._selectionService, this._datasetService);

        // this._subs.add(inter.axisClick$.subscribe(
        //     (axis: string)=>
        //     {
        //         this.onAxisClick(axis);
        //     }
        // ));

        this.interaction = inter;

        this.drawer = new RGBUPlotDrawer(this.model);
        
        let t1 = performance.now();
        this.needsDraw$.next();
        let t2 = performance.now();


        console.log("  RGBUPlot prepareData took: "+(t1-t0).toLocaleString()+"ms, needsDraw$ took: "+(t2-t1).toLocaleString()+"ms");
    }

    private getValue(channel: FloatImage[], numeratorChannel: number, denominatorChannel: number, pixelIdx: number): number
    {
        let result = channel[numeratorChannel].values[pixelIdx];
        if(denominatorChannel > -1)
        {
            result /= channel[denominatorChannel].values[pixelIdx];
        }
        return result;
    }

    private setInitRange(xMinMax: MinMax, yMinMax: MinMax): void
    {
        if(!this.selectedMinXValue) 
        {
            this.selectedMinXValue = 0;
        }
        if(!this.selectedMinYValue) 
        {
            this.selectedMinYValue = 0;
        }
        if(!this.selectedMaxXValue) 
        {
            this.selectedMaxXValue = xMinMax.max;
        }
        if(!this.selectedMaxYValue) 
        {
            this.selectedMaxYValue = yMinMax.max;
        }
        // Edit so min is always 0 and we have a little buffer above the max
        this.xAxisMinMax = new MinMax(0, xMinMax.max*1.2);
        this.yAxisMinMax = new MinMax(0, yMinMax.max*1.2);

        // 5 seems to work well for both axes, as used by DTU
        const minAxisMax = 5;
        this.xAxisMinMax.expand(minAxisMax);
        this.yAxisMinMax.expand(minAxisMax);

    }

    private calcPoints(rgbu: RGBUImage): RGBUPlotData
    {
        let channels = [rgbu.r, rgbu.g, rgbu.b, rgbu.u];
        const pixels = rgbu.r.width*rgbu.r.height;

        // Work out the min/max of mineral locations
        let xAxisMinMax = this.getAxisMinMaxForMinerals(this._xAxisUnit.numeratorChannelIdx, this._xAxisUnit.denominatorChannelIdx);
        let yAxisMinMax = this.getAxisMinMaxForMinerals(this._yAxisUnit.numeratorChannelIdx, this._yAxisUnit.denominatorChannelIdx);

        this.setInitRange(xAxisMinMax, yAxisMinMax);
        
        xAxisMinMax = new MinMax(this.selectedMinXValue, this.selectedMaxXValue);
        yAxisMinMax = new MinMax(this.selectedMinYValue, this.selectedMaxYValue);

        // Generate the raw points while calculating min/max for each axis
        let pts: Point[] = [];
        let xMinMax = new MinMax();
        let yMinMax = new MinMax();

        // Get the selected and cropped pixels
        let currentSelection = this._selectionService.getCurrentSelection();
        let currSelPixels = currentSelection.pixelSelection.selectedPixels;
        let cropSelection = currentSelection.cropSelection;

        // We also want to preserve where the pixels are, so store a corresponding array of source pixel indexes
        let srcPixelIdxs: number[] = [];

        for(let c = 0; c < pixels; c++)
        {
            // Skip pixels if there's an active crop selection and they're not included
            if(cropSelection.selectedPixels.size > 0 && !cropSelection.isPixelSelected(c)) 
            {
                continue;
            }

            let pt = new Point(
                this.getValue(channels, this._xAxisUnit.numeratorChannelIdx, this._xAxisUnit.denominatorChannelIdx, c),
                this.getValue(channels, this._yAxisUnit.numeratorChannelIdx, this._yAxisUnit.denominatorChannelIdx, c)
            );

            if(isFinite(pt.x) && isFinite(pt.y) && xAxisMinMax.isWithin(pt.x) && yAxisMinMax.isWithin(pt.y))
            {
                xMinMax.expand(pt.x);
                yMinMax.expand(pt.y);

                pts.push(pt);
                srcPixelIdxs.push(c);
            }
        }

        // Taken out because we ended up with outliers... better to specify this above based on minerals visible
        /*
        // If the points reach past mineral locations, expand axis so it fits the points
        xAxisMinMax.expand(xMinMax.min);
        xAxisMinMax.expand(xMinMax.max);
        yAxisMinMax.expand(yMinMax.min);
        yAxisMinMax.expand(yMinMax.max);
*/
        // Bin them, wanting certain number of bins in x and y directions
        const xBinCount = 200;
        const yBinCount = 200;

        const xBinSize = 1 / (xBinCount-1);
        const yBinSize = 1 / (yBinCount-1);

        // Allocate each bin so we can find their counts
        let binCounts = new Array(xBinCount*yBinCount).fill(0);
        let binMemberInfo = new Array(xBinCount*yBinCount).fill(0); // -1 = selected, 0 = nothing, 1+ = visibleROIs idx+1 (so 1 == visibleROIs[0]) 
        let countMinMax = new MinMax(0, null);

        // JAVASCRIPT IS SO SHIT! No, I don't want to fill it with the SAME array reference... So I'll just
        // write ANOTHER for loop here. Thanks JS
        //let binSrcPixels = new Array(xBinCount*yBinCount).fill([]);
        let binSrcPixels: number[][] = [];
        for(let c = 0; c < binCounts.length; c++)
        {
            binSrcPixels.push([]);
        }

        let visibleROIs: RegionData[] = [];
        for(let roi of this._visibleROIs)
        {
            let region = this._widgetDataService.regions.get(roi);
            if(region)
            {
                visibleROIs.push(region);
            }
        }

        for(let c = 0; c < pts.length; c++)
        {
            let pt = pts[c];

            // Work out which bins they sit in
            let pctX = xMinMax.getAsPercentageOfRange(pt.x, false);
            let pctY = yMinMax.getAsPercentageOfRange(pt.y, false);

            let xPos = Math.floor(pctX / xBinSize);
            let yPos = Math.floor(pctY / yBinSize);

            let idx = yPos*xBinCount+xPos;
            binCounts[idx]++;
            countMinMax.expand(binCounts[idx]);

            // Remember if it's selected...
            if(currSelPixels.has(srcPixelIdxs[c]))
            {
                binMemberInfo[idx] = -1;
            }
            else if(binMemberInfo[idx] == 0)
            {
                // Check if it's in any of the ROIs. First one sticks
                let roiIdx = 1;
                for(let roi of visibleROIs)
                {
                    if(roi.pixelIndexes.has(srcPixelIdxs[c]))
                    {
                        binMemberInfo[idx] = roiIdx;
                        break;
                    }

                    roiIdx++;
                }
            }

            // Remember what pixels are part of this bin
            binSrcPixels[idx].push(srcPixelIdxs[c]);
        }

        let logCountMax = Math.log(countMinMax.max);

        let colourRamp = this._drawMonochrome ? ColourRamp.SHADE_MONO_GRAY : ColourRamp.SHADE_MAGMA;

        // Now run through the counts and generate points out of them
        let ratioPoints: RGBURatioPoint[] = [];
        for(let x = 0; x < xBinCount; x++)
        {
            for(let y = 0; y < yBinCount; y++)
            {
                let binIdx = y*xBinCount+x;

                let count = binCounts[binIdx];
                if(count > 0)
                {
                    // Convert x and y (which are in terms of bin coordinates eg: 0-bin count) back to
                    // the range we had our data in
                    let binPt = new Point(
                        xMinMax.min+(x/xBinCount)*xMinMax.getRange(),
                        yMinMax.min+(y/yBinCount)*yMinMax.getRange(),
                    );

                    // Prevents divide by 0 error when count === 1 and log of 1 is 0
                    let colourRampPct = 0;
                    if(count === logCountMax)
                    {
                        colourRampPct = 1;
                    }
                    else if(logCountMax > 0)
                    {
                        colourRampPct = Math.log(count) / logCountMax;
                    }

                    // By default, colour based on the colour ramp selected
                    let colour: RGBA = Colours.sampleColourRamp(colourRamp, colourRampPct);

                    // See if this is a member of an ROI

                    //Colours.sampleColourRamp(ColourRamp.SHADE_MAGMA, Math.log(count) / logCountMax);

                    // If nothing selected, we show these as opaque, but if we do have a selection, unselected points are transparent
                    if(currSelPixels.size > 0 && binMemberInfo[binIdx] < 0) // binMemberInfo[binIdx] == -1 means it's selected
                    {
                        // SELECTED points are drawn in blue if in monochrome mode
                        if(this._drawMonochrome)
                        {
                            colour = Colours.CONTEXT_BLUE;
                        }
                    }
                    else
                    {
                        // Unselected, is it a member of an ROI?
                        if(binMemberInfo[binIdx] > 0)
                        {
                            // Yes, colour it with ROI colour
                            colour = visibleROIs[binMemberInfo[binIdx]-1].colour;
                        }
                        else
                        {
                            // Unselected colours are dimmed if not in monochrome
                            if(!this._drawMonochrome && currSelPixels.size > 0)
                            {
                                colour = new RGBA(colour.r, colour.g, colour.b, colour.a*0.2);
                            }
                        }
                    }

                    ratioPoints.push(
                        new RGBURatioPoint(
                            binPt,
                            count,
                            colour,
                            binSrcPixels[binIdx]
                        )
                    );
                }
            }
        }

        const allMinerals = this.getMineralPointsForAxes(this._xAxisUnit, this._yAxisUnit);
        let shownMinerals: RGBUMineralPoint[] = [];

        for(let m of allMinerals)
        {
            if(this._mineralsShown.indexOf(m.name) >= 0)
            {
                shownMinerals.push(m);
            }
        }

        let result = new RGBUPlotData(
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

        return result;
    }

    private getMineralPointsForAxes(xAxisUnit: RGBUAxisUnit, yAxisUnit: RGBUAxisUnit): RGBUMineralPoint[]
    {
        // Build the list of minerals with appropriate coordinates (based on what our axes are configured for)
        let minerals: RGBUMineralPoint[] = [];
        for(let c = 0; c < RGBUMineralRatios.names.length; c++)
        {
            let xVal = RGBUMineralRatios.ratioValues[c][xAxisUnit.numeratorChannelIdx];
            if(xAxisUnit.denominatorChannelIdx > -1)
            {
                xVal /= RGBUMineralRatios.ratioValues[c][xAxisUnit.denominatorChannelIdx];
            }

            let yVal = RGBUMineralRatios.ratioValues[c][yAxisUnit.numeratorChannelIdx];
            if(yAxisUnit.denominatorChannelIdx > -1)
            {
                yVal /= RGBUMineralRatios.ratioValues[c][yAxisUnit.denominatorChannelIdx];
            }

            minerals.push(
                new RGBUMineralPoint(
                    new Point(xVal, yVal),
                    RGBUMineralRatios.names[c]
                )
            );
        }
        return minerals;
    }

    private getAxisMinMaxForMinerals(numeratorChannelIdx: number, denominatorChannelIdx: number): MinMax
    {
        let result = new MinMax();

        // Look up the value for each
        for(let mineralValues of RGBUMineralRatios.ratioValues)
        {
            let value = mineralValues[numeratorChannelIdx];
            if(denominatorChannelIdx >= 0)
            {
                value /= mineralValues[denominatorChannelIdx];
            }

            result.expand(value);
        }

        return result;
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
        // Effectively inverts selection, we read the current selection, invert it, and re-assign it as the selection
        let curSel = this._selectionService.getCurrentSelection();
        let currSelPixels = curSel.pixelSelection.selectedPixels;

        let allPixels = new Set<number>();
        for(let c = 0; c < this.model.raw.imgWidth*this.model.raw.imgHeight; c++)
        {
            allPixels.add(c);
        }

        let difference = new Set(
            [...allPixels].filter(x => !currSelPixels.has(x))
        );

        this._selectionService.setSelection(
            this._datasetService.datasetLoaded,
            null,
            new PixelSelection(
                this._datasetService.datasetLoaded,
                difference,
                this.model.raw.imgWidth,
                this.model.raw.imgHeight,
                curSel.pixelSelection.imageName
            )
        );
    }

    onSelectionClear(): void
    {
        this._selectionService.clearSelection();
    }

    onMinerals(event): void
    {
        const dialogConfig = new MatDialogConfig();
        //dialogConfig.backdropClass = 'empty-overlay-backdrop';

        let items: PickerDialogItem[] = [];
        items.push(new PickerDialogItem(null, "Minerals", null, true));

        for(let m of RGBUMineralRatios.names)
        {
            items.push(new PickerDialogItem(m, m, null, true));
        }

        dialogConfig.data = new PickerDialogData(true, true, true, false, items, this._mineralsShown, "", new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
            (mineralsShown: string[])=>
            {
                if(mineralsShown)
                {
                    this._mineralsShown = mineralsShown;

                    const reason = "mineral-choice";
                    this.saveState(reason);
                    this.prepareData(reason);
                }
            }
        );
    }

    onRegions(event): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
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

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        let exprId = [];
        if(axis == "X")
        {
            dialogConfig.data = new RGBUAxisUnit(this._xAxisUnit.numeratorChannelIdx, this._xAxisUnit.denominatorChannelIdx);
        }
        else if(axis == "Y")
        {
            dialogConfig.data = new RGBUAxisUnit(this._yAxisUnit.numeratorChannelIdx, this._yAxisUnit.denominatorChannelIdx);
        }
        else
        {
            console.error("Unknown axis for rgbu plot axis setting: "+axis);
            return;
        }

        const dialogRef = this.dialog.open(RGBUAxisRatioPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: RGBUAxisUnit)=>
            {
                if(result)
                {
                    let resultCopy = new RGBUAxisUnit(result.numeratorChannelIdx, result.denominatorChannelIdx);
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
        }
    }

    onChangeYAxis(event): void
    {
        this.selectedMinYValue = event.minValue;
        this.selectedMaxYValue = event.maxValue;
        if(event.finish) 
        {
            this.prepareData("scaling y axis");
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
            this.idxToChannel(this._yAxisUnit.numeratorChannelIdx),
            this.idxToChannel(this._yAxisUnit.denominatorChannelIdx),
            this.idxToChannel(this._xAxisUnit.numeratorChannelIdx),
            this.idxToChannel(this._xAxisUnit.denominatorChannelIdx),
            this._drawMonochrome
        );

        return toSave;
    }

    private channelToIdx(ch: string): number
    {
        let idx = RGBUImage.channels.indexOf(ch);
        if(idx < 0)
        {
            console.log("channelToIdx: invalid channel: "+ch);
            idx = 0;
        }
        return idx;
    }

    private idxToChannel(idx: number): string
    {
        if(idx < 0 || idx >= RGBUImage.channels.length)
        {
            console.log("idxToChannel: invalid index: "+idx);
            return RGBUImage.channels[0];
        }

        return RGBUImage.channels[idx];
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
