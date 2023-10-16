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

import { ReplaySubject, Subject } from "rxjs";
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
import { EnergyCalibrationManager } from "./energy-calibration-manager";
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

  private _energyCalibrationManager: EnergyCalibrationManager = new EnergyCalibrationManager();

  private _spectrumSources: SpectrumSource[] = [];
  private _spectrumSources$ = new ReplaySubject<void>(1);

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

  private _viewStateLineList: spectrumLines[] = [];

  // CanvasDrawNotifier
  needsDraw$: Subject<void> = new Subject<void>();

  constructor(
    public envService: EnvConfigurationService //,
    // public dialog: MatDialog,
  ) // public clipboard: Clipboard
  {}

  setDataset(): void {
    console.log("Spectrum Chart setDataset - resetting state");

    // We just pass on to energy calibration
    //this._energyCalibrationManager.setDataset(dataset);

    // Reset anything we have stored at this point, we've loaded a dataset so anything happening after this is
    // is fresh
    this._spectrumSources = [];
    this._fitLineSources = [];
    this._fitSelectedElementZs = [];
    this._spectrumLines = [];
    this._xrfLinesPicked = [];
    this._xrfLinesHighlighted = null;
  }

  setQuantificationeVCalibration(calib: SpectrumEnergyCalibration[]): void {
    // We just pass on to energy calibration
    this._energyCalibrationManager.setQuantificationeVCalibration(calib);
  }

  // Things that can trigger state saving:
  // eV calibration change
  // Pan/zoom
  // Region/line expression choices
  // Resize button (or should we ignore?)
  // Log scale button
  saveState(reason: string): void {
    console.log("spectrum model saveState called due to: " + reason);
    /*let viewState = this.getViewState();

    // Update our list of lines that we have saved. This is required so when we're rebuilding lines, we have the current
    // state saved to look up what's enabled, not just what came back from view state when the widget started up. User can
    // change line visibility and gets saved to view state API, but for a time we weren't saving this locally
    this._viewStateLineList = Array.from(viewState.spectrumLines);

    this.viewStateService.setSpectrumState(this.getViewState(), this._widgetPosition);*/
  }
  /*
  private getViewState(): spectrumWidgetState {
    let spectra = [];
    for (let roi of this._spectrumSources) {
      let enabledLineExpressions = [];
      for (let line of roi.lineChoices) {
        if (line.enabled) {
          enabledLineExpressions.push(line.lineExpression);
        }
      }
      if (enabledLineExpressions.length > 0) {
        spectra.push(new spectrumLines(roi.roiID, enabledLineExpressions));
      }
    }

    let pickedLines = [];
    for (let line of this._xrfLinesPicked) {
      pickedLines.push(new spectrumXRFLineState(new ElementSetItemLines(line.atomicNumber, line.k, line.l, line.m, line.esc), line.visible));
    }

    let const = new spectrumWidgetState(
      this._drawTransform.pan.x,
      this._drawTransform.pan.y,
      this._drawTransform.scale.x,
      this._drawTransform.scale.y,
      spectra,
      this._logScale,
      pickedLines,
      this._showXAsEnergy,
      [
        new energyCalibration("A", this._energyCalibrationManager.eVCalibrationA.eVstart, this._energyCalibrationManager.eVCalibrationA.eVperChannel),
        new energyCalibration("B", this._energyCalibrationManager.eVCalibrationB.eVstart, this._energyCalibrationManager.eVCalibrationB.eVperChannel),
      ]
    );
    return toSave;
  }

  setViewState(state: spectrumWidgetState): void {
    this._drawTransform.pan.x = state.panX;
    this._drawTransform.pan.y = state.panY;

    this._drawTransform.scale.x = state.zoomX;
    this._drawTransform.scale.y = state.zoomY;

    this._logScale = state.logScale;
    this._showXAsEnergy = state.showXAsEnergy;

    // Save the line state as it's reported by view state service. This is because we're combining this
    // with locally built spectrum sources that updates when ROIs arrive (or for other reasons). This
    // is a race condition, so it's safer to store it here and call the same update function from here
    // as is called in other scenarios, and have it sort it out

    // Note, we also used to have a line setting for showing bulkA,bulkB (2 lines), this has been replaced by simply
    // having an A and B line enabled. If we ever see the old value coming in, here we convert it to the valid new way
    this._viewStateLineList = [];
    for (const line of state.spectrumLines) {
      if (line.lineExpressions.length > 0 && line.lineExpressions[0] == "bulk(A),bulk(B)") {
        // Replace with 2 lines
        line.lineExpressions = ["bulk(A)", "bulk(B)"];
      }

      this._viewStateLineList.push(line);
    }
    //this._viewStateLineList = Array.from(state.spectrumLines);

    // We removed

    // Restore the XRF lines
    this._xrfLinesPicked = [];
    for (const line of state.xrflines) {
      if (line.visible) {
        this.internalPickXRFLine(line.line_info.Z);
      }
    }

    // Restore X axis calibration
    if (this._showXAsEnergy && state.energyCalibration.length == 2 && state.energyCalibration[0].detector == "A" && state.energyCalibration[1].detector == "B") {
      this._energyCalibrationManager.setXAxisEnergyCalibration(
        "view-state",
        new SpectrumEnergyCalibration(state.energyCalibration[0].eVStart, state.energyCalibration[0].eVPerChannel, state.energyCalibration[0].detector),
        new SpectrumEnergyCalibration(state.energyCalibration[1].eVStart, state.energyCalibration[1].eVPerChannel, state.energyCalibration[1].detector)
      );
    }

    // Fire off any changes to be notified
    this._xrfLinesChanged$.next();

    // And finally, redraw
    this.needsDraw$.next();
  }
*/

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

  get spectrumSources(): SpectrumSource[] {
    return this._spectrumSources;
  }

  get spectrumSources$(): ReplaySubject<void> {
    return this._spectrumSources$;
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
    /*this.recalcSpectrumLines();
    this.clearDisplayData();
    this.saveState("xAxisEnergyScale");*/
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

  get energyCalibrationManager(): EnergyCalibrationManager {
    return this._energyCalibrationManager;
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
    this.saveState("set chartYResize");
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
    this.saveState("xrf lines picked");
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
    this.saveState("unpickXRFLine");
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
  /*
  updateSpectrumSources(widgetDataService: WidgetRegionService) {
    const t0 = performance.now();

    const regions = widgetDataService.regions;

    // Sync our spectrum sources to the list of regions - if something exists, update, otherwise add, and delete if not in regions
    const updatedSources: SpectrumSource[] = [];
    const sourceROIs: Set<string> = new Set<string>();

    for (const source of this._spectrumSources) {
      // Add if exists in regions
      const region = regions.get(source.roiID);
      if (region) {
        // Was trying to be too smart about it... there are other factors that affect this, so just let it always regenerate
        // and if it's too slow, optimise later

        // If we have to update its colour, add as new item so it gets noticed by angulars mechanisms, and ends up on
        // SpectrumRegionSettingsComponent as expected
        /*                if(RGBA.equal(region.colour, source.colourRGBA) && source.locationIndexes == region.locationIndexes)
                {
                    updatedSources.push(source);
                }
                else*/
  /*        {
          const lineChoices = this.getLinesStates(source.roiID, region.pmcs.size > 1);

          updatedSources.push(
            new SpectrumSource(
              source.roiID,
              region.name,
              region.shared,
              region.creator,
              region.tags,
              (region.mistROIItem && region?.mistROIItem.ID_Depth >= 5) || false,
              region.colour == null ? null : RGBA.fromWithA(region.colour, 1),
              lineChoices,
              region.locationIndexes
            )
          );
        }

        // Remember we've got this one, so we can find what's new
        sourceROIs.add(source.roiID);
      }
      // else it'll get deleted...
    }

    for (const [roiID, region] of regions) {
      if (!sourceROIs.has(roiID)) {
        // Add it
        updatedSources.push(
          new SpectrumSource(
            roiID,
            region.name,
            region.shared,
            region.creator,
            region.tags,
            (region.mistROIItem && region?.mistROIItem.ID_Depth >= 5) || false,
            region.colour == null ? null : RGBA.fromWithA(region.colour, 1),
            this.getLinesStates(roiID, region.pmcs.size > 1),
            region.locationIndexes
          )
        );

        sourceROIs.add(roiID);
      }
    }

    // Move all points and selected points to the start of the list
    let allPointsSource: SpectrumSource = null;
    let selectedPointsSource: SpectrumSource = null;
    let remainingPointsSource: SpectrumSource = null;

    this._spectrumSources = [];

    for (let c = 0; c < updatedSources.length; c++) {
      const source = updatedSources[c];
      if (source.roiID == PredefinedROIID.AllPoints) {
        allPointsSource = source;
      } else if (source.roiID == PredefinedROIID.SelectedPoints) {
        selectedPointsSource = source;
      } else if (source.roiID == PredefinedROIID.RemainingPoints) {
        remainingPointsSource = source;
      } else {
        this._spectrumSources.push(source);
      }
    }

    // Now add the predefined ROIs to the start
    if (remainingPointsSource) {
      this._spectrumSources.unshift(remainingPointsSource);
    }
    if (selectedPointsSource) {
      this._spectrumSources.unshift(selectedPointsSource);
    }
    if (allPointsSource) {
      this._spectrumSources.unshift(allPointsSource);
    }

    // If no view state yet, show a default...
    if (!this._viewStateLineList || this._viewStateLineList.length <= 0) {
      this.addSpectrumLine(PredefinedROIID.AllPoints, SpectrumChartModel.lineExpressionBulkA);
      this.addSpectrumLine(PredefinedROIID.AllPoints, SpectrumChartModel.lineExpressionBulkB);

      this.addSpectrumLine(PredefinedROIID.SelectedPoints, SpectrumChartModel.lineExpressionBulkA);
      this.addSpectrumLine(PredefinedROIID.SelectedPoints, SpectrumChartModel.lineExpressionBulkB);

      // Make it eV calibrated
      this._showXAsEnergy = true;
    }

    const t1 = performance.now();

    this.recalcSpectrumLines();

    const t2 = performance.now();

    this._spectrumSources$.next();

    const t3 = performance.now();

    console.log("Spectrum updateSpectrumSources took: " + (t1 - t0).toLocaleString() + "ms, spectrumSources$ took: " + (t3 - t2).toLocaleString() + "ms");
  }
*/
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

  private getLinesStates(roiID: string, hasMultiplePMCs: boolean): SpectrumLineChoice[] {
    let lines: SpectrumLineChoice[] = [];

    if (hasMultiplePMCs) {
      lines = [
        new SpectrumLineChoice(SpectrumChartModel.lineExpressionBulkA, "A", false),
        new SpectrumLineChoice(SpectrumChartModel.lineExpressionBulkB, "B", false),
        new SpectrumLineChoice("sum(bulk(A),bulk(B))", "Sum of A + B", false),
        new SpectrumLineChoice("diff(bulk(A),bulk(B))", "Difference A - B", false),
        new SpectrumLineChoice("diff(bulk(B),bulk(A))", "Difference B - A", false),
        new SpectrumLineChoice("minOf(bulk(A),bulk(B))", "Min of A and B", false),
        new SpectrumLineChoice("maxOf(bulk(A),bulk(B))", "Max of A and B", false),
        new SpectrumLineChoice("removeDiffraction(bulk(A),bulk(B))", "A without Diffraction", false),
        new SpectrumLineChoice("removeDiffraction(bulk(B),bulk(A))", "B without Diffraction", false),

        new SpectrumLineChoice(SpectrumChartModel.lineExpressionMaxA, "A", false),
        new SpectrumLineChoice("max(B)", "B", false),
        new SpectrumLineChoice("sum(max(A),max(B))", "Sum of A + B", false),
        new SpectrumLineChoice("diff(max(A),max(B))", "Difference A - B", false),
        new SpectrumLineChoice("diff(max(B),max(A))", "Difference B - A", false),
        new SpectrumLineChoice("minOf(max(A),max(B))", "Min of A and B", false),
        new SpectrumLineChoice("maxOf(max(A),max(B))", "Max of A and B", false),
      ];
    } else {
      // If there is only 1 PMC (eg only 1 selected point, or only 1 in the ROI), we have less options to show
      // as all the bulk/max options are only adding up 1 spectrum, so don't show those
      lines = [
        new SpectrumLineChoice(SpectrumChartModel.lineExpressionBulkA, "A", false),
        new SpectrumLineChoice(SpectrumChartModel.lineExpressionBulkB, "B", false),
        new SpectrumLineChoice("sum(bulk(A),bulk(B))", "Sum of A + B", false),
        new SpectrumLineChoice("diff(bulk(A),bulk(B))", "Difference A - B", false),
        new SpectrumLineChoice("diff(bulk(B),bulk(A))", "Difference B - A", false),
        new SpectrumLineChoice("minOf(bulk(A),bulk(B))", "Min of A and B", false),
        new SpectrumLineChoice("maxOf(bulk(A),bulk(B))", "Max of A and B", false),
        new SpectrumLineChoice("removeDiffraction(bulk(A),bulk(B))", "A without Diffraction", false),
        new SpectrumLineChoice("removeDiffraction(bulk(B),bulk(A))", "B without Diffraction", false),
      ];
    }

    // Check if we have saved state info for this, if we do, apply the enabled flag as we have stored
    if (this._viewStateLineList) {
      for (let roiIdx = 0; roiIdx < this._viewStateLineList.length; roiIdx++) {
        const savedLineState = this._viewStateLineList[roiIdx];

        if (roiID == savedLineState.roiID) {
          for (let c = 0; c < lines.length; c++) {
            const savedLineEnabled = savedLineState.lineExpressions.indexOf(lines[c].lineExpression) > -1;
            if (savedLineEnabled) {
              lines[c].enabled = true;
            }
          }
        }
      }
    }

    return lines;
  }

  private getSpectrumSourceIdx(roiID: string): number {
    for (let roiIdx = 0; roiIdx < this._spectrumSources.length; roiIdx++) {
      const src = this._spectrumSources[roiIdx];
      if (src.roiID == roiID) {
        return roiIdx;
      }
    }
    return -1;
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

/*
  getLines(): Map<string, Map<string, string[]>> {
    const result = new Map<string, Map<string, string[]>>();
    for (const line of this._spectrumLines) {
      // Ensure we have an entry
      let scanEntry = result.get(line.scanId);
      if (scanEntry === undefined) {
        scanEntry = new Map<string, string[]>();
        result.set(line.scanId, scanEntry);
      }

      // Add ROIs from this scan id into this entry
      let lineExpressions = scanEntry.get(line.roiId);
      if (lineExpressions === undefined) {
        lineExpressions = [];
        scanEntry.set(line.roiId, lineExpressions);
      }

      lineExpressions.push(line.expression);
    }

    return result;
  }
*/

  updateRangesAndKey(): void {
    this._lineRangeX = new MinMax(0, 0);
    this._lineRangeY = new MinMax(0, 0);

    // Find max channels and max Y from all spectra
    for (const line of this._spectrumLines) {
      if (line.xValues.length > 0) {
        const thisMaxX = line.xValues[line.xValues.length - 1];
        this._lineRangeX.expandMax(thisMaxX);
      }

      this._lineRangeY.expand(line.maxValue);
    }

    // Get min/max data values
    if (this._showXAsEnergy) {
      this._lineRangeX = new MinMax(
        0,
        Math.max(
          this._energyCalibrationManager.channelTokeV(this._lineRangeX.max || 0, "A"),
          this._energyCalibrationManager.channelTokeV(this._lineRangeX.max || 0, "B")
        )
      );
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

      const xValues = this.calcXValues(valuesForLine.values.length, valuesForLine.sourceDetectorID);
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

  private calcXValues(channelCount: number, forDetectorId: string): Float32Array {
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

      let energy = 0;
      for (let c = 0; c < xvalues.length; c++) {
        energy = this._energyCalibrationManager.channelTokeV(c, detectorCalib);
        xvalues[c] = energy; //this._xAxis.valueToPx(energy);
      }
    }

    return xvalues;
  }

  getMaxSpectrumValueAtEnergy(keV: number): number {
    let value = 0;

    if (this.spectrumLines.length > 0) {
      const channel = this._energyCalibrationManager.keVToChannel(keV, "A");

      for (const spectrum of this.spectrumLines) {
        // Take the eV of the line, find its channel index
        if (channel >= 0 && channel < spectrum.values.length) {
          const thisVal = spectrum.values[channel];
          if (value == null || thisVal > value) {
            value = thisVal;
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
  recalcDisplayData(viewport: CanvasParams) {
    if (!this._drawTransform.canvasParams || this._drawTransform.canvasParams.width <= 0 || this._drawTransform.canvasParams.height <= 0) {
      console.error("SpectrumChart recalcDisplayData: failed because canvas dimensions not known");
      return;
    }

    if (!this._lineRangeX.isValid()) {
      console.error("SpectrumChart recalcDisplayData: failed due to X axis range being invalid");
      return;
    }
    if (!this._lineRangeY.isValid()) {
      console.error("SpectrumChart recalcDisplayData: failed due to Y axis range being invalid");
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
}
