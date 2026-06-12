import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasInteractionHandler, CanvasMouseEvent, CanvasInteractionResult, CanvasKeyEvent } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { ContextImage2Model } from "../ctx-image-model";
import { CtxV2ToolBase, ContextImageV2ToolId, IContextImageV2ToolHost } from "./base";
import { CtxV2Navigate } from "./navigate";

export class CtxV2DrawPolygon extends CtxV2ToolBase {
  constructor(ctx: ContextImage2Model, host: IContextImageV2ToolHost) {
    super(ContextImageV2ToolId.DRAW_POLYGON, ctx, host, "Pan Tool (Shift)\nClick and drag to move the context image in viewport", "assets/button-icons/tool-lasso.svg");
  }

  override activate(): void {
    this._host.setCursor(CursorId.panCursor);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return CtxV2Navigate.panZoomMouseMove(event, this._ctx, this._host);
  }
}