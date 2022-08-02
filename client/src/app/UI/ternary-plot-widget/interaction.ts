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
import { BeamSelection } from "src/app/models/BeamSelection";
import { distanceBetweenPoints, Point, ptWithinBox, ptWithinPolygon, Rect } from "src/app/models/Geometry";
import { PredefinedROIID } from "src/app/models/roi";
import { DataSetService } from "src/app/services/data-set.service";
import { SelectionService } from "src/app/services/selection.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
import { CanvasInteractionHandler, CanvasInteractionResult, CanvasKeyEvent, CanvasMouseEvent, CanvasMouseEventId } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { HOVER_POINT_RADIUS } from "src/app/utils/drawing";
import { TernaryModel } from "./model";
import { SentryHelper } from "src/app/utils/utils";


const DRAG_THRESHOLD = 2; // how many pixels mouse can drift before we assume we're drawing a lasso

class MouseHoverPoint
{
    constructor(
        public pmc: number,
        public regionIdx: number,
        public ptIdx: number,
        public coord: Point
    )
    {
    }
}

export class TernaryInteraction implements CanvasInteractionHandler
{
    cornerClick: Subject<string> = new Subject<string>();

    constructor(
        private _mdl: TernaryModel,
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _widgetDataService: WidgetRegionDataService,
    )
    {
    }

    mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult
    {
        if(!this._mdl.drawData)
        {
            this._mdl.recalcDisplayData(event.canvasParams);
        }

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
            this._mdl.hoverPoint = null;
            this._mdl.hoverPointData = null;
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
        // If the mouse is over the triangle area, show a lasso cursor
        let triPts = [ this._mdl.drawData.triangleA, this._mdl.drawData.triangleB, this._mdl.drawData.triangleC ];
        let triBox: Rect = Rect.makeRect(this._mdl.drawData.triangleA, 0, 0);
        triBox.expandToFitPoints(triPts);

        let cursor = CursorId.defaultPointer;
        if(ptWithinPolygon(canvasPt, triPts, triBox))
        {
            cursor = CursorId.lassoCursor;
        }
        else
        {
            // If mouse is over a label... we may need to show hover icon or error tooltip
            if(this._mdl.drawData.labelA.containsPoint(canvasPt))
            {
                cursor = CursorId.pointerCursor;
                this._mdl.drawData.hoverLabel = "A";
            }
            else if(this._mdl.drawData.labelB.containsPoint(canvasPt))
            {
                cursor = CursorId.pointerCursor;
                this._mdl.drawData.hoverLabel = "B";
            }
            else if(this._mdl.drawData.labelC.containsPoint(canvasPt))
            {
                cursor = CursorId.pointerCursor;
                this._mdl.drawData.hoverLabel = "C";
            }
            else
            {
                this._mdl.drawData.hoverLabel = null;
            }
        }
        this._mdl.cursorShown = cursor;

        let mouseOverIdx = this.getIndexforPoint(canvasPt);

        if(mouseOverIdx == null)
        {
            this._selectionService.setHoverPMC(-1);
        }
        else
        {
            this._selectionService.setHoverPMC(mouseOverIdx.pmc);
        }

        // Redraw will be initiated due to selectionService hover idx change

        return CanvasInteractionResult.neither;
    }

    private handleMouseClick(canvasPt: Point): void
    {
        let mouseOverIdx = this.getIndexforPoint(canvasPt);

        if(mouseOverIdx != null)
        {
            this.setSelection(new Set<number>([mouseOverIdx.pmc]));
        }
        else if(this._mdl.drawData.labelA.containsPoint(canvasPt))
        {
            this.cornerClick.next("A");
        }
        else if(this._mdl.drawData.labelB.containsPoint(canvasPt))
        {
            this.cornerClick.next("B");
        }
        else if(this._mdl.drawData.labelC.containsPoint(canvasPt))
        {
            this.cornerClick.next("C");
        }
        else
        {
            // They clicked in region around triangle (but not on a point), clear selection
            let triPoly = [this._mdl.drawData.triangleA, this._mdl.drawData.triangleB, this._mdl.drawData.triangleC];
            let triBBox = new Rect(this._mdl.drawData.triangleA.x, this._mdl.drawData.triangleA.y, 0, 0);
            triBBox.expandToFitPoints(triPoly);

            if(ptWithinPolygon(canvasPt, triPoly, triBBox))
            {
                this.setSelection(new Set<number>());
            }
        }
    }

    private handleLassoFinish(lassoPoints: Point[]): void
    {
        // Loop through all data points, if they're within our lasso, select their PMC
        let bbox = Rect.makeRect(lassoPoints[0], 0, 0);
        bbox.expandToFitPoints(lassoPoints);

        let selectedPMCs = new Set<number>();

        for(let c = 0; c < this._mdl.drawData.pointGroupCoords.length; c++)
        {
            if(!this._mdl.raw.pointGroups[c])
            {
                SentryHelper.logMsg(false, "ternary handleLassoFinish raw.pointGroups["+c+"] is null, pointGroupCoords length="+this._mdl.drawData.pointGroupCoords.length);
                continue;
            }

            let i = 0;
            for(let coord of this._mdl.drawData.pointGroupCoords[c])
            {
                if(ptWithinPolygon(coord, lassoPoints, bbox))
                {
                    selectedPMCs.add(this._mdl.raw.pointGroups[c].values[i].pmc);
                }

                i++;
            }
        }

        // Notify out
        this.setSelection(selectedPMCs);
    }

    private setSelection(pmcs: Set<number>)
    {
        // 1 or more PMCs were selected, get location indexes & update the selection
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        let blockedPMCs = new Set<number>();
        if(this._mdl.selectModeExcludeROI)
        {
            for(let region of this._widgetDataService.regions.values())
            {
                if(region.id != PredefinedROIID.AllPoints && region.id != PredefinedROIID.SelectedPoints && this._mdl.raw.visibleROIs.indexOf(region.id) > -1)
                {
                    for(let usedPMC of region.pmcs)
                    {
                        blockedPMCs.add(usedPMC);
                    }
                }
            }
        }

        let set = new Set<number>();
        for(let pmc of pmcs)
        {
            // If we're only selecting points that are not in any ROIs, do the filtering here:
            if(!this._mdl.selectModeExcludeROI || !blockedPMCs.has(pmc))
            {
                let idx = dataset.pmcToLocationIndex.get(pmc);
                set.add(idx);
            }
        }

        this._selectionService.setSelection(dataset, new BeamSelection(dataset, set), null);
    }

    private getIndexforPoint(pt: Point): MouseHoverPoint
    {
        let boxSize = HOVER_POINT_RADIUS*2;

        for(let c = 0; c < this._mdl.drawData.pointGroupCoords.length; c++)
        {
            if(!this._mdl.raw.pointGroups[c])
            {
                SentryHelper.logMsg(false, "ternary getIndexforPoint raw.pointGroups["+c+"] is null, pointGroupCoords length="+this._mdl.drawData.pointGroupCoords.length);
                continue;
            }

            let i = 0;
            for(let coord of this._mdl.drawData.pointGroupCoords[c])
            {
                if(ptWithinBox(pt, coord, boxSize, boxSize))
                {
                    return new MouseHoverPoint(this._mdl.raw.pointGroups[c].values[i].pmc, c, i, coord);
                }

                i++;
            }
        }

        return null;
    }
}
