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
import { DetectorConfig } from "src/app/models/BasicTypes";
import { XRFLine } from "src/app/periodic-table/XRFLine";
import { calcEscapeLines, XrayMaterial } from "./escape-line-calc";
import { rawPeriodicTable } from "./rawPeriodicTable";


export class ElementLine
{
    constructor(
        public IUPAC: string,
        public Siegbahn: string,
        public energy: number, // eV
        public intensity: number, // arbitrary comparative intensity
        public tags: string[],
        public width: number
    )
    {
    }
}

export class EscapeLine
{
    constructor(
        public name: string,
        public parentSiegbahn: string,
        public energy: number, // eV
        public intensity: number, // arbitrary comparative intensity
    )
    {
    }
}

export class PeriodicTableItem
{
    constructor(
        public name: string,
        public atomicMass: number,
        public Z: number,
        public symbol: string,
        public lines: ElementLine[],
        public escapeLines: EscapeLine[]
    )
    {
    }
}

export class ElementOxidationState
{
    constructor(
        public formula: string,
        public element: string,
        public Z: number,
        public isElement: boolean, // Fe would contain true, Fe2O3 would contain false
        public conversionToElementWeightPct: number // For example, the number to divide Fe2O3 weight % to get Fe weight %
    )
    {
    }
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
    ["Rh", ["EscRh La1", "EscRh La2", "EscRh Lb1", "EscRh Lb4", "EscRh Lb3", "EscRh Lb6", "EscRh Lb2,15", "La1", "La2", "Lb1", "Lg1", /*Compt Ka1,*/ "Ka1", /*Compt Kb,*/ "Kb1"]],
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

class PeriodicTableDB
{
    private _periodicTable: PeriodicTableItem[] = [];
    private _commonElementsTable: PeriodicTableItem[] = [];
    private _symbolToIdx: Map<string, number> = new Map<string, number>();
    private _dbgOutput: boolean = false;

    constructor()
    {
        this.fillTable();
    }

    notifyDetectorConfig(forDetector: DetectorConfig): void
    {
        // Recalculate the periodic table, so we have ALL lines available to us, and we can then generate the combined line set
        this.fillTable();

        let t0 = performance.now();

        // Calculate escape lines (dependent on detector config). This is needed for common lines to be found correctly
        this.calculateEscapeLines(forDetector, false);

        // Now that we have escape lines, we can find the "common" element set
        this.findCommonXRFLines();

        // Finally, we combine XRF lines that are too close for PIXL resolution to see
        this.combineCloseXRFLines(forDetector);

        // Calculate escape lines (dependent on detector config). This is re-run so our escape lines are based on combined XRF lines
        this.calculateEscapeLines(forDetector, true);

        let t1 = performance.now();
        console.log("Periodic table configuration for detector took: " + (t1 - t0).toLocaleString() + "ms");
    }

    get maxAtomicNumber(): number
    {
        return this._periodicTable.length;
    }

    getElementByAtomicNumber(Z: number): PeriodicTableItem
    {
        if(Z > 0 && Z <= this._periodicTable.length)
        {
            return this._periodicTable[Z-1];
        }
        return null;
    }

    getElementBySymbol(formula: string): PeriodicTableItem
    {
        let idx = this.getElementIndex(formula);
        if(idx == null)
        {
            return null;
        }
        return this._periodicTable[idx];
    }

    getMolecularMass(formula: string): number
    {
        // Allows finding the molecular mass not just of an individual element, but of an entire formula, eg SiO2
        // This needs to find elements and the multipliciation factor in the formula
        let weight = 0;

        let formulaRemainder = formula;
        for(let c = 0; c < formula.length; c++) // ensure this always quits
        {
            let thisWeight = 0;

            let elem = this.getFirstElement(formulaRemainder);
            if(elem)
            {
                let elemItem = this.getElementBySymbol(elem);
                thisWeight = elemItem.atomicMass;

                // consume these chars
                formulaRemainder = formulaRemainder.substring(elem.length);
            }
            else
            {
                // Special case for FeO-T style "totals". Initially was only for FeO but can happen for others now
                // such as FeCO3-T
                if(formulaRemainder == "-T"/* && formula == "FeO-T"*/)
                {
                    formulaRemainder = "";
                    break;
                }

                console.warn("getMolecularMass: Failed to find element in \""+formulaRemainder+"\" part of formula: \""+formula+"\"");
                weight = 0;
                break;
            }

            // See if it is followed by a multiplier, eg CO2 - O finding it's x2
            let mult = this.getMultiplier(formulaRemainder);

            if(mult > 0)
            {
                thisWeight *= mult;

                // Consume the characters
                formulaRemainder = formulaRemainder.substring(mult.toString().length);
            }

            weight += thisWeight;

            if(formulaRemainder.length <= 0)
            {
                break;
            }
        }

        return weight;
    }

    // Returns the first element in the formula
    private getFirstElement(formula: string): string
    {
        // See if we can find an element on the first 2 chars
        let elem = formula.substring(0, 2);
        let state = this.getElementOxidationState(elem);
        if(state && state.isElement)
        {
            return state.element;
        }

        // If not, maybe it's only the first char
        elem = formula.substring(0, 1);
        state = this.getElementOxidationState(elem);
        if(state && state.isElement)
        {
            return state.element;
        }

        // Nope, return nothing
        return "";
    }

    // Returns the multiplier at the start of the formula string (or 0 if none)
    // Really just returns a number if string starts with one, used when parsing
    // a chemical formula
    private getMultiplier(formula: string): number
    {
        let num = Number.parseInt(formula);
        if(isNaN(num))
        {
            return 0;
        }
        if(num <= 0)
        {
            return 0;
        }
        return num;
    }

    getAtomicNumbersForSymbolList(formulaList: string[]): Set<number>
    {
        let result = new Set<number>();

        for(let formula of formulaList)
        {
            let idx = this.getElementIndex(formula);

            // Look up the value (it's really idx-1 but this is probably more future-proof)
            if(idx != null && idx >= 0 && idx < this._periodicTable.length)
            {
                result.add(this._periodicTable[idx].Z);
            }
        }

        return result;
    }

    private getElementIndex(formula: string): number
    {
        // NOTE: here a symbol was originally an element, but PIQUANT has since been modified
        // to return quantifications with oxides or carbonates of an element, so the symbol
        // might be Fe, but could be Fe2O3.
        // To work around this, here we first try look up by the first 2 letters, then by 1 letter
        // to cover the case of 1 char elements. If both fail, then return null
        // NOTE 2: PIQUANT has since been modified to also output (in particular with Iron) -T meaning
        // total. So this also has to handle that case

        let idx = this._symbolToIdx.get(formula.substring(0, 2));
        if(idx == undefined)
        {
            idx = this._symbolToIdx.get(formula.substring(0, 1));
            if(idx == undefined)
            {
                return null;
            }
        }

        return idx;
    }

    getElementOxidationState(formula: string): ElementOxidationState
    {
        let result: ElementOxidationState = null;

        let idx = this.getElementIndex(formula);
        if(idx != null)
        {
            // We found an element in it, check if this formula is longer than just the symbol and form
            // the result
            let elem = this._periodicTable[idx];
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
    getOnlyMostComplexStates(formulae: string[]): string[]
    {
        // Run through them all, find the oxides/carbonates and build a list of elements to exclude, and a list of elements we encounter
        let excludeElements: Set<string> = new Set<string>();
        let elementsSeen: Set<string> = new Set<string>();
        let result: Set<string> = new Set<string>();

        for(let formula of formulae)
        {
            let idx = this.getElementIndex(formula);
            if(idx != null)
            {
                let elem = this._periodicTable[idx];
                if(formula.length > elem.symbol.length)
                {
                    // This is an oxide or carbonate, because its formula is longer than the element symbol
                    // Eg: FeCO3 vs Fe
                    result.add(formula);

                    // Make sure we ignore its "pure" element
                    excludeElements.add(elem.symbol);
                }
                else if(formula == elem.symbol)
                {
                    // it's an element, eg comparing Fe with Fe
                    elementsSeen.add(formula);
                }
            }
        }

        // Now run through again and add any elements that aren't to be excluded
        for(let elem of elementsSeen.keys())
        {
            if(!excludeElements.has(elem))
            {
                result.add(elem);
            }
        }

        return Array.from(result.keys());
    }

    getFormulaToElementConversionFactor(element: string, formula: string): number
    {
        let result = 1;

        //console.log('getFormulaToElementConversionFactor: '+formula+'->'+element);
        let elementData = this.getElementBySymbol(element);
        if(elementData)
        {
            let elementMass = elementData.atomicMass;
            //console.log('elementMass: '+elementMass);

            // Find if it's multiplied by something
            let pos = element.length;

            let otherElementMass = 0;
            let lastElementMass = 0;

            let tmp = "";
            while(pos < formula.length)
            {
                let ch = formula.substring(pos, pos+1);
                //console.log('Read ch: '+ch);
                // Add to the last one
                tmp += ch;

                //console.log('tmp: '+tmp);

                // See if it's an element
                let tmpData = this.getElementBySymbol(tmp);
                if(tmpData)
                {
                    // If we already have a mass read, add it
                    otherElementMass += lastElementMass;

                    // Remember it
                    lastElementMass = tmpData.atomicMass;

                    tmp = "";
                    //console.log('otherElementMass: '+otherElementMass);
                    //console.log('lastElementMass: '+lastElementMass);
                }
                else
                {
                    // See if it's a multiplier
                    let mult = Number.parseInt(tmp);
                    if(!isNaN(mult) && mult > 0)
                    {
                        if(lastElementMass == 0)
                        {
                            // It's a multiplier for the element...
                            elementMass *= mult;
                        }
                        let massToAdd = mult*lastElementMass;
                        //console.log('change: '+massToAdd);
                        otherElementMass += massToAdd;
                        //console.log('otherElementMass: '+otherElementMass);
                        lastElementMass = 0;
                        tmp = "";
                    }
                    else
                    {
                        // Special case for handling FeO-T and other "-T" totals...
                        if(formula.substring(pos) == "-T" /*&& formula == "FeO-T"*/)
                        {
                            break;
                        }

                        console.warn("getFormulaToElementConversionFactor: Failed while parsing "+ch+" in: "+formula);
                    }
                }

                pos++;
            }

            if(lastElementMass != 0)
            {
                otherElementMass += lastElementMass;
            }

            if(otherElementMass != 0)
            {
                // We have the element mass (eg Ti), and the mass of "the other stuff" (eg O2 from TiO2). Get the mass of the element
                // as a percentage of the total mass, giving us a factor to multiply the total weight% (eg of TiO2), that allows us to
                // extract just the weight% of Ti. Our resultant value is the factor, and that multiplication with total weight% is elsewhere
                result = elementMass/(elementMass+otherElementMass);
            }
        }
        //console.log('result: '+result);
        //console.log('getFormulaToElementConversionFactor: '+formula+'->'+element+' factor='+result.toLocaleString());
        return result;
    }

    getElementSymbolsForAtomicNumbers(atomicNumbers: Set<number>): string[]
    {
        let symbols: string[] = [];
        for(let z of atomicNumbers)
        {
            symbols.push(this._periodicTable[z-1].symbol);
        }
        return symbols;
    }

    getElementsInAtomicNumberOrder(elements: string[]): string[]
    {
        let result = Array.from(elements);
        result.sort((a: string, b: string)=> 
        {
            // Get their atomic numbers
            let aElem = this.getElementBySymbol(a);
            let bElem = this.getElementBySymbol(b);

            if(aElem != null && bElem != null)
            {
                let aZ = aElem.Z;
                let bZ = bElem.Z;

                if(aZ < bZ) 
                {
                    return -1;
                }
                if(aZ > bZ) 
                {
                    return 1;
                }
            }

            return 0;
        });

        return result;
    }

    findAllXRFLinesForEnergy(commonElementsOnly: boolean, minkeV: number, maxkeV: number): XRFLine[]
    {
        let result: XRFLine[] = [];

        let table = this._periodicTable;
        if(commonElementsOnly)
        {
            table = this._commonElementsTable;
        }

        for(let item of table)
        {
            for(let line of item.lines)
            {
                let linekeV = line.energy / 1000; // It's stored in eV!
                if(linekeV > minkeV && linekeV < maxkeV)
                {
                    result.push(
                        XRFLine.makeXRFLineFromPeriodicTableItem(
                            item.symbol,
                            item.Z,
                            line
                        )
                    );
                }
            }

            for(let esc of item.escapeLines)
            {
                let linekeV = esc.energy / 1000; // It's stored in eV!
                if(linekeV > minkeV && linekeV < maxkeV)
                {
                    result.push(
                        XRFLine.makeXRFLineFromEscapeLine(
                            item.symbol,
                            item.Z,
                            esc
                        )
                    );
                }
            }
        }

        result.sort((a, b) => (a.eV < b.eV) ? 1 : -1);
        return result;
    }

    private fillTable()
    {
        let t0 = performance.now();

        this._periodicTable = [];
        this._symbolToIdx.clear();

        // Read the periodic table data into our typesafe structures
        for(let zStr of Object.keys(rawPeriodicTable))
        {
            let z = Number.parseInt(zStr);
            if(z >= 119)
            {
                // Ignoring really exotic stuff...
                break;
            }

            let rawItem = rawPeriodicTable[z];

            let item = new PeriodicTableItem(
                rawItem["name"],
                rawItem["atomic_mass"],
                rawItem["number"],
                rawItem["symbol"],
                [],
                []
            );

            // Add the lines
            let lines = rawItem["lines"];
            for(let c = 0; c < lines.length; c++)
            {
                let tags: string[] = [];
                if(lines[c]["tags"] !== undefined)
                {
                    for(let i = 0; i < lines[c]["tags"].length; i++)
                    {
                        tags.push(lines[c]["tags"][i]);
                    }
                }

                item.lines.push(
                    new ElementLine(
                        lines[c]["IUPAC"],
                        lines[c]["Siegbahn"],
                        lines[c]["energy"],
                        lines[c]["intensity"],
                        tags,
                        0
                    )
                );
            }

            if(z != this._periodicTable.length+1)
            {
                console.error("Failed to initialize periodic table DB at Z="+z);
                return;
            }

            // Add to symbol lookup - this adds the index at which it will be found in the periodic table array
            this._symbolToIdx.set(item.symbol, this._periodicTable.length);

            // Finally, store it in the periodic table
            this._periodicTable.push(item);
        }

        let t1 = performance.now();
        console.log("Periodic table filled with "+this._periodicTable.length+" elements. Took: " + (t1 - t0).toLocaleString() + "ms");
    }

    private calculateEscapeLines(forDetector: DetectorConfig, reducedSet: boolean): void
    {
        let t0 = performance.now();

        let detectorActiveLayer: XrayMaterial = new XrayMaterial([forDetector.windowElement]);
        let lineCachedCount = 0;

        // Below Ba we only want to show escapes for K lines, above Ba we show for K and L
        // In either case, we only show the top 2-3 lines.

        for(let atomicNum = forDetector.minElement; atomicNum <= forDetector.maxElement; atomicNum++)
        {
            let elemItem = this.getElementByAtomicNumber(atomicNum);

            // Should be the same...
            if(elemItem.Z != atomicNum)
            {
                console.error("calculateEscapeLines failed, atomicNum: "+atomicNum+" mismatch: "+elemItem.Z);
                return;
            }

            // Clear escape lines for this element
            elemItem.escapeLines = [];

            let linesToCalc = [];
            if(reducedSet)
            {
                // Z < BA:  We now only calculate escapes for the 2 most intense K lines
                // Z >= BA: We now only calculate escapes for the 2 most intense K and L lines
                let linesByIntensity = Array.from(elemItem.lines).sort((a, b) => (a.intensity < b.intensity) ? 1 : -1);

                let kCount = 0;
                let lCount = 0;

                for(let line of linesByIntensity)
                {   
                    if(atomicNum < 56)
                    {
                        if(line.Siegbahn[0] == "K")
                        {
                            linesToCalc.push(line);
                            if(linesToCalc.length >= 2)
                            {
                                break;
                            }
                        }
                    }
                    else
                    {
                        if(line.Siegbahn[0] == "K")
                        {
                            if(kCount < 2)
                            {
                                linesToCalc.push(line);
                                kCount++;
                            }
                        }
                        else if(line.Siegbahn[0] == "L")
                        {
                            if(lCount < 2)
                            {
                                linesToCalc.push(line);
                                lCount++;
                            }
                        }

                        if(lCount >= 2 && kCount >= 2)
                        {
                            break;
                        }
                    }
                }
            }
            else
            {
                // Calculating all (so we find all lines from the cheat sheet!)
                linesToCalc = elemItem.lines;
            }

            // Calculate new ones
            for(let line of linesToCalc)
            {
                let symbol = elemItem.symbol;
                let siegbahn = line.Siegbahn;

                let escapes = calcEscapeLines(line.energy, detectorActiveLayer);

                for(let esc of escapes)
                {
                    elemItem.escapeLines.push(
                        new EscapeLine(
                            "Esc"+symbol+" "+siegbahn,
                            siegbahn,
                            esc.energy,
                            esc.fraction
                        )
                    );

                    lineCachedCount++;
                }
            }
        }

        let t1 = performance.now();
        console.log("Escape line calculation took: " + (t1 - t0).toLocaleString() + "ms, cached "+lineCachedCount+" lines");
    }

    private findCommonXRFLines()
    {
        let t0 = performance.now();

        this._commonElementsTable = [];

        // Run through all elements and copy the common lines into this table
        for(let [symbol, siegbahns] of commonLines)
        {
            // Get the element, find the lines by siegbahn name
            let elem = this.getElementBySymbol(symbol);
            if(!elem)
            {
                console.error("Failed to find element: "+symbol+" when marking common XRF lines");
                return;
            }

            let saveItem = new PeriodicTableItem(
                elem.name,
                elem.atomicMass,
                elem.Z,
                elem.symbol,
                [],
                []
            );

            let foundNames = [];
            for(let line of elem.lines)
            {
                if(siegbahns.indexOf(line.Siegbahn) > -1)
                {
                    // Store this one!
                    saveItem.lines.push(
                        new ElementLine(line.IUPAC, line.Siegbahn, line.energy, line.intensity, Array.from(line.tags), line.width)
                    );

                    if(foundNames.indexOf(line.Siegbahn) < 0)
                    {
                        foundNames.push(line.Siegbahn);
                    }
                }
            }

            for(let esc of elem.escapeLines)
            {
                if(siegbahns.indexOf(esc.name) > -1)
                {
                    // Store this one!
                    saveItem.escapeLines.push(
                        new EscapeLine(esc.name, esc.parentSiegbahn, esc.energy, esc.intensity)
                    );

                    if(foundNames.indexOf(esc.name) < 0)
                    {
                        foundNames.push(esc.name);
                    }
                }
            }

            // Check we found all
            let sortedExpected = siegbahns.sort((one, two) => (one > two ? -1 : 1));
            let sortedFound = foundNames.sort((one, two) => (one > two ? -1 : 1));

            if(sortedExpected.length != sortedFound.length)
            {
                console.error("Failed to find all lines for: "+symbol+", exp: "+JSON.stringify(siegbahns)+", got: "+JSON.stringify(sortedFound));
            }
            else
            {
                for(let c = 0; c < sortedExpected.length; c++)
                {
                    if(sortedExpected[c] != sortedFound[c])
                    {
                        console.error("Mismatched lines for: "+symbol+", exp: "+JSON.stringify(sortedExpected)+", got: "+JSON.stringify(sortedFound));
                    }
                }
            }

            if(saveItem.lines.length > 0 || saveItem.escapeLines.length > 0)
            {
                this._commonElementsTable.push(saveItem);
            }
        }

        let t1 = performance.now();
        console.log("Finding common element XRF lines took: " + (t1 - t0).toLocaleString() + "ms, found "+this._commonElementsTable.length+" elements");
    }

    private combineCloseXRFLines(forDetector: DetectorConfig)
    {
        let t0 = performance.now();
        /*
let item = this.getElementBySymbol("Ni");
console.log(item.symbol);
this.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Fe");
console.log(item.symbol);
this.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Ca");
console.log(item.symbol);
this.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Rh");
console.log(item.symbol);
this.dbgPrintLines(item.lines);
*/
        // Loop through each element and find lines that are too close for our detector resolution, and combine those
        let preCount = 0;
        let postCount = 0;
        //let preCountEsc = 0;
        //let postCountEsc = 0;

        for(let Z = forDetector.minElement; Z <= forDetector.maxElement; Z++)
        {
            let item = this._periodicTable[Z-1];
            if(this._dbgOutput)
            {
                console.log("Combining lines for: "+item.symbol);
            }
            preCount += item.lines.length;
            item.lines = this.combineCloseElementLines(forDetector, item.lines, false);
            postCount += item.lines.length;
        }

        let t1 = performance.now();
        console.log("Combined XRF lines too close to see at detector resolution: "+forDetector.xrfeVResolution+". Took: " + (t1 - t0).toLocaleString() + "ms, lines reduced from "+preCount+" to "+postCount);//+', escapes reduced from '+preCountEsc+' to '+postCountEsc);

        /*
item = this.getElementBySymbol("Ni");
console.log(item.symbol);
this.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Fe");
console.log(item.symbol);
this.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Ca");
console.log(item.symbol);
this.dbgPrintLines(item.lines);

item = this.getElementBySymbol("Rh");
console.log(item.symbol);
this.dbgPrintLines(item.lines);
*/
    }

    private combineCloseElementLines(forDetector: DetectorConfig, elementLines: ElementLine[], dbg: boolean): ElementLine[]
    {
        if(dbg)
        {
            this.dbgPrintLines(elementLines, "combineCloseElementLines input lines:");
        }

        const defaultWidth = 155; // TODO: how do we get this from detector resolution?
        const energyWithinRange = 180;
        const energyWithinRangeIntensityVariable = forDetector.xrfeVResolution-energyWithinRange;
        const allowedWidthRatio = 5;
        const deltaCompareFactor = Math.sqrt(0.5);

        // 1. Assign all lines a width, σ, of 155 eV. Every line should have a location, E, an intensity, I, and a width, σ.
        // NOTE: line already has width, energy, intensity set.
        for(let line of elementLines)
        {
            line.width = defaultWidth;
        }

        // 2. For all lines in the line database in order of decreasing line intensity, do the following:
        let linesByIntensity = Array.from(elementLines);
        linesByIntensity.sort((a, b) => (a.intensity < b.intensity) ? 1 : -1);

        let c = 0;
        while(c < linesByIntensity.length)
        {
            // a. Call the current line 1.
            let line1 = linesByIntensity[c];

            let sMainLineSq = line1.width*line1.width;

            // b. Identify all other lines within 230 eV. This is the potentially combined set
            let potentiallyCombinedIdxSet: number[] = [];
            for(let i = 0; i < linesByIntensity.length; i++)
            {
                let energyDiffToMainLine = line1.energy-linesByIntensity[i].energy;
                if(c != i && Math.abs(energyDiffToMainLine) < forDetector.xrfeVResolution)
                {
                    let thisLine = linesByIntensity[i];

                    // c. For each of these other lines, calculate the ratio of the width squared to the width of the main potentially combined line squared
                    let sThisLineSq = thisLine.width*thisLine.width;
                    let s = sMainLineSq/sThisLineSq;

                    // d. For each of these lines, also calculate the ratio of line intensities:
                    let p = thisLine.intensity / line1.intensity;

                    // e. For any line with s<5, remove from the potentially combined set if not within 180 "eV"+(50 "eV")ρ of the main line.
                    let allowedEnergyRange = energyWithinRange+energyWithinRangeIntensityVariable*p;

                    // In other words, if s>5 add, or if s<5 add if within the above...
                    if(s > allowedWidthRatio || Math.abs(energyDiffToMainLine) < allowedEnergyRange)
                    {
                        potentiallyCombinedIdxSet.push(i);
                    }
                }
            }

            // f. If the potentially combined set has at least one line in it, do the following:
            if(potentiallyCombinedIdxSet.length > 0)
            {
                // i. Pick the most intense line within the set of potentially combined line and combine according to the following rules
                //    (∆^* and ∆ are intermediate variables for calculation that should not be stored for the combined line):
                let maxIntensity = linesByIntensity[potentiallyCombinedIdxSet[0]].intensity;
                let maxIntensityIdx = potentiallyCombinedIdxSet[0];
                for(let i = 1; i < potentiallyCombinedIdxSet.length; i++)
                {
                    const idx = potentiallyCombinedIdxSet[i];
                    if(linesByIntensity[idx].intensity > maxIntensity)
                    {
                        maxIntensity = linesByIntensity[idx].intensity;
                        maxIntensityIdx = idx;
                    }
                }

                let thisLine = linesByIntensity[maxIntensityIdx];
                let sThisLineSq = thisLine.width*thisLine.width;

                let s = sMainLineSq/sThisLineSq;
                let p = thisLine.intensity / line1.intensity;

                // ∆^*=(ρs^(1⁄2))/(1+ρs^(1⁄2) )
                let psSqrt = Math.sqrt(p*s);
                let deltaStar = psSqrt / (1+psSqrt);

                let delta = 0;
                if(deltaStar < deltaCompareFactor)
                {
                    delta = deltaStar / 2;
                }
                else
                {
                    delta = (1+deltaStar) / 2;
                }

                let Ecombined = line1.energy + delta*(thisLine.energy-line1.energy);
                let Icombined = line1.intensity*Math.exp(-(Math.pow((Ecombined-line1.energy)/line1.width, 2))) + thisLine.intensity*Math.exp(-(Math.pow((Ecombined-thisLine.energy)/thisLine.width, 2)));
                let widthcombined = (line1.intensity*line1.width + thisLine.intensity*thisLine.width) / Icombined;

                // ii. Add the combined line to the line database and remove the two lines that were combined. Clear the potentially combined
                //     set. (These may be combined later, but not necessarily now.)
                let combinedTags = Array.from((new Set<string>([...line1.tags, ...thisLine.tags])).values());
                let combinedSiegbahn = this.makeCombinedSiegbahn(line1.Siegbahn, thisLine.Siegbahn);
                let combinedLine = new ElementLine(
                    line1.IUPAC+" + "+thisLine.IUPAC,
                    combinedSiegbahn,
                    Ecombined,
                    Icombined,
                    combinedTags,
                    widthcombined
                );

                if(maxIntensityIdx > c) // Remove bigger idx first, so we don't mess up the second removal
                {
                    linesByIntensity.splice(maxIntensityIdx, 1);
                    linesByIntensity.splice(c, 1);
                }
                else
                {
                    linesByIntensity.splice(c, 1);
                    linesByIntensity.splice(maxIntensityIdx, 1);
                }

                linesByIntensity.push(combinedLine);

                // iii. Restart the for loop (2) with the new line dataset
                c = 0;

                if(dbg)
                {
                    this.dbgPrintLines(linesByIntensity, "Printing lines at end of iteration:");
                }
            }
            // g. Else continue to loop through all lines.
            else
            {
                c++;
            }
        }
        
        return linesByIntensity;
    }

    private dbgPrintLines(elementLines: ElementLine[], title: string): void
    {
        let copy = Array.from(elementLines);
        copy.sort((a, b) => (a.energy > b.energy) ? 1 : -1);

        let c = 0;
        let w = title+"\n";
        for(let l of copy)
        {
            w += "  ["+c+"] siegbahn="+l.Siegbahn+" eV="+l.energy.toLocaleString()+", intensity="+l.intensity.toLocaleString()+", width="+l.width.toLocaleString()+", tags=["+l.tags.join(",")+"]\n";
            c++;
        }
        console.log(w);
    }

    private makeCombinedSiegbahn(siegbahn1: string, siegbahn2: string): string
    {
        // Find the idx where number starts in both
        let siegbahn1Bits = this.splitSiegbahn(siegbahn1);
        let siegbahn2Bits = this.splitSiegbahn(siegbahn2);

        if(siegbahn1Bits.length < 2 || siegbahn2Bits.length < 2)
        {
            return siegbahn1+","+siegbahn2;
        }

        // ensure they start the same way
        if(siegbahn1Bits[0] != siegbahn2Bits[0])
        {
            if(this._dbgOutput)
            {
                console.log("Siegbahn combine failed for: "+siegbahn1+" + "+siegbahn2);
            }
            return siegbahn1+","+siegbahn2;
        }

        // Combine them with the lowest number first
        let lineNums: number[] = [];
        for(let c = 1; c < siegbahn1Bits.length; c++)
        {
            lineNums.push(Number.parseInt(siegbahn1Bits[c]));
        }
        for(let c = 1; c < siegbahn2Bits.length; c++)
        {
            lineNums.push(Number.parseInt(siegbahn2Bits[c]));
        }
        lineNums.sort((a, b) => (a > b) ? 1 : -1);

        return siegbahn1Bits[0]+lineNums.join(",");
    }

    private splitSiegbahn(siegbahn: string): string[]
    {
        let splitIdx = -1;
        for(let c = 0; c < siegbahn.length; c++)
        {
            if(siegbahn[c] >= "0" && siegbahn[c] <= "9")
            {
                if(splitIdx < 0)
                {
                    splitIdx = c;
                }
            }
            else
            {
                if(splitIdx > 0 && siegbahn[c] != ",")
                {
                    // Found non-digit after digits started, bail
                    if(this._dbgOutput)
                    {
                        console.log("Failed to parse number in siegbahn: "+siegbahn);
                    }
                    return [];
                }
            }
        }

        if(splitIdx > 0 && splitIdx < 3)
        {
            return [siegbahn.substr(0, splitIdx), ...siegbahn.substr(splitIdx, siegbahn.length-splitIdx).split(",")];
        }
        if(this._dbgOutput)
        {
            console.log("Failed to parse siegbahn: "+siegbahn);
        }
        return [];
    }
}

export const periodicTableDB: PeriodicTableDB = new PeriodicTableDB();
