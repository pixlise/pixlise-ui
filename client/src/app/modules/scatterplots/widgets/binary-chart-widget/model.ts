import { Subject } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { PanRestrictorToCanvas, PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { Point, PointWithRayLabel, Rect } from "src/app/models/Geometry";
import { RGBA, Colours } from "src/app/utils/colours";
import { ScanDataIds, WidgetDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { CursorId } from "src/app/modules/analysis/components/widget/interactive-canvas/cursor-id";
import { ExpressionReferences, RegionDataResults, WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ChartAxis, ChartAxisDrawer, LinearChartAxis } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import { CANVAS_FONT_SIZE_TITLE, PLOT_POINTS_SIZE, HOVER_POINT_RADIUS, PointDrawer } from "src/app/utils/drawing";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { getExpressionShortDisplayName } from "src/app/expression-language/expression-short-name";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { BaseChartDrawModel, BaseChartModel } from "../../base/cached-drawer";

export class BinaryChartModel implements CanvasDrawNotifier, BaseChartModel {
  // Some commonly used constants
  public static readonly OUTER_PADDING = 6;
  public static readonly LABEL_PADDING = 4;
  public static readonly FONT_SIZE = CANVAS_FONT_SIZE_TITLE;
  public static readonly FONT_SIZE_SMALL = CANVAS_FONT_SIZE_TITLE - 4;

  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom(new MinMax(1), new MinMax(1), new PanRestrictorToCanvas());

  // Settings of the binary chart
  xExpression: string = "";
  yExpression: string = "";

  // The scan and quantification the data will come from
  dataSourceIds: WidgetDataIds = new Map<string, ScanDataIds>();

  showMmol: boolean = false;
  selectModeExcludeROI: boolean = false;

  // The raw data we start with
  private _raw: BinaryData | null = null;

  // The drawable data (derived from the above)
  private _drawModel: BinaryDrawModel = new BinaryDrawModel();

  // Mouse interaction drawing
  hoverPoint: Point | null = null;
  hoverScanId: string = "";
  hoverPointData: BinaryDataItem | null = null;
  hoverShape: string = PointDrawer.ShapeCircle;

  cursorShown: string = CursorId.defaultPointer;
  mouseLassoPoints: Point[] = [];

  keyItems: WidgetKeyItem[] = [];
  expressionsMissingPMCs: string = "";

  private _references: string[] = [];

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  hasRawData(): boolean {
    return this._raw != null;
  }

  get raw(): BinaryData | null {
    return this._raw;
  }

  get drawModel(): BinaryDrawModel {
    return this._drawModel;
  }

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams, screenContext: CanvasRenderingContext2D): void {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this._drawModel.regenerate(this._raw, canvasParams, screenContext);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
  }

  setData(data: RegionDataResults) {
    const t0 = performance.now();

    this.keyItems = [];
    this.expressionsMissingPMCs = "";

    this.processQueryResult(t0, [this.xExpression, this.yExpression], data, [
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()),
      new ScatterPlotAxisInfo("", true, "", "", new MinMax()),
    ]);

    this._recalcNeeded = true;
  }

  private processQueryResult(t0: number, exprIds: string[], queryData: RegionDataResults, axes: ScatterPlotAxisInfo[]) {
    const pointGroups: BinaryDataGroup[] = [];
    const queryWarnings: string[] = [];

    for (let queryIdx = 0; queryIdx < queryData.queryResults.length; queryIdx += exprIds.length) {
      // Set up storage for our data first
      const scanId = queryData.queryResults[queryIdx].query.scanId;
      const roiId = queryData.queryResults[queryIdx].query.roiId;
      const region = queryData.queryResults[queryIdx].region;

      let pointGroup: BinaryDataGroup | null = null;

      // Filter out PMCs that don't exist in the data for all 3 corners
      const toFilter: PMCDataValues[] = [];
      for (let c = 0; c < exprIds.length; c++) {
        toFilter.push(queryData.queryResults[queryIdx + c].values);

        if (queryData.queryResults[queryIdx + c].warning) {
          queryWarnings.push(queryData.queryResults[queryIdx + c].warning);
        }
      }

      if (toFilter.length == 2 && (toFilter[0]?.values?.length || 0) != (toFilter[1]?.values?.length || 0)) {
        queryWarnings.push("X and Y axes had different sets of PMCs, only showing PMCs that exist on both axes");
      }

      const filteredValues = PMCDataValues.filterToCommonPMCsOnly(toFilter);

      // Read for each expression
      for (let c = 0; c < exprIds.length; c++) {
        // Read the name
        const expr = queryData.queryResults[queryIdx + c].expression;
        axes[c].label = getExpressionShortDisplayName(18, expr?.id || "", expr?.name || "?").shortName;

        const mmolAppend = "(mmol)";
        if (this.showMmol && !axes[c].label.endsWith(mmolAppend)) {
          // Note this won't detect if (mmol) was modified by short name to be (mm...
          axes[c].label += mmolAppend;
        }

        // TODO: handle module out of date errors

        // Did we find an error with this query?
        if (queryData.queryResults[queryIdx + c].error) {
          axes[c].errorMsgShort = queryData.queryResults[queryIdx + c].errorType || "";
          axes[c].errorMsgLong = queryData.queryResults[queryIdx + c].error || "";

          console.error(`Binary encountered error with expression: ${exprIds[c]}, on region: ${roiId}, axis: ` + (c == 0 ? "x" : "y"));
          continue;
        }

        // Expression didn't have errors, so try read its values
        if (!region) {
          // Show an error, we clearly don't have region data ready
          axes[c].errorMsgShort = "Region error";
          axes[c].errorMsgLong = "Region data not found for: " + roiId;

          console.error(axes[c].errorMsgLong);
          continue;
        }

        if (!pointGroup) {
          // Reading the region for the first time, create a point group and key entry
          pointGroup = new BinaryDataGroup(
            scanId,
            roiId,
            [],
            RGBA.fromWithA(region.displaySettings.colour, 1),
            region.displaySettings.shape,
            new Map<number, number>()
          );

          // Add to key too. We only specify an ID if it can be brought to front - all points & selection
          // are fixed in their draw order, so don't supply for those
          let roiIdForKey = region.region.id;
          if (PredefinedROIID.isPredefined(roiIdForKey)) {
            roiIdForKey = "";
          }

          this.keyItems.push(new WidgetKeyItem(roiIdForKey, region.region.name, region.displaySettings.colour, [], region.displaySettings.shape));
        }

        const roiValues: PMCDataValues | null = filteredValues[c];

        // Update corner min/max
        if (roiValues) {
          axes[c].valueRange.expandByMinMax(roiValues.valueRange);

          // Store the A/B/C values
          for (let i = 0; i < roiValues.values.length; i++) {
            const value = roiValues.values[i];

            // Save it in A, B or C - A also is creating the value...
            if (c == 0) {
              pointGroup.values.push(new BinaryDataItem(value.pmc, value.value, 0));
              pointGroup.scanEntryIdToValueIdx.set(value.pmc, pointGroup.values.length - 1);
            } else {
              // Ensure we're writing to the right PMC
              // Should always be the right order because we run 3 queries with the same ROI
              if (pointGroup.values[i].scanEntryId != value.pmc) {
                throw new Error(
                  `Received PMCs in unexpected order for binary axis: ${c == 0 ? "x" : "y"}, got PMC: ${value.pmc}, expected: ${pointGroup.values[i].scanEntryId}`
                );
              }

              if (c > 0) {
                pointGroup.values[i].y = value.value;
              }
            }
          }
        }
      }

      if (pointGroup && pointGroup.values.length > 0) {
        pointGroups.push(pointGroup);
      }
    }

    this.assignQueryResult(t0, pointGroups, axes, /*pmcLookup,*/ queryWarnings);
  }

  private assignQueryResult(t0: number, pointGroups: BinaryDataGroup[], axes: ScatterPlotAxisInfo[], queryWarnings: string[]) {
    if (this._references.length > 0) {
      const pointGroup: BinaryDataGroup = new BinaryDataGroup("", "", [], Colours.CONTEXT_PURPLE, PointDrawer.ShapeCircle, new Map<number, number>());

      this._references.forEach((referenceName, i) => {
        const reference = ExpressionReferences.getByName(referenceName);

        if (!reference) {
          console.error(`BinaryPlot prepareData: Couldn't find reference ${referenceName}`);
          return;
        }

        let refXValue = ExpressionReferences.getExpressionValue(reference, this.xExpression)?.weightPercentage;
        let refYValue = ExpressionReferences.getExpressionValue(reference, this.yExpression)?.weightPercentage;
        const nullMask = [refXValue == null, refYValue == null];

        // If we have more than one null value, we can't plot this reference on a ternary plot
        if (nullMask.filter(isNull => isNull).length > 1) {
          console.warn(`BinaryPlot prepareData: Reference ${referenceName} has undefined ${this.xExpression},${this.yExpression} values`);
          return;
        }

        if (refXValue == null) {
          refXValue = 0;
          console.warn(`BinaryPlot prepareData: Reference ${referenceName} has undefined ${this.xExpression} value`);
        }
        if (refYValue == null) {
          refYValue = 0;
          console.warn(`BinaryPlot prepareData: Reference ${referenceName} has undefined ${this.yExpression} value`);
        }

        // We don't have a PMC for these, so -10 and below are now reserverd for reference values
        const referenceIndex = ExpressionReferences.references.findIndex(ref => ref.name === referenceName);
        const id = -10 - referenceIndex;

        console.log(`BinaryPlot prepareData: Adding reference ${referenceName} with id ${id} and values (${refXValue}, ${refYValue})`);

        pointGroup.values.push(new BinaryDataItem(id, refXValue, refYValue, referenceName, nullMask));
        //pmcLookup.set(refXDataValue.values[i].pmc, new BinaryPlotPointIndex(xPointGroup.length, i));
      });

      pointGroups.push(pointGroup);
      this.keyItems.push(new WidgetKeyItem("references", "Ref Points", Colours.CONTEXT_PURPLE, [], PointDrawer.ShapeCircle));
    }

    if (queryWarnings.length > 0) {
      this.expressionsMissingPMCs = Array.from(queryWarnings).join("\n");
    }

    const binaryData = new BinaryData(axes[0], axes[1], pointGroups); // , pmcLookup);
    this._raw = binaryData;

    const t1 = performance.now();
    this.needsDraw$.next();
    const t2 = performance.now();

    console.log("  Binary prepareData took: " + (t1 - t0).toLocaleString() + "ms, needsDraw$ took: " + (t2 - t1).toLocaleString() + "ms");
  }
}

export class BinaryDrawModel implements BaseChartDrawModel {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;

  xAxis: ChartAxis | null = null;
  yAxis: ChartAxis | null = null;

  // Coordinates we draw the points at
  pointGroupCoords: PointWithRayLabel[][] = [];
  totalPointCount: number = 0;

  // Axis & data labels:
  //
  // (y axis)
  // ^
  // |
  // |
  // +--------> (x axis)

  axisBorder: Rect = new Rect(0, 0, 0, 0);

  xValueRange: MinMax = new MinMax();
  yValueRange: MinMax = new MinMax();

  regenerate(raw: BinaryData | null, canvasParams: CanvasParams, screenContext: CanvasRenderingContext2D): void {
    this.totalPointCount = 0;
    this.drawnData = null; // Force regen

    // The absolute outer border (outside of this is just padding)
    const outerBorder = new Rect(
      BinaryChartModel.OUTER_PADDING,
      BinaryChartModel.OUTER_PADDING,
      canvasParams.width - BinaryChartModel.OUTER_PADDING * 2,
      canvasParams.height - BinaryChartModel.OUTER_PADDING * 2
    );

    if (raw) {
      // Axis endpoint values - these should be round numbers larger than the max values we're drawing to. This way it's a little neater
      // to draw, has a bit of margin, and is probably easier for users to think about these numbers
      if (raw.xAxisInfo.valueRange.min !== null && raw.xAxisInfo.valueRange.max !== null) {
        this.xValueRange = new MinMax(Math.floor(raw.xAxisInfo.valueRange.min), this.getAxisMax(raw.xAxisInfo.valueRange.max));
      }
      if (raw.yAxisInfo.valueRange.min !== null && raw.yAxisInfo.valueRange.max !== null) {
        this.yValueRange = new MinMax(Math.floor(raw.yAxisInfo.valueRange.min), this.getAxisMax(raw.yAxisInfo.valueRange.max * 1.1)); // make it show a little more in Y due to selection and key buttons
      }
    }

    // Calculate the axis border (between outerBoarder and axisBorder we can draw axis labels)
    // Left side: leave padding, space for the vertical Y axis title, small-font sized space for hover label, padding, finally tick label width
    const leftAxisSpace = BinaryChartModel.FONT_SIZE + BinaryChartModel.FONT_SIZE_SMALL + BinaryChartModel.LABEL_PADDING;
    const bottomAxisSpace = (BinaryChartModel.LABEL_PADDING + BinaryChartModel.FONT_SIZE) * 2;

    this.axisBorder = new Rect(outerBorder.x + leftAxisSpace, outerBorder.y, outerBorder.w - leftAxisSpace, outerBorder.h - bottomAxisSpace);

    // We don't pan/zoom axis so just create a default one for now
    const panZoom = new PanZoom();

    // Setup both axes once
    this.initAxes(canvasParams, panZoom, outerBorder, leftAxisSpace, bottomAxisSpace);

    // Shut up transpiler
    if (!this.xAxis || !this.yAxis) {
      return;
    }

    // All this for variable y-axis label widths!!
    // We need to find the max sized label in pixels
    const drawer = this.makeChartAxisDrawer();
    const longestYTickLabelPx = drawer.getLongestTickLabelPx(screenContext, this.yAxis);

    // Now we feed that back into BOTH xAxis and yAxis (recreating them is the easiest option for now)
    this.initAxes(canvasParams, panZoom, outerBorder, leftAxisSpace + longestYTickLabelPx, bottomAxisSpace);

    // Calculate data coordinates
    // Loop through and calculate x/y coordinates for each point
    this.pointGroupCoords = [];

    if (raw) {
      for (const group of raw.pointGroups) {
        const coords: PointWithRayLabel[] = [];

        for (const value of group.values) {
          const pointXValue = value.nullMask[0] ? "null" : value.x;
          const canvasX = this.xAxis.valueToCanvas(value.nullMask[0] ? 0 : value.x);

          const pointYValue = value.nullMask[1] ? "null" : value.y;
          const canvasY = this.yAxis.valueToCanvas(value.nullMask[0] ? 0 : value.y);

          coords.push(
            new PointWithRayLabel(
              value.nullMask[0] ? this.xAxis.pctToCanvas(1) : canvasX,
              value.nullMask[1] ? this.yAxis.pctToCanvas(1) : canvasY,
              value.label ? `${value.label} (${pointXValue}, ${pointYValue})` : "",
              value.nullMask[0] ? this.xAxis.pctToCanvas(0) : canvasX,
              value.nullMask[1] ? this.yAxis.pctToCanvas(0) : canvasY
            )
          );
        }

        this.pointGroupCoords.push(coords);
        this.totalPointCount += coords.length;
      }
    }
  }

  private initAxes(canvasParams: CanvasParams, transform: PanZoom, outerBorder: Rect, leftAxisSpace: number, bottomAxisSpace: number): void {
    // The data has to be drawn a bit in from the axis border due to point size
    const dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS) + 1;

    if (this.xValueRange.min !== null && this.xValueRange.max !== null) {
      // Setup x-axis:
      const xAxis = new LinearChartAxis(
        true,
        outerBorder.x + leftAxisSpace,
        canvasParams.width - leftAxisSpace - dataPadding - dataPadding,
        this.xValueRange.min,
        this.xValueRange.max,
        dataPadding
      );
      xAxis.setMinPixelsBetweenTicks(30);
      this.xAxis = xAxis;
      this.xAxis.updateAxis(canvasParams, transform);
    }

    if (this.yValueRange.min !== null && this.yValueRange.max !== null) {
      // Setup y-axis:
      const yAxis = new LinearChartAxis(
        false,
        outerBorder.y + bottomAxisSpace,
        canvasParams.height - bottomAxisSpace - dataPadding - dataPadding,
        this.yValueRange.min,
        this.yValueRange.max,
        dataPadding
      );
      yAxis.setMinPixelsBetweenTicks(30);
      this.yAxis = yAxis;
      this.yAxis.updateAxis(canvasParams, transform);
    }
  }

  private getAxisMax(value: number): number {
    if (value > 1 || value <= 0) {
      return Math.ceil(value);
    }

    // Below 1, we need to find a nearest round decimal place value
    const decCount = -Math.log10(value);
    const mul = Math.pow(10, decCount);
    return Math.ceil(value * mul) / mul;
  }

  makeChartAxisDrawer(): ChartAxisDrawer {
    return new ChartAxisDrawer(BinaryChartModel.FONT_SIZE_SMALL + "px Roboto", Colours.GRAY_70.asString(), Colours.GRAY_30.asString(), 4, 4, false);
  }
}

export class BinaryDataItem {
  constructor(
    public scanEntryId: number, // Aka PMC, id that doesn't change on scan for a data point source (spectrum id)
    public x: number,
    public y: number,
    public label: string = "",
    public nullMask: boolean[] = [false, false]
  ) {}
}

export class BinaryDataGroup {
  constructor(
    // This group contains data for the following ROI within the following scan:
    public scanId: string,
    public roiId: string,

    // It contains these values to show:
    public values: BinaryDataItem[],

    // And these are the draw settings for the values:
    public colour: RGBA,
    public shape: string,

    // A reverse lookup from scan entry Id (aka PMC) to the values array
    // This is mainly required for selection service hover notifications, so
    // we can quickly find the valus to display
    public scanEntryIdToValueIdx: Map<number, number>
  ) {}
}

export class BinaryData {
  constructor(
    public xAxisInfo: ScatterPlotAxisInfo,
    public yAxisInfo: ScatterPlotAxisInfo,
    public pointGroups: BinaryDataGroup[]
  ) {}
}
