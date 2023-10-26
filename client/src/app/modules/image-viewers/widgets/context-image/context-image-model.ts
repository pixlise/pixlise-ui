import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { ColourScheme, IContextImageModel } from "./context-image-model-interface";
import { Subject } from "rxjs";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseChartModel } from "src/app/modules/scatterplots/base/model-interfaces";
import { ContextImageDrawModel } from "../../models/context-image-draw-model";

export class ContextImageModel implements IContextImageModel, CanvasDrawNotifier, BaseChartModel {
  needsDraw$: Subject<void> = new Subject<void>();
  // The drawable data
  private _drawModel: ContextImageDrawModel = new ContextImageDrawModel();

  private _drawTransform: PanZoom = new PanZoom();

  // Settings/Layers
  private _selectionModeAdd: boolean = true; // Add or Subtract, nothing else!

  private _pointColourScheme: ColourScheme = ColourScheme.PURPLE_CYAN;
  private _pointBBoxColourScheme: ColourScheme = ColourScheme.PURPLE_CYAN;

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  get drawModel(): ContextImageDrawModel {
    return this._drawModel;
  }

  hasRawData(): boolean {
    return true;
  }

  get transform(): PanZoom {
    return this._drawTransform;
  }

  // Rebuilding this models display data
  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): void {
    // Regenerate draw points if required (if canvas viewport changes, or if we haven't generated them yet)
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this.regenerateDrawModel(canvasParams);
      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
  }

  private regenerateDrawModel(viewport: CanvasParams) {}

  // Set functions, these often require some other action, such as redrawing
  get selectionModeAdd(): boolean {
    return this._selectionModeAdd;
  }

  set selectionModeAdd(val: boolean) {
    this._selectionModeAdd = val;
  }

  get pointColourScheme(): ColourScheme {
    return this._pointColourScheme;
  }

  get pointBBoxColourScheme(): ColourScheme {
    return this._pointBBoxColourScheme;
  }
}
