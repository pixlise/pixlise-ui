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

import { getVectorBetweenPoints, Point, Rect } from "src/app/models/Geometry";
import { CanvasDrawParameters, CanvasInteractionResult, CanvasMouseEvent, CanvasMouseEventId, CanvasParams, CanvasWorldTransform } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE, drawTextWithBackground } from "src/app/utils/drawing";
import { nearestRoundValue } from "src/app/utils/utils";
import { BaseUIElement } from "./base-ui-element";


class scalePosition
{
    constructor(public rect: Rect, public roundedmm: number)
    {
    }
}

const SCALE_FONT_SIZE = CANVAS_FONT_SIZE_TITLE-1;

export class PhysicalScale extends BaseUIElement
{
    private _captureMouse = false;
    private _startTranslation: Point = null;

    constructor(
        ctx: IContextImageModel)
    {
        super(ctx);
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        // If the mouse is over us, we hijack any drag events
        if(event.eventId == CanvasMouseEventId.MOUSE_DOWN)
        {
            let pos = this.getPosition(event.canvasParams, this._ctx.transform);
            if(pos.rect.containsPoint(event.canvasPoint))
            {
                this._captureMouse = true;
                this._startTranslation = this._ctx.uiPhysicalScaleTranslation.copy();
                return CanvasInteractionResult.redrawAndCatch;
            }
        }
        else if(this._captureMouse)
        {
            if(event.eventId == CanvasMouseEventId.MOUSE_DRAG)
            {
                let moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);

                this._ctx.uiPhysicalScaleTranslation.x = this._startTranslation.x+moved.x;
                this._ctx.uiPhysicalScaleTranslation.y = this._startTranslation.y+moved.y;
                return CanvasInteractionResult.redrawAndCatch;
            }
            else if(event.eventId == CanvasMouseEventId.MOUSE_UP || event.eventId == CanvasMouseEventId.MOUSE_LEAVE)
            {
                this._captureMouse = false;
                this._startTranslation = null;
            }
        }

        return CanvasInteractionResult.neither;
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        // Draw the physical image scale (mm)
        this.drawPhysicalScale(screenContext, drawParams.drawViewport, drawParams.worldTransform);
    }

    protected getPosition(viewport: CanvasParams, transform: CanvasWorldTransform): scalePosition
    {
        let mmConversion = this._ctx.dataset.getImagePixelsToPhysicalmm();

        const scaleTextPadY = 7;

        const scaleMinSize = 100;
        const edgeMarginX = 56;
        const edgeMarginY = 16;

        // Go from pixels on screen to pixels in context image, by taking the zoom effect out
        let contextImagePixelsWidth = scaleMinSize / transform.getScale().x;
        let mm = contextImagePixelsWidth * mmConversion;

        // We want to find the smallest mm value that's nearest
        let roundedmm = nearestRoundValue(mm);

        // Now that we have a "nice" round number of mm to show on the scale, we need to go back the
        // other way to work out how many pixels to draw on screen for the width of the scale
        let scaleLength = roundedmm*transform.getScale().x/mmConversion;

        let h = SCALE_FONT_SIZE+scaleTextPadY;

        let x = viewport.width-edgeMarginX-scaleLength+this._ctx.uiPhysicalScaleTranslation.x;
        let y = viewport.height-edgeMarginY-h+this._ctx.uiPhysicalScaleTranslation.y-10/*room for PMC hover tooltip*/;

        return new scalePosition(new Rect(x, y, scaleLength, h), roundedmm);
    }

    protected drawPhysicalScale(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, transform: CanvasWorldTransform): void
    {
        let pos = this.getPosition(viewport, transform);

        // Here we work out what size to make the scale bar. We want something that's a multiple of a round unit
        const scaleTextPadding = 2;
        const scaleTickHeight = 5;

        let scaleLength = pos.rect.w;

        let yTop = pos.rect.y;
        let yBottom = pos.rect.maxY();

        // Drawing the scale line as black with white outline
        screenContext.strokeStyle = Colours.WHITE.asString();
        screenContext.lineWidth = 4;
        let tickHeight = scaleTickHeight;

        for(let c = 0; c < 2; c++)
        {
            if(c)
            {
                screenContext.lineWidth = 2;
                screenContext.strokeStyle = Colours.BLACK.asString();
                tickHeight = scaleTickHeight-1;
            }

            screenContext.beginPath();
            screenContext.moveTo(pos.rect.x, yBottom-tickHeight);
            screenContext.lineTo(pos.rect.x, yBottom);
            screenContext.lineTo(pos.rect.maxX(), yBottom);
            screenContext.lineTo(pos.rect.maxX(), yBottom-tickHeight);
            screenContext.stroke();
        }

        screenContext.textBaseline = "top";
        screenContext.textAlign = "end";
        screenContext.font = SCALE_FONT_SIZE+"px Roboto";

        //this.drawStrokedText(screenContext, this.printableValue(pos.roundedmm)+' mm', pos.rect.maxX()-scaleTextPadX, yTop+SCALE_FONT_SIZE);
        drawTextWithBackground(screenContext, this.printableValue(pos.roundedmm)+" mm", pos.rect.maxX()-scaleTextPadding, yTop-scaleTextPadding, SCALE_FONT_SIZE, scaleTextPadding);
    }

    protected printableValue(value: number): string
    {
        return value.toString();
    }
}
