import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { ContextImageModel } from "./context-image-model";
import { ContextImageToolHost, ToolButtonState, ToolHostCreateSettings, ToolState } from "./tools/tool-host";
import { ContextImageDrawer } from "./context-image-drawer";
import { ContextImageState } from "src/app/generated-protos/widget-data";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ImageGetDefaultReq, ImageGetDefaultResp } from "src/app/generated-protos/image-msgs";
import { ContextImageToolId } from "./tools/base-context-image-tool";
import { ContextImageDrawModelService } from "../../services/context-image-draw-model.service";
import { ContextImageDrawModel } from "../../models/context-image-draw-model";
import { Point, Rect } from "src/app/models/Geometry";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";

@Component({
  selector: "app-context-image",
  templateUrl: "./context-image.component.html",
  styleUrls: ["./context-image.component.scss"],
})
export class ContextImageComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl: ContextImageModel;
  drawer: CanvasDrawer;
  toolhost: ContextImageToolHost;

  cursorShown: string = "";

  private _subs = new Subscription();

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _cachedDataService: APICachedDataService,
    private _contextDataService: ContextImageDrawModelService,
    private _selectionService: SelectionService,
    public dialog: MatDialog
  ) {
    super();

    this.mdl = new ContextImageModel();

    let showLineDrawTool = true;
    let showNavTools = true;
    let showPMCTool = false;
    let showSelectionTools = true;
    let showPhysicalScale = true;
    let showMapColourScale = true;

    const toolSettings = new ToolHostCreateSettings(showLineDrawTool, showNavTools, showPMCTool, showSelectionTools, showPhysicalScale, showMapColourScale);
    this.toolhost = new ContextImageToolHost(toolSettings, this.mdl, this._selectionService);
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

    for (const tool of this.toolhost.getToolButtons()) {
      this._widgetControlConfiguration.bottomToolbar?.push({
        id: "tool-" + tool.toolId.toString(),
        type: "selectable-button",
        icon: tool.icon,
        value: tool.state != ToolState.OFF,
        onClick: () => this.onToolSelected(tool.toolId),
      });
    }

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
    this.onToolSelected(ContextImageToolId.PAN);

    this._subs.add(
      this._selectionService.selection$.subscribe((currSel: SelectionHistoryItem) => {
        this.updateView();
      })
    );

    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        if (this.mdl.scanIds.indexOf(this._selectionService.hoverScanId) > -1) {
          this.updateView();
        }
      })
    );

    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const contextData = data as ContextImageState;
        if (contextData) {
          // Set up model
          this.mdl.transform.pan.x = contextData.panX;
          this.mdl.transform.pan.y = contextData.panY;
          this.mdl.transform.scale.x = contextData.zoomX;
          this.mdl.transform.scale.y = contextData.zoomY;

          if (this.mdl.transform.scale.x <= 0) {
            this.mdl.transform.scale.x = 1;
          }

          if (this.mdl.transform.scale.y <= 0) {
            this.mdl.transform.scale.y = 1;
          }

          this.mdl.imageName = contextData.contextImage;
          this.mdl.smoothing = contextData.contextImageSmoothing.length > 0;

          /*
bool showPoints = 5;
bool showPointBBox = 6;
string pointColourScheme = 7;
string pointBBoxColourScheme = 8;
string contextImage = 9;
string contextImageSmoothing = 10;
repeated MapLayerVisibility mapLayers = 11;
repeated ROILayerVisibility roiLayers = 12;
bool elementRelativeShading = 13;
float brightness = 14;
string rgbuChannels = 15;
float unselectedOpacity = 16;
bool unselectedGrayscale = 17;
float colourRatioMin = 18;
float colourRatioMax = 19;
bool removeTopSpecularArtifacts = 20;
bool removeBottomSpecularArtifacts = 21;
*/
          this.updateView();
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this.toolhost.activeCursor$.subscribe((cursor: string) => {
        // Something changed, refresh our tools
        this.cursorShown = cursor;
      })
    );

    this._subs.add(
      this.mdl.transform.transformChangeComplete$.subscribe((complete: boolean) => {
        if (complete) {
          //this.saveState();
        }
        this.reDraw();
      })
    );

    this.reDraw();
  }

  private setInitialConfig() {
    // Get the "default" image for the loaded scan if there is one
    const scanId = this._analysisLayoutService.defaultScanId;

    if (scanId.length > 0) {
      this._cachedDataService.getDefaultImage(ImageGetDefaultReq.create({ scanIds: [scanId] })).subscribe((resp: ImageGetDefaultResp) => {
        const img = resp.defaultImagesPerScanId[scanId];
        if (img) {
          // Set this as our default image
          this.mdl.imageName = img;
          this.updateView();
        }
      });
    }
  }

  private updateView() {
    this._contextDataService.getDrawModel(this.mdl.imageName).subscribe((drawMdl: ContextImageDrawModel) => {
      const sel = this._selectionService.getCurrentSelection();
      this.mdl.setData(drawMdl, sel.beamSelection, sel.pixelSelection);
    });
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

  onToolSelected(toolId: ContextImageToolId) {
    // Set active
    this.toolhost.setTool(toolId);

    // Get the list of tool ids
    const toolIds = [];
    const toolStates = [];
    for (const tool of this.toolhost.getToolButtons()) {
      toolIds.push("tool-" + tool.toolId.toString());
      toolStates.push(tool.state);
    }

    // Update button states
    if (this._widgetControlConfiguration.bottomToolbar) {
      for (const button of this._widgetControlConfiguration.bottomToolbar) {
        const idx = toolIds.indexOf(button.id);
        if (idx > -1) {
          // It's a tool button, set its state!
          button.value = toolStates[idx] != ToolState.OFF;
        }
      }
    }
  }

  onExport(trigger: Element | undefined) {}
  onCrop(trigger: Element | undefined) {}
  onSoloView() {}
  onToggleShowPoints() {
    this.mdl.showPoints = !this.mdl.showPoints;
  }
  onZoomIn() {
    const newScale = this.mdl.transform.scale.x * (1 + 4 / 100);
    this.mdl.transform.setScaleRelativeTo(new Point(newScale, newScale), this.mdl.transform.calcViewportCentreInWorldspace(), true);
  }
  onZoomOut() {
    const newScale = this.mdl.transform.scale.x * (1 - 4 / 100);
    this.mdl.transform.setScaleRelativeTo(new Point(newScale, newScale), this.mdl.transform.calcViewportCentreInWorldspace(), true);
  }
  onResetViewToWholeImage() {
    const dims: Point = this.mdl.drawModel.image
      ? new Point(this.mdl.drawModel.image.width, this.mdl.drawModel.image.height)
      : new Point(this.mdl.drawModel.allLocationPointsBBox.w, this.mdl.drawModel.allLocationPointsBBox.h);

    this.mdl.transform.resetViewToRect(new Rect(0, 0, dims.x, dims.y), true);
  }
  onResetViewToExperiment() {
    if (this.mdl.drawModel.allLocationPointsBBox.w > 0 && this.mdl.drawModel.allLocationPointsBBox.h > 0) {
      this.mdl.transform.resetViewToRect(this.mdl.drawModel.allLocationPointsBBox, true);
    }
  }
  onToggleLayersView(trigger: Element | undefined) {}
  onToggleImageOptionsView(trigger: Element | undefined) {}

  onToggleSelectionMode() {
    this.mdl.selectionModeAdd = !this.mdl.selectionModeAdd;

    // Reactivate whatever tool we have showing, so it is now in the right mode
    this.toolhost.reactivateTool();
  }
}
