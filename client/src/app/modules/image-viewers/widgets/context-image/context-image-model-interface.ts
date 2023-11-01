import { Subject } from "rxjs";
import { Point } from "src/app/models/Geometry";
import { RGBUImage } from "src/app/models/RGBUImage";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { RGBA, Colours } from "src/app/utils/colours";
import { ContextImageItemTransform } from "../../models/image-transform";
import { ScanPoint } from "../../models/scan-point";
import { ContextImageDrawModel } from "../../models/context-image-draw-model";

export interface IContextImageModel {
  //needsDraw$: Subject<void>;

  transform: PanZoom;
  selectionModeAdd: boolean;
  pointColourScheme: ColourScheme;
  pointBBoxColourScheme: ColourScheme;

  clearDrawnLinePoints(): void;
  addDrawnLinePoint(pt: Point): void;
  get drawnLinePoints(): Point[];

  imageTransform: ContextImageItemTransform | null;

  rgbuSourceImage: RGBUImage | null;

  get scanIds(): string[];
  getScanPointsFor(scanId: string): ScanPoint[];

  get drawModel(): ContextImageDrawModel;
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
