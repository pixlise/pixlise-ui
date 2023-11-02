import { Point, Rect, distanceBetweenPoints } from "src/app/models/Geometry";
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

  hoverEntryIdx: number = -1; // Which index is hovered over by mouse
}

export function getClosestLocationIdxToPoint(mdl: ContextImageDrawModel, worldPt: Point, maxDistance: number = 3): { scanId: string; idx: number } {
  let closestScanId = "";
  let closestScanIdx = -1;
  let closestDist = -1;

  for (const [scanId, scanMdl] of mdl.perScanDrawModel) {
    const result = getClosestLocationIdxToPointForScan(scanMdl, worldPt, maxDistance);
    if (closestDist < 0 || result[1] < closestDist) {
      closestDist = result[1];
      closestScanIdx = result[0];
      closestScanId = scanId;
    }
  }

  return { scanId: closestScanId, idx: closestScanIdx };
}

// Returns index and distance in array of 2 numbers
function getClosestLocationIdxToPointForScan(mdl: ContextImageScanDrawModel, worldPt: Point, maxDistance: number): number[] {
  const idxs = [];
  for (const loc of mdl.scanPoints) {
    if (loc.coord && Math.abs(worldPt.x - loc.coord.x) < maxDistance && Math.abs(worldPt.y - loc.coord.y) < maxDistance) {
      idxs.push(loc.locationIdx);
    }
  }

  // If we've got multiple, find the closest one geometrically
  let closestDist = -1;
  let closestIdx = -1;
  for (const idx of idxs) {
    const comparePt = mdl.scanPoints[idx].coord;
    if (comparePt) {
      if (closestIdx == -1) {
        closestIdx = idx;

        if (idxs.length > 0) {
          closestDist = distanceBetweenPoints(worldPt, comparePt);
          //console.log(idx+': '+worldPt.x+','+worldPt.y+' dist to: '+comparePt.x+','+comparePt.y+' distance='+closestDist);
        }
      } else {
        const dist = distanceBetweenPoints(worldPt, comparePt);
        //console.log(idx+': '+worldPt.x+','+worldPt.y+' dist to: '+comparePt.x+','+comparePt.y+' distance='+closestDist);
        if (closestDist < 0 || dist < closestDist) {
          closestIdx = idx;
          closestDist = dist;
        }
      }
    }
  }

  //console.log('Closest: '+closestIdx);
  return [closestIdx, closestDist];
}
