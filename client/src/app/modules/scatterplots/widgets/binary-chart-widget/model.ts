import { Subject } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import {
  CanvasDrawNotifier,
  CanvasInteractionHandler,
  CanvasInteractionResult,
  CanvasKeyEvent,
  CanvasMouseEvent,
  CanvasWorldTransform,
  CanvasParams,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { PanRestrictorToCanvas, PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { Point } from "src/app/models/Geometry";
import { RGBA, Colours } from "src/app/utils/colours";


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
  roiIds: string[] = [];
  xExpression: string = "";
  yExpression: string = "";

  showMmol: boolean = false;
  selectModeExcludeROI: boolean = false;

  // Groups of points and how we draw them
  pointSets: BinaryPointSet[] = [];

  // What is to be drawn
  drawModel: BinaryDrawModel | null = null;

  constructor() {}
  
  regenerateDrawData(canvasParams: CanvasParams, screenContext: CanvasRenderingContext2D) {
  }
}

export class BinaryPointSet {
  shape: string;
  colour: RGBA = Colours.BLACK;

  // And for selection purposes, what PMCs are at each point
  pmcs: number[] = [];

  // And for annotation purposes, what the original point values are
  rawPoints: Point[] = [];
}

export class BinaryDrawModel {
  pointsByGroup: Point[][] = [];
  totalPointCount: number = 0;
}
