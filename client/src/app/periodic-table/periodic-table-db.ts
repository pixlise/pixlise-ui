// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

// The raw output from periodic table generator
// We read this in on startup and store it in our typesafe structures
import { rawPeriodicTable } from "./rawPeriodicTable";

export class PeriodicTableItem {
  constructor(
    public name: string,
    public atomicMass: number,
    public Z: number,
    public symbol: string
  ) {}
}

export class ElementOxidationState {
  constructor(
    public formula: string,
    public element: string,
    public Z: number,
    public isElement: boolean, // Fe would contain true, Fe2O3 would contain false
    public conversionToElementWeightPct: number // For example, the number to divide Fe2O3 weight % to get Fe weight %
  ) {}
}

export class PeriodicTableDB {
  private _periodicTable: PeriodicTableItem[] = [];
  private _symbolToIdx: Map<string, number> = new Map<string, number>();

  // Consts for some elements... these mainly because of limits on PIXL sensitivity, easy to find the code
  // that may care about it instead of searching for atomic numbers
  public readonly zSodium = 11;
  public readonly zUranium = 92;
  public readonly zTechnetium = 43;

  constructor() {
    this.fillTable();
  }

  get maxAtomicNumber(): number {
    return this._periodicTable.length;
  }

  getElementByAtomicNumber(Z: number): PeriodicTableItem | null {
    if (Z > 0 && Z <= this._periodicTable.length) {
      return this._periodicTable[Z - 1];
    }
    return null;
  }

  getElementBySymbol(formula: string): PeriodicTableItem | null {
    const idx = this.getElementIndex(formula);
    if (idx == -1) {
      return null;
    }
    return this._periodicTable[idx];
  }

  getMolecularMass(formula: string): number {
    // Allows finding the molecular mass not just of an individual element, but of an entire formula, eg SiO2
    // This needs to find elements and the multipliciation factor in the formula
    let weight = 0;

    // Special case - if it's FeO-T, we worked correctly before, but had pointless warning messages for O-T
    // because it was read as "O-" which wasn't a valid element, after which "O" was tried, and worked... so here
    // we snip off O-T in this case
    if (formula === "FeO-T") {
      formula = "FeO";
    }

    let formulaRemainder = formula;
    for (
      let c = 0;
      c < formula.length;
      c++ // ensure this always quits
    ) {
      let thisWeight = 0;

      const elem = this.getFirstElement(formulaRemainder);
      if (elem) {
        const elemItem = this.getElementBySymbol(elem);
        thisWeight = elemItem?.atomicMass || 0;

        // consume these chars
        formulaRemainder = formulaRemainder.substring(elem.length);
      } else {
        // Special case for FeO-T style "totals". Initially was only for FeO but can happen for others now
        // such as FeCO3-T
        if (formulaRemainder == "-T" /* && formula == "FeO-T"*/) {
          formulaRemainder = "";
          break;
        }

        console.warn('getMolecularMass: Failed to find element in "' + formulaRemainder + '" part of formula: "' + formula + '"');
        weight = 0;
        break;
      }

      // See if it is followed by a multiplier, eg CO2 - O finding it's x2
      const mult = PeriodicTableDB.getMultiplier(formulaRemainder);

      if (mult > 0) {
        thisWeight *= mult;

        // Consume the characters
        formulaRemainder = formulaRemainder.substring(mult.toString().length);
      }

      weight += thisWeight;

      if (formulaRemainder.length <= 0) {
        break;
      }
    }

    return weight;
  }

  // Returns the first element in the formula
  private getFirstElement(formula: string): string {
    // See if we can find an element on the first 2 chars
    let elem = formula.substring(0, 2);
    let state = this.getElementOxidationState(elem);
    if (state && state.isElement) {
      return state.element;
    }

    // If not, maybe it's only the first char
    elem = formula.substring(0, 1);
    state = this.getElementOxidationState(elem);
    if (state && state.isElement) {
      return state.element;
    }

    // Nope, return nothing
    return "";
  }

  // Returns the multiplier at the start of the formula string (or 0 if none)
  // Really just returns a number if string starts with one, used when parsing
  // a chemical formula
  private static getMultiplier(formula: string): number {
    const num = Number.parseInt(formula);
    if (isNaN(num)) {
      return 0;
    }
    if (num <= 0) {
      return 0;
    }
    return num;
  }

  getAtomicNumbersForSymbolList(formulaList: string[]): Set<number> {
    const result = new Set<number>();

    for (const formula of formulaList) {
      const idx = this.getElementIndex(formula);

      // Look up the value (it's really idx-1 but this is probably more future-proof)
      if (idx >= 0 && idx < this._periodicTable.length) {
        result.add(this._periodicTable[idx].Z);
      }
    }

    return result;
  }

  private getElementIndex(formula: string): number {
    // NOTE: here a symbol was originally an element, but PIQUANT has since been modified
    // to return quantifications with oxides or carbonates of an element, so the symbol
    // might be Fe, but could be Fe2O3.
    // To work around this, here we first try look up by the first 2 letters, then by 1 letter
    // to cover the case of 1 char elements. If both fail, then return null
    // NOTE 2: PIQUANT has since been modified to also output (in particular with Iron) -T meaning
    // total. So this also has to handle that case

    let idx = this._symbolToIdx.get(formula.substring(0, 2));
    if (idx === undefined) {
      idx = this._symbolToIdx.get(formula.substring(0, 1)) || -1;
    }

    return idx;
  }

  getElementOxidationState(formula: string): ElementOxidationState | null {
    let result: ElementOxidationState | null = null;

    const idx = this.getElementIndex(formula);
    if (idx != -1) {
      // We found an element in it, check if this formula is longer than just the symbol and form
      // the result
      const elem = this._periodicTable[idx];
      result = new ElementOxidationState(
        formula,
        elem.symbol,
        elem.Z,
        formula.length <= elem.symbol.length,
        this.getFormulaToElementConversionFactor(elem.symbol, formula)
      );
    }

    return result;
  }

  // This is a helper function to exclude pure elements - since quantifications can now come back with carbonates/oxides (but they also
  // report having the element too), for anywhere in the UI that presents a list of elements (and shows the option to use the "pure" element)
  // we need to be able to show just the oxide/carbonate or element (if nothing else is quantified), this forms the list.
  getOnlyMostComplexStates(formulae: string[]): string[] {
    // Run through them all, find the oxides/carbonates and build a list of elements to exclude, and a list of elements we encounter
    const excludeElements: Set<string> = new Set<string>();
    const elementsSeen: Set<string> = new Set<string>();
    const result: Set<string> = new Set<string>();

    for (const formula of formulae) {
      const idx = this.getElementIndex(formula);
      if (idx != -1) {
        const elem = this._periodicTable[idx];
        if (formula.length > elem.symbol.length) {
          // This is an oxide or carbonate, because its formula is longer than the element symbol
          // Eg: FeCO3 vs Fe
          result.add(formula);

          // Make sure we ignore its "pure" element
          excludeElements.add(elem.symbol);
        } else if (formula == elem.symbol) {
          // it's an element, eg comparing Fe with Fe
          elementsSeen.add(formula);
        }
      }
    }

    // Now run through again and add any elements that aren't to be excluded
    for (const elem of elementsSeen.keys()) {
      if (!excludeElements.has(elem)) {
        result.add(elem);
      }
    }

    return Array.from(result.keys());
  }

  getFormulaToElementConversionFactor(element: string, formula: string): number {
    let result = 1;

    //console.log('getFormulaToElementConversionFactor: '+formula+'->'+element);
    const elementData = this.getElementBySymbol(element);
    if (elementData) {
      let elementMass = elementData.atomicMass;
      //console.log('elementMass: '+elementMass);

      // Find if it's multiplied by something
      let pos = element.length;

      let otherElementMass = 0;
      let lastElementMass = 0;

      let tmp = "";
      while (pos < formula.length) {
        const ch = formula.substring(pos, pos + 1);
        //console.log('Read ch: '+ch);
        // Add to the last one
        tmp += ch;

        //console.log('tmp: '+tmp);

        // See if it's an element
        const tmpData = this.getElementBySymbol(tmp);
        if (tmpData) {
          // If we already have a mass read, add it
          otherElementMass += lastElementMass;

          // Remember it
          lastElementMass = tmpData.atomicMass;

          tmp = "";
          //console.log('otherElementMass: '+otherElementMass);
          //console.log('lastElementMass: '+lastElementMass);
        } else {
          // See if it's a multiplier
          const mult = Number.parseInt(tmp);
          if (!isNaN(mult) && mult > 0) {
            if (lastElementMass == 0) {
              // It's a multiplier for the element...
              elementMass *= mult;
            }
            const massToAdd = mult * lastElementMass;
            //console.log('change: '+massToAdd);
            otherElementMass += massToAdd;
            //console.log('otherElementMass: '+otherElementMass);
            lastElementMass = 0;
            tmp = "";
          } else {
            // Special case for handling FeO-T and other "-T" totals...
            if (formula.substring(pos) == "-T" /*&& formula == "FeO-T"*/) {
              break;
            }

            console.warn("getFormulaToElementConversionFactor: Failed while parsing " + ch + " in: " + formula);
          }
        }

        pos++;
      }

      if (lastElementMass != 0) {
        otherElementMass += lastElementMass;
      }

      if (otherElementMass != 0) {
        // We have the element mass (eg Ti), and the mass of "the other stuff" (eg O2 from TiO2). Get the mass of the element
        // as a percentage of the total mass, giving us a factor to multiply the total weight% (eg of TiO2), that allows us to
        // extract just the weight% of Ti. Our resultant value is the factor, and that multiplication with total weight% is elsewhere
        result = elementMass / (elementMass + otherElementMass);
      }
    }
    //console.log('result: '+result);
    //console.log('getFormulaToElementConversionFactor: '+formula+'->'+element+' factor='+result.toLocaleString());
    return result;
  }

  getElementSymbolsForAtomicNumbers(atomicNumbers: Set<number>): string[] {
    const symbols: string[] = [];
    for (const z of atomicNumbers) {
      symbols.push(this._periodicTable[z - 1].symbol);
    }
    return symbols;
  }

  getElementsInAtomicNumberOrder(elements: string[]): string[] {
    const result = Array.from(elements);
    result.sort((a: string, b: string) => {
      // Get their atomic numbers
      const aElem = this.getElementBySymbol(a);
      const bElem = this.getElementBySymbol(b);

      if (aElem != null && bElem != null) {
        const aZ = aElem.Z;
        const bZ = bElem.Z;

        if (aZ < bZ) {
          return -1;
        }
        if (aZ > bZ) {
          return 1;
        }
      }

      return 0;
    });

    return result;
  }

  private fillTable() {
    const t0 = performance.now();

    this._periodicTable = [];
    this._symbolToIdx.clear();

    // Read the periodic table data into our typesafe structures
    for (const zStr of Object.keys(rawPeriodicTable)) {
      const z = Number.parseInt(zStr);
      if (z >= 119) {
        // Ignoring really exotic stuff...
        break;
      }

      const rawItem = rawPeriodicTable[z];

      const item = new PeriodicTableItem(rawItem["name"], rawItem["atomic_mass"], rawItem["number"], rawItem["symbol"]);

      if (z != this._periodicTable.length + 1) {
        console.error("Failed to initialize periodic table DB at Z=" + z);
        return;
      }

      // Add to symbol lookup - this adds the index at which it will be found in the periodic table array
      this._symbolToIdx.set(item.symbol, this._periodicTable.length);

      // Finally, store it in the periodic table
      this._periodicTable.push(item);
    }

    const t1 = performance.now();
    console.log("Periodic table filled with " + this._periodicTable.length + " elements. Took: " + (t1 - t0).toLocaleString() + "ms");
  }
}

export const periodicTableDB: PeriodicTableDB = new PeriodicTableDB();
