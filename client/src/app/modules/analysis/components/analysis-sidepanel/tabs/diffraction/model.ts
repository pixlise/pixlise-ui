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

import { Subject } from "rxjs";
import { DataQueryResult } from "src/app/expression-language/data-values";
import { MinMax } from "src/app/models/BasicTypes";
import { Point, Rect } from "src/app/models/Geometry";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { ChartAxis, LinearChartAxis } from "src/app/modules/widget/components/interactive-canvas/chart-axis";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
// import { ChartAxis, LinearChartAxis } from "src/app/UI/atoms/interactive-canvas/chart-axis";
// import { CanvasParams } from "src/app/UI/atoms/interactive-canvas/interactive-canvas.component";
// import { PanZoom } from "src/app/UI/atoms/interactive-canvas/pan-zoom";
import { RGBA } from "src/app/utils/colours";

export type HighlightedDiffraction = {
  widgetId: string;
  peaks: DiffractionPeak[];
  keVStart: number;
  keVEnd: number;
};

export type HighlightedContextImageDiffraction = {
  widgetId: string;
  result: DataQueryResult | null;
  expressionId?: string;
};

// An individual histogram bar with colour
export class HistogramBar {
  constructor(
    public colourRGB: RGBA,
    public value: number,
    public keV: number
  ) {}
}

export class HistogramData {
  constructor(
    public bars: HistogramBar[],
    public valueRange: MinMax,
    public error: string
  ) {}
}

export class HistogramDrawBar {
  constructor(
    public rect: Rect,
    public bar: HistogramBar
  ) {}
}

export class HistogramDrawData {
  dataArea: Rect | null = null;

  constructor(
    public bars: HistogramDrawBar[],
    viewport: CanvasParams
  ) {
    this.dataArea = new Rect(
      DiffractionHistogramModel.xMargin,
      0,
      viewport.width - DiffractionHistogramModel.xMargin,
      viewport.height - DiffractionHistogramModel.yMargin
    );
  }
}

export interface HistogramSelectionOwner {
  setkeVRangeSelected(keVRange: MinMax, selected: boolean, complete: boolean): void;
  iskeVRangeSelected(keV: number): boolean;
  selectedRangeCount(): number;
}

export class DiffractionHistogramModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();
  needsCanvasResize$: Subject<void> = new Subject<void>();

  public static readonly keVBinWidth = 0.25;

  public static readonly xMargin = 40;
  public static readonly yMargin = 26;

  // The raw data we start with
  private _raw: HistogramData | null = null;

  // The drawable data (derived from the above)
  private _xAxis: ChartAxis | null = null;
  private _yAxis: ChartAxis | null = null;

  private _drawData: HistogramDrawData | null = null;

  private _hoverBarIdx: number = -1;
  private _hoverPoint: Point | null = null;

  cursorShown: string = "";

  constructor(public selectionOwner: HistogramSelectionOwner) {}

  set raw(r: HistogramData) {
    this._raw = r;
  }

  get raw(): HistogramData | null {
    return this._raw;
  }

  get drawData(): HistogramDrawData | null {
    return this._drawData;
  }

  get xAxis(): ChartAxis | null {
    return this._xAxis;
  }

  get yAxis(): ChartAxis | null {
    return this._yAxis;
  }

  setHover(pt: Point, idx: number): void {
    this._hoverBarIdx = idx;
    this._hoverPoint = pt;
  }

  get hoverBarIdx(): number {
    return this._hoverBarIdx;
  }

  get hoverPoint(): Point | null {
    return this._hoverPoint;
  }

  // Rebuilding this models display data
  recalcDisplayData(viewport: CanvasParams): void {
    if (!this._raw) {
      return;
    }

    // Recalc the scales
    this._xAxis = new LinearChartAxis(
      true,
      DiffractionHistogramModel.xMargin,
      viewport.width - DiffractionHistogramModel.xMargin,
      0,
      this._raw.bars.length * DiffractionHistogramModel.keVBinWidth
    );

    // Min/max y values, these are clamped to 0, and slightly over max, so we have nice line Y values
    const minY = 0; /*this._raw.valueRange.min*/
    let rawMax = this._raw?.valueRange?.max || 0;
    let maxY = Math.ceil(rawMax * 1.2); // leave some top gap

    let yAxis = new LinearChartAxis(false, DiffractionHistogramModel.yMargin, viewport.height - DiffractionHistogramModel.yMargin, minY, maxY);
    yAxis.setMinPixelsBetweenTicks(30);
    this._yAxis = yAxis;

    // We don't pan/zoom
    let panZoom = new PanZoom();
    this._xAxis.updateAxis(viewport, panZoom);
    this._yAxis.updateAxis(viewport, panZoom);

    // Calculate chart area (don't think anything actually uses this on histogram...)
    //this._chartArea = new Rect(this._xAxis.startPx, 0, this._xAxis.pxLength, this._yAxis.pxLength);

    // Calculate the bars themselves, this is needed for drawing as well as mouse interaction
    let uiBars: HistogramDrawBar[] = [];

    const yStart = this._yAxis.valueToCanvas(0);
    let barWidth = this._xAxis.pxLength / (this.raw?.bars || []).length;
    let x = this._xAxis.startPx;

    for (let bar of this.raw?.bars || []) {
      let yTop = this._yAxis.valueToCanvas(bar.value);

      let barHeight = yStart - yTop;
      uiBars.push(new HistogramDrawBar(new Rect(x, yTop, barWidth, barHeight), bar));

      x += barWidth;
    }

    this._drawData = new HistogramDrawData(uiBars, viewport);
    this.needsDraw$.next();
  }
}
