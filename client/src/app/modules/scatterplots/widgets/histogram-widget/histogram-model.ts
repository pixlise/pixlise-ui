import { Observable, of, Subject } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { Point, Rect } from "src/app/models/Geometry";
import { ChartAxis, LabelledChartAxis, LinearChartAxis, LogarithmicChartAxis } from "src/app/modules/widget/components/interactive-canvas/chart-axis";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { RegionDataResults, WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Colours, RGBA } from "src/app/utils/colours";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { getExpressionShortDisplayName } from "src/app/expression-language/expression-short-name";
import { WidgetDataIds, ScanDataIds, WidgetError } from "src/app/modules/pixlisecore/models/widget-data-source";
import { BaseChartDrawModel, BaseChartModel } from "../../base/model-interfaces";
import { WidgetDataService } from "src/app/modules/pixlisecore/services/widget-data.service";
import { ScanItem } from "../../../../generated-protos/scan";
import { PredefinedROIID } from "../../../../models/RegionOfInterest";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { ROIShape } from "src/app/modules/roi/components/roi-shape/roi-shape.component";

export class HistogramModel implements CanvasDrawNotifier, BaseChartModel {
  public static WhiskersStdDev = "Deviation";
  public static WhiskersStdErr = "Error";
  public static WhiskersNone = "None";

  needsDraw$: Subject<void> = new Subject<void>();

  // The raw data we start with
  private _raw: HistogramData | null = null;

  // The drawable data (derived from the above)
  private _drawModel: HistogramDrawModel = new HistogramDrawModel();

  expressionIds: string[] = [];

  // The scan and quantification the data will come from
  dataSourceIds: WidgetDataIds = new Map<string, ScanDataIds>();

  hoverBar: HistogramDrawBar | null = null;
  hoverPoint: Point | null = null;

  cursorShown: string = CursorId.defaultPointer;

  private _previousKeyItems: WidgetKeyItem[] = [];
  keyItems: WidgetKeyItem[] = [];
  expressionsMissingPMCs: string = "";

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  whiskerDisplayMode: string = HistogramModel.WhiskersNone;
  zoomMode: string = HistogramModel.ZoomModeAll;

  public static ZoomModeWhisker = "Whiskers";
  public static ZoomModeAll = "Show All";

  logScale: boolean = false;

  get raw(): HistogramData | null {
    return this._raw;
  }

  hasRawData(): boolean {
    return this._raw != null;
  }

  get drawModel(): HistogramDrawModel {
    return this._drawModel;
  }

  get yAxisLabel(): string {
    if (!this.raw) {
      return "";
    }
    return this.raw.yAxisLabel;
  }

  setHover(pt: Point | null, bar: HistogramDrawBar | null): void {
    this.hoverBar = bar;
    this.hoverPoint = pt;
  }

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): Observable<void> {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this._drawModel.regenerate(this._raw, this.logScale, canvasParams);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
    return of(void 0);
  }

  // Returns error message if one is generated
  setData(data: RegionDataResults, scanItems: ScanItem[], beamSelection: BeamSelection | undefined): WidgetError[] {
    const t0 = performance.now();

    this._previousKeyItems = this.keyItems.slice();
    this.keyItems = [];
    this.expressionsMissingPMCs = "";

    // Work out some title business...
    let exprPseudointensityCount = 0;
    let exprWeightPctCount = 0;

    for (const result of data.queryResults) {
      const exprId = result.query.exprId;

      // Also check if it's a pseudointensity expression
      if (DataExpressionId.getPredefinedPseudoIntensityExpressionElement(exprId).length > 0) {
        exprPseudointensityCount++;
      } else if (DataExpressionId.getPredefinedQuantExpressionElementColumn(exprId) == "%") {
        exprWeightPctCount++;
      }
    }

    // Pick a Y-axis label
    let yAxisLabel = "Expression Results"; // whatever they return... could be a mix of values for all we know
    // Specific values have nicer Y labels
    if (exprWeightPctCount == this.expressionIds.length) {
      yAxisLabel = "Mean Weight %";
    } else if (exprPseudointensityCount == this.expressionIds.length) {
      yAxisLabel = "% Above Background";
    }

    this._recalcNeeded = true;
    return this.processQueryResult(t0, yAxisLabel, data, beamSelection, scanItems); // TODO: error column loading
  }

  // Returns error message if one is generated
  private processQueryResult(
    t0: number,
    yAxisLabel: string,
    queryData: RegionDataResults,
    beamSelection: BeamSelection | undefined,
    scanItems: ScanItem[]
  ): WidgetError[] {
    const errorMessages: WidgetError[] = [];

    const histogramBars: HistogramBars[] = [];
    let bars: HistogramBar[] = [];
    const overallValueRange: MinMax = new MinMax();
    let barGroupValueRange: MinMax = new MinMax();

    if (queryData.error) {
      errorMessages.push(new WidgetError(queryData.error, ""));
    }

    let queryIncr = 1;
    for (let queryIdx = 0; queryIdx < queryData.queryResults.length; queryIdx += queryIncr) {
      queryIncr = 1;

      const colData = queryData.queryResults[queryIdx];
      const exprId = colData.query.exprId;
      //const roiId = colData.query.roiId;
      let errorCol: PMCDataValues | undefined;

      // Check if we're at the special case where the next column is err, we're % and we have the same element
      if (
        queryIdx < queryData.queryResults.length - 1 &&
        DataExpressionId.getPredefinedQuantExpressionElementColumn(exprId) == "%" &&
        DataExpressionId.getPredefinedQuantExpressionElementColumn(queryData.queryResults[queryIdx + 1].query.exprId) == "err" &&
        DataExpressionId.getPredefinedQuantExpressionElement(exprId) ==
          DataExpressionId.getPredefinedQuantExpressionElement(queryData.queryResults[queryIdx + 1].query.exprId)
      ) {
        // Skip over err column in the next iteration
        queryIncr = 2;

        // Use this error column data
        errorCol = queryData.queryResults[queryIdx + 1].values;
      }

      if (colData.error) {
        errorMessages.push(colData.error);
        continue;
      }

      const concentrationCol = colData.values;

      // If we get no values for the given PMCs, display an error and stop here
      let barErrorMsg = "";
      if (concentrationCol.values.length <= 0) {
        barErrorMsg = "Histogram got no values back for query: " + colData.identity();

        console.log(barErrorMsg);
        errorMessages.push(new WidgetError(barErrorMsg, ""));
        // Don't stop here!! Let this bar appear with the error on it
        //continue;
      }

      const roiId = colData.region?.region.id || "";
      let isROIHidden = false;

      const existingKeyItem = this._previousKeyItems.find(key => key.id == roiId);
      isROIHidden = existingKeyItem ? !existingKeyItem.isVisible : false;
      if (existingKeyItem && !existingKeyItem.isVisible) {
        // This ROI is hidden, so we won't be drawing it, but we need to keep it in the key
        if (!this.keyItems.find(key => key.id == roiId)) {
          this.keyItems.push(existingKeyItem);
        }
        // continue;
      }

      if (colData.region && !isROIHidden) {
        // Calc sum of concentrations and read out column into an array
        let bar = this.calcColumnConcentrations(colData.region.region.name, colData.region.displaySettings.colour, barErrorMsg, concentrationCol, errorCol);
        bars.push(bar);
        barGroupValueRange.expandByMinMax(bar.valueRange);

        this.addToKey(
          colData.region.region.scanId,
          colData.region.region.id,
          colData.region.region.name,
          isROIHidden,
          colData.region.displaySettings.colour,
          colData.region.displaySettings.shape,
          scanItems
        );

        // Check if there is a selection, if so, filter down and show it too
        if (beamSelection) {
          const pmcs = beamSelection.getSelectedScanEntryPMCs(colData.query.scanId);

          if (pmcs.size > 0) {
            const selColour = Colours.BLUE;

            // Restrict the data down to just what's selected
            const selValues = WidgetDataService.filterForPMCs(
              colData.exprResult.resultValues,
              new Set<number>(beamSelection.getSelectedScanEntryPMCs(colData.query.scanId))
            );

            bar = this.calcColumnConcentrations(colData.region.region.name + " Selection", selColour, barErrorMsg, selValues, errorCol);
            bars.push(bar);
            barGroupValueRange.expandByMinMax(bar.valueRange);

            // Set key stuff
            this.addToKey(
              colData.region.region.scanId,
              PredefinedROIID.getSelectedPointsForScan(colData.query.scanId),
              "Selected Points",
              isROIHidden,
              selColour,
              colData.region.displaySettings.shape,
              scanItems
            );
          }
        }
      }

      // Find the next one (that we actually got data for!)
      let nextExprId = "";
      for (let c = queryIdx + queryIncr; c < queryData.queryResults.length; c++) {
        if (queryData.queryResults[c] != null) {
          nextExprId = queryData.queryResults[c].query.exprId;
          break;
        }
      }

      // If we have a "next" column, or are the last column we have to finish this bar group up
      if (queryIdx >= queryData.queryResults.length - 1 || (queryIdx < queryData.queryResults.length - 1 && exprId != nextExprId)) {
        const exprName = getExpressionShortDisplayName(10, colData.expression?.id || "", colData.expression?.name || "?");
        histogramBars.push(new HistogramBars(bars, exprName.shortName, exprName.name, barGroupValueRange));
        overallValueRange.expandByMinMax(barGroupValueRange);
        barGroupValueRange = new MinMax();
        bars = [];
      }
    }

    // Make raw data structure
    this._raw = new HistogramData(histogramBars, overallValueRange, yAxisLabel);

    const t1 = performance.now();
    this.needsDraw$.next();
    const t2 = performance.now();

    console.log(`  Histogram processQueryResult took: ${(t1 - t0).toLocaleString()}ms, needsDraw$ took: ${(t2 - t1).toLocaleString()}ms`);
    return errorMessages;
  }

  private addToKey(scanId: string, roiId: string, roiName: string, hidden: boolean, displayColour: RGBA, displayShape: ROIShape, scanItems: ScanItem[]) {
    if (!this.keyItems.find(item => item.id === roiId)) {
      const scanName = scanItems.find(scan => scan.id === scanId)?.title || "";
      if (PredefinedROIID.isAllPointsROI(roiId)) {
        roiName = "All Points";
      }

      this.keyItems.push(new WidgetKeyItem(roiId, roiName, displayColour, null, displayShape, scanName, !hidden, false));
    }
  }

  private calcColumnConcentrations(
    barName: string,
    barColour: RGBA,
    barErrorMsg: string,
    concentrationCol: PMCDataValues,
    errorCol: PMCDataValues | undefined
  ): HistogramBar {
    let concentrationSum = 0;
    let errorSum = 0;
    for (let c = 0; c < concentrationCol.values.length; c++) {
      const concentration = concentrationCol.values[c].value;
      concentrationSum += concentration;

      if (errorCol) {
        errorSum += errorCol.values[c].value;
      }
    }

    const avg = concentrationCol.values.length > 0 ? concentrationSum / concentrationCol.values.length : 0;

    // Calculate std deviation or std error, depending on setting
    const concentrationPrecision = 0.01;
    const bands: Record<number, number> = {};
    let stdDevSum = 0;
    for (let c = 0; c < concentrationCol.values.length; c++) {
      const concentration = concentrationCol.values[c].value;

      const roundedConcentration = Math.round(concentration / concentrationPrecision) * concentrationPrecision;
      bands[roundedConcentration] = bands[roundedConcentration] ? bands[roundedConcentration] + 1 : 1;

      const variation = concentration - avg;
      stdDevSum += variation * variation;
    }

    const stdDev = concentrationCol.values.length > 0 && stdDevSum > 0 ? Math.sqrt(stdDevSum / (concentrationCol.values.length - 1)) : 0;
    let stdErr = 0;

    let whiskerRange = new MinMax();
    if (this.whiskerDisplayMode === HistogramModel.WhiskersStdDev) {
      whiskerRange = new MinMax(avg - stdDev, avg + stdDev);
    } else if (this.whiskerDisplayMode === HistogramModel.WhiskersStdErr) {
      // std error calculated from std dev
      stdErr = stdDev / Math.sqrt(concentrationCol.values.length);
      whiskerRange = new MinMax(avg - stdErr, avg + stdErr);
    }

    let minMax = new MinMax(concentrationCol.valueRange.min, concentrationCol.valueRange.max);
    if (this.zoomMode === HistogramModel.ZoomModeWhisker && this.whiskerDisplayMode !== HistogramModel.WhiskersNone) {
      minMax = new MinMax(whiskerRange.min, whiskerRange.max);
    }

    let avgError = 0;
    if (errorCol && errorCol.values && errorCol.values.length > 0) {
      avgError = errorSum / errorCol.values.length;
    }

    const concentrationBands: ConcentrationBands = {
      count: concentrationCol.values.length,
      precision: concentrationPrecision,
      bands,
    };

    return new HistogramBar(barName, barColour, avg, minMax, whiskerRange, avgError, barErrorMsg, stdDev, stdErr, concentrationBands);
  }
}

export type ConcentrationBands = {
  count: number;
  precision: number;
  bands: Record<number, number>;
};

// An individual histogram bar, coloured by the region it came from
export class HistogramBar {
  // colourInfo is really the region name, but named a bit more generically in case we draw histograms for other things...
  constructor(
    public colourInfo: string,
    public colourRGB: RGBA,
    public meanValue: number,
    public valueRange: MinMax,
    public whiskerRange: MinMax,
    public errorValue: number,
    public errorMsg: string,
    public stdDev: number,
    public stdErr: number,
    public concentrationBands: ConcentrationBands
  ) {}
}

// The set of bars to show together at one x-axis location. Label is something like the element, or f(element), etc
export class HistogramBars {
  constructor(
    public bars: HistogramBar[],
    public shortLabel: string,
    public longLabel: string,
    public valueRange: MinMax
  ) {}
}

// Stores groups of bars - all bars (different colours for each region), for each expression
export class HistogramData {
  constructor(
    public barGroups: HistogramBars[],
    public valueRange: MinMax,
    public yAxisLabel: string
  ) {}
}

export class ConcentrationDrawBand {
  constructor(
    public y: number,
    public value: number,
    public frequencyPercentage: number
  ) {}
}

export class ConcentrationDrawBands {
  constructor(
    public bands: ConcentrationDrawBand[],
    public width: number
  ) {}
}

export class HistogramDrawBar {
  constructor(
    public rect: Rect,
    public upperWhisker: number,
    public lowerWhisker: number,
    public groupLabel: string,
    public bar: HistogramBar,
    public concentration: ConcentrationDrawBands
  ) {}
}

export class HistogramDrawModel implements BaseChartDrawModel {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;

  xAxis: ChartAxis | null = null;
  yAxis: ChartAxis | null = null;

  bars: HistogramDrawBar[] = [];

  regenerate(raw: HistogramData | null, logScale: boolean, viewport: CanvasParams): void {
    this.drawnData = null;

    // Recalc the scales
    const xMargin = 60;
    const yMargin = 30;

    // Get all the labels out
    const xLabels = [];

    if (raw) {
      for (const g of raw.barGroups) {
        xLabels.push(g.shortLabel);
      }
    }

    let yAxis: ChartAxis | null = null;
    const xAxis = new LabelledChartAxis(true, xMargin, viewport.width - xMargin, 0, raw?.barGroups?.length || 0, xLabels);

    // Min/max y values, these are clamped to 0, and slightly over max, so we have nice line Y values
    const minY = 0; /*this._raw.valueRange.min*/
    const maxY = Math.ceil((raw?.valueRange?.max || 0) * 1.1); // leave some top gap

    if (logScale) {
      // KNONW ISSUE: Negative values screw up when drawing on log scale. See LogarithmicChartAxis constructor for more comments

      // Need heaps more top gap!
      //maxY = Math.ceil(this._raw.valueRange.max*2);

      yAxis = new LogarithmicChartAxis(false, yMargin, viewport.height - yMargin, minY, maxY, 100);
    } else {
      const linyAxis = new LinearChartAxis(false, yMargin, viewport.height - yMargin, minY, maxY);
      linyAxis.setMinPixelsBetweenTicks(30);
      yAxis = linyAxis;
    }

    // We don't pan/zoom
    const panZoom = new PanZoom();
    xAxis.updateAxis(viewport, panZoom);
    yAxis.updateAxis(viewport, panZoom);

    // Calculate chart area (don't think anything actually uses this on histogram...)
    //this._chartArea = new Rect(this._xAxis.startPx, 0, this._xAxis.pxLength, this._yAxis.pxLength);

    // Calculate the bars themselves, this is needed for drawing as well as mouse interaction
    const uiBars: HistogramDrawBar[] = [];

    const yStart = yAxis.valueToCanvas(0);
    let barWidth = 0;
    const groupGap = 4; // 4 pixels between groups
    let x = xAxis.startPx + groupGap / 2;

    if (raw) {
      for (const barGroup of raw.barGroups) {
        if (barWidth == 0) {
          // Width of a group of bars (multi-coloured bars drawn side-by-side)
          const groupWidth = xAxis.pxLength / raw.barGroups.length;

          // Calculate width of individual bars, leaving a gap between the groups of bars
          // Assumes bar count is the same in each group of bars
          barWidth = (groupWidth - groupGap) / barGroup.bars.length;
        }

        for (const bar of barGroup.bars) {
          let yTop = yAxis.valueToCanvas(bar.meanValue);

          let barHeight = yStart - yTop;

          // If barHeight is negative, still make it a "valid" bar, even though it's probably not visible anyway
          // This was added for the case of log scale drawing of bars with negative bottom values.
          if (barHeight < 0) {
            yTop += barHeight;
            barHeight = -barHeight;
          }

          const upperWhisker = yAxis.valueToCanvas(bar.whiskerRange?.max || 0);
          const lowerWhisker = yAxis.valueToCanvas(bar.whiskerRange?.min || 0);
          const concentration = new ConcentrationDrawBands([], 0);
          Object.entries(bar.concentrationBands.bands).forEach(([band, count]) => {
            const bandValue = parseFloat(band);
            concentration.bands.push(new ConcentrationDrawBand(yAxis.valueToCanvas(bandValue), bandValue, count / bar.concentrationBands.count));
          });

          const precisionAsWidth = yAxis.valueToCanvas(bar.concentrationBands.precision) - yAxis.valueToCanvas(0);
          concentration.width = precisionAsWidth > 0 ? precisionAsWidth : 1;

          uiBars.push(new HistogramDrawBar(new Rect(x, yTop, barWidth, barHeight), upperWhisker, lowerWhisker, barGroup.longLabel, bar, concentration));

          x += barWidth;
        }

        x += groupGap;
      }
    }

    this.xAxis = xAxis;
    this.yAxis = yAxis;
    this.bars = uiBars;
  }
}
