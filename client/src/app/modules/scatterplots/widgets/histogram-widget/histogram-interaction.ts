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
import { HistogramDrawBar, HistogramModel } from "./histogram-model";
import {
  CanvasInteractionHandler,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasKeyEvent,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";

export class HistogramToolHost implements CanvasInteractionHandler {
  constructor(private _mdl: HistogramModel) {}

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    this._mdl.recalcDisplayDataIfNeeded(event.canvasParams);

    if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // Hover handling if mouse is over a bar
      const bar = this.getBar(event.canvasPoint);
      if (bar != this._mdl.hoverBar) {
        if (bar) {
          this._mdl.setHover(event.canvasPoint, bar);
        } else {
          this._mdl.setHover(null, null);
        }

        return CanvasInteractionResult.redrawOnly;
      }
    }

    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  protected getBar(canvasPt: Point): HistogramDrawBar | null {
    if (this._mdl.drawModel) {
      for (const bar of this._mdl.drawModel.bars) {
        // We used to check against rectangle, but if rect is 0 in height (or small), users didn't get to see
        // a tooltip for this bar! Now easier...
        //if(bar.rect.containsPoint(canvasPt))
        if (canvasPt.y < bar.rect.maxY() && canvasPt.x > bar.rect.x && canvasPt.x < bar.rect.maxX()) {
          return bar;
        }
      }
    }

    return null;
  }
}
