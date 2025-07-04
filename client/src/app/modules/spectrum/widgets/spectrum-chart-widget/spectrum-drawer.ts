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

import { CANVAS_FONT_SIZE_TITLE } from "src/app/utils/drawing";
import { RGBA, Colours } from "src/app/utils/colours";
import { ChartAxis, ChartAxisDrawer } from "src/app/modules/widget/components/interactive-canvas/chart-axis";
import { CanvasDrawParameters, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { SpectrumChartLine } from "./spectrum-model-interface";
import { SpectrumChartToolHost } from "./tools/tool-host";
import { CachedCanvasChartDrawer } from "src/app/modules/widget/components/interactive-canvas/cached-drawer";
import { BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { SpectrumChartModel, fitElementLinePrefix } from "./spectrum-model";

export class SpectrumChartDrawer extends CachedCanvasChartDrawer {
  protected _dbg: string = "";
  protected _mdl: SpectrumChartModel;
  protected _toolHost: SpectrumChartToolHost;

  public lightMode: boolean = false;
  public transparentBackground: boolean = false;
  public borderWidth: number = 1;
  public borderColor: string = "";
  public axisLabelFontSize: number = 14;
  public axisLabelFontFamily: string = "Arial";
  public axisLabelFontColor: string = "";

  constructor(ctx: SpectrumChartModel, toolHost: SpectrumChartToolHost) {
    super();

    this._mdl = ctx;
    this._toolHost = toolHost;
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (!this._mdl.xAxis || !this._mdl.yAxis) {
      return;
    }

    if (!this._mdl.exportMode) {
      // Use defaults
      this.lightMode = false;
      this.transparentBackground = false;
      this.borderWidth = 1;
      this.borderColor = "";
      this.axisLabelFontSize = 14;
      this.axisLabelFontFamily = "Arial";
      this.axisLabelFontColor = "";
    }

    // Draw background
    screenContext.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
    screenContext.fillRect(0, 0, drawParams.drawViewport.width, drawParams.drawViewport.height);
    if (this.transparentBackground) {
      screenContext.clearRect(0, 0, drawParams.drawViewport.width, drawParams.drawViewport.height);
    }

    // Create axis drawer with custom properties
    const axisDrawer = new ChartAxisDrawer(
      `${this.axisLabelFontSize}px ${this.axisLabelFontFamily}`,
      this.borderColor || (this.lightMode ? Colours.GRAY_90.asString() : Colours.GRAY_60.asString()),
      this.axisLabelFontColor || (this.lightMode ? Colours.GRAY_90.asString() : Colours.GRAY_60.asString()),
      4,
      4,
      false,
      this.borderWidth
    );
    axisDrawer.drawAxes(screenContext, drawParams.drawViewport, this._mdl.xAxis, this._mdl.xAxisLabel, this._mdl.yAxis, this._mdl.yAxisLabel);
  }

  drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (!this._mdl.xAxis || !this._mdl.yAxis) {
      return;
    }

    // Don't allow drawing over the axis now
    screenContext.save();
    screenContext.beginPath();
    screenContext.rect(this._mdl.xAxis.startPx, 0, this._mdl.xAxis.endPx, drawParams.drawViewport.height - this._mdl.yAxis.startPx);
    screenContext.clip();

    for (let c = 0; c < this._mdl.spectrumLines.length; c++) {
      const spectrum = this._mdl.spectrumLines[c];
      let keyId = `${spectrum.roiId}-${spectrum.expressionLabel}`;
      let keyItem = this._mdl.keyItems.find(item => item.id === keyId);
      if (keyItem && !keyItem.isVisible) {
        continue;
      }

      this.drawSpectrum(
        screenContext,
        spectrum,
        this._mdl.highlightedLineExpr.length > 0 && this._mdl.highlightedLineExpr != spectrum.expression && !spectrum.expression.startsWith(fitElementLinePrefix),
        this._mdl.xAxis,
        this._mdl.yAxis
      );
    }

    screenContext.restore();
  }

  drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (this._mdl.xAxis && this._mdl.yAxis) {
      // Don't allow drawing over the axis now
      screenContext.save();
      screenContext.beginPath();
      screenContext.rect(this._mdl.xAxis.startPx, 0, this._mdl.xAxis.endPx, drawParams.drawViewport.height - this._mdl.yAxis.startPx);
      screenContext.clip();

      for (const peak of this._mdl.diffractionPeaksShown) {
        this.drawDiffractionPeakBand(screenContext, drawParams.drawViewport, peak, this._mdl.xAxis);
      }

      screenContext.restore();
    }

    this.drawScreenSpaceToolUIs(screenContext, drawParams);

    if (this._dbg.length) {
      screenContext.textAlign = "left";
      screenContext.textBaseline = "top";
      screenContext.fillStyle = Colours.ORANGE.asString();
      screenContext.font = CANVAS_FONT_SIZE_TITLE + "px Roboto";
      screenContext.fillText(this._dbg, CANVAS_FONT_SIZE_TITLE, drawParams.drawViewport.height - CANVAS_FONT_SIZE_TITLE);
    }
  }

  protected drawScreenSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    //screenContext.save();
    for (const drawer of this._toolHost.getDrawers()) {
      screenContext.save();
      drawer.draw(screenContext, drawParams);
      screenContext.restore();
    }
    //screenContext.restore();
  }

  protected drawSpectrum(
    screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    spectrum: SpectrumChartLine,
    darken: boolean,
    xAxis: ChartAxis,
    yAxis: ChartAxis
  ) {
    if (spectrum.values.length <= 0) {
      return;
    }

    let opacity = spectrum.opacity;
    if (darken) {
      opacity *= 0.2;
    }

    let clr = spectrum.color;
    if (opacity < 1) {
      clr = RGBA.fromString(spectrum.color).asStringWithA(opacity);
    }

    // Adjust color for light mode if needed
    if (this.lightMode && spectrum.color === Colours.WHITE.asString()) {
      clr = Colours.GRAY_80.asString();
      if (opacity < 1) {
        clr = Colours.GRAY_80.asStringWithA(opacity);
      }
    }

    if (spectrum.drawFilled) {
      screenContext.fillStyle = clr;
    } else {
      screenContext.strokeStyle = clr;
    }

    screenContext.lineWidth = spectrum.lineWidth;
    screenContext.setLineDash(spectrum.dashPattern);

    screenContext.beginPath();

    // Find the first value (nearest the X axis)
    const startX = xAxis.canvasToValue(xAxis.startPx);
    const endX = xAxis.canvasToValue(xAxis.startPx + xAxis.endPx);

    for (let c = 1; c < spectrum.values.length; c++) {
      if (spectrum.xValues[c] > startX) {
        if (spectrum.xValues[c - 1] <= startX) {
          screenContext.moveTo(xAxis.valueToCanvas(spectrum.xValues[c - 1]), yAxis.valueToCanvas(spectrum.values[c - 1]));
        }

        screenContext.lineTo(xAxis.valueToCanvas(spectrum.xValues[c]), yAxis.valueToCanvas(spectrum.values[c]));
      }

      // Find where to draw from & to
      if (spectrum.xValues[c] > endX) {
        break;
      }
    }

    if (spectrum.drawFilled) {
      // Draw 2 more points to bring it down to the x axis
      screenContext.lineTo(xAxis.valueToCanvas(endX), yAxis.valueToCanvas(0));
      screenContext.lineTo(xAxis.valueToCanvas(startX), yAxis.valueToCanvas(0));
      screenContext.fill();
    } else {
      screenContext.stroke();
    }
  }

  drawDiffractionPeakBand(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, peak: DiffractionPeak, xAxis: ChartAxis) {
    screenContext.fillStyle = this.lightMode ? Colours.GRAY_90.asStringWithA(0.3) : Colours.GRAY_60.asStringWithA(0.3);

    const x1 = xAxis.valueToCanvas(peak.keV - 0.1);
    const x2 = xAxis.valueToCanvas(peak.keV + 0.1);

    screenContext.fillRect(x1, 0, x2 - x1, viewport.height);
  }
}
