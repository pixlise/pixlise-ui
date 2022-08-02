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
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasDrawParameters, CanvasInteractionResult, CanvasMouseEvent, CanvasMouseEventId } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { UserLineDrawer } from "src/app/UI/context-image-view-widget/drawers/user-line-drawer";
import { IContextImageModel } from "src/app/UI/context-image-view-widget/model-interface";
import { Colours } from "src/app/utils/colours";
import { BaseContextImageTool, ContextImageToolId, IToolHost } from "./base-context-image-tool";


export class ContextImageZoom extends BaseContextImageTool
{
    private _zoomRectStartPt: Point = null;
    private _zoomRectCurrPt: Point = null;

    constructor(
        ctx: IContextImageModel,
        host: IToolHost
    )
    {
        super(ContextImageToolId.ZOOM,
            ctx,
            host,
            "Zoom Tool (Z)\nClick to zoom, or draw a box around area of interest",
            "assets/button-icons/tool-zoom.svg"
        );
    }

    protected reset()
    {
        this._zoomRectStartPt = null;
        this._zoomRectCurrPt = null;
    }

    activate(): void
    {
        this._host.setCursor(CursorId.zoomCursor);
        this.reset();
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        if(event.eventId == CanvasMouseEventId.MOUSE_DOWN)
        {
            if(!this._zoomRectStartPt)
            {
                // Set start & curr point
                this._zoomRectStartPt = this._zoomRectCurrPt = event.point;
                return CanvasInteractionResult.redrawAndCatch;
            }
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_MOVE || event.eventId == CanvasMouseEventId.MOUSE_DRAG)
        {
            // If we've started drawing, set curr poitn to this one, so rect will get redrawn reflecting mouse movement
            if(this._zoomRectStartPt)
            {
                this._zoomRectCurrPt = event.point;
                return CanvasInteractionResult.redrawAndCatch;
            }
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_UP)
        {
            if(this._zoomRectStartPt && this._zoomRectCurrPt)
            {
                // Calculate the rect & apply zoom
                let rect = this.makeZoomRect();
                if(rect.w > 0 && rect.h > 0)
                {
                    this._ctx.transform.resetViewToRect(rect, true);
                }
                // else: Invalid rect drawn, prevent div by 0...

                // And we're done!
                this.reset();
                return CanvasInteractionResult.redrawAndCatch;
            }
        }

        return CanvasInteractionResult.neither;
    }

    drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters)
    {
        this.drawSelectableLocations(screenContext, this._ctx.highlighedLocationIdx, this._ctx.showPointBBox, this._ctx.showPoints, this._ctx.showPoints);

        // draw the line segments
        if(this._ctx.drawnLinePoints.length > 1)
        {
            let drawer = new UserLineDrawer(this._ctx);
            drawer.drawWorldSpace(screenContext, drawParams);
        }

        if(this._zoomRectStartPt)
        {
            // Draw zoom rect preview
            let rect = this.makeZoomRect();

            this.drawZoomRect(screenContext, rect);

            // And control points
            this.drawCtrlPoint(screenContext, this._zoomRectStartPt);
            this.drawCtrlPoint(screenContext, this._zoomRectCurrPt);
        }
    }

    protected makeZoomRect(): Rect
    {
        let rect = Rect.makeRect(this._zoomRectStartPt, 0, 0);
        rect.expandToFitPoint(this._zoomRectCurrPt);
        return rect;
    }

    protected drawZoomRect(screenContext: CanvasRenderingContext2D, rect: Rect): void
    {
        screenContext.fillStyle = Colours.BLUE.asStringWithA(0.5);
        screenContext.fillRect(rect.x, rect.y, rect.w, rect.h);

        screenContext.lineWidth = 1/this._ctx.transform.scale.x;
        screenContext.strokeStyle = Colours.BLUE.asString();
        screenContext.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }

    protected drawCtrlPoint(screenContext: CanvasRenderingContext2D, coord: Point): void
    {
        // Draw outer
        screenContext.fillStyle = Colours.BLUE.asString();

        const ctrlPtSize = 4/this._ctx.transform.scale.x;
        const ctrlPtHalfSize = ctrlPtSize/2;
        screenContext.fillRect(coord.x-ctrlPtHalfSize, coord.y-ctrlPtHalfSize, ctrlPtSize, ctrlPtSize);

        // Draw inner
        screenContext.fillStyle = Colours.WHITE.asString();

        const ctrlPtInnerSize = ctrlPtSize/2;
        const ctrlPtInnerHalfSize = ctrlPtInnerSize/2;
        screenContext.fillRect(coord.x-ctrlPtInnerHalfSize, coord.y-ctrlPtInnerHalfSize, ctrlPtInnerSize, ctrlPtInnerSize);
    }
}
