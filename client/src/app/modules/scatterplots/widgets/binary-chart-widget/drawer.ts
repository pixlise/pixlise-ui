import { CanvasDrawParameters } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { HOVER_POINT_RADIUS, OUTLINE_LINE_WIDTH, OutlineDrawer, PLOT_POINTS_SIZE, PointDrawer } from "src/app/utils/drawing";

import { BinaryChartModel, BinaryDrawModel } from "./model";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CachedCanvasChartDrawer } from "../../base/cached-drawer";
import { BaseChartModel } from "../../base/model-interfaces";

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

    const drawData = this._mdl.drawModel;

    const alpha = PointDrawer.getOpacity(drawData.totalPointCount);
    for (let c = 0; c < drawData.pointGroupCoords.length; c++) {
      const colourGroup = this._mdl.raw.pointGroups[c].roiId === PredefinedROIID.AllPoints && this.lightMode ? Colours.GRAY_80 : this._mdl.raw.pointGroups[c].colour;
      const visibility = this._mdl.raw.pointGroups[c].roiId === PredefinedROIID.AllPoints && this.lightMode ? 0.4 : alpha;
      const drawer = new PointDrawer(screenContext, PLOT_POINTS_SIZE, colourGroup, null, this._mdl.raw.pointGroups[c].shape);
      drawer.drawPoints(drawData.pointGroupCoords[c], visibility);
    }
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
        this._mdl.hoverPointData.values[0].toLocaleString(),
        drawData.xAxis.pctToCanvas(0.5),
        drawData.yAxis.pctToCanvas(1) + BinaryChartModel.FONT_SIZE_SMALL * 2
      );

      // y needs rotation
      screenContext.save();
      screenContext.translate(BinaryChartModel.LABEL_PADDING, drawData.yAxis.pctToCanvas(0.5));
      screenContext.rotate(-Math.PI / 2);
      screenContext.fillText(this._mdl.hoverPointData.values[1].toLocaleString(), 0, 0);
      screenContext.restore();
    }
  }
}
