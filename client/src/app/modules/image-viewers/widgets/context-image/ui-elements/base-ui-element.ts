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

import {
  CanvasInteractionHandler,
  CanvasDrawer,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasDrawParameters,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { IContextImageModel } from "../context-image-model-interface";
import { IToolHost } from "../tools/base-context-image-tool";
import { Rect } from "src/app/models/Geometry";
import { Observable, of } from "rxjs";

export class BaseUIElement implements CanvasInteractionHandler, CanvasDrawer {
  constructor(
    protected _ctx: IContextImageModel,
    protected _host: IToolHost
  ) {}

  // CanvasInteractionHandler
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  // CanvasDrawer
  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): Observable<void> {
    // Default is do nothing...
    return of(void 0);
  }

  // Internal draw helpers
  protected drawStrokedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    drawStrokedText(ctx, text, x, y);
  }

  public static keepOnScreen(rect: Rect, screenWidth: number, screenHeight: number, allowOverhangPercent: number): Rect {
    const result = new Rect(rect.x, rect.y, rect.w, rect.h);

    // If more than half of it is off screen in X or Y directions, move it back

    const maxOverhangX = rect.w * allowOverhangPercent;
    const maxOverhangY = rect.h * allowOverhangPercent;

    let overhang = result.maxX() - screenWidth;
    if (overhang >= maxOverhangX) {
      result.x = screenWidth - (rect.w - maxOverhangX);
    }

    if (result.x <= -maxOverhangX) {
      result.x = -maxOverhangX;
    }

    overhang = result.maxY() - screenHeight;
    if (overhang >= maxOverhangY) {
      result.y = screenHeight - (rect.h - maxOverhangY);
    }

    if (result.y <= -maxOverhangY) {
      result.y = -maxOverhangY;
    }

    return result;
  }
}

export function drawStrokedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  // https://stackoverflow.com/questions/7814398/a-glow-effect-on-html5-canvas
  ctx.save();
  ctx.strokeStyle = Colours.GRAY_10.asStringWithA(0.9);
  ctx.fillStyle = Colours.GRAY_100.asString();

  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}
