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

import { ContextImagePan } from "src/app/modules/image-viewers/image-viewers.module";
import {
  CanvasInteractionHandler,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasMouseEventId,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { DatasetCustomisationModel } from "./dataset-customisation-model";
import { Point } from "src/app/models/Geometry";

export class AlignmentInteraction implements CanvasInteractionHandler {
  constructor(private _ctx: DatasetCustomisationModel) {}

  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId == CanvasMouseEventId.MOUSE_WHEEL) {
      const newScale = this._ctx.transform.scale.x * (1 - event.deltaY / 100);
      this._ctx.transform.setScaleRelativeTo(new Point(newScale, newScale), event.point, false);
      return CanvasInteractionResult.redrawAndCatch;
    }

    return ContextImagePan.panZoomMouseMove(event.eventId, event.point, event.mouseDown != null, event.mouseLast, this._ctx.transform);
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }
}
