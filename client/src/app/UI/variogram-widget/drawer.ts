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

import { Point } from "src/app/models/Geometry";
import { ChartAxisDrawer } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { CanvasDrawer, CanvasDrawParameters, CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE, PLOT_POINTS_SIZE, PointDrawer } from "src/app/utils/drawing";
import { VariogramModel } from "./model";


export class VariogramDrawer implements CanvasDrawer
{
    protected _mdl: VariogramModel;
    protected _lastCalcCanvasParams: CanvasParams;

    constructor(mdl: VariogramModel)
    {
        this._mdl = mdl;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // TODO: clean this up, bit ugly
        if(!this._mdl.drawData || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(drawParams.drawViewport))
        {
            if(!this._mdl.recalcDisplayData(drawParams.drawViewport))
            {
                return;
            }

            this._lastCalcCanvasParams = drawParams.drawViewport;
        }

        screenContext.save();

        // Draw axes
        let axisDrawer = new ChartAxisDrawer(ChartAxisDrawer.AxisLabelFontSize+"px Roboto", Colours.GRAY_80.asString(), Colours.GRAY_10.asString(), 4, 4, false);
        axisDrawer.drawAxes(screenContext, drawParams.drawViewport, this._mdl.xAxis, "(h)mm", this._mdl.yAxis, "variance");

        // Draw data
        this.drawData(screenContext, this._mdl);

        // Draw title
        if(this._mdl.raw.title)
        {
            this.drawTitle(screenContext, this._mdl.raw.title);
        }

        screenContext.restore();
    }

    private drawTitle(screenContext: CanvasRenderingContext2D, title: string): void
    {
        const titlePadding = 20;
        const titlePos = new Point(this._mdl.xAxis.startPx+titlePadding, titlePadding);

        screenContext.font = "bold "+CANVAS_FONT_SIZE_TITLE+"px Roboto";
        screenContext.fillStyle = Colours.GRAY_10.asString();
        screenContext.textAlign = "left";

        screenContext.fillText(title, titlePos.x, titlePos.y);
    }

    private drawData(screenContext: CanvasRenderingContext2D, mdl: VariogramModel): void
    {
        //let alpha = PointDrawer.getOpacity(drawData.points.length);
        let idx = 0;
        for(let ptGroup of mdl.drawData.points)
        {
            let drawer = new PointDrawer(screenContext, /*PLOT_POINTS_AS_CIRCLES,*/ PLOT_POINTS_SIZE, mdl.raw.pointGroups[idx].colour, null);
            drawer.drawPoints(ptGroup, 1);
            idx++;
        }
    }
}