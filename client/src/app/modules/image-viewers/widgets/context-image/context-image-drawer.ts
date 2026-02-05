import { CachedCanvasChartDrawer } from "src/app/modules/widget/components/interactive-canvas/cached-drawer";
import { ContextImageModel } from "./context-image-model";
import { CanvasDrawParameters, CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { drawImageOrMaskWithOptionalTransform } from "./drawlib/draw-image";
import { drawRegion } from "./drawlib/draw-region";
import { drawUserLine } from "./drawlib/draw-line-path";
import { drawScanPoints } from "./drawlib/draw-scan-points";
import { drawFootprint } from "./drawlib/draw-footprint";
import { drawMapData } from "./drawlib/draw-map";

export interface ExtraDrawerSource {
  getToolDrawers(): CanvasDrawer[];
  getUIDrawers(): CanvasDrawer[];
}

export class ContextImageDrawer extends CachedCanvasChartDrawer {
  protected _dbg: string = "";
  protected _mdl: ContextImageModel;
  protected _extraDrawers: ExtraDrawerSource;

  constructor(ctx: ContextImageModel, extraDrawers: ExtraDrawerSource) {
    super();

    this._mdl = ctx;
    this._extraDrawers = extraDrawers;
  }

  protected get mdl(): BaseChartModel {
    return this._mdl;
  }

  drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    screenContext.imageSmoothingEnabled = this._mdl.drawModel.imageSmoothing;

    // Set the transform as needed
    screenContext.save();
    drawParams.worldTransform.applyTransform(screenContext);

    const drawMdl = this._mdl.drawModel;
    if (drawMdl.image && this._mdl.drawImage) {
      drawImageOrMaskWithOptionalTransform(screenContext, drawMdl.image, drawMdl.imageTransform);
    }

    screenContext.restore();
  }

  drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Set the transform as needed
    screenContext.save();
    drawParams.worldTransform.applyTransform(screenContext);

    const drawMdl = this._mdl.drawModel;

    // Set line width (it depends on zoom factor)
    drawMdl.lineWidthPixels = 2 / this._mdl.transform.scale.x;

    for (const [scanId, scanDrawMdl] of drawMdl.scanDrawModels) {
      if (scanDrawMdl.footprint && !this._mdl.hideFootprintsForScans.has(scanId)) {
        drawFootprint(screenContext, scanDrawMdl.footprint, this._mdl.transform);
      }

      if (!this._mdl.hideMapsForScans.has(scanId)) {
        for (let c = scanDrawMdl.maps.length - 1; c >= 0; c--) {
          const mapLayer = scanDrawMdl.maps[c];
          drawMapData(screenContext, drawParams.worldTransform, mapLayer, scanDrawMdl.scanPoints, scanDrawMdl.scanPointPolygons, scanDrawMdl.scanPointDisplayRadius, 1);
        }
      }

      for (const region of scanDrawMdl.regions) {
        drawRegion(screenContext, drawParams.worldTransform, region, drawMdl.imageTransform, null, false);
      }

      if (!this._mdl.hidePointsForScans.has(scanId)) {
        drawScanPoints(
          screenContext,
          drawParams.worldTransform,
          scanDrawMdl.scanPoints,
          scanDrawMdl.selectedPointPMCs,
          scanDrawMdl.selectedPointIndexes,
          scanDrawMdl.hoverEntryIdx,
          true,
          true,
          scanDrawMdl.beamRadius_pixels,
          drawMdl.lineWidthPixels,
          drawMdl.secondaryColour,
          scanDrawMdl.drawPointColourOverrides
        );
      }
    }

    screenContext.restore();
  }

  drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    const drawMdl = this._mdl.drawModel;

    // Set the transform as needed
    screenContext.save();
    drawParams.worldTransform.applyTransform(screenContext);

    if (drawMdl.drawnLinePoints.length > 0) {
      drawUserLine(screenContext, drawMdl.drawnLinePoints, this._mdl.transform);
    }

    // If we have any tools to draw on top, do that
    for (const drawer of this._extraDrawers.getToolDrawers()) {
      screenContext.save();
      drawer.draw(screenContext, drawParams);
      screenContext.restore();
    }

    screenContext.restore();

    for (const drawer of this._extraDrawers.getUIDrawers()) {
      screenContext.save();
      drawer.draw(screenContext, drawParams);
      screenContext.restore();
    }
  }
}
