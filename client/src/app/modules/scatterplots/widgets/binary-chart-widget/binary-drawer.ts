import { CanvasDrawParameters } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { HOVER_POINT_RADIUS, OUTLINE_LINE_WIDTH, OutlineDrawer, PLOT_POINTS_SIZE, PointDrawer } from "src/app/utils/drawing";

import { BinaryChartModel, BinaryDrawModel } from "./binary-model";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CachedCanvasChartDrawer } from "../../base/cached-drawer";
import { BaseChartModel } from "../../base/model-interfaces";
import { drawScatterPoints } from "../../base/cached-nary-drawer";

export class BinaryChartDrawer extends CachedCanvasChartDrawer {
  public showSwapButton: boolean = true;
  public lightMode: boolean = false;

  constructor(private _mdl: BinaryChartModel) {
    super();
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Draw background
    screenContext.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
    screenContext.fillRect(0, 0, drawParams.drawViewport.width, drawParams.drawViewport.height);
  }

  drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Shut up transpiler... the null check has already actually happened...
    if (!this._mdl.raw) {
      return;
    }

    drawScatterPoints(screenContext, this._mdl.drawModel, this.lightMode, this._mdl.raw.pointGroups);
  }

  drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    const drawData = this._mdl.drawModel;
    const clrHover = Colours.CONTEXT_PURPLE;
    const clrLasso = Colours.PURPLE;

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
    this.drawHoverPoint(screenContext, drawData, drawParams);

    // And hover point if any
    if (this._mdl.hoverPoint !== null) {
      const drawer = new PointDrawer(screenContext, HOVER_POINT_RADIUS, clrHover, null, this._mdl.hoverShape);
      drawer.drawPoints([this._mdl.hoverPoint], 1, true);
    }

    // And lasso if any
    if (this._mdl.mouseLassoPoints) {
      const drawer = new OutlineDrawer(screenContext, clrLasso);
      drawer.drawOutline(this._mdl.mouseLassoPoints);
    }
  }

  private drawHoverPoint(screenContext: CanvasRenderingContext2D, drawData: BinaryDrawModel, drawParams: CanvasDrawParameters) {
    // Draw hover values in the middle of the ticks, on top of them
    if (this._mdl.hoverPointData && drawData.xAxis && drawData.yAxis) {
      const xAxisTextY = drawParams.drawViewport.height - (BinaryChartModel.FONT_SIZE_SMALL + BinaryChartModel.LABEL_PADDING) * 2;
      screenContext.font = BinaryChartModel.FONT_SIZE_SMALL + "px Roboto";
      screenContext.textAlign = "left";
      screenContext.textBaseline = "top";
      screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
      // x is easy
      screenContext.fillText(this._mdl.hoverPointData.values[0].toLocaleString(), drawData.xAxis.pctToCanvas(0.0), xAxisTextY);

      // y needs rotation
      screenContext.textAlign = "left";
      screenContext.textBaseline = "middle";
      screenContext.save();
      screenContext.translate(BinaryChartModel.LABEL_PADDING + 5, drawData.yAxis.pctToCanvas(1));
      screenContext.rotate(-Math.PI / 2);
      screenContext.fillText(this._mdl.hoverPointData.values[1].toLocaleString(), 0, 0);
      screenContext.restore();

      // What scan and PMC are we on?
      screenContext.textAlign = "left";
      screenContext.textBaseline = "top";
      screenContext.fillText(
        `Scan ID: ${this._mdl.hoverScanId}, PMC: ${this._mdl.hoverPointData.scanEntryId}`,
        BinaryChartModel.LABEL_PADDING,
        xAxisTextY + (BinaryChartModel.FONT_SIZE_SMALL + BinaryChartModel.LABEL_PADDING)
      );
    }
  }
}
