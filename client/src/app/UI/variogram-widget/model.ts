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
import { niceNum } from "src/app/utils/utils";
import { VariogramData } from "./vario-data";


// Recalc the scales
const xMargin = 60;
const yMargin = 30;
const outerPadding = 6;

export class VariogramDrawModel
{
    // Coordinates we draw the points at
    points: Point[][] = [];

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

    regenerate(raw: VariogramData, canvasParams: CanvasParams, xAxis: LinearChartAxis, yAxis: LinearChartAxis): void
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

        // Calculate coordinates to draw
        this.points = [];
        if(raw.errorMsg.length <= 0 && raw.pointGroups && raw.pointGroups.length > 0)
        {
            for(let ptGroup of raw.pointGroups)
            {
                let pointsToSave: Point[] = [];
                for(let pt of ptGroup.points)
                {
                    if(pt.meanValue != null)
                    {
                        pointsToSave.push(
                            new Point(xAxis.valueToCanvas(pt.distance), yAxis.valueToCanvas(pt.meanValue))
                        );
                    }
                }
                this.points.push(pointsToSave);
            }
        }
    }
}

export class VariogramModel
{
    public static readonly varioModelExponential = "exponential";
    public static readonly varioModelSpherical = "spherical";
    public static readonly varioModelGaussian = "gaussian";

    public static readonly TITLE_FONT_SIZE = 14;
    public static readonly FONT_SIZE = 12;

    cursorShown: string = CursorId.defaultPointer;

    varioModel: string = VariogramModel.varioModelExponential;
    maxDistance: number = 0;
    binCount: number = 1;

    private _xAxis: ChartAxis = null;
    private _yAxis: ChartAxis = null;

    // The raw data we start with
    private _raw: VariogramData = null;

    // The drawable data (derived from the above)
    private _drawData: VariogramDrawModel = null;

    set raw(r: VariogramData)
    {
        this._raw = r;
    }

    get raw(): VariogramData
    {
        return this._raw;
    }

    get drawData(): VariogramDrawModel
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

    recalcDisplayData(canvasParams: CanvasParams): boolean
    {
        if(!this._raw)
        {
            return false;
        }

        // Min/max y values, these are clamped to 0, and slightly over max, so we have nice line Y values
        const minY = this._raw.valueRange.min < 0 ? niceNum(this._raw.valueRange.min*1.1) : 0;
        let maxY = this._raw.valueRange.max > 0 ? niceNum(this._raw.valueRange.max*1.1) : 0;

        const maxX = Math.ceil(this.maxDistance*1.1);
        if(maxX < 0 || maxY < minY)
        {
            console.error("Invalid axis range values for variogram");
            return false;
        }

        let xAxis = new LinearChartAxis(true, xMargin, canvasParams.width-xMargin, 0, maxX);
        let yAxis = new LinearChartAxis(false, yMargin, canvasParams.height-yMargin, minY, maxY);

        this._xAxis = xAxis;
        this._yAxis = yAxis;

        // We don't pan/zoom
        let panZoom = new PanZoom();
        this._xAxis.updateAxis(canvasParams, panZoom);
        this._yAxis.updateAxis(canvasParams, panZoom);

        this._drawData = new VariogramDrawModel();
        this._drawData.regenerate(this._raw, canvasParams, xAxis, yAxis);

        return true;
    }
}
