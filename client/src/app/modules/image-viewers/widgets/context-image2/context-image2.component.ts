import { Point } from "@angular/cdk/drag-drop";
import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription, Subject } from "rxjs";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { CanvasSizeNotification } from "../scan-3d-view/interactive-canvas-3d.component";
import { APICachedDataService, AnalysisLayoutService, SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ContextImage2MouseInteraction } from "./mouse-interaction";
import { ContextImage2Model } from "./ctx-image-model";

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

    this.isWidgetDataLoading = false;
    this.mdl.setData();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    this._mouseInteractionHandler.clearMouseEventListeners();
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

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  protected saveState() {
  }
}
