// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { ReplaySubject, Subject } from "rxjs";
import { Point } from "src/app/models/Geometry";
import { BaseContextImageTool, ContextImageToolId, IToolHost } from "./base-context-image-tool";
import {
  CanvasInteractionHandler,
  CanvasDrawer,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasKeyEvent,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IconButtonState } from "src/app/modules/pixlisecore/components/atoms/buttons/icon-button/icon-button.component";
import { IContextImageModel } from "../context-image-model-interface";
import { LineDrawing } from "./line-drawing";
import { ContextImagePan } from "./pan";
import { ContextImageZoom } from "./zoom";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { LassoSelection } from "./lasso-selection";
import { ColourSelection } from "./colour-selection";
import { LineSelection } from "./line-selection";
import { PointSelection } from "./point-selection";
import { HoverPointCursor } from "../ui-elements/hover-point-cursor";
import { BaseUIElement } from "../ui-elements/base-ui-element";
import { PhysicalScale } from "../ui-elements/physical-scale";
import { MapColourScale } from "../ui-elements/map-colour-scale/map-colour-scale";

export enum ToolState {
  OFF, // A tool that is not active, but can be clicked on/spring key used to activate
  ACTIVE, // The active tool
  SPRUNG, // User is pressing a key to temporarily use a different one, when that ends, this will be active
}

export class ToolButtonState {
  constructor(
    public toolId: ContextImageToolId,
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

export class ToolHostCreateSettings {
  constructor(
    public showLineDrawTool: boolean,
    public showNavTools: boolean,
    public showPMCTool: boolean,
    public showSelectionTools: boolean,
    public showPhysicalScale: boolean,
    public showMapColourScale: boolean
  ) {}
}

export class ContextImageToolHost implements CanvasInteractionHandler, IToolHost {
  // Tools
  private _tools: BaseContextImageTool[] = [];
  private _activeTool: BaseContextImageTool | null = null;
  private _springOverriddenTool: BaseContextImageTool | null = null;

  private _uiElems: BaseUIElement[] = [];

  // These are contained in _uiElems, we just keep a separate reference here because we specifically
  // need these for drawing exports
  private _uiMapColourScale: MapColourScale = null;
  private _uiPhysicalScale: PhysicalScale | null = null;

  private _toolsAfterLineSeparator: ContextImageToolId[] = [];

  toolStateChanged$ = new Subject<void>();
  activeCursor$ = new ReplaySubject<string>(1);

  constructor(
    private _settings: ToolHostCreateSettings,
    private _ctx: IContextImageModel,
    private _selService: SelectionService
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
    this._uiElems = [];
    this._uiMapColourScale = null;
    this._uiPhysicalScale = null;
    this._activeTool = null;
    this._springOverriddenTool = null;

    if (this._settings.showLineDrawTool) {
      this._tools.push(new LineDrawing(this._ctx, this));
    }

    if (this._settings.showNavTools) {
      //this._tools.push(new ContextImageRotate(this._ctx, this));
      this._tools.push(new ContextImageZoom(this._ctx, this));
      this._tools.push(new ContextImagePan(this._ctx, this));
    }

    if (this._settings.showPMCTool) {
      //new PMCInspector(this)
    }

    if (this._settings.showSelectionTools) {
      this._tools.push(new PointSelection(this._ctx, this));
      this._tools.push(new LassoSelection(this._ctx, this));
      this._tools.push(new ColourSelection(this._ctx, this));
      this._tools.push(new LineSelection(this._ctx, this));
    }
    /*
    // Tools that have line separators before them, we set this up here...
    this._toolsAfterLineSeparator = [ContextImageToolId.ZOOM, ContextImageToolId.SELECT_POINT];
*/
    if (this._settings.showPhysicalScale) {
      this._uiPhysicalScale = new PhysicalScale(this._ctx, this);
      this._uiElems.push(this._uiPhysicalScale);
    }

    if (this._settings.showMapColourScale) {
      this._uiMapColourScale = new MapColourScale(this._ctx, this, "");
      this._uiElems.push(this._uiMapColourScale);
      //this._uiElems.push(new ROIToolTip(this._ctx));
    }

    this._uiElems.push(new HoverPointCursor(this._ctx, this));

    this.setTool(ContextImageToolId.PAN);
  }

  getToolDrawers(): CanvasDrawer[] {
    const drawers: CanvasDrawer[] = [];
    if (this._activeTool) {
      drawers.push(this._activeTool);
    }
    return drawers;
  }

  getUIDrawers(): CanvasDrawer[] {
    return this._uiElems;
  }

  /*
  getMapColourScaleDrawer(): CanvasDrawer {
    return this._uiMapColourScale;
  }

  getPhysicalScaleDrawer(): CanvasDrawer {
    return this._uiPhysicalScale;
  }
*/
  // IToolHost
  setCursor(cursor: string): void {
    this.activeCursor$.next(cursor);
  }

  notifyToolStateChanged(): void {
    this.toolStateChanged$.next();
  }

  get activeTool(): BaseContextImageTool | null {
    return this._activeTool;
  }

  reactivateTool(): void {
    if (this._activeTool) {
      this._activeTool.deactivate();
      this._activeTool.activate();
    }
  }

  protected getToolById(id: ContextImageToolId): BaseContextImageTool | null {
    for (const tool of this._tools) {
      if (tool.id == id) {
        return tool;
      }
    }
    return null;
  }

  setTool(selectedTool: ContextImageToolId) {
    const tool = this.getToolById(selectedTool);
    if (tool != null) {
      // Set this active
      if (this._activeTool) {
        this._activeTool.deactivate();
      }

      this._activeTool = tool;
      this._activeTool.activate();

      //console.log('Selected context image tool: '+ContextImageToolId[this._activeTool.getID()]);
      this.toolStateChanged$.next();
    }
  }

  protected springActivate(id: ContextImageToolId | null): void {
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
    // We do zooming independently of the tools, any scrolling over the context image is zoom
    if (event.eventId == CanvasMouseEventId.MOUSE_WHEEL) {
      const newScale = this._ctx.transform.scale.x * (1 - event.deltaY / 100);
      this._ctx.transform.setScaleRelativeTo(new Point(newScale, newScale), event.point, false);
      return CanvasInteractionResult.redrawAndCatch;
    }

    // See if any of the UI elements wants to handle it
    for (const uiElem of this._uiElems) {
      //console.log(uiElem);
      const result = uiElem.mouseEvent(event);
      //console.log(result);
      if (result.catchEvent) {
        //console.log('STOP');
        // UI elem swallowed it up, redraw the view to accommodate whatever it did
        return CanvasInteractionResult.redrawAndCatch;
      }
    }

    //console.log(this._activeTool);
    if (this._activeTool) {
      return this._activeTool.mouseEvent(event);
    }
    return CanvasInteractionResult.neither;
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    // If it's a spring-activation key, activate the relevant tool
    if (event.key == "z") {
      this.springActivate(event.down == true ? ContextImageToolId.ZOOM : null);
      return CanvasInteractionResult.redrawAndCatch;
    } else if (event.key == "Shift") {
      this.springActivate(event.down == true ? ContextImageToolId.PAN : null);
      return CanvasInteractionResult.redrawAndCatch;
    }

    // If it's none of the above, it may be a hot-key to activate a tool:
    if (event.down == false) {
      if (event.key == "t") {
        this.setTool(ContextImageToolId.DRAW_LINE);
        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.key == "b") {
        // b for brush select
        this.setTool(ContextImageToolId.SELECT_POINT);
        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.key == "o") {
        this.setTool(ContextImageToolId.SELECT_LASSO);
        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.key == "l") {
        this.setTool(ContextImageToolId.SELECT_LINE);
        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.key == "c") {
        this.setTool(ContextImageToolId.SELECT_COLOUR);
        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.key == "p") {
        this.setTool(ContextImageToolId.PAN);
        return CanvasInteractionResult.redrawAndCatch;
      }
      /*
            else if(event.key == 'r')
            {
                this.setTool(ContextImageToolId.ROTATE);
                return CanvasInteractionResult.redrawAndCatch;
            }
*/
    }

    // See if any of the UI elements wants to handle it
    for (const uiElem of this._uiElems) {
      // Check if the UI element is hijacking...
      const result = uiElem.keyEvent(event);
      if (result.catchEvent) {
        // UI elem swallowed it up, redraw the view to accommodate whatever it did
        return result;
      }
    }

    if (this._activeTool) {
      return this._activeTool.keyEvent(event);
    }

    return CanvasInteractionResult.neither;
  }
}
