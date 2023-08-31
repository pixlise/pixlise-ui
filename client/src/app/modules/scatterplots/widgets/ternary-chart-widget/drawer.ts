import { ChartAxisDrawer, LinearChartAxis } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import {
  CanvasDrawParameters,
  CanvasDrawer,
  CanvasParams,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE } from "src/app/utils/drawing";
import { TernaryDrawModel } from "./model";

export class TernaryChartDrawer implements CanvasDrawer {
  public lightMode: boolean = false;

  constructor(private _mdl: TernaryDrawModel) {}

  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    screenContext.textAlign = "left";
    screenContext.textBaseline = "top";
    screenContext.fillStyle = Colours.ORANGE.asString();
    screenContext.font = CANVAS_FONT_SIZE_TITLE + "px Roboto";
    screenContext.fillText("TERNARY PLOT", 0, 0);

    this.drawChart(screenContext, drawParams.drawViewport, drawParams.worldTransform);
  }

  drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  protected drawChart(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, worldTransform: CanvasWorldTransform): void {
    // TODO: how do we do this without already being in the canvas draw function??
    this._mdl.regenerate(viewport);

    this.drawBackground(screenContext, viewport);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, viewport: CanvasParams): void {
    // Draw color background
    ctx.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // Draw the triangle
    ctx.strokeStyle = this.lightMode ? Colours.GRAY_90.asString() : Colours.GRAY_60.asString();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this._mdl.triangleA.x, this._mdl.triangleA.y);
    ctx.lineTo(this._mdl.triangleB.x, this._mdl.triangleB.y);
    ctx.lineTo(this._mdl.triangleC.x, this._mdl.triangleC.y);
    ctx.lineTo(this._mdl.triangleA.x, this._mdl.triangleA.y);
    ctx.stroke();

    // Draw scale/lines
    const height = this._mdl.triangleC.y - this._mdl.triangleA.y;
    const width = this._mdl.triangleB.x - this._mdl.triangleA.x;

    // Thicker lines, then thinner lines
    for (let i = 0; i < 2; i++) {
      ctx.lineWidth = i == 0 ? 2 : 1;

      const end = 1;
      const start = i == 0 ? 0.25 : 0.125;

      for (let t = start; t < end; t += 0.25) {
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(this._mdl.triangleA.x + (t * width) / 2, this._mdl.triangleA.y + t * height);
        ctx.lineTo(this._mdl.triangleB.x - (t * width) / 2, this._mdl.triangleB.y + t * height);
        ctx.stroke();

        // Left edge direction
        ctx.beginPath();
        ctx.moveTo(this._mdl.triangleA.x + t * width, this._mdl.triangleA.y);
        ctx.lineTo(this._mdl.triangleC.x + t * width * 0.5, this._mdl.triangleC.y - t * height);
        ctx.stroke();

        // Right edge direction
        ctx.beginPath();
        ctx.moveTo(this._mdl.triangleB.x - t * width, this._mdl.triangleB.y);
        ctx.lineTo(this._mdl.triangleC.x - t * width * 0.5, this._mdl.triangleC.y - t * height);
        ctx.stroke();
      }
    }
  }
}
