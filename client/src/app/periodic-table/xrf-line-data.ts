import { DetectorConfig } from "../generated-protos/detector-config";
import { XRFLine } from "./XRFLine";
import { XrayMaterial, calcEscapeLines } from "./escape-line-calc";
import { PeriodicTableDB, PeriodicTableItem } from "./periodic-table-db";
import { rawPeriodicTable } from "./rawPeriodicTable";

export class ElementLine {
  constructor(
    public IUPAC: string,
    public Siegbahn: string,
    public energy: number, // eV
    public intensity: number, // arbitrary comparative intensity
    public tags: string[],
    public width: number
  ) {}
}

export class EscapeLine {
  constructor(
    public name: string,
    public parentSiegbahn: string,
    public energy: number, // eV
    public intensity: number // arbitrary comparative intensity
  ) {}
}

export class XRFLineItem {
  constructor(
    public Z: number,
    public symbol: string,
    public lines: ElementLine[],
    public escapeLines: EscapeLine[]
  ) {}
}
