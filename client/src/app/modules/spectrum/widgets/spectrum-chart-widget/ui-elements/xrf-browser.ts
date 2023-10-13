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

import { Point, Rect } from "src/app/models/Geometry";
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasDrawParameters,
  CanvasParams,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { XRFLine } from "src/app/periodic-table/XRFLine";
import { Colours } from "src/app/utils/colours";
import { ISpectrumChartModel } from "../spectrum-model-interface";
import { BaseUIElement } from "./base-ui-element";

const triangleHeight = 12;

export class XRFBrowser extends BaseUIElement {
  private _drag: boolean = false;
  private _mouseHovering: boolean = false;

  constructor(ctx: ISpectrumChartModel) {
    super(ctx);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (this._ctx.xrfNearMouse.keV <= 0) {
      return CanvasInteractionResult.neither;
    }

    // If the mouse is over us, we hijack any drag events
    this._mouseHovering = false;

    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      const pos = this.calcCursorPosPx(event.canvasParams);
      if (pos.containsPoint(event.canvasPoint)) {
        // Dragging our cursor, hijack events
        this._drag = true;
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DRAG && this._drag && this._ctx.xAxis) {
      this._ctx.setEnergyAtMouse(this._ctx.xAxis.canvasToValue(event.canvasPoint.x));
      return CanvasInteractionResult.redrawAndCatch;
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP && this._drag && this._ctx.xAxis) {
      this._ctx.setEnergyAtMouse(this._ctx.xAxis.canvasToValue(event.canvasPoint.x));
      //this._ctx.setEnergyAtMouse(0);
      this._drag = false;
      return CanvasInteractionResult.redrawOnly;
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE && !this._drag) {
      // If user is over the cursor area
      const pos = this.calcCursorPosPx(event.canvasParams);
      if (pos.containsPoint(event.canvasPoint)) {
        this._mouseHovering = true;
        return CanvasInteractionResult.redrawOnly;
      }
    }

    return CanvasInteractionResult.neither;
  }

  override drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (this._ctx.xrfNearMouse.keV <= 0) {
      return;
    }

    this.drawCursor(screenContext, drawParams.drawViewport);
    this.drawGhostLines(screenContext, drawParams.drawViewport);
  }

  private calcCursorPosPx(viewport: CanvasParams): Rect {
    if (!this._ctx.xAxis || !this._ctx.yAxis) {
      return new Rect(0, 0, 0, 0);
    }
    const w = 12;

    const x = this._ctx.xAxis.valueToCanvas(this._ctx.xrfNearMouse.keV);
    const h = viewport.height - this._ctx.yAxis.startPx;

    return new Rect(x - w * 0.5, 0, w, h);
  }

  private drawCursor(screenContext: CanvasRenderingContext2D, viewport: CanvasParams): void {
    const pos = this.calcCursorPosPx(viewport);
    const posCenter = pos.center();

    if (pos.x < this._ctx.chartArea.x) {
      return;
    }

    let clr = Colours.PURPLE.asString();
    let lineW = 1;

    if (this._mouseHovering || this._drag) {
      clr = Colours.GRAY_10.asString();
      lineW = 2;
    }

    screenContext.fillStyle = clr;
    screenContext.strokeStyle = clr;
    screenContext.lineWidth = lineW;

    screenContext.beginPath();
    screenContext.moveTo(posCenter.x, pos.maxY() - triangleHeight);
    screenContext.lineTo(pos.x, pos.maxY());
    screenContext.lineTo(pos.maxX(), pos.maxY());
    screenContext.closePath();
    screenContext.fill();

    screenContext.beginPath();
    screenContext.moveTo(posCenter.x, pos.y + triangleHeight);
    screenContext.lineTo(pos.x, pos.y);
    screenContext.lineTo(pos.maxX(), pos.y);
    screenContext.closePath();

    screenContext.fill();

    // Draw a dotted line between them
    screenContext.setLineDash([5, 3]);

    screenContext.beginPath();
    screenContext.moveTo(posCenter.x, pos.y + triangleHeight);
    screenContext.lineTo(posCenter.x, pos.maxY() - triangleHeight);
    screenContext.stroke();

    screenContext.setLineDash([]);
  }

  private calcLineTopPixelPos(line: XRFLine): Point {
    if (!this._ctx.xAxis || !this._ctx.yAxis) {
      return new Point(0, 0);
    }

    // If we have a Y, use it
    let yMax = this._ctx.lineRangeY.max;

    // Prevent null crap-out, but not sure what implications this has for bugs...
    if (yMax === null) {
      yMax = 0;
    }

    // eslint-disable-next-line prettier/prettier
    return new Point(
      Math.floor(this._ctx.xAxis.valueToCanvas(line.eV / 1000)),
      Math.floor(this._ctx.yAxis.valueToCanvas(line.intensity * yMax))
    );
  }

  private drawGhostLines(screenContext: CanvasRenderingContext2D, viewport: CanvasParams): void {
    if (!this._ctx.yAxis) {
      return;
    }

    const ghostLineRangekeVHalf = this._ctx.xrfNearMouse.keVDisplayed.getRange() / 4;
    const grayShade = Colours.GRAY_30;
    const yBottom = viewport.height - this._ctx.yAxis.startPx;

    for (const line of this._ctx.xrfNearMouse.lines) {
      const lineTop = this.calcLineTopPixelPos(line);
      if (lineTop.x > this._ctx.chartArea.x) {
        const xDistFromMouseEv = Math.abs(line.eV / 1000 - this._ctx.xrfNearMouse.keV);
        const factor = 1 - xDistFromMouseEv / ghostLineRangekeVHalf;

        const ghostColour = grayShade.asStringWithA(0.4 * factor);
        this.drawXRFLine(screenContext, lineTop.x, yBottom, lineTop.y, ghostColour);
      }
    }
  }

  private drawXRFLine(screenContext: CanvasRenderingContext2D, x: number, yBottom: number, yTop: number, colour: string): void {
    // Y axis is backwards. We expect the bottom of the line to be y=less than top of line.
    // If not, line top is below our Y min on the chart, so don't draw
    if (yBottom < yTop) {
      return;
    }

    // Set colours
    screenContext.strokeStyle = colour;
    screenContext.fillStyle = colour;

    // Make things bigger if it's the line we're mouse "hovering" over
    const pinSize = 2;
    screenContext.lineWidth = 1;

    // Draw a line
    screenContext.beginPath();
    screenContext.moveTo(x, yBottom);
    screenContext.lineTo(x, yTop);
    screenContext.stroke();

    // And a pin head
    screenContext.beginPath();
    screenContext.arc(x, yTop, pinSize, 0, 2 * Math.PI);
    screenContext.fill();
  }
}
