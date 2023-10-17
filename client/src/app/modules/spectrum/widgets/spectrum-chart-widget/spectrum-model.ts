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

import { ReplaySubject, Subject, scan } from "rxjs";
import { ObjectCreator, MinMax, SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { Rect } from "src/app/models/Geometry";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { ChartAxis, LinearChartAxis, LogarithmicChartAxis } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { PanZoom, PanRestrictorToCanvas } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { KeyItem } from "src/app/modules/analysis/components/widget/widget-key-display/widget-key-display.component";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { XRFLine } from "src/app/periodic-table/XRFLine";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { RGBA, Colours } from "src/app/utils/colours";
import { SpectrumValues } from "../../models/Spectrum";
import { ISpectrumChartModel, SpectrumChartLine } from "./spectrum-model-interface";
import { SpectrumXRFLinesNearMouse } from "./xrf-near-mouse";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { SubItemOptionSection } from "src/app/modules/roi/components/roi-item/roi-item.component";

export class SpectrumLineChoice {
  constructor(
    public lineExpression: string,
    public label: string,
    public enabled: boolean,
    public values: SpectrumValues | null = null, // OPTIONAL! Dataset spectra are looked up via lineExpression, this is here for fit lines
    public lineWidth: number = 1.0, // OPTIONAL! Can make lines wider by changing this
    public opacity: number = 1.0, // OPTIONAL! Can change opacity
    public drawFilled: boolean = false // OPTIONAL! Can draw as filled polygon between line and x axis. NOTE: In this case, the line itself is not drawn
  ) {}
}

export class SpectrumSource {
  constructor(
    // Region info:
    public roiID: string,
    public roiName: string,
    public shared: boolean,
    public creator: ObjectCreator | null,
    public tags: string[],
    public isMIST: boolean,

    // Drawing options
    public colourRGBA: RGBA,
    public lineChoices: SpectrumLineChoice[],
    public locationIndexes: number[],
    public fitElementZ: number = 0 // If it's a fit line, can specify the element atomic number here
  ) {}

  getLineChoiceIdx(lineExpression: string): number {
    for (let c = 0; c < this.lineChoices.length; c++) {
      if (this.lineChoices[c].lineExpression == lineExpression) {
        return c;
      }
    }

    return -1;
  }
}

export class spectrumLines {
  constructor(
    public roiID: string,
    public lineExpressions: string[]
  ) {}
}

const spectrumLineDashPatterns = [[], [6, 2], [2, 2], [1, 2, 1, 2, 1, 2, 8, 2]];

const fitLinePrefix = "fit_";

export class SpectrumChartModel implements ISpectrumChartModel, CanvasDrawNotifier {
  public static readonly lineExpressionBulkA = "bulk(A)";
  public static readonly lineExpressionBulkB = "bulk(B)";
  public static readonly lineExpressionMaxA = "max(A)";

  public static readonly fitMeasuredSpectrum = "Measured Spectrum";
  public static readonly fitCaclulatedTotalSpectrum = "Calculated Total Spectrum";
  public static readonly fitResiduals = "Residuals";
  public static readonly fitPileupPeaks = "Pileup Peaks";
  public static readonly fitBackground = "Background";

  public static readonly fitBackgroundDetC = "Background detC";
  public static readonly fitBackgroundTotal = "Background Total";
  public static readonly fitBackgroundCalc = "Background Calc";
  public static readonly fitBackgroundSNIP = "Background SNIP";

  public static readonly allLineChoiceOptions: SubItemOptionSection[] = [
    {
      title: "Summed Across an Area",
      options: [
        { title: "A", value: SpectrumChartModel.lineExpressionBulkA },
        { title: "B", value: SpectrumChartModel.lineExpressionBulkB },
        { title: "Sum of A + B", value: "sum(bulk(A),bulk(B))" },
        { title: "Difference A - B", value: "diff(bulk(A),bulk(B))" },
        { title: "Difference B - A", value: "diff(bulk(B),bulk(A))" },
        { title: "Min of A and B", value: "minOf(bulk(A),bulk(B))" },
        { title: "Max of A and B", value: "maxOf(bulk(A),bulk(B))" },
        { title: "A without Diffraction", value: "removeDiffraction(bulk(A),bulk(B))" },
        { title: "B without Diffraction", value: "removeDiffraction(bulk(B),bulk(A))" },
      ],
    },
    {
      title: "Max Value in an Area",
      options: [
        { title: "A", value: SpectrumChartModel.lineExpressionMaxA },
        { title: "B", value: "max(B)" },
        { title: "Sum of A + B", value: "sum(max(A),max(B))" },
        { title: "Difference A - B", value: "diff(max(A),max(B))" },
        { title: "Difference B - A", value: "diff(max(B),max(A))" },
        { title: "Min of A and B", value: "minOf(max(A),max(B))" },
        { title: "Max of A and B", value: "maxOf(max(A),max(B))" },
        { title: "A without Diffraction", value: "removeDiffraction(max(A),max(B))" },
        { title: "B without Diffraction", value: "removeDiffraction(max(B),max(A))" },
      ],
    },
  ];

  static getTitleForLineExpression(expr: string): string {
    for (const optSec of SpectrumChartModel.allLineChoiceOptions) {
      for (const opt of optSec.options) {
        if (opt.value == expr) {
          return opt.title;
        }
      }
    }
    return expr;
  }

  private _drawTransform: PanZoom = new PanZoom(new MinMax(1, undefined), new MinMax(1, undefined), new PanRestrictorToCanvas());

  // Display settings
  private _logScale: boolean = true;
  private _showXAsEnergy: boolean = false;
  private _yAxisCountsPerMin: boolean = true;
  private _yAxisCountsPerPMC: boolean = false;
  private _linesShown: Map<string, string[]> = new Map<string, string[]>();
  private _shownElementPeakLabels: XRFLine[] = [];

  private _calibration: Map<string, SpectrumEnergyCalibration> = new Map<string, SpectrumEnergyCalibration>();

  // Special spectrum source for fit lines, these come back when the user asks to fit a spectrum by PIQUANT and contains
  // all the component lines that make up the spectrum
  private _fitLineSources: SpectrumSource[] = [];
  private _fitLineSources$ = new ReplaySubject<void>(1);
  private _fitSelectedElementZs: number[] = [];
  private _fitSelectedElementZs$ = new ReplaySubject<void>(1);
  private _fitXValues: Float32Array = new Float32Array();
  private _fitRawCSV: string = "";

  private _showFitLines: boolean = false; // Flag that controls if lines are read from spectrum sources vs fit lines

  private _xrfLinesPicked: XRFLineGroup[] = [];
  private _xrfLinesHighlighted: XRFLineGroup | null = null;
  private _xrfLinesChanged$: ReplaySubject<void> = new ReplaySubject<void>(1);

  private _xrfNearMouse: SpectrumXRFLinesNearMouse = new SpectrumXRFLinesNearMouse();
  private _xrfNearMouseChanged$: Subject<void> = new Subject<void>();

  private _browseCommonElementsXRF: boolean = true;

  //private _title: string = 'Spectrum Plot';
  private _spectrumLines: SpectrumChartLine[] = [];
  private _xAxis: ChartAxis | null = null;
  private _yAxis: ChartAxis | null = null;
  private _lineRangeX: MinMax = new MinMax();
  private _lineRangeY: MinMax = new MinMax();

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  // Indexes of which lines which we darken relative to others
  // This was added as part of spectrum fit line changes. If an index is invalid
  // this should be ignored. Can be set on the model, and the drawer picks it up while
  // drawing the lines
  private _spectrumLineDarkenIdxs: number[] = [];

  private _keyItems: KeyItem[] = [];

  private _chartYMaxValue: number | null = null;
  private _chartYResize: boolean = true;
  private _xrfeVLowerBound: number = 0;
  private _xrfeVUpperBound: number = 0;

  private _chartArea: Rect = new Rect(0, 0, 0, 0);

  private _diffractionPeaksShown: DiffractionPeak[] = [];

  // CanvasDrawNotifier
  needsDraw$: Subject<void> = new Subject<void>();

  constructor(
    public envService: EnvConfigurationService //,
    // public clipboard: Clipboard
  ) // public dialog: MatDialog,
  {}

  get keyItems(): KeyItem[] {
    return this._keyItems;
  }

  // ISpectrumChartModel
  get transform(): PanZoom {
    return this._drawTransform;
  }

  get spectrumLines(): SpectrumChartLine[] {
    return this._spectrumLines;
  }

  setEnergyCalibration(scanId: string, calibration: SpectrumEnergyCalibration) {
    this._calibration.set(scanId + "-" + calibration.detector, calibration);
    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  get spectrumLineDarkenIdxs(): number[] {
    return this._spectrumLineDarkenIdxs;
  }

  setSpectrumLineDarken(lineExprs: string[]): void {
    this._spectrumLineDarkenIdxs = [];
    for (let c = 0; c < this._spectrumLines.length; c++) {
      const line = this._spectrumLines[c];
      if (lineExprs.indexOf(line.expression) > -1) {
        this._spectrumLineDarkenIdxs.push(c);
      }
    }
  }

  get fitLineSources(): SpectrumSource[] {
    return this._fitLineSources;
  }

  get fitLineSources$(): ReplaySubject<void> {
    return this._fitLineSources$;
  }

  get fitRawCSV(): string {
    return this._fitRawCSV;
  }

  get fitSelectedElementZs(): number[] {
    return this._fitSelectedElementZs;
  }

  setFitSelectedElementZs(val: number[]) {
    this._fitSelectedElementZs = val;
    this._fitSelectedElementZs$.next();
  }

  get fitSelectedElementZs$(): ReplaySubject<void> {
    return this._fitSelectedElementZs$;
  }

  get xAxisEnergyScale(): boolean {
    return this._showXAsEnergy;
  }

  set xAxisEnergyScale(val: boolean) {
    this._showXAsEnergy = val;
    //this.recalcSpectrumLines();
    //this.clearDisplayData();
    //this.saveState("xAxisEnergyScale");
  }

  get xAxisLabel(): string {
    return this._showXAsEnergy ? "keV" : "Channel";
  }

  get yAxisLabel(): string {
    let label = "Counts";
    if (this._yAxisCountsPerMin) {
      label += "/min";
    }
    if (this._yAxisCountsPerPMC) {
      label += "/pmc";
    }
    return label;
  }

  get yAxislogScale(): boolean {
    return this._logScale;
  }

  set yAxislogScale(val: boolean) {
    this._logScale = val;
  }

  get xAxis(): ChartAxis | null {
    return this._xAxis;
  }

  get yAxis(): ChartAxis | null {
    return this._yAxis;
  }

  get chartYResize(): boolean {
    return this._chartYResize;
  }

  set chartYResize(val: boolean) {
    this._chartYResize = val;
    //this.saveState("set chartYResize");
  }

  get yAxisCountsPerMin(): boolean {
    return this._yAxisCountsPerMin;
  }

  set yAxisCountsPerMin(val: boolean) {
    this._yAxisCountsPerMin = val;
    // this.recalcSpectrumLines();
    // this.clearDisplayData();
    //this.saveState('set yAxisCountsPerMin');
  }

  get yAxisCountsPerPMC(): boolean {
    return this._yAxisCountsPerPMC;
  }

  set yAxisCountsPerPMC(val: boolean) {
    this._yAxisCountsPerPMC = val;
    // this.recalcSpectrumLines();
    // this.clearDisplayData();
    //this.saveState('set yAxisCountsPerPMC');
  }

  get chartArea(): Rect {
    return this._chartArea;
  }

  get lineRangeX(): MinMax {
    return this._lineRangeX;
  }

  get lineRangeY(): MinMax {
    return this._lineRangeY;
  }

  get xrfLinesPicked(): XRFLineGroup[] {
    return this._xrfLinesPicked;
  }

  set xrfLinesPicked(val: XRFLineGroup[]) {
    this._xrfLinesPicked = val;
    this._xrfLinesChanged$.next();
    this.needsDraw$.next();
    //this.saveState("xrf lines picked");
  }

  get xrfLinesHighlighted(): XRFLineGroup | null {
    return this._xrfLinesHighlighted;
  }

  set xrfLinesHighlighted(group: XRFLineGroup | null) {
    this._xrfLinesHighlighted = group;
    this.needsDraw$.next();
  }

  get xrfLinesChanged$(): Subject<void> {
    return this._xrfLinesChanged$;
  }

  get xrfNearMouse(): SpectrumXRFLinesNearMouse {
    return this._xrfNearMouse;
  }

  get xrfNearMouseChanged$(): Subject<void> {
    return this._xrfNearMouseChanged$;
  }

  get browseCommonElementsXRF(): boolean {
    return this._browseCommonElementsXRF;
  }

  set browseCommonElementsXRF(val: boolean) {
    this._browseCommonElementsXRF = val;

    // Refresh table if needed
    this._xrfNearMouse.setEnergy(this._xrfNearMouse.keV, this._browseCommonElementsXRF);

    // Notify stuff
    this._xrfNearMouseChanged$.next();
    this.needsDraw$.next();
  }

  get xrfeVLowerBound(): number {
    return this._xrfeVLowerBound;
  }

  set xrfeVLowerBound(val: number) {
    this._xrfeVLowerBound = val;
    this.needsDraw$.next();
  }

  get xrfeVUpperBound(): number {
    return this._xrfeVUpperBound;
  }

  set xrfeVUpperBound(val: number) {
    this._xrfeVUpperBound = val;
    this.needsDraw$.next();
  }

  get diffractionPeaksShown(): DiffractionPeak[] {
    return this._diffractionPeaksShown;
  }

  setEnergyAtMouse(keV: number) {
    if (keV <= 0) {
      this._xrfNearMouse.clear();
    } else {
      this._xrfNearMouse.setEnergy(keV, this._browseCommonElementsXRF);
    }

    this._xrfNearMouseChanged$.next();
    this.needsDraw$.next();
  }

  isROIActive(roiID: string): boolean {
    // This is mainly used by chart annotation (ui element) to see how we have to draw an annotation
    // so if we are drawing any lines for the given roiID, we say it's active
    for (const line of this._spectrumLines) {
      if (line.roiId == roiID) {
        return true;
      }
    }
    return false;
  }

  private hasAtomicNumber(atomicNumber: number, list: XRFLineGroup[]): boolean {
    for (const item of list) {
      if (item.atomicNumber == atomicNumber) {
        return true;
      }
    }
    return false;
  }

  pickXRFLine(atomicNumber: number): void {
    if (this.hasAtomicNumber(atomicNumber, this._xrfLinesPicked)) {
      // Ignore, already added
      return;
    }

    this.internalPickXRFLine(atomicNumber);

    this._xrfLinesChanged$.next();

    // And finally, redraw
    this.needsDraw$.next();
  }

  private internalPickXRFLine(atomicNumber: number): void {
    const group = XRFLineGroup.makeFromAtomicNumber(atomicNumber);
    this._xrfLinesPicked.push(group);
  }

  unpickXRFLine(atomicNumber: number): void {
    this._xrfLinesPicked = this.removeFromList(this._xrfLinesPicked, atomicNumber);
    this._xrfLinesChanged$.next();

    // And finally, redraw
    this.needsDraw$.next();
    //this.saveState("unpickXRFLine");
  }

  isPickedXRFLine(atomicNumber: number): boolean {
    return this.hasAtomicNumber(atomicNumber, this._xrfLinesPicked);
  }

  protected removeFromList(list: XRFLineGroup[], atomicNumber: number): XRFLineGroup[] {
    const newList: XRFLineGroup[] = [];
    for (const line of list) {
      if (line.atomicNumber != atomicNumber) {
        newList.push(line);
      }
    }
    return newList;
  }

  get shownElementPeakLabels(): XRFLine[] {
    return this._shownElementPeakLabels;
  }

  set shownElementPeakLabels(lines: XRFLine[]) {
    this._shownElementPeakLabels = lines;
  }

  // Setting display options
  setYAxisLogScale(logScale: boolean): void {
    this._logScale = logScale;
    // this.clearDisplayData();
    // this.saveState("setYAxisLogScale");
  }

  setFitLineMode(enabled: boolean): void {
    this._showFitLines = enabled;
    //this.recalcSpectrumLines();
  }

  setFitLineData(scanId: string, csv: string): void {
    this._fitRawCSV = csv;
    this._fitLineSources = [];
    //this._fitSelectedElementZs = [];

    // Run through CSV columns and build sources for each line
    const lines = csv.split("\n");
    const headers = lines[1].split(",");

    // Get the data values as numbers
    const csvNumbersByRow: number[][] = [];
    for (let c = 2; c < lines.length; c++) {
      csvNumbersByRow.push([]);

      const lineData = lines[c].split(",");
      for (const item of lineData) {
        csvNumbersByRow[c - 2].push(Number.parseFloat(item.trim()));
      }
    }

    // Create the right sources
    // An example of headers:
    // Energy (keV), meas, calc, bkg, sigma, residual, DetCE, Pileup
    // Ar_K, Zr_K, Sr_K, Zn_K, Ni_K, Fe_K, Mn_K, Ba_L, Cr_K, V_K, Ti_K, Ca_K, K_K, Zr_L, Sr_L, P_K, Si_K, Al_K, Mg_K, Zn_L, Ba_M, Na_K, Ni_L, Fe_L, Mn_L, Cr_L, V_L, Ti_L,
    // Rh_K_coh, Rh_L_coh, Rh_M_coh, Rh_K_inc, Rh_M_inc, Rh_L_coh_Lb1
    //
    // NOTE: With parameters to enable snip and background calc columns:
    // -b,-1,-5 -bh,0,8,60,910,2800,6 -bx,150,7150
    //
    // We get:
    // Energy (keV), meas, calc, bkg, sigma, residual, DetCE, Pileup
    // Ti_K, Ca_K, Rh_K_coh, Rh_L_coh, Rh_K_inc, Rh_L_coh_Lb1
    // calc bkg0, SNIP bkg <-- THE SNIP/CALC COLUMNS!
    //
    // Where we want to form the following sources:
    // Measured: meas
    // Total: calc
    // Residuals: residual
    // Background: DetCE, SNIP, calc bkg0, bkg (??)
    // Pileups: Pileup
    // And one source for each element containing one line per peak:
    // Ba: L, K
    // NOT sure what to do with the Rh lines for now...

    let backgroundSrc: SpectrumSource | null = null;
    let backgroundTotalLine: SpectrumLineChoice | null = null;
    const perElementSources: Map<string, SpectrumSource> = new Map<string, SpectrumSource>();

    const roiId = PredefinedROIID.getAllPointsForScan(scanId);

    for (let c = 0; c < headers.length; c++) {
      let header = headers[c];
      header = header.trim();

      if (header == "Energy (keV)") {
        this._fitXValues = new Float32Array(this.readFitColumn(c, csvNumbersByRow).values);
      } else if (header == "meas") {
        this._fitLineSources.push(
          new SpectrumSource(
            roiId,
            SpectrumChartModel.fitMeasuredSpectrum,
            false,
            null,
            [],
            false,
            Colours.WHITE,
            [new SpectrumLineChoice(fitLinePrefix + header, SpectrumChartModel.fitMeasuredSpectrum, true, this.readFitColumn(c, csvNumbersByRow), 1, 0.2, true)],
            []
          )
        );
      } else if (header == "calc") {
        this._fitLineSources.push(
          new SpectrumSource(
            roiId,
            SpectrumChartModel.fitCaclulatedTotalSpectrum,
            false,
            null,
            [],
            false,
            Colours.ORANGE,
            [new SpectrumLineChoice(fitLinePrefix + header, SpectrumChartModel.fitCaclulatedTotalSpectrum, true, this.readFitColumn(c, csvNumbersByRow))],
            []
          )
        );
      } else if (header == "residual") {
        this._fitLineSources.push(
          new SpectrumSource(
            roiId,
            SpectrumChartModel.fitResiduals,
            false,
            null,
            [],
            false,
            Colours.BLUE,
            [new SpectrumLineChoice(fitLinePrefix + header, SpectrumChartModel.fitResiduals, true, this.readFitColumn(c, csvNumbersByRow))],
            []
          )
        );
      } else if (header == "Pileup") {
        this._fitLineSources.push(
          new SpectrumSource(
            roiId,
            SpectrumChartModel.fitPileupPeaks,
            false,
            null,
            [],
            false,
            Colours.PINK,
            [new SpectrumLineChoice(fitLinePrefix + header, SpectrumChartModel.fitPileupPeaks, false, this.readFitColumn(c, csvNumbersByRow))],
            []
          )
        );
      } else if (header == "DetCE" || header == "bkg" || header == "SNIP bkg" || header == "calc bkg0") {
        if (!backgroundSrc) {
          backgroundSrc = new SpectrumSource(roiId, SpectrumChartModel.fitBackground, false, null, [], false, Colours.PURPLE, [], []);
        }

        // Add this to the background sources group
        let savedName = SpectrumChartModel.fitBackgroundDetC;
        if (header == "bkg") {
          savedName = SpectrumChartModel.fitBackgroundTotal;
        } else if (header == "SNIP bkg") {
          savedName = SpectrumChartModel.fitBackgroundSNIP;
        } else if (header == "calc bkg0") {
          savedName = SpectrumChartModel.fitBackgroundCalc;
        }

        const line = new SpectrumLineChoice(
          fitLinePrefix + header,
          savedName,
          header == "bkg", // Only on by default for background total line
          this.readFitColumn(c, csvNumbersByRow)
        );

        if (header == "bkg") {
          backgroundTotalLine = line;
        } else {
          backgroundSrc.lineChoices.push(line);
        }
      } else {
        // Find elements like: Ba_L
        const pos = header.indexOf("_");
        if (pos > 0) {
          const elem = header.substring(0, pos);
          const line = header.substring(pos + 1);

          // Don't include the weird ones like: Rh_L_coh
          if (line.indexOf("_") == -1) {
            // Get the atomic number
            const info = periodicTableDB.getElementOxidationState(elem);
            if (info && info.isElement) {
              // Make sure this element has a source defined
              if (!perElementSources.has(elem)) {
                perElementSources.set(elem, new SpectrumSource(roiId, elem, false, null, [], false, Colours.YELLOW, [], [], info.Z));
              }

              // Add this peak line to the element it belongs to
              // NOTE: we add element peak lines as NOT enabled
              const src = perElementSources.get(elem);
              if (src) {
                src.lineChoices.push(new SpectrumLineChoice(fitLinePrefix + header, header, false, this.readFitColumn(c, csvNumbersByRow)));
              }
            }
          }
        }
      }
    }

    if (backgroundSrc) {
      // Make sure background total line is at the back
      if (backgroundTotalLine) {
        backgroundSrc.lineChoices.push(backgroundTotalLine);
      }
      this._fitLineSources.push(backgroundSrc);
    }

    for (const elem of perElementSources.values()) {
      // Sort the lines in the element to ensure it's order is K, L, M...
      elem.lineChoices.sort((a: SpectrumLineChoice, b: SpectrumLineChoice) => {
        return a.label.localeCompare(b.label);
      });
      this._fitLineSources.push(elem);
    }

    this._fitLineSources$.next();
  }

  private readFitColumn(columnIdx: number, csvNumbersByRow: number[][]): SpectrumValues {
    const vals = new Float32Array(csvNumbersByRow.length);
    let maxVal = csvNumbersByRow[0][columnIdx];
    for (let c = 0; c < csvNumbersByRow.length; c++) {
      vals[c] = csvNumbersByRow[c][columnIdx];
      if (vals[c] > maxVal) {
        maxVal = vals[c];
      }
    }

    return new SpectrumValues(vals, maxVal, "", 0);
  }

  getLineList(): Map<string, string[]> {
    return this._linesShown;
  }

  // Allows setting the list of lines. NOTE: this does not result in lines showing up in the chart
  // because this is just the models list of lines to show. The lines need to be calculated
  // and added via addLineForSpectrumValues(), then updateRangesAndKey() called
  setLineList(lines: Map<string, string[]>) {
    this._linesShown = lines;

    // Also clear the actual line data for display, because it's going to need recalc anyway
    this._spectrumLines = [];
  }

  updateRangesAndKey(): void {
    this._lineRangeX = new MinMax(0, 0);
    this._lineRangeY = new MinMax(0, 0);

    // Find max channels and max Y from all spectra
    const scanIds = new Set<string>();

    for (const line of this._spectrumLines) {
      scanIds.add(line.scanId);

      if (line.xValues.length > 0) {
        const thisMaxX = line.xValues[line.xValues.length - 1];
        this._lineRangeX.expandMax(thisMaxX);
      }

      this._lineRangeY.expand(line.maxValue);
    }

    // Get min/max data values. Need to check against every scan id
    if (this._showXAsEnergy) {
      const maxChannel = this._lineRangeX.max || 0;
      this._lineRangeX = new MinMax(0, 0);

      for (const scanId of scanIds) {
        const maxEnergyA = this.channelTokeV(maxChannel, scanId, "A") || 0;
        const maxEnergyB = this.channelTokeV(maxChannel, scanId, "B") || 0;

        this._lineRangeX.expandMax(Math.max(maxEnergyA, maxEnergyB));
      }
    }

    this._keyItems = [];

    // Run through and regenerate key items from all lines
    let lastROI = "";
    for (const line of this._spectrumLines) {
      if (lastROI != line.roiId) {
        this._keyItems.push(new KeyItem("", line.roiName, line.color));
        lastROI = line.roiId;
      }
      this._keyItems.push(new KeyItem("", line.expressionLabel, line.color, line.dashPattern));
    }

    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  addLineDataForLine(
    roiId: string,
    lineExpression: string,
    scanId: string,
    roiName: string,
    colourRGB: RGBA,
    lineValues: Map<string, SpectrumValues>,
    lineWidth: number = 1.0, // OPTIONAL! Can make lines wider by changing this
    opacity: number = 1.0, // OPTIONAL! Can change opacity
    drawFilled: boolean = false // OPTIONAL! Can draw as filled polygon between line and x axis. NOTE: In this case, the line itself is not drawn
  ): void {
    // Find the line
    const roiLines = this._linesShown.get(roiId);
    if (!roiLines || roiLines.indexOf(lineExpression) < 0) {
      throw new Error(`addLineDataForLine called for non-existant line: ${roiId}-${lineExpression}`);
    }

    // It's actually stored in a separate list for drawing, so delete any existing entry
    for (let c = 0; c < this._spectrumLines.length; c++) {
      const line = this._spectrumLines[c];
      if (line.roiId == roiId && line.expression == lineExpression) {
        this._spectrumLines.splice(c, 1);
        break;
      }
    }

    // Add as a new line
    const colourStr = colourRGB.asString();

    for (const [label, valuesForLine] of lineValues) {
      const dashPattern = this.getDashPattern(colourStr);

      const xValues = this.calcXValues(valuesForLine.values.length, scanId, valuesForLine.sourceDetectorID);
      const spectrumLine = new SpectrumChartLine(
        scanId,
        roiId,
        roiName,
        lineExpression,
        label,
        colourRGB.asString(),
        dashPattern,
        lineWidth,
        opacity,
        drawFilled,
        valuesForLine.values,
        valuesForLine.maxValue,
        xValues
      );

      this._spectrumLines.push(spectrumLine);
    }
  }

  private getDashPattern(colourRGB: string): number[] {
    // Loop through all existing lines, if any have the same colour we increment the dash pattern, thereby ensuring that lines
    // with the same colour have differing dash patterns
    let dashPatternIdx = 0;
    for (let c = 0; c < this._spectrumLines.length; c++) {
      if (this._spectrumLines[c].color == colourRGB) {
        dashPatternIdx++;
      }
    }

    return spectrumLineDashPatterns[dashPatternIdx % spectrumLineDashPatterns.length];
  }

  private calcXValues(channelCount: number, scanId: string, forDetectorId: string): Float32Array {
    // If we're drawing fit lines, we already have implicity x-axis values from the CSV returned
    if (this._showFitLines && this._fitXValues) {
      return this._fitXValues;
    }

    // Calculate x values
    const xvalues = new Float32Array(channelCount);

    if (!this._showXAsEnergy) {
      // Make incrementing x values (channel)
      for (let c = 0; c < xvalues.length; c++) {
        xvalues[c] = c + 1; //this._xAxis.valueToPx(c+1);
      }
    } else {
      // calculate eV for x axis
      let detectorCalib = "A";
      if (forDetectorId == "B") {
        detectorCalib = "B";
      }

      let energy: number | null = 0;
      let lastVal = 0;
      for (let c = 0; c < xvalues.length; c++) {
        energy = this.channelTokeV(c, scanId, detectorCalib);
        if (energy === null) {
          energy = lastVal;
        }

        xvalues[c] = energy; //this._xAxis.valueToPx(energy);
        lastVal = energy;
      }
    }

    return xvalues;
  }

  getMaxSpectrumValueAtEnergy(keV: number): number | null {
    let value = null;

    if (this.spectrumLines.length > 0) {
      for (const spectrum of this.spectrumLines) {
        const channel = this.keVToChannel(keV, spectrum.scanId, "A");
        if (channel !== null) {
          // Take the eV of the line, find its channel index
          if (channel >= 0 && channel < spectrum.values.length) {
            const thisVal = spectrum.values[channel];
            if (value === null || thisVal > value) {
              value = thisVal;
            }
          }
        }
      }
    }

    return value;
  }

  makePrintableXValue(value: number): string {
    if (this._showXAsEnergy) {
      return value.toLocaleString() + " keV";
    }
    return "Ch: " + Math.round(value).toString();
  }

  // Rebuilding this models display data
  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): void {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this.regenerateDrawModel(canvasParams);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
  }

  private regenerateDrawModel(viewport: CanvasParams) {
    if (!this._drawTransform.canvasParams || this._drawTransform.canvasParams.width <= 0 || this._drawTransform.canvasParams.height <= 0) {
      console.error("SpectrumChart regenerateDrawModel: failed because canvas dimensions not known");
      return;
    }

    if (!this._lineRangeX.isValid()) {
      console.error("SpectrumChart regenerateDrawModel: failed due to X axis range being invalid");
      return;
    }
    if (!this._lineRangeY.isValid()) {
      console.error("SpectrumChart regenerateDrawModel: failed due to Y axis range being invalid");
      return;
    }

    // Recalc the scales
    const xMargin = 80;
    const yMargin = 34;

    // Shut up transpiler...
    const lineRangeXmin = this._lineRangeX.min || 0;
    const lineRangeXmax = this._lineRangeX.max || 0;
    const lineRangeYmin = this._lineRangeY.min || 0;
    const lineRangeYmax = this._lineRangeY.max || 0;

    // Remember it/might need it later if we've got resize mode off
    if (this._chartYResize || this._chartYMaxValue == null) {
      this._chartYMaxValue = this._lineRangeY.max;
    }
    if (!this._chartYResize) {
      console.log("Chart Y resize off: Using past value: " + this._chartYMaxValue + " instead of " + this._lineRangeY.max);
      this._lineRangeY = new MinMax(this._lineRangeY.min || 0, this._chartYMaxValue || 0);
    }

    this._xAxis = new LinearChartAxis(true, xMargin, this._drawTransform.canvasParams.width - xMargin, lineRangeXmin, lineRangeXmax);

    if (this._logScale) {
      this._yAxis = new LogarithmicChartAxis(
        false,
        yMargin,
        this._drawTransform.canvasParams.height - yMargin,
        lineRangeYmin,
        lineRangeYmax * 1.6 // to leave gap at top above chart for things like peak labels to show
      );
    } else {
      this._yAxis = new LinearChartAxis(
        false,
        yMargin,
        this._drawTransform.canvasParams.height - yMargin,
        lineRangeYmin,
        lineRangeYmax * 1.1 // to leave gap at top above chart for things like peak labels to show
      );
    }

    this._chartArea = new Rect(this._xAxis.startPx, 0, this._xAxis.pxLength, this._yAxis.pxLength);

    this._xAxis.updateAxis(viewport, this._drawTransform);
    this._yAxis.updateAxis(viewport, this._drawTransform);
  }

  clearDisplayData() {
    this._xAxis = null;
    this._yAxis = null;
    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  showDiffractionPeaks(peaks: DiffractionPeak[]): void {
    this._diffractionPeaksShown = peaks;
    this.needsDraw$.next();
  }

  zoomToPeak(keVStart: number, keVEnd: number) {
    const origScaleY = this._drawTransform.scale.y;
    const origPanY = this._drawTransform.pan.y;

    this._drawTransform.reset();

    // We can't do this without an axis. Shouldn't happen but on the 5x5 dataset, Scotts machine, for some reason this is null
    if (!this._xAxis) {
      console.log("zoomToPeak skipped due to null xAxis");
      return;
    }

    let x1 = this._xAxis.valueToCanvas(keVStart);
    const x2 = this._xAxis.valueToCanvas(keVEnd);

    let w = x2 - x1;

    if (w > 0 && this.xAxis && this._drawTransform.canvasParams) {
      // The chart axes each add an offset, so apply that to the zoom rect, so it's relative to the data
      const offset = this.xAxis.startPx / this._drawTransform.scale.x;
      x1 -= offset;

      // show a wide range around the peak to help put it in context
      x1 = x1 - w * 5;
      w *= 12;

      this._drawTransform.resetViewToRect(new Rect(x1, 0, w, this._drawTransform.canvasParams.height), false);

      // TODO: remove this UGLY HACK to preserve the Y position while we don't calculate a new valid Y yet
      this._drawTransform.pan.y = origPanY;
      this._drawTransform.scale.y = origScaleY;
    }
  }

  channelTokeV(channel: number, scanId: string, detector: string): number | null {
    const cal = this._calibration.get(scanId + "-" + detector);
    if (!cal) {
      return null;
    }

    return cal.eVstart + channel * cal.eVperChannel * 0.001; // eV->keV conversion
  }

  keVToChannel(keV: number, scanId: string, detector: string): number | null {
    const cal = this._calibration.get(scanId + "-" + detector);
    if (!cal) {
      return null;
    }

    const eV = keV * 1000; // keV->eV conversion
    return Math.floor((eV - cal.eVstart) / cal.eVperChannel);
  }
}
