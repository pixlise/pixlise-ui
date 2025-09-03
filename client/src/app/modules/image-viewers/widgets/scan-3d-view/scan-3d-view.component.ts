import { Component, OnInit, OnDestroy, ElementRef } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { BehaviorSubject, catchError, combineLatest, map, mergeMap, Observable, of, scan, Subject, Subscription, switchMap, tap, throwError, toArray } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { Scan3DViewModel } from "./scan-3d-view-model";
import { AnalysisLayoutService, APICachedDataService, ContextImageDataService, SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { CanvasSizeNotification } from "./interactive-canvas-3d.component";
import { Point } from "src/app/models/Geometry";
import * as THREE from 'three';
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { getInitialModalPositionRelativeToTrigger } from "src/app/utils/overlay-host";
import { ImageDisplayOptions, ImageOptionsComponent, ImagePickerParams, ImagePickerResult } from "../context-image/image-options/image-options.component";
import { ImageGetDefaultReq, ImageGetDefaultResp } from "src/app/generated-protos/image-msgs";
import { ContextImageModelLoadedData } from "../context-image/context-image-model-internals";
import { Coordinate4D, LightMode, MapLayerVisibility, ROILayerVisibility, Scan3DViewState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { SelectionChangerImageInfo } from "src/app/modules/pixlisecore/components/atoms/selection-changer/selection-changer.component";
import { Scan3DMouseInteraction } from "./mouse-interaction";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Pane } from 'tweakpane';
import { Coordinate3D } from "src/app/generated-protos/scan-beam-location";
import { coordinate3DToThreeVector3, quaternionToCoordinate4D, vector3ToCoordinate3D } from "src/app/models/Geometry3D";
import { ExpressionPickerComponent, ExpressionPickerData, ExpressionPickerResponse } from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { ROIItem, ROIItemDisplaySettings } from "src/app/generated-protos/roi";
import { ContextImageMapLayer } from "../../models/map-layer";
import { ContextImageLayers, RegionMap } from "../context-image/context-image.component";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { ColourRamp } from "src/app/utils/colours";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { DataExpressionId } from "src/app/expression-language/expression-id";


@Component({
  standalone: false,
  selector: "app-scan-3d-view",
  templateUrl: "./scan-3d-view.component.html",
  styleUrls: ["./scan-3d-view.component.scss"],
})
export class Scan3DViewComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  mdl: Scan3DViewModel;
  private _mouseInteractionHandler: Scan3DMouseInteraction;
  private _tweakPane?: Pane;

  cursorShown: string = "";

  configuredScanIds: string[] = [];
  scanId: string = "";

  private _shownImageOptions: MatDialogRef<ImageOptionsComponent> | null = null;
  private _expressionPickerDialog: MatDialogRef<ExpressionPickerComponent> | null = null;

  private _canvasSize?: Point;
  private _canvasElem?: HTMLCanvasElement;

  private _canvas$: Subject<CanvasSizeNotification> = new Subject<CanvasSizeNotification>();

  // Map layers that were hidden in past - if we re-open the visibility dialog we
  // don't want to lose them because they're time consuming to find and enable
  private _hiddenMapLayers: Map<string, ContextImageMapLayer> = new Map<string, ContextImageMapLayer>();

  constructor(
    private _cacheDataService: APICachedDataService,
    private _contextDataService: ContextImageDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    private _snackService: SnackbarService,
    private _roiService: ROIService,
    public dialog: MatDialog,
    private _elementRef: ElementRef
  ) {
    super();

    this.mdl = new Scan3DViewModel();
    this._mouseInteractionHandler = new Scan3DMouseInteraction(this._selectionService, this.mdl);

    this.scanId = this._analysisLayoutService.defaultScanId;

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          settingTitle: "Solo",
          settingGroupTitle: "Actions",
          onClick: () => this.onSoloView(),
        }
      ],
      topLeftInsetButton: {
        id: "selection",
        type: "selection-changer",
        tooltip: "Selection changer",
        onClick: () => {},
        getImageInfo: () => {
          if (!this.mdl.rgbuSourceImage) {
            return new SelectionChangerImageInfo([], "", this._contextDataService);
          }
          return new SelectionChangerImageInfo(this.mdl.scanIds, this.mdl.imageName, this._contextDataService);
        },
      },
      bottomToolbar: [
        {
          id: "layers",
          type: "button",
          title: "Layers",
          tooltip: "Manage layers of data drawn",
          value: false,
          onClick: (value, trigger) => this.onToggleLayersView(trigger),
        },
        /*{
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Manage regions drawn",
          value: false,
          onClick: () => this.onRegions(),
        },*/
        {
          id: "image",
          type: "button",
          title: "Image",
          margin: "0 auto 0 0",
          tooltip: "Manage images drawn",
          value: false,
          onClick: (value, trigger) => this.onToggleImageOptionsView(trigger),
        },
      ],
    };
  }

  ngOnInit() {
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        if (screenConfiguration) {
          this.configuredScanIds = Object.keys(screenConfiguration.scanConfigurations).map(scanId => scanId);
        }
      })
    );

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
      this._mouseInteractionHandler.saveState$.subscribe(() => {
        this.saveState();
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        if (screenConfiguration) {
          this.configuredScanIds = Object.keys(screenConfiguration.scanConfigurations).map(scanId => scanId);

          // Also, in this case, we forget any hidden layers we had. They're likely no longer
          // relevant, user may have switched quants or something
          this._hiddenMapLayers.clear();
        }
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
      combineLatest([
        this.widgetData$,
        this._canvas$
      ]).subscribe((items) => {
        const scan3DState = items[0] as Scan3DViewState;
        const canvasEvent = items[1] as CanvasSizeNotification;

        this._mouseInteractionHandler.setupMouseEvents(canvasEvent.canvasElement.nativeElement);

        if (!scan3DState || scan3DState.contextImage.length <= 0) {
          this.setInitialConfig();
          return;
        }

        this.mdl.hideFootprintsForScans = new Set<string>((scan3DState?.hideFootprintsForScans || []).filter(s => s.length > 0));
        this.mdl.hidePointsForScans = new Set<string>((scan3DState?.hidePointsForScans || []).filter(s => s.length > 0));
        //this.mdl.drawImage = !(scan3DState?.hideImage ?? false);

        // Set up model
        if (scan3DState.colourRatioMin) {
          this.mdl.colourRatioMin = scan3DState.colourRatioMin;
        }

        if (scan3DState.colourRatioMax) {
          this.mdl.colourRatioMax = scan3DState.colourRatioMax;
        }

        this.mdl.imageBrightness = scan3DState.brightness;
        this.mdl.removeTopSpecularArtifacts = scan3DState.removeTopSpecularArtifacts;
        this.mdl.removeBottomSpecularArtifacts = scan3DState.removeBottomSpecularArtifacts;
        this.mdl.rgbuChannels = scan3DState.rgbuChannels;
        this.mdl.unselectedOpacity = scan3DState.unselectedOpacity;
        this.mdl.unselectedGrayscale = scan3DState.unselectedGrayscale;

        this.mdl.imageName = scan3DState.contextImage;
        this.mdl.imageSmoothing = scan3DState.contextImageSmoothing.length > 0;

        this.mdl.lightMode = scan3DState.lightMode;
        this.mdl.planeYScale = scan3DState.planeYScale;
        this.mdl.showFootprint = scan3DState.showFootprint;

        const validMapLayers = scan3DState.mapLayers.filter(layer => layer?.expressionID && layer.expressionID.length > 0);
        //this.mdl.expressionIds = validMapLayers.map((layer: MapLayerVisibility) => layer.expressionID);

        this.mdl.layerOpacity.clear();
        for (const l of validMapLayers) {
          this.mdl.layerOpacity.set(l.expressionID, l.opacity);
        }

        // For some reason we're getting empty ROIs so filter those out here
        this.mdl.roiIds = [];
        for (const roi of scan3DState.roiLayers) {
          if (roi.id.length > 0) {
            this.mdl.roiIds.push(roi);
          }
        }
        
        if (scan3DState.cameraPosition && scan3DState.cameraRotation && scan3DState.cameraTarget && scan3DState.cameraZoom) {
          this.mdl.setInitialCameraOrientation(scan3DState.cameraPosition, scan3DState.cameraRotation, scan3DState.cameraTarget, scan3DState.cameraZoom);
        }

        if (scan3DState.pointLightPosition) {
          this.mdl.initialPointLightPosition = coordinate3DToThreeVector3(scan3DState.pointLightPosition);
        }

        // Set the all points toggle icon
        const allPointsButton = this._widgetControlConfiguration.topToolbar?.find(b => b.id === "all-points-toggle");
        if (allPointsButton) {
          allPointsButton.icon = this.allPointsToggleIcon;
        }

        this.reloadModel();
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    this._mouseInteractionHandler.clearMouseEventListeners();
    if (this._tweakPane) {
      this._tweakPane.dispose();
    }
  }

  onCanvasSize(event: CanvasSizeNotification) {
    const needInit = this._canvasSize === undefined || event.canvasElement.nativeElement !== this._canvasElem;
    this._canvasSize = event.size;
    this._canvasElem = event.canvasElement.nativeElement;

    // If we have a size and it's the first time it was set, we now load our model data
    if (needInit) {
      console.log(`Scan3D view initialising or canvas of size: ${event.size.x}x${event.size.y}...`);

      // Allow init to function normally
      this._canvas$.next(event);
    }
  }

  protected setInitialConfig() {
    // Get the "default" image for the loaded scan if there is one
    const scanId = this.scanId || this._analysisLayoutService.defaultScanId;

    if (scanId.length > 0) {
      this._cacheDataService.getDefaultImage(ImageGetDefaultReq.create({ scanIds: [scanId] })).subscribe({
        next: (resp: ImageGetDefaultResp) => {
          const img = resp.defaultImagesPerScanId[scanId];
          if (img) {
            // Set this as our default image
            this.mdl.imageName = img;
          } else {
            this.mdl.imageName = "";
          }
          this.reloadModel();
        },
        error: err => {
          this._snackService.openError("Failed to get default image for scan: " + scanId, err);
        },
      });
    }
  }

  get allPointsToggleIcon(): string {
    if (this.mdl.hidePointsForScans.size > 0 || this.mdl.hideFootprintsForScans.size > 0) {
      return "assets/button-icons/all-points-off.svg";
    } else {
      return "assets/button-icons/all-points-on.svg";
    }
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  protected getImagePickerParams(): ImagePickerParams {
    // Read back the versions we're displaying
    const beamLocVersionsDisplayed = new Map<string, number>();
    for (const scanId of this.mdl.scanIds) {
      const scanMdl = this.mdl.getScanModelFor(scanId);
      if (scanMdl) {
        beamLocVersionsDisplayed.set(scanId, scanMdl.beamLocVersion);
      }
    }

    // NOTE: This dialog breaks if there are no scans configured, we could notify the user
    //       or we can try to build a list of scan ids from what we're displaying already
    let warnMsg = "";
    let scanIds: string[] = Array.from(this.configuredScanIds);
    if (scanIds.length <= 0) {
      scanIds = this.mdl.scanIds;
      warnMsg = "No scans are configured for this workspace. Please configure one or more!";
    }

    return new ImagePickerParams(
      scanIds,
      warnMsg,
      new ImageDisplayOptions(
        this.mdl.imageName,
        beamLocVersionsDisplayed,
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
        this.mdl.beamLocationVersionsRequested = result.options.beamVersionMap;
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

  protected saveState() {
    const dir = new THREE.Quaternion();
    this.mdl.drawModel.renderData.camera.getWorldQuaternion(dir);

    // TODO: Find better way of storing layer visbility settings
    // For now, we make a map of opacity so we can write something valid
    const opacityLookup = new Map<string, number>();
    // for (const scanMdl of this.mdl.expressionIds.raw?.scanModels.values() || []) {
    //   for (const m of scanMdl.maps) {
    //     opacityLookup.set(m.expressionId, m.opacity);
    //   }
    // }

    const obj = Scan3DViewState.create({
      contextImage: this.mdl.imageName,
      contextImageSmoothing: this.mdl.imageSmoothing ? "true" : "",
      brightness: this.mdl.imageBrightness,
      rgbuChannels: this.mdl.rgbuChannels,
      unselectedOpacity: this.mdl.unselectedOpacity,
      unselectedGrayscale: this.mdl.unselectedGrayscale,
      colourRatioMin: this.mdl.colourRatioMin ?? undefined,
      colourRatioMax: this.mdl.colourRatioMax ?? undefined,
      removeTopSpecularArtifacts: this.mdl.removeTopSpecularArtifacts,
      removeBottomSpecularArtifacts: this.mdl.removeBottomSpecularArtifacts,
      hideFootprintsForScans: Array.from(this.mdl.hideFootprintsForScans).filter(s => s.length > 0),
      hidePointsForScans: Array.from(this.mdl.hidePointsForScans).filter(s => s.length > 0),
      
      lightMode: this.mdl.lightMode,
      planeYScale: this.mdl.planeYScale,
      showFootprint: this.mdl.showFootprint,
      cameraPosition: vector3ToCoordinate3D(this.mdl.drawModel.renderData.camera.position),
      cameraRotation: quaternionToCoordinate4D(dir),
      cameraZoom: this.mdl.drawModel.renderData.camera.zoom,

      roiLayers: this.mdl.roiIds.filter(roi => roi.id.length > 0),
      mapLayers: this.mdl.expressionIds
      .filter(id => !DataExpressionId.isUnsavedExpressionId(id))
      .map(id =>
        MapLayerVisibility.create({
          expressionID: id,
          visible: !this._hiddenMapLayers.has(id),
          opacity: opacityLookup.get(id) ?? 1,
        })
      ),
    });

    if (this.mdl.drawModel.renderData.orbitControl?.target) {
      obj.cameraTarget = vector3ToCoordinate3D(this.mdl.drawModel.renderData.orbitControl.target);
    }

    if (this.mdl.drawModel.pointLight) {
      obj.pointLightPosition = vector3ToCoordinate3D(this.mdl.drawModel.pointLight.position);
    }

    this.onSaveWidgetData.emit(
      Scan3DViewState.create(obj)
    );
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

      const quantId = this._analysisLayoutService.getQuantIdForScan(scanId);

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

            //this.reDraw("loadMapLayerExpressions");

            this.widgetErrorMessage = "";
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
    return this._roiService.loadROI(roi.id, true).pipe(
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

  protected setupScene() {
    const renderData = this.mdl.drawModel.renderData;
    if (!renderData) {
      console.error(`Failed to get render data for created scene`);
      return;
    }

    renderData.camera = new THREE.PerspectiveCamera(
      60,
      this._canvasSize!.x / this._canvasSize!.y,
      0.01,
      1000
    );
  
    const size = this.mdl.drawModel.bboxMeshPMCs;
    if (size === undefined) {
      console.error(`Failed to get data bounding box`);
      return;
    }

    const dataCenter = size.center();

    if (this.mdl.hasInitialCameraOrientation()) {
      renderData.camera.position.set(this.mdl.initialCameraPosition!.x, this.mdl.initialCameraPosition!.y, this.mdl.initialCameraPosition!.z);
      renderData.camera.setRotationFromQuaternion(this.mdl.initialCameraRotation!);
      renderData.camera.zoom = this.mdl.initialCameraZoom!;
    } else {
      renderData.camera.position.set(dataCenter.x, size.maxCorner.y, size.minCorner.z);//size.minCorner.z - (size.maxCorner.z-size.minCorner.z) * 0.5);
    }

    //this.renderData.camera.lookAt(dataCenter);
    renderData.scene.add(renderData.camera);

    // Set up what to orbit around
    renderData.orbitControl = new OrbitControls(renderData.camera, this._canvasElem);
    renderData.orbitControl.mouseButtons = {
      LEFT: THREE.MOUSE.RIGHT,
      MIDDLE: THREE.MOUSE.MIDDLE,
      RIGHT: THREE.MOUSE.LEFT,
    };

    if (this.mdl.hasInitialCameraOrientation()) {
      renderData.orbitControl.target.set(this.mdl.initialCameraTarget!.x, this.mdl.initialCameraTarget!.y, this.mdl.initialCameraTarget!.z);
    } else {
      renderData.orbitControl.target.set(dataCenter.x, dataCenter.y, dataCenter.z);
    }
    renderData.orbitControl.update();

    // Redraw if camera changes
    renderData.orbitControl.addEventListener("change", (e) => {
      this.mdl.needsDraw$.next();
    });

    // Same for transform
    renderData.transformControl = new TransformControls(renderData.camera, this._canvasElem);
    renderData.transformControl.setSize(0.6);
    renderData.scene.add(renderData.transformControl.getHelper());

    renderData.transformControl.addEventListener("change", (e) => {
      this.mdl.needsDraw$.next();
    });

    // Also if user is dragging transform, disable orbit
    renderData.transformControl.addEventListener("objectChange", (e) => {
      if (renderData.orbitControl) {
        renderData.orbitControl.enabled = false;
      }
    });
    renderData.transformControl.addEventListener("mouseUp", (e) => {
      if (renderData.orbitControl) {
        renderData.orbitControl.enabled = true;
      }

      // Save because of light position!
      this.saveState();
    });
  
    // Now that we've got everything inited (mainly the transform control!) we can tell
    // the model to set the initial state in the scene
    this.mdl.setInitialState();

    this.updateSelection();
    this.mdl.needsDraw$.next();

    // Initialize Tweakpane when canvas is ready
    this.initialiseTweakpane();
  }

  protected reloadModel() {
    if (!this._canvasSize) {
      console.error(`Canvas size unknown`);
      return;
    }

    if (!this._canvasSize.x || !this._canvasSize.y) {
      console.error(`Canvas size invalid for scene: w=${this._canvasSize.x}, h=${this._canvasSize.y}`);
      return;
    }

    this.isWidgetDataLoading = true;
    const scanId = this._analysisLayoutService.defaultScanId;

    const obs: Observable<ContextImageModelLoadedData> =
      this.mdl.imageName.length <= 0 && this.scanId.length > 0
        ? this._contextDataService.getWithoutImage(this.scanId)
        : this._contextDataService.getModelData(this.mdl.imageName, this.mdl.beamLocationVersionsRequested, this._widgetId);

    combineLatest([
      obs,
      //this._contextDataService.getWithoutImage(scanId),
      this._cacheDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })),
      this._cacheDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId: scanId }))
    ]).subscribe(results => {
      const contextImgModel = results[0] as ContextImageModelLoadedData;
      const scanEntries = results[1] as ScanEntryResp;
      const beams = results[2] as ScanBeamLocationsResp;

      if (contextImgModel.scanModels.size > 0) {
        this.scanId = contextImgModel.scanModels.keys().next().value!;
      }

      this.mdl.setData(scanId, contextImgModel, scanEntries, beams).pipe(
        switchMap(
          () => {
            return this.loadMapLayers();
          }
        )
      ).subscribe(
        () => {
          this.isWidgetDataLoading = false;
          this.setupScene();
        }
      );
    });
  }

  protected updateSelection() {
    this.mdl.drawModel.updateSelection(this._selectionService);
    this.mdl.needsDraw$.next();
  }

  private initialiseTweakpane() {
    // Create a container div for Tweakpane that's positioned relative to the component
    const paneContainer = document.createElement('div');
    paneContainer.style.position = 'absolute';
    paneContainer.style.top = '10px';
    paneContainer.style.right = '10px';
    paneContainer.style.zIndex = '1000';
    
    // Append to the component's element instead of document body
    this._elementRef.nativeElement.appendChild(paneContainer);

    // Initialize Tweakpane with the container
    this._tweakPane = new Pane({
      container: paneContainer,
      title: 'View Controls',
      expanded: false
    });

    // Add controls for the 3D view settings
    const viewFolder = this._tweakPane.addFolder({
      title: 'Objects',
      expanded: true
    });

    viewFolder.addBinding(this.mdl, 'showPoints', {
      label: 'Show PMC Points'
    }).on('change', () => {
      this.mdl.needsDraw$.next();
      this.saveState();
    });

    viewFolder.addBinding(this.mdl, 'showFootprint', {
      label: 'Show Footprint'
    }).on('change', () => {
      this.mdl.needsDraw$.next();
      this.saveState();
    });

    viewFolder.addBinding(this.mdl, 'drawTexture', {
      label: 'Show Image'
    }).on('change', () => {
      this.mdl.needsDraw$.next();
      this.saveState();
    });

    viewFolder.addBinding(this.mdl, 'drawWireframe', {
      label: 'Draw Wireframe'
    }).on('change', () => {
      this.mdl.needsDraw$.next();
      this.saveState();
    });

    viewFolder.addBinding(this.mdl, 'heightExaggerationScale', {
      label: 'Height Exaggeration',
      min: 0.1,
      max: 10,
      step: 0.1
    }).on('change', () => {
      this.mdl.needsDraw$.next();
      this.saveState();
    });

    viewFolder.addBinding(this.mdl, 'planeYScale', {
      label: 'Compare Plane Height',
      min: 0,
      max: 1,
      step: 0.01
    }).on('change', () => {
      this.mdl.needsDraw$.next();
      this.saveState();
    });

    const lightingFolder = this._tweakPane.addFolder({
      title: 'Lighting',
      expanded: true
    });

    lightingFolder.addBinding(this.mdl, 'lightMode', {
      label: "Lighting",
      options: {
        "Full Bright": LightMode.LM_UNKNOWN,
        "Point Light": LightMode.LM_POINT,
        "Hemisphere Light": LightMode.LM_ENVIRONMENT
      }
    }).on('change', () => {
      this.mdl.needsDraw$.next();
      this.saveState();
    });

    lightingFolder.addBinding(this.mdl, 'lightIntensity', {
      hidden: this.mdl.lightMode == LightMode.LM_POINT,
      label: 'Light Intensity',
      min: 0.1,
      max: 100,
      step: 0.1
    }).on('change', () => {
      this.mdl.needsDraw$.next();
      this.saveState();
    });
  }
}
