import { CachedCanvasChartDrawer } from "src/app/modules/scatterplots/base/cached-drawer";
import { ContextImageModel } from "./context-image-model";
import { ContextImageToolHost } from "./tools/tool-host";
import { CanvasDrawParameters } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { drawImageOrMaskWithOptionalTransform } from "./drawlib/draw-image";
import { drawRegion } from "./drawlib/draw-region";
import { drawUserLine } from "./drawlib/draw-line-path";
import { drawScanPoints } from "./drawlib/draw-scan-points";
import { RGBA } from "src/app/utils/colours";
import { drawFootprint } from "./drawlib/draw-footprint";

export class ContextImageDrawer extends CachedCanvasChartDrawer {
  protected _dbg: string = "";
  protected _mdl: ContextImageModel;
  protected _toolHost: ContextImageToolHost;

  constructor(ctx: ContextImageModel, toolHost: ContextImageToolHost) {
    super();

    this._mdl = ctx;
    this._toolHost = toolHost;
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // TODO: fix this!! If we draw the guts of it here we no longer respond to mouse pan/zoom!
  }

  drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Set the transform as needed
    screenContext.save();
    drawParams.worldTransform.applyTransform(screenContext);
    //this.screenContext.rotate(degToRad(15));

    this.drawWorldSpace(screenContext, drawParams);

    screenContext.restore();

    this.drawScreenSpace(screenContext, drawParams);
  }

  protected drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {
    const drawMdl = this._mdl.drawModel;

    // Set line width (it depends on zoom factor)
    drawMdl.lineWidthPixels = 2 / this._mdl.transform.scale.x;

    if (drawMdl.image) {
      drawImageOrMaskWithOptionalTransform(screenContext, drawMdl.image, drawMdl.imageTransform);
    }

    for (const [scanId, scanDrawMdl] of drawMdl.perScanDrawModel) {
      if (scanDrawMdl.footprint) {
        drawFootprint(screenContext, scanDrawMdl.footprint, this._mdl.transform);
      }

      drawScanPoints(
        screenContext,
        scanDrawMdl.scanPoints,
        scanDrawMdl.selectedPointIdxs,
        -1,
        true,
        true,
        scanDrawMdl.pixelBeamRadius,
        drawMdl.lineWidthPixels,
        drawMdl.secondaryColour,
        scanDrawMdl.drawPointColours
      );

      for (const region of scanDrawMdl.regions) {
        drawRegion(screenContext, region, drawParams.worldTransform, drawMdl.imageTransform, null, false);
      }
    }

    if (drawMdl.drawnLinePoints.length > 0) {
      drawUserLine(screenContext, drawMdl.drawnLinePoints, this._mdl.transform);
    }

    // If we have any tools to draw on top, do that
    if (this._toolHost) {
      for (const drawer of this._toolHost.getToolDrawers()) {
        screenContext.save();
        drawer.draw(screenContext, drawParams);
        screenContext.restore();
      }
    }
  }

  protected drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {
    if (this._toolHost) {
      for (const drawer of this._toolHost.getUIDrawers()) {
        screenContext.save();
        drawer.draw(screenContext, drawParams);
        screenContext.restore();
      }
    }
  }
}
