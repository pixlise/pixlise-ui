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
import { CanvasDrawParameters, CanvasInteractionResult, CanvasMouseEvent, CanvasMouseEventId } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { Colours } from "src/app/utils/colours";
import { drawPointCrosshair } from "src/app/utils/drawing";
import { BaseUIElement } from "./base-ui-element";


// Draws the highlighted point. Also listens for any stray mouse events and sets the point hovered over as the hover point
export class HoverPointCursor extends BaseUIElement
{
    private _ratioValue: number = null;

    constructor(
        ctx: IContextImageModel)
    {
        super(ctx);
    }

    getHoverRatioValue(point: Point): number
    {
        // Validate context before continuing
        if(!this._ctx || !this._ctx.displayedChannels || !this._ctx.contextImageItemShowing)
        {
            return null;
        }

        let ratioValue: number = null;
        // Get channel acronym names, validate that they are individual r,g,b,u channels, and confirm there are 2 channels selected as a ratio
        let channelAcronyms = this._ctx.displayedChannels.toLowerCase().split("/").filter(acronym => ["r", "g", "b", "u"].includes(acronym));
        if(channelAcronyms.length === 2 && this._ctx.contextImageItemShowing.rgbuSourceImage)
        {
            // Only continue if channel images have the same width and height and the selected point is within image bounds
            let channels = channelAcronyms.map(acronym => this._ctx.contextImageItemShowing.rgbuSourceImage[acronym]);
            if(channels.length >= 2 && channels[0].width === channels[1].width && channels[0].height === channels[1].height)
            {
                let width = channels[0].width;

                // Get the world point, translate it so 0,0 is the top left corner of the image and convert it to a pixel index
                let rawX = Math.round(point.x) - this._ctx.contextImageItemShowing.imageDrawTransform.xOffset;
                let rawY = Math.round(point.y) - this._ctx.contextImageItemShowing.imageDrawTransform.yOffset;
                let pixelIndex = rawY * width + rawX;

                // Check that the pixel is in bounds of the RGBU image
                if(pixelIndex >= 0 && pixelIndex < channels[0].values.length) 
                {
                    ratioValue = channels[0].values[pixelIndex] / channels[1].values[pixelIndex];
                }
            }
        }

        return ratioValue;
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        // We listen in on mouse moves, if it hits a PMC, we tell the selection service. This will trigger other views to redraw showing
        // the location of the point the mouse is over
        if(event.eventId == CanvasMouseEventId.MOUSE_MOVE)
        {
            this._ratioValue = this.getHoverRatioValue(event.point);

            let idx = this._ctx.dataset.getClosestLocationIdxToPoint(event.point);
            if(idx < 0)
            {
                this._ctx.selectionService.setHoverPMC(-1);
            }
            else
            {
                let pmcs = this._ctx.dataset.getPMCsForLocationIndexes([idx], false);
                if(pmcs.size == 1)
                {
                    this._ctx.selectionService.setHoverPMC(pmcs.keys().next().value);
                }
            }

            // Redraw will be initiated due to selectionService hover idx change
        }

        return CanvasInteractionResult.neither;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters)
    {
        // Draw a highlighted location if there is one
        if(this._ctx.highlighedLocationIdx >= 0)
        {
            let beamRadiusPixels = this._ctx.dataset.mmToContextImageSpacePixelSize(this._ctx.mmBeamRadius);
            let locInfo = this._ctx.dataset.locationPointCache[this._ctx.highlighedLocationIdx];
            drawPointCrosshair(screenContext, locInfo.coord, beamRadiusPixels, this._ctx.transform.scale.x, beamRadiusPixels/2);
        }
    }

    drawCornerTextBox(text: string, screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters, offsetX: number = 0, padding: number = 4): void
    {
        const txtSize = screenContext.measureText(text);

        const w = txtSize.width+padding*2;
        const h = 20;

        // Work out position
        let pos = new Point(drawParams.drawViewport.width-w-padding + offsetX, drawParams.drawViewport.height-22);

        screenContext.textAlign = "left";
        screenContext.textBaseline = "top";

        screenContext.fillStyle = Colours.GRAY_80.asString();
        screenContext.fillRect(pos.x, pos.y, w, h);

        screenContext.fillStyle = Colours.GRAY_10.asString();
        screenContext.fillText(text, pos.x+padding, pos.y+padding);
    }

    getPMCLabel(): string
    {
        // Write some info about the hovered point
        const locInfo = this._ctx.dataset.locationPointCache[this._ctx.highlighedLocationIdx];

        let pmcLabel = "PMC: "+locInfo.PMC;
        if(locInfo.hasDwellSpectra)
        {
            pmcLabel += " Dwell";
        }

        return pmcLabel;
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        let pmcLabelText = "";
        const padding = 4;
        if(this._ctx && this._ctx.highlighedLocationIdx >= 0)
        {
            pmcLabelText = this.getPMCLabel();
            this.drawCornerTextBox(pmcLabelText, screenContext, drawParams, 0, padding);
        }

        if(this._ratioValue !== null && this._ctx && this._ctx.rgbuImageLayerForScale)
        {
            let displayRatio = Math.round(this._ratioValue * 100) / 100;
            if(!isNaN(displayRatio))
            {
                let xOffset = this._ctx.highlighedLocationIdx >= 0 ? -(screenContext.measureText(pmcLabelText).width + padding * 2.5) : 0;
                this.drawCornerTextBox(`${this._ctx.rgbuImageLayerForScale.name}: ${displayRatio}`, screenContext, drawParams, xOffset, padding);
            }
        }
    }
}
