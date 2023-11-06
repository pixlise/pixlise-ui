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
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { distanceBetweenPoints, Point, ptWithinBox, ptWithinPolygon, Rect } from "src/app/models/Geometry";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import {
  CanvasInteractionHandler,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasMouseEvent,
  CanvasMouseEventId,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { HOVER_POINT_RADIUS } from "src/app/utils/drawing";
import { invalidPMC, SentryHelper } from "src/app/utils/utils";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { BaseChartModelWithLasso } from "./model-interfaces";

const DRAG_THRESHOLD = 2; // how many pixels mouse can drift before we assume we're drawing a lasso

class MouseHoverPoint {
  constructor(
    public scanId: string,
    public pmc: number,
    public regionIdx: number,
    public ptIdx: number,
    public coord: Point
  ) {}
}

export abstract class InteractionWithLassoHover implements CanvasInteractionHandler {
  constructor(
    private _mdl: BaseChartModelWithLasso,
    private _selectionService: SelectionService
  ) {}

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    // TODO: Do we require this??? Here it requires a 2d drawing context so we can't call it here
    //this._mdl.recalcDisplayDataIfNeeded(event.canvasParams);

    /*if(event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
    } else*/ if (event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      // User is mouse-dragging, if we haven't started a drag operation yet, do it
      if (this._mdl.mouseLassoPoints.length <= 0 && distanceBetweenPoints(event.canvasPoint, event.canvasMouseDown) > DRAG_THRESHOLD) {
        // Save the start point
        this._mdl.mouseLassoPoints = [event.canvasMouseDown, event.canvasPoint];
      }
      // If they have moved some distance from the start, save subsequent points in lasso shape
      else if (
        this._mdl.mouseLassoPoints.length > 0 &&
        distanceBetweenPoints(event.canvasPoint, this._mdl.mouseLassoPoints[this._mdl.mouseLassoPoints.length - 1]) > DRAG_THRESHOLD
      ) {
        this._mdl.mouseLassoPoints.push(event.canvasPoint);
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // General mouse move, check if hovering over anything
      return this.handleMouseHover(event.canvasPoint);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
      if (this._mdl.mouseLassoPoints.length > 0) {
        // Just finished drawing a lasso... find & select the points
        this.handleLassoFinish(this._mdl.mouseLassoPoints);
      } else {
        // See if something was clicked on
        this.handleMouseClick(event.canvasPoint);
      }

      // Reset
      this.resetHover();
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  protected abstract resetHover(): void;

  private handleMouseHover(canvasPt: Point): CanvasInteractionResult {
    const mouseOverPt = this.getIndexforPoint(canvasPt);

    if (mouseOverPt == null) {
      this._selectionService.clearHoverEntry();
    } else {
      this._selectionService.setHoverEntryPMC(mouseOverPt.scanId, mouseOverPt.pmc);
    }

    // Redraw will be initiated due to selectionService hover idx change

    // Adjust cursor if mouse is over data or not
    this._mdl.cursorShown = this.isOverDataArea(canvasPt) ? CursorId.lassoCursor : CursorId.defaultPointer;

    return CanvasInteractionResult.neither;
  }

  private handleMouseClick(canvasPt: Point): void {
    const mouseOverPt = this.getIndexforPoint(canvasPt);

    if (mouseOverPt != null) {
      this.setSelection(new Map<string, Set<number>>([[mouseOverPt.scanId, new Set<number>([mouseOverPt.pmc])]]));
    } else {
      // They clicked on chart, but not on any pmcs, clear selection
      if (this.isOverDataArea(canvasPt)) {
        this.setSelection(new Map<string, Set<number>>());
      }
    }
  }

  protected abstract isOverDataArea(pt: Point): boolean;

  private handleLassoFinish(lassoPoints: Point[]): void {
    // Loop through all data points, if they're within our lasso, select their PMC
    const bbox = Rect.makeRect(lassoPoints[0], 0, 0);
    bbox.expandToFitPoints(lassoPoints);

    const selection = new Map<string, Set<number>>();

    if (this._mdl.raw) {
      for (let c = 0; c < this._mdl.drawModel.pointGroupCoords.length; c++) {
        const selected: Set<number> = selection.get(this._mdl.raw.pointGroups[c].scanId) || new Set<number>();

        let i = 0;
        for (const coord of this._mdl.drawModel.pointGroupCoords[c]) {
          if (ptWithinPolygon(coord, lassoPoints, bbox)) {
            selected.add(this._mdl.raw.pointGroups[c].valuesPerScanEntry[i].scanEntryId);
          }

          i++;
        }
      }
    }

    // Notify out
    this.setSelection(selection);
  }

  private setSelection(scanEntryIndexes: Map<string, Set<number>>) {
    // 1 or more PMCs were selected, get location indexes & update the selection
    if (!this._mdl.raw) {
      return;
    }
    /*
    const blockedPMCs = new Set<number>();
    if (this._mdl.selectModeExcludeROI) {
      for (const region of this._widgetDataService.regions.values()) {
        if (region.id != PredefinedROIID.AllPoints && region.id != PredefinedROIID.SelectedPoints && this._mdl.raw.visibleROIs.indexOf(region.id) > -1) {
          for (const usedPMC of region.pmcs) {
            blockedPMCs.add(usedPMC);
          }
        }
      }
    }

    const set = new Set<number>();
    for (const pmc of pmcs) {
      // If we're only selecting points that are not in any ROIs, do the filtering here:
      if (!this._mdl.selectModeExcludeROI || !blockedPMCs.has(pmc)) {
        const idx = dataset.pmcToLocationIndex.get(pmc);
        set.add(idx);
      }
    }
*/
    this._selectionService.setSelection(BeamSelection.makeSelectionFromScanEntryIndexSets(scanEntryIndexes), PixelSelection.makeEmptySelection());
  }

  private getIndexforPoint(pt: Point): MouseHoverPoint | null {
    if (this._mdl.raw) {
      const boxSize = HOVER_POINT_RADIUS * 2;

      for (let c = 0; c < this._mdl.drawModel.pointGroupCoords.length; c++) {
        if (!this._mdl.raw.pointGroups[c]) {
          SentryHelper.logMsg(false, "getIndexforPoint raw.pointGroups[" + c + "] is null, pointGroupCoords length=" + this._mdl.drawModel.pointGroupCoords.length);
          continue;
        }

        let i = 0;
        for (const coord of this._mdl.drawModel.pointGroupCoords[c]) {
          if (ptWithinBox(pt, coord, boxSize, boxSize)) {
            return new MouseHoverPoint(this._mdl.raw.pointGroups[c].scanId, this._mdl.raw.pointGroups[c].valuesPerScanEntry[i].scanEntryId, c, i, coord);
          }

          i++;
        }
      }
    }

    return null;
  }
}
