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

import { MinMax } from "src/app/models/BasicTypes";
// import { CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
import { CanvasParams } from "./interactive-canvas.component";
// import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { PanZoom } from "./pan-zoom";
// For drawing
import { Colours } from "src/app/utils/colours";
// import { CANVAS_FONT_SIZE_TITLE, CANVAS_FONT_WIDTH_PERCENT } from "src/app/utils/drawing";
import { CANVAS_FONT_SIZE_TITLE, CANVAS_FONT_WIDTH_PERCENT } from "src/app/utils/drawing";
import { niceNum, UNICODE_ELLIPSIS } from "src/app/utils/utils";

export class ChartAxisTick {
  constructor(
    public displayValue: string,
    public px: number
  ) {}
}

export class ChartAxis {
  protected _ticks: ChartAxisTick[] = [];
  protected _viewport: CanvasParams | null = null;
  protected _transform: PanZoom | null = null;
  protected _valueRange: number = 0;
  protected _endPx: number = 0;

  constructor(
    private _horizontal: boolean,
    private _startPx: number,
    private _pxLength: number,
    private _minValue: number,
    private _maxValue: number,
    private _dataPadding: number // Padding to apply between startPx and the first drawn location. This requires pxLength to take this into account!
  ) {
    this._valueRange = this._maxValue - this._minValue;
    this._endPx = this._startPx + this._pxLength;
  }

  updateAxis(viewport: CanvasParams, transform: PanZoom): void {}

  // Converts chart value (in this axis) to be a percentage of min-max value. This is implemented by derived
  // classes to calculate it in whatever way is needed, eg log/linear, etc.
  valueToPct(value: number): number {
    return 0;
  }

  // The opposite of valueToPct
  pctToValue(pct: number): number {
    return 0;
  }

  // Converts pct value (between min-max) to canvas space point
  pctToCanvas(pct: number): number {
    const pan = this.getPan();
    const scale = this.getScale();
    const startPx = this.getStartPx();

    const px = startPx + pan + scale * pct * this.pxLength + this._dataPadding;
    return px;
  }

  // The opposite of pctToCanvas
  canvasToPct(canvas: number): number {
    const pan = this.getPan();
    const scale = this.getScale();
    const startPx = this.getStartPx();

    // Work out where we are in the value range
    return (canvas - this._dataPadding - startPx - pan) / (this.pxLength * scale);
  }

  // Converting a pct value (pct within min-max) to canvas space
  valueToCanvas(value: number): number {
    const pct = this.valueToPct(value);
    return this.pctToCanvas(pct);
  }

  // The opposite of valueToCanvas
  canvasToValue(canvas: number): number {
    const pct = this.canvasToPct(canvas);
    return this.pctToValue(pct);
  }

  get ticks(): ChartAxisTick[] {
    return this._ticks;
  }

  public get horizontal(): boolean {
    return this._horizontal;
  }

  public get startPx(): number {
    return this._startPx;
  }

  public get endPx(): number {
    return this._endPx;
  }

  public get pxLength(): number {
    return this._pxLength;
  }

  public get minValue(): number {
    return this._minValue;
  }

  public get maxValue(): number {
    return this._maxValue;
  }

  protected get valueRange(): number {
    return this._valueRange;
  }

  protected getPan(): number {
    const pan = this.horizontal ? this._transform?.pan.x : this._transform?.pan.y;
    return Math.round(pan || 0);
  }

  protected getScale(): number {
    return (this.horizontal ? this._transform?.scale.x : this._transform?.scale.y) || 1;
  }

  protected flipIfNeeded(pct: number): number {
    if (!this.horizontal && internalVerticalFlipY) {
      return 1 - pct;
    }
    return pct;
  }

  protected getStartPx(): number {
    let startPx = this.startPx;
    if (!this.horizontal && internalVerticalFlipY) {
      startPx = 0; // We're flipping Y, startPx doesn't apply here because we're drawing relative to the top
      // of the viewport, while startPx is defining the size of the axis (which is at the bottom)
    }
    return startPx;
  }
}

// HTML Canvas coordinate space is top-left: 0,0 and bottom-right: w,h
// We want our ever-more-positive axis data values to draw up from the
// bottom of the chart. This flag makes the y-flip to be applied to vertical
// axes
export const verticalFlipY: boolean = false;
export const internalVerticalFlipY: boolean = true;

export class LinearChartAxis extends ChartAxis {
  private _minPixelsBetweenTicks: number = 100;

  constructor(
    horizontal: boolean,
    startPx: number,
    pxLength: number,
    minValue: number,
    maxValue: number,
    // Padding to apply between startPx and the first drawn location. This requires pxLength to take this into account!
    dataPadding: number = 0
  ) {
    super(horizontal, startPx, pxLength, minValue, maxValue, dataPadding);
  }

  setMinPixelsBetweenTicks(val: number) {
    this._minPixelsBetweenTicks = val;
  }

  override updateAxis(viewport: CanvasParams, transform: PanZoom): void {
    this._viewport = viewport;
    this._transform = transform;

    // We need to work out what the limits of our display are in terms of chart values, then find
    // round values that we can draw grid lines/ticks for
    let startPx = this.startPx;
    let endPx = this._endPx;

    if (!this.horizontal && internalVerticalFlipY) {
      startPx = this._viewport.height - startPx;
      endPx = this._viewport.height - endPx;
    }

    const valueStart = this.canvasToValue(startPx);
    let valueEnd = this.canvasToValue(endPx);

    if (valueEnd > this.maxValue * 2) {
      valueEnd = this.maxValue * 2;
    }

    const maxNumSpaces = Math.abs(endPx - startPx) / this._minPixelsBetweenTicks; // dont need them more than this many px apart
    const spacing = niceNum((valueEnd - valueStart) / maxNumSpaces);

    let roundedValueStart = Math.ceil(valueStart / spacing) * spacing;
    let roundedValueEnd = Math.ceil(valueEnd / spacing) * spacing;

    if (roundedValueEnd < roundedValueStart) {
      const tmp = roundedValueEnd;
      roundedValueEnd = roundedValueStart;
      roundedValueStart = tmp;
    }

    // Weird situation of negative 0's. Thanks JS
    if (Object.is(roundedValueStart, -0)) {
      roundedValueStart = 0;
    }

    this._ticks = [];
    for (let v = roundedValueStart; v < roundedValueEnd; v += spacing) {
      let valStr = v.toLocaleString();

      // If our max chart value is becoming pretty large to print...
      if (this.maxValue > 100000) {
        // Shorten the string with K, M, B
        if (this.maxValue > 1000000000) {
          valStr = (v / 1000000000).toPrecision(3) + "B";
        } else if (this.maxValue > 1000000) {
          valStr = (v / 1000000).toPrecision(3) + "M";
        } else if (this.maxValue > 1000) {
          valStr = (v / 1000).toPrecision(3) + "K";
        }
      }

      this._ticks.push(new ChartAxisTick(valStr, this.valueToCanvas(v)));
    }
  }

  override valueToPct(value: number): number {
    return this.flipIfNeeded((value - this.minValue) / this.valueRange);
  }

  override pctToValue(pct: number): number {
    return this.minValue + this.flipIfNeeded(pct) * this.valueRange;
  }
}

export class LogarithmicChartAxis extends ChartAxis {
  constructor(
    horizontal: boolean,
    startPx: number,
    pxLength: number,
    minValue: number,
    maxValue: number,
    protected _scaleForShowingBelow1: number = 1 // Leave as 1 to start log scale at 1, set to 10 or 100 etc to show decimal places starting from 1/this value
  ) {
    // KNOWN ISSUE: This doesn't correctly draw/handle negative values in logarithmic mode. Bottom of Y axis is always 0, so weird stuff happens
    //              if we try to draw negative below it. Chart.js (which this approach is based on) has the same issue. Log(0) is undefined, so
    //              this mathematically doesn't make sense. Could hack around it somehow if needed I guess
    //              See: https://github.com/chartjs/Chart.js/issues/4259
    super(
      horizontal,
      startPx,
      pxLength,
      //minValue === 0 ? 0 : Math.floor(Math.log10(minValue)),
      minValue <= 0 ? 0 : Math.floor(Math.log10(minValue)),
      //minValue === 0 ? 0 : (minValue < 0 ? (-Math.floor(Math.log10(-minValue))) : Math.floor(Math.log10(minValue))),
      maxValue === 0 ? 0 : Math.ceil(Math.log10(maxValue * _scaleForShowingBelow1)),
      0
    );
  }

  override updateAxis(viewport: CanvasParams, transform: PanZoom): void {
    this._viewport = viewport;
    this._transform = transform;

    // We need to work out what the limits of our display are in terms of chart values, then find
    // round values that we can draw grid lines/ticks for
    let startPx = this.startPx;
    let endPx = this._endPx;

    if (!this.horizontal && internalVerticalFlipY) {
      startPx = this._viewport.height - startPx;
      endPx = this._viewport.height - endPx;
    }

    const valueStart = Math.log10(this.canvasToValue(startPx));
    let valueEnd = Math.log10(this.canvasToValue(endPx));

    if (valueEnd > this.maxValue * 2) {
      valueEnd = this.maxValue * 2;
    }

    let roundedValueStart = Math.floor(valueStart);
    let roundedValueEnd = Math.ceil(valueEnd);

    const spacing = 1;

    if (roundedValueEnd < roundedValueStart) {
      const tmp = roundedValueEnd;
      roundedValueEnd = roundedValueStart;
      roundedValueStart = tmp;
    }

    this._ticks = [];

    for (let p = roundedValueStart; p <= roundedValueEnd; p += spacing) {
      if (p >= valueStart) {
        // don't draw below the axis
        const v = Math.pow(10, p);
        const px = this.valueToCanvas(v);

        this._ticks.push(new ChartAxisTick(v.toLocaleString(), px));
      }
    }
  }

  override valueToPct(value: number): number {
    let pct = 0;
    if (value > 0) {
      let valueScaled = value;
      if (this._scaleForShowingBelow1 != 1) {
        valueScaled *= this._scaleForShowingBelow1;
      }
      pct = (Math.log10(valueScaled) - this.minValue) / this.valueRange;
    }
    return this.flipIfNeeded(pct);
  }

  override pctToValue(pct: number): number {
    const pow = this.minValue + this.flipIfNeeded(pct) * this.valueRange;
    let result = Math.pow(10, pow);
    if (this._scaleForShowingBelow1 != 1) {
      result /= this._scaleForShowingBelow1;
    }
    return result;
  }
}

export class LabelledChartAxis extends LinearChartAxis {
  constructor(
    horizontal: boolean,
    startPx: number,
    pxLength: number,
    minValue: number,
    maxValue: number,
    protected _labels: string[]
  ) {
    super(horizontal, startPx, pxLength, minValue, maxValue, 0);
  }

  override updateAxis(viewport: CanvasParams, transform: PanZoom): void {
    super.updateAxis(viewport, transform);

    // Generate a tick for each value
    this._ticks = [];

    const pixelsPerTick = this.pxLength / (this.maxValue - this.minValue);
    const maxCharsVisible = pixelsPerTick / (ChartAxisDrawer.AxisLabelFontSize * CANVAS_FONT_WIDTH_PERCENT);

    for (let v = this.minValue; v < this.maxValue; v++) {
      let label = this._labels[v];
      if (label.length > maxCharsVisible) {
        label = label.slice(0, maxCharsVisible - 1);
        label += UNICODE_ELLIPSIS;
      }

      this._ticks.push(new ChartAxisTick(label, this.valueToCanvas(v)));
    }
  }
}

export class ChartAxisDrawer {
  public static readonly AxisLabelFontSize = CANVAS_FONT_SIZE_TITLE - 2;

  constructor(
    protected _axisFont: string = ChartAxisDrawer.AxisLabelFontSize + "px Roboto",
    protected _axisLineColour: string = Colours.GRAY_80.asString(),
    protected _axisTextColour: string = Colours.GRAY_60.asString(),
    protected _axisValueGap: number = 4,
    protected _axisTickOverhang: number = 4,
    protected _drawGridLine: boolean = true
  ) {}

  private setupForDraw(screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    screenContext.strokeStyle = this._axisLineColour;
    screenContext.fillStyle = this._axisTextColour;
    screenContext.font = this._axisFont;
    screenContext.lineWidth = 1;
  }

  drawAxes(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, xAxis: ChartAxis, xAxisTitle: string, yAxis: ChartAxis, yAxisTitle: string): void {
    this.setupForDraw(screenContext);

    this.drawXAxis(screenContext, viewport, xAxis, yAxis, xAxisTitle);
    this.drawYAxis(screenContext, viewport, xAxis, yAxis, yAxisTitle);
  }

  protected drawXAxis(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, xAxis: ChartAxis, yAxis: ChartAxis, title: string): void {
    const xAxisLeftMargin = yAxis.startPx;

    const ticks = xAxis.ticks;

    // draw lines (these are the tick lines, if we have grid lines turned on they extend across the chart)
    const lineEnd = this._drawGridLine ? viewport.height - xAxisLeftMargin : 0;
    screenContext.beginPath();
    for (const tick of ticks) {
      screenContext.moveTo(tick.px, 0);
      screenContext.lineTo(tick.px, lineEnd);
    }
    screenContext.stroke();

    // draw values
    screenContext.textAlign = "center";
    screenContext.textBaseline = "top";

    // If we're drawing a labelled axis, draw them in the middle of the space between 2 labels
    let xOffset = 0;
    if (xAxis instanceof LabelledChartAxis && ticks.length > 1) {
      xOffset = (ticks[1].px - ticks[0].px) / 2;
    }

    for (const tick of ticks) {
      screenContext.fillText(tick.displayValue, tick.px + xOffset, viewport.height - xAxisLeftMargin + this._axisTickOverhang + this._axisValueGap);
    }

    // Draw line at axis for labels to sit next to
    const x = xAxis.startPx;
    screenContext.beginPath();
    screenContext.moveTo(x, 0);
    screenContext.lineTo(x, viewport.height - xAxisLeftMargin + this._axisTickOverhang);
    screenContext.stroke();

    // Draw axis label
    screenContext.textAlign = "center";
    screenContext.textBaseline = "top";

    if (title.length > 0) {
      screenContext.fillText(title, viewport.width / 2, viewport.height - CANVAS_FONT_SIZE_TITLE);
    }
  }

  protected drawYAxis(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, xAxis: ChartAxis, yAxis: ChartAxis, title: string): void {
    const yAxisLeftMargin = xAxis.startPx;

    const ticks = yAxis.ticks;

    // draw lines (these are the tick lines, if we have grid lines turned on they extend across the chart)
    screenContext.beginPath();
    const lineEnd = this._drawGridLine ? viewport.width : yAxisLeftMargin;
    for (const tick of ticks) {
      screenContext.moveTo(yAxisLeftMargin - this._axisTickOverhang, tick.px);
      screenContext.lineTo(lineEnd, tick.px);
    }
    screenContext.stroke();

    // draw values
    screenContext.textAlign = "right";
    screenContext.textBaseline = "middle";

    for (const tick of ticks) {
      screenContext.fillText(tick.displayValue, yAxisLeftMargin - this._axisTickOverhang - this._axisValueGap, tick.px);
    }

    // Draw line at axis for labels to sit next to
    const y = viewport.height - yAxis.startPx;
    screenContext.beginPath();
    screenContext.moveTo(yAxisLeftMargin, y);
    screenContext.lineTo(viewport.width, y);
    screenContext.stroke();

    // Draw axis label
    if (title.length > 0) {
      screenContext.save();
      screenContext.textAlign = "center";
      screenContext.textBaseline = "top";

      screenContext.translate(this._axisValueGap, viewport.height / 2);
      screenContext.rotate(-Math.PI / 2);
      screenContext.fillText(title, 0, 0);
      screenContext.restore();
    }
  }

  public getLongestTickLabelPx(screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, axis: ChartAxis): number {
    // NOTE: This has to be in sync with how drawYAxis does its job!
    this.setupForDraw(screenContext);

    const minmax = new MinMax(0, 0);
    for (const tick of axis.ticks) {
      minmax.expand(screenContext.measureText(tick.displayValue).width);
    }

    return minmax.max || 0;
  }
}
