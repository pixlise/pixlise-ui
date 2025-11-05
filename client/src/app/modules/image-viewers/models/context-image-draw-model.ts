import { Point } from "src/app/models/Geometry";
import { Footprint } from "./footprint";
import { ContextImageMapLayer } from "./map-layer";
import { ContextImageRegionLayer } from "./region";
import { ScanPoint } from "./scan-point";
import { RGBA } from "src/app/utils/colours";

export class ContextImageScanDrawModel {
  constructor(
    public title: string,
    public scanPoints: ScanPoint[],
    public scanPointPolygons: Point[][],
    public footprint: Footprint,
    public selectedPointPMCs: Set<number>,
    public selectedPointIndexes: Set<number>,
    public hoverEntryIdx: number = -1,
    public drawPointColourOverrides: Map<number, RGBA>, // Only used by quant combine view, overrides the colour drawn per scan point
    public scanPointDisplayRadius: number, // Size of shape drawn for each scan point in image pixels
    public beamRadius_pixels: number, // Size of the beam in image pixels
    public contextPixelsTommConversion: number // The conversion ratio between image pixels and mm (image ij to xyz beam effectively), -1 if unknown
  ) {}

  // Maps
  maps: ContextImageMapLayer[] = [];

  // Regions
  regions: ContextImageRegionLayer[] = [];
}
