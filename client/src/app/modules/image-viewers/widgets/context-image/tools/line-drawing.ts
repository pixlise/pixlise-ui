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

import { Point, ptWithinBox } from "src/app/models/Geometry";
import { BaseContextImageTool, ContextImageToolId, IToolHost } from "./base-context-image-tool";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasKeyEvent,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "../context-image-model-interface";

export class LineDrawing extends BaseContextImageTool {
  constructor(ctx: IContextImageModel, host: IToolHost) {
    super(
      ContextImageToolId.DRAW_LINE,
      ctx,
      host,
      "Line Tracing Tool (T)\nDraw lines over context image, visible in element map panels",
      "assets/button-icons/tool-line-draw.svg"
    );
  }

  override activate(): void {
    this._host.setCursor(CursorId.lineDraw);
    this.reset();
  }

  protected reset(): void {
    this._ctx.clearDrawnLinePoints();
  }

  protected addPoint(ptWorld: Point): void {
    // Only add if it's got some distance on it...
    const boxSize = 1 / this._ctx.transform.scale.x;
    if (this._ctx.drawnLinePoints.length == 0 || !ptWithinBox(ptWorld, this._ctx.drawnLinePoints[this._ctx.drawnLinePoints.length - 1], boxSize, boxSize)) {
      this._ctx.addDrawnLinePoint(ptWorld);
    }
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      this.reset();
      this.addPoint(event.point);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // return true;
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DRAG || event.eventId == CanvasMouseEventId.MOUSE_UP) {
      // Save point to expand drawing
      this.addPoint(event.point);
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  override keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    if (event.key == "Escape") {
      this.reset();
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }
  /*
  drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {
    this.drawSelectableLocations(screenContext, this._ctx.highlighedLocationIdx, this._ctx.showPointBBox, this._ctx.showPoints, this._ctx.showPoints);

    // draw the line segments
    if (this._ctx.drawnLinePoints.length > 1) {
      let drawer = new UserLineDrawer(this._ctx);
      drawer.drawWorldSpace(screenContext, drawParams);
    }
  }*/
}
