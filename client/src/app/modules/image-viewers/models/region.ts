import { Point, Rect } from "src/app/models/Geometry";
import { RGBA, Colours } from "src/app/utils/colours";

export class ContextImageRegionLayer {
  constructor(
    public roiId: string = "",
    public name: string = "",
    public colour: RGBA = Colours.WHITE,
    public opacity: number = 1
  ) {}
  pixelMask: HTMLImageElement | null = null;
  polygons: RegionDisplayPolygon[] = [];
}

export class RegionDisplayPolygon {
  private _polygonBBox: Rect = new Rect(0, 0, 0, 0);
  private _holeBBoxes: Rect[] = [];

  constructor(
    public boundaryPoints: Point[],
    public holePolygons: Point[][]
  ) {
    this.updateBBoxes();
  }

  get polygonBBox(): Rect {
    return this._polygonBBox;
  }

  get holeBBoxes(): Rect[] {
    return this._holeBBoxes;
  }

  updateBBoxes(): void {
    this._holeBBoxes = [];

    if (this.boundaryPoints.length <= 0) {
      this._polygonBBox = new Rect(0, 0, 0, 0);
      return;
    }

    // Generate from the points we have
    this._polygonBBox = new Rect(this.boundaryPoints[0].x, this.boundaryPoints[0].y, 0, 0);
    this._polygonBBox.expandToFitPoints(this.boundaryPoints);

    for (const hole of this.holePolygons) {
      let holeBBox: Rect = new Rect(0, 0, 0, 0);
      if (hole.length > 0) {
        holeBBox = new Rect(hole[0].x, hole[0].y, 0, 0);
        holeBBox.expandToFitPoints(hole);
      }
      this._holeBBoxes.push(holeBBox);
    }
  }
}
