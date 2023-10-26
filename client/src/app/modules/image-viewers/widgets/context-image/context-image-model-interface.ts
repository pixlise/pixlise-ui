import { PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { RGBA, Colours } from "src/app/utils/colours";

export interface IContextImageModel {
  transform: PanZoom;
  selectionModeAdd: boolean;
  pointColourScheme: ColourScheme;
  pointBBoxColourScheme: ColourScheme;
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
