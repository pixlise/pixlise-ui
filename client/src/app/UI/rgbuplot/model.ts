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
import { RGBUMineralPoint, RGBUPlotData } from "./rgbu-data";
import { ChartAxisDrawer } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { Colours } from "src/app/utils/colours";


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
}
