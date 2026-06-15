import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasMouseEvent, CanvasInteractionResult, CanvasMouseEventId } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { ContextImage2Model } from "../ctx-image-model";
import { CtxV2ToolBase, ContextImageV2ToolId, IContextImageV2ToolHost } from "./base";

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
      // Work out if we clicked on the PIP view, if so we drag based on that
      const pipPos = ctx.getPIPPosition(event.point);
      if (pipPos) {
        ctx.setPanZoom(pipPos, ctx.zoom);
      } else {
        ctx.panBy(event.point, event.mouseLast);
      }
    }

    return CanvasInteractionResult.neither;
  }
}