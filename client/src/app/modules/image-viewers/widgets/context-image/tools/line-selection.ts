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

import { closestDistanceBetweenPointAndLine, getVectorBetweenPoints, getVectorLength, Point, scaleVector } from "src/app/models/Geometry";
import { BaseContextImageTool, ContextImageToolId, IToolHost } from "./base-context-image-tool";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasDrawParameters,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "../context-image-model-interface";

export class LineSelection extends BaseContextImageTool {
  private startPoint: Point | null = null;
  private endPointPreview: Point | null = null;
  /*
    private startPointCanvas: Point = null;
    private endPointPreviewCanvas: Point = null;
*/
  private justStarted = false;

  constructor(ctx: IContextImageModel, host: IToolHost) {
    super(ContextImageToolId.SELECT_LINE, ctx, host, "Line Select (L)\nDraw a line to select nearby points", "assets/button-icons/tool-line-select.svg");
  }

  override activate(): void {
    this.reset();

    this._host.setCursor(this._ctx.selectionModeAdd ? CursorId.lineCursorAdd : CursorId.lineCursorDel);
  }

  protected reset(): void {
    this.startPoint = null;
    this.endPointPreview = null;
    //this.startPointCanvas = null;
    //this.endPointPreviewCanvas = null;
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      if (!this.startPoint) {
        this.startPoint = event.point;
        //this.startPointCanvas = event.canvasPoint;
        this.justStarted = true;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_MOVE || event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      // If we've got a start point and no end point preview, set this point
      // and redraw so user can see the line
      if (this.startPoint) {
        // NOTE: if we've dragged far enough away from the start point, behave like a click+drag line tool
        // otherwise if they clicked, then click elsewhere again, we behave like a 2 click line tool!
        const vec = getVectorBetweenPoints(event.point, this.startPoint);
        const ptRadius = this.getPtRadius();

        if (getVectorLength(vec) > ptRadius) {
          this.justStarted = false;
        }

        this.endPointPreview = event.point;
        //this.endPointPreviewCanvas = event.canvasPoint;
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
      if (this.justStarted) {
        // Don't save the second point yet, we only just started with the first one!
        this.justStarted = false;
      }
      // If no end point, set selection and we're done
      else {
        if (this.startPoint) {
          this.selectPointsAlongLine(this.startPoint, event.point);
        }
        this.reset();
      }

      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  private getPtRadius(): number {
    const ptRadius = 3 / this._ctx.transform.scale.x;
    return ptRadius;
  }

  override draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {
    const clr = this.getModeColour();
    screenContext.fillStyle = clr;
    screenContext.strokeStyle = clr;
    screenContext.lineWidth = this.getDrawLineWidth();

    const ptRadius = this.getPtRadius();
    const ptDiameter = ptRadius + ptRadius;

    // Draw start point
    if (this.startPoint) {
      screenContext.fillRect(this.startPoint.x - ptRadius, this.startPoint.y - ptRadius, ptDiameter, ptDiameter);
    }

    // Draw preview end point
    if (this.endPointPreview) {
      screenContext.fillRect(this.endPointPreview.x - ptRadius, this.endPointPreview.y - ptRadius, ptDiameter, ptDiameter);
    }

    // Draw the line between them
    if (this.startPoint && this.endPointPreview) {
      screenContext.beginPath();
      screenContext.moveTo(this.startPoint.x, this.startPoint.y);
      screenContext.lineTo(this.endPointPreview.x, this.endPointPreview.y);
      screenContext.closePath();

      screenContext.stroke();
    }
  }

  // Return true if something was changed
  private selectPointsAlongLine(startPt: Point, endPt: Point): void {
    const lineVec = getVectorBetweenPoints(startPt, endPt);
    const lineLength = getVectorLength(lineVec);
    const lineVecNormal = scaleVector(lineVec, 1 / lineLength);

    const selectedPMCs = new Map<string, Set<number>>();

    for (const scanId of this._ctx.scanIds) {
      const scanMdl = this._ctx.getScanModelFor(scanId);
      if (!scanMdl) {
        continue;
      }

      const threshold = scanMdl.scanPointDisplayRadius / 2;

      for (const loc of scanMdl.scanPoints) {
        if (loc.coord) {
          const dist = closestDistanceBetweenPointAndLine(loc.coord, startPt, lineVecNormal, lineLength);
          if (dist && Math.abs(dist) < threshold) {
            let pmcs = selectedPMCs.get(scanId);
            if (!pmcs) {
              pmcs = new Set<number>();
              selectedPMCs.set(scanId, pmcs);
            }
            pmcs.add(loc.PMC);
          }
        }
      }

      // If we're adding to the selection, add, otherwise remove each
      this.applyToSelection(selectedPMCs);
    }
  }
}
