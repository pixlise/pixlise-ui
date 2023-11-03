import { ColourRamp, RGBA } from "src/app/utils/colours";
import { Histogram } from "../../../models/histogram";
import { IColourScaleDataSource } from "src/app/models/ColourScaleDataSource";

export class ContextImageMapLayer /*implements IColourScaleDataSource*/ {
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
/*
  // IColourScaleDataSource
  getValueRange(channel: number): MinMax;
  getDisplayValueRange(channel: number): MinMax;
  getSpecularRemovedValueRange?(channel: number): MinMax;
  setDisplayValueRangeMin(channel: number, val: number): void;
  setDisplayValueRangeMax(channel: number, val: number): void;

  channelCount: number;
  isBinary: boolean;
  displayScalingAllowed: boolean;
  name: string;

  expressionID?: string;
  source?: any;

  getHistogram(channel: number): Histogram;
  setHistogramSteps(steps: number): void;

  getChannelName(channel: number): string;
  getDrawParamsForRawValue(channel: number, rawValue: number, rawRange: MinMax): MapPointDrawParams;*/
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
