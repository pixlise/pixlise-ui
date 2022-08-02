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

import { MinMax } from "src/app/models/BasicTypes";
import { Point, Rect } from "src/app/models/Geometry";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { CANVAS_FONT_SIZE_TITLE, HOVER_POINT_RADIUS, PLOT_POINTS_SIZE } from "src/app/utils/drawing";
import { BinaryPlotData } from "./binary-data";
import { ChartAxis, LinearChartAxis } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { ChartAxisDrawer } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { Colours } from "src/app/utils/colours";


export class BinaryDrawModel
{
    // Coordinates we draw the points at
    pointGroupCoords: Point[][] = [];
    totalPointCount: number = 0;

    // Axis & data labels:
    //
    // A (y axis)
    // ^
    // |
    // |
    // +--------> B (x axis)

    axisBorder: Rect = null;

    xAxis: ChartAxis = null;
    yAxis: ChartAxis = null;

    // Axis clickable areas (where user can pick different expression)
    xAxisLabelArea: Rect = new Rect(0, 0, 0, 0);
    yAxisLabelArea: Rect = new Rect(0, 0, 0, 0);

    xValueRange: MinMax = null;
    yValueRange: MinMax = null;

    // If a label is hovered over with the mouse, we set its name (A, B or C)
    hoverLabel: string = null;

    regenerate(raw: BinaryPlotData, canvasParams: CanvasParams, screenContext: CanvasRenderingContext2D): void
    {
        this.totalPointCount = 0;

        // The absolute outer border (outside of this is just padding)
        let outerBorder = new Rect(
            BinaryPlotModel.OUTER_PADDING,
            BinaryPlotModel.OUTER_PADDING,
            canvasParams.width-BinaryPlotModel.OUTER_PADDING*2,
            canvasParams.height-BinaryPlotModel.OUTER_PADDING*2
        );

        // Axis endpoint values - these should be round numbers larger than the max values we're drawing to. This way it's a little neater
        // to draw, has a bit of margin, and is probably easier for users to think about these numbers
        this.xValueRange = new MinMax(Math.floor(raw.xAxisData.valueRange.min), this.getAxisMax(raw.xAxisData.valueRange.max));
        this.yValueRange = new MinMax(Math.floor(raw.yAxisData.valueRange.min), this.getAxisMax(raw.yAxisData.valueRange.max*1.1)); // make it show a little more in Y due to selection and key buttons

        // Calculate the axis border (between outerBoarder and axisBorder we can draw axis labels)
        // Left side: leave padding, space for the vertical Y axis title, small-font sized space for hover label, padding, finally tick label width
        let leftAxisSpace = BinaryPlotModel.FONT_SIZE+BinaryPlotModel.FONT_SIZE_SMALL+BinaryPlotModel.LABEL_PADDING;
        let bottomAxisSpace = (BinaryPlotModel.LABEL_PADDING+BinaryPlotModel.FONT_SIZE)*2;

        this.axisBorder = new Rect(
            outerBorder.x+leftAxisSpace,
            outerBorder.y,
            outerBorder.w-leftAxisSpace,
            outerBorder.h-bottomAxisSpace
        );

        // We don't pan/zoom axis so just create a default one for now
        let panZoom = new PanZoom();

        // Setup both axes once
        this.initAxes(canvasParams, panZoom, outerBorder, leftAxisSpace, bottomAxisSpace);

        // All this for variable y-axis label widths!!
        // We need to find the max sized label in pixels
        let drawer = this.makeChartAxisDrawer();
        let longestYTickLabelPx = drawer.getLongestTickLabelPx(screenContext, this.yAxis);

        // Now we feed that back into BOTH xAxis and yAxis (recreating them is the easiest option for now)
        this.initAxes(canvasParams, panZoom, outerBorder, leftAxisSpace+longestYTickLabelPx, bottomAxisSpace);

        // Axis titles: allow clicking on almost anywhere in line with the label
        this.yAxisLabelArea = new Rect(outerBorder.x, outerBorder.y, BinaryPlotModel.FONT_SIZE, outerBorder.h-bottomAxisSpace);
        this.xAxisLabelArea = new Rect(outerBorder.x+leftAxisSpace, outerBorder.maxY()-BinaryPlotModel.FONT_SIZE+2, outerBorder.w-leftAxisSpace, BinaryPlotModel.FONT_SIZE);

        // Calculate data coordinates
        // Loop through and calculate x/y coordinates for each point
        this.pointGroupCoords = [];

        for(let c = 0; c < raw.xAxisData.pointGroups.length; c++)
        {
            let coords: Point[] = [];

            for(let i = 0; i < raw.xAxisData.pointGroups[c].values.length; i++)
            {
                coords.push(
                    new Point(
                        this.xAxis.valueToCanvas(raw.xAxisData.pointGroups[c].values[i].value),
                        this.yAxis.valueToCanvas(raw.yAxisData.pointGroups[c].values[i].value),
                    )
                );
            }

            this.pointGroupCoords.push(coords);
            this.totalPointCount += coords.length;
        }
    }

    private initAxes(canvasParams: CanvasParams, transform: PanZoom, outerBorder: Rect, leftAxisSpace: number, bottomAxisSpace: number): void
    {
        // The data has to be drawn a bit in from the axis border due to point size
        let dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS)+1;

        // Setup x-axis:
        let xAxis = new LinearChartAxis(true, outerBorder.x+leftAxisSpace, canvasParams.width-leftAxisSpace-dataPadding-dataPadding, this.xValueRange.min, this.xValueRange.max, dataPadding);
        xAxis.setMinPixelsBetweenTicks(30);
        this.xAxis = xAxis;
        this.xAxis.updateAxis(canvasParams, transform);

        // Setup y-axis:
        let yAxis = new LinearChartAxis(false, outerBorder.y+bottomAxisSpace, canvasParams.height-bottomAxisSpace-dataPadding-dataPadding, this.yValueRange.min, this.yValueRange.max, dataPadding);
        yAxis.setMinPixelsBetweenTicks(30);
        this.yAxis = yAxis;
        this.yAxis.updateAxis(canvasParams, transform);
    }

    private getAxisMax(value: number): number
    {
        if(value > 1 || value <= 0)
        {
            return Math.ceil(value);
        }

        // Below 1, we need to find a nearest round decimal place value
        let decCount = -Math.log10(value);
        let mul = Math.pow(10, decCount);
        return Math.ceil(value*mul)/mul;
    }

    makeChartAxisDrawer(): ChartAxisDrawer
    {
        return new ChartAxisDrawer(BinaryPlotModel.FONT_SIZE_SMALL+"px Roboto", Colours.GRAY_70.asString(), Colours.GRAY_30.asString(), 4, 4, false);
    }
}

export class BinaryPlotModel
{
    // Some commonly used constants
    public static readonly OUTER_PADDING = 6;
    public static readonly LABEL_PADDING = 4;
    public static readonly FONT_SIZE = CANVAS_FONT_SIZE_TITLE;
    public static readonly FONT_SIZE_SMALL = CANVAS_FONT_SIZE_TITLE-4;

    // The raw data we start with
    private _raw: BinaryPlotData = null;

    // The drawable data (derived from the above)
    private _drawData: BinaryDrawModel = null;

    hoverPoint: Point = null;
    hoverPointData: Point = null;

    cursorShown: string = CursorId.defaultPointer;
    mouseLassoPoints: Point[] = null;
    showMmol: boolean = false;
    selectModeExcludeROI: boolean = false;

    set raw(r: BinaryPlotData)
    {
        this._raw = r;
    }

    get raw(): BinaryPlotData
    {
        return this._raw;
    }

    get drawData(): BinaryDrawModel
    {
        return this._drawData;
    }

    recalcDisplayData(canvasParams: CanvasParams, screenContext: CanvasRenderingContext2D): boolean
    {
        if(!this._raw)
        {
            return false;
        }

        this._drawData = new BinaryDrawModel();
        this._drawData.regenerate(this._raw, canvasParams, screenContext);

        return true;
    }
}
