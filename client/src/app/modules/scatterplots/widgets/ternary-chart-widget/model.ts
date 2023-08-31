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
import { RGBA } from "src/app/utils/colours";
import { CANVAS_FONT_SIZE_TITLE } from "src/app/utils/drawing";

export class TernaryChartToolHost implements CanvasInteractionHandler {
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return new CanvasInteractionResult(false, false);
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }
}

export class TernaryChartModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom(new MinMax(1), new MinMax(1), new PanRestrictorToCanvas());
  toolhost: CanvasInteractionHandler = new TernaryChartToolHost();

  // Settings of the binary chart
  showMmol: boolean = false;
  selectModeExcludeROI: boolean = false;

  // What is to be drawn
  drawModel = new TernaryDrawModel();

  constructor() {}
}

export class TernaryDrawModel {
  // Triangle points
  //    C
  //
  // A     B
  triangleA = new Point();
  triangleB = new Point();
  triangleC = new Point();

  triangleWidth = 0;
  triangleHeight = 0;

  regenerate(canvasParams: CanvasParams) {
    const OUTER_PADDING = 10;
    const LABEL_PADDING = 4;
    const FONT_SIZE = CANVAS_FONT_SIZE_TITLE-1;
    /*const SWAP_BUTTON_SIZE = 16;*/

    const labelHeight = FONT_SIZE+LABEL_PADDING+OUTER_PADDING;

    // Calculate triangle height (to make it equilateral) - assuming height is not the constraining direction
    this.triangleWidth = canvasParams.width - OUTER_PADDING - OUTER_PADDING;

    // Equilateral triangle height = sqrt(3)*height
    const ratio = Math.sqrt(3) / 2;
    this.triangleHeight = this.triangleWidth * ratio;

    let triangleLeft = OUTER_PADDING;
    let triangleTop = labelHeight + (canvasParams.height - this.triangleHeight - labelHeight * 2) / 2;

    // If this won't fit, go by the height and center it width-wise
    if (this.triangleHeight + labelHeight * 2 > canvasParams.height) {
      //h=w*sqrt(3)/2
      //w=h/(sqrt(3)/2)

      this.triangleHeight = canvasParams.height - labelHeight * 2;
      this.triangleWidth = this.triangleHeight / ratio;
      //console.log('TERNARY: new tri size: '+this.triangleWidth+'x'+this.triangleHeight);
      triangleLeft = (canvasParams.width - this.triangleWidth) / 2;
      triangleTop = labelHeight + (canvasParams.height - this.triangleHeight - labelHeight * 2) / 2;
    }

    this.triangleA = new Point(triangleLeft, triangleTop + this.triangleHeight);
    this.triangleB = new Point(triangleLeft + this.triangleWidth, triangleTop + this.triangleHeight);
    this.triangleC = new Point(canvasParams.width / 2, triangleTop);
  }
}
