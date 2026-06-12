import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasInteractionHandler, CanvasMouseEvent, CanvasInteractionResult, CanvasKeyEvent, CanvasMouseEventId } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { ContextImage2Model } from "../ctx-image-model";
import { CtxV2ToolBase, ContextImageV2ToolId, IContextImageV2ToolHost } from "./base";
import { Point } from "src/app/models/Geometry";

export class CtxV2Navigate extends CtxV2ToolBase {
  constructor(ctx: ContextImage2Model, host: IContextImageV2ToolHost) {
    super(ContextImageV2ToolId.NAVIGATE, ctx, host, "Pan Tool (Shift)\nClick and drag to move the context image in viewport", "assets/button-icons/tool-pan.svg");
  }

  override activate(): void {
    this._host.setCursor(CursorId.panCursor);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return CtxV2Navigate.panZoomMouseMove(event, this._ctx, this._host);
  }

  public static panZoomMouseMove(event: CanvasMouseEvent, ctx: ContextImage2Model, host: IContextImageV2ToolHost) {
    if (event.eventId == CanvasMouseEventId.MOUSE_DRAG || (event.eventId == CanvasMouseEventId.MOUSE_UP && event.mouseDown != null)) {
      //const drag = new Point(event.point.x - event.mouseLast.x, event.point.y - event.mouseLast.y);
      ctx.panBy(event.point, event.mouseLast);
    }

    return CanvasInteractionResult.neither;
  }
}