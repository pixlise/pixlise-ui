import { ContextImageItemTransform } from "../../../models/image-transform";

export function drawImageOrMaskWithOptionalTransform(
  screenContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  img: HTMLImageElement,
  transform: ContextImageItemTransform | null
) {
  let imgW = img.width;
  let imgH = img.height;

  let imgX = 0;
  let imgY = 0;

  if (transform) {
    // We need to take the offset/scale and transform so the position the image is drawn at shows the matched area (with aligned image)
    // in the same spot as when viewing the aligned image.

    // We calculate the offset and scale it (matched image area is likely higher res so we store a scale and apply it here)
    imgX = transform.calcXPos();
    imgY = transform.calcYPos();

    // Also scale the matched image to have the matched area at the same width/height as the aligned image
    imgW = transform.calcWidth(imgW);
    imgH = transform.calcHeight(imgH);
  }

  screenContext.drawImage(img, imgX, imgY, imgW, imgH);
}
