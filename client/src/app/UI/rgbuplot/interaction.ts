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

import { Subject } from "rxjs";
import { distanceBetweenPoints, Point, ptWithinPolygon, Rect } from "src/app/models/Geometry";
import { PixelSelection } from "src/app/models/PixelSelection";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionService } from "src/app/services/selection.service";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasInteractionHandler, CanvasInteractionResult, CanvasKeyEvent, CanvasMouseEvent, CanvasMouseEventId } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { RGBUPlotModel } from "./model";





const DRAG_THRESHOLD = 2; // how many pixels mouse can drift before we assume we're drawing a lasso
const MINERAL_HOVER_RADIUS = 4; // how far a mineral hover is detected from the mineral pos

export class RGBUPlotInteraction implements CanvasInteractionHandler
{
    axisClick$: Subject<string> = new Subject<string>();

    constructor(
        private _mdl: RGBUPlotModel,
        private _selectionService: SelectionService,
        private _datasetService: DataSetService
    )
    {
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        if(event.eventId == CanvasMouseEventId.MOUSE_DOWN)
        {
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_DRAG)
        {
            // User is mouse-dragging, if we haven't started a drag operation yet, do it
            if(
                !this._mdl.mouseLassoPoints &&
                distanceBetweenPoints(event.canvasPoint, event.canvasMouseDown) > DRAG_THRESHOLD
            )
            {
                // Save the start point
                this._mdl.mouseLassoPoints = [event.canvasMouseDown, event.canvasPoint];
            }
            // If they have moved some distance from the start, save subsequent points in lasso shape
            else if(
                this._mdl.mouseLassoPoints &&
                distanceBetweenPoints(event.canvasPoint, this._mdl.mouseLassoPoints[this._mdl.mouseLassoPoints.length-1]) > DRAG_THRESHOLD
            )
            {
                this._mdl.mouseLassoPoints.push(event.canvasPoint);
                return CanvasInteractionResult.redrawAndCatch;
            }
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_MOVE)
        {
            // General mouse move, check if hovering over anything
            return this.handleMouseHover(event.canvasPoint);
        }
        else if(event.eventId == CanvasMouseEventId.MOUSE_UP)
        {
            if(this._mdl.mouseLassoPoints)
            {
                // Just finished drawing a lasso... find & select the points
                this.handleLassoFinish(this._mdl.mouseLassoPoints);
            }
            else
            {
                // See if something was clicked on
                this.handleMouseClick(event.canvasPoint);
            }

            // Reset
            //this._mdl.hoverPoint = null;
            this._mdl.mouseLassoPoints = null;
            return CanvasInteractionResult.redrawAndCatch;
        }

        return CanvasInteractionResult.neither;
    }

    keyEvent(event: CanvasKeyEvent): CanvasInteractionResult
    {
        return CanvasInteractionResult.neither;
    }

    private handleMouseHover(canvasPt: Point): CanvasInteractionResult
    {
        if(!this._mdl.drawData)
        {
            return CanvasInteractionResult.neither;
        }

        this._mdl.drawData.mineralHoverIdx = -1;

        // If mouse is over a label... we may need to show hover icon or error tooltip
        if(this._mdl.drawData.xAxisLabelArea.containsPoint(canvasPt))
        {
            this._mdl.drawData.hoverLabel = "X";
            this._mdl.cursorShown = CursorId.pointerCursor;
        }
        else if(this._mdl.drawData.yAxisLabelArea.containsPoint(canvasPt))
        {
            this._mdl.drawData.hoverLabel = "Y";
            this._mdl.cursorShown = CursorId.pointerCursor;
        }
        else
        {
            this._mdl.cursorShown = CursorId.pointerCursor;
            this._mdl.drawData.hoverLabel = null;
            //this._mdl.drawData.hoverLabelText = null;

            // See if it hovered over a mineral point
            for(let c = 0; c < this._mdl.drawData.minerals.length; c++)
            {
                if(distanceBetweenPoints(canvasPt, this._mdl.drawData.minerals[c].ratioPt) <= MINERAL_HOVER_RADIUS)
                {
                    this._mdl.drawData.mineralHoverIdx = c;
                    break;
                }
            }

            // If we're not hovering over a mineral point, check if we are within the draw area, if so, lasso is possible
            if(this._mdl.drawData.mineralHoverIdx == -1 && this._mdl.drawData.dataArea.containsPoint(canvasPt))
            {
                this._mdl.cursorShown = CursorId.lassoCursor;
            }
        }

        return CanvasInteractionResult.neither;
    }

    private handleMouseClick(canvasPt: Point): void
    {
        if(!this._mdl.drawData)
        {
            return;
        }
        /*
        let mouseOverIdx = this.getIndexforPoint(canvasPt);

        if(mouseOverIdx != null)
        {
            this.setSelection(new Set<number>([mouseOverIdx.pmc]));
        }
        else*/ if(this._mdl.drawData.xAxisLabelArea.containsPoint(canvasPt))
        {
            this.axisClick$.next("X");
        }
        else if(this._mdl.drawData.yAxisLabelArea.containsPoint(canvasPt))
        {
            this.axisClick$.next("Y");
        }
        /*        else
        {
            // They clicked on chart, but not on any pmcs, clear selection
            if(this._mdl.drawData.dataArea.containsPoint(canvasPt))
            {
                this.setSelection(new Set<number>());
            }
        }*/
    }

    private handleLassoFinish(lassoPoints: Point[]): void
    {
        if(!this._mdl.drawData)
        {
            return;
        }

        // We've drawn a lasso area, now find all points within it
        // NOTE: these are points on our plot, but they refer to pixels in the context image!

        let bbox = Rect.makeRect(lassoPoints[0], 0, 0);
        bbox.expandToFitPoints(lassoPoints);

        let selectedPixels = new Set<number>();

        // If we're preserving, read the current selection points in too
        if(this._mdl.selectionMode != RGBUPlotModel.SELECT_RESET)
        {
            selectedPixels = new Set<number>(this._selectionService.getCurrentSelection().pixelSelection.selectedPixels);
        }

        for(let c = 0; c < this._mdl.drawData.points.length; c++)
        {
            let coord = this._mdl.drawData.points[c];
            if(ptWithinPolygon(coord, lassoPoints, bbox))
            {
                // Look up the bin that this sits in, and add all pixels that are part of that bin
                for(let srcPixel of this._mdl.raw.points[c].srcPixelIdxs)
                {
                    // Add or delete as required
                    if(this._mdl.selectionMode != RGBUPlotModel.SELECT_SUBTRACT)
                    {
                        selectedPixels.add(srcPixel);
                    }
                    else
                    {
                        selectedPixels.delete(srcPixel);
                    }
                }
            }
        }

        // Notify out
        this.setSelection(selectedPixels);
    }

    private setSelection(pixels: Set<number>)
    {
        this._selectionService.setSelection(
            this._datasetService.datasetLoaded,
            null,
            new PixelSelection(
                this._datasetService.datasetLoaded,
                pixels,
                this._mdl.raw.imgWidth,
                this._mdl.raw.imgHeight,
                this._mdl.raw.imgName
            )
        );
    }
}