import { ColourRamp, RGBA } from "src/app/utils/colours";
import { Histogram } from "../../../models/histogram";
import { Point } from "src/app/models/Geometry";

export class ContextImageMapLayer {
  histogram: Histogram = new Histogram();
  constructor(
    // What made us
    public scanId: string,
    public expressionId: string,
    public quantId: string,
    public roiId: string,

    // Point data generated
    public points: MapPoint[],

    // Draw parameters
    public opacity: number = 1.0,
    public shading: ColourRamp = ColourRamp.SHADE_VIRIDIS
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
    public value: number,

    public drawParams: MapPointDrawParams
  ) {}
}
