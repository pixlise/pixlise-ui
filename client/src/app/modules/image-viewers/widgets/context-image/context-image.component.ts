import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { CanvasDrawer } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { ContextImageModel } from "./context-image-model";
import { ContextImageToolHost, ToolHostCreateSettings } from "./tools/tool-host";
import { ContextImageDrawer } from "./context-image-drawer";

@Component({
  selector: "app-context-image",
  templateUrl: "./context-image.component.html",
  styleUrls: ["./context-image.component.scss"],
})
export class ContextImageComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  activeTool: string = "pan";

  mdl: ContextImageModel;
  drawer: CanvasDrawer;
  toolhost: ContextImageToolHost;

  cursorShown: string = "";

  private _subs = new Subscription();

  constructor(public dialog: MatDialog) {
    super();

    this.mdl = new ContextImageModel();

    let showLineDrawTool = true;
    let showNavTools = true;
    let showPMCTool = false;
    let showSelectionTools = true;
    let showPhysicalScale = true;
    let showMapColourScale = true;

    const toolSettings = new ToolHostCreateSettings(showLineDrawTool, showNavTools, showPMCTool, showSelectionTools, showPhysicalScale, showMapColourScale);
    this.toolhost = new ContextImageToolHost(toolSettings, this.mdl);
    this.drawer = new ContextImageDrawer(this.mdl, this.toolhost);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export",
          value: false,
          onClick: (value, trigger) => this.onExport(trigger),
        },
        {
          id: "crop",
          type: "button",
          title: "Crop",
          disabled: true,
          tooltip: "Not implemented yet. Click here to remove unselected pixels",
          value: false,
          onClick: (value, trigger) => this.onCrop(trigger),
        },
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          onClick: () => this.onSoloView(),
        },
        {
          id: "show-points",
          type: "button",
          title: "Show Points",
          tooltip: "Toggle drawing of experiment location points",
          value: false,
          onClick: () => this.onToggleShowPoints(),
        },
        {
          id: "zoom-in",
          type: "button",
          icon: "assets/button-icons/zoom-in.svg",
          tooltip: "Zoom In",
          onClick: () => this.onZoomIn(),
        },
        {
          id: "zoom-out",
          type: "button",
          icon: "assets/button-icons/zoom-out.svg",
          tooltip: "Zoom Out",
          onClick: () => this.onZoomOut(),
        },
        {
          id: "zoom-all",
          type: "button",
          icon: "assets/button-icons/zoom-all.svg",
          tooltip: "Show Whole Image",
          onClick: () => this.onResetViewToWholeImage(),
        },
        {
          id: "zoom-experiment",
          type: "button",
          icon: "assets/button-icons/zoom-experiment.svg",
          tooltip: "Show Experiment Area",
          onClick: () => this.onResetViewToExperiment(),
        },
      ],
      bottomToolbar: [
        {
          id: "layers",
          type: "button",
          title: "Layers",
          tooltip: "Manage layers of data drawn",
          value: false,
          onClick: (value, trigger) => this.onToggleLayersView(trigger),
        },
        {
          id: "image",
          type: "button",
          title: "Image",
          tooltip: "Manage images drawn",
          value: false,
          onClick: (value, trigger) => this.onToggleImageOptionsView(trigger),
        },
      ],
    };
    /*
    for 
    {
      id: "pan",
      type: "selectable-button",
      icon: "assets/button-icons/tool-pan.svg",
      tooltip: "Pan Tool (Shift)\nClick and drag to move the context image in the viewport",
      value: false,
      onClick: () => this.onToolSelected("pan"),
    },
  ],*/

    this._widgetControlConfiguration.bottomToolbar?.push({
      id: "selection-mode",
      type: "button",
      title: "Additive",
      tooltip: "Toggles selection mode between additive and subtractive",
      value: false,
      onClick: () => this.onToggleSelectionMode(),
    });
  }

  ngOnInit() {
    this._subs.add(
      this.toolhost.activeCursor$.subscribe((cursor: string) => {
        // Something changed, refresh our tools
        this.cursorShown = cursor;
      })
    );

    this.onToolSelected("pan");
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  reDraw() {
    this.mdl.needsDraw$.next();
  }

  get transform() {
    return this.mdl.transform;
  }

  get interactionHandler() {
    return this.toolhost;
  }

  onToolSelected(tool: string) {
    this.activeTool = tool;

    if (this._widgetControlConfiguration.topToolbar) {
      let setCount = 0;
      for (const button of this._widgetControlConfiguration.topToolbar) {
        if (button.id === "pan" || button.id === "zoom") {
          button.value = button.id === tool;
          setCount++;

          if (setCount > 1) {
            break;
          }
        }
      }
    }

    //this.toolhost.setTool(tool == "pan" ? SpectrumToolId.PAN : SpectrumToolId.ZOOM);
  }

  onExport(trigger: Element | undefined) {}
  onCrop(trigger: Element | undefined) {}
  onSoloView() {}
  onToggleShowPoints() {}
  onZoomIn() {}
  onZoomOut() {}
  onResetViewToWholeImage() {}
  onResetViewToExperiment() {}
  onToggleLayersView(trigger: Element | undefined) {}
  onToggleImageOptionsView(trigger: Element | undefined) {}

  onToggleSelectionMode() {
    this.mdl.selectionModeAdd = !this.mdl.selectionModeAdd;

    // Reactivate whatever tool we have showing, so it is now in the right mode
    this.toolhost.reactivateTool();
  }
}
