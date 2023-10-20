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

// These came from: "Xray lines cheat sheet" by Ben Clark
// Specifically the file name this came from was Cheatsheet_Xray_lines_Ben_13Aug2013
// and says adapted from: Cheatsheet.X-ray.Energies.Ben
const commonLines: Map<string, string[]> = new Map<string, string[]>([
  ["Al", ["Ka1", "Ka2"]],
  ["Ar", ["EscAr Ka1", "Ka1", "Ka2", "Kb1", "Kb3"]],
  ["As", ["La1", "La2", "Lb1", "Ka1", "Ka2"]],
  ["Au", ["Lb1", "Lb2,15"]], // added ,15
  ["Ba", ["La1", "Lb1"]],
  ["Br", ["La1", "La2", "Lb1", "Ka1", "Ka2"]],
  ["Ca", ["EscCa Ka1", "Ka1", "Ka2", "Kb1", "Kb3"]], // pileup Ka+Ka, Ka+Kb, "Ca,Si": Ka+Ka, "Ca,Ti": Ka+Ka
  ["Ce", ["La1", "Lb1", "Lb2,15"]], // added ,15
  ["Cl", ["Ka1", "Ka2", "Kb1"]],
  ["Co", ["Ka1", "Ka2", "Kb1", "Kb3"]],
  ["Cr", ["Ka1", "Ka2", "Kb1", "Kb3"]],
  ["Cu", ["Ka1", "Ka2", "Kb1", "Kb3"]],
  ["Fe", ["EscFe Ka1", "Ka1", "Ka2", "Kb1", "Kb3"]], // pileup "Fe-Ca" Ka+Ka, "Fe-Fe" Ka+Ka, "Fe-Fe", Ka+Kb
  ["Ga", ["Ka1", "Ka2", "Kb1"]],
  ["Ge", ["Ka1", "Ka2", "Kb1"]],
  ["Hg", ["La1", "Lb1", "Lb2,15"]], // added ,15
  ["I", ["Lb1", "Lb2,15"]],
  ["K", ["Ka1", "Ka2"]],
  ["Mg", ["Ka1", "Ka2"]],
  ["Mn", ["Ka1", "Ka2", "Kb1", "Kb3"]],
  ["Mo", ["Ka1", "Kb1"]],
  ["Na", ["Ka1", "Ka2"]],
  ["Ni", ["Ka1", "Ka2", "Kb1", "Kb3"]],
  ["P", ["Ka1", "Ka2"]],
  ["Pb", ["La1", "Lb1", "Lb2,15"]], // added ,15
  ["Pu", [/*Compt La1,*/ "La1", /*Compt Lb, */ "Lb2,15", "Lb1", "Lg1"]], // added ,15
  ["Rb", ["Ka1", "Ka2"]],
  [
    "Rh",
    [
      "EscRh La1",
      "EscRh La2",
      "EscRh Lb1",
      "EscRh Lb4",
      "EscRh Lb3",
      "EscRh Lb6",
      "EscRh Lb2,15",
      "La1",
      "La2",
      "Lb1",
      "Lg1",
      /*Compt Ka1,*/ "Ka1",
      /*Compt Kb,*/ "Kb1",
    ],
  ],
  ["S", ["Ka1", "Ka2", "Kb1"]],
  ["Sc", ["EscSc Ka1", "Ka1", "Ka2", "Kb1", "Kb3"]],
  ["Se", ["Ka1", "Ka2"]],
  ["Si", ["Ka1", "Ka2", "Kb1"]],
  ["Sr", ["Ka1", "Ka2", "Kb1", "Kb2", "Kb3"]],
  ["Ti", ["EscTi Ka1", "Ka1", "Ka2", "Kb1", "Kb3"]],
  ["U", ["Ma", "La1", "Lb1", "Lb2,15", "Lg1"]], // added ,15
  ["V", ["Ka1", "Ka2", "Kb1", "Kb3"]],
  ["Y", ["Ka1", "Ka2", "Kb1"]],
  ["Zn", ["Ka1", "Ka2", "Kb1", "Kb3"]],
  ["Zr", ["Ka1", "Ka2", "Kb1"]],
]);

export class XRFLineDatabase {
  private _dbgOutput: boolean = false;

  private _allElementLines: XRFLineItem[] = [];
  private _commonElementLines: XRFLineItem[] = [];

  constructor(
    private _configDetector: DetectorConfig,
    db: PeriodicTableDB
  ) {
    this.setupForDetectorConfig(this._configDetector, db);
  }

  get configDetector(): DetectorConfig {
    return this._configDetector;
  }

  getLinesByAtomicNumber(z: number): XRFLineItem | null {
    if (z < 1 || z >= this._allElementLines.length) {
      return null;
    }
    return this._allElementLines[z - 1];
  }

  findAllXRFLinesForEnergy(commonElementsOnly: boolean, minkeV: number, maxkeV: number): XRFLine[] {
    const result: XRFLine[] = [];

    let table = this._allElementLines;
    if (commonElementsOnly) {
      table = this._commonElementLines;
    }

    for (const item of table) {
      for (const line of item.lines) {
        const linekeV = line.energy / 1000; // It's stored in eV!
        if (linekeV > minkeV && linekeV < maxkeV) {
          result.push(XRFLine.makeXRFLineFromPeriodicTableItem(item.symbol, item.Z, line));
        }
      }

      for (const esc of item.escapeLines) {
        const linekeV = esc.energy / 1000; // It's stored in eV!
        if (linekeV > minkeV && linekeV < maxkeV) {
          result.push(XRFLine.makeXRFLineFromEscapeLine(item.symbol, item.Z, esc));
        }
      }
    }

    result.sort((a, b) => (a.eV < b.eV ? 1 : -1));
    return result;
  }

  private static getLines(db: PeriodicTableDB): XRFLineItem[] {
    const result: XRFLineItem[] = [];
    for (let z = 0; z < db.maxAtomicNumber; z++) {
      const rawItem = rawPeriodicTable[z + 1];

      if (rawItem["number"] != z + 1) {
        throw new Error(`Failed to query XRF lines, Z(${z + 1}) doesn't match raw table Z(${rawItem["number"]})`);
      }

      const item = new XRFLineItem(rawItem["number"], rawItem["symbol"], [], []);

      // Add the lines
      const lines = rawItem["lines"];
      for (let c = 0; c < lines.length; c++) {
        const tags: string[] = [];
        if (lines[c]["tags"] !== undefined) {
          for (let i = 0; i < lines[c]["tags"].length; i++) {
            tags.push(lines[c]["tags"][i]);
          }
        }

        item.lines.push(new ElementLine(lines[c]["IUPAC"], lines[c]["Siegbahn"], lines[c]["energy"], lines[c]["intensity"], tags, 0));
      }

      result.push(item);
    }

    return result;
  }

  private setupForDetectorConfig(forDetector: DetectorConfig, db: PeriodicTableDB): void {
    // Recalculate the periodic table, so we have ALL lines available to us, and we can then generate the combined line set
    const items = XRFLineDatabase.getLines(db);

    const t0 = performance.now();

    // Calculate escape lines (dependent on detector config). This is needed for common lines to be found correctly
    XRFLineDatabase.calculateEscapeLines(forDetector, false, items, db);

    // Now that we have escape lines, we can find the "common" element set
    this._commonElementLines = XRFLineDatabase.findCommonXRFLines(db, items);

    // Finally, we combine XRF lines that are too close for PIXL resolution to see
    XRFLineDatabase.combineCloseXRFLines(forDetector, items, this._dbgOutput);

    // Calculate escape lines (dependent on detector config). This is re-run so our escape lines are based on combined XRF lines
    XRFLineDatabase.calculateEscapeLines(forDetector, true, items, db);

    // Remember this for later
    this._allElementLines = items;

    const t1 = performance.now();
    console.log("XRF DB configuration for detector took: " + (t1 - t0).toLocaleString() + "ms");
  }

  private static calculateEscapeLines(forDetector: DetectorConfig, reducedSet: boolean, xrfLineItems: XRFLineItem[], db: PeriodicTableDB): void {
    const t0 = performance.now();

    const detectorActiveLayer: XrayMaterial = new XrayMaterial([forDetector.windowElement]);
    let lineCachedCount = 0;

    // Below Ba we only want to show escapes for K lines, above Ba we show for K and L
    // In either case, we only show the top 2-3 lines.

    for (let atomicNum = forDetector.minElement; atomicNum <= forDetector.maxElement; atomicNum++) {
      const periodicItem = db.getElementByAtomicNumber(atomicNum);
      if (!periodicItem || atomicNum < 1 || atomicNum >= xrfLineItems.length) {
        continue;
      }

      const elemItem = xrfLineItems[atomicNum - 1];

      // Should be the same...
      if (elemItem.Z != atomicNum || elemItem.Z != periodicItem.Z) {
        console.error("calculateEscapeLines failed, atomicNum: " + atomicNum + " mismatch: " + elemItem.Z);
        return;
      }

      // Clear escape lines for this element
      elemItem.escapeLines = [];

      let linesToCalc: ElementLine[] = [];
      if (reducedSet) {
        // Z < BA:  We now only calculate escapes for the 2 most intense K lines
        // Z >= BA: We now only calculate escapes for the 2 most intense K and L lines
        const linesByIntensity = Array.from(elemItem.lines || []).sort((a, b) => (a.intensity < b.intensity ? 1 : -1));

        let kCount = 0;
        let lCount = 0;

        for (const line of linesByIntensity) {
          if (atomicNum < 56) {
            if (line.Siegbahn[0] == "K") {
              linesToCalc.push(line);
              if (linesToCalc.length >= 2) {
                break;
              }
            }
          } else {
            if (line.Siegbahn[0] == "K") {
              if (kCount < 2) {
                linesToCalc.push(line);
                kCount++;
              }
            } else if (line.Siegbahn[0] == "L") {
              if (lCount < 2) {
                linesToCalc.push(line);
                lCount++;
              }
            }

            if (lCount >= 2 && kCount >= 2) {
              break;
            }
          }
        }
      } else {
        // Calculating all (so we find all lines from the cheat sheet!)
        linesToCalc = elemItem.lines;
      }

      // Calculate new ones
      for (const line of linesToCalc) {
        const symbol = periodicItem.symbol;
        const siegbahn = line.Siegbahn;

        const escapes = calcEscapeLines(line.energy, detectorActiveLayer);

        for (const esc of escapes) {
          elemItem.escapeLines.push(new EscapeLine("Esc" + symbol + " " + siegbahn, siegbahn, esc.energy, esc.fraction));

          lineCachedCount++;
        }
      }
    }

    const t1 = performance.now();
    console.log("Escape line calculation took: " + (t1 - t0).toLocaleString() + "ms, cached " + lineCachedCount + " lines");
  }

  private static findCommonXRFLines(db: PeriodicTableDB, xrfLineItems: XRFLineItem[]): XRFLineItem[] {
    if (db.maxAtomicNumber != xrfLineItems.length) {
      throw new Error("findCommonXRFLines line list did not match periodic table item length");
    }

    const t0 = performance.now();

    const commonElementLinesTable: XRFLineItem[] = [];

    // Run through all elements and copy the common lines into this table
    for (const [symbol, siegbahns] of commonLines) {
      // Get the element, find the lines by siegbahn name
      const elem = db.getElementBySymbol(symbol);
      if (!elem) {
        throw new Error(`Failed to find element: "${symbol}" when marking common XRF lines`);
      }

      // Get corresponding lines
      if (elem.Z < 1 || elem.Z >= xrfLineItems.length) {
        throw new Error("findCommonXRFLines failed to get lines for element: " + elem.Z);
      }

      const xrfLineItem = xrfLineItems[elem.Z - 1];

      const saveItem = new XRFLineItem(elem.Z, elem.symbol, [], []);

      const foundNames = [];
      for (const line of xrfLineItem.lines) {
        if (siegbahns.indexOf(line.Siegbahn) > -1) {
          // Store this one!
          saveItem.lines.push(new ElementLine(line.IUPAC, line.Siegbahn, line.energy, line.intensity, Array.from(line.tags), line.width));

          if (foundNames.indexOf(line.Siegbahn) < 0) {
            foundNames.push(line.Siegbahn);
          }
        }
      }

      for (const esc of xrfLineItem.escapeLines) {
        if (siegbahns.indexOf(esc.name) > -1) {
          // Store this one!
          saveItem.escapeLines.push(new EscapeLine(esc.name, esc.parentSiegbahn, esc.energy, esc.intensity));

          if (foundNames.indexOf(esc.name) < 0) {
            foundNames.push(esc.name);
          }
        }
      }

      // Check we found all
      const sortedExpected = siegbahns.sort((one, two) => (one > two ? -1 : 1));
      const sortedFound = foundNames.sort((one, two) => (one > two ? -1 : 1));

      if (sortedExpected.length != sortedFound.length) {
        console.error("Failed to find all lines for: " + symbol + ", exp: " + JSON.stringify(siegbahns) + ", got: " + JSON.stringify(sortedFound));
      } else {
        for (let c = 0; c < sortedExpected.length; c++) {
          if (sortedExpected[c] != sortedFound[c]) {
            console.error("Mismatched lines for: " + symbol + ", exp: " + JSON.stringify(sortedExpected) + ", got: " + JSON.stringify(sortedFound));
          }
        }
      }

      if (saveItem.lines.length > 0 || saveItem.escapeLines.length > 0) {
        commonElementLinesTable.push(saveItem);
      }
    }

    const t1 = performance.now();
    console.log("Finding common element XRF lines took: " + (t1 - t0).toLocaleString() + "ms, found " + commonElementLinesTable.length + " elements");
    return commonElementLinesTable;
  }

  private static combineCloseXRFLines(forDetector: DetectorConfig, xrfItems: XRFLineItem[], dbgOutput: boolean) {
    const t0 = performance.now();
    /*
let item = this.getElementBySymbol("Ni");
console.log(item.symbol);
XRFLineDatabase.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Fe");
console.log(item.symbol);
XRFLineDatabase.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Ca");
console.log(item.symbol);
XRFLineDatabase.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Rh");
console.log(item.symbol);
XRFLineDatabase.dbgPrintLines(item.lines);
*/
    // Loop through each element and find lines that are too close for our detector resolution, and combine those
    let preCount = 0;
    let postCount = 0;
    //let preCountEsc = 0;
    //let postCountEsc = 0;

    for (let Z = forDetector.minElement; Z <= forDetector.maxElement; Z++) {
      if (Z < 1 || Z >= xrfItems.length) {
        throw new Error("combineCloseXRFLines failed for Z=" + Z);
      }

      const elemLines = xrfItems[Z - 1];
      if (dbgOutput) {
        console.log(`Combining lines for Z=${Z} "${elemLines.symbol}"`);
      }

      preCount += elemLines.lines.length;
      elemLines.lines = XRFLineDatabase.combineCloseElementLines(forDetector, elemLines.lines, false);
      postCount += elemLines.lines.length;
    }

    const t1 = performance.now();
    console.log(
      "Combined XRF lines too close to see at detector resolution: " +
        forDetector.xrfeVResolution +
        ". Took: " +
        (t1 - t0).toLocaleString() +
        "ms, lines reduced from " +
        preCount +
        " to " +
        postCount
    ); //+', escapes reduced from '+preCountEsc+' to '+postCountEsc);

    /*
item = this.getElementBySymbol("Ni");
console.log(item.symbol);
XRFLineDatabase.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Fe");
console.log(item.symbol);
XRFLineDatabase.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Ca");
console.log(item.symbol);
XRFLineDatabase.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Rh");
console.log(item.symbol);
XRFLineDatabase.dbgPrintLines(item.lines);
*/
  }

  private static combineCloseElementLines(forDetector: DetectorConfig, elementLines: ElementLine[], dbg: boolean): ElementLine[] {
    if (dbg) {
      XRFLineDatabase.dbgPrintLines(elementLines, "combineCloseElementLines input lines:");
    }

    const defaultWidth = 155; // TODO: how do we get this from detector resolution?
    const energyWithinRange = 180;
    const energyWithinRangeIntensityVariable = forDetector.xrfeVResolution - energyWithinRange;
    const allowedWidthRatio = 5;
    const deltaCompareFactor = Math.sqrt(0.5);

    // 1. Assign all lines a width, σ, of 155 eV. Every line should have a location, E, an intensity, I, and a width, σ.
    // NOTE: line already has width, energy, intensity set.
    for (const line of elementLines) {
      line.width = defaultWidth;
    }

    // 2. For all lines in the line database in order of decreasing line intensity, do the following:
    const linesByIntensity = Array.from(elementLines);
    linesByIntensity.sort((a, b) => (a.intensity < b.intensity ? 1 : -1));

    let c = 0;
    while (c < linesByIntensity.length) {
      // a. Call the current line 1.
      const line1 = linesByIntensity[c];

      const sMainLineSq = line1.width * line1.width;

      // b. Identify all other lines within 230 eV. This is the potentially combined set
      const potentiallyCombinedIdxSet: number[] = [];
      for (let i = 0; i < linesByIntensity.length; i++) {
        const energyDiffToMainLine = line1.energy - linesByIntensity[i].energy;
        if (c != i && Math.abs(energyDiffToMainLine) < forDetector.xrfeVResolution) {
          const thisLine = linesByIntensity[i];

          // c. For each of these other lines, calculate the ratio of the width squared to the width of the main potentially combined line squared
          const sThisLineSq = thisLine.width * thisLine.width;
          const s = sMainLineSq / sThisLineSq;

          // d. For each of these lines, also calculate the ratio of line intensities:
          const p = thisLine.intensity / line1.intensity;

          // e. For any line with s<5, remove from the potentially combined set if not within 180 "eV"+(50 "eV")ρ of the main line.
          const allowedEnergyRange = energyWithinRange + energyWithinRangeIntensityVariable * p;

          // In other words, if s>5 add, or if s<5 add if within the above...
          if (s > allowedWidthRatio || Math.abs(energyDiffToMainLine) < allowedEnergyRange) {
            potentiallyCombinedIdxSet.push(i);
          }
        }
      }

      // f. If the potentially combined set has at least one line in it, do the following:
      if (potentiallyCombinedIdxSet.length > 0) {
        // i. Pick the most intense line within the set of potentially combined line and combine according to the following rules
        //    (∆^* and ∆ are intermediate variables for calculation that should not be stored for the combined line):
        let maxIntensity = linesByIntensity[potentiallyCombinedIdxSet[0]].intensity;
        let maxIntensityIdx = potentiallyCombinedIdxSet[0];
        for (let i = 1; i < potentiallyCombinedIdxSet.length; i++) {
          const idx = potentiallyCombinedIdxSet[i];
          if (linesByIntensity[idx].intensity > maxIntensity) {
            maxIntensity = linesByIntensity[idx].intensity;
            maxIntensityIdx = idx;
          }
        }

        const thisLine = linesByIntensity[maxIntensityIdx];
        const sThisLineSq = thisLine.width * thisLine.width;

        const s = sMainLineSq / sThisLineSq;
        const p = thisLine.intensity / line1.intensity;

        // ∆^*=(ρs^(1⁄2))/(1+ρs^(1⁄2) )
        const psSqrt = Math.sqrt(p * s);
        const deltaStar = psSqrt / (1 + psSqrt);

        let delta = 0;
        if (deltaStar < deltaCompareFactor) {
          delta = deltaStar / 2;
        } else {
          delta = (1 + deltaStar) / 2;
        }

        const Ecombined = line1.energy + delta * (thisLine.energy - line1.energy);
        const Icombined =
          line1.intensity * Math.exp(-Math.pow((Ecombined - line1.energy) / line1.width, 2)) +
          thisLine.intensity * Math.exp(-Math.pow((Ecombined - thisLine.energy) / thisLine.width, 2));
        const widthcombined = (line1.intensity * line1.width + thisLine.intensity * thisLine.width) / Icombined;

        // ii. Add the combined line to the line database and remove the two lines that were combined. Clear the potentially combined
        //     set. (These may be combined later, but not necessarily now.)
        const combinedTags = Array.from(new Set<string>([...line1.tags, ...thisLine.tags]).values());
        const combinedSiegbahn = XRFLineDatabase.makeCombinedSiegbahn(line1.Siegbahn, thisLine.Siegbahn, dbg);
        const combinedLine = new ElementLine(line1.IUPAC + " + " + thisLine.IUPAC, combinedSiegbahn, Ecombined, Icombined, combinedTags, widthcombined);

        if (maxIntensityIdx > c) {
          // Remove bigger idx first, so we don't mess up the second removal
          linesByIntensity.splice(maxIntensityIdx, 1);
          linesByIntensity.splice(c, 1);
        } else {
          linesByIntensity.splice(c, 1);
          linesByIntensity.splice(maxIntensityIdx, 1);
        }

        linesByIntensity.push(combinedLine);

        // iii. Restart the for loop (2) with the new line dataset
        c = 0;

        if (dbg) {
          XRFLineDatabase.dbgPrintLines(linesByIntensity, "Printing lines at end of iteration:");
        }
      }
      // g. Else continue to loop through all lines.
      else {
        c++;
      }
    }

    return linesByIntensity;
  }

  private static dbgPrintLines(elementLines: ElementLine[], title: string): void {
    const copy = Array.from(elementLines);
    copy.sort((a, b) => (a.energy > b.energy ? 1 : -1));

    let c = 0;
    let w = title + "\n";
    for (const l of copy) {
      w +=
        "  [" +
        c +
        "] siegbahn=" +
        l.Siegbahn +
        " eV=" +
        l.energy.toLocaleString() +
        ", intensity=" +
        l.intensity.toLocaleString() +
        ", width=" +
        l.width.toLocaleString() +
        ", tags=[" +
        l.tags.join(",") +
        "]\n";
      c++;
    }
    console.log(w);
  }

  private static makeCombinedSiegbahn(siegbahn1: string, siegbahn2: string, dbgOutput: boolean): string {
    // Find the idx where number starts in both
    const siegbahn1Bits = XRFLineDatabase.splitSiegbahn(siegbahn1, dbgOutput);
    const siegbahn2Bits = XRFLineDatabase.splitSiegbahn(siegbahn2, dbgOutput);

    if (siegbahn1Bits.length < 2 || siegbahn2Bits.length < 2) {
      return siegbahn1 + "," + siegbahn2;
    }

    // ensure they start the same way
    if (siegbahn1Bits[0] != siegbahn2Bits[0]) {
      if (dbgOutput) {
        console.log("Siegbahn combine failed for: " + siegbahn1 + " + " + siegbahn2);
      }
      return siegbahn1 + "," + siegbahn2;
    }

    // Combine them with the lowest number first
    const lineNums: number[] = [];
    for (let c = 1; c < siegbahn1Bits.length; c++) {
      lineNums.push(Number.parseInt(siegbahn1Bits[c]));
    }
    for (let c = 1; c < siegbahn2Bits.length; c++) {
      lineNums.push(Number.parseInt(siegbahn2Bits[c]));
    }
    lineNums.sort((a, b) => (a > b ? 1 : -1));

    return siegbahn1Bits[0] + lineNums.join(",");
  }

  private static splitSiegbahn(siegbahn: string, dbgOutput: boolean): string[] {
    let splitIdx = -1;
    for (let c = 0; c < siegbahn.length; c++) {
      if (siegbahn[c] >= "0" && siegbahn[c] <= "9") {
        if (splitIdx < 0) {
          splitIdx = c;
        }
      } else {
        if (splitIdx > 0 && siegbahn[c] != ",") {
          // Found non-digit after digits started, bail
          if (dbgOutput) {
            console.log("Failed to parse number in siegbahn: " + siegbahn);
          }
          return [];
        }
      }
    }

    if (splitIdx > 0 && splitIdx < 3) {
      return [siegbahn.substr(0, splitIdx), ...siegbahn.substr(splitIdx, siegbahn.length - splitIdx).split(",")];
    }
    if (dbgOutput) {
      console.log("Failed to parse siegbahn: " + siegbahn);
    }
    return [];
  }
}
