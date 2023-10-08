import { Subject } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { PanRestrictorToCanvas, PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { CursorId } from "src/app/modules/analysis/components/widget/interactive-canvas/cursor-id";
import { Point, PointWithRayLabel, scaleVector } from "src/app/models/Geometry";
import { Colours, RGBA } from "src/app/utils/colours";
import { degToRad, invalidPMC } from "src/app/utils/utils";
import { CANVAS_FONT_SIZE_TITLE, PLOT_POINTS_SIZE, HOVER_POINT_RADIUS, PointDrawer } from "src/app/utils/drawing";
import { ExpressionReferences, RegionDataResults, WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { getExpressionShortDisplayName } from "src/app/expression-language/expression-short-name";
import { ScanDataIds, WidgetDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { BaseChartDrawModel, BaseChartModel } from "../../base/cached-drawer";

export class TernaryChartModel implements CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom(new MinMax(1), new MinMax(1), new PanRestrictorToCanvas());

  // All parameters to draw a ternary diagram:

  // The 3 expressions
  expressionIdA = "";
  expressionIdB = "";
  expressionIdC = "";

  // The scan and quantification the data will come from
  dataSourceIds: WidgetDataIds = new Map<string, ScanDataIds>();

  // Settings of the binary chart
  showMmol: boolean = false;
  selectModeExcludeROI: boolean = false;

  // Some commonly used constants
  public static readonly OUTER_PADDING = 10;
  public static readonly LABEL_PADDING = 4;
  public static readonly FONT_SIZE = CANVAS_FONT_SIZE_TITLE - 1;

  // The raw data we start with
  private _raw: TernaryData | null = null;

  // The drawable data (derived from the above)
  private _drawModel: TernaryDrawModel = new TernaryDrawModel();

  // Mouse interaction drawing
  hoverPoint: Point | null = null;
  hoverScanId: string = "";
  hoverPointData: TernaryDataItem | null = null;
  hoverShape: string = PointDrawer.ShapeCircle;

  cursorShown: string = CursorId.defaultPointer;
  mouseLassoPoints: Point[] = [];

  keyItems: WidgetKeyItem[] = [];
  expressionsMissingPMCs: string = "";

  private _references: string[] = [];

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;
  /*
  set raw(r: TernaryData) {
    this._raw = r;
  }
*/
  hasRawData(): boolean {
    return this._raw != null;
  }

  get raw(): TernaryData | null {
    return this._raw;
  }

  get drawModel(): TernaryDrawModel {
    return this._drawModel;
  }

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): void {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this._drawModel.regenerate(this._raw, canvasParams);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
  }

  setData(data: RegionDataResults) {
    const t0 = performance.now();

    const corners: ScatterPlotAxisInfo[] = [
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()),
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()),
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()),
    ];

    this.keyItems = [];
    this.expressionsMissingPMCs = "";

    this.processQueryResult(t0, [this.expressionIdA, this.expressionIdB, this.expressionIdC], data, corners);
    this._recalcNeeded = true;
  }

  private processQueryResult(t0: number, exprIds: string[], queryData: RegionDataResults, corners: ScatterPlotAxisInfo[]) {
    const pointGroups: TernaryDataGroup[] = [];
    //const pmcLookup: Map<number, TernaryPlotPointIndex> = new Map<number, TernaryPlotPointIndex>();

    const queryWarnings: string[] = [];

    for (let queryIdx = 0; queryIdx < queryData.queryResults.length; queryIdx += exprIds.length) {
      // Set up storage for our data first
      const scanId = queryData.queryResults[queryIdx].query.scanId;
      const roiId = queryData.queryResults[queryIdx].query.roiId;
      const region = queryData.queryResults[queryIdx].region;

      let pointGroup: TernaryDataGroup | null = null;

      // Filter out PMCs that don't exist in the data for all 3 corners
      const toFilter: PMCDataValues[] = [];
      for (let c = 0; c < exprIds.length; c++) {
        toFilter.push(queryData.queryResults[queryIdx + c].values);

        if (queryData.queryResults[queryIdx + c].warning) {
          queryWarnings.push(queryData.queryResults[queryIdx + c].warning);
        }
      }

      const filteredValues = PMCDataValues.filterToCommonPMCsOnly(toFilter);

      // Read for each expression
      for (let c = 0; c < exprIds.length; c++) {
        // Read the name
        const expr = queryData.queryResults[queryIdx + c].expression;
        corners[c].label = getExpressionShortDisplayName(18, expr?.id || "", expr?.name || "?").shortName;

        const mmolAppend = "(mmol)";
        if (this.showMmol && !corners[c].label.endsWith(mmolAppend)) {
          // Note this won't detect if (mmol) was modified by short name to be (mm...
          corners[c].label += mmolAppend;
        }

        // TODO!!!
        //corners[c].modulesOutOfDate = queryData.queryResults[queryIdx + c].expression?.moduleReferences || "?";

        // Did we find an error with this query?
        if (queryData.queryResults[queryIdx + c].error) {
          corners[c].errorMsgShort = queryData.queryResults[queryIdx + c].errorType || "";
          corners[c].errorMsgLong = queryData.queryResults[queryIdx + c].error || "";

          console.error(
            "Ternary encountered error with expression: " + exprIds[c] + ", on region: " + roiId + ", corner: " + (c == 0 ? "left" : c == 1 ? "top" : "right")
          );
          continue;
        }

        // Expression didn't have errors, so try read its values
        if (!region) {
          // Show an error, we clearly don't have region data ready
          corners[c].errorMsgShort = "Region error";
          corners[c].errorMsgLong = "Region data not found for: " + roiId;

          console.error(corners[c].errorMsgLong);
          continue;
        }

        if (!pointGroup) {
          // Reading the region for the first time, create a point group and key entry
          pointGroup = new TernaryDataGroup(
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
          corners[c].valueRange.expandByMinMax(roiValues.valueRange);

          // Store the A/B/C values
          for (let i = 0; i < roiValues.values.length; i++) {
            const value = roiValues.values[i];

            // Save it in A, B or C - A also is creating the value...
            if (c == 0) {
              pointGroup.values.push(new TernaryDataItem(value.pmc, value.value, 0, 0));
              pointGroup.scanEntryIdToValueIdx.set(value.pmc, pointGroup.values.length - 1);
            } else {
              // Ensure we're writing to the right PMC
              // Should always be the right order because we run 3 queries with the same ROI
              if (pointGroup.values[i].scanEntryId != value.pmc) {
                throw new Error(
                  "Received PMCs in unexpected order for ternary corner: " + c + ", got PMC: " + value.pmc + ", expected: " + pointGroup.values[i].scanEntryId
                );
              }

              if (c == 1) {
                pointGroup.values[i].b = value.value;
              } // exprIds is an array of 3 so can only be: if(c == 2)
              else {
                pointGroup.values[i].c = value.value;
              }
            }
          }
        }
      }

      /*
      for (let c = 0; c < pointGroup.values.length; c++) {
        pmcLookup.set(pointGroup.values[c].scanEntryId, new TernaryPlotPointIndex(pointGroups.length, c));
      }
*/
      if (pointGroup && pointGroup.values.length > 0) {
        pointGroups.push(pointGroup);
      }
    }

    this.assignQueryResult(t0, pointGroups, corners, /*pmcLookup,*/ queryWarnings);
  }

  private assignQueryResult(
    t0: number,
    pointGroups: TernaryDataGroup[] = [],
    corners: ScatterPlotAxisInfo[],
    //pmcLookup: Map<number, TernaryPlotPointIndex>,
    queryWarnings: string[]
  ) {
    if (this._references.length > 0) {
      const pointGroup: TernaryDataGroup = new TernaryDataGroup("", "", [], Colours.CONTEXT_PURPLE, PointDrawer.ShapeCircle, new Map<number, number>());

      this._references.forEach((referenceName, i) => {
        const reference = ExpressionReferences.getByName(referenceName);

        if (!reference) {
          console.error(`TernaryPlot prepareData: Couldn't find reference ${referenceName}`);
          return;
        }

        let refAValue = ExpressionReferences.getExpressionValue(reference, this.expressionIdA)?.weightPercentage;
        let refBValue = ExpressionReferences.getExpressionValue(reference, this.expressionIdB)?.weightPercentage;
        let refCValue = ExpressionReferences.getExpressionValue(reference, this.expressionIdC)?.weightPercentage;
        const nullMask = [refAValue == null, refBValue == null, refCValue == null];

        // If we have more than one null value, we can't plot this reference on a ternary plot
        if (nullMask.filter(isNull => isNull).length > 1) {
          console.warn(`TernaryPlot prepareData: Reference ${referenceName} has undefined ${this.expressionIdA},${this.expressionIdB},${this.expressionIdC} values`);
          return;
        }

        if (refAValue == null) {
          refAValue = 0;
          console.warn(`TernaryPlot prepareData: Reference ${referenceName} has undefined ${this.expressionIdA} value`);
        }
        if (refBValue == null) {
          refBValue = 0;
          console.warn(`TernaryPlot prepareData: Reference ${referenceName} has undefined ${this.expressionIdB} value`);
        }
        if (refCValue == null) {
          refCValue = 0;
          console.warn(`TernaryPlot prepareData: Reference ${referenceName} has undefined ${this.expressionIdC} value`);
        }

        // We don't have a PMC for these, so -10 and below are now reserverd for reference values
        const referenceIndex = ExpressionReferences.references.findIndex(ref => ref.name === referenceName);
        const id = -10 - referenceIndex;

        pointGroup.values.push(new TernaryDataItem(id, refAValue, refBValue, refCValue, referenceName, nullMask));
        //pmcLookup.set(id, new TernaryPlotPointIndex(this._references.length, i));
      });

      pointGroups.push(pointGroup);
      this.keyItems.push(new WidgetKeyItem("references", "Ref Points", Colours.CONTEXT_PURPLE, [], PointDrawer.ShapeCircle));
    }

    if (queryWarnings.length > 0) {
      this.expressionsMissingPMCs = queryWarnings.join("\n");
    }

    // If we had all points defined, add to the key. This is done here because the actual
    // dataByRegion array would contain 2 of the same IDs if all points is turned on - one
    // for all points, one for selection... so if we did it in the above loop we'd double up
    /*        if(hadAllPoints)
      {
          this.keyItems.unshift(new KeyItem(ViewStateService.SelectedPointsLabel, ViewStateService.SelectedPointsColour));
          this.keyItems.unshift(new KeyItem(ViewStateService.AllPointsLabel, ViewStateService.AllPointsColour));
      }
*/
    const ternaryData = new TernaryData(corners[0], corners[1], corners[2], pointGroups); //, pmcLookup);

    this._raw = ternaryData;

    const t1 = performance.now();
    this.needsDraw$.next();
    const t2 = performance.now();

    console.log("  Ternary prepareData took: " + (t1 - t0).toLocaleString() + "ms, needsDraw$ took: " + (t2 - t1).toLocaleString() + "ms");
  }

  handleHoverPointChanged(hoverScanId: string, hoverScanEntryId: number): void {
    // Hover point changed, if we have a model, set it and redraw, otherwise ignore
    if (hoverScanEntryId <= invalidPMC) {
      // Clearing, easy case
      this.hoverPoint = null;
      this.hoverScanId = "";
      this.hoverPointData = null;
      this.hoverShape = PointDrawer.ShapeCircle;
      this.needsDraw$.next();
      return;
    }

    // Find the point in our draw model data
    if (this._raw) {
      for (let groupIdx = 0; groupIdx < this._raw.pointGroups.length; groupIdx++) {
        const group = this._raw.pointGroups[groupIdx];

        if (group.scanId == hoverScanId) {
          // Find data to show
          const valueIdx = group.scanEntryIdToValueIdx.get(hoverScanEntryId);
          if (valueIdx !== undefined && valueIdx < group.values.length) {
            const coords = this.drawModel.pointGroupCoords[groupIdx];

            this.hoverPoint = coords[valueIdx];
            this.hoverScanId = hoverScanId;
            this.hoverPointData = group.values[valueIdx];
            this.hoverShape = group.shape;
            this.needsDraw$.next();
            return;
          }
        }
      }
    }
  }
}

export class TernaryDrawModel implements BaseChartDrawModel {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;

  triangleWidth: number = 0;
  triangleHeight: number = 0;

  // Coordinates we draw the points at
  pointGroupCoords: Point[][] = [];
  totalPointCount: number = 0;

  // Triangle points
  //    C
  //
  // A     B
  triangleA: Point = new Point();
  triangleB: Point = new Point();
  triangleC: Point = new Point();

  dataAreaA: Point = new Point();
  dataAreaWidth: number = 0;

  hoverLabelA: Point = new Point();
  hoverLabelB: Point = new Point();
  hoverLabelC: Point = new Point();

  regenerate(raw: TernaryData | null, canvasParams: CanvasParams): void {
    this.totalPointCount = 0;
    this.drawnData = null; // Force regen

    const labelHeight = TernaryChartModel.FONT_SIZE + TernaryChartModel.LABEL_PADDING + TernaryChartModel.OUTER_PADDING;

    // Calculate triangle height (to make it equilateral) - assuming height is not the constraining direction
    this.triangleWidth = canvasParams.width - TernaryChartModel.OUTER_PADDING - TernaryChartModel.OUTER_PADDING;

    // Equilateral triangle height = sqrt(3)*height
    const ratio = Math.sqrt(3) / 2;
    this.triangleHeight = this.triangleWidth * ratio;

    let triangleLeft = TernaryChartModel.OUTER_PADDING;
    let triangleTop = labelHeight + (canvasParams.height - this.triangleHeight - labelHeight * 2) / 2;

    // If this won't fit, go by the height and center it width-wise
    if (this.triangleHeight + labelHeight * 2 > canvasParams.height) {
      //h=w*sqrt(3)/2
      //w=h/(sqrt(3)/2)

      this.triangleHeight = canvasParams.height - labelHeight * 2;
      this.triangleWidth = this.triangleHeight / ratio;
      //console.log('TERNARY: new tri size: '+this.triangleWidth+'x'+this.triangleHeight);
      triangleLeft = (canvasParams.width - this.triangleWidth) / 2;
      triangleTop = labelHeight + (canvasParams.height - this.triangleHeight - labelHeight * 2) / 2;
    }

    let xLabelOffset = (canvasParams.width - this.triangleWidth) / 4;
    if (xLabelOffset < TernaryChartModel.OUTER_PADDING) {
      xLabelOffset = TernaryChartModel.OUTER_PADDING;
    }

    // Calculate triangle and element label coordinates
    this.triangleA = new Point(triangleLeft, triangleTop + this.triangleHeight);
    this.triangleB = new Point(triangleLeft + this.triangleWidth, triangleTop + this.triangleHeight);
    this.triangleC = new Point(canvasParams.width / 2, triangleTop);
    //console.log('A:'+this.triangleA.x+','+this.triangleA.y+' B:'+this.triangleB.x+','+this.triangleB.y+' C:'+this.triangleC.x+','+this.triangleC.y+' w='+this.triangleWidth+', h='+this.triangleHeight);

    // Hover data positions
    const hoverUp = 50;
    this.hoverLabelA = new Point(this.triangleA.x + 20, this.triangleA.y - hoverUp); // left triangle point, but further up for space. Draw right-aligned!
    this.hoverLabelB = new Point(this.triangleB.x - 20, this.triangleB.y - hoverUp); // right triangle point, but further up for space
    this.hoverLabelC = new Point(this.triangleC.x + 10, this.triangleC.y); // right of top triangle point

    // Calculate data coordinates
    // We have to pad the drawn triangle based on point sizes we draw
    const dataPadding = Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS) * 2;
    // This padding is applied into the corners of the triangle, differs in X and Y:
    const dataPaddingX = Math.cos(degToRad(30)) * dataPadding;
    const dataPaddingY = Math.sin(degToRad(30)) * dataPadding;

    this.dataAreaA = new Point(this.triangleA.x + dataPaddingX, this.triangleA.y - dataPaddingY);
    this.dataAreaWidth = this.triangleB.x - this.triangleA.x - dataPaddingX * 2;

    // Loop through and calculate x/y coordinates for each point if we have any
    if (raw) {
      this.pointGroupCoords = [];
      for (const item of raw.pointGroups) {
        const coords = [];

        for (const ternaryItem of item.values) {
          coords.push(this.calcPointForTernary(ternaryItem));
        }

        this.pointGroupCoords.push(coords);
        this.totalPointCount += coords.length;
      }
    }
  }

  private _sin60 = Math.sin((60 * Math.PI) / 180);

  private calcPointForTernary(ternaryPoint: TernaryDataItem): PointWithRayLabel {
    const aLabel = ternaryPoint.nullMask[0] ? "null" : ternaryPoint.a;
    const bLabel = ternaryPoint.nullMask[1] ? "null" : ternaryPoint.b;
    const cLabel = ternaryPoint.nullMask[2] ? "null" : ternaryPoint.c;
    const isMissingCoord = ternaryPoint.nullMask.some(x => x);

    // Using https://en.wikipedia.org/wiki/Ternary_plot
    // "Plotting a ternary plot" formula
    const sum = ternaryPoint.a + ternaryPoint.b + ternaryPoint.c;

    // If we're missing 1 point, we need to normalize the other two and then make sure the missing
    // one is much larger so it skews the end point all the way to the missing corner of the triangle
    // If we're missing 2 points, this is just going to point towards the middle of the 2 missing corners
    const normalizedA = ternaryPoint.nullMask[0] ? sum * 100 : ternaryPoint.a / sum;
    const normalizedB = ternaryPoint.nullMask[1] ? sum * 100 : ternaryPoint.b / sum;
    const normalizedC = ternaryPoint.nullMask[2] ? sum * 100 : ternaryPoint.c / sum;
    const normalizedSum = normalizedA + normalizedB + normalizedC;

    const twoD = new PointWithRayLabel(
      0.5 * ((2 * ternaryPoint.b + ternaryPoint.c) / sum),
      this._sin60 * (ternaryPoint.c / sum),
      ternaryPoint.label ? `${ternaryPoint.label} (${aLabel}, ${bLabel}, ${cLabel})` : "",
      isMissingCoord ? 0.5 * ((2 * normalizedB + normalizedC) / normalizedSum) : null,
      isMissingCoord ? -this._sin60 * (normalizedC / normalizedSum) : null
    );

    // NOTE: y is flipped for drawing!
    twoD.y = -twoD.y;

    //console.log('twoD: '+twoD.x+','+twoD.y);

    // This fits an equilateral triangle of side length=1. We need to scale it to our triangle size, so we need
    // to scale it. Triangle width and height are not equal, but our scale factor should be... we need the size=1
    // triangle to scale up to our triangle size, which has a side length of triangleWidth
    const scaled = scaleVector(twoD, this.dataAreaWidth);
    if (twoD.endX !== null && twoD.endY !== null) {
      const scaledEnd = scaleVector(new Point(twoD.endX, twoD.endY), this.dataAreaWidth);
      twoD.endX = scaledEnd.x;
      twoD.endY = scaledEnd.y;
    }

    // Now translate it so it starts where our triangle starts
    const result = new PointWithRayLabel(scaled.x, scaled.y, twoD.label, twoD.endX, twoD.endY);

    result.x += this.dataAreaA.x;
    result.y += this.dataAreaA.y;

    if (result.endX !== null) {
      result.endX += this.dataAreaA.x;
    }
    if (result.endY !== null) {
      result.endY += this.dataAreaA.y;
    }

    return result;
  }
}

export class TernaryDataItem {
  constructor(
    public scanEntryId: number, // Aka PMC, id that doesn't change on scan for a data point source (spectrum id)
    public a: number,
    public b: number,
    public c: number,
    public label: string = "",
    public nullMask: boolean[] = [false, false, false]
  ) {}
}

export class TernaryDataGroup {
  constructor(
    // This group contains data for the following ROI within the following scan:
    public scanId: string,
    public roiId: string,

    // It contains these values to show:
    public values: TernaryDataItem[],

    // And these are the draw settings for the values:
    public colour: RGBA,
    public shape: string,

    // A reverse lookup from scan entry Id (aka PMC) to the values array
    // This is mainly required for selection service hover notifications, so
    // we can quickly find the valus to display
    public scanEntryIdToValueIdx: Map<number, number>
  ) {}
}
/*
export class TernaryPlotPointIndex {
  constructor(
    public pointGroup: number,
    public valueIndex: number
  ) {}
}
*/
export class TernaryData {
  constructor(
    public cornerA: ScatterPlotAxisInfo,
    public cornerB: ScatterPlotAxisInfo,
    public cornerC: ScatterPlotAxisInfo,
    public pointGroups: TernaryDataGroup[] //public pmcToValueLookup: Map<number, TernaryPlotPointIndex>
  ) {}
}
