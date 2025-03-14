import { CanvasDrawParameters, CanvasDrawer, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseChartModel } from "../../../scatterplots/base/model-interfaces";
import { map, Observable } from "rxjs";

export abstract class CachedCanvasChartDrawer implements CanvasDrawer {
  protected _lastCalcCanvasParams: CanvasParams | null = null;

  protected abstract get mdl(): BaseChartModel;

  // Where we do our actual drawing... This wraps recalc if needed and drawing to cached layer (in offscreen canvas)
  // and allows derived classes to do drawing before and after the cached layer is blit-ed in
  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): Observable<void> {
    return this.mdl.recalcDisplayDataIfNeeded(drawParams.drawViewport, screenContext).pipe(
      map(() => {
        this.drawPreData(screenContext, drawParams);

        // Draw data points
        if (this.mdl.drawModel) {
          const drawMdl = this.mdl.drawModel;
          if (!drawMdl.drawnData && this.mdl.hasRawData()) {
            drawMdl.drawnData = new OffscreenCanvas(
              drawParams.drawViewport.width * drawParams.drawViewport.dpi,
              drawParams.drawViewport.height * drawParams.drawViewport.dpi
            );

            const offscreenContext = drawMdl.drawnData.getContext("2d");
            if (offscreenContext) {
              offscreenContext.scale(drawParams.drawViewport.dpi, drawParams.drawViewport.dpi);
              // Render data to an image which is cached and drawn as needed
              this.drawData(offscreenContext, drawParams);
            }
          }

          if (drawMdl.drawnData) {
            // Draw previously rendered points...
            screenContext.drawImage(
              drawMdl.drawnData,
              0,
              0,
              drawMdl.drawnData.width,
              drawMdl.drawnData.height,
              0,
              0,
              drawParams.drawViewport.width,
              drawParams.drawViewport.height
            );
          }
        }

        this.drawPostData(screenContext, drawParams);
      })
    );
  }

  abstract drawPreData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void;
  abstract drawData(screenContext: OffscreenCanvasRenderingContext2D, drawParams: CanvasDrawParameters): void;
  abstract drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void;
}
