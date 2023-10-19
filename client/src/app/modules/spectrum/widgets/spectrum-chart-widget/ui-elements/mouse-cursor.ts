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
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasDrawParameters,
  CanvasParams,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE, CANVAS_FONT_SIZE_TITLE, TooltipText, drawToolTip } from "src/app/utils/drawing";
import { ISpectrumChartModel } from "../spectrum-model-interface";
import { BaseUIElement } from "./base-ui-element";

const COMPARE_DISTANCE_PIXELS = 4;
const HOVER_POINT_RADIUS = 8;

export class MouseCursor extends BaseUIElement {
  private _lastMousePos: Point | null = null;
  private _hoverTitle: string = "";
  private _hoverText: TooltipText[] = [];
  private _hoverPoint: Point | null = null;
  private _hoverOverlayPos: Point | null = null;
  private _hoverOverlayLeftOfCursor: boolean = true;

  constructor(ctx: ISpectrumChartModel) {
    super(ctx);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    // If the mouse is over us, we hijack any drag events
    if (event.eventId == CanvasMouseEventId.MOUSE_MOVE || event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      this._lastMousePos = event.canvasPoint;
      /*
console.log('------------------------------------------------------------');
console.log('mouse canvasPoint: '+event.canvasPoint.x.toLocaleString()+','+event.canvasPoint.y.toLocaleString());
console.log('mouse worldPoint: '+event.point.x.toLocaleString()+','+event.point.y.toLocaleString());
console.log('mouse pct: '+this._ctx.xAxis.canvasToPct(event.canvasPoint.x).toLocaleString()+','+this._ctx.yAxis.canvasToPct(event.canvasPoint.y).toLocaleString());
console.log('mouse value: '+this._ctx.xAxis.canvasToValue(event.canvasPoint.x).toLocaleString()+','+this._ctx.yAxis.canvasToValue(event.canvasPoint.y).toLocaleString());
*/
      this.checkHover(this._lastMousePos);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_LEAVE) {
      this._lastMousePos = null;
    }

    return CanvasInteractionResult.redrawOnly;
  }

  override drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Don't show in left margin or if no mouse detected yet
    if (this._lastMousePos === null || !this._ctx.xAxis || this._lastMousePos.x < this._ctx.xAxis.startPx) {
      return;
    }

    this.drawCursor(screenContext, drawParams.drawViewport);
    this.drawHoverValue(screenContext, drawParams.drawViewport);
  }

  private drawCursor(screenContext: CanvasRenderingContext2D, viewport: CanvasParams): void {
    if (!this._lastMousePos || !this._ctx.xAxis || !this._ctx.yAxis) {
      return;
    }

    // Draw a cursor & label for this value
    const value = this._ctx.xAxis.canvasToValue(this._lastMousePos.x);

    screenContext.strokeStyle = Colours.GRAY_30.asString();
    screenContext.lineWidth = 1;

    screenContext.beginPath();
    screenContext.moveTo(this._lastMousePos.x, viewport.height - this._ctx.yAxis.startPx);
    screenContext.lineTo(this._lastMousePos.x, viewport.height - this._ctx.yAxis.endPx);
    screenContext.stroke();

    // Draw text for it too
    screenContext.textAlign = this.getTextAlign(this._lastMousePos.x);
    screenContext.textBaseline = "top";
    screenContext.font = CANVAS_FONT_SIZE_TITLE - 2 + "px Roboto";
    screenContext.fillStyle = Colours.GRAY_30.asString();

    screenContext.fillText(this._ctx.makePrintableXValue(value), this._lastMousePos.x, viewport.height - this._ctx.yAxis.startPx + 2);
  }

  private getTextAlign(drawX: number): CanvasTextAlign {
    if (this._ctx.xAxis && this._ctx.yAxis) {
      const midline = this._ctx.xAxis.startPx + this._ctx.xAxis.pxLength / 2;
      if (drawX > midline) {
        return "right";
      }
    }

    return "left";
  }

  private drawHoverValue(screenContext: CanvasRenderingContext2D, viewport: CanvasParams): void {
    if (!this._hoverPoint) {
      return;
    }

    // Draw a circle at the point
    screenContext.strokeStyle = Colours.PURPLE.asString();
    screenContext.lineWidth = 1;

    screenContext.beginPath();
    screenContext.arc(this._hoverPoint.x, this._hoverPoint.y, HOVER_POINT_RADIUS, 0, 2 * Math.PI);
    screenContext.stroke();

    // Draw hover info overlay
    if (this._hoverOverlayPos) {
      drawToolTip(
        screenContext,
        this._hoverOverlayPos,
        this._hoverOverlayLeftOfCursor,
        this._hoverOverlayPos.y > viewport.height * 0.75,
        this._hoverTitle,
        this._hoverText,
        CANVAS_FONT_SIZE
      );
    }
  }

  private checkHover(canvasPt: Point): void {
    this._hoverTitle = "";
    this._hoverText = [];
    this._hoverPoint = null;
    this._hoverOverlayPos = null;

    if (!this._ctx.xAxis || !this._ctx.yAxis) {
      return;
    }

    // Get in value coordinates
    const xValue = this._ctx.xAxis.canvasToValue(canvasPt.x);
    /*
        if(pctX < 0 || pctX >= 1)
        {
            // not within data range
            return;
        }
*/
    // Run through all lines, if we intersect any, we have to show the value
    for (const line of this._ctx.spectrumLines) {
      // In simple case without calibration on X axis, this is our channel value already
      let idx = Math.round(xValue);

      if (this._ctx.xAxisEnergyScale) {
        // X is calibrated, showing keV. We need to use the calibration to lookup the index
        let det = line.getDetector();
        if (!det) {
          det = "A";
        }

        const ch = this._ctx.keVToChannel(xValue, line.scanId, det);
        if (ch !== null) {
          idx = ch;
        }
      }

      // Might find one that's a little further away, so check previous one
      if (idx > 0) {
        const idxX = this._ctx.xAxis.valueToCanvas(line.xValues[idx]);
        const prevIdxX = this._ctx.xAxis.valueToCanvas(line.xValues[idx - 1]);

        if (Math.abs(canvasPt.x - prevIdxX) < Math.abs(canvasPt.x - idxX)) {
          idx--;
        } else if (idx < line.xValues.length - 1) {
          // Check next one up too
          const nextIdxX = this._ctx.xAxis.valueToCanvas(line.xValues[idx + 1]);

          if (Math.abs(canvasPt.x - nextIdxX) < Math.abs(canvasPt.x - idxX)) {
            idx++;
          }
        }
      }

      const linePt = new Point(this._ctx.xAxis.valueToCanvas(line.xValues[idx]), this._ctx.yAxis.valueToCanvas(line.values[idx]));

      if (Math.abs(canvasPt.y - linePt.y) < COMPARE_DISTANCE_PIXELS && Math.abs(canvasPt.x - linePt.x) < COMPARE_DISTANCE_PIXELS) {
        const lineXValue = line.xValues[idx];

        this._hoverTitle = "Scan: " + line.scanName;
        this._hoverText = [
          { text: this._ctx.makePrintableXValue(lineXValue), colour: Colours.GRAY_10 },
          { text: line.roiName + " " + line.expressionLabel + ": " + line.values[idx].toLocaleString(), colour: Colours.GRAY_10 },
        ];
        this._hoverPoint = new Point(this._ctx.xAxis.valueToCanvas(lineXValue), linePt.y);

        // Figure out where the hover label rect will go
        const align = this.getTextAlign(this._hoverPoint.x);
        this._hoverOverlayLeftOfCursor = align == "right"; // If text is right aligned, label is on left of cursor
        this._hoverOverlayPos = new Point(
          this._hoverPoint.x + (this._hoverOverlayLeftOfCursor ? -HOVER_POINT_RADIUS : HOVER_POINT_RADIUS),
          this._hoverPoint.y + HOVER_POINT_RADIUS
        );

        //console.log('Hovering over: '+line.label+', px xy='+canvasPt.x+','+canvasPt.y+', value xy='+valuePt.x+','+valuePt.y+', line xy='+line.xValues[idx]+','+line.values[idx]);
        return;
      }
    }
  }
}
