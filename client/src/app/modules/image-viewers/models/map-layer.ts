import { ColourRamp, Colours, RGBA } from "src/app/utils/colours";
import { MinMax } from "src/app/models/BasicTypes";

export class ContextImageMapLayer {
  constructor(
    // What made us
    public scanId: string,
    public expressionId: string,
    public quantId: string,
    public roiId: string,

    // Some properties that affect how we display
    public hasOutOfDateModules: boolean,
    public expressionName: string,

    // Draw parameters
    public opacity: number = 1.0,
    public shading: ColourRamp = ColourRamp.SHADE_VIRIDIS,

    // NOTE: We may be storing data for multiple expressions (in case of expression group)
    // The following parameters are all indexable, (including mapPoints.values[]), and we
    // expect these arrays to be the same size

    // If we have sub-expressions, we have their names here too... if not, this
    // just has expressionName in it
    public subExpressionNames: string[] = [],
    public subExpressionShading: ColourRamp[] = [],

    // Point data generated
    public mapPoints: MapPoint[],
    public valueRanges: MinMax[],
    public isBinary: boolean[]
  ) {}
}

export enum MapPointShape {
  CIRCLE,
  CROSSED_CIRCLE, // Like a no-entry sign
  DIAMOND,
  EX,
  POLYGON,
  // PLUS
}

export enum MapPointState {
  BELOW,
  IN_RANGE,
  ABOVE,
}

export class MapPointDrawParams {
  constructor(
    public colour: RGBA,
    public state: MapPointState,
    public shape: MapPointShape = MapPointShape.CIRCLE,
    public scale: number | null = null
  ) {}
}

export class MapPoint {
  constructor(
    // A MapPoint is constructed from expression results, and stores the index
    // of the scan point and polygon that may be required when drawing it

    public scanEntryId: number, // AKA PMC
    public scanEntryIndex: number, // AKA Location Index (index within the scan file)

    // The numerical value for this point
    public values: number[],

    public drawParams: MapPointDrawParams
  ) {}
}

export function getDrawParamsForRawValue(colourRamp: ColourRamp, rawValue: number, range: MinMax): MapPointDrawParams {
  // If we're outside the range, use the flat colours
  if (!isFinite(rawValue) || !range.isValid()) {
    return new MapPointDrawParams(RGBA.fromWithA(Colours.BLACK, 0.4), MapPointState.BELOW, MapPointShape.EX);
  } else if (rawValue < range.min!) {
    return new MapPointDrawParams(Colours.CONTEXT_BLUE, MapPointState.BELOW, MapPointShape.EX);
  } else if (rawValue > range.max!) {
    return new MapPointDrawParams(Colours.CONTEXT_PURPLE, MapPointState.ABOVE, MapPointShape.EX);
  }

  // Pick a colour based on where it is in the range between min-max.
  const pct = range.getAsPercentageOfRange(rawValue, true);

  // Return the colour to use
  return new MapPointDrawParams(Colours.sampleColourRamp(colourRamp, pct), MapPointState.IN_RANGE, MapPointShape.POLYGON);
}
