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

import { addVectors, getVectorBetweenPoints, Point, Rect } from "src/app/models/Geometry";
import { CanvasDrawParameters, CanvasInteractionResult, CanvasMouseEvent, CanvasMouseEventId, CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { ISpectrumChartModel } from "src/app/UI/spectrum-chart-widget/model-interface";
import { BaseUIElement } from "src/app/UI/spectrum-chart-widget/ui-elements/base-ui-element";
import { Colours } from "src/app/utils/colours";


export class ZoomMap extends BaseUIElement
{
    public static readonly maxHeight = 140;
    public static readonly margin = 12;

    private _savedPan: Point = null;

    constructor(
        ctx: ISpectrumChartModel)
    {
        super(ctx);
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        // If the mouse is down over us and user is over the hover rect, they intend to pan so we hijack
        // mouse messages from here
        if(event.eventId == CanvasMouseEventId.MOUSE_DOWN)
        {
            let rect = this.calcWindowRect(event.canvasParams);
            let visibleRect = this.calcWindowVisibleRect(rect);

            if(visibleRect.containsPoint(event.canvasPoint))
            {
                // Save the pan value, we'll be modifying it
                this._savedPan = this._ctx.transform.pan;

                // Start capturing!
                return CanvasInteractionResult.redrawAndCatch;
            }
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_DRAG && this._savedPan)
        {
            // Work out the pan distance since we started
            let newPan = this.calcNewPan(event);
            this._ctx.transform.setPan(newPan, false);
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_UP && this._savedPan)
        {
            // Work out the pan distance since we started
            let newPan = this.calcNewPan(event);
            this._ctx.transform.setPan(newPan, true);

            // Forget it!
            this._savedPan = null;
        }

        return CanvasInteractionResult.neither;
    }

    drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
    {
        let rect = this.calcWindowRect(drawParams.drawViewport);

        // Draw in top-right corner
        screenContext.fillStyle = Colours.BLACK.asString();
        screenContext.fillRect(rect.x, rect.y, rect.w, rect.h);

        // Frame it
        screenContext.strokeStyle = Colours.GRAY_90.asString();
        screenContext.lineWidth = 1;
        screenContext.strokeRect(rect.x, rect.y, rect.w, rect.h);

        if(this._ctx.spectrumLines.length <= 0)
        {
            return;
        }

        // Now make sure we don't draw outside of the rect
        screenContext.save();
        screenContext.beginPath();
        screenContext.rect(rect.x, rect.y, rect.w, rect.h);
        screenContext.clip();

        // Draw the first spectrum line we find with sparsely chosen points, since we
        // have 4000 but only displaying in about 200px wide
        screenContext.strokeStyle = Colours.GRAY_60.asString();

        // TODO: Switch back to this, we only want to really draw 1 main line on the zoom map
        let lines = [this._ctx.spectrumLines[0]];
        // For testing, we draw every second one
        for(let c = 2; c < this._ctx.spectrumLines.length; c++)
        {
            lines.push(this._ctx.spectrumLines[c]);
        }

        for(let line of lines)
        {
            let skip = Math.ceil(line.values.length/rect.w);
            //skip=1;
            //console.log('Drawing pip, skip='+skip);

            screenContext.beginPath();

            let pxRange = this._ctx.yAxis.endPx-this._ctx.yAxis.startPx;
            let rectRatio = rect.h / pxRange / this._ctx.transform.scale.y;

            for(let c = 0; c < line.values.length; c += skip)
            {
                let x = rect.x + c/line.values.length * rect.w;

                // Get the Y value transformed through the axis (it may be linear or log)
                let y = this._ctx.yAxis.valueToPct(line.values[c]);

                // Convert to pixels in our rect
                y *= rect.h;
                y += rect.y;

                if(c == 0)
                {
                    screenContext.moveTo(x, y);
                }
                else
                {
                    screenContext.lineTo(x, y);
                }
            }
            screenContext.stroke();
        }

        let visibleRect = this.calcWindowVisibleRect(rect);

        //console.log(JSON.stringify(visibleRect));
        screenContext.strokeStyle = Colours.PURPLE.asString();
        screenContext.lineWidth = 2;
        screenContext.strokeRect(visibleRect.x, visibleRect.y, visibleRect.w, visibleRect.h);

        screenContext.restore();
    }

    // Returns the rect of where we're drawing the map
    private calcWindowRect(viewport: CanvasParams): Rect
    {
        // Work out the position, fitting into max sizes
        const maxWidth = 200;

        let rect = new Rect(viewport.width-ZoomMap.margin, ZoomMap.margin, 0, 0);
        /*
        // Fiddle with aspect ratios
        if(viewport.width > viewport.height)
        {
            // Landscape
            rect.w = maxWidth;
            rect.h = viewport.height / viewport.width * maxWidth;
        }
        else
        {
            // Portrait (not likely!)
            rect.h = maxHeight;
            rect.w = viewport.height / viewport.width * maxHeight;
        }
*/
        rect.w = maxWidth;
        rect.h = ZoomMap.maxHeight;

        // Apply to rect
        rect.x -= rect.w;

        return rect;
    }

    private calcWindowVisibleRect(mapDrawRect: Rect): Rect
    {
        // Draw the visible area on the map
        // Default 1-1 zoom, no pan = whole area
        let visibleRect = new Rect(
            mapDrawRect.x,
            mapDrawRect.y,
            mapDrawRect.w,
            mapDrawRect.h
        );

        // Apply zoom scaling to the rect
        visibleRect.w /= this._ctx.transform.scale.x;
        visibleRect.h /= this._ctx.transform.scale.y;

        // Apply panning to the rect, where we make the pan distance out of a percentage of window width/height
        visibleRect.x += (-this._ctx.transform.pan.x / this._ctx.transform.scale.x / /*this._ctx.transform.canvasParams.width*/this._ctx.xAxis.pxLength) * mapDrawRect.w;
        // Keep in mind that Y is backwards:
        // +pan.y moves chart up in window, box needs to go down
        // y is 0 at top and increases in downwards direction, so this movement needs to be relative to the bottom of rect
        //console.log('calcWindowVisibleRect pan='+this._ctx.transform.pan.y+', scale='+this._ctx.transform.scale.y+', yAxis pxLength='+this._ctx.yAxis.pxLength+', mapDrawRect='+JSON.stringify(mapDrawRect));

        // TODO: Y is backwards... why doesn't this cause issues on context image?
        let yOffset = (-this._ctx.transform.pan.y / this._ctx.transform.scale.y / /*this._ctx.transform.canvasParams.height*/this._ctx.yAxis.pxLength) * mapDrawRect.h;
        visibleRect.y += yOffset;

        //console.log(visibleRect);
        return visibleRect;
    }

    private calcNewPan(event: CanvasMouseEvent): Point
    {
        let dragCanvas = getVectorBetweenPoints(event.canvasPoint, event.canvasMouseDown);
        let rect = this.calcWindowRect(event.canvasParams);
        dragCanvas.x *= event.canvasParams.width/rect.w*this._ctx.transform.scale.x;
        dragCanvas.y *= event.canvasParams.height/rect.h*this._ctx.transform.scale.y;

        let newPan = addVectors(this._savedPan, dragCanvas);
        return newPan;
    }
}
