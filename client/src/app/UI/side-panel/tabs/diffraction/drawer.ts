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

import { ChartAxisDrawer } from "src/app/UI/atoms/interactive-canvas/chart-axis";
import { CanvasDrawer, CanvasDrawParameters, CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { DiffractionHistogramModel } from "./model";



export class HistogramDrawer implements CanvasDrawer
{
    protected _mdl: DiffractionHistogramModel;

    constructor(mdl: DiffractionHistogramModel)
    {
        this._mdl = mdl;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        this._mdl.recalcDisplayData(drawParams.drawViewport);

        if(!this._mdl.xAxis || !this._mdl.yAxis)
        {
            return;
        }

        this.drawHistogram(screenContext, drawParams.drawViewport);
    }

    private drawHistogram(screenContext: CanvasRenderingContext2D, viewport: CanvasParams): void
    {
        let axisDrawer = new ChartAxisDrawer();
        axisDrawer.drawAxes(screenContext, viewport, this._mdl.xAxis, "keV", this._mdl.yAxis, "Counts");

        // Don't allow drawing over the axis now
        screenContext.save();
        screenContext.beginPath();
        screenContext.rect(this._mdl.xAxis.startPx, 0, this._mdl.xAxis.endPx, viewport.height-this._mdl.yAxis.startPx);
        screenContext.clip();

        for(let c = 0; c < this._mdl.drawData.bars.length; c++)
        {
            const bar = this._mdl.drawData.bars[c];
            let colour = bar.bar.colourRGB;
            if(!colour)
            {
                continue;
            }

            // If it's hovered...
            if(this._mdl.hoverBarIdx == c)
            {
                colour = Colours.GRAY_50;
            }
            else if(this._mdl.selectionOwner.iskeVRangeSelected(bar.bar.keV))
            {
                colour = Colours.YELLOW;
            }

            // Draw the actual bar
            if(bar.rect.h != 0)
            {
                screenContext.fillStyle = colour.asString();
                screenContext.fillRect(bar.rect.x, bar.rect.y, bar.rect.w, bar.rect.h);
            }
        }
        screenContext.restore();

        // Draw any hover info on top of it
        if(this._mdl.hoverBarIdx >= 0)
        {
            const hoverBar = this._mdl.drawData.bars[this._mdl.hoverBarIdx];

            let drawLeft = this._mdl.hoverPoint.x > viewport.width/2;
            let offsetX = drawLeft ? -5 : 5;

            let title = ""+hoverBar.bar.value.toLocaleString()+" peaks @ "+hoverBar.bar.keV+" keV";

            screenContext.fillStyle = Colours.GRAY_30.asString();
            screenContext.textAlign = "left";
            screenContext.textBaseline = "middle";
            screenContext.fillText(title, this._mdl.xAxis.startPx, 20);
            /*            drawToolTip(
                screenContext,
                new Point(this._mdl.hoverPoint.x+offsetX, this._mdl.hoverPoint.y),
                drawLeft,
                title,
                '',
                CANVAS_FONT_SIZE
            );
*/
        }

        if(this._mdl.raw.error)
        {
            screenContext.fillStyle = Colours.GRAY_30.asString();
            screenContext.textAlign = "center";
            screenContext.textBaseline = "middle";

            screenContext.fillText(this._mdl.raw.error, viewport.width/2, viewport.height/2);
        }
    }
}