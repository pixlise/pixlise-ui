import { ChartAxisDrawer, LinearChartAxis } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import {
  CanvasDrawParameters,
  CanvasDrawer,
  CanvasParams,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE, HOVER_POINT_RADIUS, OUTLINE_LINE_WIDTH, OutlineDrawer, PLOT_POINTS_SIZE, PointDrawer } from "src/app/utils/drawing";

import { BinaryChartModel, BinaryDrawModel } from "./model";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

export class BinaryChartDrawer implements CanvasDrawer {
  public showSwapButton: boolean = true;
  public lightMode: boolean = false;

  private _ctx = {
    xAxis: new LinearChartAxis(true, 0, 100, 0, 100),
    yAxis: new LinearChartAxis(false, 0, 100, 0, 100),
  };

  protected _lastCalcCanvasParams: CanvasParams | null = null;

  constructor(private _mdl: BinaryChartModel) {}

  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    this._mdl.recalcDisplayDataIfNeeded(drawParams.drawViewport, screenContext);
    this.drawChart(screenContext, drawParams, this._mdl.drawModel);
  }

  drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  protected drawChart(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters, drawData: BinaryDrawModel): void {
    const clrHover = Colours.CONTEXT_PURPLE;
    const clrLasso = Colours.PURPLE;
    const viewport = drawParams.drawViewport;

    // Draw background
    screenContext.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
    screenContext.fillRect(0, 0, viewport.width, viewport.height);

    // Draw data points
    if (drawData) {
      if (!drawData.drawnPoints && this._mdl.raw) {
        drawData.drawnPoints = new OffscreenCanvas(viewport.width, viewport.height);
        const offscreenContext = drawData.drawnPoints.getContext("2d");
        if (offscreenContext) {
          // Render points to an image for drawing
          const alpha = PointDrawer.getOpacity(drawData.totalPointCount);
          for (let c = 0; c < drawData.pointGroupCoords.length; c++) {
            const colourGroup =
              this._mdl.raw.pointGroups[c].roiId === PredefinedROIID.AllPoints && this.lightMode ? Colours.GRAY_80 : this._mdl.raw.pointGroups[c].colour;
            const visibility = this._mdl.raw.pointGroups[c].roiId === PredefinedROIID.AllPoints && this.lightMode ? 0.4 : alpha;
            const drawer = new PointDrawer(offscreenContext, PLOT_POINTS_SIZE, colourGroup, null, this._mdl.raw.pointGroups[c].shape);
            drawer.drawPoints(drawData.pointGroupCoords[c], visibility);
          }
        }
      }

      if (drawData.drawnPoints) {
        // Draw previously rendered points...
        screenContext.drawImage(drawData.drawnPoints, 0, 0);
      }
    }

    // Draw axes
    if (drawData.xAxis !== null && drawData.yAxis !== null) {
      const axisDrawer = drawData.makeChartAxisDrawer();
      axisDrawer.drawAxes(
        screenContext,
        drawParams.drawViewport,
        drawData.xAxis,
        "", // we handle our own drawing
        drawData.yAxis,
        "" // we handle our own drawing
      );
    }

    // Draw x/y of point being hovered (if there is one)
    this.drawHoverPoint(screenContext, drawData);

    // And hover point if any
    if (this._mdl.hoverPoint !== null) {
      const drawer = new PointDrawer(screenContext, HOVER_POINT_RADIUS, clrHover, null, this._mdl.hoverShape);
      drawer.drawPoints([this._mdl.hoverPoint], 1, true);
    }

    // And lasso if any
    if (this._mdl.mouseLassoPoints) {
      const drawer = new OutlineDrawer(screenContext, OUTLINE_LINE_WIDTH, clrLasso);
      drawer.drawOutline(this._mdl.mouseLassoPoints);
    }

    screenContext.restore();
  }

  private drawHoverPoint(screenContext: CanvasRenderingContext2D, drawData: BinaryDrawModel) {
    // Draw hover values in the middle of the ticks, on top of them
    if (this._mdl.hoverPointData && drawData.xAxis && drawData.yAxis) {
      screenContext.font = BinaryChartModel.FONT_SIZE_SMALL + "px Roboto";
      screenContext.textAlign = "center";
      screenContext.textBaseline = "middle";
      screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
      // x is easy
      screenContext.fillText(
        this._mdl.hoverPointData.x.toLocaleString(),
        drawData.xAxis.pctToCanvas(0.5),
        drawData.yAxis.pctToCanvas(1) + BinaryChartModel.FONT_SIZE_SMALL * 2
      );

      // y needs rotation
      screenContext.save();
      screenContext.translate(BinaryChartModel.LABEL_PADDING, drawData.yAxis.pctToCanvas(0.5));
      screenContext.rotate(-Math.PI / 2);
      screenContext.fillText(this._mdl.hoverPointData.y.toLocaleString(), 0, 0);
      screenContext.restore();
    }
  }
}
