import { Point, Rect } from "src/app/models/Geometry";
import { Footprint } from "./footprint";
import { ContextImageMapLayer } from "./map-layer";
import { ContextImageRegionLayer } from "./region";
import { ScanPoint } from "./scan-point";
import { RGBA } from "src/app/utils/colours";

export class ScanPointPolygon {
  private _bbox: Rect = new Rect(0, 0, 0, 0);

  constructor(public points: Point[]) {
    this.updateBBox();
  }

  updateBBox() {
    if (this.points.length > 0) {
      this._bbox = new Rect(this.points[0].x, this.points[0].y, 0, 0);
      this._bbox.expandToFitPoints(this.points);
    }
  }

  get bbox(): Rect {
    return this._bbox;
  }
}

export class ContextImageScanDrawModel {
  constructor(
    public title: string,
    public scanPoints: ScanPoint[],
    public scanPointPolygons: ScanPointPolygon[],
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
