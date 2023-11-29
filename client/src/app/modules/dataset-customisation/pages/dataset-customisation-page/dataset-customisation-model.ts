import { ContextImageItemTransform, ContextImageModel } from "src/app/modules/image-viewers/image-viewers.module";

export class DatasetCustomisationModel extends ContextImageModel {
  overlayBrightness: number = 1;
  overlayOpacity: number = 0.5;
  overlayImagePath: string = "";
  overlayImageName: string = "";
  overlayImage: HTMLImageElement | null = null;
  overlayImageTransform: ContextImageItemTransform | null = null;
}
