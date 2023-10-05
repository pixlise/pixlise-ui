import { CanvasDrawParameters, CanvasDrawer, CanvasParams } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours, RGBA } from "src/app/utils/colours";
import {
  CANVAS_FONT_SIZE,
  CANVAS_FONT_SIZE_TITLE,
  drawErrorIcon,
  drawSwapButton,
  HOVER_POINT_RADIUS,
  OutlineDrawer,
  OUTLINE_LINE_WIDTH,
  PLOT_POINTS_SIZE,
  PointDrawer,
  wrapText,
} from "src/app/utils/drawing";
import { TernaryDrawModel, TernaryChartModel } from "./model";
import { Point, Rect } from "src/app/models/Geometry";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

export class TernaryChartDrawer implements CanvasDrawer {
  public showSwapButton: boolean = true;
  public lightMode: boolean = false;

  constructor(private _mdl: TernaryChartModel) {}

  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    this._mdl.recalcDisplayDataIfNeeded(drawParams.drawViewport);

    screenContext.textAlign = "left";
    screenContext.textBaseline = "top";
    screenContext.fillStyle = Colours.ORANGE.asString();
    screenContext.font = CANVAS_FONT_SIZE_TITLE + "px Roboto";
    screenContext.fillText("TERNARY PLOT", 0, 0);

    this.drawChart(screenContext, drawParams.drawViewport, this._mdl.drawModel);
  }

  drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  protected drawChart(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, drawData: TernaryDrawModel): void {
    const clrHover = Colours.CONTEXT_PURPLE;
    const clrLasso = Colours.PURPLE;

    this.drawBackground(screenContext, viewport, drawData);
    this.drawHoverPointValueIfNeeded(screenContext, viewport, clrHover, drawData);

    // Draw data points
    if (drawData) {
      if (!drawData.drawnPoints && this._mdl.raw) {
        drawData.drawnPoints = new OffscreenCanvas(viewport.width, viewport.height);
        const offscreenContext = drawData.drawnPoints.getContext("2d");
        if (offscreenContext) {
          // Render points to an image for drawing
          const alpha = PointDrawer.getOpacity(drawData.totalPointCount);
          for (let c = 0; c < drawData.pointGroupCoords.length; c++) {
            const colourGroup = this._mdl.raw.pointGroups[c].roiId === PredefinedROIID.AllPoints && this.lightMode ? Colours.GRAY_80 : this._mdl.raw.pointGroups[c].colour;
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

    // And hover point if any
    if (this._mdl.hoverPoint != null) {
      const drawer = new PointDrawer(screenContext, HOVER_POINT_RADIUS, clrHover, null, this._mdl.hoverShape);
      drawer.drawPoints([this._mdl.hoverPoint], 1, true);
    }

    // And lasso if any
    if (this._mdl.mouseLassoPoints) {
      const drawer = new OutlineDrawer(screenContext, OUTLINE_LINE_WIDTH, clrLasso);
      drawer.drawOutline(this._mdl.mouseLassoPoints);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, viewport: CanvasParams, drawModel: TernaryDrawModel): void {
    // Draw color background
    ctx.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // Draw the triangle
    ctx.strokeStyle = this.lightMode ? Colours.GRAY_90.asString() : Colours.GRAY_60.asString();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(drawModel.triangleA.x, drawModel.triangleA.y);
    ctx.lineTo(drawModel.triangleB.x, drawModel.triangleB.y);
    ctx.lineTo(drawModel.triangleC.x, drawModel.triangleC.y);
    ctx.lineTo(drawModel.triangleA.x, drawModel.triangleA.y);
    ctx.stroke();

    // Draw scale/lines
    const height = drawModel.triangleC.y - drawModel.triangleA.y;
    const width = drawModel.triangleB.x - drawModel.triangleA.x;

    // Thicker lines, then thinner lines
    for (let i = 0; i < 2; i++) {
      ctx.lineWidth = i == 0 ? 2 : 1;

      const end = 1;
      const start = i == 0 ? 0.25 : 0.125;

      for (let t = start; t < end; t += 0.25) {
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(drawModel.triangleA.x + (t * width) / 2, drawModel.triangleA.y + t * height);
        ctx.lineTo(drawModel.triangleB.x - (t * width) / 2, drawModel.triangleB.y + t * height);
        ctx.stroke();

        // Left edge direction
        ctx.beginPath();
        ctx.moveTo(drawModel.triangleA.x + t * width, drawModel.triangleA.y);
        ctx.lineTo(drawModel.triangleC.x + t * width * 0.5, drawModel.triangleC.y - t * height);
        ctx.stroke();

        // Right edge direction
        ctx.beginPath();
        ctx.moveTo(drawModel.triangleB.x - t * width, drawModel.triangleB.y);
        ctx.lineTo(drawModel.triangleC.x - t * width * 0.5, drawModel.triangleC.y - t * height);
        ctx.stroke();
      }
    }
  }

  drawHoverPointValueIfNeeded(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, clrHover: RGBA, drawModel: TernaryDrawModel) {
    // Draw hover values if we have any
    if (this._mdl.hoverPointData) {
      screenContext.fillStyle = clrHover.asString();

      // Right aligned - we want this near the triangle
      screenContext.textAlign = "right";
      screenContext.fillText(this._mdl.hoverPointData.a.toLocaleString(), drawModel.hoverLabelA.x, drawModel.hoverLabelA.y);

      // Left aligned, these are on the other side of the triangle...
      screenContext.textAlign = "left";
      screenContext.fillText(this._mdl.hoverPointData.b.toLocaleString(), drawModel.hoverLabelB.x, drawModel.hoverLabelB.y);
      screenContext.fillText(this._mdl.hoverPointData.c.toLocaleString(), drawModel.hoverLabelC.x, drawModel.hoverLabelC.y);

      // Also draw the scan ID and PMC
      screenContext.fillText(
        "Scan ID: " + this._mdl.hoverScanId + ", PMC: " + this._mdl.hoverPointData.scanEntryId,
        10,
        drawModel.hoverLabelC.y
      );
    }
  }
}
