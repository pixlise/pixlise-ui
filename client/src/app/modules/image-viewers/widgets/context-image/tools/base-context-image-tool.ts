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

import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import {
  CanvasInteractionHandler,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasDrawer,
  CanvasDrawParameters,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "../context-image-model-interface";
import { Colours } from "src/app/utils/colours";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";

export enum ContextImageToolId {
  DRAW_LINE,
  ZOOM,
  ROTATE,
  PAN,
  SELECT_LINE,
  SELECT_COLOUR,
  SELECT_LASSO,
  SELECT_POINT,
  PMC_INSPECTOR, // UNUSED as of redesign Sept 1 2020. TODO: remove this!
}

export interface IToolHost {
  getSelectionService(): SelectionService;
  //springActivate(id: ContextImageToolId): void;
  setCursor(cursor: CursorId): void;
  notifyToolStateChanged(): void;
}

export class BaseContextImageTool implements CanvasInteractionHandler, CanvasDrawer {
  constructor(
    protected _id: ContextImageToolId,
    protected _ctx: IContextImageModel,
    protected _host: IToolHost,
    public toolTip: string,
    public buttonIcon: string
  ) {}

  activate(): void {}

  deactivate(): void {}

  get id(): ContextImageToolId {
    return this._id;
  }

  // CanvasInteractionHandler
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  // CanvasDrawer
  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {}

  // Internal drawing helpers
  private defaultLineWidth = 1;

  protected getDrawLineWidth(scaleFactor: number = 2): number {
    return (this.defaultLineWidth * scaleFactor) / this._ctx.transform.scale.x;
  }

  protected getAddModeColour(): string {
    return Colours.CONTEXT_PURPLE.asString();
  }

  protected getModeColour(): string {
    if (this._ctx.selectionModeAdd) {
      return this.getAddModeColour();
    }
    return Colours.ORANGE.asString();
  }

  // Applies the selectedIdxs to the applyToSelectedIdxs depending on the mode (add or subtract)
  // Normally if applyToSelectedIdxs is left as NULL it will use the existing points in the selection
  // but this provides the ability to override that and apply selection to a previous snapshot of
  // selected idxs.
  protected applyToSelection(
    selectedScanLocationIdxs: Map<string, Set<number>>,
    applyToSelectedLocationIdxs: Map<string, Set<number>> | null = null,
    forceAdd: boolean = false,
    pixels: Set<number> = new Set<number>()
  ): void {
    const selSvc = this._host.getSelectionService();

    // Handle PMC selection
    const toSet = new Map<string, Set<number>>();

    if (applyToSelectedLocationIdxs == null) {
      applyToSelectedLocationIdxs = new Map<string, Set<number>>();
      for (const scanId of selectedScanLocationIdxs.keys()) {
        applyToSelectedLocationIdxs.set(scanId, selSvc.getCurrentSelection().beamSelection.getSelectedScanEntryIndexes(scanId));
      }
    }

    // If in add mode, we need to see what's already selected and combine it with what we're selecting
    if (forceAdd || this._ctx.selectionModeAdd) {
      for (const [scanId, sel] of selectedScanLocationIdxs) {
        const idxs = applyToSelectedLocationIdxs.get(scanId);
        if (idxs) {
          // Combine existing with what we're adding
          toSet.set(scanId, new Set<number>([...idxs, ...sel]));
        } else {
          // Nothing selected yet, so just use ours directly
          toSet.set(scanId, sel);
        }
      }
    }
    // If in subtract mode, we need to remove our selection from the existing points (if any)
    else if (applyToSelectedLocationIdxs) {
      for (const [scanId, sel] of selectedScanLocationIdxs) {
        const toSetSel = new Set<number>();
        const existingIdxs = applyToSelectedLocationIdxs.get(scanId);
        if (existingIdxs) {
          for (const idx of existingIdxs) {
            // If this selected idx is in our list, don't add it to the new one
            if (!sel.has(idx)) {
              toSetSel.add(idx);
            }
          }

          toSet.set(scanId, toSetSel);
        }
      }
    }

    // Handle pixel selection
    let pixelSel = PixelSelection.makeEmptySelection();
    if (this._ctx.rgbuSourceImage) {
      const imgWidth = this._ctx.rgbuSourceImage.r.width;
      const imgHeight = this._ctx.rgbuSourceImage.r.height;

      const currSel = selSvc.getCurrentSelection();
      const currSelPixels = currSel.pixelSelection.selectedPixels;

      // If we're doing additive selection, add otherwise subtract
      if (this._ctx.selectionModeAdd) {
        // Add all the existing pixels in selection
        for (const p of currSelPixels) {
          pixels.add(p);
        }
      } else {
        // Make these subtract from all pixels
        const difference = new Set([...currSelPixels].filter(x => !pixels.has(x)));

        pixels = difference;
      }

      pixelSel = new PixelSelection(pixels, imgWidth, imgHeight, this._ctx.rgbuSourceImage.path);
    }

    selSvc.setSelection(new BeamSelection(toSet), pixelSel);
  }
}
