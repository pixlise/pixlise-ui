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
import { SourceHelp, FunctionHelp, FunctionParamHelp, SourceContextParser } from "./help";


export class PIXLANGHelp extends SourceHelp
{
    constructor()
    {
        super("//");

        PIXLANGHelp.makeDataFunctionHelp(this);
        PIXLANGHelp.makeMapFunctionHelp(this);
        PIXLANGHelp.makeTrigFunctionHelp(this);
    }

    static makeDataFunctionHelp(help: SourceHelp): void
    {
        const OriginID = "";

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

        help.addHelp(new FunctionHelp("element", "", "Queries element map values", OriginID, [
            elementFormulae,
            elementColumns,
            detectors,
        ]));

        help.addHelp(new FunctionHelp("elementSum", "", "Sum of column values for all elements in quantification", OriginID, [
            elementColumns,
            detectors,
        ]));

        let dataColumn = new FunctionParamHelp("column", "Selects a column to read, use for non-element-related columns");
        dataColumn.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            return quantificationLoaded?.getDataColumns() || [];
        };

        help.addHelp(new FunctionHelp("data", "", "Reads the data column specified", OriginID, [
            dataColumn,
            detectors,
        ]));

        help.addHelp(new FunctionHelp("spectrum", "", "Retrieves the sum of counts between start and end channels, for the given detector", OriginID, [
            new FunctionParamHelp("startChannel", "Start channel (0-4095)"),
            new FunctionParamHelp("endChannel", "End channel (0-4095)"),
            detectors,
        ]));

        help.addHelp(new FunctionHelp("spectrumDiff", "", "Retrieves the sum of the absolute difference in counts between Normal spectra for the A and B detector, within start and end channels.", OriginID, [
            new FunctionParamHelp("startChannel", "Start channel (0-4095)"),
            new FunctionParamHelp("endChannel", "End channel (0-4095)"),
            new FunctionParamHelp("operation", "The operation to combine channel counts for a detector", ["max", "sum"])
        ]));

        let pseudoItem = new FunctionParamHelp("element", "The pseudo-intensity element");
        dataColumn.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            return dataset.getPseudoIntensityElementsList();
        };

        help.addHelp(new FunctionHelp("pseudo", "", "Returns pseudo-intensity map for given element", OriginID, [
            pseudoItem
        ]));

        let housekeepingColumn = new FunctionParamHelp("column", "The housekeeping CSV column to retrieve data for");
        dataColumn.getPossibleValues = (paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet)=>
        {
            return dataset.experiment.getMetaLabelsList();
        };

        help.addHelp(new FunctionHelp("housekeeping", "", "Retrieves housekeeping data from specified column", OriginID, [
            housekeepingColumn
        ]));

        help.addHelp(new FunctionHelp("diffractionPeaks", "", "Returns a map of diffraction peak counts per PMC", OriginID, [
            new FunctionParamHelp("eVstart", "eV range start. Note, this depends on the spectrum calibration currently set!"),
            new FunctionParamHelp("eVend", "eV range end. Note, this depends on the spectrum calibration currently set!")
        ]));

        help.addHelp(new FunctionHelp("roughness", "", "Retrieves a map of roughness from diffraction database globalDifference value (higher means rougher)", OriginID));

        help.addHelp(new FunctionHelp("position", "", "Returns a map of position values for each PMC", OriginID, [
            new FunctionParamHelp("axis", "The axis to read", ["x", "y", "z"])
        ]));

        help.addHelp(new FunctionHelp("makeMap", "", "Makes a map with each PMC having the value specified. The map will have the same dimensions as other maps obtained", OriginID, [
            new FunctionParamHelp("value", "Value for each PMC in a map. Useful for eg to make a unit map of 1's")
        ]));

        help.addHelp(new FunctionHelp("atomicMass", "", "Returns the atomic mass of the formula, uses the same calculation as elsewhere in PIXLISE", OriginID, [
            new FunctionParamHelp("elementFormulae", "The formula to calculate the mass of, for example: Ca or Fe2O3")
        ]));
    }

    static makeMapFunctionHelp(help: SourceHelp): void
    {
        const OriginID = "";

        // --- Map operations
        help.addHelp(new FunctionHelp("threshold", "", "Returns a map with where the value of each PMC in the source map is checked to be within compare +/- threshold range, if so, a 1 is returned, but if it's outside the range, 0 is returned", OriginID, [
            new FunctionParamHelp("map", "The map to threshold"),
            new FunctionParamHelp("compare", "The comparison value"),
            new FunctionParamHelp("range", "The range of comparison (used as +/- around the compare value)")
        ]));
        
        help.addHelp(new FunctionHelp("normalise", "", "Normalises a map by finding the min and max value, then computing each PMCs value as a percentage between that min and max, so all output values range between 0.0 and 1.0", OriginID, [
            new FunctionParamHelp("map", "The map to normalise"),
        ]));

        help.addHelp(new FunctionHelp("pow", "", "Calculates pow of each map PMC value, to the given exponent", OriginID, [
            new FunctionParamHelp("value", "The map (or scalar) to raise to a power. If a scalar is used, all map values created will be the same."),
            new FunctionParamHelp("exponent", "Exponent to raise value to"),
        ]));

        help.addHelp(new FunctionHelp("under", "", "Returns a map where value is 1 if less than reference, else 0", OriginID, [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
        ]));

        help.addHelp(new FunctionHelp("under_undef", "", "Returns a map where value is 1 if less than reference, else undefined (will leave holes in context image maps for example!)", OriginID, [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
        ]));

        help.addHelp(new FunctionHelp("over", "", "Returns a map where value is 1 if greater than reference, else 0", OriginID, [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
        ]));

        help.addHelp(new FunctionHelp("over_undef", "", "Returns a map where value is 1 if greater than reference, else undefined (will leave holes in context image maps for example!", OriginID, [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("reference", "The value to use as a reference for the operation"),
        ]));

        help.addHelp(new FunctionHelp("avg", "", "Returns a map which is the average of the 2 parameters specified", OriginID, [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("value", "May be a map or scalar, to calculate the average from using the first map parameter")
        ]));
        
        help.addHelp(new FunctionHelp("min", "", "Returns a map which is the minimum of the 2 parameters specified", OriginID, [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("value", "May be a map or scalar, to find the minimum from using the first map parameter")
        ]));
        
        help.addHelp(new FunctionHelp("max", "", "Returns a map which is the maximum of the 2 parameters specified", OriginID, [
            new FunctionParamHelp("map", "The map to operate on"),
            new FunctionParamHelp("value", "May be a map or scalar, to find the maximum from using the first map parameter")
        ]));

        help.addHelp(new FunctionHelp("ln", "", "Returns a map where each PMC contains the natural logarithm of the given value (or the corresponding PMCs value if the parameter is a map)", OriginID, [
            new FunctionParamHelp("value", "May be a map or scalar")
        ]));

        help.addHelp(new FunctionHelp("exp", "", "Returns a map where each PMC contains the e raised to the value (or the corresponding PMCs value if the parameter is a map)", OriginID, [
            new FunctionParamHelp("value", "May be a map or scalar")
        ]));
    }
    
    static makeTrigFunctionHelp(help: SourceHelp): void
    {
        const OriginID = "";

        // --- Trig functions
        let trigFuncs = ["sin", "cos", "tan", "asin", "acos", "atan"];

        for(let f of trigFuncs)
        {
            help.addHelp(new FunctionHelp(f, "", "Returns a map where each PMC value is "+f+" of the given angle (or map of angles)", OriginID, [
                new FunctionParamHelp("angle", "Angle in radians")
            ]));
        }
    }
}
