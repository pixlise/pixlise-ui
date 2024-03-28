import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel, LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import { ContextImageModel, ContextImageModelLoadedData, ContextImageScanModel } from "./context-image-model";
import { ContextImageToolHost, ToolHostCreateSettings, ToolState } from "./tools/tool-host";
import { ContextImageDrawer } from "./context-image-drawer";
import { ContextImageState, MapLayerVisibility, ROILayerVisibility, VisibleROI } from "src/app/generated-protos/widget-data";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ImageGetDefaultReq, ImageGetDefaultResp } from "src/app/generated-protos/image-msgs";
import { ContextImageToolId } from "./tools/base-context-image-tool";
import { ContextImageDataService, SyncedTransform } from "../../services/context-image-data.service";
import { Point, Rect } from "src/app/models/Geometry";
import { SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import {
  ExpressionPickerData,
  ExpressionPickerComponent,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ColourRamp } from "src/app/utils/colours";
import { ContextImageMapLayer } from "../../models/map-layer";
import {
  SectionedSelectDialogComponent,
  SectionedSelectDialogInputs,
  SelectedOptions,
  SubItemOptionSection,
} from "src/app/modules/pixlisecore/components/atoms/sectioned-select-dialog/sectioned-select-dialog.component";
import { getInitialModalPositionRelativeToTrigger } from "src/app/utils/overlay-host";
import { ImageOptionsComponent, ImageDisplayOptions, ImagePickerParams, ImagePickerResult } from "./image-options/image-options.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { ROIItem, ROIItemDisplaySettings } from "src/app/generated-protos/roi";
import { HighlightedROIs } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/roi-tab/roi-tab.component";

@Component({
  selector: "app-context-image",
  templateUrl: "./context-image.component.html",
  styleUrls: ["./context-image.component.scss"],
})
export class ContextImageComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl: ContextImageModel;
  drawer: CanvasDrawer;
  toolhost: ContextImageToolHost;

  // For saving and restoring
  cachedExpressionIds: string[] = [];
  cachedROIs: VisibleROI[] = [];

  cursorShown: string = "";

  configuredScanIds: string[] = [];
  scanId: string = "";

  linkToDataset: boolean = true;

  private _quantOverrideForScan: Record<string, string> = {};

  private _subs = new Subscription();

  private _shownImageOptions: MatDialogRef<ImageOptionsComponent> | null = null;

  private _expressionPickerDialog: MatDialogRef<ExpressionPickerComponent> | null = null;

  private _showBottomToolbar: boolean = !this._analysisLayoutService.isMapsPage;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _roiService: ROIService,
    private _cachedDataService: APICachedDataService,
    private _contextDataService: ContextImageDataService,
    private _selectionService: SelectionService,
    private _snackService: SnackbarService,
    public dialog: MatDialog
  ) {
    super();

    this.mdl = new ContextImageModel();

    this.scanId = this._analysisLayoutService.defaultScanId;

    const showLineDrawTool = true;
    const showNavTools = true;
    const showPMCTool = false;
    const showSelectionTools = true;
    const showPhysicalScale = true;
    const showMapColourScale = true;

    const toolSettings = new ToolHostCreateSettings(showLineDrawTool, showNavTools, showPMCTool, showSelectionTools, showPhysicalScale, showMapColourScale);
    this.toolhost = new ContextImageToolHost(toolSettings, this.mdl, this._selectionService);
    this.drawer = new ContextImageDrawer(this.mdl, this.toolhost);

    this._widgetControlConfiguration = {
      topToolbar: [
        // {
        //   id: "export",
        //   type: "button",
        //   icon: "assets/button-icons/export.svg",
        //   tooltip: "Export",
        //   value: false,
        //   onClick: (value, trigger) => this.onExport(trigger),
        // },
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
          id: "show-options",
          type: "button",
          title: "Visibility",
          tooltip: "Toggle visibility of scan data",
          value: false,
          onClick: (value, trigger) => this.onToggleShowPoints(trigger),
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
      topLeftInsetButton: {
        id: "selection",
        type: "selection-changer",
        tooltip: "Selection changer",
        onClick: () => {},
      },
      bottomToolbar: [],
    };

    if (this.showBottomToolbar) {
      this.loadBottomToolbar();
    }
  }

  get showBottomToolbar(): boolean {
    return this._showBottomToolbar;
  }

  set showBottomToolbar(value: boolean) {
    if (value === this._showBottomToolbar) {
      return;
    }

    this._showBottomToolbar = value;
    if (value) {
      this.loadBottomToolbar();
    }
  }

  onToggleBottomToolbar() {
    this.showBottomToolbar = !this.showBottomToolbar;
    if (!this.showBottomToolbar) {
      this.hideBottomToolbar();
    }
  }

  hideBottomToolbar() {
    this._widgetControlConfiguration.bottomToolbar = [];
  }

  loadBottomToolbar() {
    this._widgetControlConfiguration.bottomToolbar = [
      {
        id: "layers",
        type: "button",
        title: "Layers",
        tooltip: "Manage layers of data drawn",
        value: false,
        onClick: (value, trigger) => this.onToggleLayersView(trigger),
      },
      {
        id: "regions",
        type: "button",
        title: "Regions",
        tooltip: "Manage regions drawn",
        value: false,
        onClick: () => this.onRegions(),
      },
      {
        id: "image",
        type: "button",
        title: "Image",
        margin: "0 auto 0 0",
        tooltip: "Manage images drawn",
        value: false,
        onClick: (value, trigger) => this.onToggleImageOptionsView(trigger),
      },
    ];

    for (const tool of this.toolhost.getToolButtons()) {
      let customStyle = {};
      if (tool.toolId === ContextImageToolId.ZOOM) {
        customStyle = { "border-left": "1px solid rgb(var(--clr-gray-70))", "margin-left": "4px" };
      } else if (tool.toolId === ContextImageToolId.PAN) {
        customStyle = { "border-right": "1px solid rgb(var(--clr-gray-70))", "padding-right": "4px" };
      }

      this._widgetControlConfiguration.bottomToolbar?.push({
        id: "tool-" + tool.toolId.toString(),
        type: "selectable-button",
        style: customStyle,
        icon: tool.icon,
        value: tool.state != ToolState.OFF,
        onClick: () => this.onToolSelected(tool.toolId),
      });
    }

    this._widgetControlConfiguration.bottomToolbar?.push({
      id: "selection-mode",
      type: "plus-minus-switch",
      activeIcon: "assets/button-icons/selection-mode-add.svg",
      inactiveIcon: "assets/button-icons/selection-mode-subtract.svg",
      tooltip: "Toggles selection mode between\n additive and subtractive",
      value: this.mdl?.selectionModeAdd ?? false,
      onClick: () => this.onToggleSelectionMode(),
    });
  }

  ngOnInit() {
    this.onToolSelected(ContextImageToolId.PAN);

    this._subs.add(
      this._selectionService.selection$.subscribe((currSel: SelectionHistoryItem) => {
        this.updateSelection();
      })
    );

    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        this.updateSelection();
      })
    );

    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const contextData = data as ContextImageState;

        if (this._analysisLayoutService.isMapsPage && contextData.mapLayers.length > 0) {
          this.mdl.expressionIds = contextData.mapLayers.map((layer: MapLayerVisibility) => layer.expressionID);
          this.cachedExpressionIds = this.mdl.expressionIds.slice();
          this.cachedROIs = this.mdl.roiIds.slice();
          this.mdl.drawImage = false;
          this.mdl.hideFootprintsForScans = [this.scanId];
          this.mdl.hidePointsForScans = [this.scanId];
          // this.setInitialConfig(true);
        } else if (contextData) {
          this.mdl.expressionIds = contextData.mapLayers.map((layer: MapLayerVisibility) => layer.expressionID);

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
          this.mdl.imageSmoothing = contextData.contextImageSmoothing.length > 0;

          this.reloadModel();
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this._contextDataService.syncedTransform$.subscribe(transforms => {
        if (!this.linkToDataset) {
          return;
        }

        const syncedTransform = transforms[this.syncId];
        if (syncedTransform) {
          this.mdl.transform.pan.x = syncedTransform.pan.x;
          this.mdl.transform.pan.y = syncedTransform.pan.y;
          this.mdl.transform.scale.x = syncedTransform.scale.x;
          this.mdl.transform.scale.y = syncedTransform.scale.y;
          if (this.mdl.transform.scale.x <= 0) {
            this.mdl.transform.scale.x = 1;
          }

          if (this.mdl.transform.scale.y <= 0) {
            this.mdl.transform.scale.y = 1;
          }

          this.reDraw();
        }
      })
    );

    this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
      if (screenConfiguration) {
        this.configuredScanIds = Object.keys(screenConfiguration.scanConfigurations).map(scanId => scanId);
      }
    });

    this._subs.add(
      this.toolhost.activeCursor$.subscribe((cursor: string) => {
        // Something changed, refresh our tools
        this.cursorShown = cursor;
      })
    );

    this._subs.add(
      this.mdl.transform.transformChangeStarted$.subscribe(() => {
        if (this.linkToDataset) {
          this._contextDataService.syncTransformForId(this.syncId, {
            pan: new Point(this.mdl.transform.pan.x, this.mdl.transform.pan.y),
            scale: new Point(this.mdl.transform.scale.x, this.mdl.transform.scale.y),
          });
        }
      })
    );

    this._subs.add(
      this.mdl.transform.transformChangeComplete$.subscribe((complete: boolean) => {
        if (complete) {
          this.saveState();
        }
        this.reDraw();
      })
    );

    this._subs.add(
      this._analysisLayoutService.highlightedContextImageDiffractionWidget$.subscribe(highlightedWidget => {
        if (!highlightedWidget || highlightedWidget.widgetId !== this._widgetId) {
          return;
        }

        const expressionId = highlightedWidget.expressionId || highlightedWidget.result?.expression?.id;

        if (expressionId) {
          this.mdl.expressionIds = [expressionId];
        } else {
          this.mdl.expressionIds = this.cachedExpressionIds.slice();
        }

        this.reloadModel();
      })
    );

    this._subs.add(
      this._analysisLayoutService.highlightedROIs$.subscribe((highlighted: HighlightedROIs | null) => {
        if (!highlighted || highlighted.widgetId !== this._widgetId) {
          return;
        }

        if (highlighted.scanId !== this.scanId) {
          this._snackService.openWarning("Highlighted ROI is not in the current scan on the context image");
          this._analysisLayoutService.highlightedROIs$.next(null);
          return;
        }

        if (highlighted.roiIds.length > 0) {
          this.mdl.roiIds = [];
          highlighted.roiIds.forEach(id => {
            const visibleROI = VisibleROI.create({ id, scanId: highlighted.scanId });
            this.loadROIRegion(visibleROI, true);
          });
        } else {
          this.mdl.roiIds = this.cachedROIs.slice();
        }

        this.reloadModel();
      })
    );

    this._subs.add(
      this._analysisLayoutService.expressionPickerResponse$.subscribe((result: ExpressionPickerResponse | null) => {
        if (!result || this._analysisLayoutService.highlightedWidgetId$.value !== this._widgetId) {
          return;
        }

        if (result) {
          this.mdl.expressionIds = [];

          if (result && result.selectedExpressions?.length > 0) {
            for (const expr of result.selectedExpressions) {
              this.mdl.expressionIds.push(expr.id);
            }
          }

          this.reloadModel();
          this.saveState();
        }

        if (!result?.persistDialog) {
          // Expression picker has closed, so we can stop highlighting this widget
          this._analysisLayoutService.highlightedWidgetId$.next("");
        }
      })
    );

    this._subs.add(
      this._roiService.displaySettingsMap$.subscribe(displaySettings => {
        // Regenerate any regions we have
        if (this.mdl.roiIds.length > 0) {
          this.reloadModel();
        }
        this.reDraw();
      })
    );

    this.reDraw();
  }

  get isMapsPage(): boolean {
    return this._analysisLayoutService.isMapsPage;
  }

  get syncId(): string {
    return `${this.scanId}-${this._analysisLayoutService.isMapsPage ? "maps" : "analysis"}`;
  }

  onToggleLinkToDataset() {
    this.linkToDataset = !this.linkToDataset;
  }

  private setInitialConfig(setViewToExperiment: boolean = false) {
    // Get the "default" image for the loaded scan if there is one
    const scanId = this.scanId || this._analysisLayoutService.defaultScanId;

    if (scanId.length > 0) {
      this._cachedDataService.getDefaultImage(ImageGetDefaultReq.create({ scanIds: [scanId] })).subscribe({
        next: (resp: ImageGetDefaultResp) => {
          const img = resp.defaultImagesPerScanId[scanId];
          if (img) {
            // Set this as our default image
            this.mdl.imageName = img;
            this.reloadModel(setViewToExperiment);
          }
        },
        error: err => {
          this._snackService.openError("Failed to get default image for scan: " + scanId, err);
        },
      });
    }
  }

  private _configureForInjectedScan(liveExpression: LiveExpression) {
    this.scanId = liveExpression.scanId;
    this.mdl.expressionIds = [liveExpression.expressionId];
    this._quantOverrideForScan[liveExpression.scanId] = liveExpression.quantId;

    // If we're on the maps page, we don't want to draw the image, and we want to hide the points and footprints
    if (this._analysisLayoutService.isMapsPage) {
      this.mdl.drawImage = false;
      this.mdl.hideFootprintsForScans = [this.scanId];
      this.mdl.hidePointsForScans = [this.scanId];
    }
  }

  override injectExpression(liveExpression: LiveExpression) {
    this._configureForInjectedScan(liveExpression);
    if (this.mdl.imageName && this.mdl.expressionIds.length === 1 && this.mdl.expressionIds[0] === liveExpression.expressionId) {
      this.reloadModel(true);
    } else {
      this.setInitialConfig(true);
    }
  }

  private updateSelection() {
    const sel = this._selectionService.getCurrentSelection();
    this.mdl.setSelection(sel.beamSelection, sel.pixelSelection, this._selectionService.hoverScanId, this._selectionService.hoverEntryIdx);
    this.reDraw();
  }

  private loadMapLayers(setViewToExperiment: boolean = false) {
    this.isWidgetDataLoading = false;

    // Get the expression layers
    if (this.mdl.expressionIds.length > 0) {
      for (const scanId of this.mdl.scanIds) {
        const scanMdl = this.mdl.getScanModelFor(scanId);
        if (scanMdl) {
          const pts = scanMdl.scanPoints;
          const pmcToIndexLookup = new Map<number, number>();
          for (const pt of pts) {
            pmcToIndexLookup.set(pt.PMC, pt.locationIdx);
          }

          const quantId = this._quantOverrideForScan[scanId] || this._analysisLayoutService.getQuantIdForScan(scanId);

          const shading = this._analysisLayoutService.isMapsPage ? ColourRamp.SHADE_VIRIDIS : ColourRamp.SHADE_MAGMA;

          this.mdl.expressionIds.forEach((exprId, i) => {
            this._contextDataService.getLayerModel(scanId, exprId, quantId, PredefinedROIID.getAllPointsForScan(scanId), shading, pmcToIndexLookup).subscribe({
              next: (layer: ContextImageMapLayer) => {
                this.mdl.setMapLayer(layer);
                this.widgetErrorMessage = "";

                if (setViewToExperiment && i == this.mdl.expressionIds.length - 1) {
                  setTimeout(() => {
                    this.onResetViewToExperiment();
                  }, 1);
                }
              },
              error: err => {
                if (this._analysisLayoutService.isMapsPage) {
                  // We have to wait for things to be injected on maps page, so this may be falsely called
                  console.warn("Failed to add layer: " + exprId + " scan: " + scanId, err);
                } else {
                  //this._snackService.openError("Failed to add layer: " + exprId + " scan: " + scanId, err);
                  this._snackService.openError(err);
                  this.widgetErrorMessage = "Failed to load layer data for displaying context image: " + this.mdl.imageName;
                }
              },
            });
          });

          this.scanId = scanId;
        }
      }
    }

    // And generate ROI polygons
    for (const roi of this.mdl.roiIds) {
      this.loadROIRegion(roi);
    }
  }

  private loadROIRegion(roi: VisibleROI, setROIVisible: boolean = false) {
    // NOTE: loadROI calls decodeIndexList so from this point we don't have to worry, we have a list of PMCs!
    this._roiService.loadROI(roi.id).subscribe({
      next: (roiLoaded: ROIItem) => {
        // We need to be able to convert PMCs to location indexes...
        const scanMdl = this.mdl.getScanModelFor(roi.scanId);
        if (scanMdl) {
          const pmcToIndexLookup = new Map<number, number>();
          for (const pt of scanMdl.scanPoints) {
            pmcToIndexLookup.set(pt.PMC, pt.locationIdx);
          }

          // Make sure it has up to date display settings
          const disp = this._roiService.getRegionDisplaySettings(roi.id);
          if (disp) {
            roiLoaded.displaySettings = ROIItemDisplaySettings.create({ colour: disp.colour.asString(), shape: disp.shape });
          }

          // We've loaded the region itself, store these so we can build a draw model when needed
          this.mdl.setRegion(roi.id, roiLoaded, pmcToIndexLookup);

          if (setROIVisible) {
            if (!this.mdl.roiIds.find(existingROI => existingROI.id === roi.id)) {
              this.mdl.roiIds = [roi, ...this.mdl.roiIds];
            }
            this.reloadModel();
          }
        }
      },
      error: err => {
        this._snackService.openError("Failed to generate region: " + roi.id + " scan: " + roi.scanId, err);
        this.widgetErrorMessage = "Failed to load region data for displaying context image: " + this.mdl.imageName;
      },
    });
  }

  private reloadModel(setViewToExperiment: boolean = false) {
    this.isWidgetDataLoading = true;

    this._contextDataService.getModelData(this.mdl.imageName, this._widgetId).subscribe({
      next: (data: ContextImageModelLoadedData) => {
        if (data.scanModels.size > 0) {
          this.scanId = data.scanModels.keys().next().value;
        }

        this.mdl.setData(data);
        this.loadMapLayers(setViewToExperiment);
      },
      error: err => {
        this._snackService.openError("Failed to load data for displaying context image: " + this.mdl.imageName, err);
        this.widgetErrorMessage = "Failed to load data for displaying context image: " + this.mdl.imageName;
      },
    });
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  reDraw() {
    this.mdl.needsDraw$.next();
  }

  get transform(): PanZoom {
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

  // onExport(trigger: Element | undefined) {}

  onCrop(trigger: Element | undefined) {}

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
      if (this._analysisLayoutService.isMapsPage) {
        this.hideBottomToolbar();
      }
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
      if (this._analysisLayoutService.isMapsPage) {
        this.loadBottomToolbar();
      }
    }
  }

  onToggleShowPoints(trigger: Element | undefined) {
    const options: SubItemOptionSection[] = [
      {
        title: "Points",
        options: [],
      },
      {
        title: "Footprints",
        options: [],
      },
      {
        title: "Map Data",
        options: [],
      },
    ];

    // Find scan titles
    const scanTitles = new Map<string, string>();
    for (const scanId of this.mdl.scanIds) {
      const mdl = this.mdl.getScanModelFor(scanId);
      scanTitles.set(scanId, mdl?.scanTitle || scanId);
    }

    // Add options for showing/hiding all scan footprints, maps and points
    const allOptions = new Set<string>();
    const appendage = ["-points", "-footprints", "-maps"];
    for (const scanId of this.mdl.scanIds) {
      for (let c = 0; c < appendage.length; c++) {
        const opt = `${scanId}${appendage[c]}`;
        options[c].options.push({ title: `${scanTitles.get(scanId)}`, value: opt });
        allOptions.add(opt);
      }
    }

    // NOTE: model only stores items in lists that need to be hidden, so here we build selected options
    // but as an inverse, these are visible if picked
    const selection: string[] = [];
    const source: string[][] = [this.mdl.hidePointsForScans, this.mdl.hideFootprintsForScans, this.mdl.hideMapsForScans];
    for (let c = 0; c < source.length; c++) {
      for (const scanId of this.mdl.scanIds) {
        // If this is in the list, it means it's hidden, so it's NOT selected
        if (source[c].indexOf(scanId) == -1) {
          selection.push(scanId + appendage[c]);
        }
      }
    }

    const dialogConfig = new MatDialogConfig<SectionedSelectDialogInputs>();
    dialogConfig.data = {
      selectionOptions: options,
      selectedOptions: selection,
    };

    dialogConfig.hasBackdrop = false;
    //dialogConfig.disableClose = true;
    const rect = trigger?.parentElement?.getBoundingClientRect();
    if (rect) {
      dialogConfig.position = getInitialModalPositionRelativeToTrigger(trigger, rect.height, rect.width);
    }

    const dialogRef = this.dialog.open(SectionedSelectDialogComponent, dialogConfig);
    dialogRef.componentInstance.selectionChanged.subscribe((sel: SelectedOptions) => {
      if (sel && sel.selectedOptions) {
        // If it's selected, make sure it is NOT in the hidden list, otherwise it should be there...
        const hiddenOptions = new Set(allOptions);
        for (const opt of sel.selectedOptions) {
          hiddenOptions.delete(opt);
        }

        // Fill our lists
        const newHiddenLists: string[][] = [];
        for (let c = 0; c < appendage.length; c++) {
          newHiddenLists.push([]);
        }

        for (const opt of hiddenOptions) {
          for (let c = 0; c < appendage.length; c++) {
            if (opt.endsWith(appendage[c])) {
              newHiddenLists[c].push(opt.substring(0, opt.length - appendage[c].length));
            }
          }
        }

        this.mdl.hidePointsForScans = newHiddenLists[0];
        this.mdl.hideFootprintsForScans = newHiddenLists[1];
        this.mdl.hideMapsForScans = newHiddenLists[2];

        this.reDraw();
      }
    });
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

  onToggleLayersView(trigger: Element | undefined) {
    if (this._expressionPickerDialog) {
      // Hide it
      this._expressionPickerDialog.close();
      return;
    }

    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;
    dialogConfig.disableClose = true;
    dialogConfig.data = {
      widgetType: "context-image",
      widgetId: this._widgetId,
      scanId: this.scanId,
      selectedIds: this.mdl.expressionIds || [],
      draggable: true,
      liveReload: true,
      singleSelectionOption: true,
      maxSelection: 1,
      preserveGroupSelection: true,
    };

    this._expressionPickerDialog = this.dialog.open(ExpressionPickerComponent, dialogConfig);
    this._expressionPickerDialog.afterClosed().subscribe(() => {
      this._analysisLayoutService.highlightedWidgetId$.next("");
      this._expressionPickerDialog = null;
    });
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();
    // Pass data to dialog
    const selectedROIs: string[] = [];
    for (const roi of this.mdl.roiIds) {
      selectedROIs.push(roi.id);
    }

    dialogConfig.data = {
      requestFullROIs: true,
      selectedIds: selectedROIs,
      scanId: this.scanId,
    };

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ROIPickerResponse) => {
      if (result) {
        this.mdl.roiIds = [];

        // Create entries for each scan
        const roisPerScan = new Map<string, string[]>();
        for (const roi of result.selectedROISummaries) {
          let existing = roisPerScan.get(roi.scanId);
          if (existing === undefined) {
            existing = [];
          }

          existing.push(roi.id);
          roisPerScan.set(roi.scanId, existing);

          if (this.scanId !== roi.scanId) {
            this.scanId = roi.scanId;
          }
        }

        // Now fill in the data source ids using the above
        for (const [scanId, roiIds] of roisPerScan) {
          for (const roiId of roiIds) {
            this.mdl.roiIds.push(VisibleROI.create({ id: roiId, scanId: scanId }));
          }
        }

        this.reloadModel();
        this.saveState();
      }
    });
  }

  saveState() {
    if (this._analysisLayoutService.isMapsPage) {
      // We don't save state for maps
      return;
    }

    this.cachedExpressionIds = this.mdl.expressionIds.slice();
    this.cachedROIs = this.mdl.roiIds.slice();

    this.onSaveWidgetData.emit(
      ContextImageState.create({
        panX: this.mdl.transform.pan.x,
        panY: this.mdl.transform.pan.y,
        zoomX: this.mdl.transform.scale.x,
        zoomY: this.mdl.transform.scale.y,
        pointColourScheme: this.mdl.pointColourScheme,
        pointBBoxColourScheme: this.mdl.pointBBoxColourScheme,
        contextImage: this.mdl.imageName,
        contextImageSmoothing: this.mdl.imageSmoothing ? "true" : "",
        roiLayers: this.mdl.roiIds.map(roi => ROILayerVisibility.create({ roiID: roi.id, opacity: 1, visible: true })),
        elementRelativeShading: this.mdl.elementRelativeShading,
        brightness: this.mdl.imageBrightness,
        rgbuChannels: this.mdl.rgbuChannels,
        unselectedOpacity: this.mdl.unselectedOpacity,
        unselectedGrayscale: this.mdl.unselectedGrayscale,
        colourRatioMin: this.mdl.colourRatioMin ?? undefined,
        colourRatioMax: this.mdl.colourRatioMax ?? undefined,
        removeTopSpecularArtifacts: this.mdl.removeTopSpecularArtifacts,
        removeBottomSpecularArtifacts: this.mdl.removeBottomSpecularArtifacts,
        mapLayers: this.mdl.expressionIds.map(layer => MapLayerVisibility.create({ expressionID: layer })),
      })
    );
  }

  getImagePickerParams(): ImagePickerParams {
    return new ImagePickerParams(
      this.configuredScanIds,
      new ImageDisplayOptions(
        this.mdl.imageName,
        this.mdl.imageSmoothing,
        this.mdl.imageBrightness,
        this.mdl.removeTopSpecularArtifacts,
        this.mdl.removeBottomSpecularArtifacts,
        this.mdl.colourRatioMin,
        this.mdl.colourRatioMax,
        this.mdl.rgbuChannels,
        this.mdl.unselectedOpacity,
        this.mdl.unselectedGrayscale,
        this.scanId,
        this.mdl.rgbuImageScaleData?.specularRemovedValueRange,
        this.mdl.rgbuImageScaleData?.valueRange
      )
    );
  }

  onToggleImageOptionsView(trigger: Element | undefined) {
    if (this._shownImageOptions) {
      // Hide it
      this._shownImageOptions.close();
      return;
    }

    const dialogConfig = new MatDialogConfig();
    // Pass data to dialog
    dialogConfig.data = this.getImagePickerParams();

    dialogConfig.hasBackdrop = false;
    dialogConfig.disableClose = true;
    dialogConfig.position = getInitialModalPositionRelativeToTrigger(trigger, 500, 500);

    this._shownImageOptions = this.dialog.open(ImageOptionsComponent, dialogConfig);
    this._shownImageOptions.componentInstance.optionChange.subscribe((result: ImagePickerResult) => {
      // NOTE: it must be the path though... so must be like: <scanId>/<image>.png
      this.mdl.drawImage = result.options.currentImage.length > 0;
      // If user wants to draw the image, we got an image name back so apply to model. If it's
      // an empty name, we just set the draw flag to false and don't change the imageName
      // so reloading still works (and does almost nothing because it's the same image!)
      if (this.mdl.drawImage) {
        this.mdl.imageName = result.options.currentImage;
      }

      if (result.options.selectedScanId.length > 0 && result.options.selectedScanId !== this.scanId) {
        this.scanId = result.options.selectedScanId;
      }

      this.mdl.imageSmoothing = result.options.imageSmoothing;
      this.mdl.imageBrightness = result.options.imageBrightness;
      this.mdl.removeTopSpecularArtifacts = result.options.removeTopSpecularArtifacts;
      this.mdl.removeBottomSpecularArtifacts = result.options.removeBottomSpecularArtifacts;
      this.mdl.colourRatioMin = result.options.colourRatioMin;
      this.mdl.colourRatioMax = result.options.colourRatioMax;
      this.mdl.rgbuChannels = result.options.rgbuChannels;
      this.mdl.unselectedOpacity = result.options.unselectedOpacity;
      this.mdl.unselectedGrayscale = result.options.unselectedGrayscale;

      this.reloadModel();
      this.saveState();

      if (this._shownImageOptions?.componentInstance?.loadOptions) {
        let params = this.getImagePickerParams();
        this._shownImageOptions.componentInstance.loadOptions(params.options);
      }
    });

    this._shownImageOptions.afterClosed().subscribe(() => {
      this._shownImageOptions = null;
    });
  }

  onToggleSelectionMode() {
    this.mdl.selectionModeAdd = !this.mdl.selectionModeAdd;
    const selectionModeBtn = this._widgetControlConfiguration.bottomToolbar?.find(b => b.id === "selection-mode");
    if (selectionModeBtn) {
      selectionModeBtn.value = this.mdl.selectionModeAdd;
    }

    // Reactivate whatever tool we have showing, so it is now in the right mode
    this.toolhost.reactivateTool();
  }
}
