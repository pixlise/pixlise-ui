import { combineLatest, Observable, of, Subject } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { RGBUImage } from "src/app/models/RGBUImage";
import { CanvasDrawNotifier, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";

export class MultiChannelViewerModel implements CanvasDrawNotifier {
  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom(new MinMax(1, null), new MinMax(1, null));

  imageName: string = "";
  protected _brightness: number = 1;

  // The raw data we start with
  raw: RGBUImage | null = null;
  maskImage: HTMLImageElement | null = null;
  cropMaskImage: HTMLImageElement | null = null;

  // The drawable data (derived from the above)
  drawModel: MultiChannelViewerDrawModel = new MultiChannelViewerDrawModel();

  private _lastCalcCanvasParams: CanvasParams | null = null;
  private _recalcNeeded = true;

  setData(image: RGBUImage, maskImage: HTMLImageElement | null, cropMaskImage: HTMLImageElement | null) {
    this.raw = image;
    this.maskImage = maskImage;
    this.cropMaskImage = cropMaskImage;

    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  get brightness(): number {
    return this._brightness;
  }

  set brightness(v: number) {
    this._brightness = v;
  }

  hasRawData(): boolean {
    return this.raw != null;
  }

  recalcDisplayDataIfNeeded(canvasParams: CanvasParams): Observable<void> {
    if (this._recalcNeeded || !this._lastCalcCanvasParams || !this._lastCalcCanvasParams.equals(canvasParams)) {
      this.regenerate();

      this._lastCalcCanvasParams = canvasParams;
      this._recalcNeeded = false;
    }
    return of(void 0);
  }

  setRecalcNeeded() {
    this._recalcNeeded = true;
    this.needsDraw$.next();
  }

  private regenerate() {
    this.drawModel.regenerate(this);
  }
}

export class MultiChannelViewerDrawModel {
  drawnData: OffscreenCanvas | null = null;

  public channelDisplayImages: HTMLImageElement[] = [];
  public maskImage: HTMLImageElement | null = null;
  public cropMaskImage: HTMLImageElement | null = null;

  regenerate(fromModel: MultiChannelViewerModel) {
    if (fromModel.raw) {
      this.regenerateDisplayImages(fromModel.raw, fromModel.brightness, fromModel);
    }
    this.maskImage = fromModel.maskImage;
    this.cropMaskImage = fromModel.cropMaskImage;
  }

  protected regenerateDisplayImages(rgbuImage: RGBUImage, brightness: number, model: MultiChannelViewerModel): void {
    const channelFloatImages = [rgbuImage.r, rgbuImage.g, rgbuImage.b, rgbuImage.u];
    this.channelDisplayImages = [];

    const obs$ = [];

    for (let c = 0; c < channelFloatImages.length; c++) {
      obs$.push(channelFloatImages[c].generateDisplayImage(rgbuImage.allChannelMinMax.max || 1, brightness, false));
    }

    combineLatest(obs$).subscribe((channels: HTMLImageElement[]) => {
      this.channelDisplayImages = channels;
      model.needsDraw$.next();
    });
  }
}
