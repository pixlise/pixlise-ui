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

import { Colours, RGBA } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE, drawToolTip, drawErrorIcon } from "src/app/utils/drawing";
import { Point } from "src/app/models/Geometry";
import { HistogramModel, HistogramDrawBar } from "./model";
import { ChartAxisDrawer } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import { CanvasDrawParameters } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { CachedCanvasChartDrawer } from "../../base/cached-drawer";
import { BaseChartModel } from "../../base/model-interfaces";

export class HistogramDrawer extends CachedCanvasChartDrawer {
  constructor(private _mdl: HistogramModel) {
    super();
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (!this._mdl.drawModel.xAxis || !this._mdl.drawModel.yAxis) {
      return;
    }

    const axisDrawer = new ChartAxisDrawer();
    axisDrawer.drawAxes(screenContext, drawParams.drawViewport, this._mdl.drawModel.xAxis, "", this._mdl.drawModel.yAxis, this._mdl.yAxisLabel);
  }

  drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (!this._mdl.drawModel.xAxis || !this._mdl.drawModel.yAxis) {
      return;
    }

    const ERROR_ICON_SIZE = 16;

    // Don't allow drawing over the axis now
    screenContext.save();
    screenContext.beginPath();
    screenContext.rect(this._mdl.drawModel.xAxis.startPx, 0, this._mdl.drawModel.xAxis.endPx, drawParams.drawViewport.height - this._mdl.drawModel.yAxis.startPx);
    screenContext.clip();

    screenContext.strokeStyle = Colours.GRAY_30.asString();
    screenContext.lineWidth = 1;

    // Draw bars & whiskers
    for (const bar of this._mdl.drawModel.bars) {
      if (!bar.bar.colourRGB) {
        continue;
      }

      // If there was an error, draw error triangle
      if (bar.bar.errorMsg.length > 0) {
        const iconPos = bar.rect.center();
        iconPos.y -= ERROR_ICON_SIZE;

        drawErrorIcon(screenContext, iconPos, ERROR_ICON_SIZE);

        // Also draw the error msg, going vertically up!
      } else {
        // Draw the actual bar
        this.drawDistributionBars(screenContext, bar);
      }
    }
    screenContext.restore();
  }

  drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Draw any hover info on top of it
    if (this._mdl.hoverBar && this._mdl.hoverPoint) {
      const hoverBar = this._mdl.hoverBar;

      const drawLeft = this._mdl.hoverPoint.x > drawParams.drawViewport.width / 2;
      const offsetX = drawLeft ? -5 : 5;

      const messages = [
        {
          text: `avg. ${hoverBar.groupLabel}: ${(Math.round(hoverBar.bar.meanValue * 100) / 100).toLocaleString()}%`,
          colour: Colours.TEXT_MUTED_BLUE,
          bold: true,
        },
      ];
      const errorValue = hoverBar.bar.errorMsg;
      if (errorValue) {
        messages.push({
          text: errorValue,
          colour: Colours.TEXT_PURPLE,
          bold: true,
        });
      } else {
        messages.push({
          text: `avg. error: ${hoverBar.bar.errorValue ? hoverBar.bar.errorValue.toLocaleString() : "N/A"}`,
          colour: Colours.TEXT_PURPLE,
          bold: false,
        });

        if (!this._mdl.showStdError) {
          messages.push({
            text: `standard deviation: ${hoverBar.bar.stdDev ? hoverBar.bar.stdDev.toLocaleString() : "N/A"}`,
            colour: Colours.TEXT_GRAY,
            bold: false,
          });
        } else {
          messages.push({
            text: `standard error: ${hoverBar.bar.stdErr ? hoverBar.bar.stdErr.toLocaleString() : "N/A"}`,
            colour: Colours.TEXT_GRAY,
            bold: false,
          });
        }
      }

      drawToolTip(screenContext, new Point(this._mdl.hoverPoint.x + offsetX, this._mdl.hoverPoint.y), drawLeft, "", messages, CANVAS_FONT_SIZE, Colours.GRAY_90);
    }
  }

  private drawDistributionBars(screenContext: OffscreenCanvasRenderingContext2D, bar: HistogramDrawBar): void {
    if (bar.rect.h === 0) {
      return;
    }

    const barWidthPercentage = 0.5;

    const centerBarWidth = bar.rect.w * barWidthPercentage;
    const centerBarStartX = bar.rect.x + centerBarWidth / 2;
    const meanCanvasY = bar.rect.y;
    const baseColor = bar.bar.colourRGB;

    // Draw each concentration frequency band
    bar.concentration.bands.forEach(band => {
      // Floor opacity at 55 so that the band is not too transparent
      const opacity = Math.round(band.frequencyPercentage * 200) + 55;
      screenContext.fillStyle = new RGBA(baseColor.r, baseColor.g, baseColor.b, opacity).asString();
      screenContext.fillRect(centerBarStartX, band.y, centerBarWidth, bar.concentration.width);
    });

    // Draw the mean line
    screenContext.strokeStyle = Colours.CONTEXT_PURPLE.asString();
    screenContext.lineWidth = 2;

    screenContext.beginPath();
    screenContext.moveTo(bar.rect.x, meanCanvasY);
    screenContext.lineTo(bar.rect.x + bar.rect.w, meanCanvasY);
    screenContext.stroke();

    if (this._mdl.showWhiskers) {
      // Draw the whiskers
      screenContext.strokeStyle = Colours.CONTEXT_PURPLE.asString();
      screenContext.lineWidth = 1;
      if (bar.upperWhisker !== bar.lowerWhisker) {
        screenContext.beginPath();

        // Upper whisker
        screenContext.moveTo(bar.rect.x, bar.upperWhisker);
        screenContext.lineTo(bar.rect.x + bar.rect.w, bar.upperWhisker);

        // Lower whisker
        screenContext.moveTo(bar.rect.x, bar.lowerWhisker);
        screenContext.lineTo(bar.rect.x + bar.rect.w, bar.lowerWhisker);

        screenContext.stroke();
      }
    }
  }
}
