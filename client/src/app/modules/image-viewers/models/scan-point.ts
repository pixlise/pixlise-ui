import { Point } from "src/app/models/Geometry";

export class ScanPoint {
  constructor(
    public PMC: number,
    public coord: Point | null,
    public locationIdx: number,
    public hasNormalSpectra: boolean,
    public hasDwellSpectra: boolean,
    public hasPseudoIntensities: boolean,
    public hasMissingData: boolean
  ) {}
}
