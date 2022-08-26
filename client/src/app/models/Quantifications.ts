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

import { QuantifiedDataQuerierSource } from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { getQuantifiedDataWithExpression } from "src/app/expression-language/expression-language";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { Quantification } from "src/app/protolibs/quantification_pb";
import { ObjectCreator } from "./BasicTypes";
import { DataSet } from "./DataSet";


export class QuantModes
{
    // Enums that we may get back from API (quant summary.params.quantMode)
    public static readonly quantModeCombined = "Combined";
    public static readonly quantModeAB = "AB";
    public static readonly quantModeBulkCombined = "CombinedBulk";
    public static readonly quantModeBulkAB = "ABBulk";
    public static readonly quantModeManualCombined = "CombinedManual";
    public static readonly quantModeManualAB = "ABManual";
    public static readonly quantModeMultiQuantCombined = "CombinedMultiQuant";
    public static readonly quantModeMultiQuantAB = "ABMultiQuant";
    // Unfortunately we had a period where this was valid
    //public static readonly quantModeManual = "Manual";

    public static getQuantDetectors(mode: string): string
    {
        if(mode.startsWith("AB"))
        {
            return "A/B";
        }
        else if(mode.startsWith("Combined"))
        {
            return "Combined";
        }
        return "?";
    }

    public static getQuantMethod(mode: string): string
    {
        if(mode.endsWith("Bulk"))
        {
            return "Sum-First";
        }
        else if(mode.endsWith("Manual"))
        {
            return "Manual";
        }
        else if(mode.endsWith("MultiQuant"))
        {
            return "Multi";
        }

        // Otherwise assume it's a per PMC map, which we display as blank, as it's
        // our old mode we're used to
        //return "Per PMC";
        return "";
    }

    public static getShortDescription(mode: string): string
    {
        let desc = QuantModes.getQuantDetectors(mode);
        let method = QuantModes.getQuantMethod(mode);
        if(method)
        {
            desc += "("+method+")";
        }
        return desc;
    }
}

export class QuantificationParams
{
    constructor(
        public pmcsCount: number,
        public name: string,
        public dataBucket: string,
        public datasetID: string,
        public jobBucket: string,
        public detectorConfig: string,
        public elements: string[],
        public parameters: string,
        public runTimeSec: number,
        public coresPerNode: number,
        public startUnixTime: number,
        public creator: ObjectCreator,
        public roiID: string,
        public elementSetID: string,
        public piquantVersion: string,
        public quantMode: string,
        public comments: string,
        public roiIDs: string[],
        public includeDwells: boolean,
    )
    {
    }
}

export class QuantifiedElements
{
    constructor(
        public carbonates: boolean,
        public nonElementSymbols: string[],
        public elementAtomicNumbers: number[],
        public ignoreAr: boolean,
    )
    {
    }
}

export class QuantificationBlessingDetails
{
    constructor(
        public userName: string,
        public userId: string,
        public blessedAt: number,
        public version: number,
        public jobId: string
    )
    {
    }
}

export class QuantificationSummary
{
    constructor(
        public jobId: string,
        public status: string,
        public message: string,
        public endUnixTime: number,
        public outputFilePath: string,
        public params: QuantificationParams,
        public piquantLogList: string[],
        public shared: boolean,
        public elements: string[], // as output by PIQUANT, doesn't necessarily match input params.elements (QuantificationParams)
        public blessDetails: QuantificationBlessingDetails,
    )
    {
    }

    public static getQuantifiedElements(summary: QuantificationSummary): QuantifiedElements
    {
        let result = new QuantifiedElements(
            // If CO3 was in the param element list, it was quantified as carbonates
            summary.params.elements.indexOf("CO3") > -1,
            [],
            [],
            // If Ar_I was in the param element list, it was set to ignore Argon
            summary.params.elements.indexOf("Ar_I") > -1,
        );

        // Run through all elements and get their symbol or atomic number
        // NOTE: Due to originally only having the parameter elements stored, if we don't have
        //       any elements in the quant summary, we fall back to reading the parameters.
        //       This should be fairly future proof because it's unlikely that a quant can have
        //       nothing quantified, that should result in an error...
        let elemList = summary.elements;
        if(elemList.length <= 0)
        {
            elemList = summary.params.elements; // May contain Ar_I
        }

        for(let symbol of elemList)
        {
            // CO3 won't be in summary.elements, but due to the above fallback, we still need to filter it out
            // Ar_I, as above, won't be in summary.elements...
            // As of July 2022 we allow users to ignore Argon using the Ar_I "special" element passed to PIQUANT.
            // This would error in for anything trying to parse it so exclude it here
            if(symbol != "CO3" && symbol != "Ar_I")
            {
                let elem = periodicTableDB.getElementOxidationState(symbol);
                if(elem && elem.isElement)
                {
                    // It's an element
                    result.elementAtomicNumbers.push(elem.Z);
                }
                else
                {
                    result.nonElementSymbols.push(symbol);
                }
            }
        }

        return result;
    }
}

// An individual quantification layer (a quant file applied to a dataset)
export class QuantificationLayer implements QuantifiedDataQuerierSource
{
    // What columns we have per element/oxide/carbonate, so this will be a map of:
    // Si->[%]
    // SiO2->[%, int, err]
    // Cl->[%, int, err]
    private _elementColumns: Map<string, string[]> = new Map<string, string[]>();
    private _dataColumns: string[];
    private _detectors: string[];

    // A map to allow us to find what pure elements can be calculated from what else. So if quant had
    // data for SiO2_%, here we'd store have Si_%->SiO2_%. This helps getQuantifiedDataForDetector()
    // determine what to do if a column isn't found outright in _elementColumns
    private _pureElementColumnLookup: Map<string, string> = new Map<string, string>();

    constructor(public quantId: string, public summary: QuantificationSummary, public quantData: Quantification)
    {
        this.cacheElementInfo(this.quantData);
    }

    private cacheElementInfo(quantData: Quantification)
    {
        // Loop through all column names that may contain element information and store these names so we
        // can easily find them at runtime
        let columnTypesFound: Set<string> = new Set<string>();
        let elements: Set<string> = new Set<string>();
        this._dataColumns = [];
        this._elementColumns.clear();
        this._pureElementColumnLookup.clear();

        for(let label of quantData.getLabelsList())
        {
            let labelBits = label.split("_");
            if(labelBits.length == 2)
            {
                if(labelBits[1] == "%" || labelBits[1] == "err" || labelBits[1] == "int")
                {
                    // Remember it as a column type
                    columnTypesFound.add(labelBits[1]);

                    // Remember the element we found
                    elements.add(labelBits[0]);
                }
            }
            else
            {
                this._dataColumns.push(label);
            }
        }

        for(let elem of elements.values())
        {
            let colTypes = Array.from(columnTypesFound.values());
            this._elementColumns.set(elem, colTypes);
            //console.log('elem: '+elem);
            //console.log(colTypes);
            if(colTypes.indexOf("%") > -1)
            {
                // If we have a weight % column, and it's not an element, but a carbonate/oxide, we need to add
                // just weight % for the element
                let elemState = periodicTableDB.getElementOxidationState(elem);
                //console.log(elemState);
                if(elemState && !elemState.isElement)
                {
                    this._elementColumns.set(elemState.element, ["%"]);

                    // Also remember that this can be calculated
                    this._pureElementColumnLookup.set(elemState.element+"_%", elem+"_%");
                }
            }
        }

        // Also get a list of all detectors we have data for
        this._detectors = [];

        for(let quantLocSet of this.quantData.getLocationsetList())
        {
            this._detectors.push(quantLocSet.getDetector());
        }
    }

    getElementColumns(elementFormula: string): string[]
    {
        let v = this._elementColumns.get(elementFormula);
        if(!v)
        {
            return [];
        }
        return v;
    }

    getElementFormulae(): string[]
    {
        //console.log(this._elementColumns);
        return Array.from(this._elementColumns.keys());
    }

    getDataColumns(): string[]
    {
        return this._dataColumns;
    }

    getDetectors(): string[]
    {
        return this._detectors;
    }

    makeSelectionLocationList(detectorId: string, dataset: DataSet): Set<number>
    {
        // Run through all our data, find the PMC, get its location index and return that
        let result = new Set<number>();

        for(let quantLocSet of this.quantData.getLocationsetList())
        {
            if(quantLocSet.getDetector() == detectorId)
            {
                for(let quantLoc of quantLocSet.getLocationList())
                {
                    let pmc = quantLoc.getPmc();
                    result.add(dataset.pmcToLocationIndex.get(pmc));
                }
                break;
            }
        }

        return result;
    }

    private getColumnIndex(columnName: string): number
    {
        let idx: number = -1;

        let colList = this.quantData.getLabelsList();
        for(let c = 0; c < colList.length; c++)
        {
            if(colList[c] == columnName)
            {
                // Easy case: found a direct hit
                // Eg user wanted Ca_% and we found Ca_%!
                idx = c;
                break;
            }
        }

        return idx;
    }

    // QuantifiedDataQuerierSource interface
    getQuantifiedDataForDetector(detectorId: string, dataLabel: string): PMCDataValues
    {
        //console.log('getQuantifiedDataForDetector: '+dataLabel+', det='+detectorId);
        //console.log(this);
        let idx: number = this.getColumnIndex(dataLabel);

        let toElemConvert = null;
        if(idx < 0)
        {
            // Since PIQUANT supporting carbonate/oxides, we may need to calculate this from an existing column
            // (we do this for carbonate->element or oxide->element)
            // Check what's being requested, to see if we can convert it
            let calcFrom = this._pureElementColumnLookup.get(dataLabel);
            if(calcFrom != undefined)
            {
                // we've found a column to look up from (eg dataLabel=Si_% and this found calcFrom=SiO2_%)
                // Get the index of that column
                idx = this.getColumnIndex(calcFrom);

                if(idx >= 0)
                {
                    // Also get the conversion factor we'll have to use
                    let sepIdx = calcFrom.indexOf("_");
                    if(sepIdx > -1)
                    {
                        // Following the above examples, this should become SiO2
                        let oxideOrCarbonate = calcFrom.substring(0, sepIdx);

                        let elemState = periodicTableDB.getElementOxidationState(oxideOrCarbonate);
                        if(elemState && !elemState.isElement)
                        {
                            toElemConvert = elemState.conversionToElementWeightPct;
                        }
                    }
                }
            }
        }

        if(idx < 0)
        {
            throw new Error("The currently loaded quantification does not contain column: \""+dataLabel+"\". Please select (or create) a quantification with the relevant element.");
        }

        //console.log('getQuantifiedDataForDetector detector='+detectorId+', dataLabel='+dataLabel+', idx='+idx+', factor='+toElemConvert);
        let data = this.getQuantifiedDataValues(detectorId, idx, toElemConvert, dataLabel.endsWith("_%"));
        return PMCDataValues.makeWithValues(data);
    }

    getElementList(): string[]
    {
        return Array.from(this._elementColumns.keys());
    }

    private getQuantifiedDataValues(detectorId: string, colIdx: number, mult: number, isPctColumn: boolean): PMCDataValue[]
    {
        let resultData: PMCDataValue[] = [];
        let detectorFound = false;
        let detectors: Set<string> = new Set<string>();

        // Loop through all our locations by PMC, find the quant value, store
        for(let quantLocSet of this.quantData.getLocationsetList())
        {
            let quantDetector = quantLocSet.getDetector();
            detectors.add(quantDetector);

            if(quantDetector == detectorId)
            {
                for(let quantLoc of quantLocSet.getLocationList())
                {
                    let pmc = quantLoc.getPmc();

                    let valueItem = quantLoc.getValuesList()[colIdx];
                    let value = valueItem.getFvalue();
                    let undef = false;

                    if(this.quantData.getTypesList()[colIdx] == Quantification.QuantDataType.QT_INT)
                    {
                        value = valueItem.getIvalue();
                    }

                    // If we're a _% column, and the value is -1, ignore it. This is due to
                    // multi-quantifications where we decided to use -1 to signify a missing
                    // value (due to combining 2 quants with different element lists, therefore
                    // ending up with some PMCs that have no value for a given element in the
                    // quantification).
                    if(isPctColumn && value == -1)
                    {
                        value = 0;
                        undef = true;
                    }
                    else if(mult !== null)
                    {
                        value *= mult;
                    }

                    resultData.push(new PMCDataValue(pmc, value, undef));
                }

                detectorFound = true;
            }
        }

        if(!detectorFound)
        {
            throw new Error("The currently loaded quantification does not contain data for detector: \""+detectorId+"\". It only contains detector(s): \""+Array.from(detectors).join(",")+"\"");
        }

        return resultData;
    }

    getAverageEnergyCalibration(): SpectrumEnergyCalibration[]
    {
        let result: SpectrumEnergyCalibration[] = [];

        if(this._dataColumns.indexOf("eVstart") < 0 || this._dataColumns.indexOf("eV/ch") < 0)
        {
            return result;
        }

        // Average all of them, per detector
        let detectors = Array.from(this._detectors);

        // If we have Combined and A/B, pick A/B
        for(let c = 0; c < this._detectors.length; c++)
        {
            if(detectors[c] == "Combined" && detectors.length > 1)
            {
                detectors.splice(c, 1);
                break;
            }
        }

        for(let detector of detectors)
        {
            let eVStartSum = 0;
            let eVPerChannelSum = 0;

            let eVStartValues = getQuantifiedDataWithExpression("data(\"eVstart\", \""+detector+"\")", this, null, null, null, null, null, null);
            let eVPerChannelValues = getQuantifiedDataWithExpression("data(\"eV/ch\", \""+detector+"\")", this, null, null, null, null, null, null);

            for(let evStartItem of eVStartValues.values)
            {
                eVStartSum += evStartItem.value;
            }

            for(let evPerChannelItem of eVPerChannelValues.values)
            {
                eVPerChannelSum += evPerChannelItem.value;
            }

            // Save these (we may need them later for "reset to defaults" features)
            result.push(
                new SpectrumEnergyCalibration(
                    eVStartSum/eVStartValues.values.length,
                    eVPerChannelSum/eVPerChannelValues.values.length,
                    detector
                )
            );
        }

        return result;
    }
}
