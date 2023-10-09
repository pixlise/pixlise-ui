import { CanvasDrawParameters, CanvasDrawer, CanvasParams } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { BaseChartModel } from "./model-interfaces";

export abstract class CachedCanvasChartDrawer implements CanvasDrawer {
  protected _lastCalcCanvasParams: CanvasParams | null = null;

  protected abstract get mdl(): BaseChartModel;

  // Kind of went unused...
  drawWorldSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {}

  // Where we do our actual drawing... This wraps recalc if needed and drawing to cached layer (in offscreen canvas)
  // and allows derived classes to do drawing before and after the cached layer is blit-ed in
  drawScreenSpace(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    this.mdl.recalcDisplayDataIfNeeded(drawParams.drawViewport, screenContext);

    this.drawPreData(screenContext, drawParams);

    // Draw data points
    if (this.mdl.drawModel) {
      const drawMdl = this.mdl.drawModel;
      if (!drawMdl.drawnData && this.mdl.hasRawData()) {
        drawMdl.drawnData = new OffscreenCanvas(drawParams.drawViewport.width, drawParams.drawViewport.height);
        const offscreenContext = drawMdl.drawnData.getContext("2d");
        if (offscreenContext) {
          // Render data to an image which is cached and drawn as needed
          this.drawData(offscreenContext, drawParams);
        }
      }

      if (drawMdl.drawnData) {
        // Draw previously rendered points...
        screenContext.drawImage(drawMdl.drawnData, 0, 0);
      }
    }

    this.drawPostData(screenContext, drawParams);
  }

  abstract drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void;
  abstract drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void;
  abstract drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void;
}
