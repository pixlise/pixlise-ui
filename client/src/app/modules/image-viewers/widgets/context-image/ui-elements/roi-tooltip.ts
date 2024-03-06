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

import { Point, ptWithinPolygon } from "src/app/models/Geometry";
import {
  CanvasDrawParameters,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { drawToolTip, CANVAS_FONT_SIZE } from "src/app/utils/drawing";
import { IContextImageModel } from "../context-image-model-interface";
import { BaseUIElement } from "./base-ui-element";
import { IToolHost } from "../tools/base-context-image-tool";

// Draws a tooltip when the mouse is over an ROI showing the ROI name
class ROI {
  constructor(
    public name: string,
    public description: string
  ) {}
}

export class ROIToolTip extends BaseUIElement {
  protected _lastROIPointedTo: ROI | null = null;
  protected _lastMouseCanvasPoint: Point = new Point(0, 0);

  constructor(ctx: IContextImageModel, host: IToolHost) {
    super(ctx, host);
  }

  override draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {
    // Draw the physical image scale (mm)
    if (this._lastROIPointedTo) {
      drawToolTip(screenContext, this._lastMouseCanvasPoint, false, false, this._lastROIPointedTo.name, this._lastROIPointedTo.description, CANVAS_FONT_SIZE);
    }
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    // If the mouse is over us, we hijack any drag events
    if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      const roiPointedTo = this.getROIIdAtPoint(event.point);
      if (roiPointedTo != this._lastROIPointedTo) {
        this._lastROIPointedTo = roiPointedTo;
        this._lastMouseCanvasPoint = event.canvasPoint;
        return CanvasInteractionResult.redrawOnly;
      }
    }

    return CanvasInteractionResult.neither;
  }

  protected getROIIdAtPoint(pt: Point): ROI | null {
    // Draw the ROI name near the mouse
    for (const [scanId, scanDrawMdl] of this._ctx.drawModel.scanDrawModels) {
      for (const roi of scanDrawMdl.regions) {
        for (const poly of roi.polygons) {
          // Check if we're within a polygon
          if (poly.polygonBBox.containsPoint(pt) && ptWithinPolygon(pt, poly.boundaryPoints)) {
            // Check that we're not over a hole
            let ptInHole = false;
            for (let holeIdx = 0; holeIdx < poly.holePolygons.length; holeIdx++) {
              if (poly.holeBBoxes[holeIdx].containsPoint(pt) && ptWithinPolygon(pt, poly.holePolygons[holeIdx])) {
                ptInHole = true;
                break;
              }
            }

            if (!ptInHole) {
              // Point is within poly, and not within one of its holes, so we're done
              return new ROI(roi.name, `${roi.polygons.length} Points`);
            }
          }
        }
      }
    }

    return null;
  }
}
