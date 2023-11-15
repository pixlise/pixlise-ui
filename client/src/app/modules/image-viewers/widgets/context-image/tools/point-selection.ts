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

import { drawEmptyCircle } from "src/app/utils/drawing";
import { BaseContextImageTool, ContextImageToolId, IToolHost } from "./base-context-image-tool";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import {
  CanvasKeyEvent,
  CanvasInteractionResult,
  CanvasMouseEvent,
  CanvasMouseEventId,
  CanvasDrawParameters,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "../context-image-model-interface";
import { Point } from "src/app/models/Geometry";

const buttonIconPaintBrush = "assets/button-icons/tool-paint-brush.svg";
const buttonIconPointInvestigation = "assets/button-icons/tool-point-select.svg";

export class PointSelection extends BaseContextImageTool {
  private selectedIdxs = new Map<string, Set<number>>();

  private pointInvestigationMode: boolean = false;

  constructor(ctx: IContextImageModel, host: IToolHost) {
    super(ContextImageToolId.SELECT_POINT, ctx, host, "Brush Tool (B)\nClick and drag mouse over points to select", buttonIconPaintBrush);
  }

  override activate(): void {
    this.setPointInvestigationMode(false);
  }

  protected setPointCursor(): void {
    this._host.setCursor(this._ctx.selectionModeAdd ? CursorId.pointCursorAdd : CursorId.pointCursorDel);
  }

  protected setPointInvestigationMode(on: boolean): void {
    if (on) {
      this._host.setCursor(CursorId.pointCursorSingle);
      this.buttonIcon = buttonIconPointInvestigation;
      this.pointInvestigationMode = true;
    } else {
      this.setPointCursor();
      this.buttonIcon = buttonIconPaintBrush;
      this.pointInvestigationMode = false;
    }

    this._host.notifyToolStateChanged();
  }

  override keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    // Meta: Mac=Command, Windows=Windows
    // Control: Mac=Control (then click: brings up right-click menu), Windows: ?
    // Shift: Doesn't seem to even get here, maybe hijacked by tool host?
    // Alt: Mac=Option, Windows=Alt
    if (
      //event.key == "Control" ||
      //event.key == "Meta"
      event.key == "Alt"
    ) {
      this.setPointInvestigationMode(event.down);

      // NOTE: if we never see an up event for some reason... this may get stuck on. BUT when we are activated
      // we turn to not being in point mode anyway
    }

    return CanvasInteractionResult.neither;
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      // If it's a mouse down, start selected indexes from scratch
      this.selectedIdxs.clear();
      return CanvasInteractionResult.redrawAndCatch;
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      // They're dragging, add anything they drag over to the selected points
      if (this.processPoint(event.point)) {
        return CanvasInteractionResult.redrawAndCatch;
      }
    } else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
      //if(event.metaKey || event.ctrlKey)
      if (this.pointInvestigationMode) {
        this.selectedIdxs.clear();
        this._host.getSelectionService().clearSelection();
      }

      // Mouse released, process it (may have just been a click with no mouse drag msg in between)
      this.processPoint(event.point);

      // Apply directly to the selection (NOTE we have to convert from idxs to PMCs)
      const selectedPMCs = new Map<string, Set<number>>();
      for (const [scanId, idxs] of this.selectedIdxs) {
        const mdl = this._ctx.drawModel.scanDrawModels.get(scanId);
        if (mdl) {
          const pmcs = new Set<number>();
          for (const idx of idxs) {
            pmcs.add(mdl.scanPoints[idx].PMC);
          }

          selectedPMCs.set(scanId, pmcs);
        }
      }
      this.applyToSelection(selectedPMCs, null, this.pointInvestigationMode);

      // Clear what we're operating on (don't draw anything)
      this.selectedIdxs.clear();
      return CanvasInteractionResult.redrawAndCatch;
    }

    return CanvasInteractionResult.neither;
  }

  override draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {
    // If we're deleting, draw with a different colour
    const clr = this.getModeColour();

    screenContext.fillStyle = clr;
    screenContext.strokeStyle = clr;
    screenContext.lineWidth = this.getDrawLineWidth();

    for (const [scanId, idxs] of this.selectedIdxs) {
      const scanMdl = this._ctx.getScanModelFor(scanId);
      if (scanMdl) {
        const halfSize = scanMdl.beamRadius_pixels;

        // Draw what we're operating on
        for (const selIdx of idxs) {
          const loc = scanMdl.scanPoints[selIdx];
          if (loc.coord) {
            drawEmptyCircle(screenContext, loc.coord, halfSize);
          }
        }
      }
    }
  }

  // Return true if something was changed
  private processPoint(ptWorld: Point): boolean {
    const closestPt = this._ctx.getClosestLocationIdxToPoint(ptWorld);

    if (closestPt.scanId.length > 0 && closestPt.idx > -1) {
      // Firstly, add to the list of selected points
      let idxs = this.selectedIdxs.get(closestPt.scanId);
      if (!idxs) {
        idxs = new Set<number>();
        this.selectedIdxs.set(closestPt.scanId, idxs);
      }
      idxs.add(closestPt.idx);
    }

    //this.setHighlightedLocationIdx(idx, dataset);
    return true;
  }
}
