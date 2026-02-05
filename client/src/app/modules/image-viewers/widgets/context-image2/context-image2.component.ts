import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { Subscription, Subject, combineLatest, Observable, map, of, switchMap } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { CanvasSizeNotification } from "../scan-3d-view/interactive-canvas-3d.component";
import { APICachedDataService, AnalysisLayoutService, SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ContextImage2MouseInteraction } from "./mouse-interaction";
import { ContextImage2Model, WheelMode } from "./ctx-image-model";
import * as THREE from 'three';
import { ContextImage2State } from "src/app/generated-protos/widget-data";
import { ImageGetDefaultReq, ImageGetDefaultResp, ImageGetReq, ImageGetResp, ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { Point } from "src/app/models/Geometry";
import { ImagePyramidGetReq, ImagePyramidGetResp } from "src/app/generated-protos/image-pyramid-msgs";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { TileImageLoader } from "./tile-loader";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { getInitialModalPositionRelativeToTrigger } from "src/app/utils/overlay-host";
import { ImageDisplayOptions2, ImageOptions2Component, ImagePickerParams2, ImagePickerResult2 } from "./image-options2/image-options2-component/image-options2.component";

@Component({
  selector: "context-image2",
  standalone: false,
  templateUrl: "./context-image2.component.html",
  styleUrl: "./context-image2.component.scss"
})
export class ContextImage2Component extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  mdl: ContextImage2Model;
  private _mouseInteractionHandler: ContextImage2MouseInteraction;

  private _shownImageOptions: MatDialogRef<ImageOptions2Component> | null = null;

  configuredScanIds: string[] = [];
  cursorShown: string = "";
  scanId: string = "";
 
  private _canvasSize?: Point;
  private _canvasElem?: HTMLCanvasElement;

  private _canvas$: Subject<CanvasSizeNotification> = new Subject<CanvasSizeNotification>();

  private _imageList?: ImageListResp;

  imageDetails: string = "";

  constructor(
      private _cacheDataService: APICachedDataService,
      private _analysisLayoutService: AnalysisLayoutService,
      private _selectionService: SelectionService,
      private _snackService: SnackbarService,
      private _endpointService: APIEndpointsService,
      public dialog: MatDialog
    ) {
    super();

    this.mdl = new ContextImage2Model();
    this._mouseInteractionHandler = new ContextImage2MouseInteraction(this._selectionService, this.mdl);

    this.scanId = this._analysisLayoutService.defaultScanId;
    
    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "wheel-mode",
          type: "multi-state-button",
          options: [WheelMode.SWAP_IMAGE, WheelMode.ZOOM, WheelMode.BRIGHTNESS],
          tooltip: "Decides what the mouse wheel controls",
          value: this.mdl.wheelMode,
          onClick: value => {
            this.mdl.wheelMode = value;
            this.saveState();
          },
        },
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
          id: "reset",
          type: "button",
          icon: "assets/button-icons/reset.svg",
          tooltip: "Reset Zoom and Pan",
          settingTitle: "Reset",
          settingGroupTitle: "Actions",
          onClick: () => this.onResetView(),
        }
      ],
      /*topLeftInsetButton: {
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
      },*/
      bottomToolbar: [
        /*{
          id: "layers",
          type: "button",
          title: "Layers",
          tooltip: "Manage layers of data drawn",
          value: false,
          onClick: (value, trigger) => this.onToggleLayersView(trigger),
        },*/
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

    /*this._subs.add(
      this._selectionService.selection$.subscribe((currSel: SelectionHistoryItem) => {
        this.updateSelection();
      })
    );

    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        this.updateSelection();
      })
    );*/

    this._subs.add(
      this._mouseInteractionHandler.saveState$.subscribe(() => {
        this.saveState();

        // If the state changed enough, we may need to re-display our image info
        this.updateImageDetails();
      })
    );

    this._subs.add(
      this._mouseInteractionHandler.mouseWheel$.subscribe((event: WheelEvent) => {
        this.onMouseWheel(event);
      })
    );

    this._subs.add(
      combineLatest([
        this.widgetData$,
        this._canvas$
      ]).subscribe((items) => {
        const state = items[0] as ContextImage2State;
        const canvasEvent = items[1] as CanvasSizeNotification;

        const needInit = this._canvasSize === undefined || canvasEvent.canvasElement.nativeElement !== this._canvasElem;
        this._canvasSize = canvasEvent.size;
        this._canvasElem = canvasEvent.canvasElement.nativeElement;

        if (needInit) {
          this.init3D(canvasEvent);
        }

        this.applyCanvasSize();

        // If it's our first time here... load!
        if (needInit && (!state || state.contextImage.length <= 0)) {
          this.getDefaultImage().subscribe(
            (resp: string) => {
              this.load(resp)
            }
          )
          return;
        }

        // If not our first time, but we have state, and context image differs from what we have loaded... load!
        if (!needInit && state && state.contextImage != this.mdl.imageName) {
          this.load(state.contextImage);
        }
      }
    ));
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    this._mouseInteractionHandler.clearMouseEventListeners();
  }

  private init3D(canvasEvent: CanvasSizeNotification) {
    console.log(`ContextImage v2 initialising or canvas of size: ${canvasEvent.size.x}x${canvasEvent.size.y}...`);
    this._mouseInteractionHandler.setupMouseEvents(canvasEvent.canvasElement.nativeElement);
  }

  private load(imageName: string) {
    console.log(`ContextImageV2 load: image "${imageName} triggered...`)
    this.isWidgetDataLoading = true;
    this.imageDetails = `Loading ${imageName}...`;

    this._cacheDataService.getImageMeta(ImageGetReq.create({ imageName: imageName })).pipe(
      switchMap((imgResp: ImageGetResp) => {
        if (!imgResp.image || !imgResp.image.pyramidId) {
          throw new Error("Error downloading image structure for: " + imageName);
        }

        // At this point we want the pyramid and the top layer image
        const tileLoader = new TileImageLoader(this._endpointService, imageName);

        const req$ = combineLatest([
          this._cacheDataService.getImagePyramid(ImagePyramidGetReq.create({id: imgResp.image.pyramidId})),
          tileLoader.loadTileImage(),
        ]);

        return req$.pipe(
          map(resps => {
            const pyramidResp = resps[0] as ImagePyramidGetResp;
            const layer0Texture = resps[1] as THREE.Texture;

            if (!pyramidResp.image) {
              throw new Error("Failed to load image pyramid: " + imageName);
            }

            this.mdl.setImage(imageName, imgResp.image!, pyramidResp.image!, layer0Texture, tileLoader);

            this.updateImageDetails();
            this.mdl.needsDraw$.next();

            return null;
          })
        )}
      )
    ).subscribe({
      next: () => {
        this.isWidgetDataLoading = false;
      },
      error: (err) => {
        this._snackService.openError(err);
      }
    });
  }

  onCanvasSize(event: CanvasSizeNotification) {
    this._canvas$.next(event);
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  @HostListener("document:mousemove", ["$event"])
  onGlobalMouseMoveCanvas(event: MouseEvent) {
    if (this._mouseInteractionHandler.isMouseDown()) {
      this._mouseInteractionHandler.onMouseMove(event);
    }
  }

  @HostListener("document:mouseup", ["$event"])
  onGlobalMouseUpCanvas(event: MouseEvent) {
    if (this._mouseInteractionHandler.isMouseDown()) {
      this._mouseInteractionHandler.onMouseUp(event);
    }
  }

  onMouseWheel(event: WheelEvent) {
    let mode = this.mdl.wheelMode;
    
    // if the user is using any modifier keys, we switch to those modes
    if (event.shiftKey) {
      mode = WheelMode.SWAP_IMAGE;
    }

    switch(mode) {
      case WheelMode.SWAP_IMAGE:
        this.switchImage(event.deltaY > 0);
        break;
      //case WheelMode.Z_STACK:
      case WheelMode.BRIGHTNESS:
        this.mdl.stepBrightness(event.deltaY > 0);
        break;
      case WheelMode.ZOOM:
        const zoomPctChange = 0.05;
        if (event.deltaY != 0) {
          let zoomPct = zoomPctChange + 1;
          if (event.deltaY > 0) {
            zoomPct = 1 - zoomPctChange;
          }

          this.mdl.setZoom(this.mdl.zoom * zoomPct);
        }
        break;
    }

    this.saveState();
  }

  private updateImageDetails() {
    
    this.imageDetails = `${this.mdl.getDetails()}]`;
  }

  private switchImage(next: boolean) {
    // If we haven't yet, load the image list
    if (!this._imageList) {
      this._cacheDataService.getImageList(ImageListReq.create({ scanIds: [this.scanId] })).subscribe(
      (resp: ImageListResp) => {
        this._imageList = resp;
        this.switchImageInList(this._imageList, next);
      });
    } else {
      this.switchImageInList(this._imageList, next);
    }
  }

  private switchImageInList(resp: ImageListResp, next: boolean) {
    // Build a list and find where we are in it
    const images: string[] = [];
    let currentIdx = -1;

    for (const img of resp.images) {
      if (this.mdl.imageName == img.imagePath) {
        currentIdx = images.length;
      }

      images.push(img.imagePath);
    }

    if (images.length <= 0) {
      return; // don't cause confusion here!
    }

    // If no index yet, use the first image
    let newIdx = currentIdx;
    if (currentIdx < 0) {
      newIdx = 0;
    } else {
      if (next) {
        newIdx++;
      } else {
        newIdx--;
      }

      // Make sure we haven't gone into weird territory
      if (newIdx < 0) {
        newIdx = images.length-1;
      } else if (newIdx >= images.length) {
        newIdx = 0;
      }
    }

    if (newIdx > -1) {
      this.load(images[newIdx]);
    }
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

    this._shownImageOptions = this.dialog.open(ImageOptions2Component, dialogConfig);
    this._shownImageOptions.componentInstance.optionChange.subscribe((result: ImagePickerResult2) => {
      if (result.options.selectedScanId.length > 0 && result.options.selectedScanId !== this.scanId) {
        this.scanId = result.options.selectedScanId;
      }

      this.mdl.imageSmoothing = result.options.imageSmoothing;
      // TODO!!
      this.mdl.imageBrightness = result.options.imageBrightness;

      this.saveState();

      if (this.mdl.imageName != result.options.currentImage) {
        // If the image has changed, reload
        this.load(result.options.currentImage);
      }

      if (this._shownImageOptions?.componentInstance?.loadOptions) {
        const params = this.getImagePickerParams();
        this._shownImageOptions.componentInstance.loadOptions(params.options);
      }
    });

    this._shownImageOptions.afterClosed().subscribe(() => {
      this._shownImageOptions = null;
    });
  }

  onResetView() {
    this.mdl.resetPanZoom();
  }

  getImagePickerParams(): ImagePickerParams2 {
    // NOTE: This dialog breaks if there are no scans configured, we could notify the user
    //       or we can try to build a list of scan ids from what we're displaying already
    let warnMsg = "";
    let scanIds: string[] = Array.from(this.configuredScanIds);
    if (scanIds.length <= 0) {
      scanIds = [this.scanId];// this.mdl.scanIds;
      //warnMsg = "No scans are configured for this workspace. Please configure one or more!";
    }

    return new ImagePickerParams2(
      scanIds,
      warnMsg,
      new ImageDisplayOptions2(
        this.mdl.imageName,
        this.mdl.imageSmoothing,
        this.mdl.imageBrightness,
        this.scanId
      )
    );
  }

  protected saveState() {
  }

  protected getDefaultImage(): Observable<string> {
    // Get the "default" image for the loaded scan if there is one
    const scanId = this.scanId || this._analysisLayoutService.defaultScanId;

    if (scanId.length <= 0) {
      return of("");
    }

    return this._cacheDataService.getDefaultImage(ImageGetDefaultReq.create({ scanIds: [scanId] })).pipe(
      map((resp: ImageGetDefaultResp) => {
        let img = resp.defaultImagesPerScanId[scanId];
        if (!img) {
          img = "";
        }
        return img;
      }
    ));
  }

  private applyCanvasSize() {
    const renderData = this.mdl.drawModel.renderData;
    if (!renderData) {
      console.error(`Failed to get render data for created scene`);
      return;
    }

    if (!this._canvasSize) {
      console.error(`Failed to get canvas size`);
      return;
    }

    let aspectRatio = this._canvasSize.y / this._canvasSize.x;
    if (!isFinite(aspectRatio)) {
      aspectRatio = 1;
    }

    this.mdl.setViewportSize(this._canvasSize.x, this._canvasSize.y);
  }
}
