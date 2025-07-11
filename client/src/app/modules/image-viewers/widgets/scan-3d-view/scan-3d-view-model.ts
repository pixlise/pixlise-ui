import { Subject, ReplaySubject, Observable } from "rxjs";
import { BaseChartDrawModel, BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";

export class Scan3DViewModel implements CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();
  drawModel: BaseChartDrawModel = new Scan3DViewDrawModel();

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams, screenContext?: CanvasRenderingContext2D): Observable<void> {
    throw new Error("Method not implemented.");
  }

  hasRawData(): boolean {
    throw new Error("Method not implemented.");
  }

  needsCanvasResize$?: Subject<void> | undefined;
  resolution$?: ReplaySubject<number> | undefined;
  borderWidth$?: ReplaySubject<number> | undefined;
}

export class Scan3DViewDrawModel implements BaseChartDrawModel {
  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;
}
