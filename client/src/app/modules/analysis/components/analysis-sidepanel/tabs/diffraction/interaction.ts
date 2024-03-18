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

import { MinMax } from "src/app/models/BasicTypes";
import { Point } from "src/app/models/Geometry";
// import { CursorId } from "src/app/UI/atoms/interactive-canvas/cursor-id";
// import { CanvasInteractionHandler, CanvasInteractionResult, CanvasKeyEvent, CanvasMouseEvent, CanvasMouseEventId } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { DiffractionHistogramModel } from "./model";
import {
  CanvasInteractionHandler,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasMouseEvent,
  CanvasMouseEventId,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";

export class HistogramInteraction implements CanvasInteractionHandler {
  private _addToSelectionMode: boolean = true;
  private _lastDragBarIdx: number = -1;

  constructor(private _mdl: DiffractionHistogramModel) {}

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (!this._mdl.drawData) {
      this._mdl.recalcDisplayData(event.canvasParams);
    }

    if (!this._mdl.drawData) {
      return CanvasInteractionResult.neither;
    }
    // If user is just hovering, we can suggest add/subtract from selection based on mouse cursors
    // and we also highlight what bar they're over
    if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      let barIdx = this.getBarIdx(event.canvasPoint);

      if (barIdx != this._mdl.hoverBarIdx) {
        let isSelectedBar = false;
        if (barIdx >= 0) {
          let rawBars = this._mdl.raw?.bars || [];
          isSelectedBar = this._mdl.selectionOwner.iskeVRangeSelected(rawBars[barIdx].keV + DiffractionHistogramModel.keVBinWidth / 2);
        }

        if (!this._mdl?.drawData?.dataArea?.containsPoint(event.canvasPoint)) {
          this._mdl.cursorShown = CursorId.defaultPointer;
        } else {
          if (isSelectedBar) {
            this._mdl.cursorShown = CursorId.histogramBarPickDelCursor;
          } else {
            this._mdl.cursorShown = CursorId.histogramBarPickAddCursor;
          }
        }

        if (barIdx >= 0 && this._mdl.drawData.bars[barIdx].bar.value > 0) {
          this._mdl.setHover(event.canvasPoint, barIdx);
        } else {
          this._mdl.setHover(new Point(), -1);
        }

        return CanvasInteractionResult.redrawOnly;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      this._lastDragBarIdx = -1; // haven't processed a drag yet

      let barIdx = this.getBarIdx(event.canvasPoint);
      if (barIdx >= 0) {
        this._mdl.setHover(new Point(), -1);

        // User is clicking on a bar, decide if we're add or subtract mode
        let rawBars = this._mdl.raw?.bars || [];
        this._addToSelectionMode = !this._mdl.selectionOwner.iskeVRangeSelected(rawBars[barIdx].keV + DiffractionHistogramModel.keVBinWidth / 2);
        if (this._addToSelectionMode) {
          this._mdl.cursorShown = CursorId.histogramBarPickAddCursor;
        } else {
          this._mdl.cursorShown = CursorId.histogramBarPickDelCursor;
        }
      }
      return CanvasInteractionResult.neither;
    } else if (/*event.eventId == CanvasMouseEventId.MOUSE_DRAG ||*/ event.eventId == CanvasMouseEventId.MOUSE_UP) {
      // User has clicked and is now dragging mouse, we select new bars as the mouse enters them
      // but if first bar was ALREADY selected, we're unselecting!
      let barIdx = this.getBarIdx(event.canvasPoint);

      // Mouse up - always do this... otherwise we only do it if dragged over new bar
      if (barIdx != this._lastDragBarIdx) {
        let bar = this._mdl.drawData.bars[barIdx].bar;
        let keVRange = new MinMax(bar.keV, bar.keV + DiffractionHistogramModel.keVBinWidth);

        this._mdl.selectionOwner.setkeVRangeSelected(keVRange, this._addToSelectionMode, event.eventId == CanvasMouseEventId.MOUSE_UP);

        // Remember this is done...
        this._lastDragBarIdx = barIdx;

        // Redraw to show the result
        return CanvasInteractionResult.redrawOnly;
      }
    }

    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  protected getBarIdx(canvasPt: Point): number {
    let drawData = this._mdl.drawData;
    if (drawData) {
      for (let c = 0; c < drawData.bars.length; c++) {
        let bar = drawData.bars[c];

        // We used to check against rectangle, but if rect is 0 in height (or small), users didn't get to see
        // a tooltip for this bar! Now easier...
        //if(bar.rect.containsPoint(canvasPt))
        if (canvasPt.y < bar.rect.maxY() && canvasPt.x > bar.rect.x && canvasPt.x < bar.rect.maxX()) {
          return c;
        }
      }
    }

    return -1;
  }
}
