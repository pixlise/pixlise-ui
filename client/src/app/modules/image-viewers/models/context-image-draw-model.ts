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
    public contextPixelsTommConversion: number // The conversion ratio between image pixels and mm (image ij to xyz beam effectively)
  ) {}

  // Maps
  maps: ContextImageMapLayer[] = [];

  // Regions
  regions: ContextImageRegionLayer[] = [];
  /*
  // Some stats about the data we're drawing. Some of these aren't
  // strictly for drawing so we may need to put them into the model
  // instead
  locationPointBBox: Rect = new Rect(0, 0, 0, 0);
  locationPointXSize = 0;
  locationPointYSize = 0;
  locationPointZSize = 0;
  locationCount: number = 0;
  locationsWithNormalSpectra: number = 0;
  locationDisplayPointRadius: number = 1;
  experimentAngleRadiansOnContextImage: number = 0;
  minXYDistance_mm = 0;

  beamUnitsInMeters: boolean = false; // Original test data had mm
  contextPixelsTommConversion: number = 1;

  mmBeamRadius: number = 0.06; // Defaults to a radius of 60um, changed once we read the detector config
  pixelBeamRadius: number = 1; // Calculated by taking the above and converting from mm->pixel
*/
}
