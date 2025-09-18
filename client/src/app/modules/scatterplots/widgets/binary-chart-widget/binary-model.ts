import { MinMax } from "src/app/models/BasicTypes";
import { CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { Point, PointWithRayLabel, Rect } from "src/app/models/Geometry";
import { Colours } from "src/app/utils/colours";
import { RegionDataResults } from "src/app/modules/pixlisecore/pixlisecore.module";
import {
  ChartAxis,
  ChartAxisDrawer,
  LinearChartAxis,
} from "src/app/modules/widget/components/interactive-canvas/chart-axis";
import {
  PLOT_POINTS_SIZE,
  HOVER_POINT_RADIUS,
  CANVAS_FONT_SIZE_TITLE,
} from "src/app/utils/drawing";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import {
  DrawModelWithPointGroup,
  NaryChartDataGroup,
  NaryChartDataItem,
  NaryChartModel,
  makeDrawablePointGroups,
} from "../../base/model";
import { WidgetError } from "src/app/modules/pixlisecore/models/widget-data-source";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { ScanItem } from "../../../../generated-protos/scan";
import { ReferenceData } from "../../../../generated-protos/references";

export class BinaryChartModel extends NaryChartModel<
  BinaryData,
  BinaryDrawModel
> {
  public static readonly FONT_SIZE_SMALL = CANVAS_FONT_SIZE_TITLE - 4;

  private _referenceData: ReferenceData[] = [];
  hoverReferenceData: ReferenceData | null = null;

  // Zoom ranges for X and Y axes
  selectedMinXValue: number | null = null;
  selectedMaxXValue: number | null = null;
  selectedMinYValue: number | null = null;
  selectedMaxYValue: number | null = null;

  // Get axis ranges for zoom functionality
  get xAxisMinMax(): MinMax {
    return this._drawModel.xValueRange;
  }

  get yAxisMinMax(): MinMax {
    return this._drawModel.yValueRange;
  }

  get xAxisZoomRange(): MinMax {
    const min =
      this.selectedMinXValue !== null
        ? this.selectedMinXValue
        : this._drawModel.xValueRange.min;
    const max =
      this.selectedMaxXValue !== null
        ? this.selectedMaxXValue
        : this._drawModel.xValueRange.max;
    return new MinMax(min, max);
  }

  get yAxisZoomRange(): MinMax {
    const min =
      this.selectedMinYValue !== null
        ? this.selectedMinYValue
        : this._drawModel.yValueRange.min;
    const max =
      this.selectedMaxYValue !== null
        ? this.selectedMaxYValue
        : this._drawModel.yValueRange.max;
    return new MinMax(min, max);
  }

  resetZoom(): void {
    this.selectedMinXValue = null;
    this.selectedMaxXValue = null;
    this.selectedMinYValue = null;
    this.selectedMaxYValue = null;
    this.recalculate();
    this.needsCanvasResize$.next();
  }

  get references(): ReferenceData[] {
    return this._referenceData;
  }

  set references(refs: ReferenceData[]) {
    this._referenceData = refs;
    this._drawModel.references = refs;
    this.needsDraw$.next();
  }

  protected regenerateDrawModel(
    raw: BinaryData | null,
    canvasParams: CanvasParams
  ): void {
    this._drawModel.regenerate(raw, this._beamSelection, canvasParams, this);

    // Calculate reference coordinates after the draw model is regenerated
    if (
      this._referenceData.length > 0 &&
      raw &&
      this._drawModel.xAxis &&
      this._drawModel.yAxis
    ) {
      this._drawModel.referenceCoords = this.calculateReferenceCoordinates(raw);
    } else {
      this._drawModel.referenceCoords = [];
    }
  }

  setData(data: RegionDataResults, scanItems: ScanItem[] = []): WidgetError[] {
    const axes: ScatterPlotAxisInfo[] = [
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()), // X
      new ScatterPlotAxisInfo("", true, "", "", new MinMax()), // Y
    ];

    return this.processQueryResult("Binary", data, axes, scanItems);
  }

  protected makeData(
    axes: ScatterPlotAxisInfo[],
    pointGroups: NaryChartDataGroup[]
  ): BinaryData {
    if (axes.length != 2) {
      throw new Error(`Invalid axis count for binary: ${axes.length}`);
    }

    return new BinaryData(axes[0], axes[1], pointGroups);
  }

  protected axisName(axisIdx: number): string {
    return axisIdx == 0 ? "x" : "y";
  }

  private calculateReferenceCoordinates(_raw: BinaryData): PointWithRayLabel[] {
    const coords: PointWithRayLabel[] = [];

    if (this.expressionIds.length < 2) {
      return coords;
    }

    for (const reference of this._referenceData) {
      // Find X and Y values for this reference
      let xValue: number | null = null;
      let xPair:
        | { expressionId: string; expressionName: string; value: number }
        | undefined = undefined;
      let yValue: number | null = null;
      let yPair:
        | { expressionId: string; expressionName: string; value: number }
        | undefined = undefined;

      // X-axis (first expression)
      const xExpressionId = this.expressionIds[0];
      if (xExpressionId && reference.expressionValuePairs) {
        xPair = reference.expressionValuePairs.find(
          (pair: { expressionId: string; value: number }) =>
            pair.expressionId === xExpressionId
        );
        xValue = xPair?.value || null;
      }

      if (!xValue) {
        // If can't find an exact match, see if we can match the expression name (get x label)
        const xExpressionName = this._raw?.xAxisInfo.label || "";
        if (xExpressionName) {
          // Try exact match first
          xPair = reference.expressionValuePairs.find(
            (pair: {
              expressionId: string;
              expressionName: string;
              value: number;
            }) => pair.expressionName === xExpressionName
          );
        }

        xValue = xPair?.value || null;
      }

      // Y-axis (second expression)
      const yExpressionId = this.expressionIds[1];
      if (yExpressionId && reference.expressionValuePairs) {
        yPair = reference.expressionValuePairs.find(
          (pair: { expressionId: string; value: number }) =>
            pair.expressionId === yExpressionId
        );
        yValue = yPair?.value || null;
      }

      if (!yValue) {
        // If can't find an exact match, see if we can match the expression name (get y label)
        const yExpressionName = this._raw?.yAxisInfo.label || "";
        if (yExpressionName) {
          yPair = reference.expressionValuePairs.find(
            (pair: { expressionId: string; value: number }) =>
              pair.expressionId === yExpressionName
          );
          yValue = yPair?.value || null;
        }
      }

      // Only add the point if we have both X and Y values
      if (
        xValue !== null &&
        yValue !== null &&
        this._drawModel.xAxis &&
        this._drawModel.yAxis
      ) {
        const canvasX = this._drawModel.xAxis.valueToCanvas(xValue);
        const canvasY = this._drawModel.yAxis.valueToCanvas(yValue);

        const coord = new PointWithRayLabel(
          canvasX,
          canvasY,
          `${
            reference.id
          } (${xValue.toLocaleString()}, ${yValue.toLocaleString()})`,
          canvasX,
          canvasY,
          reference.id
        );

        // Store reference data directly in the coordinate for correct mapping
        (
          coord as PointWithRayLabel & { referenceData: ReferenceData }
        ).referenceData = reference;
        coords.push(coord);
      }
    }

    return coords;
  }

  getReferenceAtPoint(pt: Point): ReferenceData | null {
    const boxSize = HOVER_POINT_RADIUS * 2;

    for (let i = 0; i < this._drawModel.referenceCoords.length; i++) {
      const coord = this._drawModel.referenceCoords[i];
      if (
        Math.abs(pt.x - coord.x) < boxSize / 2 &&
        Math.abs(pt.y - coord.y) < boxSize / 2
      ) {
        // Use the reference data stored in the coordinate to avoid index mismatch
        const storedRef = (
          coord as PointWithRayLabel & { referenceData?: ReferenceData }
        ).referenceData;
        if (storedRef) {
          return storedRef;
        }
        // Fallback: find by ID if no stored reference data
        const refId = coord.id;
        return this._referenceData.find((ref) => ref.id === refId) || null;
      }
    }

    return null;
  }
}

export class BinaryDrawModel implements DrawModelWithPointGroup {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;

  xAxis: ChartAxis | null = null;
  yAxis: ChartAxis | null = null;

  fontSize: number = BinaryChartModel.FONT_SIZE_SMALL;
  fontFamily: string = "Roboto";
  axisLineColour: string = Colours.GRAY_70.asString();
  axisTextColour: string = Colours.GRAY_30.asString();
  axisLineWidth: number = 1;

  // Coordinates we draw the points at
  pointGroupCoords: PointWithRayLabel[][] = [];
  totalPointCount: number = 0;
  references: ReferenceData[] = [];
  referenceCoords: PointWithRayLabel[] = [];

  isNonSelectedPoint: boolean[][] = [];
  selectedPointGroupCoords: PointWithRayLabel[][] = [];

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

  regenerate(
    raw: BinaryData | null,
    beamSelection: BeamSelection,
    canvasParams: CanvasParams,
    model?: BinaryChartModel
  ): void {
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
      if (
        raw.xAxisInfo.valueRange.min !== null &&
        raw.xAxisInfo.valueRange.max !== null
      ) {
        this.xValueRange = new MinMax(
          Math.floor(raw.xAxisInfo.valueRange.min),
          this.getAxisMax(raw.xAxisInfo.valueRange.max)
        );
      }
      if (raw.yAxisInfo.valueRange.min !== null && raw.yAxisInfo.valueRange.max !== null) {
        // Make it show a little more in Y due to selection and key buttons
        // NOTE: to work with negative values, it's not simply a max*1.1!
        let vMax = raw.yAxisInfo.valueRange.min + raw.yAxisInfo.valueRange.getRange() * 1.1; 
        this.yValueRange = new MinMax(Math.floor(raw.yAxisInfo.valueRange.min), this.getAxisMax(vMax));
      }
    }

    // Calculate the axis border (between outerBoarder and axisBorder we can draw axis labels)
    // Left side: leave padding, space for the vertical Y axis title, small-font sized space for hover label, padding, finally tick label width
    const leftAxisSpace =
      BinaryChartModel.FONT_SIZE +
      BinaryChartModel.FONT_SIZE_SMALL +
      BinaryChartModel.LABEL_PADDING;
    const bottomAxisSpace =
      (BinaryChartModel.LABEL_PADDING + BinaryChartModel.FONT_SIZE) * 2;

    this.axisBorder = new Rect(
      outerBorder.x + leftAxisSpace,
      outerBorder.y,
      outerBorder.w - leftAxisSpace,
      outerBorder.h - bottomAxisSpace
    );

    // We don't pan/zoom axis so just create a default one for now
    const panZoom = new PanZoom();

    // Setup both axes once
    this.initAxes(
      canvasParams,
      panZoom,
      outerBorder,
      leftAxisSpace,
      bottomAxisSpace,
      model
    );

    // Shut up transpiler
    if (!this.xAxis || !this.yAxis) {
      return;
    }

    // All this for variable y-axis label widths!!
    // We need to find the max sized label in pixels
    const drawer = this.makeChartAxisDrawer();

    // We used to pass in the screen canvas here, but this was a special case. Now that code is standardised, the only "freak"
    // thing about this code is that it needs to calculate the pixel length of a string, so we create an off-screen canvas
    // here for now and hope that its config matches the screen one!
    const cnv = new OffscreenCanvas(canvasParams.width, canvasParams.height);
    const offscreenContext = cnv.getContext("2d");

    let longestYTickLabelPx = 100;
    if (offscreenContext) {
      longestYTickLabelPx = drawer.getLongestTickLabelPx(
        offscreenContext,
        this.yAxis
      );
    }

    // Now we feed that back into BOTH xAxis and yAxis (recreating them is the easiest option for now)
    this.initAxes(
      canvasParams,
      panZoom,
      outerBorder,
      leftAxisSpace + longestYTickLabelPx,
      bottomAxisSpace,
      model
    );

    // Calculate data coordinates
    // Loop through and calculate x/y coordinates for each point
    makeDrawablePointGroups(
      raw?.pointGroups,
      this,
      beamSelection,
      (value: NaryChartDataItem) => {
        return this.makeBinaryPoint(value);
      }
    );
  }

  private makeBinaryPoint(value: NaryChartDataItem): PointWithRayLabel {
    const pointXValue = value.nullMask[0] ? "null" : value.values[0];
    const canvasX = this.xAxis!.valueToCanvas(
      value.nullMask[0] ? 0 : value.values[0]
    );

    const pointYValue = value.nullMask[1] ? "null" : value.values[1];
    const canvasY = this.yAxis!.valueToCanvas(
      value.nullMask[0] ? 0 : value.values[1]
    );

    const coord = new PointWithRayLabel(
      value.nullMask[0] ? this.xAxis!.pctToCanvas(1) : canvasX,
      value.nullMask[1] ? this.yAxis!.pctToCanvas(1) : canvasY,
      value.label ? `${value.label} (${pointXValue}, ${pointYValue})` : "",
      value.nullMask[0] ? this.xAxis!.pctToCanvas(0) : canvasX,
      value.nullMask[1] ? this.yAxis!.pctToCanvas(0) : canvasY
    );

    return coord;
  }

  private initAxes(
    canvasParams: CanvasParams,
    transform: PanZoom,
    outerBorder: Rect,
    leftAxisSpace: number,
    bottomAxisSpace: number,
    model?: BinaryChartModel
  ): void {
    // The data has to be drawn a bit in from the axis border due to point size
    const dataPadding =
      (Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS) + 1) * 0.5;

    if (this.xValueRange.min !== null && this.xValueRange.max !== null) {
      // Use zoom range if available, otherwise use full range
      let xMin = this.xValueRange.min;
      let xMax = this.xValueRange.max;

      if (model) {
        const zoomRange = model.xAxisZoomRange;
        if (zoomRange.min !== null && zoomRange.max !== null) {
          xMin = zoomRange.min;
          xMax = zoomRange.max;
        }
      }

      // Setup x-axis:
      const xAxis = new LinearChartAxis(
        true,
        outerBorder.x + leftAxisSpace + dataPadding,
        outerBorder.w - leftAxisSpace - dataPadding * 2,
        xMin,
        xMax,
        dataPadding
      );
      xAxis.setMinPixelsBetweenTicks(30);
      this.xAxis = xAxis;
      this.xAxis.updateAxis(canvasParams, transform);
    }

    if (this.yValueRange.min !== null && this.yValueRange.max !== null) {
      // Use zoom range if available, otherwise use full range
      let yMin = this.yValueRange.min;
      let yMax = this.yValueRange.max;

      if (model) {
        const zoomRange = model.yAxisZoomRange;
        if (zoomRange.min !== null && zoomRange.max !== null) {
          yMin = zoomRange.min;
          yMax = zoomRange.max;
        }
      }

      // Setup y-axis:
      const yAxis = new LinearChartAxis(
        false,
        outerBorder.y + bottomAxisSpace + dataPadding,
        outerBorder.h - bottomAxisSpace - dataPadding * 2,
        yMin,
        yMax,
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
    return new ChartAxisDrawer(
      this.fontSize + "px " + this.fontFamily,
      this.axisLineColour,
      this.axisTextColour,
      4,
      4,
      false,
      this.axisLineWidth
    );
  }
}

export class BinaryData {
  constructor(
    public xAxisInfo: ScatterPlotAxisInfo,
    public yAxisInfo: ScatterPlotAxisInfo,
    public pointGroups: NaryChartDataGroup[]
  ) {}
}
