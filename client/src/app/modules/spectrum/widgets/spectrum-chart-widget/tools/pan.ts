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

import { Point, vectorsEqual } from "src/app/models/Geometry";
import { CursorId } from "src/app/modules/analysis/components/widget/interactive-canvas/cursor-id";
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { ISpectrumChartModel } from "../spectrum-model-interface";
import { BaseSpectrumTool, ISpectrumToolHost, SpectrumToolId } from "./base-tool";

// TODO: Mostly copied from context image, can probably unify
export class SpectrumPan extends BaseSpectrumTool {
  constructor(ctx: ISpectrumChartModel, host: ISpectrumToolHost) {
    super(SpectrumToolId.PAN, ctx, host, "Pan Tool (Shift)\nClick and drag to move the context image in viewport", "assets/button-icons/tool-pan.svg");
  }

  override activate(): void {
    this._host.setCursor(CursorId.panCursor);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return this.panZoomMouseMove(event);
  }

  protected panZoomMouseMove(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId == CanvasMouseEventId.MOUSE_DRAG || (event.eventId == CanvasMouseEventId.MOUSE_UP && event.mouseDown)) {
      const drag = new Point(event.point.x - event.mouseLast.x, event.point.y - event.mouseLast.y);
      const newPan = new Point(this._ctx.transform.pan.x + drag.x * this._ctx.transform.scale.x, this._ctx.transform.pan.y + drag.y * this._ctx.transform.scale.y);

      // If there is no change, don't do anything!
      // We do want to forward mouse up msgs, because they end our pan cycle...
      if (event.eventId == CanvasMouseEventId.MOUSE_UP || !vectorsEqual(this._ctx.transform.pan, newPan)) {
        this._ctx.transform.setPan(newPan, event.eventId == CanvasMouseEventId.MOUSE_UP);
      }
      /*
let pct = this._ctx.yAxis.valueToPct(0);
let canvas = this._ctx.yAxis.pctToCanvas(pct);
console.log('Y0: pct='+pct+', canvas='+canvas);
console.log(this._ctx.yAxis);
*/
      //console.log('Y0='+this._ctx.yAxis.valueToCanvas(0));
      // NOTE: Returning true for redraw is not needed because canvas is subscribed to panzoom changes
      return CanvasInteractionResult.neither;
    }

    // If the mouse just went up, we want to be able to set the final pan value, so do that here
    // NOTE: we just use the existing value

    return CanvasInteractionResult.neither;
  }
}
