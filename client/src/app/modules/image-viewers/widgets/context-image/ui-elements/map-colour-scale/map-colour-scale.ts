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

import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { Histogram } from "src/app/models/histogram";
import { CanvasDrawParameters, CanvasMouseEvent, CanvasInteractionResult } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IContextImageModel } from "../../context-image-model-interface";
import { BaseUIElement } from "../base-ui-element";
import { IToolHost } from "../../tools/base-context-image-tool";
import { ClientSideExportGenerator } from "src/app/utils/client-side-export";
import { LayerChannelScale } from "./map-colour-scale-single";


export class MapColourScale extends BaseUIElement {
  private _channelScales: LayerChannelScale[] = [];

  constructor(
    ctx: IContextImageModel,
    host: IToolHost,
    public layerId: string = ""
  ) {
    super(ctx, host);
  }

  // This is included here as a static so we can easily find code that depends on it. Ideally should be some helper
  // function, or maybe a function on the histogram itself
  public static isMapDataValid(histogram: Histogram): boolean {
    return histogram.values.length != 2 || histogram.max() != 0;
  }

  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    this.updateChannelScales(drawParams);

    // If we have channel scales, draw them
    for (const scale of this._channelScales) {
      scale.drawScreenSpace(screenContext, drawParams);
    }
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    this.updateChannelScales(null);

    // If we have channel scales, draw them
    let redraw = false;
    for (const scale of this._channelScales) {
      const result = scale.mouseEvent(event);
      if (result.catchEvent) {
        return result;
      }
      if (result.redraw) {
        redraw = true;
      }
    }

    if (redraw) {
      return CanvasInteractionResult.redrawOnly;
    }

    return CanvasInteractionResult.neither;
  }

  // Call to ensure that our channel scales stored are valid. This is because we aren't notified externally when things changed,
  // we just receive draw or input events and check what we're doing at the time. This ensures that if we had a valid set of
  // model data last time, we keep it, otherwise recreate
  private updateChannelScales(drawParams: CanvasDrawParameters | null): void {
    let activeLayer: IColourScaleDataSource | null = null;

    if (this.layerId.length > 0) {
      // We're forced to use this ID so nothing to change really, except make sure it's initially loaded
      activeLayer = this.getLayerById(this.layerId);
    } else {
      // Check if draw params specify a layer id we're exporting to
      if (drawParams) {
        const exprId = ClientSideExportGenerator.getExportExpressionID(drawParams.exportItemIDs);
        if (exprId) {
          activeLayer = this.getLayerById(exprId);
        }
      }

      if (!activeLayer) {
        activeLayer = this._ctx.colourScaleData;
      }
    }

    // If nothing else to draw, we may need to draw a colour scale for the RGBU ratio image displayed (if there is one)
    if (!activeLayer && this._ctx.rgbuImageLayerForScale) {
      activeLayer = this._ctx.rgbuImageLayerForScale;
    }

    // See if we need to reset
    if (!activeLayer) {
      this._channelScales = [];
      return;
    }

    if (this._channelScales.length != activeLayer.channelCount || (this._channelScales.length > 0 && this._channelScales[0].layer != activeLayer)) {
      // Create the right channel scale drawers
      this._channelScales = [];
      for (let c = 0; c < activeLayer.channelCount; c++) {
        this._channelScales.push(new LayerChannelScale(this._ctx, activeLayer, c));
      }
    }
  }

  private getLayerById(id: string): IColourScaleDataSource | null {
    for (const scanId of this._ctx.scanIds) {
      const scanMdl = this._ctx.getScanModelFor(scanId);
      if (scanMdl) {
        for (const mapLayer of scanMdl.maps) {
          // TODO: in old implementation id could be an rgb mix ID too... so we'll have to search
          // through expression groups here somehow too
          if (mapLayer.expressionId == id) {
            return mapLayer;
          }
        }
      }
    }

    return null;
  }

  get channelScales(): LayerChannelScale[] {
    return this._channelScales;
  }
}
