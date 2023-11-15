import { MinMax } from "src/app/models/BasicTypes";
import { CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { PointWithRayLabel, Rect } from "src/app/models/Geometry";
import { Colours } from "src/app/utils/colours";
import { RegionDataResults } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ChartAxis, ChartAxisDrawer, LinearChartAxis } from "src/app/modules/widget/components/interactive-canvas/chart-axis";
import { PLOT_POINTS_SIZE, HOVER_POINT_RADIUS, CANVAS_FONT_SIZE_TITLE, PointDrawer } from "src/app/utils/drawing";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { BaseChartDrawModel } from "../../base/model-interfaces";
import { DrawModelWithPointGroup, NaryChartDataGroup, NaryChartDataItem, NaryChartModel, makeDrawablePointGroups } from "../../base/model";
import { WidgetError } from "src/app/modules/pixlisecore/services/widget-data.service";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { MapPointShape } from "src/app/modules/image-viewers/models/map-layer";

export class BinaryChartModel extends NaryChartModel<BinaryData, BinaryDrawModel> {
  public static readonly FONT_SIZE_SMALL = CANVAS_FONT_SIZE_TITLE - 4;

  protected regenerateDrawModel(raw: BinaryData | null, canvasParams: CanvasParams): void {
    this._drawModel.regenerate(raw, this._beamSelection, canvasParams);
  }

  setData(data: RegionDataResults): WidgetError[] {
    const axes: ScatterPlotAxisInfo[] = [
      new ScatterPlotAxisInfo("", false, "", "", new MinMax()), // X
      new ScatterPlotAxisInfo("", true, "", "", new MinMax()), // Y
    ];

    return this.processQueryResult("Binary", data, axes);
  }

  protected makeData(axes: ScatterPlotAxisInfo[], pointGroups: NaryChartDataGroup[]): BinaryData {
    if (axes.length != 2) {
      throw new Error(`Invalid axis count for binary: ${axes.length}`);
    }

    return new BinaryData(axes[0], axes[1], pointGroups);
  }

  protected axisName(axisIdx: number): string {
    return axisIdx == 0 ? "x" : "y";
  }
}

export class BinaryDrawModel implements DrawModelWithPointGroup {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;

  xAxis: ChartAxis | null = null;
  yAxis: ChartAxis | null = null;

  // Coordinates we draw the points at
  pointGroupCoords: PointWithRayLabel[][] = [];
  totalPointCount: number = 0;

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

  regenerate(raw: BinaryData | null, beamSelection: BeamSelection, canvasParams: CanvasParams): void {
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

    // We used to pass in the screen canvas here, but this was a special case. Now that code is standardised, the only "freak"
    // thing about this code is that it needs to calculate the pixel length of a string, so we create an off-screen canvas
    // here for now and hope that its config matches the screen one!
    const cnv = new OffscreenCanvas(canvasParams.width, canvasParams.height);
    const offscreenContext = cnv.getContext("2d");

    let longestYTickLabelPx = 100;
    if (offscreenContext) {
      longestYTickLabelPx = drawer.getLongestTickLabelPx(offscreenContext, this.yAxis);
    }

    // Now we feed that back into BOTH xAxis and yAxis (recreating them is the easiest option for now)
    this.initAxes(canvasParams, panZoom, outerBorder, leftAxisSpace + longestYTickLabelPx, bottomAxisSpace);

    // Calculate data coordinates
    // Loop through and calculate x/y coordinates for each point
    makeDrawablePointGroups(raw?.pointGroups, this, beamSelection, (value: NaryChartDataItem) => {
      return this.makeBinaryPoint(value);
    });
  }

  private makeBinaryPoint(value: NaryChartDataItem): PointWithRayLabel {
    const pointXValue = value.nullMask[0] ? "null" : value.values[0];
    const canvasX = this.xAxis!.valueToCanvas(value.nullMask[0] ? 0 : value.values[0]);

    const pointYValue = value.nullMask[1] ? "null" : value.values[1];
    const canvasY = this.yAxis!.valueToCanvas(value.nullMask[0] ? 0 : value.values[1]);

    const coord = new PointWithRayLabel(
      value.nullMask[0] ? this.xAxis!.pctToCanvas(1) : canvasX,
      value.nullMask[1] ? this.yAxis!.pctToCanvas(1) : canvasY,
      value.label ? `${value.label} (${pointXValue}, ${pointYValue})` : "",
      value.nullMask[0] ? this.xAxis!.pctToCanvas(0) : canvasX,
      value.nullMask[1] ? this.yAxis!.pctToCanvas(0) : canvasY
    );

    return coord;
  }

  private initAxes(canvasParams: CanvasParams, transform: PanZoom, outerBorder: Rect, leftAxisSpace: number, bottomAxisSpace: number): void {
    // The data has to be drawn a bit in from the axis border due to point size
    const dataPadding = (Math.max(PLOT_POINTS_SIZE, HOVER_POINT_RADIUS) + 1) * 0.5;

    if (this.xValueRange.min !== null && this.xValueRange.max !== null) {
      // Setup x-axis:
      const xAxis = new LinearChartAxis(
        true,
        outerBorder.x + leftAxisSpace + dataPadding,
        outerBorder.w - leftAxisSpace - dataPadding * 2,
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
        outerBorder.y + bottomAxisSpace + dataPadding,
        outerBorder.h - bottomAxisSpace - dataPadding * 2,
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

export class BinaryData {
  constructor(
    public xAxisInfo: ScatterPlotAxisInfo,
    public yAxisInfo: ScatterPlotAxisInfo,
    public pointGroups: NaryChartDataGroup[]
  ) {}
}
