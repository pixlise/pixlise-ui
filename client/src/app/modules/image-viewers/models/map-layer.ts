import { ColourRamp, RGBA } from "src/app/utils/colours";
import { Histogram } from "../../../models/histogram";
import { Point } from "src/app/models/Geometry";

export class ContextImageMapLayer {
  histogram: Histogram = new Histogram();
  constructor(
    public points: MapPoint[],
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

class MapPoint {
  constructor(
    public coord: Point,
    public value: number,

    public drawParams: MapPointDrawParams,

    public polygon: Point[]
  ) {}
}
