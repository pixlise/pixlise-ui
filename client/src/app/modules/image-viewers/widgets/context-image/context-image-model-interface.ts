import { Point } from "src/app/models/Geometry";
import { RGBUImage } from "src/app/models/RGBUImage";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { RGBA, Colours } from "src/app/utils/colours";
import { ContextImageItemTransform } from "../../models/image-transform";
import { ContextImageDrawModel, ContextImageModelLoadedData, ContextImageScanModel } from "./context-image-model-internals";
import { MapColourScaleModel, MapColourScaleSourceData } from "./ui-elements/map-colour-scale/map-colour-scale-model";
import { ROILayerVisibility, VisibleROI } from "src/app/generated-protos/widget-data";

// Over time this has probably become a little redundant, but it's an interface that the tools and UI elements use to access
// the model, and therefore describes what these parts of the system need to interact with
export interface IContextImageModel {
  //needsDraw$: Subject<void>;

  imageName: string;
  beamLocationVersionsRequested: Map<string, number>;
  rgbuChannels: string; // String of what channels to show for R,G,B or a division of 2 channels. Can contain R,G,B,U. Examples: RGB, RBU, R/G

  expressionIds: string[];
  layerOpacity: Map<string, number>; // Loaded opacity from view state, should be kept up to date as user changes opacity too...
  roiIds: (VisibleROI | ROILayerVisibility)[];

  transform: PanZoom;
  selectionModeAdd: boolean;
  elementRelativeShading: boolean;
  pointColourScheme: ColourScheme;
  pointBBoxColourScheme: ColourScheme;

  clearDrawnLinePoints(): void;
  addDrawnLinePoint(pt: Point): void;
  get drawnLinePoints(): Point[];

  imageTransform: ContextImageItemTransform | null;

  rgbuSourceImage: RGBUImage | null;
  rgbuImageScaleData: MapColourScaleSourceData | null;

  uiPhysicalScaleTranslation: Point;
  uiLayerScaleTranslation: Point;

  get scanIds(): string[];

  get raw(): ContextImageModelLoadedData | null;

  getScanModelFor(scanId: string): ContextImageScanModel | null;

  getClosestLocationIdxToPoint(worldPt: Point): ClosestPoint;
  get drawModel(): ContextImageDrawModel;

  // Any colour scales we need to draw
  get colourScales(): MapColourScaleModel[];
}

export class ClosestPoint {
  constructor(
    public scanId: string,
    public idx: number
  ) {}
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
