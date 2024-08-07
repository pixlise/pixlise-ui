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

import { BehaviorSubject, ReplaySubject, Subject } from "rxjs";
import { ObjectCreator, MinMax, SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { Rect } from "src/app/models/Geometry";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { ChartAxis, LinearChartAxis, LogarithmicChartAxis } from "src/app/modules/widget/components/interactive-canvas/chart-axis";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom, PanRestrictorToCanvas } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { RGBA, Colours } from "src/app/utils/colours";
import { SpectrumValues } from "../../models/Spectrum";
import { ISpectrumChartModel, SpectrumChartLine } from "./spectrum-model-interface";
import { SpectrumXRFLinesNearMouse } from "./xrf-near-mouse";
import { SubItemOptionSection } from "src/app/modules/roi/components/roi-item/roi-item.component";
import { BaseChartDrawModel, BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { XRFDatabaseService } from "src/app/services/xrf-database.service";
import { XRFLineDatabase } from "src/app/periodic-table/xrf-line-database";
import { WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";

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
    public scanId: string,
    public roiId: string,
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

const fitLinePrefix = "fit_";
export const fitElementLinePrefix = fitLinePrefix + "_elem_";

export class SpectrumChartModel implements ISpectrumChartModel, CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();

  // The drawable data
  private _drawModel: SpectrumDrawModel = new SpectrumDrawModel();

  private _drawTransform: PanZoom = new PanZoom(new MinMax(1, null), new MinMax(1, null), new PanRestrictorToCanvas());

  // Display settings
  private _logScale: boolean = true;
  private _showXAsEnergy$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _yAxisCountsPerMin: boolean = true;
  private _yAxisCountsPerPMC: boolean = false;
  private _linesShown: Map<string, string[]> = new Map<string, string[]>();

  private _calibration: Map<string, SpectrumEnergyCalibration> = new Map<string, SpectrumEnergyCalibration>();

  private _activeXRFDB: XRFLineDatabase | null = null;

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
  private _lineRangeX: MinMax = new MinMax(0, 0);
  private _lineRangeY: MinMax = new MinMax(0, 0);

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  // If this is blank, draw normally. If it's not, we draw the line with this expression on it
  // normally, while all other lines are drawn dimmed
  private _spectrumHighlightedLineExpr: string = "";

  private _keyItems: WidgetKeyItem[] = [];

  private _chartYMaxValue: number | null = null;
  private _chartYResize: boolean = true;

  private _chartArea: Rect = new Rect(0, 0, 0, 0);

  private _diffractionPeaksShown: DiffractionPeak[] = [];

  constructor(
    public xrfDBService: XRFDatabaseService //,
    // public clipboard: Clipboard
  ) // public dialog: MatDialog,
  {
    this.transform.transformChangeComplete$.subscribe((complete: boolean) => {
      // Remember we need to recalc
      this._recalcNeeded = true;
    });
  }

  get drawModel(): SpectrumDrawModel {
    return this._drawModel;
  }

  hasRawData(): boolean {
    return this._spectrumLines.length > 0;
  }

  get activeXRFDB(): XRFLineDatabase | null {
    return this._activeXRFDB;
  }

  get keyItems(): WidgetKeyItem[] {
    return this._keyItems;
  }

  set keyItems(items: WidgetKeyItem[]) {
    this._keyItems = items;
  }

  // ISpectrumChartModel
  get transform(): PanZoom {
    return this._drawTransform;
  }

  get spectrumLines(): SpectrumChartLine[] {
    return this._spectrumLines;
  }

  checkHasEnergyCalibrationForScanIds(scanIds: string[]): boolean {
    for (const scanId of scanIds) {
      if (!this._calibration.has(scanId)) {
        return false;
      }
    }
    return true;
  }

  setEnergyCalibration(scanId: string, calibration: SpectrumEnergyCalibration[]) {
    for (const cal of calibration) {
      this._calibration.set(scanId + "-" + cal.detector, cal);
    }
    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  get highlightedLineExpr(): string {
    return this._spectrumHighlightedLineExpr;
  }

  darkenOtherLines(lineExpr: string): void {
    this._spectrumHighlightedLineExpr = lineExpr;

    // Force a recalc
    this._fitLineSources$.next();
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
    return this._showXAsEnergy$.value;
  }

  set xAxisEnergyScale(val: boolean) {
    this._showXAsEnergy$.next(val);
  }

  get xAxisEnergyScale$(): BehaviorSubject<boolean> {
    return this._showXAsEnergy$;
  }

  get xAxisLabel(): string {
    return this._showXAsEnergy$.value ? "keV" : "Channel";
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
  }

  get yAxisCountsPerMin(): boolean {
    return this._yAxisCountsPerMin;
  }

  set yAxisCountsPerMin(val: boolean) {
    this._yAxisCountsPerMin = val;
  }

  get yAxisCountsPerPMC(): boolean {
    return this._yAxisCountsPerPMC;
  }

  set yAxisCountsPerPMC(val: boolean) {
    this._yAxisCountsPerPMC = val;
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
    if (this._activeXRFDB) {
      this._xrfNearMouse.setEnergy(this._xrfNearMouse.keV, this._browseCommonElementsXRF, this._activeXRFDB);
    }

    // Notify stuff
    this._xrfNearMouseChanged$.next();
    this.needsDraw$.next();
  }

  get xrfeVLowerBound(): number {
    if (this._activeXRFDB && this._activeXRFDB.configDetector) {
      return this._activeXRFDB.configDetector.xrfeVLowerBound;
    }
    return 0;
  }

  get xrfeVUpperBound(): number {
    if (this._activeXRFDB && this._activeXRFDB.configDetector) {
      return this._activeXRFDB.configDetector.xrfeVUpperBound;
    }
    return 0;
  }

  get diffractionPeaksShown(): DiffractionPeak[] {
    return this._diffractionPeaksShown;
  }

  setEnergyAtMouse(keV: number) {
    if (keV <= 0) {
      this._xrfNearMouse.clear();
    } else {
      if (this._activeXRFDB) {
        this._xrfNearMouse.setEnergy(keV, this._browseCommonElementsXRF, this._activeXRFDB);
      }
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
    if (this._activeXRFDB) {
      const group = XRFLineGroup.makeFromAtomicNumber(atomicNumber, this._activeXRFDB);
      this._xrfLinesPicked.push(group);
    }
  }

  unpickXRFLine(atomicNumber: number): void {
    this._xrfLinesPicked = this.removeFromList(this._xrfLinesPicked, atomicNumber);
    this._xrfLinesChanged$.next();

    // And finally, redraw
    this.needsDraw$.next();
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

  // Setting display options
  setYAxisLogScale(logScale: boolean): void {
    this._logScale = logScale;
  }

  setFitLineMode(enabled: boolean): void {
    if (this._showFitLines == enabled) {
      return;
    }

    this._showFitLines = enabled;
    // Trigger redraw
    this._fitLineSources$.next();
  }

  recalcFitLines(): void {
    this._fitLineSources$.next();
  }

  get showFitLines(): boolean {
    return this._showFitLines;
  }

  // Clears fit lines or non-fit lines
  clearLines(fitLines: boolean): void {
    const linesLeft: SpectrumChartLine[] = [];
    for (let c = 0; c < this._spectrumLines.length; c++) {
      const isElem = this._spectrumLines[c].expression.startsWith(fitElementLinePrefix);

      if (isElem && this._showFitLines) {
        linesLeft.push(this._spectrumLines[c]);
      } else {
        // If we're hiding non-fit lines, just do it
        if (!fitLines && this._spectrumLines[c].expression.startsWith(fitLinePrefix)) {
          linesLeft.push(this._spectrumLines[c]);
          // If we're hiding fit lines, hide only fit lines that aren't showing an element
        } else if (fitLines && !this._spectrumLines[c].expression.startsWith(fitLinePrefix)) {
          linesLeft.push(this._spectrumLines[c]);
        }
      }
    }
    this._spectrumLines = linesLeft;
  }

  setFitLineData(scanId: string, csv: string): void {
    this._fitRawCSV = csv;
    this._fitLineSources = [];
    //this._fitSelectedElementZs = [];

    if (csv.length <= 0) {
      // No data, nothing more to do...
      return;
    }

    // Run through CSV columns and build sources for each line
    const lines = csv.split("\n");
    const headers = lines[1].split(",");

    // Get the data values as numbers
    const csvNumbersByRow: number[][] = [];
    for (let c = 2; c < lines.length; c++) {
      // Skip blank lines (should be one at the end of the file, maybe there are others?)
      if (lines[c].length > 0) {
        csvNumbersByRow.push([]);

        const lineData = lines[c].split(",");
        for (const item of lineData) {
          csvNumbersByRow[c - 2].push(Number.parseFloat(item.trim()));
        }
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
            scanId,
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
            scanId,
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
            scanId,
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
            scanId,
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
          backgroundSrc = new SpectrumSource(scanId, roiId, SpectrumChartModel.fitBackground, false, null, [], false, Colours.PURPLE, [], []);
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
                perElementSources.set(elem, new SpectrumSource(scanId, roiId, elem, false, null, [], false, Colours.YELLOW, [], [], info.Z));
              }

              // Add this peak line to the element it belongs to
              // NOTE: we add element peak lines as NOT enabled
              const src = perElementSources.get(elem);
              if (src) {
                src.lineChoices.push(new SpectrumLineChoice(fitElementLinePrefix + header, header, false, this.readFitColumn(c, csvNumbersByRow)));
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

    // If we just got cleared, clear our XRF DB
    if (this._linesShown.size == 0) {
      this._activeXRFDB = null;
    }
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

    let previousKeyItems = this._keyItems.slice();
    this._keyItems = [];

    // Run through and regenerate key items from all lines
    let lastROI = "";
    for (const line of this._spectrumLines) {
      // if (lastROI !== line.roiId) {
      //   // Fake entry for ROI header label
      //   this._keyItems.push(new WidgetKeyItem(line.roiId, line.roiName, line.color));
      //   lastROI = line.roiId;
      // }

      let roiName = PredefinedROIID.isAllPointsROI(line.roiId) ? "All Points" : line.roiName;

      let groupName = `${roiName} (${line.scanName})`;

      let keyId = `${line.roiId}-${line.expressionLabel}`;
      let lastVisibility = previousKeyItems.find(item => item.id === keyId)?.isVisible ?? true;
      const key = new WidgetKeyItem(keyId, line.expressionLabel, line.color, line.dashPattern, undefined, groupName, lastVisibility);
      this._keyItems.push(key);
    }

    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  addLineDataForLine(
    roiId: string,
    lineExpression: string,
    scanId: string,
    scanName: string,
    roiName: string,
    colourRGB: RGBA,
    lineValues: Map<string, SpectrumValues>,
    lineWidth: number = 1.0, // OPTIONAL! Can make lines wider by changing this
    opacity: number = 1.0, // OPTIONAL! Can change opacity
    drawFilled: boolean = false // OPTIONAL! Can draw as filled polygon between line and x axis. NOTE: In this case, the line itself is not drawn
  ): void {
    // Find the line and get its index (need this for dash pattern generation)
    const roiLines = this._linesShown.get(roiId);
    const roiIdx = roiLines ? roiLines.indexOf(lineExpression) : -1;
    if (!roiLines || (!lineExpression.startsWith("fit_") && roiIdx < 0)) {
      throw new Error(`addLineDataForLine called for non-existant line: ${roiId}-${lineExpression}`);
    }

    if (!this._activeXRFDB) {
      // No DB yet, create one for this scan
      // TODO: what about when we have scans from different instruments, therefore different XRF db requirements?
      this.xrfDBService.getXRFLines(scanId).subscribe(xrfdb => {
        this._activeXRFDB = xrfdb;
      });
    }

    const lineDashPatterns = [[], [6, 2], [2, 2], [1, 2, 1, 2, 1, 2, 8, 2]];
    const dashPattern = lineDashPatterns[(roiIdx < 0 ? 0 : roiIdx) % lineDashPatterns.length];

    // It's actually stored in a separate list for drawing, so delete any existing entry
    for (let c = 0; c < this._spectrumLines.length; c++) {
      const line = this._spectrumLines[c];
      if (line.roiId == roiId && line.expression == lineExpression) {
        this._spectrumLines.splice(c, 1);
        break;
      }
    }

    // Add all lines
    for (const [label, valuesForLine] of lineValues) {
      const xValues = this.calcXValues(valuesForLine.values.length, scanId, valuesForLine.sourceDetectorID);
      const spectrumLine = new SpectrumChartLine(
        scanId,
        scanName,
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

  private calcXValues(channelCount: number, scanId: string, forDetectorId: string): Float32Array {
    // If we're drawing fit lines, we already have implicity x-axis values from the CSV returned
    if (this._showFitLines && this._fitXValues) {
      return this._fitXValues;
    }

    // Calculate x values
    let xvalues: number[] = [];

    // Make incrementing x values (channel)
    const incr = this._showXAsEnergy$.value ? 0 : 1;
    for (let c = 0; c < channelCount; c++) {
      xvalues.push(c + incr);
    }

    // Calc as energy if needed
    if (this._showXAsEnergy$.value) {
      let detectorCalib = "A";
      if (forDetectorId == "B") {
        detectorCalib = "B";
      }

      const cal = this._calibration.get(scanId + "-" + detectorCalib);
      if (cal) {
        xvalues = cal.channelsTokeV(xvalues);
      }
    }

    return new Float32Array(xvalues);
  }

  getMaxSpectrumValueAtEnergy(keV: number): number | null {
    let value = null;

    if (this.spectrumLines.length > 0) {
      for (const spectrum of this.spectrumLines) {
        const cal = this._calibration.get(spectrum.scanId + "-" + "A");
        if (cal) {
          // Take the eV of the line, find its channel index
          const ch = cal.keVsToChannel([keV]);
          if (ch.length > 0 && ch[0] >= 0 && ch[0] < spectrum.values.length) {
            const thisVal = spectrum.values[ch[0]];
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
    if (this._showXAsEnergy$.value) {
      return value.toLocaleString() + " keV";
    }
    return "Channel: " + Math.round(value).toString();
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
      console.warn("SpectrumChart regenerateDrawModel: failed because canvas dimensions not known");
      return;
    }

    if (!this._lineRangeX.isValid() || !this._lineRangeY.isValid()) {
      console.warn(`SpectrumChart regenerateDrawModel: failed due to an axis range being invalid`);
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
        lineRangeYmax * 1.5 // to leave gap at top above chart
      );
    } else {
      this._yAxis = new LinearChartAxis(
        false,
        yMargin,
        this._drawTransform.canvasParams.height - yMargin,
        lineRangeYmin,
        lineRangeYmax * 1.05 // to leave gap at top above chart
      );
    }

    this._chartArea = new Rect(this._xAxis.startPx, 0, this._xAxis.pxLength, this._yAxis.pxLength);

    this._xAxis.updateAxis(viewport, this._drawTransform);
    this._yAxis.updateAxis(viewport, this._drawTransform);

    // Clear the draw data so it gets regenerated on next draw call
    this._drawModel.drawnData = null;
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

  keVToChannel(keV: number, scanId: string, detector: string): number | null {
    const cal = this._calibration.get(scanId + "-" + detector);
    if (!cal) {
      return null;
    }

    return cal.keVsToChannel([keV])[0];
  }

  channelTokeV(channel: number, scanId: string, detector: string): number | null {
    const cal = this._calibration.get(scanId + "-" + detector);
    if (!cal) {
      return null;
    }

    return cal.channelsTokeV([channel])[0];
  }

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
}

export class SpectrumDrawModel implements BaseChartDrawModel {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;
}
