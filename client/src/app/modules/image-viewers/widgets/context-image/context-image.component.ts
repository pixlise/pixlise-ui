import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { catchError, combineLatest, map, mergeMap, Observable, of, Subscription, switchMap, tap, throwError, toArray } from "rxjs";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel, LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import { ContextImageModel, ContextImageModelLoadedData } from "./context-image-model";
import { ContextImageToolHost, ToolHostCreateSettings, ToolState } from "./tools/tool-host";
import { ContextImageDrawer } from "./context-image-drawer";
import { ContextImageState, MapLayerVisibility, ROILayerVisibility, VisibleROI } from "src/app/generated-protos/widget-data";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ImageGetDefaultReq, ImageGetDefaultResp } from "src/app/generated-protos/image-msgs";
import { ContextImageToolId } from "./tools/base-context-image-tool";
import { ContextImageDataService } from "../../services/context-image-data.service";
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
import { getInitialModalPositionRelativeToTrigger } from "src/app/utils/overlay-host";
import { ImageOptionsComponent, ImageDisplayOptions, ImagePickerParams, ImagePickerResult } from "./image-options/image-options.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { ROIItem, ROIItemDisplaySettings } from "src/app/generated-protos/roi";
import { HighlightedROIs } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/roi-tab/roi-tab.component";
import { ExpressionsService } from "src/app/modules/expressions/services/expressions.service";
import { ContextImageExporter } from "src/app/modules/image-viewers/widgets/context-image/context-image-exporter";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { WidgetExportData, WidgetExportDialogData, WidgetExportRequest } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import {
  LayerOpacityChange,
  LayerVisibilityChange,
  LayerVisibilityDialogComponent,
  LayerVisibilitySection,
  LayerVisiblilityData,
} from "../../../pixlisecore/components/atoms/layer-visibility-dialog/layer-visibility-dialog.component";

export type RegionMap = Map<string, ROIItem>;
export type MapLayers = Map<string, ContextImageMapLayer[]>;
export type ContextImageLayers = { mapLayers: MapLayers; regions: RegionMap };

@Component({
  selector: "app-context-image",
  templateUrl: "./context-image.component.html",
  styleUrls: ["./context-image.component.scss"],
})
export class ContextImageComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl: ContextImageModel;
  drawer: CanvasDrawer;
  toolhost: ContextImageToolHost;
  exporter: ContextImageExporter;

  // For saving and restoring
  cachedExpressionIds: string[] = [];
  cachedROIs: ROILayerVisibility[] = [];

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
    private _endpointsService: APIEndpointsService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _roiService: ROIService,
    private _cachedDataService: APICachedDataService,
    private _contextDataService: ContextImageDataService,
    private _expressionsService: ExpressionsService,
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
    this.exporter = new ContextImageExporter(this._endpointsService, this._snackService, this.drawer, this.transform);

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
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export Data",
          onClick: () => this.onExportWidgetData.emit(),
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
          const validMapLayers = contextData.mapLayers.filter(layer => layer?.expressionID && layer.expressionID.length > 0);
          this.mdl.expressionIds = validMapLayers.map((layer: MapLayerVisibility) => layer.expressionID);
          this.cachedExpressionIds = this.mdl.expressionIds.slice();
          this.cachedROIs = this.mdl.roiIds.slice();
          this.mdl.drawImage = false;
          this.mdl.hideFootprintsForScans = [this.scanId];
          this.mdl.hidePointsForScans = [this.scanId];
          // this.setInitialConfig(true);
        } else if (contextData) {
          const validMapLayers = contextData.mapLayers.filter(layer => layer?.expressionID && layer.expressionID.length > 0);
          this.mdl.expressionIds = validMapLayers.map((layer: MapLayerVisibility) => layer.expressionID);
          this.mdl.roiIds = contextData.roiLayers;

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
          const highlightRequests = highlighted.roiIds.map(id => this.loadROIRegion(ROILayerVisibility.create({ id, scanId: highlighted.scanId }), true));
          combineLatest(highlightRequests).subscribe({
            next: () => {
              this.reloadModel();
            },
            error: err => {
              this._snackService.openError("Failed to highlight region", err);
            },
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

          if (result.selectedGroup) {
            this.mdl.expressionIds.push(result.selectedGroup.id);
          }

          if (result.selectedExpressions && result.selectedExpressions.length > 0) {
            for (const expr of result.selectedExpressions) {
              this.mdl.expressionIds.push(expr.id);
            }
          }

          this.saveState();
          this.reloadModel();
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

    this._subs.add(
      this._expressionsService.displaySettings$.subscribe(displaySettings => {
        // We only draw the colour scale for the top, so we only need to reload the model if this has changed
        if (displaySettings && this.mdl.expressionIds.length > 0 && this.mdl.expressionIds[0] in displaySettings) {
          this.reloadModel();
        }
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
          } else {
            this.mdl.imageName = "";
          }
          this.reloadModel(setViewToExperiment);
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

  private loadMapLayerExpressions(scanId: string, expressionIds: string[], setViewToExperiment: boolean = false): Observable<ContextImageMapLayer[]> {
    this.scanId = scanId;

    const scanMdl = this.mdl.getScanModelFor(scanId);
    if (scanMdl) {
      const pts = scanMdl.scanPoints;
      const pmcToIndexLookup = new Map<number, number>();
      for (const pt of pts) {
        pmcToIndexLookup.set(pt.PMC, pt.locationIdx);
      }

      const quantId = this._quantOverrideForScan[scanId] || this._analysisLayoutService.getQuantIdForScan(scanId);

      const defaultShading = this._analysisLayoutService.isMapsPage ? ColourRamp.SHADE_VIRIDIS : ColourRamp.SHADE_MAGMA;
      const modelRequests = expressionIds.map(exprId => {
        return this._contextDataService.getLayerModel(scanId, exprId, quantId, PredefinedROIID.getAllPointsForScan(scanId), defaultShading, pmcToIndexLookup);
      });

      return combineLatest(modelRequests).pipe(
        tap({
          next: (layers: ContextImageMapLayer[]) => {
            layers.forEach(layer => {
              this.mdl.setMapLayer(layer);
            });

            this.reDraw();

            this.widgetErrorMessage = "";

            if (setViewToExperiment) {
              setTimeout(() => {
                this.onResetViewToExperiment();
              }, 1);
            }
          },
          error: err => {
            if (this._analysisLayoutService.isMapsPage) {
              // We have to wait for things to be injected on maps page, so this may be falsely called
              console.warn("Failed to add layer", err);
            } else {
              this._snackService.openError("Failed to add layer", err);
              this.widgetErrorMessage = "Failed to load layer data for displaying context image: " + this.mdl.imageName;
            }
          },
        })
      );
    } else {
      return of([]);
    }
  }

  private loadMapLayers(setViewToExperiment: boolean = false): Observable<ContextImageLayers> {
    let layerRequests: Observable<ContextImageMapLayer[]>[] = [];

    // We need to run through expressions for every scan we have loaded, so first check if we have expressions
    if (this.mdl.expressionIds.length > 0) {
      layerRequests = this.mdl.scanIds.map(scanId => this.loadMapLayerExpressions(scanId, this.mdl.expressionIds, setViewToExperiment));
    }

    // Queue up region requests
    const regionRequests = this.mdl.roiIds.map(roi => this.loadROIRegion(roi));

    return combineLatest(layerRequests).pipe(
      mergeMap(layerRequest => layerRequest),
      toArray(),
      mergeMap(scanLayers => {
        const mapLayers = new Map<string, ContextImageMapLayer[]>();
        scanLayers.forEach((layers, i) => {
          mapLayers.set(this.mdl.scanIds[i], layers);
        });

        return combineLatest(regionRequests).pipe(
          mergeMap(regionRequest => regionRequest),
          toArray(),
          map(regions => {
            const regionsMap: RegionMap = new Map<string, ROIItem>();
            regions.forEach(region => {
              regionsMap.set(region.id, region);
            });

            const contextLayers: ContextImageLayers = { mapLayers, regions: regionsMap };
            return contextLayers;
          })
        );
      }),
      catchError(err => {
        console.error(err);
        return throwError(() => err);
      })
    );
  }

  private loadROIRegion(roi: ROILayerVisibility, setROIVisible: boolean = false): Observable<ROIItem> {
    // NOTE: loadROI calls decodeIndexList so from this point we don't have to worry, we have a list of PMCs!
    return this._roiService.loadROI(roi.id).pipe(
      tap({
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
            }
          }
        },
        error: err => {
          this._snackService.openError("Failed to generate region: " + roi.id + " scan: " + roi.scanId, err);
          this.widgetErrorMessage = "Failed to load region data for displaying context image: " + this.mdl.imageName;
        },
      })
    );
  }

  private reloadModel(setViewToExperiment: boolean = false) {
    this.isWidgetDataLoading = true;

    const obs: Observable<ContextImageModelLoadedData> =
      this.mdl.imageName.length <= 0 && this.scanId.length > 0
        ? this._contextDataService.getWithoutImage(this.scanId)
        : this._contextDataService.getModelData(this.mdl.imageName, this._widgetId);

    obs
      .pipe(
        switchMap((data: ContextImageModelLoadedData) => {
          if (data.scanModels.size > 0) {
            this.scanId = data.scanModels.keys().next().value;
          }

          this.mdl.setData(data);

          return this.loadMapLayers(setViewToExperiment);
        }),
        catchError((err: any) => {
          return throwError(() => err);
        })
      )
      .subscribe({
        next: (layers: ContextImageLayers) => {
          this.isWidgetDataLoading = false;

          this.reDraw();
        },
        error: err => {
          this.isWidgetDataLoading = false;
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

  override getExportOptions(): WidgetExportDialogData {
    return this.exporter.getExportOptions(this.mdl, this.scanId);
  }

  override onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
    return this.exporter.onExport(this.mdl, this.scanId, this.mdl.drawModel, request);
  }

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
    const datasetLayersSection: LayerVisibilitySection = {
      id: "dataset-layers",
      title: "Dataset Layers",
      isOpen: true,
      isVisible: true,
      options: [
        {
          id: "footprints",
          name: "Footprints",
          icon: "assets/icons/footprint.svg",
          opacity: 1,
          visible: true,
          subOptions: [],
        },
        {
          id: "points",
          name: "Points",
          icon: "assets/icons/scan-points.svg",
          opacity: 1,
          visible: true,
          subOptions: [],
        },
      ],
    };

    const mapLayersSection: LayerVisibilitySection[] = [];
    const regionLayersSection: LayerVisibilitySection[] = [];

    this.mdl.scanIds.forEach(scanId => {
      const scanName = this.mdl.getScanModelFor(scanId)?.scanTitle || scanId;

      const footprintsSection = datasetLayersSection.options.find(opt => opt.name === "Footprints");
      const pointsSection = datasetLayersSection.options.find(opt => opt.name === "Points");

      footprintsSection!.subOptions!.push({
        id: `${scanId}-footprints`,
        name: scanName,
        scanId: scanId,
        icon: "assets/icons/footprint.svg",
        showOpacity: true,
        opacity: 1,
        visible: true,
      });

      pointsSection!.subOptions!.push({
        id: `${scanId}-points`,
        name: scanName,
        scanId: scanId,
        icon: "assets/icons/scan-points.svg",
        showOpacity: true,
        opacity: 1,
        visible: true,
      });

      const mapLayers = this.mdl.getMapLayers(scanId);
      if (mapLayers) {
        const mapLayerSection: LayerVisibilitySection = {
          id: `map-layers-${scanId}`,
          title: "Map Data",
          scanId: scanId,
          scanName: scanName,
          isOpen: true,
          isVisible: true,
          options: [],
        };

        mapLayers.forEach(layer => {
          mapLayerSection.options.push({
            id: layer.expressionId,
            name: layer.expressionName,
            gradient: layer.shading,
            showOpacity: true,
            opacity: 1,
            visible: true,
            canDelete: true,
          });
        });

        mapLayersSection.push(mapLayerSection);
      }

      const regionLayers = this.mdl.roiIds.filter(roi => roi.scanId === scanId);
      if (regionLayers.length > 0) {
        const regionLayerSection: LayerVisibilitySection = {
          id: `region-layers-${scanId}`,
          title: "Region Data",
          scanId: scanId,
          scanName: scanName,
          isOpen: true,
          isVisible: true,
          options: [],
        };

        regionLayers.forEach(roi => {
          const region = this.mdl.getRegion(roi.id);
          if (!region) {
            return;
          }

          regionLayerSection.options.push({
            id: roi.id,
            name: region.roi.name,
            color: region.roi.displaySettings?.colour,
            showOpacity: true,
            opacity: roi.opacity ?? 1,
            visible: true,
            canDelete: true,
          });
        });

        regionLayersSection.push(regionLayerSection);
      }
    });

    const imagesSection: LayerVisibilitySection = {
      id: "images",
      title: "Images",
      isOpen: false,
      isVisible: true,
      options: [
        {
          id: "context-image",
          name: this.mdl.imageName,
          icon: "assets/icons/image.svg",
          opacity: 1,
          visible: true,
        },
      ],
    };

    const dialogConfig = new MatDialogConfig<LayerVisiblilityData>();
    dialogConfig.data = {
      sections: [datasetLayersSection, ...mapLayersSection, ...regionLayersSection, imagesSection],
    };

    dialogConfig.hasBackdrop = false;
    const rect = trigger?.parentElement?.getBoundingClientRect();
    if (rect) {
      dialogConfig.position = getInitialModalPositionRelativeToTrigger(trigger, rect.height, rect.width);
    }

    const dialogRef = this.dialog.open(LayerVisibilityDialogComponent, dialogConfig);

    dialogRef.componentInstance.visibilityToggle.subscribe((change: LayerVisibilityChange) => {
      if (change) {
        if (change.sectionId === "dataset-layers") {
          if (change.layerId === "footprints" && change.subLayerId) {
            const scanId = change.subLayerId.split("-")[0];
            this.mdl.hideFootprintsForScans = change.visible
              ? this.mdl.hideFootprintsForScans.filter(id => id !== scanId)
              : [...this.mdl.hideFootprintsForScans, scanId];
          } else if (change.layerId === "points" && change.subLayerId) {
            const scanId = change.subLayerId.split("-")[0];
            this.mdl.hidePointsForScans = change.visible ? this.mdl.hidePointsForScans.filter(id => id !== scanId) : [...this.mdl.hidePointsForScans, scanId];
          }
        } else if (change.sectionId.startsWith("map-layers-")) {
          const scanId = change.sectionId.split("-")[2];
          if (scanId && change.layerId) {
            if (change.visible) {
              if (!this.mdl.expressionIds.includes(change.layerId)) {
                if (change.index !== undefined) {
                  this.mdl.expressionIds = [...this.mdl.expressionIds.slice(0, change.index), change.layerId, ...this.mdl.expressionIds.slice(change.index)];
                } else {
                  this.mdl.expressionIds.push(change.layerId);
                }
              }
            } else {
              this.mdl.expressionIds = this.mdl.expressionIds.filter(id => id !== change.layerId);
            }
            this.reloadModel();
          } else {
            this.mdl.hideMapsForScans = change.visible ? this.mdl.hideMapsForScans.filter(id => id !== scanId) : [...this.mdl.hideMapsForScans, scanId];
          }
        } else if (change.sectionId.startsWith("region-layers-")) {
          const scanId = change.sectionId.split("-")[2];
          if (scanId && change.layerId) {
            if (change.visible) {
              if (!this.mdl.roiIds.find(roi => roi.id === change.layerId)) {
                this.mdl.roiIds = [ROILayerVisibility.create({ id: change.layerId, opacity: 1, visible: true, scanId }), ...this.mdl.roiIds];
              }
            } else {
              this.mdl.roiIds = this.mdl.roiIds.filter(roi => roi.id !== change.layerId);
            }
            this.reloadModel();
          }
        } else if (change.sectionId === "images") {
          if (change.layerId === "context-image") {
            this.mdl.drawImage = change.visible;
            this.reloadModel();
          }
        }

        this.saveState();
        this.reDraw();
      }
    });

    dialogRef.componentInstance.onReorder.subscribe((change: LayerVisibilitySection[]) => {
      const newExpressionIdOrder: string[] = [];
      const newRegionIdOrder: string[] = [];
      change.forEach(section => {
        if (!section.scanId) {
          return;
        }

        if (section.id.startsWith("map-layers-")) {
          section.options.forEach(option => {
            if (option.visible) {
              newExpressionIdOrder.push(option.id);
            }
          });
        } else if (section.id.startsWith("region-layers-")) {
          section.options.forEach(option => {
            if (option.visible) {
              newRegionIdOrder.push(option.id);
            }
          });
        }
      });

      this.mdl.expressionIds = newExpressionIdOrder;
      this.mdl.roiIds = newRegionIdOrder.map(id => {
        return this.mdl.roiIds.find(roi => roi.id === id) || ROILayerVisibility.create({ id, visible: true, opacity: 1, scanId: this.scanId });
      });

      this.saveState();
      this.reDraw();
      this.reloadModel();
    });

    dialogRef.componentInstance.opacityChange.subscribe((change: LayerOpacityChange) => {
      if (change) {
        this.mdl.scanIds.forEach(scanId => {
          const mapLayers = this.mdl.getMapLayers(scanId);
          if (mapLayers) {
            const layer = mapLayers.find(layer => layer.expressionId === change.layer.id);
            if (layer) {
              layer.opacity = change.opacity;
              layer.mapPoints.forEach(point => {
                point.drawParams.colour.a = 255 * change.opacity;
              });
            }
          }
        });
        const region = this.mdl.roiIds.find(roi => roi.id === change.layer.id);
        if (region) {
          region.opacity = change.opacity;
          const scanDrawModel = this.mdl.drawModel.scanDrawModels.get(region.scanId);
          if (scanDrawModel) {
            const regionDrawModel = scanDrawModel.regions.find(roi => roi.roiId === region.id);
            if (regionDrawModel) {
              regionDrawModel.opacity = change.opacity;
            }
          }
        }

        this.saveState();
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
            this.mdl.roiIds.push(ROILayerVisibility.create({ id: roiId, scanId: scanId, opacity: 1, visible: true }));
          }
        }

        this.saveState();
        this.reloadModel();
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

    // TODO: Find better way of storing layer visbility settings
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
        roiLayers: this.mdl.roiIds,
        elementRelativeShading: this.mdl.elementRelativeShading,
        brightness: this.mdl.imageBrightness,
        rgbuChannels: this.mdl.rgbuChannels,
        unselectedOpacity: this.mdl.unselectedOpacity,
        unselectedGrayscale: this.mdl.unselectedGrayscale,
        colourRatioMin: this.mdl.colourRatioMin ?? undefined,
        colourRatioMax: this.mdl.colourRatioMax ?? undefined,
        removeTopSpecularArtifacts: this.mdl.removeTopSpecularArtifacts,
        removeBottomSpecularArtifacts: this.mdl.removeBottomSpecularArtifacts,
        mapLayers: this.mdl.expressionIds.map(id => MapLayerVisibility.create({ expressionID: id, visible: true, opacity: 1 })),
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
        const params = this.getImagePickerParams();
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
