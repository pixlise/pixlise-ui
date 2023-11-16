import { Subject } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { RGBUImage } from "src/app/models/RGBUImage";
import { CanvasDrawNotifier } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom, PanRestrictorToCanvas } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";

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

  setData(image: RGBUImage, maskImage: HTMLImageElement | null, cropMaskImage: HTMLImageElement | null) {
    this.raw = image;
    this.maskImage = maskImage;
    this.cropMaskImage = cropMaskImage;

    this.drawModel.regenerate(this);
    this.needsDraw$.next();
  }

  get brightness(): number {
    return this._brightness;
  }

  set brightness(v: number) {
    this._brightness = v;
  }

  regenerate() {
    this.drawModel.regenerate(this);
    this.needsDraw$.next();
  }
}

export class MultiChannelViewerDrawModel {
  public channelDisplayImages: HTMLImageElement[] = [];
  public maskImage: HTMLImageElement | null = null;
  public cropMaskImage: HTMLImageElement | null = null;

  regenerate(fromModel: MultiChannelViewerModel) {
    if (fromModel.raw) {
      this.regenerateDisplayImages(fromModel.raw, fromModel.brightness);
    }
    this.maskImage = fromModel.maskImage;
    this.cropMaskImage = fromModel.cropMaskImage;
  }

  protected regenerateDisplayImages(rgbuImage: RGBUImage, brightness: number): void {
    const channelFloatImages = [rgbuImage.r, rgbuImage.g, rgbuImage.b, rgbuImage.u];
    this.channelDisplayImages = [];

    for (let c = 0; c < channelFloatImages.length; c++) {
      this.channelDisplayImages.push(channelFloatImages[c].generateDisplayImage(rgbuImage.allChannelMinMax.max || 1, brightness, false));
    }
  }
}
