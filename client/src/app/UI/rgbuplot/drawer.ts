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

import { Rect } from "src/app/models/Geometry";
import { CanvasDrawer, CanvasDrawParameters, CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { drawFilledCircle, drawTextWithBackground, OutlineDrawer, OUTLINE_LINE_WIDTH } from "src/app/utils/drawing";
import { RGBUPlotDrawModel, RGBUPlotModel } from "./model";
import { RGBUMineralPoint } from "./rgbu-data";


export class RGBUPlotDrawer implements CanvasDrawer
{
    protected _mdl: RGBUPlotModel;
    protected _lastCalcCanvasParams: CanvasParams;

    constructor(mdl: RGBUPlotModel)
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
            if(!this._mdl.recalcDisplayData(drawParams.drawViewport, screenContext))
            {
                return;
            }

            this._lastCalcCanvasParams = drawParams.drawViewport;
        }

        let clrLasso = Colours.WHITE;

        screenContext.save();

        screenContext.fillStyle = Colours.GRAY_90.asString();

        // Draw axes
        let axisDrawer = this._mdl.makeChartAxisDrawer();
        axisDrawer.drawAxes(screenContext, drawParams.drawViewport, this._mdl.xAxis, "", this._mdl.yAxis, "");

        // Draw data
        this.drawData(screenContext, this._mdl.drawData);

        // On top of everything, draw the mineral points
        this.drawMinerals(screenContext, this._mdl.drawData);

        // And lasso if any
        if(this._mdl.mouseLassoPoints)
        {
            let drawer = new OutlineDrawer(screenContext, OUTLINE_LINE_WIDTH, clrLasso);
            drawer.drawOutline(this._mdl.mouseLassoPoints);
        }

        screenContext.restore();
    }

    private drawData(screenContext: CanvasRenderingContext2D, drawData: RGBUPlotDrawModel): void
    {
        // We draw the points as little rectangles at the specified coordinates
        for(let c = 0; c < drawData.points.length; c++)
        {
            screenContext.fillStyle = /*Colours.GRAY_30.asString();*/drawData.colours[c];
            screenContext.fillRect(drawData.points[c].x, drawData.points[c].y, drawData.pointWidth, drawData.pointHeight);
        }
    }

    private drawMinerals(screenContext: CanvasRenderingContext2D, drawData: RGBUPlotDrawModel): void
    {
        screenContext.textBaseline = "top";
        screenContext.textAlign = "left";

        // If we are hovered over a mineral, show ALL mineral labels, with the one hovered being last
        let isAnyHovered = drawData.mineralHoverIdx >= 0;

        for(let c = 0; c < drawData.minerals.length; c++)
        {
            if(drawData.mineralHoverIdx == c)
            {
                // Draw the hovered one last
                continue;
            }

            this.drawMineral(screenContext, drawData.minerals[c], false, isAnyHovered, drawData.dataArea);            
        }

        if(isAnyHovered)
        {
            this.drawMineral(screenContext, drawData.minerals[drawData.mineralHoverIdx], true, isAnyHovered, drawData.dataArea);
        }
    }

    private drawMineral(screenContext: CanvasRenderingContext2D, m: RGBUMineralPoint, isHovered: boolean, drawLabel: boolean, drawArea: Rect)
    {
        screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
        drawFilledCircle(screenContext, m.ratioPt, isHovered ? 4 : 2);

        if(drawLabel)
        {
            const textOffset = 4;
            const padding = 3;

            let backgroundColour = isHovered ? Colours.GRAY_80.asStringWithA(0.9) : Colours.GRAY_80.asStringWithA(0.5);
            let textColour = isHovered ? Colours.CONTEXT_PURPLE.asString() : Colours.GRAY_10.asString();

            drawTextWithBackground(
                screenContext,
                m.name,
                m.ratioPt.x+textOffset,
                m.ratioPt.y-RGBUPlotModel.FONT_SIZE-padding-padding,
                RGBUPlotModel.FONT_SIZE,
                padding,
                backgroundColour,
                textColour,
                drawArea
            );
        }
    }
}