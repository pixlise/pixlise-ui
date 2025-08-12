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
import { Scan3DViewState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { SelectionChangerImageInfo } from "src/app/modules/pixlisecore/components/atoms/selection-changer/selection-changer.component";
import { Scan3DToolHost } from "./tools/base";
import { Scan3DViewToolHost } from "./tools/tool-host";

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
export class Scan3DViewComponent extends BaseWidgetModel implements OnInit, OnDestroy, Scan3DToolHost {
  private _subs = new Subscription();

  mdl: Scan3DViewModel;
  toolHost?: Scan3DViewToolHost;

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
    this.toolHost = new Scan3DViewToolHost(this._selectionService, this.mdl);

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

    for (const tool of this.toolHost.tools) {
      this._widgetControlConfiguration.bottomToolbar?.push({
        id: "tool-" + tool.toolId.toString(),
        type: "selectable-button",
        icon: tool.icon,
        value: tool.state != ToolState.OFF,
        onClick: () => this.onToolSelected(tool.toolId),
      });
    }
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
      this.setupMouseEvents(event.canvasElement);
    }
  }

  private setupMouseEvents(canvasElement?: ElementRef) {
    if (!canvasElement) return;
    
    const canvas = canvasElement.nativeElement;
    
    // Remove existing event listeners to avoid duplicates
    canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Add click event listener
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  private onMouseDown(event: MouseEvent) {
    this.toolHost?.onMouseDown(event);
  }

  private onMouseMove(event: MouseEvent) {
    this.toolHost?.onMouseMove(event);
  }

  private onMouseUp(event: MouseEvent) {
    this.toolHost?.onMouseUp(event);
    if (!this.renderData || !this._points) {
      return;
    }

    // We're only interested in mouse clicks not drags
    if (this._mouseMoved) {
      return;
    }

    const canvas = event.target as HTMLCanvasElement;
    if (!canvas) return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Update the picking ray with the camera and mouse position
    this._raycaster.setFromCamera(mouse, this.renderData.camera);

    // Calculate objects intersecting the picking ray
    const intersects = this._raycaster.intersectObject(this._points);

    if (intersects.length > 0) {
      //console.log("intersects", intersects);
      
      // Find the intersection with the smallest distanceToRay (closest to the mouse ray)
      let closestIntersection = intersects[0];
      for (const intersect of intersects) {
        if ((intersect.distanceToRay ?? Infinity) < (closestIntersection.distanceToRay ?? Infinity)) {
          closestIntersection = intersect;
        }
      }
      
      // Get the point index directly from the intersection
      const pointIndex = closestIntersection.index;
      //console.log("closestIntersection", closestIntersection);
      if (pointIndex !== undefined) {
        const pickedPoint = new PickedPoint(
          pointIndex,
          closestIntersection.point.clone(),
          closestIntersection.distanceToRay ?? 0
        );
        
        this.onPointPicked(pickedPoint);
      }
    }
  }

  private onPointPicked(pickedPoint: PickedPoint) {
    //console.log('Point picked:', pickedPoint);
    
    if (!this._points || pickedPoint.pointIndex >= this._pmcForLocs.length) {
      return;
    }
    
    // Get the PMC for this point index
    const pmc = this._pmcForLocs[pickedPoint.pointIndex];
    
    // Notify the selection service, treat this like a hover
    this._selectionService.setHoverEntryPMC(this.scanId, pmc);
    /*
    // Get position from the geometry
    const positions = this._points.geometry.attributes['position'];
    const x = positions.getX(pickedPoint.pointIndex);
    const y = positions.getY(pickedPoint.pointIndex);
    const z = positions.getZ(pickedPoint.pointIndex);
    
    //console.log('Point data:', { pmc, x, y, z, scanId: this.scanId });
    
    // Show a snackbar with the picked point information
    this._snackService.open(
      `Point picked: PMC ${pmc}, Position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)}), UV: (${this._pmcUVs[pickedPoint.pointIndex*2]}, ${this._pmcUVs[pickedPoint.pointIndex*2+1]})`
    );
    
    // Create or update visual indicator at the picked point
    this.updatePickedPointIndicator(x, y, z);
    
    // Here you can add more functionality:
    // - Show detailed information in a panel
    // - Trigger analysis on the selected point
    // - Navigate to related data
    */
  }
/*
  private updatePickedPointIndicator(x: number, y: number, z: number) {
    // Remove existing indicator if it exists
    if (this._pickedPointIndicator) {
      this.renderData.scene.remove(this._pickedPointIndicator);
    }

    // Create a small red sphere as the indicator
    const geometry = new THREE.SphereGeometry(this._pointSize * 1.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(0xff00f6), // Bright magenta/pink color
      transparent: true,
      opacity: 0.5
    });
    
    this._pickedPointIndicator = new THREE.Mesh(geometry, material);
    this._pickedPointIndicator.position.set(x, y, z);
    
    // Add to scene
    this.renderData.scene.add(this._pickedPointIndicator);
    
    // Trigger a redraw to show the indicator
    this.mdl.needsDraw$.next();
  }
*/
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
    if (this.mdl.hidePointsForScans.size > 0 || this.mdl.hideFootprintsForScans.size > 0) {
      this.mdl.hidePointsForScans.clear();
      this.mdl.hideFootprintsForScans.clear();
      if (this._points) {
        this.renderData.scene.add(this._points);
      }
    } else {
      // Add all scan ids to the hide lists
      for (const scanId of this.mdl.scanIds) {
        this.mdl.hidePointsForScans.add(scanId);
        this.mdl.hideFootprintsForScans.add(scanId);
      }
      if (this._points) {
        this.renderData.scene.remove(this._points);
      }
    }

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

    this.mdl.lighting = !this.mdl.lighting;

    let icon = "assets/button-icons/all-points-off.svg";
    if (!this.mdl.lighting) {
      if (this._light) {
        this.renderData.scene.remove(this._light);
        this._terrain!.material = this._terrainMatBasic;
      }
    } else {
      if (this._light) {
        this.renderData.scene.add(this._light);
        this._terrain!.material = this._terrainMatStandard;
      }
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
        //showPoints: this.mdl.hidePointsForScans
        showLight: this.mdl.lighting,
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

      this.mdl.setData(scanId, contextImgModel, scanEntries, beams);
    });
  }

  protected updateSelection() {
    if (this._selection) {
      this.renderData.scene.remove(this._selection);
    }

    this._selection = new THREE.Object3D();

    // Form the points we're drawing the selection for
    const pmcToIdx = new Map<number, number>();
    for (let c = 0; c < this._pmcForLocs.length; c++) {
      pmcToIdx.set(this._pmcForLocs[c], c);
    }


    const sphere = new THREE.SphereGeometry(this._pointSize, 8, 8);
    const matSelect = new THREE.MeshBasicMaterial({
      color: this._selectionColour,
      opacity: 0.5,
      transparent: true,
    });
    const matHover = new THREE.MeshBasicMaterial({
      color: this._hoverColour,
      opacity: 0.5,
      transparent: true,
    });

    const sel = this._selectionService.getCurrentSelection();

    for (const scanId of sel.beamSelection.getScanIds()) {
      // Find which locations we need to highlight. We have a list of PMCs, but we need to map the other way
      const pmcs = sel.beamSelection.getSelectedScanEntryPMCs(scanId);
      for (const pmc of pmcs) {
        let idx = pmcToIdx.get(pmc);
        if (idx !== undefined) {
          idx *= 3;

          let m = new THREE.Mesh(sphere, matSelect);
          m.position.set(this._pmcLocs3D[idx], this._pmcLocs3D[idx+1], this._pmcLocs3D[idx+2]);

          this._selection.add(m);
        }
      }

      if (this._selectionService.hoverScanId == scanId && this._selectionService.hoverEntryPMC > -1) {
        let idx = pmcToIdx.get(this._selectionService.hoverEntryPMC);

        if (idx !== undefined) {
          idx *= 3;

          let m = new THREE.Mesh(sphere, matHover);
          m.position.set(this._pmcLocs3D[idx], this._pmcLocs3D[idx+1], this._pmcLocs3D[idx+2]);

          this._selection.add(m);
        }
      }
    }

    this.renderData.scene.add(this._selection);
    this.mdl.needsDraw$.next();
  }
}