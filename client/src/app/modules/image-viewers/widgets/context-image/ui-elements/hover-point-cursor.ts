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
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { drawPointCrosshair } from "src/app/utils/drawing";
import { ClosestPoint, IContextImageModel } from "../context-image-model-interface";
import { BaseUIElement } from "./base-ui-element";
import { ScanPoint } from "../../../models/scan-point";
import { ContextImageScanDrawModel } from "../../../models/context-image-draw-model";
import { IToolHost } from "../tools/base-context-image-tool";
import { Observable, of } from "rxjs";

// Draws the highlighted point. Also listens for any stray mouse events and sets the point hovered over as the hover point
export class HoverPointCursor extends BaseUIElement {
  private _ratioValue: number | null = null;
  private _lastClosestPoint: ClosestPoint | null = null;

  constructor(ctx: IContextImageModel, host: IToolHost) {
    super(ctx, host);
  }

  private updateHoverRatioValue(point: Point) {
    // Validate context before continuing
    if (!this._ctx || !this._ctx.rgbuChannels || !this._ctx.rgbuSourceImage) {
      this._ratioValue = null;
      return;
    }

    let ratioValue: number | null = null;
    // Get channel acronym names, validate that they are individual r,g,b,u channels, and confirm there are 2 channels selected as a ratio
    const channelAcronyms = this._ctx.rgbuChannels
      .toUpperCase()
      .split("/")
      .filter(acronym => ["R", "G", "B", "U"].includes(acronym));
    if (channelAcronyms.length === 2 && this._ctx.rgbuSourceImage) {
      // Only continue if channel images have the same width and height and the selected point is within image bounds
      const channels = channelAcronyms.map(acronym => this._ctx.rgbuSourceImage!.channelImageForName(acronym));
      if (channels.length >= 2 && channels[0] && channels[1] && channels[0].width === channels[1].width && channels[0].height === channels[1].height) {
        const width = channels[0].width;

        // Get the world point, translate it so 0,0 is the top left corner of the image and convert it to a pixel index
        let rawX = Math.round(point.x);
        let rawY = Math.round(point.y);

        if (this._ctx.drawModel.imageTransform) {
          rawX -= this._ctx.drawModel.imageTransform.xOffset;
          rawY -= this._ctx.drawModel.imageTransform.yOffset;
        }

        const pixelIndex = rawY * width + rawX;

        // Check that the pixel is in bounds of the RGBU image
        if (pixelIndex >= 0 && pixelIndex < channels[0].values.length) {
          ratioValue = channels[0].values[pixelIndex] / channels[1].values[pixelIndex];
        }
      }
    }

    this._ratioValue = ratioValue;
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    // We listen in on mouse moves, if it hits a PMC, we tell the selection service. This will trigger other views to redraw showing
    // the location of the point the mouse is over
    if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      this.updateHoverRatioValue(event.point);

      const closestPt = this._ctx.getClosestLocationIdxToPoint(event.point);
      // If it's the same as the last one, don't do anything
      if (!this._lastClosestPoint || this._lastClosestPoint.scanId != closestPt.scanId || this._lastClosestPoint.idx != closestPt.idx) {
        if (closestPt.idx < 0) {
          this._host.getSelectionService().clearHoverEntry();
        } else {
          this._host.getSelectionService().setHoverEntryIndex(closestPt.scanId, closestPt.idx);
        }

        this._lastClosestPoint = closestPt;
      }

      // Redraw will be initiated due to selectionService hover idx change
    }

    return CanvasInteractionResult.neither;
  }

  override draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): Observable<void> {
    let drawnCornerBoxWidth = 0;
    for (const mdl of this._ctx.drawModel.scanDrawModels.values()) {
      if (mdl.hoverEntryIdx >= 0 && mdl.scanPoints[mdl.hoverEntryIdx]?.coord) {
        drawnCornerBoxWidth = this.drawForScanPoint(
          screenContext,
          drawParams,
          this._ctx.drawModel.scanDrawModels.size > 1 ? mdl.title : "",
          mdl.scanPoints[mdl.hoverEntryIdx],
          mdl
        );

        // There should only be one set as hovering anyway...
        break;
      }
    }

    if (this._ctx.rgbuImageScaleData && this._ratioValue !== null) {
      this.drawForRatioImage(screenContext, drawParams, this._ratioValue, this._ctx.rgbuImageScaleData.name, drawnCornerBoxWidth);
    }
    return of(void 0);
  }

  private _drawPadding = 4;

  private drawForScanPoint(
    screenContext: CanvasRenderingContext2D,
    drawParams: CanvasDrawParameters,
    scanName: string,
    scanPoint: ScanPoint,
    mdl: ContextImageScanDrawModel
  ) {
    let drawnCornerBoxWidth = 0;

    // Draw a highlighted location if there is one
    if (scanPoint.coord) {
      screenContext.save();
      drawParams.worldTransform.applyTransform(screenContext);
      // Drawing in transformed space...

      drawPointCrosshair(screenContext, scanPoint.coord, mdl.beamRadius_pixels, this._ctx.transform.scale.x, mdl.beamRadius_pixels / 2);

      // Done with transformed space
      screenContext.restore();
    }

    // Drawing in screen space
    const pmcLabelText = this.getPMCLabel(scanPoint, scanName);
    this.drawCornerTextBox(pmcLabelText, screenContext, drawParams, 0, this._drawPadding);
    drawnCornerBoxWidth = screenContext.measureText(pmcLabelText).width + this._drawPadding * 2.5;

    return drawnCornerBoxWidth;
  }

  private drawForRatioImage(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters, ratioValue: number, ratioName: string, xOffset: number) {
    const displayRatio = Math.round(ratioValue * 100) / 100;
    if (!isNaN(displayRatio)) {
      this.drawCornerTextBox(`${ratioName}: ${displayRatio}`, screenContext, drawParams, -xOffset, this._drawPadding);
    }
  }

  private drawCornerTextBox(text: string, screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters, offsetX: number = 0, padding: number = 4): void {
    const txtSize = screenContext.measureText(text);

    const w = txtSize.width + padding * 2;
    const h = 20;

    // Work out position
    const pos = new Point(drawParams.drawViewport.width - w - padding + offsetX, drawParams.drawViewport.height - 22);

    screenContext.textAlign = "left";
    screenContext.textBaseline = "top";

    screenContext.fillStyle = Colours.GRAY_80.asString();
    screenContext.fillRect(pos.x, pos.y, w, h);

    screenContext.fillStyle = Colours.GRAY_10.asString();
    screenContext.fillText(text, pos.x + padding, pos.y + padding);
  }

  private getPMCLabel(pt: ScanPoint, scanName: string): string {
    // Write some info about the hovered point
    let pmcLabel = "PMC: " + pt.PMC;

    if (pt.hasDwellSpectra) {
      pmcLabel += " Dwell";
    }

    if (scanName.length > 0) {
      pmcLabel += " (" + scanName + ")";
    }

    return pmcLabel;
  }
}
