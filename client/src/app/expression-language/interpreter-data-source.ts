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

import {
    DiffractionPeakQuerierSource, HousekeepingDataQuerierSource, PseudoIntensityDataQuerierSource, QuantifiedDataQuerierSource, SpectrumDataQuerierSource
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues, QuantOp } from "src/app/expression-language/data-values";
import { DataSet } from "src/app/models/DataSet";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";


export class InterpreterDataSource
{
    constructor(
        public quantDataSource: QuantifiedDataQuerierSource,
        public pseudoDataSource: PseudoIntensityDataQuerierSource,
        public housekeepingDataSource: HousekeepingDataQuerierSource,
        public spectrumDataSource: SpectrumDataQuerierSource,
        public diffractionSource: DiffractionPeakQuerierSource,
        private _dataset: DataSet
    )
    {
    }

    ////////////////////////////////////// Calling Quant Data Source //////////////////////////////////////
    // Expects: Fe, %, A for example
    // Optionally supports mmol conversion for % values by specifying %-as-mmol
    public readElement(argList): PMCDataValues
    {
        if(argList.length != 3 || (typeof argList[0] != "string") || (typeof argList[1] != "string") || (typeof argList[2] != "string"))
        {
            throw new Error("element() expression expects 3 parameters: element, datatype, detector Id. Received: "+JSON.stringify(argList));
        }

        if(!this.quantDataSource)
        {
            throw new Error("element() expression failed, no quantification data loaded");
        }

        // Work out the column, and if we have mmol requested, it should only work for %
        let col = argList[1];
        let asMmol = false;

        if(col == "%-as-mmol")
        {
            col = "%";
            asMmol = true;
        }

        let dataLabel = argList[0]+"_"+col;
        let result = this.quantDataSource.getQuantifiedDataForDetector(argList[2], dataLabel);

        if(asMmol)
        {
            result = this.convertToMmol(argList[0], result);
        }

        return result;
    }

    private convertToMmol(formula: string, values: PMCDataValues): PMCDataValues
    {
        let result: PMCDataValue[] = [];

        let conversion = 1;

        /* REMOVED Because this was a more special case, see the new FeO-T workaround below
        // Also note, FeO-T can be converted to Fe2O3 by multiplying by 1.111 according to email from Balz Kamber
        if(formula == "FeO-T")
        {
            conversion = 1.111;
            formula = "Fe2O3";
        }
*/
        /* Modified because it now turns out we have other special cases such as FeCO3-T, so lets make it generic...
        if(formula == "FeO-T")
        {
            // We don't know what flavour of FeO we're dealing with, just the total. Mike discovered that the above 1.111 conversion
            // was giving back values 2x as large as expected. Just treat it like FeO
            formula = "FeO";
        }
*/

        // We are dealing with a "total" quantification of something, eg FeO, so here we just treat it like the element being quantified!
        if(formula.endsWith("-T"))
        {
            formula = formula.substring(0, formula.length-2);
        }

        let mass = periodicTableDB.getMolecularMass(formula);
        if(mass > 0)
        {
            // Success parsing it, work out the conversion factor:
            // This came from an email from Joel Hurowitz:
            // weight % (eg 30%) -> decimal (div by 100)
            // divide by mass
            // mult by 1000 to give mol/kg
            conversion *= 10/mass; // AKA: 1/100/mass*1000;
        }

        for(let c = 0; c < values.values.length; c++)
        {
            let valToSave = 0;
            if(!values.values[c].isUndefined)
            {
                valToSave = values.values[c].value*conversion;
            }

            result.push(new PMCDataValue(values.values[c].pmc, valToSave, values.values[c].isUndefined));
        }

        return PMCDataValues.makeWithValues(result);
    }

    // Expects: %, A for example, calls element() for each element there is, and returns the sum of the values
    public readElementSum(argList): PMCDataValues
    {
        if(argList.length != 2 || (typeof argList[0] != "string") || (typeof argList[1] != "string"))
        {
            throw new Error("elementSum() expression expects 2 parameters: datatype, detector Id. Received: "+JSON.stringify(argList));
        }

        if(!this.quantDataSource)
        {
            throw new Error("elementSum() expression failed, no quantification data loaded");
        }

        let result: PMCDataValues = null;
        let allElems = this.quantDataSource.getElementList();

        // NOTE we want only the "most complex" states, these are the ones that were in the quant file, and the ones we should be adding
        let elems = periodicTableDB.getOnlyMostComplexStates(allElems);

        for(let elem of elems)
        {
            let dataLabel = elem+"_"+argList[0];
            let vals = this.quantDataSource.getQuantifiedDataForDetector(argList[1], dataLabel);

            if(!result)
            {
                result = vals;
            }
            else
            {
                result = result.operationWithMap(QuantOp.ADD, vals);
            }
        }
        
        return result;
    }

    // Expects: chisq, A for example
    public readMap(argList): PMCDataValues
    {
        if(argList.length != 2 || (typeof argList[0] != "string") || (typeof argList[1] != "string"))
        {
            throw new Error("data() expression expects 2 parameters: quantified column name, detector Id. Received: "+argList.length+" parameters");
        }

        if(!this.quantDataSource)
        {
            throw new Error("data() expression failed, no quantification data loaded");
        }

        return this.quantDataSource.getQuantifiedDataForDetector(argList[1], argList[0]);
    }

    // Expects: 1, 2, A|Normal for example (eV start, eV end, A|Normal or B|Normal or A|Dwell)
    public readSpectrum(argList): PMCDataValues
    {
        if(
            argList.length != 3 ||
            (typeof argList[0] != "number") ||
            (typeof argList[1] != "number") ||
            (typeof argList[2] != "string")
        )
        {
            throw new Error("spectrum() expression expects 3 parameters: start channel, end channel, detector. Received: "+argList.length+" parameters");
        }

        if(!this.spectrumDataSource)
        {
            throw new Error("spectrum() expression failed, no data loaded");
        }

        return this.spectrumDataSource.getSpectrumRangeMapData(argList[0], argList[1], argList[2]); // TODO: supply a formula here to describe how to query the spectrum, eg A, or A+B, or MAX(A,B)
    }

    // Expects: 1, 2, 'sum'|'max'
    public readSpectrumDifferences(argList): PMCDataValues
    {
        if(
            argList.length != 3 ||
            (typeof argList[0] != "number") ||
            (typeof argList[1] != "number") ||
            (typeof argList[2] != "string")
        )
        {
            throw new Error("spectrumDiff() expression expects 3 parameters: start channel, end channel, \"sum\"|\"max\". Received: "+argList.length+" parameters");
        }

        if(!this.spectrumDataSource)
        {
            throw new Error("spectrumDiff() expression failed, no data loaded");
        }

        // Validate the string
        let sumOrMax = false;
        if(argList[2] == "sum")
        {
            sumOrMax = true;
        }
        else if(argList[2] == "max")
        {
            sumOrMax = false;
        }
        else
        {
            throw new Error("spectrumDiff() expected param 3 to be \"sum\" or \"max\", got: "+argList[2]);
        }

        return this.spectrumDataSource.getSpectrumDifferences(argList[0], argList[1], sumOrMax);
    }

    ////////////////////////////////////// Calling Diffraction Data Source //////////////////////////////////////
    // Expects: 1, 2 for example (eV start, eV end)
    public readDiffractionData(argList): PMCDataValues
    {
        if(
            argList.length != 2 ||
            (typeof argList[0] != "number") ||
            (typeof argList[1] != "number")
        )
        {
            throw new Error("diffractionPeaks() expression expects 2 parameters: start channel, end channel. Received: "+argList.length+" parameters");
        }

        if(!this.diffractionSource)
        {
            throw new Error("diffractionPeaks() expression failed, no diffraction data loaded");
        }

        return this.diffractionSource.getDiffractionPeakEffectData(argList[0], argList[1], this._dataset);
    }

    // Expects: NO parameters
    public readRoughnessData(argList): PMCDataValues
    {
        if(argList.length != 0)
        {
            throw new Error("roughness() expression expects NO parameters. Received: "+argList.length+" parameters");
        }

        if(!this.diffractionSource)
        {
            throw new Error("roughness() expression failed, no diffraction data loaded");
        }

        return this.diffractionSource.getRoughnessData(this._dataset);
    }

    // Expects: NO parameters
    public readPosition(argList): PMCDataValues
    {
        if(argList.length != 1 && argList[0] != "x" && argList[0] != "y" && argList[0] != "z")
        {
            throw new Error("position() expression expects 1 parameter: x, y or z");
        }

        if(!this.housekeepingDataSource)
        {
            throw new Error("position() expression failed, no housekeeping data loaded");
        }

        return this.housekeepingDataSource.getPositionData(argList[0]);
    }

    // Expects: 1 parameter, the values to put into each map cell
    public makeMap(argList): PMCDataValues
    {
        if(
            argList.length != 1 || // only 1 param
            (typeof argList[0] != "number") // must be a number
            )
        {
            throw new Error("makeMap() expression expects 1 parameter: map value");
        }

        if(!this.quantDataSource)
        {
            throw new Error("makeMap() expression failed, failed to determine map dimensions");
        }

        let quantifiedPMCs = this.quantDataSource.getPMCList();
        let mapValue = argList[0];

        let values: PMCDataValue[] = [];

        for(let pmc of quantifiedPMCs)
        {
            values.push(
                new PMCDataValue(
                    pmc,
                    mapValue
                )
            );
        }

        return PMCDataValues.makeWithValues(values);
    }

    ////////////////////////////////////// Querying Periodic Table Data //////////////////////////////////////
    // Expects: Element symbol, eg Fe or O and also works with carbonates/oxides the same way the rest of
    //          PIXLISE works it out
    // Returns: scalar atomic mass
    public atomicMass(argList): number
    {
        if(argList.length != 1)
        {
            throw new Error("atomicMass() expression expects 1 parameters: Atomic symbol. Received: "+argList.length+" parameters");
        }
        if(typeof argList[0] != "string")
        {
            throw new Error("atomicMass() expression expects 1 parameters: Atomic symbol, eg Fe, O or Fe2O3");
        }

        let mass = periodicTableDB.getMolecularMass(argList[0]);
        if(mass <= 0)
        {
            throw new Error("atomicMass() Failed to calculate mass for: "+argList[0]);
        }
        return mass;
    }

    ////////////////////////////////////// Calling Pseudo-Intensity Data Source //////////////////////////////////////
    // Expects: Fe for example
    public readPseudoIntensity(argList): PMCDataValues
    {
        if(argList.length != 1 || (typeof argList[0] != "string"))
        {
            throw new Error("pseudo() expects 1 parameters: pseudo-intensity-element name. Received: "+argList.length+" parameters");
        }

        if(!this.pseudoDataSource)
        {
            throw new Error("pseudo() failed, no pseudo-intensity data exists in currently loaded data set.");
        }

        return this.pseudoDataSource.getPseudoIntensityData(argList[0]);
    }

    ////////////////////////////////////// Calling Pseudo-Intensity Data Source //////////////////////////////////////
    // Expects: Name of the housekeeping data column
    public readHousekeepingData(argList): PMCDataValues
    {
        if(argList.length != 1 || (typeof argList[0] != "string"))
        {
            throw new Error("housekeeping() expects 1 parameters: data column name. Received: "+argList.length+" parameters");
        }

        if(!this.housekeepingDataSource)
        {
            throw new Error("housekeeping() data retrieval failed, no housekeeping data exists in currently loaded data set.");
        }

        return this.housekeepingDataSource.getHousekeepingData(argList[0]);
    }

    ////////////////////////////////////// Checking if data exists //////////////////////////////////////
    // Expects: Data Type, Column
    // Data Type must be one of: "element", "detector", "data", "housekeeping", "pseudo"
    // The Column parameter depends on what the first one was, eg can ask for:
    // - "element", "Ca" or "element", "CaO".
    // - "detector", "A" or "detector", "Combined".
    // - "data", "chisq".
    // - "housekeeping", "f_pixl_3_3_volt"
    // - "pseudo", "Ca"
    public exists(dataType: string, column: string): boolean
    {
        // Check if the data is available
        if(dataType == "element")
        {
            let elems = this.quantDataSource.getElementList();
            return elems.indexOf(column) > -1;
        }
        else if(dataType == "detector")
        {
            let dets = this.quantDataSource.getDetectors();
            return dets.indexOf(column) > -1;
        }
        else if(dataType == "data")
        {
            return this.quantDataSource.columnExists(column);
        }
        else if(dataType == "housekeeping")
        {
            return this.housekeepingDataSource.hasHousekeepingData(column);
        }
        else if(dataType == "pseudo")
        {
            let elems = this.pseudoDataSource.getPseudoIntensityElementsList();
            return elems.indexOf(column) > -1;
        }

        const validDataTypes = InterpreterDataSource.validExistsDataTypes;
        throw new Error("exists() expects 2 parameters: data type (one of: ["+validDataTypes.join(", ")+"]) and column");
    }

    public static validExistsDataTypes = ["element", "detector", "data", "housekeeping", "pseudo"];
}
