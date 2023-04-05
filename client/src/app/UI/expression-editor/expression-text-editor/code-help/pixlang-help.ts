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

import { QuantificationLayer } from "src/app/models/Quantifications";
import { DataSet } from "src/app/models/DataSet";
import { SourceHelp, HelpSignature, HelpCompletionItem, FunctionHelp, FunctionParamHelp, SourceContextParser } from "./help";



export class PIXLANGHelp implements SourceHelp
{
    private _allHelp = new Map<string, FunctionHelp>();

    constructor()
    {
        // --- Map querying
        let elementFormulae = new FunctionParamHelp("elementFormula", "Element formula to read for");
        elementFormulae.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            return quantificationLoaded?.getElementFormulae() || [];
        };

        let elementColumns = new FunctionParamHelp("column", "Which column to use for the given element formula");
        elementColumns.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            // Resolved when needed, needs preceeding elementFormulae parameter
            if(paramsProvided.length > 0)
            {
                // Assume the first parameter is the elementFormula!
                // Clear quotes from the parameter or it won't be interpreted correctly
                let colType = quantificationLoaded?.getElementColumns(SourceContextParser.stripQuotes(paramsProvided[0]));
                if(colType.indexOf("%") >= 0 && colType.indexOf("%-as-mmol") < 0)
                {
                    colType.push("%-as-mmol");
                }
                return colType;
            }
            return [];
        };

        let detectors = new FunctionParamHelp("detector", "Detector to read from");
        detectors.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            return quantificationLoaded?.getDetectors();
        };

        this.addHelp(new FunctionHelp("element", "Queries element map values", [
            elementFormulae,
            elementColumns,
            detectors,
        ]));

        this.addHelp(new FunctionHelp("elementSum", "Sum of column values for all elements in quantification", [
            elementColumns,
            detectors,
        ]));

        let dataColumn = new FunctionParamHelp("column", "Selects a column to read, use for non-element-related columns");
        dataColumn.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            return quantificationLoaded?.getDataColumns() || [];
        };

        this.addHelp(new FunctionHelp("data", "Reads the data column specified", [
            dataColumn,
            detectors,
        ]));

        this.addHelp(new FunctionHelp("spectrum", "Retrieves the sum of counts between start and end channels, for the given detector", [
            new FunctionParamHelp("startChannel", "Start channel (0-4095)"),
            new FunctionParamHelp("endChannel", "End channel (0-4095)"),
            detectors,
        ]));

        this.addHelp(new FunctionHelp("spectrumDiff", "Retrieves the sum of counts between start and end channels, for the given detector", [
            new FunctionParamHelp("startChannel", "Start channel (0-4095)"),
            new FunctionParamHelp("endChannel", "End channel (0-4095)"),
            new FunctionParamHelp("operation", "The operation to combine channel counts for a detector", ["max", "sum"]),
            detectors,
        ]));

        let pseudoItem = new FunctionParamHelp("element", "The pseudo-intensity element");
        dataColumn.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            return dataset.getPseudoIntensityElementsList();
        };

        this.addHelp(new FunctionHelp("pseudo", "Returns pseudo-intensity map for given element", [
            pseudoItem
        ]));

        let housekeepingColumn = new FunctionParamHelp("column", "The housekeeping CSV column to retrieve data for");
        dataColumn.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            return dataset.experiment.getMetaLabelsList();
        };

        this.addHelp(new FunctionHelp("housekeeping", "Retrieves housekeeping data from specified column", [
            housekeepingColumn
        ]));

        this.addHelp(new FunctionHelp("diffractionPeaks", "Returns a map of diffraction peak counts per PMC", [
            new FunctionParamHelp("eVstart", "eV range start. Note, this depends on the spectrum calibration currently set!"),
            new FunctionParamHelp("eVend", "eV range end. Note, this depends on the spectrum calibration currently set!")
        ]));

        this.addHelp(new FunctionHelp("roughness", "Retrieves a map of roughness from diffraction database globalDifference value (higher means rougher)"));

        this.addHelp(new FunctionHelp("position", "Returns a map of position values for each PMC", [
            new FunctionParamHelp("axis", "The axis to read", ["x", "y", "z"])
        ]));

        this.addHelp(new FunctionHelp("makeMap", "Makes a map with each PMC having the value specified. The map will have the same dimensions as other maps obtained", [
            new FunctionParamHelp("value", "Value for each PMC in a map. Useful for eg to make a unit map of 1's")
        ]));

        this.addHelp(new FunctionHelp("atomicMass", "Returns the atomic mass of the formula, uses the same calculation as elsewhere in PIXLISE", [
            new FunctionParamHelp("elementFormulae", "The formula to calculate the mass of, for example: Ca or Fe2O3")
        ]));

        // --- Map operations
        this.addHelp(new FunctionHelp("threshold", "Returns a map with where the value of each PMC in the source map is checked to be within compare +/- threshold, if so, a 1 is returned, but if it's outside the range, 0 is returned", [
            new FunctionParamHelp("map", "The map to threshold"),
            new FunctionParamHelp("compare", "The comparison value"),
            new FunctionParamHelp("threshold", "The range of comparison (used as +/- around the compare value)")
        ]));
        
        this.addHelp(new FunctionHelp("normalise", "Normalises a map by finding the min and max value, then computing each PMCs value as a percentage between that min and max, so all output values range between 0.0 and 1.0", [
            new FunctionParamHelp("map", "The map to normalise"),
        ]));

        this.addHelp(new FunctionHelp("pow", "Calculates pow of each map PMC value, to the given exponent", [
            new FunctionParamHelp("value", "The map (or scalar) to raise to a power. If a scalar is used, all map values created will be the same."),
            new FunctionParamHelp("exponent", "Exponent to raise value to"),
        ]));

        this.addHelp(new FunctionHelp("under", "Returns a map where value is 1 if less than reference, else 0", [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
        ]));

        this.addHelp(new FunctionHelp("under_undef", "Returns a map where value is 1 if less than reference, else undefined (will leave holes in context image maps for example!)", [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
        ]));

        this.addHelp(new FunctionHelp("over", "Returns a map where value is 1 if greater than reference, else 0", [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
        ]));

        this.addHelp(new FunctionHelp("over_undef", "Returns a map where value is 1 if greater than reference, else undefined (will leave holes in context image maps for example!", [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
        ]));

        this.addHelp(new FunctionHelp("avg", "Returns a map which is the average of the 2 parameters specified", [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("value", "May be a map or scalar, to calculate the average from using the first map parameter")
        ]));
        
        this.addHelp(new FunctionHelp("min", "Returns a map which is the minimum of the 2 parameters specified", [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("value", "May be a map or scalar, to find the minimum from using the first map parameter")
        ]));
        
        this.addHelp(new FunctionHelp("max", "Returns a map which is the maximum of the 2 parameters specified", [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("value", "May be a map or scalar, to find the maximum from using the first map parameter")
        ]));

        this.addHelp(new FunctionHelp("ln", "Returns a map where each PMC contains the natural logarithm of the given value (or the corresponding PMCs value if the parameter is a map)", [
            new FunctionParamHelp("value", "May be a map or scalar")
        ]));

        this.addHelp(new FunctionHelp("exp", "Returns a map where each PMC contains the e raised to the value (or the corresponding PMCs value if the parameter is a map)", [
            new FunctionParamHelp("value", "May be a map or scalar")
        ]));

        // --- Trig functions
        let trigFuncs = ["sin", "cos", "tan", "asin", "acos", "atan"];

        for(let f of trigFuncs)
        {
            this.addHelp(new FunctionHelp(f, "Returns a map where each PMC value is "+f+" of the given angle (or map of angles)", [
                new FunctionParamHelp("angle", "Angle in radians")
            ]));
        }
    }

    private addHelp(h: FunctionHelp): void
    {
        this._allHelp.set(h.name, h);
    }

    getKeywords(): string[]
    {
        return Array.from(this._allHelp.keys());
    }

    getCompletionItems(): HelpCompletionItem[]
    {
        let result: HelpCompletionItem[] = [];

        for(let item of this._allHelp.values())
        {
/*            let sig = item.name+"(";
            let first = true;
            for(let p of item.params)
            {
                if(!first)
                {
                    sig += ",";
                }

                sig += p.name;
                first = false;
            }
            sig += ")";
*/
            result.push(new HelpCompletionItem(item.name, item.doc/*, sig*/));
        }

        return result;
    }

    getSignatureHelp(funcName: string, paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet): HelpSignature
    {
        let help = this._allHelp.get(funcName);
        if(!help)
        {
            help = this._allHelp.get("element");
            return null;
        }
    /*
        let params: HelpSignatureParam[] = [];

        for(let p of help.params)
        {
            params.push(new HelpSignatureParam(
                p.name,
                p.doc,
                p.getPossibleValues(paramsProvided, quantificationLoaded, dataset)
            ));
        }

        return new HelpSignature(
            help.name,
            help.doc,
            params
        );*/

        if(help.params.length <= 0)
        {
            return new HelpSignature(
                funcName+"(",
                "",
                ")",
                "",
                [],
                0
            );
        }

        let paramIdx = paramsProvided.length;
        let result = new HelpSignature(
            funcName+"(",
            help.params[paramIdx].name,
            "",
            help.params[paramIdx].doc,
            [],
            paramIdx-1
        );

        // Fill in params we've passed over already
        for(let c = 0; c < paramIdx; c++)
        {
            result.prefix += help.params[c].name;

            if(c < help.params.length-1)
            {
                result.prefix += ", ";
            }
        }

        // Add in parameters we haven't specified yet
        for(let c = paramIdx+1; c < help.params.length; c++)
        {
            //if(result.suffix.length > 0 || paramIdx == 0)
            {
                result.suffix += ", ";
            }
            result.suffix += help.params[c].name;
        }
        result.suffix += ")";

        // Add possible values to docs if needed
        let possibilities = help.params[paramIdx].getPossibleValues(paramsProvided, quantificationLoaded, dataset);
        if(possibilities && possibilities.length > 0)
        {
            result.paramPossibleValues = possibilities;
        }
        return result;
    }
}
