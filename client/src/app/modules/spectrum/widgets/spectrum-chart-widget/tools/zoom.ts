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
import { CursorId } from "src/app/modules/analysis/components/widget/interactive-canvas/cursor-id";
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasDrawParameters,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { ISpectrumChartModel } from "../spectrum-model-interface";
import { BaseSpectrumTool, ISpectrumToolHost, SpectrumToolId } from "./base-tool";

// Mostly copied from context image zoom tool, but different because:
// We have non-uniform x/y scaling, so we'd have to draw our rect in worldspace with different x/y scaling, so instead
// we just draw in canvas space and convert to worldspace when needed
export class SpectrumZoom extends BaseSpectrumTool {
  private _zoomRectStartCanvasPt: Point | null = null;
  private _zoomRectCurrCanvasPt: Point | null = null;
  private _zoomRectStartWorldPt: Point | null = null;
  private _zoomRectCurrWorldPt: Point | null = null;

  constructor(ctx: ISpectrumChartModel, host: ISpectrumToolHost) {
    super(SpectrumToolId.ZOOM, ctx, host, "Zoom Tool (Z)\nClick to zoom, or draw a box around area of interest", "assets/button-icons/tool-zoom.svg");
  }

  protected reset() {
    this._zoomRectStartCanvasPt = null;
    this._zoomRectCurrCanvasPt = null;
    this._zoomRectStartWorldPt = null;
    this._zoomRectCurrWorldPt = null;
  }

  override activate(): void {
    this._host.setCursor(CursorId.zoomCursor);
    this.reset();
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      if (!this._zoomRectStartCanvasPt) {
        // Set start & curr point
        this._zoomRectStartCanvasPt = this._zoomRectCurrCanvasPt = event.canvasPoint;
        this._zoomRectStartWorldPt = this._zoomRectCurrWorldPt = event.point;
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE || event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      // If we've started drawing, set curr poitn to this one, so rect will get redrawn reflecting mouse movement
      if (this._zoomRectStartCanvasPt) {
        this._zoomRectCurrCanvasPt = event.canvasPoint;
        this._zoomRectCurrWorldPt = event.point;
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
      if (this._zoomRectStartWorldPt && this._zoomRectCurrWorldPt && this._ctx.xAxis) {
        // Calculate the rect & apply zoom
        const rect = this.makeWorldZoomRect(this._zoomRectStartWorldPt, this._zoomRectCurrWorldPt, this._ctx.xAxis.startPx);
        if (rect.w > 0 && rect.h > 0) {
          this._ctx.transform.resetViewToRect(rect, false);
        }
        // else: Invalid rect drawn, prevent div by 0...

        // And we're done!
        this.reset();
        return CanvasInteractionResult.redrawAndCatch;
      }
    }

    return CanvasInteractionResult.neither;
  }

  // Calculates the "world-space" transformed zoom rect, so this is still in canvas coordinates, but includes the
  // transform that the user has set by previous zoom/pan operations
  protected makeWorldZoomRect(zoomRectStartWorldPt: Point, zoomRectCurrWorldPt: Point, startPx: number): Rect {
    const rect = Rect.makeRect(zoomRectStartWorldPt, 0, 0);
    rect.expandToFitPoint(zoomRectCurrWorldPt);

    // The chart axes each add an offset, so apply that to the zoom rect, so it's relative to the data
    const offset = startPx / this._ctx.transform.scale.x;
    rect.x -= offset;
    // FIXME: Known issue - somehow zoom box does not exactly match what we end up showing. Right side of zoom area seems to
    // be contracted towards the left.

    //rect.y -= this._ctx.yAxis.startPx;

    return rect;
  }

  // The following all deal in screen space (well, canvas space), so no transform applied
  override drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (this._zoomRectStartCanvasPt && this._zoomRectCurrCanvasPt) {
      // Draw zoom rect preview
      const rect = this.makeZoomRect(this._zoomRectStartCanvasPt, this._zoomRectCurrCanvasPt);

      this.drawZoomRect(screenContext, rect);

      // And control points
      this.drawCtrlPoint(screenContext, this._zoomRectStartCanvasPt);
      this.drawCtrlPoint(screenContext, this._zoomRectCurrCanvasPt);
    }
  }

  protected makeZoomRect(zoomRectStartCanvasPt: Point, zoomRectCurrCanvasPt: Point): Rect {
    const rect = Rect.makeRect(zoomRectStartCanvasPt, 0, 0);
    rect.expandToFitPoint(zoomRectCurrCanvasPt);
    return rect;
  }

  protected drawZoomRect(screenContext: CanvasRenderingContext2D, rect: Rect): void {
    screenContext.fillStyle = Colours.BLUE.asStringWithA(0.5);
    screenContext.fillRect(rect.x, rect.y, rect.w, rect.h);

    screenContext.lineWidth = 1;
    screenContext.strokeStyle = Colours.BLUE.asString();
    screenContext.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  protected drawCtrlPoint(screenContext: CanvasRenderingContext2D, coord: Point): void {
    // Draw outer
    screenContext.fillStyle = Colours.BLUE.asString();

    const ctrlPtSize = 4;
    const ctrlPtHalfSize = ctrlPtSize / 2;
    screenContext.fillRect(coord.x - ctrlPtHalfSize, coord.y - ctrlPtHalfSize, ctrlPtSize, ctrlPtSize);

    // Draw inner
    screenContext.fillStyle = Colours.WHITE.asString();

    const ctrlPtInnerSize = ctrlPtSize / 2;
    const ctrlPtInnerHalfSize = ctrlPtInnerSize / 2;
    screenContext.fillRect(coord.x - ctrlPtInnerHalfSize, coord.y - ctrlPtInnerHalfSize, ctrlPtInnerSize, ctrlPtInnerSize);
  }
}
