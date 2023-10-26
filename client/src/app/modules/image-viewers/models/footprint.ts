import { Point } from "src/app/models/Geometry";
import { RGBA } from "src/app/utils/colours";

export class HullPoint extends Point {
  constructor(
    x: number,
    y: number,
    public idx: number,
    public normal: Point | null = null
  ) {
    super(x, y);
  }
}

export class Footprint {
  constructor(
    public points: HullPoint[][],
    public innerColour: RGBA,
    public outerColour: RGBA
  ) {}
}
