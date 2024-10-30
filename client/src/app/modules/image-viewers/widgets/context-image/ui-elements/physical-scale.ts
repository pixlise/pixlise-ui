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

import { getVectorBetweenPoints, Point, Rect } from "src/app/models/Geometry";
import { BaseUIElement } from "./base-ui-element";
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasDrawParameters,
  CanvasParams,
  CanvasWorldTransform,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE, drawTextWithBackground } from "src/app/utils/drawing";
import { nearestRoundValue } from "src/app/utils/utils";
import { IContextImageModel } from "../context-image-model-interface";
import { IToolHost } from "../tools/base-context-image-tool";
import { Observable, of } from "rxjs";

class scalePosition {
  constructor(
    public rect: Rect,
    public roundedmm: number,
    public uniformConversion: boolean // False indicates we have MULTIPLE different conversions between pixels->mm (multiple scans)
  ) {}
}

const SCALE_FONT_SIZE = CANVAS_FONT_SIZE_TITLE - 1;

export class PhysicalScale extends BaseUIElement {
  private _captureMouse = false;
  private _startTranslation: Point = new Point(0, 0);

  constructor(ctx: IContextImageModel, host: IToolHost) {
    super(ctx, host);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (!this._ctx.imageName) {
      // No physical scale to draw if we don't have an image to calculate scale with
      return CanvasInteractionResult.neither;
    }

    // If the mouse is over us, we hijack any drag events
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      const pos = this.getPosition(event.canvasParams, this._ctx.transform);
      if (pos.rect.containsPoint(event.canvasPoint)) {
        this._captureMouse = true;
        this._startTranslation = this._ctx.uiPhysicalScaleTranslation.copy();
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (this._captureMouse) {
      if (event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
        const moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);

        this._ctx.uiPhysicalScaleTranslation = moved.copy();
        if (this._startTranslation) {
          this._ctx.uiPhysicalScaleTranslation.x += this._startTranslation.x;
          this._ctx.uiPhysicalScaleTranslation.y += this._startTranslation.y;
        }
        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.eventId == CanvasMouseEventId.MOUSE_UP /*|| event.eventId == CanvasMouseEventId.MOUSE_LEAVE*/) {
        this._captureMouse = false;

        const pos = this.getPosition(event.canvasParams, this._ctx.transform);
        const moveTo = BaseUIElement.keepOnScreen(
          new Rect(pos.rect.x, pos.rect.y, pos.rect.w, pos.rect.h),
          event.canvasParams.width,
          event.canvasParams.height,
          0.25
        );

        this._ctx.uiPhysicalScaleTranslation.x += moveTo.x - pos.rect.x;
        this._ctx.uiPhysicalScaleTranslation.y += moveTo.y - pos.rect.y;

        this._startTranslation = new Point(0, 0);
      }
    }

    return CanvasInteractionResult.neither;
  }

  override draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): Observable<void> {
    if (!this._ctx.imageName) {
      // No physical scale to draw if we don't have an image to calculate scale with
    } else {
      // Draw the physical image scale (mm)
      this.drawPhysicalScale(screenContext, drawParams.drawViewport, drawParams.worldTransform);
    }
    return of(void 0);
  }

  protected getPosition(viewport: CanvasParams, transform: CanvasWorldTransform): scalePosition {
    // So we have a image pixels -> mm conversion ratio, we have to find the first scan we have points for
    // and use its conversion.
    // NOTE: if there are other scans with different conversions, we show a warning
    let mmConversion = 0;
    let uniformConversion = true;

    for (const scanMdl of this._ctx.drawModel.scanDrawModels.values()) {
      if (mmConversion > 0 && mmConversion != scanMdl.contextPixelsTommConversion) {
        uniformConversion = false;
      }
      mmConversion = scanMdl.contextPixelsTommConversion;
    }

    const scaleTextPadY = 7;

    const scaleMinSize = 100;
    const edgeMarginX = 56;
    const edgeMarginY = 16;

    // Go from pixels on screen to pixels in context image, by taking the zoom effect out
    const contextImagePixelsWidth = scaleMinSize / transform.getScale().x;
    const mm = contextImagePixelsWidth * mmConversion;

    // We want to find the smallest mm value that's nearest
    const roundedmm = nearestRoundValue(mm);

    // Now that we have a "nice" round number of mm to show on the scale, we need to go back the
    // other way to work out how many pixels to draw on screen for the width of the scale
    const scaleLength = (roundedmm * transform.getScale().x) / mmConversion;

    const h = SCALE_FONT_SIZE + scaleTextPadY;

    const x = viewport.width - edgeMarginX - scaleLength + this._ctx.uiPhysicalScaleTranslation.x;
    const y = viewport.height - edgeMarginY - h + this._ctx.uiPhysicalScaleTranslation.y - 10; /*room for PMC hover tooltip*/

    return new scalePosition(new Rect(x, y, scaleLength, h), roundedmm, uniformConversion);
  }

  protected drawPhysicalScale(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, transform: CanvasWorldTransform): void {
    const pos = this.getPosition(viewport, transform);

    // Here we work out what size to make the scale bar. We want something that's a multiple of a round unit
    const scaleTextPadding = 2;
    const scaleTickHeight = 5;

    const yTop = pos.rect.y;
    const yBottom = pos.rect.maxY();

    // Drawing the scale line as black with white outline
    screenContext.strokeStyle = Colours.WHITE.asString();
    screenContext.lineWidth = 4;
    let tickHeight = scaleTickHeight;

    for (let c = 0; c < 2; c++) {
      if (c) {
        screenContext.lineWidth = 2;
        screenContext.strokeStyle = Colours.BLACK.asString();
        tickHeight = scaleTickHeight - 1;
      }

      screenContext.beginPath();
      screenContext.moveTo(pos.rect.x, yBottom - tickHeight);
      screenContext.lineTo(pos.rect.x, yBottom);
      screenContext.lineTo(pos.rect.maxX(), yBottom);
      screenContext.lineTo(pos.rect.maxX(), yBottom - tickHeight);
      screenContext.stroke();
    }

    screenContext.textBaseline = "top";
    screenContext.textAlign = "end";
    screenContext.font = SCALE_FONT_SIZE + "px Roboto";

    const warning = pos.uniformConversion ? "" : " (1st scan)";

    //this.drawStrokedText(screenContext, this.printableValue(pos.roundedmm)+' mm', pos.rect.maxX()-scaleTextPadX, yTop+SCALE_FONT_SIZE);
    drawTextWithBackground(
      screenContext,
      this.printableValue(pos.roundedmm) + " mm" + warning,
      pos.rect.maxX() - scaleTextPadding,
      yTop - scaleTextPadding,
      SCALE_FONT_SIZE,
      scaleTextPadding
    );
  }

  protected printableValue(value: number): string {
    return value.toString();
  }
}
