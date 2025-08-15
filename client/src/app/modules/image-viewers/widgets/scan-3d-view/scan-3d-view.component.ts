import { Component, OnInit, OnDestroy, ElementRef } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { BehaviorSubject, combineLatest, Observable, Subscription } from "rxjs";
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
import { LightMode, Scan3DViewState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { SelectionChangerImageInfo } from "src/app/modules/pixlisecore/components/atoms/selection-changer/selection-changer.component";
import { Scan3DMouseInteraction } from "./mouse-interaction";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// Class to represent a picked point
class PickedPoint {
  constructor(
    public pointIndex: number,
    public worldPosition: THREE.Vector3,
    public distance: number
  ) {}
}

@Component({
  standalone: false,
  selector: "app-scan-3d-view",
  templateUrl: "./scan-3d-view.component.html",
  styleUrls: ["./scan-3d-view.component.scss"],
})
export class Scan3DViewComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  mdl: Scan3DViewModel;
  private _mouseInteractionHandler?: Scan3DMouseInteraction;

  cursorShown: string = "";

  configuredScanIds: string[] = [];
  scanId: string = "";

  private _shownImageOptions: MatDialogRef<ImageOptionsComponent> | null = null;

  private _canvasSize?: Point;
  private _canvasElement$ = new BehaviorSubject<ElementRef<any> | undefined>(undefined);

  constructor(
    private _cacheDataService: APICachedDataService,
    private _contextDataService: ContextImageDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    private _snackService: SnackbarService,
    public dialog: MatDialog
  ) {
    super();

    this.mdl = new Scan3DViewModel();

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
        },
        {
          id: "all-points-toggle",
          type: "button",
          icon: "assets/button-icons/all-points-on.svg",
          tooltip: "Show all points",
          settingTitle: "Show All Points",
          settingGroupTitle: "Actions",
          value: false,
          onClick: (value, trigger) => this.onToggleAllPoints(trigger),
        },
        {
          id: "light-toggle",
          type: "button",
          icon: "assets/button-icons/all-points-on.svg",
          tooltip: "Toggle Lighting",
          settingTitle: "Toggle Lighting",
          settingGroupTitle: "Actions",
          value: false,
          onClick: (value, trigger) => this.onToggleLighting(trigger),
        },
        {
          id: "plane-toggle",
          type: "button",
          icon: "assets/button-icons/all-points-on.svg",
          tooltip: "Toggle Plane",
          settingTitle: "Toggle Plane",
          settingGroupTitle: "Actions",
          value: false,
          onClick: (value, trigger) => this.onTogglePlane(trigger),
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
        /*{
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
      combineLatest([
        this.widgetData$,
        this._canvasElement$
      ]).subscribe((initItems) => {
        const scan3DState = initItems[0] as Scan3DViewState;
        const canvasElement = initItems[1] as ElementRef<any> | undefined;

        if (!canvasElement) {
          console.warn("Skipping scan 3d view init, no canvas element");
          return;
        }

        if (scan3DState && scan3DState.contextImage.length > 0) {
          this.mdl.hideFootprintsForScans = new Set<string>(scan3DState?.hideFootprintsForScans || []);
          this.mdl.hidePointsForScans = new Set<string>(scan3DState?.hidePointsForScans || []);
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

          // Set the all points toggle icon
          const allPointsButton = this._widgetControlConfiguration.topToolbar?.find(b => b.id === "all-points-toggle");
          if (allPointsButton) {
            allPointsButton.icon = this.allPointsToggleIcon;
          }

          this.reloadModel();
        } else {
          this.setInitialConfig();
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
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    this._mouseInteractionHandler?.clearMouseEventListeners();
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

  onCanvasSize(event: CanvasSizeNotification) {
    const isFirst = this._canvasSize === undefined;
    this._canvasSize = event.size;

    // If we have a size and it's the first time it was set, we now load our model data
    if (isFirst && this._canvasSize) {
      this._canvasElement$.next(event.canvasElement);

      this._mouseInteractionHandler = new Scan3DMouseInteraction(this.scanId, this._selectionService, this.mdl);
      this._mouseInteractionHandler.setupMouseEvents(event.canvasElement);
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

  onToggleAllPoints(trigger: Element | undefined) {
    this.mdl.toggleShowPoints(this.scanId);

    // Update the button icon
    const allPointsButton = this._widgetControlConfiguration.topToolbar?.find(b => b.id === "all-points-toggle");
    if (allPointsButton) {
      allPointsButton.icon = this.allPointsToggleIcon;
    }

    // this.reloadModel();
    this.mdl.needsDraw$.next();
    this.saveState();
  }

  onToggleLighting(trigger: Element | undefined) {
    const btn = this._widgetControlConfiguration.topToolbar?.find(b => b.id === "light-toggle");

    this.mdl.lightMode = this.mdl.lightMode == LightMode.LM_UNKNOWN ? LightMode.LM_POINT : LightMode.LM_UNKNOWN;

    let icon = "assets/button-icons/all-points-off.svg";
    if (this.mdl.lightMode != LightMode.LM_UNKNOWN) {
      icon = "assets/button-icons/all-points-on.svg";
    }

    if(btn) {
      btn.icon = icon;
    }

    // this.reloadModel();
    this.mdl.needsDraw$.next();
    this.saveState();
  }

  onTogglePlane(trigger: Element | undefined) {
    const btn = this._widgetControlConfiguration.topToolbar?.find(b => b.id === "light-toggle");

    this.mdl.planeYScale = this.mdl.planeYScale < 0 ? 0.5 : -1;

    let icon = "assets/button-icons/all-points-off.svg";
    if (this.mdl.planeYScale <= 0) {
      icon = "assets/button-icons/all-points-on.svg";
    }

    if(btn) {
      btn.icon = icon;
    }

    // this.reloadModel();
    this.mdl.needsDraw$.next();
    this.saveState();
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

  protected saveState() {
    this.onSaveWidgetData.emit(
      Scan3DViewState.create({
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
        hideFootprintsForScans: Array.from(this.mdl.hideFootprintsForScans),
        hidePointsForScans: Array.from(this.mdl.hidePointsForScans),
        lightMode: this.mdl.lightMode,
        planeYScale: this.mdl.planeYScale
      })
    );
  }

  protected reloadModel() {
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

      this.mdl.setData(scanId, contextImgModel, scanEntries, beams).subscribe(
        () => {
          this.isWidgetDataLoading = false;

          this.updateSelection();

          if (!this._canvasSize) {
            console.error(`Canvas size unknown`);
            return;
          }

          if (!this._canvasSize.x || !this._canvasSize.y) {
            console.error(`Canvas size invalid for scene: w=${this._canvasSize.x}, h=${this._canvasSize.y}`);
            return;
          }

          const canvasElement = this._canvasElement$.value;
          if (!canvasElement) {
            console.error("initScene called without canvas reference");
            return;
          }

          const renderData = this.mdl.drawModel.renderData;
          if (!renderData) {
            console.error(`Failed to get render data for created scene`);
            return;
          }
        
          renderData.camera = new THREE.PerspectiveCamera(
            60,
            this._canvasSize.x / this._canvasSize.y,
            0.001,
            1000
          );
        
          const size = this.mdl.drawModel.bboxMCC;
          const dataCenter = size.center();

          renderData.camera.position.set(dataCenter.x, size.maxCorner.y, size.minCorner.z);//size.minCorner.z - (size.maxCorner.z-size.minCorner.z) * 0.5);
        
          //this.renderData.camera.lookAt(dataCenter);
          renderData.scene.add(renderData.camera);
        
          renderData.orbitControl = new OrbitControls(renderData.camera, canvasElement!.nativeElement);
        
          // Set up what to orbit around
          renderData.orbitControl.target.set(dataCenter.x, dataCenter.y, dataCenter.z);
          renderData.orbitControl.update();

          renderData.transformControl = new TransformControls(renderData.camera, canvasElement!.nativeElement);
          renderData.scene.add(renderData.transformControl.getHelper());

          // Redraw if camera changes
          renderData.orbitControl.addEventListener("change", (e) => {
            this.mdl.needsDraw$.next();
          });

          // Same for transform
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
          });
        
          this.mdl.needsDraw$.next();
        }
      );
    });
  }

  protected updateSelection() {
    this.mdl.drawModel.updateSelection(this._selectionService);
    this.mdl.needsDraw$.next();
  }
}