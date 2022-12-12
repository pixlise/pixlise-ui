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

import { Point, Rect } from "src/app/models/Geometry";
import { ChartAxis, LinearChartAxis } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { HOVER_POINT_RADIUS, PLOT_POINTS_SIZE } from "src/app/utils/drawing";
import { RGBUAxisUnit, RGBUMineralPoint, RGBUMineralRatios, RGBUPlotData, RGBURatioPoint, ROICount } from "./rgbu-data";
import { ChartAxisDrawer } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { ColourRamp, Colours, RGBA } from "src/app/utils/colours";
import { MinMax } from "src/app/models/BasicTypes";
import { FloatImage, RGBUImage } from "src/app/models/RGBUImage";
import { SelectionService } from "src/app/services/selection.service";
import { DataSet } from "src/app/models/DataSet";
import { PixelSelection } from "src/app/models/PixelSelection";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "../atoms/picker-dialog/picker-dialog.component";
import { ElementRef } from "@angular/core";
import { RegionData, WidgetRegionDataService } from "src/app/services/widget-region-data.service";


const xMargin = 40;
const yMargin = 40;
const outerPadding = 2;

export class RGBUPlotDrawModel
{
    // Coordinates we draw the points at
    points: Point[] = [];
    colours: string[] = [];

    pointWidth: number = 0;
    pointHeight: number = 0;

    xAxisUnitLabel: string = "";
    yAxisUnitLabel: string = "";

    minerals: RGBUMineralPoint[];
    mineralHoverIdx: number = -1;

    // Axis & data labels:
    //
    // A (y axis)
    // ^
    // |
    // |
    // +--------> B (x axis)

    outerBorder: Rect = null;
    axisBorder: Rect = null;
    dataArea: Rect = null;

    xAxisLabelArea: Rect = new Rect(0, 0, 0, 0);
    yAxisLabelArea: Rect = new Rect(0, 0, 0, 0);

    hoverLabel: string = null;

    regenerate(raw: RGBUPlotData, canvasParams: CanvasParams, xAxis: LinearChartAxis, yAxis: LinearChartAxis): void
    {
        // The absolute outer border (outside of this is just padding)
        this.outerBorder = new Rect(
            outerPadding,
            outerPadding,
            canvasParams.width-outerPadding*2,
            canvasParams.height-outerPadding*2
        );

        this.axisBorder = new Rect(
            this.outerBorder.x+xMargin,
            this.outerBorder.y,
            this.outerBorder.w-xMargin,
            this.outerBorder.h-yMargin
        );

        // The data has to be drawn a bit in from the axis border due to point size
        let dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS)+1;
        this.dataArea = this.axisBorder.copy();
        this.dataArea.inflate(-dataPadding, -dataPadding);

        // Work out the size of rects for each point
        this.pointWidth = raw.pointWidth*canvasParams.width;
        this.pointHeight = raw.pointHeight*canvasParams.height;

        // Calculate coordinates to draw
        this.points = [];
        this.colours = [];
        this.minerals = [];
        if(raw.errorMsg.length <= 0 && raw.points && raw.points.length > 0)
        {
            for(let pt of raw.points)
            {
                this.points.push(
                    new Point(
                        xAxis.valueToCanvas(pt.ratioPt.x),
                        yAxis.valueToCanvas(pt.ratioPt.y)-this.pointHeight // Move so box is above axis
                    )
                );

                this.colours.push(pt.colour.asString());
            }

            // Do the minerals too
            for(let m of raw.minerals)
            {
                this.minerals.push(
                    new RGBUMineralPoint(
                        new Point(
                            xAxis.valueToCanvas(m.ratioPt.x),
                            yAxis.valueToCanvas(m.ratioPt.y)
                        ),
                        m.name
                    )
                );
            }
        }

        const axisClickAreaSize = 20;
        if(raw.xAxisUnit)
        {
            this.xAxisUnitLabel = raw.xAxisUnit.label;
            const leftAxisSpace = yMargin;
            this.xAxisLabelArea = new Rect(this.outerBorder.x+leftAxisSpace, this.outerBorder.maxY()-axisClickAreaSize, this.outerBorder.w-leftAxisSpace, axisClickAreaSize);
        }
        if(raw.yAxisUnit)
        {
            this.yAxisUnitLabel = raw.yAxisUnit.label;
            const bottomAxisSpace = xMargin;
            this.yAxisLabelArea = new Rect(this.outerBorder.x, this.outerBorder.y, axisClickAreaSize, this.outerBorder.h-bottomAxisSpace);
        }
    }
}

export class RGBUPlotModel
{
    public static readonly TITLE_FONT_SIZE = 14;
    public static readonly FONT_SIZE = 12;

    public static readonly SELECT_ADD = "add";
    public static readonly SELECT_SUBTRACT = "subtract";
    public static readonly SELECT_RESET = "reset";

    cursorShown: string = CursorId.defaultPointer;
    mouseLassoPoints: Point[] = null;
    selectionMode: string = RGBUPlotModel.SELECT_RESET;

    private _xAxis: LinearChartAxis = null;
    private _yAxis: LinearChartAxis = null;

    // The raw data we start with
    private _raw: RGBUPlotData = null;

    // The drawable data (derived from the above)
    private _drawData: RGBUPlotDrawModel = null;

    set raw(r: RGBUPlotData)
    {
        this._raw = r;
    }

    get raw(): RGBUPlotData
    {
        return this._raw;
    }

    get drawData(): RGBUPlotDrawModel
    {
        return this._drawData;
    }

    get xAxis(): ChartAxis
    {
        return this._xAxis;
    }

    get yAxis(): ChartAxis
    {
        return this._yAxis;
    }

    recalcDisplayData(canvasParams: CanvasParams, screenContext: CanvasRenderingContext2D): boolean
    {
        if(!this._raw)
        {
            return false;
        }

        // We don't pan/zoom
        let panZoom = new PanZoom();

        this.initAxes(canvasParams, panZoom, 0);

        // All this for variable y-axis label widths!!
        // We need to find the max sized label in pixels
        let drawer = this.makeChartAxisDrawer();
        let longestYTickLabelPx = drawer.getLongestTickLabelPx(screenContext, this.yAxis);

        // Now we feed that back into BOTH xAxis and yAxis (recreating them is the easiest option for now)
        this.initAxes(canvasParams, panZoom, longestYTickLabelPx);

        this._drawData = new RGBUPlotDrawModel();
        this._drawData.regenerate(this._raw, canvasParams, this._xAxis, this._yAxis);

        return true;
    }

    private initAxes(canvasParams: CanvasParams, transform: PanZoom, leftAxisLabelWidthPx: number): void
    {
        // The data has to be drawn a bit in from the axis border due to point size
        let dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS)+1;

        // Setup x-axis:
        let xAxis = new LinearChartAxis(true, xMargin+leftAxisLabelWidthPx, canvasParams.width-xMargin-leftAxisLabelWidthPx-dataPadding-dataPadding, this._raw.xRange.min, this._raw.xRange.max, dataPadding);
        xAxis.setMinPixelsBetweenTicks(30);
        this._xAxis = xAxis;
        this._xAxis.updateAxis(canvasParams, transform);

        // Setup y-axis:
        let yAxis = new LinearChartAxis(false, yMargin, canvasParams.height-yMargin-dataPadding-dataPadding, this._raw.yRange.min, this._raw.yRange.max, dataPadding);
        yAxis.setMinPixelsBetweenTicks(25);
        this._yAxis = yAxis;
        this._yAxis.updateAxis(canvasParams, transform);
    }

    makeChartAxisDrawer(): ChartAxisDrawer
    {
        return new ChartAxisDrawer(RGBUPlotModel.FONT_SIZE+"px Roboto", Colours.GRAY_80.asString(), Colours.GRAY_30.asString(), 4, 4, false);
    }

    excludeSelection(selectionService: SelectionService, dataset: DataSet): void
    {
        // Effectively inverts selection, we read the current selection, invert it, and re-assign it as the selection
        let curSel = selectionService.getCurrentSelection();
        let currSelPixels = curSel.pixelSelection.selectedPixels;

        let allPixels = new Set<number>();
        for(let c = 0; c < this.raw.imgWidth*this.raw.imgHeight; c++)
        {
            allPixels.add(c);
        }

        let difference = new Set(
            [...allPixels].filter(x => !currSelPixels.has(x))
        );

        selectionService.setSelection(
            dataset,
            null,
            new PixelSelection(
                dataset,
                difference,
                this.raw.imgWidth,
                this.raw.imgHeight,
                curSel.pixelSelection.imageName
            )
        );
    }

    generatePoints(rgbu: RGBUImage, cropSelection: PixelSelection, xAxisUnit: RGBUAxisUnit, yAxisUnit: RGBUAxisUnit, selectedXRange?: MinMax, selectedYRange?: MinMax): [Point[], number[], MinMax, MinMax, MinMax, MinMax, MinMax, MinMax]
    {
        let channels = [rgbu.r, rgbu.g, rgbu.b, rgbu.u];
        const pixels = rgbu.r.width*rgbu.r.height;

        // Work out the min/max of mineral locations
        let xAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(xAxisUnit.numeratorChannelIdx, xAxisUnit.denominatorChannelIdx);
        let yAxisMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(yAxisUnit.numeratorChannelIdx, yAxisUnit.denominatorChannelIdx);

        let xAxisRawMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(xAxisUnit.numeratorChannelIdx, xAxisUnit.denominatorChannelIdx);;
        let yAxisRawMinMax = RGBUPlotModel.getAxisMinMaxForMinerals(yAxisUnit.numeratorChannelIdx, yAxisUnit.denominatorChannelIdx);

        if(selectedXRange) 
        {
            xAxisMinMax = selectedXRange;
        }
        if(selectedYRange) 
        {
            yAxisMinMax = selectedYRange;
        }

        let pts: Point[] = [];
        let xMinMax = new MinMax();
        let yMinMax = new MinMax();

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
                RGBUPlotModel.getRatioValue(channels, xAxisUnit.numeratorChannelIdx, xAxisUnit.denominatorChannelIdx, c),
                RGBUPlotModel.getRatioValue(channels, yAxisUnit.numeratorChannelIdx, yAxisUnit.denominatorChannelIdx, c)
            );

            if(isFinite(pt.x) && isFinite(pt.y) && xAxisMinMax.isWithin(pt.x) && yAxisMinMax.isWithin(pt.y))
            {
                xMinMax.expand(pt.x);
                yMinMax.expand(pt.y);

                pts.push(pt);
                srcPixelIdxs.push(c);
            }

            xAxisRawMinMax.expand(pt.x);
            yAxisRawMinMax.expand(pt.y);
        }

        return [pts, srcPixelIdxs, xMinMax, yMinMax, xAxisMinMax, yAxisMinMax, xAxisRawMinMax, yAxisRawMinMax];
    }

    minimizeRGBUData(
        xBinCount: number,
        yBinCount: number,
        visibleROINamess: string[],
        pts: Point[],
        xMinMax: MinMax,
        yMinMax: MinMax,
        currSelPixels: Set<number>,
        srcPixelIdxs: number[],
        widgetDataService: WidgetRegionDataService
    ): [
        MinMax,
        Array<number>,
        Record<number, {selected: boolean; rois: number[];}>,
        RegionData[],
        number[][]
    ]
    {
        const xBinSize = 1 / (xBinCount-1);
        const yBinSize = 1 / (yBinCount-1);

        // Allocate each bin so we can find their counts
        let binCounts = new Array(xBinCount*yBinCount).fill(0);
        let binMemberInfo: Record<number, {selected: boolean; rois: number[];}> = {};
        let countMinMax = new MinMax(0, null);

        let binSrcPixels: number[][] = Array.from({ length: xBinCount*yBinCount }, () => []);

        let visibleROIs: RegionData[] = visibleROINamess.filter((roi) => widgetDataService.regions.get(roi)).map((roi) => widgetDataService.regions.get(roi));

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

            let currentPixelGroups = {
                selected: currSelPixels.has(srcPixelIdxs[c]), 
                rois: visibleROIs.map((roi, i) => roi.pixelIndexes.has(srcPixelIdxs[c]) ? i : -1).filter(roiIdx => roiIdx >= 0)
            };

            // Remember if it's selected...
            if(binMemberInfo[idx]) 
            {
                binMemberInfo[idx].selected = binMemberInfo[idx].selected || currentPixelGroups.selected;
                binMemberInfo[idx].rois = Array.from(new Set([...binMemberInfo[idx].rois, ...currentPixelGroups.rois]));
            }
            else 
            {
                binMemberInfo[idx] = currentPixelGroups;
            }

            // Remember what pixels are part of this bin
            binSrcPixels[idx].push(srcPixelIdxs[c]);
        }

        return [countMinMax, binCounts, binMemberInfo, visibleROIs, binSrcPixels];
    }

    generateRGBURatioPoints(
        xBinCount: number,
        yBinCount: number,
        binCounts: number[],
        xMinMax: MinMax,
        yMinMax: MinMax,
        logCountMax: number,
        drawMonochrome: boolean, 
        binMemberInfo: Record<number, {selected: boolean; rois: number[];}>,
        visibleROIs: RegionData[],
        currSelPixels: Set<number>,
        binSrcPixels: number[][],
        useFirstROIColour: boolean = false,
        stackedROIs = false
    ): [RGBURatioPoint[], Record<string, RGBA>]
    {
        let colourRamp = drawMonochrome ? ColourRamp.SHADE_MONO_SOLID_GRAY : ColourRamp.SHADE_MAGMA;

        let ratioPoints: RGBURatioPoint[] = [];
        let colourKey: Record<string, RGBA> = {};
        
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
                    let roiCount: ROICount[] = null;
                    let combinedCount: number = count;

                    let activePixelROIs = binMemberInfo[binIdx].rois;

                    // If nothing selected, we show these as opaque, but if we do have a selection, unselected points are transparent
                    if(currSelPixels.size > 0 && binMemberInfo[binIdx] && binMemberInfo[binIdx].selected) // binMemberInfo[binIdx] == -1 means it's selected
                    {
                        // SELECTED points are drawn in blue if in monochrome mode
                        if(drawMonochrome)
                        {
                            colour = Colours.CONTEXT_BLUE;
                        }

                        if(stackedROIs && binMemberInfo[binIdx].rois.length > 0)
                        {
                            roiCount = activePixelROIs.map((roi) => ({ roi: visibleROIs[roi].name, count, colour: colour.asString() }));
                            combinedCount = count * activePixelROIs.length;
                        }
                    }
                    else
                    {
                        // If were generating data for a stacked bar chart, get counts per ROI
                        if(stackedROIs && binMemberInfo[binIdx].rois.length > 0)
                        {
                            colour = visibleROIs[activePixelROIs[0]].colour;
                            roiCount = activePixelROIs.map((roi) => 
                            {
                                let currentColour = visibleROIs[roi].colour;
                                currentColour = new RGBA(currentColour.r, currentColour.g, currentColour.b, 255);
                                return {
                                    roi: visibleROIs[roi].name,
                                    count,
                                    colour: currentColour.asString()
                                };
                            });
                            combinedCount = count * activePixelROIs.length;
                        }
                        // If we don't care about overlapping ROIs, use first colour
                        else if(useFirstROIColour && binMemberInfo[binIdx].rois.length > 0)
                        {
                            colour = visibleROIs[activePixelROIs[0]].colour;
                        }
                        // Unselected, is it a member of an ROI?
                        else if(binMemberInfo[binIdx] && binMemberInfo[binIdx].rois.length > 0)
                        {
                            let activeColourKey = activePixelROIs.map((roi) => visibleROIs[roi].name).sort().join(", ");

                            if(colourKey[activeColourKey]) 
                            {
                                colour = colourKey[activeColourKey];
                            }
                            else 
                            {
                                let averageColour = activePixelROIs.reduce((prev, curr, i) => 
                                {
                                    let currentColour = visibleROIs[activePixelROIs[i]].colour;
                                    if(prev.r === -1) 
                                    {
                                        return {r: currentColour.r, g: currentColour.g, b: currentColour.b};
                                    }
                                    else 
                                    {
                                        return {
                                            r: (prev.r + currentColour.r) / 2,
                                            g: (prev.g + currentColour.g) / 2,
                                            b: (prev.b + currentColour.b) / 2,
                                        };
                                    }
                                }, {r: -1, g: -1, b: -1});
                            
                                colour = new RGBA(averageColour.r, averageColour.g, averageColour.b, 255);
                                colourKey[activeColourKey] = colour;
                            }
                        }
                        else
                        {
                            // Unselected colours are dimmed if not in monochrome
                            if(!drawMonochrome && currSelPixels.size > 0)
                            {
                                colour = new RGBA(colour.r, colour.g, colour.b, colour.a*0.2);
                            }
                        }
                    }

                    ratioPoints.push(
                        new RGBURatioPoint(
                            binPt,
                            count,
                            combinedCount,
                            colour,
                            binSrcPixels[binIdx],
                            roiCount
                        )
                    );
                }
            }
        }

        return [ratioPoints, colourKey];
    }

    static getRatioValue(channel: FloatImage[], numeratorChannel: number, denominatorChannel: number, pixelIdx: number): number
    {
        // Verify channels are valid, if not return -1 so these values can be filtered out
        if(!channel || !channel[numeratorChannel] || !channel[denominatorChannel]) 
        {
            return -1;
        }

        let numeratorValue = channel[numeratorChannel]?.values[pixelIdx];
        let denominatorValue = channel[denominatorChannel]?.values[pixelIdx];

        // Numerator can be any number, denominator must be a non-zero number
        if(typeof numeratorValue === "number" && denominatorValue) 
        {
            return numeratorValue / denominatorValue;
        }
        else 
        {
            return -1;
        }
    }

    static selectMinerals(dialog: MatDialog, mineralsShown: string[], callback: (minerals: string[]) => void): void
    {
        const dialogConfig = new MatDialogConfig();

        let items: PickerDialogItem[] = [];
        items.push(new PickerDialogItem(null, "Minerals", null, true));

        for(let m of RGBUMineralRatios.names)
        {
            items.push(new PickerDialogItem(m, m, null, true));
        }

        dialogConfig.data = new PickerDialogData(true, true, true, false, items, mineralsShown, "", new ElementRef(event.currentTarget));

        const dialogRef = dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(callback);
    }

    static getMineralPointsForAxes(xAxisUnit: RGBUAxisUnit, yAxisUnit: RGBUAxisUnit): RGBUMineralPoint[]
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

    static getAxisMinMaxForMinerals(numeratorChannelIdx: number, denominatorChannelIdx: number): MinMax
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

    static channelToIdx(ch: string): number
    {
        let idx = RGBUImage.channels.indexOf(ch);
        if(idx < 0)
        {
            console.log("channelToIdx: invalid channel: "+ch);
            idx = 0;
        }
        return idx;
    }

    static idxToChannel(idx: number): string
    {
        if(idx < 0 || idx >= RGBUImage.channels.length)
        {
            console.log("idxToChannel: invalid index: "+idx);
            return RGBUImage.channels[0];
        }

        return RGBUImage.channels[idx];
    }

}
