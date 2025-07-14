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

import { Clipboard } from "@angular/cdk/clipboard";
import { MatDialog } from "@angular/material/dialog";
import { Subject } from "rxjs";
import { Point } from "src/app/models/Geometry";
import {
  CanvasInteractionHandler,
  CanvasDrawer,
  CanvasMouseEvent,
  CanvasInteractionResult,
  CanvasMouseEventId,
  CanvasKeyEvent,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { IconButtonState } from "src/app/modules/pixlisecore/components/atoms/buttons/icon-button/icon-button.component";
import { ISpectrumChartModel } from "../spectrum-model-interface";
import { SpectrumToolId, ISpectrumToolHost, BaseSpectrumTool } from "./base-tool";
import { SpectrumPan } from "./pan";
import { SpectrumZoom } from "./zoom";
import { BaseUIElement } from "../ui-elements/base-ui-element";
import { ChartXRFLines } from "../ui-elements/chart-xrf-lines";
import { MouseCursor } from "../ui-elements/mouse-cursor";
import { XRFBrowser } from "../ui-elements/xrf-browser";
import { ZoomMap } from "../ui-elements/zoom-map";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { RangeSelect } from "./range-select";
import { AnalysisLayoutService, SnackbarService, WidgetDataService } from "../../../../pixlisecore/pixlisecore.module";

// TODO: Mostly copied from context image, can probably unify
export enum ToolState {
  OFF, // A tool that is not active, but can be clicked on/spring key used to activate
  ACTIVE, // The active tool
  SPRUNG, // User is pressing a key to temporarily use a different one, when that ends, this will be active
}

// TODO: Mostly copied from context image, can probably unify
export class ToolButtonState {
  constructor(
    public toolId: SpectrumToolId,
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

// TODO: Mostly copied from context image, can probably unify
export class SpectrumChartToolHost implements CanvasInteractionHandler, ISpectrumToolHost {
  // Tools
  private _tools: BaseSpectrumTool[];
  private _activeTool: BaseSpectrumTool;
  private _springOverriddenTool: BaseSpectrumTool | null = null;

  private _uiElems: BaseUIElement[] = [];

  toolStateChanged$ = new Subject<void>();
  cursor: string = CursorId.defaultPointer;

  constructor(
    private _ctx: ISpectrumChartModel,
    public dialog: MatDialog,
    public clipboard: Clipboard,
    private _snackService: SnackbarService,
    public _widgetDataService: WidgetDataService,
    private _analysisLayoutService: AnalysisLayoutService
  ) {
    this._tools = [
      new SpectrumPan(_ctx, this),
      new SpectrumZoom(_ctx, this),
      new RangeSelect(_ctx, this, dialog, clipboard, this._snackService, this._widgetDataService, _analysisLayoutService),
    ];
    // Shut up compiler
    this._activeTool = this._tools[0];
    this.setTool(SpectrumToolId.PAN);

    // Order matters... this is the draw order!!
    this._uiElems.push(new ChartXRFLines(this._ctx));
    this._uiElems.push(new XRFBrowser(this._ctx));
    this._uiElems.push(new ZoomMap(this._ctx));
    this._uiElems.push(new MouseCursor(this._ctx));
  }

  getDrawers(): CanvasDrawer[] {
    // Draw active tool last
    return [...this._uiElems, this._activeTool];
  }

  // IToolHost
  setCursor(cursor: string): void {
    this.cursor = cursor;
  }

  notifyToolStateChanged(): void {
    this.toolStateChanged$.next();
  }

  get activeTool(): BaseSpectrumTool {
    return this._activeTool;
  }

  reactivateTool(): void {
    this._activeTool.deactivate();
    this._activeTool.activate();
  }

  protected getToolById(id: SpectrumToolId): BaseSpectrumTool | null {
    for (const tool of this._tools) {
      if (tool.id == id) {
        return tool;
      }
    }
    return null;
  }

  setTool(selectedTool: SpectrumToolId): void {
    const tool = this.getToolById(selectedTool);
    if (tool != null) {
      // Set this active
      this._activeTool.deactivate();

      this._activeTool = tool;
      this._activeTool.activate();

      this.toolStateChanged$.next();
    }
  }

  protected springActivate(id: SpectrumToolId | null): void {
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

      btns.push(new ToolButtonState(tool.id, tool.buttonIcon, state, tool.toolTip, tool.id == SpectrumToolId.ZOOM));
    }

    return btns;
  }

  // CanvasInteractionHandler
  mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (!this._ctx.xAxis || !this._ctx.yAxis) {
      return CanvasInteractionResult.neither;
    }

    // We do zooming independently of the tools, any scrolling over the context image is zoom
    if (event.eventId == CanvasMouseEventId.MOUSE_WHEEL) {
      const newScale = new Point(this._ctx.transform.scale.x * (1 - event.deltaY / 100), this._ctx.transform.scale.y * (1 - event.deltaY / 100));

      // If the mouse is over the left margin, we only zoom in Y direction
      if (event.canvasPoint.x < this._ctx.xAxis.startPx) {
        newScale.x = this._ctx.transform.scale.x;
      }
      // Old spectrum chart also only allowed scaling in X if zoomed anywhere... TODO: make a setting for this?
      //if(event.canvasPoint.y > event.canvasParams.height-this._ctx.yAxis.startPx)
      else {
        newScale.y = this._ctx.transform.scale.y;
      }

      // Make this relative to the axes, not the canvas
      // The point we're relative to needs to account for the x scale offset
      const relativeTo = new Point(event.point.x - this._ctx.xAxis.startPx / this._ctx.transform.scale.x, event.point.y);
      this._ctx.transform.setScaleRelativeTo(newScale, relativeTo, false);
      return CanvasInteractionResult.redrawAndCatch;
    }

    let redraw = false;
    for (const uiElem of this._uiElems) {
      const result = uiElem.mouseEvent(event);
      if (result.catchEvent) {
        return CanvasInteractionResult.redrawAndCatch;
      }

      redraw = redraw || result.redraw;
    }

    const toolResult = this._activeTool.mouseEvent(event);
    return new CanvasInteractionResult(redraw || toolResult.redraw, toolResult.catchEvent);
  }

  keyEvent(event: CanvasKeyEvent): CanvasInteractionResult {
    if (!this._ctx.xAxis || !this._ctx.yAxis) {
      return CanvasInteractionResult.neither;
    }

    if (event.key == "z") {
      this.springActivate(event.down == true ? SpectrumToolId.ZOOM : null);
      return CanvasInteractionResult.redrawAndCatch;
    } else if (event.key == "Shift") {
      this.springActivate(event.down == true ? SpectrumToolId.PAN : null);
      return CanvasInteractionResult.redrawAndCatch;
    }

    // If it's none of the above, it may be a hot-key to activate a tool:
    if (event.down == false) {
      if (event.key == "p") {
        this.setTool(SpectrumToolId.PAN);
        return CanvasInteractionResult.redrawAndCatch;
      } else if (event.key == "r") {
        this.setTool(SpectrumToolId.RANGE_SELECT);
        return CanvasInteractionResult.redrawAndCatch;
      }
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

    return this._activeTool.keyEvent(event);
  }
}
