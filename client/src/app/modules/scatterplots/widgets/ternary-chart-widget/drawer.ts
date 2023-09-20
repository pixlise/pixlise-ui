import { ChartAxisDrawer, LinearChartAxis } from "src/app/modules/analysis/components/widget/interactive-canvas/chart-axis";
import {
  CanvasDrawParameters,
  CanvasDrawer,
  CanvasParams,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
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
    const clrLabel = this.lightMode ? Colours.GRAY_80.asString() : Colours.GRAY_30.asString();

    this.drawBackground(screenContext, viewport, drawData);
    this.drawLabels(screenContext, viewport, clrLabel, drawData);
    this.drawHoverPointValueIfNeeded(screenContext, viewport, clrHover, drawData);

    // Draw data points
    if (drawData && this._mdl.raw) {
      const alpha = PointDrawer.getOpacity(drawData.totalPointCount);
      for (let c = 0; c < drawData.pointGroupCoords.length; c++) {
        const colourGroup = this._mdl.raw.pointGroups[c].roiId === PredefinedROIID.AllPoints && this.lightMode ? Colours.GRAY_80 : this._mdl.raw.pointGroups[c].colour;
        const visibility = this._mdl.raw.pointGroups[c].roiId === PredefinedROIID.AllPoints && this.lightMode ? 0.4 : alpha;
        const drawer = new PointDrawer(screenContext, PLOT_POINTS_SIZE, colourGroup, null, this._mdl.raw.pointGroups[c].shape);
        drawer.drawPoints(drawData.pointGroupCoords[c], visibility);
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

    // If the user is hovering over any corners that have a long error, draw a special error display
    if (drawData && this._mdl.raw) {
      if (this._mdl.raw.cornerA.errorMsgLong.length > 0 && drawData.hoverLabel == "A") {
        TernaryChartDrawer.drawErrorBox(screenContext, viewport, this._mdl.raw.cornerA.errorMsgLong);
      } else if (this._mdl.raw.cornerB.errorMsgLong.length > 0 && drawData.hoverLabel == "B") {
        TernaryChartDrawer.drawErrorBox(screenContext, viewport, this._mdl.raw.cornerB.errorMsgLong);
      } else if (this._mdl.raw.cornerC.errorMsgLong.length > 0 && drawData.hoverLabel == "C") {
        TernaryChartDrawer.drawErrorBox(screenContext, viewport, this._mdl.raw.cornerC.errorMsgLong);
      }
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

  drawLabels(screenContext: CanvasRenderingContext2D, viewport: CanvasParams, clrLabel: string, drawModel: TernaryDrawModel) {
    // Draw text labels - this defines 2 functions to draw left vs right because we want to draw the one being hovered
    // on top in case the labels ever overlap
    const rawData = this._mdl.raw;
    if (rawData) {
      let drawA = () => {
        if (rawData.cornerA) {
          TernaryChartDrawer.drawAxisLabel(
            screenContext,
            drawModel.labelA,
            rawData.cornerA.label,
            rawData.cornerA.errorMsgShort,
            drawModel.hoverLabel == "A",
            rawData.cornerA.modulesOutOfDate ? Colours.ORANGE.asString() : clrLabel,
            viewport.width,
            this.showSwapButton
          );
        }
      };

      let drawB = () => {
        if (rawData.cornerB) {
          TernaryChartDrawer.drawAxisLabel(
            screenContext,
            drawModel.labelB,
            rawData.cornerB.label,
            rawData.cornerB.errorMsgShort,
            drawModel.hoverLabel == "B",
            rawData.cornerB.modulesOutOfDate ? Colours.ORANGE.asString() : clrLabel,
            viewport.width,
            this.showSwapButton
          );
        }
      };

      // Draw whichever is hovered last
      if (drawModel.hoverLabel == "A") {
        drawB();
        drawA();
      } else {
        drawA();
        drawB();
      }

      if (rawData.cornerC) {
        TernaryChartDrawer.drawAxisLabel(
          screenContext,
          drawModel.labelC,
          rawData.cornerC.label,
          rawData.cornerC.errorMsgShort,
          drawModel.hoverLabel == "C",
          rawData.cornerC.modulesOutOfDate ? Colours.ORANGE.asString() : clrLabel,
          viewport.width,
          this.showSwapButton
        );
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
        drawModel.hoverLabelA.x,
        drawModel.hoverLabelC.y
      );
    }
  }

  public static drawAxisLabel(
    ctx: CanvasRenderingContext2D,
    calculatedRect: Rect,
    cornerLabel: string,
    errorStringShort: string,
    isHovered: boolean,
    labelColour: string,
    maxX: number,
    showSwapButton: boolean = true
  ): void {
    const buttonSize = TernaryChartModel.SWAP_BUTTON_SIZE;

    // debugging
    //ctx.fillStyle = Colours.GRAY_80.asString();
    //ctx.fillRect(calculatedRect.x, calculatedRect.y, calculatedRect.w, calculatedRect.h);

    const fontSize = TernaryChartModel.FONT_SIZE;

    // if there is an error, show the short one
    let label = cornerLabel;
    let errIconSize = 0;

    // If there's an error, we display the error instead of the usual bits
    if (errorStringShort.length > 0) {
      // We're drawing an error icon!
      errIconSize = buttonSize * 0.75;
      label += " Error: " + errorStringShort;
    }

    ctx.font = fontSize + "px Roboto";

    // Measure text
    const labelWidth = ctx.measureText(label).width;

    // Work out if we need to allow it to expand
    const rect = new Rect(calculatedRect.x, calculatedRect.y, calculatedRect.w, calculatedRect.h);

    let requiredWidth = errIconSize + labelWidth + TernaryChartModel.LABEL_PADDING + buttonSize;
    let expand = false;

    // Calculate x positions, this depends on what we're drawing
    // Try to draw centered in the box, if it's too long, draw from left
    let textX = rect.center().x - requiredWidth / 2;
    if (requiredWidth > rect.w) {
      rect.w = requiredWidth;
      expand = true;
      // Can't change font size here, we already calculated stuff above!
      //fontSize = TernaryChartModel.FONT_SIZE-2;
      textX = rect.x + errIconSize;
    }

    // If we're hovered and drawing past right edge of canvas, move so we are up against right edge
    if (isHovered && rect.maxX() > maxX) {
      let offset = rect.maxX() - maxX;
      rect.x -= offset;
      textX -= offset;
    }

    let buttonX = textX + labelWidth + TernaryChartModel.LABEL_PADDING;

    // Calculate y positions
    let textY = rect.y + (buttonSize - fontSize) / 2;
    let buttonY = rect.y + buttonSize / 2;

    // If button is past the rect area, we draw it at the end of the rect
    // BUT if we're drawing a long error string, we allow it
    if (buttonX + buttonSize > rect.maxX()) {
      buttonX = rect.maxX() - buttonSize;
    }

    ctx.fillStyle = labelColour;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Draw a background if user is hovering over it
    if (isHovered) {
      ctx.fillStyle = Colours.GRAY_90.asString();
      const border = 4;
      ctx.fillRect(rect.x - border, rect.y - border, rect.w + border * 2, rect.h + border * 2);
      ctx.fillStyle = labelColour;
    }

    ctx.fillText(label, textX, textY);

    if (errIconSize > 0) {
      // NOTE: need to pass in the center!
      drawErrorIcon(ctx, new Point(textX - errIconSize / 2, buttonY - (buttonSize - errIconSize) / 2), errIconSize);
    }

    // NOTE: need to pass in the center!
    if (showSwapButton) {
      drawSwapButton(ctx, new Point(buttonX + buttonSize / 2, buttonY), buttonSize);
    }
  }
  public static drawErrorBox(ctx: CanvasRenderingContext2D, viewport: CanvasParams, err: string): void {
    ctx.save();

    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const fontSize = CANVAS_FONT_SIZE;
    const borderX = 25;
    const borderY = 50;
    const pad = 10;
    const errIconSize = 16;

    const maxTextWidth = viewport.width - borderX - borderX - pad - pad;

    ctx.fillStyle = Colours.GRAY_90.asString();
    ctx.fillRect(borderX, borderY, viewport.width - borderX - borderX, viewport.height - borderY - borderY);

    let center = viewport.getCenterPoint();
    drawErrorIcon(ctx, new Point(center.x, borderY + pad + errIconSize / 2), errIconSize);

    ctx.font = fontSize + "px Roboto";
    ctx.fillStyle = Colours.GRAY_30.asString();

    wrapText(ctx, err, borderX + pad, borderY + pad + errIconSize + pad, maxTextWidth, fontSize);

    ctx.restore();
  }
}
