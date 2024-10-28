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

import { Rect } from "src/app/models/Geometry";
import { Colours } from "src/app/utils/colours";
import { drawFilledCircle, drawTextWithBackground, OutlineDrawer, OUTLINE_LINE_WIDTH } from "src/app/utils/drawing";
import { RGBUPlotDrawModel, RGBUPlotModel } from "../rgbu-plot-widget/rgbu-plot-model";
import { RGBUMineralPoint } from "../rgbu-plot-widget/rgbu-plot-data";
import { CanvasDrawParameters } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { CachedCanvasChartDrawer } from "src/app/modules/widget/components/interactive-canvas/cached-drawer";
import { BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";

export class SingleAxisRGBUDrawer extends CachedCanvasChartDrawer {
  protected _mdl!: RGBUPlotModel;

  constructor(mdl: RGBUPlotModel) {
    super();

    this._mdl = mdl;
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (!this._mdl.xAxis || !this._mdl.yAxis) {
      return;
    }

    screenContext.fillStyle = Colours.GRAY_90.asString();

    // Draw axes
    const axisDrawer = this._mdl.makeChartAxisDrawer();
    axisDrawer.drawAxes(screenContext, drawParams.drawViewport, this._mdl.xAxis, "", this._mdl.yAxis, "");
  }

  drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (!this._mdl.xAxis || !this._mdl.yAxis) {
      return;
    }

    const clrLasso = Colours.CONTEXT_BLUE;

    // And lasso if any
    if (this._mdl.mouseLassoPoints) {
      const drawer = new OutlineDrawer(screenContext, clrLasso);
      drawer.lineWidth = 2;
      drawer.drawOutline(this._mdl.mouseLassoPoints);
    }

    this.drawMinerals(screenContext, this._mdl.drawModel);
    this.drawHoveredMineral(screenContext, this._mdl.drawModel);
  }

  drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Draw data
    this.drawPlot(screenContext, this._mdl.drawModel, drawParams);
  }

  private drawPlot(screenContext: OffscreenCanvasRenderingContext2D, drawData: RGBUPlotDrawModel, drawParams: CanvasDrawParameters): void {
    if (!this._mdl?.raw || !this._mdl?.plotData || !this._mdl?.plotData?.points || !this._mdl?.plotData?.yRange?.max || this._mdl.plotData.yRange.max <= 0) {
      return;
    }

    let yRangeMax = this._mdl.plotData.yRange.max || 1;

    // We draw the points as little rectangles at the specified coordinates
    for (let c = 0; c < drawData.points.length; c++) {
      if (this._mdl.plotData.points[c].roiCount && this._mdl.plotData.points[c].roiCount.length > 0) {
        let prevHeight = 0;
        this._mdl.plotData.points[c].roiCount.forEach(roi => {
          screenContext.fillStyle = roi.colour;
          let height = (roi.count / yRangeMax) * drawParams.drawViewport.height;
          screenContext.fillRect(drawData.points[c].x, drawData.yAxisLabelArea.h - height - prevHeight, drawData.pointWidth, height);
          prevHeight = height;
        });
      } else {
        screenContext.fillStyle = drawData.colours[c];
        let height = (this._mdl.plotData.points[c].count / yRangeMax) * drawParams.drawViewport.height;
        screenContext.fillRect(drawData.points[c].x, drawData.yAxisLabelArea.h - height, drawData.pointWidth, height);
      }
    }
  }

  private drawHoveredMineral(screenContext: CanvasRenderingContext2D, drawData: RGBUPlotDrawModel): void {
    if (drawData.mineralHoverIdx >= 0) {
      this.drawMineral(screenContext, drawData.minerals[drawData.mineralHoverIdx], true, true, drawData.dataArea);
    }
  }

  private drawMinerals(screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, drawData: RGBUPlotDrawModel): void {
    screenContext.textBaseline = "top";
    screenContext.textAlign = "left";

    // If we are hovered over a mineral, show ALL mineral labels, with the one hovered being last
    let isAnyHovered = drawData.mineralHoverIdx >= 0;

    let outOfBoundsLeft = new Set<number>();
    let outOfBoundsRight = new Set<number>();
    for (let c = 0; c < drawData.minerals.length; c++) {
      if (drawData.mineralHoverIdx == c) {
        // Draw the hovered one last
        continue;
      }

      let xPoint = drawData.minerals[c]?.ratioPt?.x || 0;

      if (xPoint > drawData.dataArea.maxX()) {
        outOfBoundsRight.add(c);
      } else if (xPoint < 70) {
        outOfBoundsLeft.add(c);
      } else {
        this.drawMineral(screenContext, drawData.minerals[c], false, this._mdl.showAllMineralLabels, drawData.dataArea);
      }
    }

    Array.from(outOfBoundsLeft.values()).forEach((mineralIndex, i) => {
      let outOfBoundsOffset = 1.5 * RGBUPlotModel.FONT_SIZE * i;
      this.drawMineral(
        screenContext,
        drawData.minerals[mineralIndex],
        false,
        this._mdl.showAllMineralLabels,
        drawData.dataArea,
        this._mdl.showAllMineralLabels,
        false,
        outOfBoundsOffset
      );
    });

    let keyOffset = this._mdl.keyItems.length > 0 ? 35 : 0;
    Array.from(outOfBoundsRight.values()).forEach((mineralIndex, i) => {
      let outOfBoundsOffset = 1.5 * RGBUPlotModel.FONT_SIZE * i + keyOffset;
      this.drawMineral(
        screenContext,
        drawData.minerals[mineralIndex],
        false,
        this._mdl.showAllMineralLabels,
        drawData.dataArea,
        false,
        this._mdl.showAllMineralLabels,
        outOfBoundsOffset
      );
    });

    if (isAnyHovered && !outOfBoundsLeft.has(drawData.mineralHoverIdx) && !outOfBoundsRight.has(drawData.mineralHoverIdx)) {
      this.drawMineral(screenContext, drawData.minerals[drawData.mineralHoverIdx], true, isAnyHovered, drawData.dataArea);
    }
  }

  private drawMineral(
    screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    m: RGBUMineralPoint,
    isHovered: boolean,
    drawLabel: boolean,
    drawArea: Rect,
    outOfLeftBounds: boolean = false,
    outOfRightBounds: boolean = false,
    outOfBoundsOffset: number = 0
  ) {
    if (!m?.ratioPt) {
      return;
    }

    let pt = m.ratioPt;
    let radius = isHovered ? 4 : 2;
    if (!outOfLeftBounds && !outOfRightBounds) {
      screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
      screenContext.fillRect(pt.x, 4, radius, drawArea.h + 10);
    }

    if (drawLabel || outOfLeftBounds || outOfRightBounds) {
      let text = outOfLeftBounds ? `← ${m.name}` : outOfRightBounds ? `${m.name} →` : m.name;
      const textOffset = 4;
      const padding = 3;

      let backgroundColour = isHovered ? Colours.GRAY_80.asStringWithA(0.9) : Colours.GRAY_80.asStringWithA(0.5);
      let textColour = isHovered ? Colours.CONTEXT_PURPLE.asString() : Colours.GRAY_10.asString();

      let xPos = pt.x + textOffset;
      let yPos = textOffset;
      if (outOfLeftBounds) {
        xPos = 70;
        yPos = textOffset + outOfBoundsOffset;
      } else if (outOfRightBounds) {
        xPos = drawArea.maxX() - screenContext.measureText(text).width - textOffset * 2;
        yPos = textOffset + outOfBoundsOffset;
      }

      drawTextWithBackground(screenContext, text, xPos, yPos, RGBUPlotModel.FONT_SIZE, padding, backgroundColour, textColour);
    }
  }
}
