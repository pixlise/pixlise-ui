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
import { CanvasDrawParameters, CanvasInteractionResult, CanvasMouseEvent, CanvasMouseEventId } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { ISpectrumChartModel } from "src/app/UI/spectrum-chart-widget/model-interface";
import { BaseUIElement } from "src/app/UI/spectrum-chart-widget/ui-elements/base-ui-element";
import { Colours } from "src/app/utils/colours";


const MOUSE_TOLERANCE_TO_LINE = 2;

export class ChartAnnotations extends BaseUIElement
{
    private clrAnnotationNormal = Colours.GRAY_30.asString();
    private clrAnnotationNotCurrentROI = Colours.GRAY_60.asString();
    private clrAnnotationHighlight = Colours.PURPLE.asString();
    private clrLabel = Colours.GRAY_10.asString();

    private _flagHeight = 10;

    private _hoverIdx: number = -1;

    constructor(ctx: ISpectrumChartModel)
    {
        super(ctx);
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        // Need to detect hover & work out pileup lines
        // NOTE: if that's all contained in this class, pull it out of model & put it in here!
        /*
        if(event.eventId == CanvasMouseEventId.MOUSE_DOWN)
        {
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_DRAG)
        {
        }
        else*/ if(event.eventId == CanvasMouseEventId.MOUSE_MOVE)
        {
            return this.handleMouseMove(event);
        }
        /*        else if(event.eventId == CanvasMouseEventId.MOUSE_LEAVE)
        {
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_UP)
        {
        }
*/
        return CanvasInteractionResult.neither;
    }

    private handleMouseMove(event: CanvasMouseEvent): CanvasInteractionResult
    {
        if(!this._ctx.annotations)
        {
            return CanvasInteractionResult.neither;
        }

        let hoverIdx = -1;
        let c = 0;
        for(let line of this._ctx.annotations)
        {
            let isCurrentROI = this._ctx.isROIActive(line.roiID);

            // We don't hover over annotations that aren't active
            if(isCurrentROI)
            {
                let keV = line.eV/1000;
                let xPx = Math.floor(this._ctx.xAxis.valueToCanvas(keV));

                if(Math.abs(event.canvasPoint.x-xPx) < MOUSE_TOLERANCE_TO_LINE)
                {
                    hoverIdx = c;
                    break;
                }
            }

            c++;
        }

        // Only redraw if they differ
        if(this._hoverIdx == hoverIdx)
        {
            return CanvasInteractionResult.neither;
        }

        this._hoverIdx = hoverIdx;
        return CanvasInteractionResult.redrawOnly;
    }

    drawScreenSpace(ctx: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        if(!this._ctx.annotations)
        {
            return;
        }

        let c = 0;
        for(let line of this._ctx.annotations)
        {
            let keV = line.eV/1000;
            let xPx = Math.floor(this._ctx.xAxis.valueToCanvas(keV));
            if(xPx > this._ctx.xAxis.startPx)
            {
                let yValue = this._ctx.getMaxSpectrumValueAtEnergy(keV);
                if(yValue != null)
                {
                    let yPxBottom = Math.min(this._ctx.chartArea.maxY(), this._ctx.yAxis.valueToCanvas(yValue));

                    let isCurrentROI = this._ctx.isROIActive(line.roiID);
                    let clr = isCurrentROI ? this.clrAnnotationNormal : this.clrAnnotationNotCurrentROI;
                    if(c == this._hoverIdx)
                    {
                        clr = this.clrAnnotationHighlight;
                    }

                    this.drawAnnotationLine(ctx, xPx, yPxBottom, clr, !isCurrentROI, this._ctx.chartArea);

                    if(c == this._hoverIdx)
                    {
                        this.drawLineLabel(ctx, xPx, line.name);
                    }
                }
            }

            c++;
        }
    }

    private drawAnnotationLine(ctx: CanvasRenderingContext2D, x: number, yBottom: number, colour: string, outline: boolean, chartArea: Rect): void
    {
        const yTop = chartArea.y + 4; // Some padding

        ctx.strokeStyle = colour;
        ctx.fillStyle = colour;
        ctx.lineWidth = 1;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yBottom);
        ctx.stroke();

        // Draw a "flag" at the top
        let xFlag = 12;

        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x+xFlag, yTop+this._flagHeight/2);
        ctx.lineTo(x, yTop+this._flagHeight);
        ctx.closePath();
        if(outline)
        {
            ctx.stroke();
        }
        else
        {
            ctx.fill();
        }
    }

    private drawLineLabel(ctx: CanvasRenderingContext2D, xPx: number, label: string): void
    {
        const yTop = this._ctx.chartArea.y + this._flagHeight + 8; // Some padding

        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        ctx.fillStyle = this.clrLabel;
        ctx.fillText(label, xPx, yTop);
    }
}
