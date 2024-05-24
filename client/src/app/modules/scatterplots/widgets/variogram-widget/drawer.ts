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
// import { ChartAxisDrawer } from "src/app/UI/atoms/interactive-canvas/chart-axis";
// import { CanvasDrawer, CanvasDrawParameters, CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE, PLOT_POINTS_SIZE, PointDrawer } from "src/app/utils/drawing";
import { VariogramModel } from "./model";
import { CanvasDrawer, CanvasDrawParameters, CanvasParams } from "../../../widget/components/interactive-canvas/interactive-canvas.component";
import { ChartAxisDrawer } from "../../../widget/components/interactive-canvas/chart-axis";
import { MinMax } from "../../../../models/BasicTypes";

export class VariogramDrawer implements CanvasDrawer {
  protected _mdl: VariogramModel;
  protected _lastCalcCanvasParams: CanvasParams | null = null;

  constructor(mdl: VariogramModel) {
    this._mdl = mdl;
  }

  // drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void
  // {
  // }

  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // TODO: clean this up, bit ugly
    if (!this._mdl.drawData || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(drawParams.drawViewport)) {
      if (!this._mdl.recalcDisplayData(drawParams.drawViewport)) {
        return;
      }

      this._lastCalcCanvasParams = drawParams.drawViewport;
    }

    screenContext.save();

    // Draw axes
    let axisDrawer = new ChartAxisDrawer(ChartAxisDrawer.AxisLabelFontSize + "px Roboto", Colours.GRAY_80.asString(), Colours.GRAY_10.asString(), 4, 4, false);
    if (this._mdl.xAxis && this._mdl.yAxis) {
      axisDrawer.drawAxes(screenContext, drawParams.drawViewport, this._mdl.xAxis, "(h)mm", this._mdl.yAxis, "variance");
    }

    // Draw data
    this.drawData(screenContext, this._mdl);

    // Draw title
    if (this._mdl.raw?.title) {
      this.drawTitle(screenContext, this._mdl.raw.title);
    }

    screenContext.restore();
  }

  private drawTitle(screenContext: CanvasRenderingContext2D, title: string): void {
    if (!this._mdl.xAxis) {
      return;
    }

    const titlePadding = 20;
    const titlePos = new Point(this._mdl.xAxis.startPx + titlePadding, titlePadding);

    screenContext.font = "bold " + CANVAS_FONT_SIZE_TITLE + "px Roboto";
    screenContext.fillStyle = Colours.GRAY_10.asString();
    screenContext.textAlign = "left";

    screenContext.fillText(title, titlePos.x, titlePos.y);
  }

  private calculateLineOfBestFit(points: Point[]): { m: number; b: number } {
    const length = points.length;
    if (length === 0) {
      return { m: 0, b: 0 };
    }

    let sums = { x: 0, y: 0, xy: 0, x2: 0 };
    points.forEach(point => {
      sums.x += point.x;
      sums.y += point.y;
      sums.xy += point.x * point.y;
      sums.x2 += point.x * point.x;
    });

    const m = (length * sums.xy - sums.x * sums.y) / (length * sums.x2 - sums.x * sums.x);
    const b = (sums.y - m * sums.x) / length;

    return { m, b };
  }

  private drawData(screenContext: CanvasRenderingContext2D, mdl: VariogramModel): void {
    if (!mdl.drawData || !mdl.raw) {
      return;
    }

    let combinedPoints: Point[] = [];
    mdl.drawData.points.forEach((ptGroup, idx) => {
      let drawer = new PointDrawer(screenContext, PLOT_POINTS_SIZE, mdl.raw!.pointGroups[idx].colour, null, mdl.raw!.pointGroups[idx].shape);
      drawer.drawPoints(ptGroup, 1);
      if (mdl.drawBestFit) {
        combinedPoints = combinedPoints.concat(ptGroup);
      }
    });

    if (mdl.drawBestFit && combinedPoints.length > 0) {
      const { m, b } = this.calculateLineOfBestFit(combinedPoints);

      let minX = combinedPoints[0].x;
      let maxX = combinedPoints[0].x;
      combinedPoints.forEach(point => {
        if (point.x < minX) {
          minX = point.x;
        }
        if (point.x > maxX) {
          maxX = point.x;
        }
      });

      const startY = m * minX + b;
      const endY = m * maxX + b;

      screenContext.beginPath();
      screenContext.moveTo(minX, startY);
      screenContext.lineTo(maxX, endY);
      screenContext.strokeStyle = Colours.CONTEXT_PURPLE.asString();
      screenContext.lineWidth = 3;
      screenContext.stroke();
    }
  }
}
