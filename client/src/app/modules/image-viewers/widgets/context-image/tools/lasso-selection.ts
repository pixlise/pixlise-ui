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

import { Point, ptWithinBox, ptWithinPolygon, Rect } from "src/app/models/Geometry";
import { BaseContextImageTool, ContextImageToolId, IToolHost } from "./base-context-image-tool";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasDrawParameters,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "../context-image-model-interface";

export class LassoSelection extends BaseContextImageTool {
  private lassoPoints: Point[] = [];

  constructor(ctx: IContextImageModel, host: IToolHost) {
    super(ContextImageToolId.SELECT_LASSO, ctx, host, "Lasso Tool (O)\nDraw a shape around area of interest", "assets/button-icons/tool-lasso.svg");
  }

  override activate(): void {
    this._host.setCursor(this._ctx.selectionModeAdd ? CursorId.lassoCursorAdd : CursorId.lassoCursorDel);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      //console.log(ptWithinPolygon(new Point(50, 80), [new Point(40, 40), new Point(60, 60), new Point(70, 100), new Point(30, 120)]));

      // Start a lasso drawing
      this.lassoPoints = [event.point];
      return CanvasInteractionResult.redrawAndCatch;
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // return true;
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      // Save point to expand drawing
      this.addLassoPoint(event.point);
      return CanvasInteractionResult.redrawAndCatch;
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
      // Mouse released, select all points that are within the drawn region
      this.selectPointsWithinLasso();

      // Clear drawing
      this.lassoPoints = [];
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  override draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {
    const clr = this.getModeColour();
    screenContext.strokeStyle = clr;
    screenContext.lineWidth = this.getDrawLineWidth();

    // Draw the lasso polygon if any
    if (this.lassoPoints.length > 0) {
      screenContext.beginPath();
      screenContext.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);

      for (const idx in this.lassoPoints) {
        screenContext.lineTo(this.lassoPoints[idx].x, this.lassoPoints[idx].y);
      }

      screenContext.closePath();

      screenContext.stroke();
    }
  }

  private addLassoPoint(ptWorld: Point): void {
    // If it's too similar, don't add
    const boxSize = 1 / this._ctx.transform.scale.x;
    if (!ptWithinBox(ptWorld, this.lassoPoints[this.lassoPoints.length - 1], boxSize, boxSize)) {
      this.lassoPoints.push(ptWorld);
    }
  }

  // Return true if something was changed
  private selectPointsWithinLasso(): void {
    // If not enough points...
    if (this.lassoPoints.length < 3) {
      return;
    }

    const bbox = Rect.makeRect(this.lassoPoints[0], 0, 0);
    bbox.expandToFitPoints(this.lassoPoints);

    // Here we loop through all locations in the dataset, find  all points that are within the polygon
    const selectedPMCsPerScan = new Map<string, Set<number>>();
    for (const scanId of this._ctx.scanIds) {
      const selectedPMCs = new Set<number>();
      const mdl = this._ctx.getScanModelFor(scanId);
      if (mdl) {
        for (const loc of mdl.scanPoints) {
          if (loc.coord && ptWithinPolygon(loc.coord, this.lassoPoints, bbox)) {
            selectedPMCs.add(loc.PMC);
          }
        }
      }
      selectedPMCsPerScan.set(scanId, selectedPMCs);
    }

    const pixels: Set<number> = new Set<number>();

    // If we're operating on an RGBU image, also select pixels!
    if (this._ctx.rgbuSourceImage) {
      const imgWidth = this._ctx.rgbuSourceImage.r.width;
      const imgHeight = this._ctx.rgbuSourceImage.r.height;

      // Dumb quick to code method, just run through every pixel and if it's within the polygon, add it
      const bbox = Rect.makeRect(this.lassoPoints[0], 0, 0);
      bbox.expandToFitPoints(this.lassoPoints);

      const currentSelection = this._host.getSelectionService().getCurrentSelection();
      const isCropped = currentSelection && currentSelection.cropSelection && currentSelection.cropSelection.selectedPixels.size > 0;
      const cropSelection = currentSelection.cropSelection;

      for (let y = 0; y < imgHeight; y++) {
        for (let x = 0; x < imgWidth; x++) {
          // Dont check if the point is within the polygon if the image is cropped and the pixel is outside selection
          if (isCropped && cropSelection && !cropSelection.isPixelSelected(y * imgWidth + x)) {
            continue;
          }

          // NOTE: here we have to account for the transform of the image too!
          const pt = new Point(x, y);

          if (this._ctx.imageTransform) {
            pt.x += this._ctx.imageTransform.xOffset;
            pt.x /= this._ctx.imageTransform.xScale;

            pt.y += this._ctx.imageTransform.yOffset;
            pt.y /= this._ctx.imageTransform.yScale;
          }

          if (ptWithinPolygon(pt, this.lassoPoints, bbox)) {
            pixels.add(y * imgWidth + x);
          }
        }
      }
    }

    // If we're adding to the selection, add, otherwise remove each
    this.applyToSelection(selectedPMCsPerScan, null, false, pixels);
  }
}
