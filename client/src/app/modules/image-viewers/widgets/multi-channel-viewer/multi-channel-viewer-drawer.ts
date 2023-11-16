import { Point, Rect } from "src/app/models/Geometry";
import { CanvasDrawer, CanvasDrawParameters } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { Colours } from "src/app/utils/colours";
import { MultiChannelViewerModel } from "./multi-channel-viewer-model";

export class MultiChannelViewerDrawer implements CanvasDrawer {
  protected _mdl: MultiChannelViewerModel;

  constructor(mdl: MultiChannelViewerModel) {
    this._mdl = mdl;
  }

  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (!this._mdl || !this._mdl.raw) {
      return;
    }

    const panelWidth = drawParams.drawViewport.width / 2;
    const panelHeight = drawParams.drawViewport.height / 2;

    const transform = this._mdl.transform;

    const ourPanelCenter = new Point(panelWidth / 2, panelHeight / 2);

    // NOTE: we want to use the context image center to work out how to transform our image, but if we can't get it
    // for eg because context image widget is not present, we init with our own center so we just do "local" transform
    // manipulation - if context image becomes available our transform will be reset anyway
    const contextCanvasCenter = transform.canvasParams ? transform.canvasParams.getCenterPoint() : ourPanelCenter;

    // Need to transform points to the top-left coord of the context canvas, then to the middle of our canvas, so
    // the translation is:
    const centeringTranslation = new Point(-contextCanvasCenter.x + ourPanelCenter.x, -contextCanvasCenter.y + ourPanelCenter.y);

    // Work out a width and height to draw the images
    const imageWidth = this._mdl.raw.r.width * transform.scale.x;
    const imageHeight = this._mdl.raw.r.height * transform.scale.y;

    // Draw all 4 images
    const viewportRects = [
      new Rect(0, 0, panelWidth, panelHeight),
      new Rect(panelWidth, 0, panelWidth, panelHeight),
      new Rect(0, panelHeight, panelWidth, panelHeight),
      new Rect(panelWidth, panelHeight, panelWidth, panelHeight),
    ];
    const imageDrawRects = [
      new Rect(0, 0, imageWidth, imageHeight),
      new Rect(panelWidth, 0, imageWidth, imageHeight),
      new Rect(0, panelHeight, imageWidth, imageHeight),
      new Rect(panelWidth, panelHeight, imageWidth, imageHeight),
    ];

    const labels = ["Near Infra-red", "Green", "Blue", "Ultraviolet"];
    const labelColours = [Colours.RGBU_RED.asString(), Colours.RGBU_GREEN.asString(), Colours.RGBU_BLUE.asString(), Colours.GRAY_10.asString()];

    const labelOffset = 8;
    const labelFontSize = 12;

    screenContext.textAlign = "start";
    screenContext.textBaseline = "top";
    screenContext.font = "bold " + labelFontSize + "px Roboto";

    for (let ch = 0; ch < this._mdl.drawModel.channelDisplayImages.length; ch++) {
      screenContext.save();

      // Set up for only drawing within the viewport defined...
      screenContext.beginPath();
      screenContext.rect(viewportRects[ch].x, viewportRects[ch].y, viewportRects[ch].w, viewportRects[ch].h);
      screenContext.clip();

      if (this._mdl.drawModel.channelDisplayImages[ch]) {
        const imgRect = new Rect(imageDrawRects[ch].x, imageDrawRects[ch].y, imageDrawRects[ch].w, imageDrawRects[ch].h);

        imgRect.x += centeringTranslation.x;
        imgRect.y += centeringTranslation.y;

        imgRect.x += transform.pan.x;
        imgRect.y += transform.pan.y;

        screenContext.drawImage(this._mdl.drawModel.channelDisplayImages[ch], imgRect.x, imgRect.y, imgRect.w, imgRect.h);

        // Draw mask image on top to show selection
        if (this._mdl.drawModel.maskImage) {
          screenContext.drawImage(this._mdl.drawModel.maskImage, imgRect.x, imgRect.y, imgRect.w, imgRect.h);
        }

        if (this._mdl.drawModel.cropMaskImage) {
          screenContext.drawImage(this._mdl.drawModel.cropMaskImage, imgRect.x, imgRect.y, imgRect.w, imgRect.h);
        }
      }

      const txtSize = screenContext.measureText(labels[ch]);
      screenContext.fillStyle = Colours.GRAY_80.asStringWithA(0.5);
      screenContext.fillRect(viewportRects[ch].x + labelOffset / 2, viewportRects[ch].y + labelOffset / 2, txtSize.width + labelOffset, labelFontSize + labelOffset);

      screenContext.fillStyle = labelColours[ch];
      screenContext.fillText(labels[ch], viewportRects[ch].x + labelOffset, viewportRects[ch].y + labelOffset);

      screenContext.restore();
    }
  }
}
