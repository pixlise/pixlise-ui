import { Subject, ReplaySubject } from "rxjs";
import { Point } from "src/app/models/Geometry";

import { ContextImageV2ToolId, CtxV2ToolBase, IContextImageV2ToolHost } from "./base";
import { CtxV2DrawPoints } from "./draw-points";
import { CtxV2DrawPolygon } from "./draw-polygon";
import { CtxV2EditPolygon } from "./edit-polygon";
import { CtxV2Navigate } from "./navigate";
import { CtxV2Rotate } from "./rotate";
import { IconButtonState } from "src/app/modules/pixlisecore/components/atoms/buttons/icon-button/icon-button.component";
import { CanvasInteractionHandler, CanvasMouseEvent, CanvasInteractionResult, CanvasMouseEventId, CanvasKeyEvent } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { ContextImage2Model, WheelMode } from "../ctx-image-model";
import { ContextImageV2DataService } from "src/app/modules/pixlisecore/services/context-image-v2-data.service";

export enum ToolState {
  OFF, // A tool that is not active, but can be clicked on/spring key used to activate
  ACTIVE, // The active tool
  SPRUNG, // User is pressing a key to temporarily use a different one, when that ends, this will be active
}

export class ToolButtonState {
  constructor(
    public toolId: ContextImageV2ToolId,
    public icon: string,
    public state: ToolState,
    public toolTip: string,
    public buttonHasGap: boolean
  ) {}

  getIconButtonState(): IconButtonState {
    if (this.state == ToolState.ACTIVE) {
      return IconButtonState.ACTIVE;
    } else if (this.state == ToolState.SPRUNG) {
      return IconButtonState.DIM;
    }

    return IconButtonState.OFF;
  }
}

export class ContextImageV2ToolHost implements CanvasInteractionHandler, IContextImageV2ToolHost {
  // Tools
  private _tools: CtxV2ToolBase[] = [];
  private _activeTool: CtxV2ToolBase | null = null;
  private _springOverriddenTool: CtxV2ToolBase | null = null;

  private _toolsAfterLineSeparator: ContextImageV2ToolId[] = [];

  toolStateChanged$ = new Subject<void>();
  activeCursor$ = new ReplaySubject<string>(1);
  private _linkToDataset: boolean = true;

  constructor(
    private _ctx: ContextImage2Model,
    private _switchImage$: Subject<number>,
    private _saveState$: Subject<void>,
    private _contextImageV2DataService: ContextImageV2DataService
  ) {
    this.reset();
  }

  // Intended to be called on major events, like new datasets loading
  // this should reset to the starting state
  private reset(): void {
    this._tools = [];
    this._activeTool = null;
    this._springOverriddenTool = null;

    this._tools.push(new CtxV2DrawPoints(this._ctx, this));
    this._tools.push(new CtxV2DrawPolygon(this._ctx, this));
    this._tools.push(new CtxV2EditPolygon(this._ctx, this));
    this._tools.push(new CtxV2Navigate(this._ctx, this));
    this._tools.push(new CtxV2Rotate(this._ctx, this));

    this.setTool(ContextImageV2ToolId.NAVIGATE);
  }

  // IContextImageV2ToolHost
  setCursor(cursor: string): void {
    this.activeCursor$.next(cursor);
  }

  getContextImageV2DataService(): ContextImageV2DataService {
    return this._contextImageV2DataService;
  }

  notifyToolStateChanged(): void {
    this.toolStateChanged$.next();
  }

  toggleLinkToDataset() {
    this._linkToDataset = !this._linkToDataset;
  }

  get linkToDataset(): boolean {
    return this._linkToDataset;
  }

  get activeTool(): CtxV2ToolBase | null {
    return this._activeTool;
  }

  reactivateTool(): void {
    if (this._activeTool) {
      this._activeTool.deactivate();
      this._activeTool.activate();
    }
  }

  protected getToolById(id: ContextImageV2ToolId): CtxV2ToolBase | null {
    for (const tool of this._tools) {
      if (tool.id == id) {
        return tool;
      }
    }
    return null;
  }

  setTool(selectedTool: ContextImageV2ToolId) {
    const tool = this.getToolById(selectedTool);
    if (tool != null) {
      // Set this active
      if (this._activeTool) {
        this._activeTool.deactivate();
      }

      this._activeTool = tool;
      this._activeTool.activate();

      //console.log('Selected context image tool: '+ContextImageV2ToolId[this._activeTool.getID()]);
      this.toolStateChanged$.next();
    }
  }

  protected springActivate(id: ContextImageV2ToolId | null): void {
    if (!this._activeTool) {
      console.warn("No active tools");
      return;
    }

    // If already applied, do nothing
    if (this._activeTool.id == id) {
      return;
    }

    // Temporarily setting another tool as active. If id is null, we're undoing it
    if (id == null) {
      // Put the previously active tool back
      if (!this._springOverriddenTool) {
        console.warn("No spring-active tool when deactivating");
        return;
      }

      this._activeTool.deactivate();
      this._activeTool = this._springOverriddenTool;
      this._springOverriddenTool = null;
      this._activeTool.activate();
    } else {
      const specifiedTool = this.getToolById(id);
      if (!specifiedTool) {
        console.warn("Invalid tool id");
        return;
      }

      this._activeTool.deactivate();
      this._springOverriddenTool = this._activeTool;
      this._activeTool = specifiedTool;
      this._activeTool.activate();
    }

    this.toolStateChanged$.next();
  }

  // Tool UI
  getToolButtons(): ToolButtonState[] {
    const btns: ToolButtonState[] = [];

    for (const tool of this._tools) {
      let state = ToolState.OFF;
      if (this._activeTool == tool) {
        state = ToolState.ACTIVE;
      } else if (this._springOverriddenTool == tool) {
        state = ToolState.SPRUNG;
      }

      btns.push(new ToolButtonState(tool.id, tool.buttonIcon, state, tool.toolTip, this._toolsAfterLineSeparator.indexOf(tool.id) >= 0));
    }

    return btns;
  }

  // CanvasInteractionHandler
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    // Firstly, send out notifications as needed
    if (event.eventId == CanvasMouseEventId.MOUSE_ENTER || event.eventId == CanvasMouseEventId.MOUSE_LEAVE) {
      this._ctx.setMousePresent(event.eventId == CanvasMouseEventId.MOUSE_ENTER);
    }

    if (event.eventId == CanvasMouseEventId.MOUSE_MOVE || event.eventId == CanvasMouseEventId.MOUSE_DRAG) {
      this._contextImageV2DataService.syncCursorForId(this._ctx.imageScanId, event.point);
    }

    if (this._linkToDataset &&
      (event.eventId == CanvasMouseEventId.MOUSE_MOVE ||
      event.eventId == CanvasMouseEventId.MOUSE_DRAG ||
      event.eventId == CanvasMouseEventId.MOUSE_WHEEL && this._ctx.wheelMode == WheelMode.ZOOM)) {
      this._contextImageV2DataService.syncTransformForId(this._ctx.imageScanId, {
        pan: new Point(this._ctx.pan.x, this._ctx.pan.y),
        scale: new Point(this._ctx.zoom, this._ctx.zoom),
        canvasDimensions: { width: this._ctx.getViewportSize().x, height: this._ctx.getViewportSize().y },
      });
    }

    // We do zooming independently of the tools, any scrolling over the context image is zoom
    if (event.eventId == CanvasMouseEventId.MOUSE_WHEEL) {
      let mode = this._ctx.wheelMode;
      
      // if the user is using any modifier keys, we switch to those modes
      if (event.shiftKey) {
        mode = WheelMode.SWAP_IMAGE;
      }

      switch(mode) {
        case WheelMode.SWAP_IMAGE:
          this._switchImage$.next(event.deltaY > 0 ? 1 : -1);
          break;
        //case WheelMode.Z_STACK:
        case WheelMode.BRIGHTNESS:
          this._ctx.stepBrightness(event.deltaY > 0);
          break;
        case WheelMode.ZOOM:
          const zoomPctChange = 0.05;
          if (event.deltaY != 0) {
            let zoomPct = zoomPctChange + 1;
            if (event.deltaY > 0) {
              zoomPct = 1 - zoomPctChange;
            }

            this._ctx.setZoom(this._ctx.zoom * zoomPct, event.point);
          }
          break;
      }

      this._saveState$.next();
      return CanvasInteractionResult.redrawAndCatch;
    }

    //console.log(this._activeTool);
    if (this._activeTool) {
      return this._activeTool.mouseEvent(event);
    }
    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    // If it's a spring-activation key, activate the relevant tool
    if (event.key == "Shift") {
      this.springActivate(event.down == true ? ContextImageV2ToolId.NAVIGATE : null);
      return CanvasInteractionResult.redrawAndCatch;
    }

    // If it's none of the above, it may be a hot-key to activate a tool:
    if (event.down == false) {
      if (event.key == "r") {
        this.setTool(ContextImageV2ToolId.DRAW_POLYGON);
        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.key == "p") {
        // b for brush select
        this.setTool(ContextImageV2ToolId.DRAW_POINTS);
        return CanvasInteractionResult.redrawAndCatch;
      }
      else if(event.key == 'r')
      {
          this.setTool(ContextImageV2ToolId.ROTATE);
          return CanvasInteractionResult.redrawAndCatch;
      }
    }

    if (this._activeTool) {
      return this._activeTool.keyEvent(event);
    }

    return CanvasInteractionResult.neither;
  }
}
