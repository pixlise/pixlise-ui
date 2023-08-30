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

export class SpectrumChartToolHost implements CanvasInteractionHandler {
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return new CanvasInteractionResult(false, false);
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return new CanvasInteractionResult(false, false);
  }
}

export class SpectrumChartModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom(new MinMax(1), new MinMax(1), new PanRestrictorToCanvas());
  toolhost: CanvasInteractionHandler = new SpectrumChartToolHost();

  constructor() // private _datasetService: DataSetService,
  // public viewStateService: ViewStateService,
  // public snackService: SnackService,
  // public expressionService: DataExpressionService, // only here for RangeSelect to be able to add an expression!
  // public envService: EnvConfigurationService,
  // widgetPosition: string,
  // public dialog: MatDialog,
  // public clipboard: Clipboard
  {}
}
