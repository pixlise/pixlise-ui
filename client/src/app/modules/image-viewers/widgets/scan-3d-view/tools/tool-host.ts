import { IconButtonState } from "src/app/modules/pixlisecore/components/atoms/buttons/icon-button/icon-button.component";
import { Scan3DToolBase, Scan3DToolId } from "./base";
import { Subject, ReplaySubject } from "rxjs";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { HeightPlaneTool } from "./height-plane";
import { MoveObjectTool } from "./move-object";
import { OrbitTool } from "./orbit";
import { Scan3DViewModel } from "../scan-3d-view-model";

export enum ToolState {
  OFF, // A tool that is not active, but can be clicked on/spring key used to activate
  ACTIVE, // The active tool
  SPRUNG, // User is pressing a key to temporarily use a different one, when that ends, this will be active
}

export class ToolButtonState {
  constructor(
    public toolId: Scan3DToolId,
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


export class Scan3DViewToolHost {
  // Tools
  private _tools: Scan3DToolBase[] = [];
  private _activeTool?: Scan3DToolBase;
  private _springOverriddenTool?: Scan3DToolBase;

  toolStateChanged$ = new Subject<void>();
  activeCursor$ = new ReplaySubject<string>(1);

  constructor(
    private _selService: SelectionService,
    private _mdl: Scan3DViewModel
  ) {
    this.reset();
  }

  getSelectionService(): SelectionService {
    return this._selService;
  }

  // Intended to be called on major events, like new datasets loading
  // this should reset to the starting state
  private reset(): void {
    this._tools = [];
    this._activeTool = undefined;
    this._springOverriddenTool = undefined;

    this._tools.push(new MoveObjectTool(this, this._mdl.));
    this._tools.push(new OrbitTool(this));
    this._tools.push(new HeightPlaneTool(this));

    this.setTool(Scan3DToolId.ORBIT);
  }

  // IToolHost
  setCursor(cursor: string): void {
    this.activeCursor$.next(cursor);
  }

  notifyToolStateChanged(): void {
    this.toolStateChanged$.next();
  }

  get activeTool(): Scan3DToolBase | undefined {
    return this._activeTool;
  }

  reactivateTool(): void {
    if (this._activeTool) {
      this._activeTool.deactivate();
      this._activeTool.activate();
    }
  }

  protected getToolById(id: Scan3DToolId): Scan3DToolBase | null {
    for (const tool of this._tools) {
      if (tool.toolId == id) {
        return tool;
      }
    }
    return null;
  }

  setTool(selectedTool: Scan3DToolId) {
    const tool = this.getToolById(selectedTool);
    if (tool != null) {
      // Set this active
      if (this._activeTool) {
        this._activeTool.deactivate();
      }

      this._activeTool = tool;
      this._activeTool.activate();

      this.toolStateChanged$.next();
    }
  }

  protected springActivate(id: Scan3DToolId | null): void {
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
      this._springOverriddenTool = undefined;
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

  onMouseDown(event: MouseEvent): void {
    if (this._activeTool) {
      this._activeTool.onMouseDown(event);
    }
  }

  onMouseMove(event: MouseEvent): void {
    if (this._activeTool) {
      this._activeTool.onMouseMove(event);
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this._activeTool) {
      this._activeTool.onMouseUp(event);
    }
  }
}
