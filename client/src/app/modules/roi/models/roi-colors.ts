import { Colours, RGBA } from "src/app/utils/colours";

export type ColourOption = {
  name: string;
  colour: string;
  rgba: RGBA;
  colourBlindSafe: boolean;
};

export const COLOUR_BLIND_SAFE = {
  Orange: Colours.ORANGE,
  Hopbush: Colours.HOPBUSH,
  Yellow: Colours.YELLOW,
  Purple: Colours.PURPLE,
};

export const ADDITIONAL_COLOURS = {
  Teal: Colours.ROI_TEAL,
  Green: Colours.ROI_GREEN,
  Brown: Colours.ROI_BROWN,
  Maroon: Colours.ROI_MAROON,
  Red: Colours.ROI_RED,
  Pink: Colours.ROI_PINK,
  Blue: Colours.ROI_BLUE,
};

export const COLOURS = [
  ...Object.entries(COLOUR_BLIND_SAFE).map(([name, rgba]) => ({ name, colour: rgba.asString(), rgba, colourBlindSafe: true })),
  ...Object.entries(ADDITIONAL_COLOURS).map(([name, rgba]) => ({ name, colour: rgba.asString(), rgba, colourBlindSafe: false })),
];

export const COLOUR_MAP = new Map(COLOURS.map(colour => [colour.colour, colour]));

export const generateDefaultColour = (): ColourOption => ({
  name: "",
  colour: "", // This is used for the colour picker
  rgba: Colours.WHITE, // This is used for widgets
  colourBlindSafe: false,
});

export const deepCopyColour = (colour: ColourOption): ColourOption => ({
  name: colour.name,
  colour: colour.colour,
  rgba: new RGBA(colour.rgba.r, colour.rgba.g, colour.rgba.b, colour.rgba.a),
  colourBlindSafe: colour.colourBlindSafe,
});

export const findColourOption = (colour: RGBA | string): ColourOption => {
  let matchedColour = COLOUR_MAP.get(typeof colour === "string" ? colour : colour.asString());
  if (matchedColour) {
    return deepCopyColour(matchedColour);
  }

  let unmatchedColour = generateDefaultColour();
  unmatchedColour.colour = typeof colour === "string" ? colour : colour.asString();
  unmatchedColour.rgba = typeof colour === "string" ? Colours.WHITE : colour;

  return unmatchedColour;
};
