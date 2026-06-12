import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasInteractionHandler, CanvasMouseEvent, CanvasInteractionResult, CanvasKeyEvent } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { ContextImage2Model } from "../ctx-image-model";
import { ContextImageV2DataService } from "src/app/modules/pixlisecore/services/context-image-v2-data.service";

export enum ContextImageV2ToolId {
    NAVIGATE,
    DRAW_POLYGON,
    EDIT_POLYGON,
    DRAW_POINTS,
    ROTATE,
}


export interface IContextImageV2ToolHost {
  //getSelectionService(): SelectionService;
  //springActivate(id: ContextImageToolId): void;
  setCursor(cursor: CursorId): void;
  notifyToolStateChanged(): void;
  getContextImageV2DataService(): ContextImageV2DataService
}

export class CtxV2ToolBase implements CanvasInteractionHandler {
  constructor(
    protected _id: ContextImageV2ToolId,
    protected _ctx: ContextImage2Model,
    protected _host: IContextImageV2ToolHost,
    public toolTip: string,
    public buttonIcon: string
  ) {}

  activate(): void {}

  deactivate(): void {}

  get id(): ContextImageV2ToolId {
    return this._id;
  }

  // CanvasInteractionHandler
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    return CanvasInteractionResult.neither;
  }
}