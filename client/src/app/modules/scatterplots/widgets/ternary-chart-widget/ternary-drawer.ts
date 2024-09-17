import { CanvasDrawParameters, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours, RGBA } from "src/app/utils/colours";
import { HOVER_POINT_RADIUS, OutlineDrawer, PLOT_POINTS_SIZE, PointDrawer } from "src/app/utils/drawing";
import { TernaryDrawModel, TernaryChartModel } from "./ternary-model";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CachedCanvasChartDrawer } from "../../base/cached-drawer";
import { BaseChartModel } from "../../base/model-interfaces";
import { drawScatterPoints } from "../../base/cached-nary-drawer";

export class TernaryChartDrawer extends CachedCanvasChartDrawer {
  public showSwapButton: boolean = true;
  public lightMode: boolean = false;

  constructor(private _mdl: TernaryChartModel) {
    super();
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  drawPreData(ctx: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    const viewport = drawParams.drawViewport;
    const drawData = this._mdl.drawModel;

    // Draw color background
    ctx.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // Draw the triangle
    ctx.strokeStyle = this.lightMode ? Colours.GRAY_90.asString() : Colours.GRAY_60.asString();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(drawData.triangleA.x, drawData.triangleA.y);
    ctx.lineTo(drawData.triangleB.x, drawData.triangleB.y);
    ctx.lineTo(drawData.triangleC.x, drawData.triangleC.y);
    ctx.lineTo(drawData.triangleA.x, drawData.triangleA.y);
    ctx.stroke();

    // Draw scale/lines
    const height = drawData.triangleC.y - drawData.triangleA.y;
    const width = drawData.triangleB.x - drawData.triangleA.x;

    // Thicker lines, then thinner lines
    for (let i = 0; i < 2; i++) {
      ctx.lineWidth = i == 0 ? 2 : 1;

      const end = 1;
      const start = i == 0 ? 0.2 : 0.1;

      for (let t = start; t < end; t += 0.2) {
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(drawData.triangleA.x + (t * width) / 2, drawData.triangleA.y + t * height);
        ctx.lineTo(drawData.triangleB.x - (t * width) / 2, drawData.triangleB.y + t * height);
        ctx.stroke();

        // Left edge direction
        ctx.beginPath();
        ctx.moveTo(drawData.triangleA.x + t * width, drawData.triangleA.y);
        ctx.lineTo(drawData.triangleC.x + t * width * 0.5, drawData.triangleC.y - t * height);
        ctx.stroke();

        // Right edge direction
        ctx.beginPath();
        ctx.moveTo(drawData.triangleB.x - t * width, drawData.triangleB.y);
        ctx.lineTo(drawData.triangleC.x - t * width * 0.5, drawData.triangleC.y - t * height);
        ctx.stroke();
      }
    }
  }

  drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Shut up transpiler... the null check has already actually happened...
    if (!this._mdl.raw) {
      return;
    }

    drawScatterPoints(screenContext, this._mdl.drawModel, this.lightMode, this._mdl.raw.pointGroups);
  }

  drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    const clrHover = Colours.CONTEXT_PURPLE;
    const clrLasso = Colours.PURPLE;

    this.drawHoverPointValueIfNeeded(screenContext, drawParams.drawViewport, clrHover, this._mdl.drawModel);

    // And hover point if any
    if (this._mdl.hoverPoint != null) {
      const drawer = new PointDrawer(screenContext, HOVER_POINT_RADIUS, clrHover, null, this._mdl.hoverShape);
      drawer.drawPoints([this._mdl.hoverPoint], 1, true);
    }

    // And lasso if any
    if (this._mdl.mouseLassoPoints) {
      const drawer = new OutlineDrawer(screenContext, clrLasso);
      drawer.drawOutline(this._mdl.mouseLassoPoints);
    }
  }

  drawHoverPointValueIfNeeded(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, clrHover: RGBA, drawModel: TernaryDrawModel) {
    // Draw hover values if we have any
    if (this._mdl.hoverPointData) {
      screenContext.fillStyle = clrHover.asString();

      // Right aligned - we want this near the triangle
      screenContext.textAlign = "right";
      screenContext.fillText(
        this._mdl.hoverPointData.values.length > 0 ? this._mdl.hoverPointData.values[0].toLocaleString() : "No Value",
        drawModel.hoverLabelA.x,
        drawModel.hoverLabelA.y
      );

      // Left aligned, these are on the other side of the triangle...
      screenContext.textAlign = "left";
      screenContext.fillText(
        this._mdl.hoverPointData.values.length > 0 ? this._mdl.hoverPointData.values[1].toLocaleString() : "No Value",
        drawModel.hoverLabelB.x,
        drawModel.hoverLabelB.y
      );
      screenContext.fillText(
        this._mdl.hoverPointData.values.length > 0 ? this._mdl.hoverPointData.values[2].toLocaleString() : "No Value",
        drawModel.hoverLabelC.x + 12,
        drawModel.hoverLabelC.y + 12
      );

      // Also draw the scan ID and PMC
      screenContext.fillText(`Scan ID: ${this._mdl.hoverScanId}, PMC: ${this._mdl.hoverPointData.scanEntryId}`, 10, drawModel.hoverLabelC.y + 12);
    }
  }
}
