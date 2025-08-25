import { CanvasDrawParameters } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { HOVER_POINT_RADIUS, OutlineDrawer, PointDrawer } from "src/app/utils/drawing";

import { BinaryChartModel, BinaryDrawModel } from "./binary-model";
import { CachedCanvasChartDrawer } from "src/app/modules/widget/components/interactive-canvas/cached-drawer";
import { BaseChartModel } from "../../base/model-interfaces";
import { drawScatterPoints } from "../../base/cached-nary-drawer";

export class BinaryChartDrawer extends CachedCanvasChartDrawer {
  public showSwapButton: boolean = true;
  public lightMode: boolean = false;
  public transparentBackground: boolean = false;
  public borderWidth: number = 1;

  constructor(private _mdl: BinaryChartModel) {
    super();
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  drawAxisLabels(screenContext: CanvasRenderingContext2D): void {
    const drawData = this._mdl.drawModel;
    screenContext.font = `${this._mdl.axisLabelFontSize}px ${this._mdl.axisLabelFontFamily}`;
    screenContext.textAlign = "center";
    screenContext.textBaseline = "top";
    screenContext.fillStyle = this.lightMode ? Colours.BLACK.asString() : Colours.WHITE.asString();
    if (this._mdl.axisLabelFontColor) {
      screenContext.fillStyle = this._mdl.axisLabelFontColor;
    }

    const xAxisStartX = (drawData.xAxis?.startPx || 0) + (drawData.xAxis?.pxLength || 0) / 2;
    const xAxisStartY = (drawData.yAxis?.startPx || 0) + (drawData.yAxis?.pxLength || 0) - this._mdl.axisLabelFontSize / 2;
    screenContext.fillText(this._mdl.raw?.xAxisInfo?.label || "", xAxisStartX || 0, xAxisStartY);

    const yAxisStartX = this._mdl.axisLabelFontSize / 2 + 4;
    const yAxisStartY = (drawData.yAxis?.pxLength || 0) / 2 + (drawData.xAxis?.startPx || 0) / 2;

    screenContext.save();
    screenContext.translate(yAxisStartX, yAxisStartY);
    screenContext.rotate(-Math.PI / 2);
    screenContext.textAlign = "center";
    screenContext.textBaseline = "middle";
    screenContext.fillText(this._mdl.raw?.yAxisInfo?.label || "", 0, 0);
    screenContext.restore();
  }

  drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Draw background
    screenContext.fillStyle = this.lightMode ? Colours.WHITE.asString() : Colours.BLACK.asString();
    screenContext.fillRect(0, 0, drawParams.drawViewport.width, drawParams.drawViewport.height);
    if (this.transparentBackground) {
      screenContext.clearRect(0, 0, drawParams.drawViewport.width, drawParams.drawViewport.height);
    }

    if (this._mdl.exportMode) {
      // We need to draw labels
      this.drawAxisLabels(screenContext);
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

    // Draw reference points as pink dots
    if (drawData.referenceCoords.length > 0) {
      const refColor = Colours.CONTEXT_PURPLE; // Pink color for reference points
      const drawer = new PointDrawer(screenContext, (HOVER_POINT_RADIUS * 3) / 4, refColor, null, PointDrawer.ShapeCircle);

      drawer.drawPoints(drawData.referenceCoords, 0.75, true);
    }

    if (this._mdl.hoverReferenceData) {
      const refColor = Colours.CONTEXT_PURPLE; // Pink color for reference points
      const drawer = new PointDrawer(screenContext, HOVER_POINT_RADIUS, refColor, null, PointDrawer.ShapeCircle);
      // get reference coords
      const refCoords = drawData.referenceCoords.find(coord => coord.id === this._mdl.hoverReferenceData?.id);
      if (refCoords) {
        drawer.drawPoints([refCoords], 1, true);
        // Draw label in top right of the point
        screenContext.font = BinaryChartModel.FONT_SIZE_SMALL + "px Roboto";
        screenContext.textAlign = "left";
        screenContext.textBaseline = "top";
        screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
        screenContext.strokeStyle = "#000000";
        screenContext.lineWidth = 2;
        screenContext.strokeText(this._mdl.hoverReferenceData.mineralSampleName, refCoords.x + 10, refCoords.y - 10);
        screenContext.fillText(this._mdl.hoverReferenceData.mineralSampleName, refCoords.x + 10, refCoords.y - 10);
      }
    }

    // Draw a line between the reference points
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
    // Check if hovering over a reference point
    if (this._mdl.hoverReferenceData) {
      const xAxisTextY = drawParams.drawViewport.height - (BinaryChartModel.FONT_SIZE_SMALL + BinaryChartModel.LABEL_PADDING) * 2;
      screenContext.font = BinaryChartModel.FONT_SIZE_SMALL + "px Roboto";
      screenContext.textAlign = "left";
      screenContext.textBaseline = "top";
      screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();

      const xName = this._mdl.raw?.xAxisInfo.label || "";
      const yName = this._mdl.raw?.yAxisInfo.label || "";

      // Display reference name
      screenContext.fillText(
        `Reference: ${this._mdl.hoverReferenceData.mineralSampleName} (${xName}: ${this._mdl.hoverReferenceData.expressionValuePairs[0].value}, ${yName}: ${this._mdl.hoverReferenceData.expressionValuePairs[1].value})`,
        BinaryChartModel.LABEL_PADDING,
        xAxisTextY + (BinaryChartModel.FONT_SIZE_SMALL + BinaryChartModel.LABEL_PADDING)
      );
      return;
    }

    // Draw hover values in the middle of the ticks, on top of them
    if (this._mdl.hoverPointData && drawData.xAxis && drawData.yAxis) {
      const xAxisTextY = drawParams.drawViewport.height - (BinaryChartModel.FONT_SIZE_SMALL + BinaryChartModel.LABEL_PADDING) * 2;
      screenContext.font = BinaryChartModel.FONT_SIZE_SMALL + "px Roboto";
      screenContext.textAlign = "left";
      screenContext.textBaseline = "top";
      screenContext.fillStyle = Colours.CONTEXT_PURPLE.asString();
      // x is easy
      screenContext.fillText(
        this._mdl.hoverPointData.values.length > 0 ? this._mdl.hoverPointData.values[0].toLocaleString() : "No Value",
        drawData.xAxis.pctToCanvas(0.0),
        xAxisTextY
      );

      // y needs rotation
      screenContext.textAlign = "left";
      screenContext.textBaseline = "middle";
      screenContext.save();
      screenContext.translate(BinaryChartModel.LABEL_PADDING + 5, drawData.yAxis.pctToCanvas(1));
      screenContext.rotate(-Math.PI / 2);
      screenContext.fillText(this._mdl.hoverPointData.values.length > 0 ? this._mdl.hoverPointData.values[1].toLocaleString() : "No Value", 0, 0);
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
