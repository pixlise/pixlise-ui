import { Component, OnDestroy, OnInit } from "@angular/core";
import { MultiChannelViewerModel } from "./multi-channel-viewer-model";
import { MultiChannelViewerInteraction } from "./multi-channel-viewer-interaction";
import { MultiChannelViewerDrawer } from "./multi-channel-viewer-drawer";
import { Subscription } from "rxjs";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { SliderValue } from "src/app/modules/pixlisecore/components/atoms/slider/slider.component";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { RGBUImage } from "src/app/models/RGBUImage";
import { MatSelectChange } from "@angular/material/select";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { RGBUImagesWidgetState } from "src/app/generated-protos/widget-data";

@Component({
  selector: "app-multi-channel-viewer",
  templateUrl: "./multi-channel-viewer.component.html",
  styleUrls: ["./multi-channel-viewer.component.scss"],
})
export class MultiChannelViewerComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl: MultiChannelViewerModel;
  drawer: CanvasDrawer;
  toolhost: MultiChannelViewerInteraction;

  private _subs = new Subscription();

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _cachedDataService: APICachedDataService,
    private _endpointsService: APIEndpointsService
  ) {
    super();

    this.mdl = new MultiChannelViewerModel();

    this.toolhost = new MultiChannelViewerInteraction(this.mdl);
    this.drawer = new MultiChannelViewerDrawer(this.mdl);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          onClick: () => this.onSoloView(),
        },
      ],
    };
  }

  ngOnInit() {
    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const state = data as RGBUImagesWidgetState;
        if (state) {
          this.mdl.brightness = state.brightness;
          this.loadImage(state.imageName);
        } else {
          this.setInitialConfig();
        }
      })
    );

    this.reDraw();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private setInitialConfig() {
    // If we don't have anything showing yet, just show the first one...
    if (!this._analysisLayoutService.defaultScanId) {
      return;
    }

    this._cachedDataService.getImageList(ImageListReq.create({ scanIds: [this._analysisLayoutService.defaultScanId] })).subscribe((resp: ImageListResp) => {
      for (const img of resp.images) {
        if (img.purpose == ScanImagePurpose.SIP_MULTICHANNEL) {
          this.loadImage(img.imagePath);
        }
      }
    });
  }

  private saveState(): void {
    this.onSaveWidgetData.emit(
      RGBUImagesWidgetState.create({
        brightness: this.mdl.brightness,
        imageName: this.mdl.imageName,
      })
    );
  }

  get cursorShown(): string {
    return CursorId.panCursor;
  }

  reDraw() {
    this.mdl.needsDraw$.next();
  }

  get interactionHandler() {
    return this.toolhost;
  }

  get transform(): PanZoom {
    return this.mdl.transform;
  }

  get scanIdsForRGBUPicker(): string[] {
    if (!this._analysisLayoutService.defaultScanId) {
      return [];
    }

    return [this._analysisLayoutService.defaultScanId];
  }

  get brightness(): number {
    return this.mdl.brightness;
  }

  onChangeBrightness(value: SliderValue) {
    this.mdl.brightness = value.value;
    if (value.finish) {
      this.mdl.setRecalcNeeded();
      this.saveState();
    }
  }

  onResetBrightness() {
    this.mdl.brightness = 1;
    this.mdl.setRecalcNeeded();
    this.saveState();
  }

  onImageChanged(change: MatSelectChange) {
    if (this.mdl.imageName == change.value) {
      // No change, stop here
      return;
    }

    this.loadImage(change.value);
  }

  onSoloView() {}

  private loadImage(imagePath: string) {
    this._endpointsService.loadRGBUImageTIF(imagePath).subscribe((img: RGBUImage) => {
      this.mdl.imageName = imagePath;
      this.mdl.setData(img, null, null);

      this.saveState();
    });
  }
}
