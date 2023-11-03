import { Point } from "src/app/models/Geometry";
import { RGBUImage } from "src/app/models/RGBUImage";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { RGBA, Colours } from "src/app/utils/colours";
import { ContextImageItemTransform } from "../../models/image-transform";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";
import { ContextImageDrawModel, ContextImageModelLoadedData, ContextImageScanModel } from "./context-image-model";

// Over time this has probably become a little redundant, but it's an interface that the tools and UI elements use to access
// the model, and therefore describes what these parts of the system need to interact with
export interface IContextImageModel {
  //needsDraw$: Subject<void>;

  imageName: string;
  displayedChannels: string; // String of what channels to show for R,G,B or a division of 2 channels. Can contain R,G,B,U. Examples: RGB, RBU, R/G

  expressionIds: string[];
  roiIds: string[];

  transform: PanZoom;
  selectionModeAdd: boolean;
  pointColourScheme: ColourScheme;
  pointBBoxColourScheme: ColourScheme;

  clearDrawnLinePoints(): void;
  addDrawnLinePoint(pt: Point): void;
  get drawnLinePoints(): Point[];

  imageTransform: ContextImageItemTransform | null;

  rgbuSourceImage: RGBUImage | null;
  rgbuImageLayerForScale: IColourScaleDataSource;

  uiPhysicalScaleTranslation: Point;
  uiLayerScaleTranslation: Point;

  get scanIds(): string[];

  get raw(): ContextImageModelLoadedData | null;

  getScanModelFor(scanId: string): ContextImageScanModel | null;

  getClosestLocationIdxToPoint(worldPt: Point): { scanId: string; idx: number };
  get drawModel(): ContextImageDrawModel;

  get colourScaleData(): IColourScaleDataSource | null;
}

export enum ColourScheme {
  BW = "BW",
  PURPLE_CYAN = "PURPLE_CYAN",
  RED_GREEN = "RED_GREEN",
}

export function getSchemeColours(scheme: ColourScheme): RGBA[] {
  let a: RGBA;
  let b: RGBA;

  switch (scheme) {
    case ColourScheme.BW:
      a = Colours.BLACK;
      b = Colours.WHITE;
      break;
    case ColourScheme.RED_GREEN:
      a = Colours.CONTEXT_RED;
      b = Colours.CONTEXT_GREEN;
      break;
    case ColourScheme.PURPLE_CYAN:
    default:
      a = Colours.CONTEXT_PURPLE;
      b = Colours.CONTEXT_BLUE;
      break;
  }

  return [a, b];
}
