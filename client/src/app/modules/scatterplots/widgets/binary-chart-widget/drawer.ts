import { ChartAxisDrawer, LinearChartAxis } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import {
  CanvasDrawParameters,
  CanvasDrawer,
  CanvasParams,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE } from "src/app/utils/drawing";

export class BinaryChartDrawer implements CanvasDrawer {
  private _ctx = {
    xAxis: new LinearChartAxis(true, 0, 100, 0, 100),
    yAxis: new LinearChartAxis(false, 0, 100, 0, 100),
  };

  constructor() {}

  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    screenContext.textAlign = "left";
    screenContext.textBaseline = "top";
    screenContext.fillStyle = Colours.ORANGE.asString();
    screenContext.font = CANVAS_FONT_SIZE_TITLE + "px Roboto";
    screenContext.fillText("BINARY PLOT", 0, 0);

    this.drawChart(screenContext, drawParams.drawViewport, drawParams.worldTransform);
  }

  drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  protected drawChart(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, worldTransform: CanvasWorldTransform): void {
    let axisDrawer = new ChartAxisDrawer();

    axisDrawer.drawAxes(screenContext, viewport, this._ctx.xAxis, "X AXIS", this._ctx.yAxis, "Y AXIS");

    // Don't allow drawing over the axis now
    screenContext.save();
    screenContext.beginPath();
    screenContext.rect(this._ctx.xAxis.startPx, 0, this._ctx.xAxis.endPx, viewport.height - this._ctx.yAxis.startPx);
    screenContext.clip();

    screenContext.restore();
  }
}
