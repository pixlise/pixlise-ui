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

import { Point, Rect } from "src/app/models/Geometry";
import {
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasDrawParameters,
  CanvasParams,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { XRFLine, XRFLineType } from "src/app/periodic-table/XRFLine";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { Colours, RGBA } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE } from "src/app/utils/drawing";
import { ISpectrumChartModel } from "../spectrum-model-interface";
import { BaseUIElement } from "./base-ui-element";

class XRFLinesToTag {
  constructor(
    public group: XRFLineGroup,
    public nearbyLines: XRFLine[],
    public associatedLines: Set<string>
  ) {}
}

class XRFPileup {
  constructor(
    public name: string,
    public eV: number
  ) {}
}

const LABEL_RAISE_PX = 20;
const MOUSE_TOLERANCE_TO_LINE = 2;

export class ChartXRFLines extends BaseUIElement {
  private _lineElementYs: Map<number, number> = new Map<number, number>();
  private _hoverLines: XRFLine[] = [];

  private _pileUpPeaks: XRFPileup[] = [];

  clrPinHead = Colours.GRAY_10;
  clrPinHeadFaded = Colours.GRAY_40;
  clrLineLabel = Colours.GRAY_30.asString();

  clrLineHighlight = Colours.GRAY_30;

  clrMainLine = Colours.PURPLE;
  clrOtherLine = Colours.ORANGE;
  clrEscapeLine = Colours.BLUE;

  clrSelectedMainLine = Colours.PURPLE;
  clrSelectedOtherLine = Colours.GRAY_50;

  clrPileupLine = Colours.GRAY_60.asString();

  constructor(ctx: ISpectrumChartModel) {
    super(ctx);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    // If x-axis isn't calibrated, we can't operate
    if (!this._ctx.xAxisEnergyScale) {
      return CanvasInteractionResult.neither;
    }

    // Need to detect hover & work out pileup lines
    // NOTE: if that's all contained in this class, pull it out of model & put it in here!

    /*if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
    } else if (event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
    } else*/ if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      this.handleMouseMove(event.canvasPoint);
    } else if (event.eventId == CanvasMouseEventId.MOUSE_LEAVE) {
      this._hoverLines = [];
      this._pileUpPeaks = [];
    } /*else if (event.eventId == CanvasMouseEventId.MOUSE_UP) {
    }*/

    return CanvasInteractionResult.neither;
  }

  override drawScreenSpace(ctx: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // If x-axis isn't calibrated, we don't draw
    if (!this._ctx.xAxisEnergyScale) {
      return;
    }

    this.cacheSpectrumElementYs();

    // Any labels we draw need to be centered, and above coord
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    const isPickedHighlighted = this.isPickedLineHighlighted();

    // Work out which element is the x-ray tube one. If it's in our picked list, we draw it differently...
    let tubeZ = 0;
    if (this._ctx.envService.detectorConfig) {
      tubeZ = this._ctx.envService.detectorConfig.tubeElement;
    }

    // Draw picked lines
    for (const group of this._ctx.xrfLinesPicked) {
      this.drawPickedLines(ctx, drawParams.drawViewport, group, tubeZ == group.atomicNumber);
    }

    // If there are highlighted lines to be drawn, do that...
    if (this._ctx.xrfLinesHighlighted) {
      this.drawHoverLines(ctx, drawParams.drawViewport, isPickedHighlighted);
    }

    this.drawHoverLineTags(ctx, drawParams.drawViewport);

    // Pile-up locations
    this.drawPileupLines(ctx, this.clrPileupLine);

    // Draw peak labels (as turned on by user)
    for (const elem of this._ctx.shownElementPeakLabels) {
      this.drawPeakLabelsForElement(ctx, elem);
    }
  }

  private isPickedLineHighlighted(): boolean {
    // TODO: This is a bit ugly, maybe we can solve it without a loop in time by storing a set of atomic numbers for each
    //       line category (picked, highlighted)
    if (this._ctx.xrfLinesHighlighted) {
      for (const group of this._ctx.xrfLinesPicked) {
        if (this._ctx.xrfLinesHighlighted.atomicNumber == group.atomicNumber) {
          return true;
        }
      }
    }
    return false;
  }

  private drawHoverLines(ctx: CanvasRenderingContext2D, viewport: CanvasParams, isPickedLine: boolean): void {
    if (!this._ctx.xrfLinesHighlighted) {
      return;
    }

    for (const line of this._ctx.xrfLinesHighlighted.lines) {
      let clr = this.clrLineHighlight;
      if (isPickedLine) {
        // Hover over picked line draws it with normal colouring
        clr = this.getLineColourForPickState(line);
      }

      const isPickedMaxLine = isPickedLine && line.isMaxLine();
      this.drawXRFLine(ctx, viewport, line, clr, this.clrPinHead, isPickedMaxLine, isPickedMaxLine, false, false);
    }
  }

  private getLineColourForPickState(line: XRFLine): RGBA {
    let clr = this.clrMainLine;
    if (line.lineType == XRFLineType.ESCAPE) {
      clr = this.clrEscapeLine;
    } else if (line.isOtherLine()) {
      clr = this.clrOtherLine;
    }
    return clr;
  }

  private drawPickedLines(ctx: CanvasRenderingContext2D, viewport: CanvasParams, group: XRFLineGroup, drawDashed: boolean): void {
    for (const line of group.allLines) {
      const clr = this.getLineColourForPickState(line);
      this.drawXRFLine(ctx, viewport, line, clr, this.clrPinHead, false, false, false, drawDashed);
    }
  }

  private drawXRFLine(
    ctx: CanvasRenderingContext2D,
    viewport: CanvasParams,
    line: XRFLine,
    clrLine: RGBA,
    clrPinHead: RGBA,
    drawLabel: boolean,
    fatLine: boolean,
    isPickedLine: boolean,
    drawDashed: boolean
  ): void {
    const topPos = this.calcLineTopPixelPos(line);

    // If it's out of the view, don't draw it
    if (!this._ctx.xAxis || topPos.x < this._ctx.xAxis.startPx || !this._ctx.yAxis) {
      return;
    }

    // If line is too low or high in energy, we dim it
    let isEnergyOutOfRange = false;
    if (line.eV < this._ctx.xrfeVLowerBound || line.eV > this._ctx.xrfeVUpperBound) {
      ctx.strokeStyle = clrLine.asStringWithA(0.2);
      isEnergyOutOfRange = true;
    } else {
      ctx.strokeStyle = clrLine.asString();
    }

    // Make things bigger if it's the line we're mouse "hovering" over
    const pinHeadRadius = 1.5;
    ctx.lineWidth = fatLine ? 3 : 1;

    const xAxisTop = viewport.height - this._ctx.yAxis.startPx;

    // If it doesn't reach the bottom of the window, draw a marker for it (else we'd get some weird effects of the line reaching down into the axis)
    if (topPos.y > xAxisTop) {
      // Draw pin head
      // TODO: Maybe we should draw a triangle pointing down?
      ctx.fillStyle = isEnergyOutOfRange ? clrPinHead.asStringWithA(0.2) : clrPinHead.asString();
      ctx.beginPath();
      ctx.arc(topPos.x, xAxisTop, pinHeadRadius, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      if (drawDashed) {
        ctx.setLineDash([5, 3]);
      }

      // Draw a line
      ctx.beginPath();
      ctx.moveTo(topPos.x, xAxisTop);
      ctx.lineTo(topPos.x, topPos.y);
      ctx.stroke();

      if (drawDashed) {
        ctx.setLineDash([]);
      }

      // And a pin head
      ctx.fillStyle = isEnergyOutOfRange ? clrPinHead.asStringWithA(0.2) : clrPinHead.asString();
      ctx.beginPath();
      ctx.arc(topPos.x, topPos.y, pinHeadRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw a label if needed
      if (drawLabel && !isEnergyOutOfRange) {
        ctx.fillStyle = this.clrLineLabel;
        ctx.fillText(line.elementSymbol, topPos.x, topPos.y - LABEL_RAISE_PX);
      }
    }
  }

  private drawHoverLineTags(ctx: CanvasRenderingContext2D, viewport: CanvasParams) {
    if (this._hoverLines.length <= 0) {
      return;
    }

    const boxBGColour = Colours.GRAY_100.asStringWithA(0.5);
    const textColour = Colours.GRAY_10.asString();

    const font = CANVAS_FONT_SIZE + "px Roboto";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const drawnRects: Rect[] = [];

    // Run through the hover-marked lines, get their positions, then we need to put them in Y-order so our boxes don't get in some messy
    // order when drawing, as they draw 1 below the next.
    const labelsToDraw = [];
    for (const line of this._hoverLines) {
      const lineTop = this.calcLineTopPixelPos(line);
      labelsToDraw.push({ line: line, top: lineTop });
    }

    // Now order them
    labelsToDraw.sort((a, b) => {
      if (a["top"].y == b["top"].y) {
        return 0;
      }
      if (a["top"].y > b["top"].y) {
        return 1;
      }
      return -1;
    });

    // Now draw them
    for (const lbl of labelsToDraw) {
      const rect = this.drawLineLabel(ctx, viewport, lbl["top"], lbl["line"], font, boxBGColour, textColour, drawnRects);
      drawnRects.push(rect);
    }
  }

  private drawLineLabel(
    ctx: CanvasRenderingContext2D,
    viewport: CanvasParams,
    lineTop: Point,
    line: XRFLine,
    font: string,
    boxBGColour: string,
    textColour: string,
    drawnRects: Rect[]
  ): Rect {
    const title = line.elementSymbol + " " + (line.eV / 1000).toFixed(3) + "keV";
    const lineInfo = line.siegbahn + ": " + line.intensity.toFixed(5);

    let textWidth = ctx.measureText(lineInfo).width;
    if (title.length > lineInfo.length) {
      const titleWidth = ctx.measureText(title).width;
      if (titleWidth > textWidth) {
        textWidth = titleWidth;
      }
    }
    textWidth = Math.floor(textWidth);

    const padding = 4;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = CANVAS_FONT_SIZE * 2 + padding * 2.5;

    const left = this._ctx.chartArea.x;
    const right = this._ctx.chartArea.maxX();

    const xMid = (left + right) / 2;

    // text direction...
    let xOffset = 0;
    if (lineTop.x < xMid) {
      xOffset = padding;
    } else {
      xOffset = -(padding + boxWidth);
    }

    // Account for it being off-screen & being moved to be on-screen next to triangle label
    let labelX = lineTop.x + xOffset;
    const labelY = lineTop.y - boxHeight / 2;
    const markerW = 8;
    const markerH = 10;
    let drawTriangleSideLeft = null;

    if (labelX < left) {
      labelX = left + markerW;
      drawTriangleSideLeft = true;
    } else if (labelX + boxWidth > right) {
      labelX = right - markerW - boxWidth;
      drawTriangleSideLeft = false;
    }

    const boxPos = new Rect(labelX, labelY, boxWidth, boxHeight);

    this.preventLabelOverlap(drawnRects, boxPos, padding);

    // Draw off-screen marker triangle if needed
    if (drawTriangleSideLeft !== null) {
      this.drawTriangleMarker(ctx, drawTriangleSideLeft, boxPos.y + boxHeight / 2, markerW, markerH);
    }

    // Draw the label
    this.drawLabel(ctx, boxPos, title, lineInfo, padding, font, boxBGColour, textColour);

    return boxPos;
  }

  private drawTriangleMarker(ctx: CanvasRenderingContext2D, leftSide: boolean, y: number, width: number, height: number): void {
    const xPos = leftSide ? this._ctx.chartArea.x : this._ctx.chartArea.maxX();
    const xMove = leftSide ? width : -width;

    ctx.fillStyle = Colours.GRAY_10.asString();
    ctx.beginPath();
    ctx.moveTo(xPos, y);
    ctx.lineTo(xPos + xMove, y + height / 2);
    ctx.lineTo(xPos + xMove, y - height / 2);
    ctx.closePath();

    ctx.fill();
  }

  private drawLabel(
    ctx: CanvasRenderingContext2D,
    boxPos: Rect,
    title: string,
    body: string,
    padding: number,
    font: string,
    bgColour: string,
    textColour: string
  ): void {
    // background first:
    ctx.fillStyle = bgColour;
    ctx.fillRect(boxPos.x, boxPos.y, boxPos.w, boxPos.h);

    // line info on top of background
    ctx.fillStyle = textColour;
    ctx.font = "bold " + font;
    ctx.fillText(title, boxPos.x + padding, boxPos.y + padding);
    ctx.font = "normal " + font;
    ctx.fillText(body, boxPos.x + padding, boxPos.y + padding * 1.5 + CANVAS_FONT_SIZE);
  }

  protected drawPeakLabelsForElement(ctx: CanvasRenderingContext2D, line: XRFLine) {
    if (!this._ctx.xAxis) {
      return;
    }

    if (line.eV >= this._ctx.xrfeVLowerBound && line.eV <= this._ctx.xrfeVUpperBound) {
      // Look up where to position it above the spectrum
      const topPos = this.calcLineTopPixelPos(line);

      // If it's out of the view, don't draw it
      if (topPos.x < this._ctx.xAxis.startPx) {
        return;
      }

      const y = topPos.y - LABEL_RAISE_PX;

      // Draw the symbol
      ctx.textAlign = "center";
      ctx.fillStyle = Colours.GRAY_30.asString();
      const sz = ctx.measureText(line.elementSymbol);
      ctx.fillText(line.elementSymbol, topPos.x, y);

      // And which line it is
      ctx.textAlign = "left";
      ctx.fillStyle = Colours.GRAY_50.asString();
      ctx.fillText(line.siegbahn, topPos.x + sz.width - CANVAS_FONT_SIZE * 0.25, y);
    }
  }

  private preventLabelOverlap(drawnRects: Rect[], boxPos: Rect, padding: number): void {
    // Find the lowest point on any box that sits in our X range
    let bottomBoxY = 0;
    for (const drawnBox of drawnRects) {
      if ((drawnBox.x >= boxPos.x && drawnBox.x <= boxPos.maxX()) || (drawnBox.maxX() >= boxPos.x && drawnBox.maxX() <= boxPos.maxX())) {
        const drawnMaxY = drawnBox.maxY();
        if (drawnMaxY > bottomBoxY) {
          bottomBoxY = drawnMaxY;
        }
      }
    }

    if (bottomBoxY > boxPos.y) {
      const offsetY = bottomBoxY - boxPos.y + padding / 2;
      boxPos.y += offsetY;
    }
  }

  private drawPileupLines(ctx: CanvasRenderingContext2D, pileUpColour: string): void {
    if (!this._ctx.xAxis) {
      return;
    }

    // These are all drawn the same way, just as indicators
    const textGap = 3;
    const yJump = CANVAS_FONT_SIZE + textGap;

    ctx.textAlign = "right";

    let yText = this._ctx.chartArea.maxY();
    for (const pileUp of this._pileUpPeaks) {
      const x = this._ctx.xAxis.valueToCanvas(pileUp.eV / 1000);

      this.drawPileupLine(ctx, x, pileUpColour, pileUp.name, textGap, yText);
      yText -= yJump;
    }
  }

  private drawPileupLine(ctx: CanvasRenderingContext2D, x: number, colour: string, name: string, textGap: number, textY: number): void {
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.setLineDash([5, 2]);
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, textY + textGap);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.fillText(name, x - textGap, textY);
  }

  private calcLineTopPixelPos(line: XRFLine): Point {
    if (!this._ctx.xAxis || !this._ctx.yAxis) {
      return new Point(0, 0);
    }

    // If we have a Y, use it
    let yMax: number | null | undefined = this._lineElementYs.get(line.atomicNumber);
    if (!yMax) {
      yMax = this._ctx.lineRangeY.max;
    }

    // Prevent null crap-out, but not sure what implications this has for bugs...
    if (yMax === null) {
      yMax = 0;
    }

    return new Point(Math.floor(this._ctx.xAxis.valueToCanvas(line.eV / 1000)), Math.floor(this._ctx.yAxis.valueToCanvas(line.intensity * yMax)));
  }

  private cacheSpectrumElementYs(): void {
    this._lineElementYs.clear();

    if (this._ctx.spectrumLines.length <= 0) {
      // Nothing to scale them against
      return;
    }

    // Loop through all elements we have lines for and find their Y scale value
    const allLines: XRFLine[] = [];
    for (const group of this._ctx.xrfLinesPicked) {
      allLines.push(...group.lines);
    }

    if (this._ctx.xrfLinesHighlighted) {
      allLines.push(...this._ctx.xrfLinesHighlighted.lines);
    }

    allLines.push(...this._ctx.shownElementPeakLabels);

    for (const line of allLines) {
      if (
        line.eV > this._ctx.xrfeVLowerBound &&
        line.eV < this._ctx.xrfeVUpperBound &&
        (line.lineType == XRFLineType.K_MAX || line.lineType == XRFLineType.L_MAX || line.lineType == XRFLineType.M_MAX) &&
        this._lineElementYs.get(line.atomicNumber) === undefined
      ) {
        const maxSpecVal = this._ctx.getMaxSpectrumValueAtEnergy(line.eV / 1000);
        if (maxSpecVal != null) {
          this._lineElementYs.set(line.atomicNumber, maxSpecVal);
        }
      }
    }
  }

  private handleMouseMove(pt: Point): void {
    this._hoverLines = [];
    this._pileUpPeaks = [];

    if (pt.x < this._ctx.chartArea.x) {
      return;
    }

    // We've found all lines that are near the mouse, now lets build a list of all lines that need to have tags drawn.
    // These include lines associated with the nearby lines, eg escapes for a main line hovered on, or vice-versa
    const nearMouse = this.findLinesNearMouse(this._ctx.xrfLinesPicked, pt, MOUSE_TOLERANCE_TO_LINE, this._pileUpPeaks);

    // To do this, we loop through the groups identified near the mouse, and for the lines we've marked, we find
    // their associated line by name. Because there can be multiple associations, we need to track them in a set as
    // well to ensure we don't add duplicates
    for (const item of nearMouse) {
      // Add all lines that were near the mouse
      this._hoverLines = this._hoverLines.concat(item.nearbyLines);

      // run through all lines and if a line matches an associated line name, add that too
      for (const line of item.group.allLines) {
        if (item.associatedLines.has(line.siegbahn)) {
          this._hoverLines.push(line);
        }
      }
    }
  }

  private findLinesNearMouse(groups: XRFLineGroup[], pt: Point, toleranceX: number, out_pileupPeaks: XRFPileup[]): XRFLinesToTag[] {
    const result: XRFLinesToTag[] = [];

    for (const group of groups) {
      const closeLines: XRFLine[] = [];
      const associatedLines = new Set<string>();

      for (let c = 0; c < group.lines.length; c++) {
        const line = group.lines[c];
        const lineTop = this.calcLineTopPixelPos(line);
        if (
          pt.x > lineTop.x - toleranceX &&
          pt.x < lineTop.x + toleranceX &&
          pt.y > lineTop.y // Y axis is flipped, so 0 at top, so if we're > y, we're at pin or below
        ) {
          closeLines.push(line);

          // Lines that may be associated with this would be the same name, but with Esc
          associatedLines.add("Esc" + line.siegbahn);

          // For non-escape lines we're pointing to, we also show their pile-up location
          // which is at 2x eV value
          out_pileupPeaks.push(new XRFPileup(line.elementSymbol + " " + line.siegbahn + " pile-up", line.eV * 2));
        }
      }

      for (let c = 0; c < group.escapeLines.length; c++) {
        const line = group.escapeLines[c];
        const lineTop = this.calcLineTopPixelPos(line);
        if (
          pt.x > lineTop.x - toleranceX &&
          pt.x < lineTop.x + toleranceX &&
          pt.y > lineTop.y // Y axis is flipped, so 0 at top, so if we're > y, we're at pin or below
        ) {
          closeLines.push(line);

          // Lines that may be associated with this would be the same name, but without Esc
          associatedLines.add(line.siegbahn.substr(3));
        }
      }

      if (closeLines.length > 0) {
        result.push(new XRFLinesToTag(group, closeLines, associatedLines));
      }
    }

    return result;
  }
}
