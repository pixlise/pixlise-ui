import { Component, OnInit, OnDestroy, ElementRef } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { BehaviorSubject, combineLatest, Observable, Subscription } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { Scan3DViewModel } from "./scan-3d-view-model";
import { AnalysisLayoutService, APICachedDataService, ContextImageDataService, SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { CanvasSizeNotification, ThreeRenderData } from "./interactive-canvas-3d.component";
import { Point, Rect } from "src/app/models/Geometry";
import { AxisAlignedBBox } from "src/app/models/Geometry3D";
import * as THREE from 'three';
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Delaunator from "delaunator";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ScanEntry } from "src/app/generated-protos/scan-entry";
import { getInitialModalPositionRelativeToTrigger } from "src/app/utils/overlay-host";
import { ImageDisplayOptions, ImageOptionsComponent, ImagePickerParams, ImagePickerResult } from "../context-image/image-options/image-options.component";
import { ImageGetDefaultReq, ImageGetDefaultResp } from "src/app/generated-protos/image-msgs";
import { ContextImageModelLoadedData } from "../context-image/context-image-model-internals";
import { ScanPoint } from "../../models/scan-point";
import { Colours } from "src/app/utils/colours";
import { MinMax } from "src/app/models/BasicTypes";
import { Scan3DViewState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";

// Class to represent a picked point
class PickedPoint {
  constructor(
    public pointIndex: number,
    public worldPosition: THREE.Vector3,
    public distance: number
  ) {}
}


const positionNumComponents = 3;

@Component({
  standalone: false,
  selector: "app-scan-3d-view",
  templateUrl: "./scan-3d-view.component.html",
  styleUrls: ["./scan-3d-view.component.scss"],
})
export class Scan3DViewComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  mdl: Scan3DViewModel;

  cursorShown: string = "";

  configuredScanIds: string[] = [];
  scanId: string = "";

  private _shownImageOptions: MatDialogRef<ImageOptionsComponent> | null = null;

  renderData: ThreeRenderData = new ThreeRenderData(new THREE.Scene(), new THREE.PerspectiveCamera());
  private _sceneInited = false;
  private _canvasSize?: Point;
  private _canvasElement$ = new BehaviorSubject<ElementRef<any> | undefined>(undefined);

  // The "Draw Model"...
  private _terrain?: THREE.Mesh;
  private _points?: THREE.Points;
  private _light?: THREE.PointLight;
  private _ambientLight = new THREE.AmbientLight(new THREE.Color(1,1,1), 0.2);
  private _selection?: THREE.Object3D;
  
  // Raycasting for point picking
  private _raycaster = new THREE.Raycaster();
  
  // Store PMC data for point lookup
  private _pmcForLocs: number[] = [];
  private _pmcUVs: Float32Array = new Float32Array([]);
  private _pmcLocs3D: number[] = [];
  
  // Visual indicator for picked point
  //private _pickedPointIndicator?: THREE.Mesh;

  private _mouseMoved = false;

  private _terrainMatStandard = new THREE.MeshStandardMaterial({
    color: new THREE.Color(1, 1, 1),
    roughness: 0.5,
    metalness: 0.5
  });
  private _terrainMatBasic = new THREE.MeshBasicMaterial({
    color: new THREE.Color(1, 1, 1)
  });

  private _selectionColour = new THREE.Color(Colours.CONTEXT_BLUE.r/255, Colours.CONTEXT_BLUE.g/255, Colours.CONTEXT_BLUE.b/255);
  private _hoverColour = new THREE.Color(Colours.CONTEXT_PURPLE.r/255, Colours.CONTEXT_PURPLE.g/255, Colours.CONTEXT_PURPLE.b/255);
  private _pointSize: number = 0.02;

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
        }
      ],
      bottomToolbar: [
        {
          id: "image",
          type: "button",
          title: "Image",
          margin: "0 auto 0 0",
          tooltip: "Manage images drawn",
          value: false,
          onClick: (value, trigger) => this.onToggleImageOptionsView(trigger),
        }
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
    this._mouseMoved = false;
  }

  private onMouseMove(event: MouseEvent) {
    this._mouseMoved = true;
  }

  private onMouseUp(event: MouseEvent) {
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
      console.log("closestIntersection", closestIntersection);
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

      this.mdl.setData(contextImgModel);

      let bbox = new AxisAlignedBBox();
      let pmcLocs = this.getBeamXYZs(beams, scanEntries.entries, bbox);
      const bboxCenter = bbox.center();

      // At this point we use a delaunay lib to generate 2D polygons. The z-value is not required for this, we know
      // our surface was scanned from above so polygons generated will be "correct", we just need to add the "z" back

      // First, generate the 2D coordinates needed
      let pmcLocs2D: number[] = [];
      let pmcLocs3D: number[] = [];
      let pmcForLocs: number[] = [];
      for (const [pmc, loc] of pmcLocs.entries()) {
        pmcLocs2D.push(loc.x);
        pmcLocs2D.push(loc.z);

        pmcLocs3D.push(loc.x);
        pmcLocs3D.push(loc.y);
        pmcLocs3D.push(loc.z);

        pmcForLocs.push(pmc);
      }

      const scanMdl = contextImgModel.scanModels.get(scanId);
      const scanPoints = scanMdl?.scanPoints;
      let scanPointLookup = new Map<number, ScanPoint>();

      // If we have an image, we can generate an outer border of locations that give us
      // enough triangle mesh to drape the MCC Image over it
      if (scanPoints && scanPoints.length > 0 && contextImgModel.image) {
      let uvbbox = new AxisAlignedBBox();
        for (const pt of scanPoints) {
          scanPointLookup.set(pt.PMC, pt);
          if (pt.coord) {
            uvbbox.expandToFit(new THREE.Vector3(pt.coord.x, bboxCenter.y, pt.coord.y));
          }
        }

        this.padPMCLocationsToImageBorder(bbox, uvbbox, contextImgModel.image.width, contextImgModel.image.height, pmcLocs2D, pmcLocs3D, pmcForLocs, scanPointLookup);
      }

      const delaunay = new Delaunator(pmcLocs2D);

      // Now associate them back to PMC, hence the xyz, location and form 3D triangles using these indexes
      if (delaunay.triangles.length % 3 != 0) {
        throw new Error("Expected delaunay to deliver a multiple of 3 indexes");
      }

      const terrainGeom = new THREE.BufferGeometry();
      // const normalNumComponents = 3;
      const uvNumComponents = 2;
      terrainGeom.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(pmcLocs3D), positionNumComponents));
      // terrainGeom.setAttribute(
      //     'normal',
      //     new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));

      if (scanPoints && scanPoints.length > 0 && contextImgModel.image) {
        const uvs = this.readUVs(pmcLocs2D, pmcForLocs, scanPointLookup);
        this.processUVs(uvs, contextImgModel.image.width, contextImgModel.image.height);

        this._pmcUVs = uvs;
        terrainGeom.setAttribute(
            'uv',
            new THREE.BufferAttribute(uvs, uvNumComponents));
      }

      terrainGeom.setIndex(new THREE.BufferAttribute(delaunay.triangles, 1));
      terrainGeom.computeVertexNormals();

      // Load the texture if there is one
      // Form triangle mesh
      const terrain = new THREE.Mesh(
        terrainGeom,
        this._terrainMatStandard
      );

      if (contextImgModel.image) {
        const loader = new THREE.TextureLoader();
        const imgDataUrl = THREE.ImageUtils.getDataURL(contextImgModel.image)
        loader.load(imgDataUrl, (texture) => {
          // Texture loaded!
          texture.colorSpace = THREE.SRGBColorSpace;

          // Set it in any materials that need it
          this._terrainMatStandard.map = texture;
          this._terrainMatBasic.map = texture;

          this.continueInitScene(bbox, pmcLocs3D, pmcForLocs, terrain);
        });
      } else {
        this.continueInitScene(bbox, pmcLocs3D, pmcForLocs, terrain);
      }
    });
  }

  protected readUVs(
    pmcLocs2D: number[],
    pmcForLocs: number[],
    scanPointLookup: Map<number, ScanPoint>): Float32Array {
    const uvs = new Float32Array(pmcLocs2D.length)

    let uvWriteIdx = 0;
    for (const pmc of pmcForLocs) {
      const scanPt = scanPointLookup.get(pmc);
      if (scanPt === undefined) {
        throw new Error("Failed to find scan point for PMC: "+pmc);
      }
      if (!scanPt.coord) {
        throw new Error("No beam ij found for PMC: "+pmc);
      }

      if (uvWriteIdx >= uvs.length-1) {
        throw new Error(`Not enough UVs allocated, need more than ${uvs.length}`);
      }

      uvs[uvWriteIdx++] = scanPt.coord!.x;
      uvs[uvWriteIdx++] = scanPt.coord!.y;
    }

    return uvs;
  }

  protected processUVs(
    uvs: Float32Array,
    contextImageWidth: number,
    contextImageHeight: number) {
    for (let c = 0; c < uvs.length; c += 2) {
      uvs[c] = /*1 -*/ (uvs[c] / contextImageWidth); // NOT SURE WHY WE NEED A X-FLIP???
      uvs[c+1] = (1 - (uvs[c+1] / contextImageHeight)); // OpenGL textures start at 0,0 => bottom left corner
    }
  }

  protected padPMCLocationsToImageBorder(
    bbox: AxisAlignedBBox,
    uvbbox: AxisAlignedBBox,
    contextImageWidth: number,
    contextImageHeight: number,
    pmcLocs2D: number[],
    pmcLocs3D: number[],
    pmcForLocs: number[],
    scanPointLookup: Map<number, ScanPoint>) {
    const bboxCenter = bbox.center();

    // Find the conversion factor between pixels and physical units in both directions
    const uvboxSize = new Point(uvbbox.maxCorner.x-uvbbox.minCorner.x, uvbbox.maxCorner.z-uvbbox.minCorner.z);
    const xyzboxSize = new Point(bbox.maxCorner.x-bbox.minCorner.x, bbox.maxCorner.z-bbox.minCorner.z);

    // Calculate diagonal size of both
    const uvDiag = Math.sqrt(uvboxSize.x*uvboxSize.x + uvboxSize.y*uvboxSize.y);
    const xyzDiag = Math.sqrt(xyzboxSize.x*xyzboxSize.x + xyzboxSize.y*xyzboxSize.y);

    // Calculate pixels per physical unit
    const pixPerPhysical = uvDiag / xyzDiag;
  
    // Add the 4 corners of the image
    const rectL = bbox.minCorner.x - uvbbox.minCorner.x / pixPerPhysical;
    const rectT = bbox.minCorner.z - uvbbox.minCorner.z / pixPerPhysical;
    const rectR = bbox.maxCorner.x + (contextImageWidth - uvbbox.maxCorner.x) / pixPerPhysical;
    const rectB = bbox.maxCorner.z + (contextImageHeight - uvbbox.maxCorner.z) / pixPerPhysical;

    pmcLocs2D.push(rectL);
    pmcLocs2D.push(rectT);

    pmcLocs2D.push(rectR);
    pmcLocs2D.push(rectT);

    pmcLocs2D.push(rectR);
    pmcLocs2D.push(rectB);

    pmcLocs2D.push(rectL);
    pmcLocs2D.push(rectB);

    // Originally defined as:
    //let paddedUVs: number[] = [0,0, contextImageWidth,0, contextImageWidth,contextImageHeight, 0,contextImageHeight];
    // But needed a x-flip
    let paddedUVs: number[] = [contextImageWidth,contextImageHeight, 0,contextImageHeight, 0,0, contextImageWidth,0];

    let i = 0;
    for (let c = pmcLocs2D.length-8; c < pmcLocs2D.length; c += 2) {
      pmcLocs3D.push(pmcLocs2D[c]);
      pmcLocs3D.push(bboxCenter.y);
      pmcLocs3D.push(pmcLocs2D[c + 1]);

      const padPMC = -(1+i);
      pmcForLocs.push(padPMC);
      scanPointLookup.set(padPMC, new ScanPoint(padPMC, new Point(paddedUVs[i*2], paddedUVs[i*2+1]), -1, false, false, false, false))
      i++;
    }
  }

  protected continueInitScene(
    bbox: AxisAlignedBBox,
    pmcLocs3D: number[],
    pmcForLocs: number[],
    terrain: THREE.Mesh
  ) {
    // Form point cloud too
    const pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(pmcLocs3D), positionNumComponents));

    // Store PMC data for point lookup
    this._pmcForLocs = [...pmcForLocs];
    this._pmcLocs3D = [...pmcLocs3D];

    const points = new THREE.Points(
      pointsGeom,
      new THREE.PointsMaterial({
        color: this._selectionColour,
        size: this._pointSize,
        sizeAttenuation: true
      })
    );
    points.position.y += 0.002;

    this.isWidgetDataLoading = false;

    this.initScene(terrain, points, bbox, this._canvasElement$.value);
  }

  protected getBeamXYZs(beams: ScanBeamLocationsResp, scanEntries: ScanEntry[], bbox: AxisAlignedBBox): Map<number, THREE.Vector3> {
    let result = new Map<number, THREE.Vector3>();
    
    const scale = 1000;
    for (let c = 0; c < scanEntries.length; c++) {
      const scanEntry = scanEntries[c];
      if(scanEntry.location && scanEntry.normalSpectra) {
        const loc = beams.beamLocations[c];
        const pt = new THREE.Vector3(loc.x * scale, loc.z * scale, loc.y * scale);
        result.set(scanEntry.id, pt);
        bbox.expandToFit(pt);
      }
    }

    return result;
  }

  protected makeLight(lightPos: THREE.Vector3) {
    const pointLight = new THREE.PointLight(new THREE.Color(1,1,1), 10);
    pointLight.position.set(lightPos.x, lightPos.y, lightPos.z);

    const lightPointMat = new THREE.MeshToonMaterial();
    const lightPointBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1), 
      lightPointMat
    );

    pointLight.add(lightPointBox);
    return pointLight;
  }

  protected initScene(
    terrain: THREE.Mesh,
    points: THREE.Points,
    size: AxisAlignedBBox,
    canvasElement?: ElementRef
  ) {
    if (!canvasElement) {
      console.error("initScene called without canvas reference");
      return;
    }
    if (!this._canvasSize) {
      console.error("initScene called without known canvas size");
      return;
    }
    if (this._sceneInited) {
      console.error("initScene already called");
      return;
    }
    this._sceneInited = true;

    const dataCenter = size.center();

    this.renderData.scene.add(this._ambientLight);

    // Add all the stuff to the scene with references separately so we can remove them if toggled 
    this._light = this.makeLight(new THREE.Vector3(dataCenter.x, size.maxCorner.y + (size.maxCorner.y-size.minCorner.y) * 5, dataCenter.z));
    this.renderData.scene.add(this._light);

    this._terrain = terrain;
    this.renderData.scene.add(this._terrain);
    
    this._points = points;
    this.renderData.scene.add(this._points);

    this.updateSelection();

    if (!this._canvasSize.x || !this._canvasSize.y) {
      console.error(`Canvas size invalid for scene: w=${this._canvasSize.x}, h=${this._canvasSize.y}`);
      return;
    }

    this.renderData.camera = new THREE.PerspectiveCamera(
      60,
      this._canvasSize.x / this._canvasSize.y,
      0.001,
      1000
    );

    this.renderData.camera.position.set(dataCenter.x, size.maxCorner.y, size.minCorner.z);//size.minCorner.z - (size.maxCorner.z-size.minCorner.z) * 0.5);

    //this.renderData.camera.lookAt(dataCenter);
    this.renderData.scene.add(this.renderData.camera);

    this.renderData.controls = new OrbitControls(this.renderData.camera, canvasElement!.nativeElement);

    // Set up what to orbit around
    this.renderData.controls.target.set(dataCenter.x, dataCenter.y, dataCenter.z);
    this.renderData.controls.update();

    // Redraw if camera changes
    this.renderData.controls.addEventListener('change', (e) => {
      this.mdl.needsDraw$.next();
    });

    this.mdl.needsDraw$.next();
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