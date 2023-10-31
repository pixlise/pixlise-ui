import { Point, Rect } from "src/app/models/Geometry";
import { BaseChartDrawModel } from "../../scatterplots/base/model-interfaces";
import { Footprint } from "./footprint";
import { ContextImageItemTransform } from "./image-transform";
import { ContextImageMapLayer } from "./map-layer";
import { ContextImageRegionLayer } from "./region";
import { ScanPoint } from "./scan-point";
import { RGBA, Colours } from "src/app/utils/colours";

export class ContextImageDrawModel implements BaseChartDrawModel {
  // Drawing the image
  smoothing: boolean = true;
  image: HTMLImageElement | null = null;
  imageTransform: ContextImageItemTransform | null = null;

  // Drawn data per scan
  perScanDrawModel: Map<string, ContextImageScanDrawModel> = new Map<string, ContextImageScanDrawModel>();

  allLocationPointsBBox: Rect = new Rect(0, 0, 0, 0);

  lineWidthPixels: number = 1; // Gets set at start of draw call because its based on zoom factor

  primaryColour: RGBA = Colours.WHITE;
  secondaryColour: RGBA = Colours.BLACK;

  // Drawn line over the top of it all
  drawnLinePoints: Point[] = [];

  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;
}

export class ContextImageScanDrawModel {
  constructor(public scanId: string) {}

  // The actual scan points
  scanPoints: ScanPoint[] = [];

  // Footprint of scan points relative to the image
  footprint: Footprint | null = null;

  // Scan points can be rendered as polygons which touch neighbours
  scanPointPolygons: Point[][] = [];

  // Maps
  maps: ContextImageMapLayer[] = [];

  // Regions
  regions: ContextImageRegionLayer[] = [];

  // Selected point idxs
  selectedPointIdxs: Set<number> = new Set<number>();

  // We sometimes override the colour of PMCs too
  drawPointColours: Map<number, RGBA> = new Map<number, RGBA>();

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
}
