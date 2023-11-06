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
  CanvasDrawParameters,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "../../context-image-model-interface";
import { BaseUIElement } from "../base-ui-element";
import { IToolHost } from "../../tools/base-context-image-tool";
import { MapColourScaleDrawer } from "./map-colour-scale-drawer";
import { MapColourScaleModel } from "./map-colour-scale-model";
import { MapColourScaleInteraction } from "./map-colour-scale-interaction";
import { Point, Rect, addVectors, getVectorBetweenPoints } from "src/app/models/Geometry";

// NOTE: this draws one or more colour scale as a movable and interactive UI element. The model it operates
// on must be created as part of the ContextImageModel
export class MapColourScale extends BaseUIElement {
  private _interactions = new Map<string, MapColourScaleInteraction>();
  private _boundingBox: Rect = new Rect(0, 0, 0, 0);
  private _mouseDragging = false;
  private _mouseDragPos = new Point(0, 0);

  constructor(
    ctx: IContextImageModel,
    host: IToolHost,
    public layerId: string = ""
  ) {
    super(ctx, host);
  }
  /*
  // This is included here as a static so we can easily find code that depends on it. Ideally should be some helper
  // function, or maybe a function on the histogram itself
  public static isMapDataValid(histogram: Histogram): boolean {
    return histogram.values.length != 2 || histogram.max() != 0;
  }
*/
  override draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (this._ctx.colourScales.length <= 0) {
      return;
    }

    // Translate to where it actually should be
    screenContext.save();
    screenContext.translate(this._ctx.uiLayerScaleTranslation.x, this._ctx.uiLayerScaleTranslation.y);

    // Update anything we need before drawing
    this.updateScales(drawParams);

    // If we have channel scales, draw them
    for (const scale of this._ctx.colourScales) {
      this.drawScreenSpaceScale(screenContext, drawParams, scale);
    }

    screenContext.restore();
  }

  private drawScreenSpaceScale(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters, mdl: MapColourScaleModel) {
    const drawer = new MapColourScaleDrawer();
    drawer.drawColourScale(screenContext, mdl, mdl.drawModel, drawParams.drawViewport.height, drawParams.drawViewport.width);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId != CanvasMouseEventId.MOUSE_MOVE && event.eventId != CanvasMouseEventId.MOUSE_ENTER) {
      console.log("NOT Mouse move");
    }

    if (this._mouseDragging) {
      // User is already dragging our object, so just handle anything related to it here
      if (event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
        const moved = getVectorBetweenPoints(event.canvasMouseDown, event.canvasPoint);
        this._ctx.uiLayerScaleTranslation = addVectors(this._mouseDragPos, moved);

        //console.log(`moved: ${this._ctx.uiLayerScaleTranslation.x}, ${this._ctx.uiLayerScaleTranslation.y}`);

        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
        this._mouseDragging = false;
        return CanvasInteractionResult.redrawAndCatch;
      }
    }

    this.updateScales(null);

    // Run through and let any colour scale interactions handle the message if they want
    // NOTE: we need to be in "colour scale" space, so we subtract the draw offset coordinate
    const translatedEvent = CanvasMouseEvent.makeCanvasTranslatedCopy(event, new Point(-this._ctx.uiLayerScaleTranslation.x, -this._ctx.uiLayerScaleTranslation.y));

    let redraw = false;
    for (const scale of this._ctx.colourScales) {
      const result = this.mouseEventForScale(translatedEvent, scale);
      if (result.catchEvent) {
        // Was handled by this scale
        return result;
      }

      if (result.redraw) {
        redraw = true;
      }
    }

    if (redraw) {
      return CanvasInteractionResult.redrawOnly;
    }

    // Check if it's within our overall bounding box, if so, assume it's a drag of the whole thing
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      if (this._boundingBox.containsPoint(translatedEvent.canvasPoint)) {
        this._mouseDragging = true;
        // Here we save the initial position it was at before we started dragging
        this._mouseDragPos = this._ctx.uiLayerScaleTranslation.copy();
        return CanvasInteractionResult.redrawAndCatch;
      }
    }

    return CanvasInteractionResult.neither;
  }

  private mouseEventForScale(event: CanvasMouseEvent, mdl: MapColourScaleModel): CanvasInteractionResult {
    let interaction = this._interactions.get(mdl.id);
    if (!interaction) {
      interaction = new MapColourScaleInteraction(mdl);
      this._interactions.set(mdl.id, interaction);
    }

    return interaction.mouseEvent(event);
  }

  private updateScales(drawParams: CanvasDrawParameters | null) {
    this._boundingBox = new Rect();

    const scaleIds = [];
    let first = true;
    for (const mdl of this._ctx.colourScales) {
      scaleIds.push(mdl.id);

      // Also inflate bounding box
      if (mdl.drawModel.pos) {
        if (first) {
          this._boundingBox = mdl.drawModel.pos.rect.copy();
          first = false;
        } else {
          this._boundingBox.expandToFitPoint(new Point(mdl.drawModel.pos.rect.x, mdl.drawModel.pos.rect.y));
          this._boundingBox.expandToFitPoint(new Point(mdl.drawModel.pos.rect.maxX(), mdl.drawModel.pos.rect.maxY()));
        }
      }
    }

    // Delete old interactions if any
    for (const id of this._interactions.keys()) {
      if (scaleIds.indexOf(id) < 0) {
        this._interactions.delete(id);
      }
    }
  }
}
