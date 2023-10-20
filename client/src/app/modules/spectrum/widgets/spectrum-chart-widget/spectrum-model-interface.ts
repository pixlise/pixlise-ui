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
import { MinMax } from "src/app/models/BasicTypes";
import { Rect } from "src/app/models/Geometry";
import { ChartAxis } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import { CanvasParams } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { XRFLine } from "src/app/periodic-table/XRFLine";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { SpectrumXRFLinesNearMouse } from "./xrf-near-mouse";
import { XRFDatabaseService } from "src/app/services/xrf-database.service";
import { XRFLineDatabase } from "src/app/periodic-table/xrf-line-database";

// Spectrum lines are drawn using this structure. This is recalculated from source information as needed
export class SpectrumChartLine {
  constructor(
    public scanId: string,
    public scanName: string,

    public roiId: string,
    public roiName: string,

    public expression: string,
    public expressionLabel: string,

    public color: string,
    public dashPattern: number[],
    public lineWidth: number,
    public opacity: number,
    public drawFilled: boolean = false,

    public values: Float32Array,
    public maxValue: number,

    public xValues: Float32Array
  ) {}

  getDetector(): string {
    // Guess based on the expression
    if (this.expression.indexOf("(A)") > 0) {
      return "A";
    } else if (this.expression.indexOf("(B)") > 0) {
      return "B";
    }
    return "";
  }
}

export interface ISpectrumChartModel {
  xrfDBService: XRFDatabaseService;
  activeXRFDB: XRFLineDatabase | null;

  transform: PanZoom;

  recalcDisplayDataIfNeeded(viewport: CanvasParams): void;

  spectrumLines: SpectrumChartLine[];
  spectrumLineDarkenIdxs: number[];

  xAxis: ChartAxis | null;
  yAxis: ChartAxis | null;

  xAxisLabel: string;
  yAxisLabel: string;

  chartYResize: boolean;

  chartArea: Rect;

  lineRangeX: MinMax;
  lineRangeY: MinMax;

  xAxisEnergyScale: boolean;

  shownElementPeakLabels: XRFLine[];

  xrfeVLowerBound: number;
  xrfeVUpperBound: number;

  xrfLinesPicked: XRFLineGroup[];
  xrfLinesHighlighted: XRFLineGroup | null;
  xrfLinesChanged$: Subject<void>;

  xrfNearMouse: SpectrumXRFLinesNearMouse;
  xrfNearMouseChanged$: Subject<void>;

  browseCommonElementsXRF: boolean;

  diffractionPeaksShown: DiffractionPeak[];

  setEnergyAtMouse(keV: number): void;

  isROIActive(roiID: string): boolean;

  // Returns 0 if none
  getMaxSpectrumValueAtEnergy(keV: number): number | null;

  makePrintableXValue(value: number): string;

  pickXRFLine(atomicNumber: number): void;
  unpickXRFLine(atomicNumber: number): void;

  isPickedXRFLine(atomicNumber: number): boolean;

  keVToChannel(keV: number, scanId: string, detector: string): number | null;
}
