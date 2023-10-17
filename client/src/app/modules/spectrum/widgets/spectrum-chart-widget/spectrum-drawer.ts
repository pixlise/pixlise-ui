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
import { ChartAxis, ChartAxisDrawer } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import {
  CanvasDrawer,
  CanvasDrawParameters,
  CanvasParams,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { ISpectrumChartModel, SpectrumChartLine } from "./spectrum-model-interface";
import { SpectrumChartToolHost } from "./tools/tool-host";

export class SpectrumChartDrawer implements CanvasDrawer {
  protected _dbg: string = "";
  protected _ctx: ISpectrumChartModel;
  protected _toolHost: SpectrumChartToolHost;

  constructor(ctx: ISpectrumChartModel, toolHost: SpectrumChartToolHost) {
    this._ctx = ctx;
    this._toolHost = toolHost;
  }

  drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Draw tool UI on top
    this.drawWorldSpaceToolUIs(screenContext, drawParams);
  }

  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    this._ctx.recalcDisplayDataIfNeeded(drawParams.drawViewport);

    if (!this._ctx.xAxis || !this._ctx.yAxis) {
      return;
    }

    // Flip things so bottom-left is 0,0
    //screenContext.transform(1, 0, 0, -1, 0, viewport.height);

    //this._dbg = 'pan='+this._ctx.transform.pan.x+','+this._ctx.transform.pan.y+' scale='+this._ctx.transform.scale.x+','+this._ctx.transform.scale.y;

    //let t1 = performance.now();
    this.drawChart(screenContext, drawParams.drawViewport, drawParams.worldTransform, this._ctx.xAxis, this._ctx.yAxis);
    //let t2 = performance.now();
    this.drawScreenSpaceToolUIs(screenContext, drawParams);

    if (this._dbg.length) {
      screenContext.textAlign = "left";
      screenContext.textBaseline = "top";
      screenContext.fillStyle = Colours.ORANGE.asString();
      screenContext.font = CANVAS_FONT_SIZE_TITLE + "px Roboto";
      screenContext.fillText(this._dbg, CANVAS_FONT_SIZE_TITLE, drawParams.drawViewport.height - CANVAS_FONT_SIZE_TITLE);
    }

    //let t3 = performance.now();
    //let total=t3-t0;

    //console.log('['+this._draws+'] '+this.drawStats('recalcDisplayData', t1-t0, total)+' '+this.drawStats('drawChart', t2-t1, total)+' '+this.drawStats('drawScreenSpaceToolUIs', t3-t2, total)+' total='+(t3-t0).toPrecision(4)+'ms');
    //this._draws++;
  }
  /*private _draws: number = 0;
private drawStats(name: string, elapsed: number, total: number): string
{
    return name+'='+elapsed.toPrecision(4)+'ms ('+(100*elapsed/total).toPrecision(3)+'%)';
}
*/
  protected drawWorldSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    //screenContext.save();
    for (const drawer of this._toolHost.getDrawers()) {
      screenContext.save();
      drawer.drawWorldSpace(screenContext, drawParams);
      screenContext.restore();
    }
    //screenContext.restore();
  }

  protected drawScreenSpaceToolUIs(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    //screenContext.save();
    for (const drawer of this._toolHost.getDrawers()) {
      screenContext.save();
      drawer.drawScreenSpace(screenContext, drawParams);
      screenContext.restore();
    }
    //screenContext.restore();
  }

  protected drawChart(
    screenContext: CanvasRenderingContext2D,
    viewport: CanvasParams,
    worldTransform: CanvasWorldTransform,
    xAxis: ChartAxis,
    yAxis: ChartAxis
  ): void {
    const axisDrawer = new ChartAxisDrawer();

    axisDrawer.drawAxes(screenContext, viewport, xAxis, this._ctx.xAxisLabel, yAxis, this._ctx.yAxisLabel);

    // Don't allow drawing over the axis now
    screenContext.save();
    screenContext.beginPath();
    screenContext.rect(xAxis.startPx, 0, xAxis.endPx, viewport.height - yAxis.startPx);
    screenContext.clip();

    for (let c = 0; c < this._ctx.spectrumLines.length; c++) {
      const spectrum = this._ctx.spectrumLines[c];
      this.drawSpectrum(screenContext, spectrum, this._ctx.spectrumLineDarkenIdxs.indexOf(c) > -1, xAxis, yAxis);
    }

    for (const peak of this._ctx.diffractionPeaksShown) {
      this.drawDiffractionPeakBand(screenContext, viewport, peak, xAxis);
    }
    screenContext.restore();
  }

  protected drawSpectrum(screenContext: CanvasRenderingContext2D, spectrum: SpectrumChartLine, darken: boolean, xAxis: ChartAxis, yAxis: ChartAxis) {
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
    screenContext.fillStyle = Colours.GRAY_60.asStringWithA(0.3);

    const x1 = xAxis.valueToCanvas(peak.keV - 0.1);
    const x2 = xAxis.valueToCanvas(peak.keV + 0.1);

    screenContext.fillRect(x1, 0, x2 - x1, viewport.height);
  }
}
