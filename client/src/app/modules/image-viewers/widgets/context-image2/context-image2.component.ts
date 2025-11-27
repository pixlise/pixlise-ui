import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription, Subject, combineLatest, Observable, map, of, switchMap } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { CanvasSizeNotification } from "../scan-3d-view/interactive-canvas-3d.component";
import { APICachedDataService, AnalysisLayoutService, SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ContextImage2MouseInteraction } from "./mouse-interaction";
import { ContextImage2Model } from "./ctx-image-model";
import * as THREE from 'three';
import { ContextImage2State } from "src/app/generated-protos/widget-data";
import { ImageGetDefaultReq, ImageGetDefaultResp, ImageGetReq, ImageGetResp } from "src/app/generated-protos/image-msgs";
import { Point } from "src/app/models/Geometry";
import { ImagePyramidGetReq, ImagePyramidGetResp } from "src/app/generated-protos/image-pyramid-msgs";

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

  configuredScanIds: string[] = [];
  cursorShown: string = "";
  scanId: string = "";
 
  private _canvasSize?: Point;
  private _canvasElem?: HTMLCanvasElement;

  private _canvas$: Subject<CanvasSizeNotification> = new Subject<CanvasSizeNotification>();

  constructor(
      private _cacheDataService: APICachedDataService,
      private _analysisLayoutService: AnalysisLayoutService,
      private _selectionService: SelectionService,
      private _snackService: SnackbarService,
    ) {
    super();

    this.mdl = new ContextImage2Model();
    this._mouseInteractionHandler = new ContextImage2MouseInteraction(this._selectionService, this.mdl);

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
        /*{
          id: "image",
          type: "button",
          title: "Image",
          margin: "0 auto 0 0",
          tooltip: "Manage images drawn",
          value: false,
          onClick: (value, trigger) => this.onToggleImageOptionsView(trigger),
        }*/
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

    this._cacheDataService.getImageMeta(ImageGetReq.create({ imageName: imageName })).pipe(
      switchMap((imgResp: ImageGetResp) => {
        if (!imgResp.image || !imgResp.image.pyramidId) {
          throw new Error("Error downloading image structure for: " + imageName);
        }

        return this._cacheDataService.getImagePyramid(ImagePyramidGetReq.create({id: imgResp.image.pyramidId})).pipe(
          map((pyramidResp: ImagePyramidGetResp) => {
            if (!pyramidResp.image) {
              throw new Error("Failed to load image pyramid: " + imageName);
            }

            this.mdl.setData(imageName, imgResp.image!, pyramidResp.image!);
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

  onResetView() {
    this.mdl.resetPanZoom();
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
/*
    renderData.camera = new THREE.PerspectiveCamera(
      60,
      this._canvasSize!.x / this._canvasSize!.y,
      0.1,
      1000
    );
*/
    let aspectRatio = this._canvasSize.y / this._canvasSize.x;
    if (!isFinite(aspectRatio)) {
      aspectRatio = 1;
    }

    // renderData.camera = new THREE.OrthographicCamera(-w/2, w/2, h/2, -h/2, 0, 100);
    // renderData.camera = new THREE.OrthographicCamera(0, w, 0, h, 0, 100);
    //renderData.camera = new THREE.OrthographicCamera(0, 100, 0, aspectRatio*100, 0, 100);
    renderData.camera = new THREE.OrthographicCamera(0, this._canvasSize!.x, 0, this._canvasSize!.y, 0, 100);

    //this.renderData.camera.lookAt(dataCenter);
    renderData.scene.add(renderData.camera);

    this.mdl.setViewportSize(this._canvasSize.x, this._canvasSize.y);

    //console.log(`applyCanvasSize: ${this._canvasSize!.x} x ${this._canvasSize!.y}`);
  }
}
