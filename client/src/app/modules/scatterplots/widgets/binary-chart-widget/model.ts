import { Subject } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import {
  CanvasDrawNotifier,
  CanvasInteractionHandler,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasMouseEvent,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { PanRestrictorToCanvas, PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { Point } from "src/app/models/Geometry";
import { RGBA } from "src/app/utils/colours";


export class BinaryChartToolHost implements CanvasInteractionHandler {
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return new CanvasInteractionResult(false, false);
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }
}

export class BinaryChartModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom(new MinMax(1), new MinMax(1), new PanRestrictorToCanvas());
  toolhost: CanvasInteractionHandler = new BinaryChartToolHost();

  // Settings of the binary chart
  showMmol: boolean = false;
  selectModeExcludeROI: boolean = false;

  // What is to be drawn
  drawModel: BinaryDrawModel | null = null;

  constructor() {}
}

export class BinaryPointSet {
  points: Point[] = [];
  shape: string;
  colour: RGBA;

  // And for selection purposes, what PMCs are at each point
  pmcs: number[] = [];

  // And for annotation purposes, what the original point values are
  pointValues: Point[] = [];
}

export class BinaryDrawModel {
  pointSets: BinaryPointSet[] = [];
  totalPointCount: number = 0;
}