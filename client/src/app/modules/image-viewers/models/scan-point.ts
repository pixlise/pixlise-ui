import { Point } from "src/app/models/Geometry";

export class ScanPoint {
  constructor(
    public PMC: number,
    public coord: Point,
    public locationIdx: number,
    public hasDwellSpectra: boolean,
    public hasMissingData: boolean
  ) {}
}
