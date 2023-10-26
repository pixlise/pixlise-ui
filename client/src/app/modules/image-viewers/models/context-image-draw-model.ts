import { Point } from "src/app/models/Geometry";
import { BaseChartDrawModel } from "../../scatterplots/base/model-interfaces";
import { Footprint } from "./footprint";
import { ContextImageItemTransform } from "./image-transform";
import { ContextImageMapLayer } from "./map-layer";
import { ContextImageRegionLayer } from "./region";
import { ScanPoint } from "./scan-point";

export class ContextImageDrawModel implements BaseChartDrawModel {
  // Drawing the image
  smoothing: boolean = true;
  image: HTMLImageElement | null = null;
  imageTransform: ContextImageItemTransform | null = null;

  // Footprint of scan points relative to the image
  footprint: Footprint | null = null;

  // The actual scan points
  scanPoints: ScanPoint[] = [];

  // Scan points can be rendered as polygons which touch neighbours
  scanPointPolygons: Point[][] = [];

  // Maps
  maps: ContextImageMapLayer[] = [];

  // Regions
  regions: ContextImageRegionLayer[] = [];

  // Drawn line over the top of it all
  drawnLinePoints: Point[] = [];

  // Our rendered to an image, cached and only regenerated on resolution
  // change or data change
  drawnData: OffscreenCanvas | null = null;
}
