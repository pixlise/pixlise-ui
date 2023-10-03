import { Colours, RGBA } from "src/app/utils/colours";

export type ColorOption = {
  name: string;
  color: string;
  rgba: RGBA;
  colorBlindSafe: boolean;
};

export const COLOR_BLIND_SAFE = {
  Orange: Colours.ORANGE,
  Hopbush: Colours.HOPBUSH,
  Yellow: Colours.YELLOW,
  Purple: Colours.PURPLE,
};

export const ADDITIONAL_COLORS = {
  Teal: Colours.ROI_TEAL,
  Green: Colours.ROI_GREEN,
  Brown: Colours.ROI_BROWN,
  Maroon: Colours.ROI_MAROON,
  Red: Colours.ROI_RED,
  Pink: Colours.ROI_PINK,
  Blue: Colours.ROI_BLUE,
};

export const COLORS = [
  ...Object.entries(COLOR_BLIND_SAFE).map(([name, rgba]) => ({ name, color: rgba.asString(), rgba, colorBlindSafe: true })),
  ...Object.entries(ADDITIONAL_COLORS).map(([name, rgba]) => ({ name, color: rgba.asString(), rgba, colorBlindSafe: false })),
];

export const generateDefaultColor = (): ColorOption => ({
  name: "",
  color: Colours.WHITE.asString(),
  rgba: Colours.WHITE,
  colorBlindSafe: false,
});
