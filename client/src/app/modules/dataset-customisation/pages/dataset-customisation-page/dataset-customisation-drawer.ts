import { ContextImageDrawer } from "src/app/modules/image-viewers/image-viewers.module";
import { DatasetCustomisationModel } from "./dataset-customisation-model";
import { CanvasDrawParameters, CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { drawImageOrMaskWithOptionalTransform } from "src/app/modules/image-viewers/widgets/context-image/drawlib/draw-image";

class OverlayImageDrawer implements CanvasDrawer {
  constructor(private _mdl: DatasetCustomisationModel) {}

  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters) {
    // We draw the overlay image only
    if (this._mdl.overlayImage) {
      screenContext.globalAlpha = this._mdl.overlayOpacity;
      drawImageOrMaskWithOptionalTransform(screenContext, this._mdl.overlayImage, this._mdl.overlayImageTransform);
      screenContext.globalAlpha = 1;
    }
  }
}

class OneExtraDrawer {
  constructor(private _drawer: CanvasDrawer) {}

  getToolDrawers(): CanvasDrawer[] {
    return [this._drawer];
  }
  getUIDrawers(): CanvasDrawer[] {
    return [];
  }
}

export class DatasetCustomisationDrawer extends ContextImageDrawer {
  constructor(ctx: DatasetCustomisationModel) {
    super(ctx, new OneExtraDrawer(new OverlayImageDrawer(ctx)));
  }

  override drawPostData(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    // Set it so we're centered to start with
    screenContext.save();
    /*if (this._mdl.drawModel.image) {
      screenContext.translate(
        (drawParams.drawViewport.width - this._mdl.drawModel.image.width) / 2,
        (drawParams.drawViewport.height - this._mdl.drawModel.image.height) / 2
      );
    }*/

    //drawParams.worldTransform.applyTransform(screenContext);
    // If the overlay image and the image we loaded the context image model for are the same, don't
    // draw the context image!
    const mdl = this._mdl as DatasetCustomisationModel;
    if (mdl.overlayImageName == mdl.imageName) {
      mdl.drawImage = false;
    }

    super.drawPostData(screenContext, drawParams);
    screenContext.restore();
  }
}
