import { Colours } from "src/app/utils/colours";

export type ColorOption = {
  name: string;
  color: string;
  colorBlindSafe: boolean;
};

export const COLOR_BLIND_SAFE = {
  Orange: Colours.ORANGE.asString(),
  Hopbush: Colours.HOPBUSH.asString(),
  Yellow: Colours.YELLOW.asString(),
  Purple: Colours.PURPLE.asString(),
};

export const ADDITIONAL_COLORS = {
  Teal: Colours.ROI_TEAL.asString(),
  Green: Colours.ROI_GREEN.asString(),
  Brown: Colours.ROI_BROWN.asString(),
  Maroon: Colours.ROI_MAROON.asString(),
  Red: Colours.ROI_RED.asString(),
  Pink: Colours.ROI_PINK.asString(),
  Blue: Colours.ROI_BLUE.asString(),
};

export const COLORS = [
  ...Object.entries(COLOR_BLIND_SAFE).map(([name, color]) => ({ name, color, colorBlindSafe: true })),
  ...Object.entries(ADDITIONAL_COLORS).map(([name, color]) => ({ name, color, colorBlindSafe: false })),
];
