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
    DiffractionPeakQuerierSource, HousekeepingDataQuerierSource, PseudoIntensityDataQuerierSource, QuantifiedDataQuerierSource
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { DataQuerier, ExpressionParts } from "src/app/expression-language/expression-language";
import { DataSet } from "src/app/models/DataSet";



class MockSource implements QuantifiedDataQuerierSource
{
    constructor(public data: object, protected _elemList: string[])
    {
    }

    getQuantifiedDataForDetector(detectorId: string, dataLabel: string): PMCDataValues
    {
        let label = dataLabel+"_"+detectorId;
        let value = this.data[label];
        if(value === undefined)
        {
            // Do what the real class would do for non-existant data...
            throw new Error("The currently loaded quantification does not contain column: \""+label+"\". Please select (or create) a quantification with the relevant element.");
        }

        return value;
    }

    getElementList(): string[]
    {
        return this._elemList;
    }
}

class MockPseudoSource implements PseudoIntensityDataQuerierSource
{
    constructor(public data: object)
    {
    }

    getPseudoIntensityData(name: string): PMCDataValues
    {
        let value = this.data[name];
        if(value === undefined)
        {
            // Do what the real class would do for non-existant data...
            throw new Error("The currently loaded dataset does not include pseudo-intensity data with column name: \""+name+"\"");
        }

        return value;
    }
}

class MockHousekeepingSource implements HousekeepingDataQuerierSource
{
    constructor(public data: object)
    {
    }

    getHousekeepingData(name: string): PMCDataValues
    {
        let value = this.data[name];
        if(value === undefined)
        {
            // Do what the real class would do for non-existant data...
            throw new Error("The currently loaded dataset does not include housekeeping data with column name: \""+name+"\"");
        }

        return value;
    }

    getPositionData(axis: string): PMCDataValues
    {
        return this.getHousekeepingData(axis);
    }
}

class MockDiffractionSource implements DiffractionPeakQuerierSource
{
    idx = 0;

    constructor(public data: PMCDataValues[])
    {
    }

    getDiffractionPeakEffectData(channelStart: number, channelEnd: number, dataset: DataSet): PMCDataValues
    {
        if(this.idx >= this.data.length)
        {
            throw new Error("Not enough mock diffraction peak data defined");
        }

        let result = this.data[this.idx];
        this.idx++;
        return result;
    }

    getRoughnessData(dataset: DataSet): PMCDataValues
    {
        return PMCDataValues.makeWithValues([new PMCDataValue(30, 0.6), new PMCDataValue(58, 0.9), new PMCDataValue(84, 2.6)]);
    }
}

const srcData = {
    "Fe_%_A": PMCDataValues.makeWithValues(
        [new PMCDataValue(642, 1), new PMCDataValue(643, 2), new PMCDataValue(644, 3)]
    ),
    "Fe_%_B": PMCDataValues.makeWithValues(
        [new PMCDataValue(642, 5), new PMCDataValue(643, 1), new PMCDataValue(644, 6)]
    ),
    "Ti_%_A": PMCDataValues.makeWithValues(
        [new PMCDataValue(642, 4), new PMCDataValue(643, 5), new PMCDataValue(644, 6)]
    ),
    "Ti_%_B": PMCDataValues.makeWithValues(
        [new PMCDataValue(642, 50), new PMCDataValue(643, 20), new PMCDataValue(644, 9)]
    ),

    "chisq_A": PMCDataValues.makeWithValues(
        [new PMCDataValue(642, 200), new PMCDataValue(643, 210), new PMCDataValue(644, 300)]
    ),
    "chisq_B": PMCDataValues.makeWithValues(
        [new PMCDataValue(642, 50), new PMCDataValue(643, 100), new PMCDataValue(644, 150)]
    )
};

const srcDataElements = ["Fe", "Ti"];

const pseudoSrcData = {
    "Fe": PMCDataValues.makeWithValues(
        [new PMCDataValue(642, 61), new PMCDataValue(643, 62), new PMCDataValue(644, 63)]
    )
};

const housekeepingSrcData = {
    "Cover Tmp": PMCDataValues.makeWithValues(
        [new PMCDataValue(889, 30), new PMCDataValue(890, 31), new PMCDataValue(891, 34)]
    ),
    "z": PMCDataValues.makeWithValues(
        [new PMCDataValue(889, 2.5), new PMCDataValue(890, 2.54), new PMCDataValue(891, 2.57)]
    )
};

describe("element() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if non-existant element specified", () => 
    {
        expect(()=>querier.runQuery("element(\"Mg\", \"%\", \"B\")")).toThrowError("The currently loaded quantification does not contain column: \"Mg_%_B\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if non-existant detector specified", () => 
    {
        expect(()=>querier.runQuery("element(\"Fe\", \"%\", \"C\")")).toThrowError("The currently loaded quantification does not contain column: \"Fe_%_C\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if non-existant data specified", () => 
    {
        expect(()=>querier.runQuery("element(\"Fe\", \"err\", \"B\")")).toThrowError("The currently loaded quantification does not contain column: \"Fe_err_B\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if not enough params to element call", () => 
    {
        expect(()=>querier.runQuery("element(\"Fe\", \"%\")")).toThrowError("element() expression expects 3 parameters: element, datatype, detector Id. Received: [\"Fe\",\"%\"]");
    });

    it("should fail if too many params to element call", () => 
    {
        expect(()=>querier.runQuery("element(\"Fe\", \"%\", \"A\", \"Hello\")")).toThrowError("element() expression expects 3 parameters: element, datatype, detector Id. Received: [\"Fe\",\"%\",\"A\",\"Hello\"]");
    });

    it("should return element map Fe_%_A", () => 
    {
        let result = querier.runQuery("element(\"Fe\", \"%\", \"A\")");
        expect(result).toEqual(srcData["Fe_%_A"]);
    });

    it("should return element map Ti_%_A", () => 
    {
        let result = querier.runQuery("element(\"Ti\", \"%\", \"A\")");
        expect(result).toEqual(srcData["Ti_%_A"]);
    });

    it("%-as-mmol conversion factor Ti_%_A", () => 
    {
        let result = querier.runQuery("element(\"Ti\", \"%-as-mmol\", \"A\")");

        let srcValues = srcData["Ti_%_A"];
        let expValues = [];
        for(let val of srcValues.values)
        {
            expValues.push(new PMCDataValue(val.pmc, val.value*10/47.88));
        }
        let expMmol = PMCDataValues.makeWithValues(expValues);

        expect(result).toEqual(expMmol);
    });

    it("should fail for bad syntax", () => 
    {
        expect(()=>querier.runQuery("element(\"Fe\", ")).toThrowError("Expected comma at character 14");
    });

/*
    it('should fail if bad query', () => {
        let result = querier.runQuery('something(4*2)+invalid');
        console.log(result);
        //expect(querier.runQuery('something(4*2)+invalid').toBeTruthy();
    });*/
});


const srcDataFeO = {
    "FeO-T_%_Combined": PMCDataValues.makeWithValues(
        [new PMCDataValue(642, 1), new PMCDataValue(643, 2), new PMCDataValue(644, 3)]
    )
};

const srcDataElementsFeO = ["FeO-T"];

describe("element() call FeO-T special case", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcDataFeO, srcDataElementsFeO);
        querier = new DataQuerier(source, null, null, null, null, null);
    });


    it("%-as-mmol conversion factor FeO-T_%_Combined", () => 
    {
        let result = querier.runQuery("element(\"FeO-T\", \"%-as-mmol\", \"Combined\")");

        let srcValues = srcDataFeO["FeO-T_%_Combined"];
        let expValues = [];
        for(let val of srcValues.values)
        {
            expValues.push(new PMCDataValue(val.pmc, val.value*10/(55.847+15.9994)));
        }
        let expMmol = PMCDataValues.makeWithValues(expValues);

        expect(result).toEqual(expMmol);
    });
});

describe("elementSum() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if non-existant detector specified", () => 
    {
        expect(()=>querier.runQuery("elementSum(\"%\", \"C\")")).toThrowError("The currently loaded quantification does not contain column: \"Fe_%_C\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if non-existant data specified", () => 
    {
        expect(()=>querier.runQuery("elementSum(\"err\", \"B\")")).toThrowError("The currently loaded quantification does not contain column: \"Fe_err_B\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if not enough params to element call", () => 
    {
        expect(()=>querier.runQuery("elementSum(\"%\")")).toThrowError("elementSum() expression expects 2 parameters: datatype, detector Id. Received: [\"%\"]");
    });

    it("should fail if too many params to element call", () => 
    {
        expect(()=>querier.runQuery("elementSum(\"%\", \"A\", \"Hello\")")).toThrowError("elementSum() expression expects 2 parameters: datatype, detector Id. Received: [\"%\",\"A\",\"Hello\"]");
    });

    it("should return sum of element map Fe, Ti for _%_A", () => 
    {
        let result = querier.runQuery("elementSum(\"%\", \"A\")");
        let exp = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 5), new PMCDataValue(643, 7), new PMCDataValue(644, 9)]
        );

        expect(result).toEqual(exp);
    });

    it("should fail for bad syntax", () => 
    {
        expect(()=>querier.runQuery("elementSum(\"Fe\", ")).toThrowError("Expected comma at character 17");
    });

/*
    it('should fail if bad query', () => {
        let result = querier.runQuery('something(4*2)+invalid');
        console.log(result);
        //expect(querier.runQuery('something(4*2)+invalid').toBeTruthy();
    });*/
});

describe("pseudo() call", () =>
{
    let source: MockPseudoSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockPseudoSource(pseudoSrcData);
        querier = new DataQuerier(null, source, null, null, null, null);
    });

    it("should fail if non-existant pseudo-element specified", () => 
    {
        expect(()=>querier.runQuery("pseudo(\"Hg\")")).toThrowError("The currently loaded dataset does not include pseudo-intensity data with column name: \"Hg\"");
    });

    it("should return pseudo-intensity map Fe", () => 
    {
        let result = querier.runQuery("pseudo(\"Fe\")");
        expect(result).toEqual(pseudoSrcData["Fe"]);
    });
});


describe("housekeeping() call", () =>
{
    let source: MockHousekeepingSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockHousekeepingSource(housekeepingSrcData);
        querier = new DataQuerier(null, null, source, null, null, null);
    });

    it("should fail if non-existant housekeeping column specified", () => 
    {
        expect(()=>querier.runQuery("housekeeping(\"Coolant Tmp\")")).toThrowError("The currently loaded dataset does not include housekeeping data with column name: \"Coolant Tmp\"");
    });

    it("should return housekeeping map Cover Tmp", () => 
    {
        let result = querier.runQuery("housekeeping(\"Cover Tmp\")");
        expect(result).toEqual(housekeepingSrcData["Cover Tmp"]);
    });

    it("should return housekeeping map for Z height", () => 
    {
        let result = querier.runQuery("position(\"z\")");
        expect(result).toEqual(housekeepingSrcData["z"]);
    });
});


describe("diffractionPeaks() call", () =>
{
    let source: MockDiffractionSource;
    let querier: DataQuerier;

    const diffractionSrcData = [
        PMCDataValues.makeWithValues([
            new PMCDataValue(3, 34.3),
            new PMCDataValue(10, 20.7),
            new PMCDataValue(50, 27.5),
        ]),
        /*        PMCDataValues.makeWithValues([
            new PMCDataValue(3, 34.3),
            new PMCDataValue(50, 27.5),
        ]),*/
    ];


    beforeEach(() => 
    {
        source = new MockDiffractionSource(diffractionSrcData);
        querier = new DataQuerier(null, null, null, null, source, null);
    });

    it("should return all diffraction peaks", () => 
    {
        let result = querier.runQuery("diffractionPeaks(0, 4097)");
        let expected = diffractionSrcData[0];

        expect(result).toEqual(expected);
    });
/*
    it('should return peaks within channel range', () => {
        expect(()=>querier.runQuery('diffractionPeaks(500, 1000)')).toEqual(diffractionSrcData[1]);
    });
*/
});


describe("roughness() call", () =>
{
    let source: MockDiffractionSource;
    let querier: DataQuerier;

    const diffractionSrcData = [
        PMCDataValues.makeWithValues([
            new PMCDataValue(30, 0.6), new PMCDataValue(58, 0.9), new PMCDataValue(84, 2.6)
        ]),
    ];

    beforeEach(() => 
    {
        source = new MockDiffractionSource(diffractionSrcData);
        querier = new DataQuerier(null, null, null, null, source, null);
    });

    it("should return all roughness peaks", () => 
    {
        let result = querier.runQuery("roughness()");
        let expected = diffractionSrcData[0];

        expect(result).toEqual(expected);
    });
/*
    it('should return peaks within channel range', () => {
        expect(()=>querier.runQuery('diffractionPeaks(500, 1000)')).toEqual(diffractionSrcData[1]);
    });
*/
});


describe("Data source NOT set", () =>
{
    let querier: DataQuerier;

    beforeEach(() => 
    {
        querier = new DataQuerier(null, null, null, null, null, null);
    });

    it("pseudo() - should fail with cannot find data source error", () => 
    {
        expect(()=>querier.runQuery("pseudo(\"Mg\")")).toThrowError("pseudo() failed, no pseudo-intensity data exists in currently loaded data set.");
    });

    it("housekeeping() - should fail with cannot find data source error", () => 
    {
        expect(()=>querier.runQuery("housekeeping(\"Mg\")")).toThrowError("housekeeping() data retrieval failed, no housekeeping data exists in currently loaded data set.");
    });

    it("data() - should fail with cannot find data source error", () => 
    {
        expect(()=>querier.runQuery("data(\"chisq\", \"A\")")).toThrowError("data() expression failed, no quantification data loaded");
    });

    it("element() - should fail with cannot find data source error", () => 
    {
        expect(()=>querier.runQuery("element(\"chisq\", \"%\", \"A\")")).toThrowError("element() expression failed, no quantification data loaded");
    });
});


describe("data() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if non-existant data specified", () => 
    {
        expect(()=>querier.runQuery("data(\"livetime\", \"B\")")).toThrowError("The currently loaded quantification does not contain column: \"livetime_B\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if non-existant detector specified", () => 
    {
        expect(()=>querier.runQuery("data(\"chisq\", \"C\")")).toThrowError("The currently loaded quantification does not contain column: \"chisq_C\". Please select (or create) a quantification with the relevant element.");
    });

    it("should return chisq A map", () => 
    {
        let result = querier.runQuery("data(\"chisq\", \"A\")");
        expect(result).toEqual(srcData["chisq_A"]);
    });
    
    it("should return chisq B map", () => 
    {
        let result = querier.runQuery("data(\"chisq\", \"B\")");
        expect(result).toEqual(srcData["chisq_B"]);
    });
});

describe("normalize() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if param not a map", () => 
    {
        expect(()=>querier.runQuery("normalize(37)")).toThrowError("normalize() expects 1 map parameter. Received: 1 parameters");
    });

    it("should fail if > 1 param", () => 
    {
        expect(()=>querier.runQuery("normalize(37, 38)")).toThrowError("normalize() expects 1 map parameter. Received: 2 parameters");
    });

    it("should fail if 0 params", () => 
    {
        expect(()=>querier.runQuery("normalize()")).toThrowError("normalize() expects 1 map parameter. Received: 0 parameters");
    });

    it("should normalize a data map", () => 
    {
        let result = querier.runQuery("normalize(data(\"chisq\", \"B\"))");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 0.5), new PMCDataValue(644, 1)]
        );

        expect(result).toEqual(expected);
    });

    it("should work with multiplier", () => 
    {
        let result = querier.runQuery("5*normalize(data(\"chisq\", \"B\"))");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 2.5), new PMCDataValue(644, 5)]
        );

        expect(result).toEqual(expected);
    });

    it("should normalize a element map", () => 
    {
        let result = querier.runQuery("normalize(element(\"Fe\", \"%\", \"B\"))");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, (4/5)), new PMCDataValue(643, 0), new PMCDataValue(644, 1)]
        );

        expect(result).toEqual(expected);
    });
});

describe("threshold() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("threshold()")).toThrowError("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("threshold(37)")).toThrowError("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 1 parameters");
    });

    it("should fail if 2 params", () => 
    {
        expect(()=>querier.runQuery("threshold(37, 38)")).toThrowError("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 2 parameters");
    });

    it("should fail if 4 params", () => 
    {
        expect(()=>querier.runQuery("threshold(37, 38, 49, 50)")).toThrowError("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 4 parameters");
    });

    it("should fail if first param not a map", () => 
    {
        expect(()=>querier.runQuery("threshold(33, 18, 3)")).toThrowError("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 3 parameters");
    });

    it("should fail if second param not a scalar", () => 
    {
        expect(()=>querier.runQuery("threshold(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"A\"), 3)")).toThrowError("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 3 parameters");
    });

    it("should fail if third param not a scalar", () => 
    {
        expect(()=>querier.runQuery("threshold(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"A\"), element(\"Fe\", \"%\", \"A\"))")).toThrowError("threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 3 parameters");
    });

    it("should threshold element map to 0,1,0", () => 
    {
        let result = querier.runQuery("threshold(element(\"Ti\", \"%\", \"B\"), 18, 3)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 1), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });

    it("should threshold element map to 0,1,1", () => 
    {
        let result = querier.runQuery("threshold(element(\"Ti\", \"%\", \"B\"), 18, 10)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 1), new PMCDataValue(644, 1)]
        );
        expect(result).toEqual(expected);
    });
});

describe("pow() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("pow()")).toThrowError("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("pow(37)")).toThrowError("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: 1 parameters");
    });

    it("should fail if 3 params", () => 
    {
        expect(()=>querier.runQuery("pow(37, 38, 39)")).toThrowError("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: 3 parameters");
    });

    it("should fail if second parameter is map", () => 
    {
        expect(()=>querier.runQuery("pow(37, element(\"Ti\", \"%\", \"B\"))")).toThrowError("pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: 2 parameters");
    });

    it("should pow for scalars (though result wont be map so should print error)", () => 
    {
        expect(()=>querier.runQuery("pow(2, 8)")).toThrowError("Expression: pow(2, 8) did not result in usable map data. Result was: 256");
    });

    it("should pow for map, scalar", () => 
    {
        let result = querier.runQuery("pow(element(\"Ti\", \"%\", \"B\"), 3)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 125000), new PMCDataValue(643, 8000), new PMCDataValue(644, 729)]
        );
        expect(result).toEqual(expected);
    });
});

describe("avg() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("avg()")).toThrowError("avg() expects 2 parameters: (map, map). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("avg(37)")).toThrowError("avg() expects 2 parameters: (map, map). Received: 1 parameters");
    });

    it("should fail if 3 params", () => 
    {
        expect(()=>querier.runQuery("avg(37, 38, 39)")).toThrowError("avg() expects 2 parameters: (map, map). Received: 3 parameters");
    });

    it("should fail if first param not a map", () => 
    {
        expect(()=>querier.runQuery("avg(33, element(\"Ti\", \"%\", \"B\"))")).toThrowError("avg() expects 2 parameters: (map, map). Received: 2 parameters");
    });

    it("should fail if second param not a map", () => 
    {
        expect(()=>querier.runQuery("avg(element(\"Ti\", \"%\", \"A\"), 32)")).toThrowError("avg() expects 2 parameters: (map, map). Received: 2 parameters");
    });

    it("should average 2 maps", () => 
    {
        let result = querier.runQuery("avg(element(\"Ti\", \"%\", \"A\"), element(\"Ti\", \"%\", \"B\"))");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 27), new PMCDataValue(643, 12.5), new PMCDataValue(644, 7.5)]
        );
        expect(result).toEqual(expected);
    });
});

describe("min() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("min()")).toThrowError("min() expects 2 parameters: (map, map or scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("min(37)")).toThrowError("min() expects 2 parameters: (map, map or scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", () => 
    {
        expect(()=>querier.runQuery("min(37, 38, 39)")).toThrowError("min() expects 2 parameters: (map, map or scalar). Received: 3 parameters");
    });

    it("should fail if first param not a map", () => 
    {
        expect(()=>querier.runQuery("min(33, element(\"Ti\", \"%\", \"B\"))")).toThrowError("min() expects 2 parameters: (map, map or scalar). Received: 2 parameters");
    });

    it("should take min of 2 maps", () => 
    {
        let result = querier.runQuery("min(element(\"Fe\", \"%\", \"B\"), element(\"Ti\", \"%\", \"A\"))");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 4), new PMCDataValue(643, 1), new PMCDataValue(644, 6)]
        );
        expect(result).toEqual(expected);
    });

    it("should take min of map and scalar", () => 
    {
        let result = querier.runQuery("min(element(\"Fe\", \"%\", \"B\"), 4)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 4), new PMCDataValue(643, 1), new PMCDataValue(644, 4)]
        );
        expect(result).toEqual(expected);
    });
});

describe("max() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("max()")).toThrowError("max() expects 2 parameters: (map, map or scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("max(37)")).toThrowError("max() expects 2 parameters: (map, map or scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", () => 
    {
        expect(()=>querier.runQuery("max(37, 38, 39)")).toThrowError("max() expects 2 parameters: (map, map or scalar). Received: 3 parameters");
    });

    it("should fail if first param not a map", () => 
    {
        expect(()=>querier.runQuery("max(33, element(\"Ti\", \"%\", \"B\"))")).toThrowError("max() expects 2 parameters: (map, map or scalar). Received: 2 parameters");
    });

    it("should take max of 2 maps", () => 
    {
        let result = querier.runQuery("max(element(\"Fe\", \"%\", \"B\"), element(\"Ti\", \"%\", \"A\"))");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 5), new PMCDataValue(643, 5), new PMCDataValue(644, 6)]
        );
        expect(result).toEqual(expected);
    });

    it("should take max of map and scalar", () => 
    {
        let result = querier.runQuery("max(element(\"Fe\", \"%\", \"B\"), 4)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 5), new PMCDataValue(643, 4), new PMCDataValue(644, 6)]
        );
        expect(result).toEqual(expected);
    });
});

describe("under() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("under()")).toThrowError("under() expects 2 parameters: (map, scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("under(37)")).toThrowError("under() expects 2 parameters: (map, scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", () => 
    {
        expect(()=>querier.runQuery("under(37, 38, 39)")).toThrowError("under() expects 2 parameters: (map, scalar). Received: 3 parameters");
    });

    it("should fail if params arent map, scalar", () => 
    {
        expect(()=>querier.runQuery("under(33, element(\"Ti\", \"%\", \"B\"))")).toThrowError("under() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should fail if second param not a scalar", () => 
    {
        expect(()=>querier.runQuery("under(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"B\"))")).toThrowError("under() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should make binary map of 1 where Ti < 40 else 0", () => 
    {
        let result = querier.runQuery("under(element(\"Ti\", \"%\", \"B\"), 40)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 1), new PMCDataValue(644, 1)]
        );
        expect(result).toEqual(expected);
    });

    it("should make binary map of 1 where Ti < 15 else 0", () => 
    {
        let result = querier.runQuery("under(element(\"Ti\", \"%\", \"B\"), 15)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 0), new PMCDataValue(644, 1)]
        );
        expect(result).toEqual(expected);
    });
});

describe("under_undef() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("under_undef()")).toThrowError("under_undef() expects 2 parameters: (map, scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("under_undef(37)")).toThrowError("under_undef() expects 2 parameters: (map, scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", () => 
    {
        expect(()=>querier.runQuery("under_undef(37, 38, 39)")).toThrowError("under_undef() expects 2 parameters: (map, scalar). Received: 3 parameters");
    });

    it("should fail if params arent map, scalar", () => 
    {
        expect(()=>querier.runQuery("under_undef(33, element(\"Ti\", \"%\", \"B\"))")).toThrowError("under_undef() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should fail if second param not a scalar", () => 
    {
        expect(()=>querier.runQuery("under_undef(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"B\"))")).toThrowError("under_undef() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should make binary map of 1 where Ti < 40 else undefined", () => 
    {
        let result = querier.runQuery("under_undef(element(\"Ti\", \"%\", \"B\"), 40)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0, true), new PMCDataValue(643, 1), new PMCDataValue(644, 1)]
        );
        expect(result).toEqual(expected);
    });

    it("should make binary map of 1 where Ti < 15 else undefined", () => 
    {
        let result = querier.runQuery("under_undef(element(\"Ti\", \"%\", \"B\"), 15)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0, true), new PMCDataValue(643, 0, true), new PMCDataValue(644, 1)]
        );
        expect(result).toEqual(expected);
    });
});

describe("over() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("over()")).toThrowError("over() expects 2 parameters: (map, scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("over(37)")).toThrowError("over() expects 2 parameters: (map, scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", () => 
    {
        expect(()=>querier.runQuery("over(37, 38, 39)")).toThrowError("over() expects 2 parameters: (map, scalar). Received: 3 parameters");
    });

    it("should fail if params arent map, scalar", () => 
    {
        expect(()=>querier.runQuery("over(33, element(\"Ti\", \"%\", \"B\"))")).toThrowError("over() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should fail if second param not a scalar", () => 
    {
        expect(()=>querier.runQuery("over(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"B\"))")).toThrowError("over() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should make binary map of 1 where Ti > 40 else 0", () => 
    {
        let result = querier.runQuery("over(element(\"Ti\", \"%\", \"B\"), 40)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });

    it("should make binary map of 1 where Ti > 15 else 0", () => 
    {
        let result = querier.runQuery("over(element(\"Ti\", \"%\", \"B\"), 15)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 1), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });
});

describe("over_undef() call", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if no params", () => 
    {
        expect(()=>querier.runQuery("over_undef()")).toThrowError("over_undef() expects 2 parameters: (map, scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", () => 
    {
        expect(()=>querier.runQuery("over_undef(37)")).toThrowError("over_undef() expects 2 parameters: (map, scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", () => 
    {
        expect(()=>querier.runQuery("over_undef(37, 38, 39)")).toThrowError("over_undef() expects 2 parameters: (map, scalar). Received: 3 parameters");
    });

    it("should fail if params arent map, scalar", () => 
    {
        expect(()=>querier.runQuery("over_undef(33, element(\"Ti\", \"%\", \"B\"))")).toThrowError("over_undef() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should fail if second param not a scalar", () => 
    {
        expect(()=>querier.runQuery("over_undef(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"B\"))")).toThrowError("over_undef() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should make binary map of 1 where Ti > 40 else undefined", () => 
    {
        let result = querier.runQuery("over_undef(element(\"Ti\", \"%\", \"B\"), 40)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0, true), new PMCDataValue(644, 0, true)]
        );
        expect(result).toEqual(expected);
    });

    it("should make binary map of 1 where Ti > 15 else undefined", () => 
    {
        let result = querier.runQuery("over_undef(element(\"Ti\", \"%\", \"B\"), 15)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 1), new PMCDataValue(644, 0, true)]
        );
        expect(result).toEqual(expected);
    });
});

describe("+ operator", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should just return the number if unary (though result wont be map so should print error)", () => 
    {
        expect(()=>querier.runQuery("+7")).toThrowError("Expression: +7 did not result in usable map data. Result was: 7");
    });

    it("should fail if missing second param", () => 
    {
        expect(()=>querier.runQuery("7+")).toThrowError("Expected expression after + at character 2");
    });

    it("should allow params as scalar+scalar (though result wont be map so should print error)", () => 
    {
        expect(()=>querier.runQuery("7+3")).toThrowError("Expression: 7+3 did not result in usable map data. Result was: 10");
    });

    it("should allow scalar+map", () => 
    {
        let result = querier.runQuery("7+element(\"Ti\", \"%\", \"B\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 57), new PMCDataValue(643, 27), new PMCDataValue(644, 16)]
        );
        expect(result).toEqual(expected);
    });

    it("should allow map+scalar", () => 
    {
        let result = querier.runQuery("element(\"Ti\", \"%\", \"B\")+7");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 57), new PMCDataValue(643, 27), new PMCDataValue(644, 16)]
        );
        expect(result).toEqual(expected);
    });

    it("should add 2 maps together", () => 
    {
        let result = querier.runQuery("element(\"Fe\", \"%\", \"B\")+element(\"Ti\", \"%\", \"A\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 9), new PMCDataValue(643, 6), new PMCDataValue(644, 12)]
        );
        expect(result).toEqual(expected);
    });
});

describe("- operator", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should just return negative number if unary (though result wont be map so should print error)", () => 
    {
        expect(()=>querier.runQuery("-7")).toThrowError("Expression: -7 did not result in usable map data. Result was: -7");
    });

    it("should fail if missing second param", () => 
    {
        expect(()=>querier.runQuery("7-")).toThrowError("Expected expression after - at character 2");
    });

    it("should allow params as scalar-scalar (though result wont be map so should print error)", () => 
    {
        expect(()=>querier.runQuery("7-3")).toThrowError("Expression: 7-3 did not result in usable map data. Result was: 4");
    });

    it("should allow scalar-map", () => 
    {
        let result = querier.runQuery("7-element(\"Ti\", \"%\", \"B\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, -43), new PMCDataValue(643, -13), new PMCDataValue(644, -2)]
        );
        expect(result).toEqual(expected);
    });

    it("should allow map-scalar", () => 
    {
        let result = querier.runQuery("element(\"Ti\", \"%\", \"B\")-7");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 43), new PMCDataValue(643, 13), new PMCDataValue(644, 2)]
        );
        expect(result).toEqual(expected);
    });

    it("should add 2 maps together", () => 
    {
        let result = querier.runQuery("element(\"Fe\", \"%\", \"B\")-element(\"Ti\", \"%\", \"A\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, -4), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });
});

describe("* operator", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if not binary op", () => 
    {
        expect(()=>querier.runQuery("*7")).toThrowError("Unexpected \"*\" at character 0");
    });

    it("should fail if missing second param", () => 
    {
        expect(()=>querier.runQuery("7*")).toThrowError("Expected expression after * at character 2");
    });

    it("should allow params as scalar*scalar (though result wont be map so should print error)", () => 
    {
        expect(()=>querier.runQuery("7*3")).toThrowError("Expression: 7*3 did not result in usable map data. Result was: 21");
    });

    it("should allow multiplying scalar*map", () => 
    {
        let result = querier.runQuery("7*element(\"Ti\", \"%\", \"B\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 350), new PMCDataValue(643, 140), new PMCDataValue(644, 63)]
        );
        expect(result).toEqual(expected);
    });

    it("should allow multiplying map*scalar", () => 
    {
        let result = querier.runQuery("element(\"Ti\", \"%\", \"B\")*5");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 250), new PMCDataValue(643, 100), new PMCDataValue(644, 45)]
        );
        expect(result).toEqual(expected);
    });

    it("should multiply 2 maps together", () => 
    {
        let result = querier.runQuery("element(\"Fe\", \"%\", \"A\")*data(\"chisq\", \"B\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 50), new PMCDataValue(643, 200), new PMCDataValue(644, 450)]
        );
        expect(result).toEqual(expected);
    });
});

describe("/ operator", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("should fail if not binary op", () => 
    {
        expect(()=>querier.runQuery("/7")).toThrowError("Unexpected \"/\" at character 0");
    });

    it("should fail if missing second param", () => 
    {
        expect(()=>querier.runQuery("7/")).toThrowError("Expected expression after / at character 2");
    });

    it("should allow params as scalar/scalar (though result wont be map so should print error)", () => 
    {
        expect(()=>querier.runQuery("6/3")).toThrowError("Expression: 6/3 did not result in usable map data. Result was: 2");
    });

    it("should allow dividing scalar by map", () => 
    {
        let result = querier.runQuery("7/element(\"Ti\", \"%\", \"B\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0.14), new PMCDataValue(643, 0.35), new PMCDataValue(644, 0.7777777777777778)]
        );
        expect(result).toEqual(expected);
    });

    it("should allow dividing map by scalar", () => 
    {
        let result = querier.runQuery("element(\"Ti\", \"%\", \"B\")/5");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 10), new PMCDataValue(643, 4), new PMCDataValue(644, 1.8)]
        );
        expect(result).toEqual(expected);
    });

    it("should divide map by another", () => 
    {
        let result = querier.runQuery("element(\"Fe\", \"%\", \"A\")/data(\"chisq\", \"B\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0.02), new PMCDataValue(643, 0.02), new PMCDataValue(644, 0.02)]
        );
        expect(result).toEqual(expected);
    });
});


describe("more complex operations", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("inv-chisq A", () => 
    {
        let result = querier.runQuery("1-normalize(data(\"chisq\", \"A\"))");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0.9), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });

    it("inv-avg(chisq A and B)", () => 
    {
        // A [ 200, 210, 300 ], B [ 50, 100, 150 ]
        // Average becomes [ 125, 155, 225 ]
        // Normalised becomes [ 0, 0.3, 1 ]
        // Inverse becomes [ 1, 0.7, 0 ]
        let result = querier.runQuery("1-normalize(avg(data(\"chisq\", \"A\"), data(\"chisq\", \"B\")))");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0.7), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });

    it("A only where error is low in chisq", () => 
    {
        // chisqB is [ 50, 100, 150 ]
        // min(chisqB, 120) is [ 1, 1, 0 ]
        // Multiplied by Ti%B [ 50, 20, 9 ] is [ 50, 20, 0 ]
        let result = querier.runQuery("element(\"Ti\", \"%\", \"B\")*under(data(\"chisq\", \"B\"), 105)");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 50), new PMCDataValue(643, 20), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });

    it("4 terms multiplied where no brackets", () => 
    {
        // chisqA [ 200, 210, 300 ], chisqB [ 50, 100, 150 ], Ti%B [ 50, 20, 9 ]
        // All multiplied: 0.001*[ 500000, 420000, 405000 ] = [ 500, 420, 405 ]
        let result = querier.runQuery("0.001*element(\"Ti\", \"%\", \"B\")*data(\"chisq\", \"A\")*data(\"chisq\", \"B\")");
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 500), new PMCDataValue(643, 420), new PMCDataValue(644, 405)]
        );
        expect(result).toEqual(expected);
    });
});


// Some example super long expressions:

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//element("Al2O3", "%-as-mmol", "Combined")-min(element("Al2O3", "%-as-mmol", "Combined"), min(element("Na2O", "%-as-mmol", "Combined")+element("K2O", "%-as-mmol", "Combined")+element("CaO", "%-as-mmol", "Combined"), (1/0.7)*element("Na2O", "%-as-mmol", "Combined")))

/* Broken down:

element("Al2O3", "%-as-mmol", "Combined")-
min(
    element("Al2O3", "%-as-mmol", "Combined"),
    min(
        element("Na2O", "%-as-mmol", "Combined")+element("K2O", "%-as-mmol", "Combined")+element("CaO", "%-as-mmol", "Combined"),
        (1/0.7)*element("Na2O", "%-as-mmol", "Combined")
        )
    )
*/

/* With variables:
Al2O3 = element("Al2O3", "%-as-mmol", "Combined")
Na2O = element("Na2O", "%-as-mmol", "Combined")
NaKCa = Na20+element("K2O", "%-as-mmol", "Combined")+element("CaO", "%-as-mmol", "Combined")
Al2O3-min(Al2O3, min(NaKCa, Na2O/0.7))
*/

describe("multi-line expression parsing", () =>
{
    it("works with single line", () => 
    {
        let result = DataQuerier.breakExpressionIntoParts("1-normalize(data(\"chisq\", \"A\"))");
        expect(result).toEqual(new ExpressionParts([], [], [], "1-normalize(data(\"chisq\", \"A\"))"));
    });

    it("works with single var", () => 
    {
        let result = DataQuerier.breakExpressionIntoParts(`chiSq = data("chisq", "A")
1-normalize(chiSq)`);
        expect(result).toEqual(new ExpressionParts(["chiSq"], ["data(\"chisq\", \"A\")"], [1], "1-normalize(chiSq)"));
    });

    it("fails on invalid var names", () => 
    {
        expect(()=>DataQuerier.breakExpressionIntoParts(`2chi$Sq = data("chisq", "A")
1-normalize(chiSqA$)`)).toThrowError("Line 1: Invalid variable name definition: \"2chi$Sq\"");
    });

    it("fails on missing var names", () => 
    {
        expect(()=>DataQuerier.breakExpressionIntoParts(`= data("chisq", "A")
1-normalize(chiSqA$)`)).toThrowError("Line 1: Invalid variable name definition: \"\"");
    });

    it("fails on missing var names with whitespace", () => 
    {
        expect(()=>DataQuerier.breakExpressionIntoParts(` = data("chisq", "A")
1-normalize(chiSqA$)`)).toThrowError("Line 1: Invalid variable name definition: \"\"");
    });

    it("works with multi-var", () => 
    {
        let result = DataQuerier.breakExpressionIntoParts(`\tchiSqA =\tdata( "chisq" ,"A")

 chiSqB  =\t data("chisq", "B")
 chiSqC=data("chisq", "C")

 max ( chiSqA, chiSqB)`);
        expect(result).toEqual(new ExpressionParts(["chiSqA", "chiSqB", "chiSqC"], ["data( \"chisq\" ,\"A\")", "data(\"chisq\", \"B\")", "data(\"chisq\", \"C\")"], [1, 3, 4], "max ( chiSqA, chiSqB)"));
    });

    it("fails if missing expression line", () => 
    {
        let expr = `\tchiSqA =\tdata( "chisq" ,"A")

 chiSqB  =\t data("chisq", "B")`;
        expect(()=>DataQuerier.breakExpressionIntoParts(expr)).toThrowError("No usable expression found");
    });

    it("fails if missing expression line, ends in blank lines", () => 
    {
        let expr = `\tchiSqA =\tdata( "chisq" ,"A")

 chiSqB  =\t data("chisq", "B")


`;
        expect(()=>DataQuerier.breakExpressionIntoParts(expr)).toThrowError("No usable expression found");
    });

    it("fails if var declared after expression line", () => 
    {
        let expr = `\tchiSqA =\tdata( "chisq" ,"A")
max ( chiSqA, chiSqB)
chiSqB  =\t data("chisq", "B")`;
        expect(()=>DataQuerier.breakExpressionIntoParts(expr)).toThrowError("Line 3: Detected unexpected variable declaration. Expressions should end in a statement which can be split over lines for readability.");
    });
});

describe("valid variable name check", () =>
{
    let invalidNames = ["", " ", "3d", "#something", "$something", "some Thing", "SOME&thing", "_something_b@d", "would_be_fine_IfItWasntLongerthan_about__50Characters"];
    let validNames = ["a", "d3d", "_something", "_another__var", "SOME_20plus_characterName", "is_be_fine_BecauseShorterthan_about__50Characters"];

    for(let name of invalidNames)
    {
        it("error on "+name, () => 
        {
            let result = DataQuerier.isValidVariableName(name);
            expect(result).toEqual(false);
        });
    }

    for(let name of validNames)
    {
        it("accepts "+name, () => 
        {
            let result = DataQuerier.isValidVariableName(name);
            expect(result).toEqual(true);
        });
    }
});

describe("multi-line expression with variables", () =>
{
    let source: MockSource;
    let querier: DataQuerier;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements);
        querier = new DataQuerier(source, null, null, null, null, null);
    });

    it("works with one one var, minimum white space", () => 
    {
        let result = querier.runQuery(`chiSq = data("chisq", "A")
1-normalize(chiSq)`);
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0.9), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });

    it("should fail if var name has spaces", () => 
    {
        let expr = `chi Sq = data("chisq", "A")
1-normalize(chiSq)`;
        expect(()=>querier.runQuery(expr)).toThrowError("Line 1: Invalid variable name definition: \"chi Sq\"");
    });

    it("should fail if unknown variable used", () => 
    {
        let expr = `chiSq = data("chisq", "A")
1-normalize(chiSquared)`;
        expect(()=>querier.runQuery(expr)).toThrowError("Unknown identifier: \"chiSquared\"");
    });

    it("should fail if var defined after expression", () => 
    {
        let expr = `chiSq = data("chisq", "A")
1-normalize(chiSquared)
something=chiSq`;
        expect(()=>querier.runQuery(expr)).toThrowError("Line 3: Detected unexpected variable declaration. Expressions should end in a statement which can be split over lines for readability.");
    });
    
    it("should fail if variable expression is invalid", () => 
    {
        let expr = `chiSq = nonExistantFunction("chisq")+47
1-normalize(chiSq)`;
        expect(()=>querier.runQuery(expr)).toThrowError("Line 1: Unknown callee: nonExistantFunction in: \"nonExistantFunction(\"chisq\")+47\"");
    });

    it("works with one var+comments+whitespace", () => 
    {
        let result = querier.runQuery(`  // Start with a comment
 chiSq\t= data("chisq", "A")
// Another comment

1-normalize(chiSq)`);
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0.9), new PMCDataValue(644, 0)]
        );
        expect(result).toEqual(expected);
    });
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//min((1/2.7)*element("SiO2", "%-as-mmol", "Combined"), min(0.33*element("SiO2", "%-as-mmol", "Combined")+0.2*(element("Na2O", "%-as-mmol", "Combined")-min(element("Na2O", "%-as-mmol", "Combined"), 0.5*element("Cl", "%-as-mmol", "Combined")))+0.1*( element("CaO", "%-as-mmol", "Combined")-(element("CaO", "%-as-mmol", "Combined")/(element("Ca", "%-as-mmol", "Combined")+element("MgO", "%-as-mmol", "Combined")))*min(element("Ca", "%-as-mmol", "Combined")+element("MgO", "%-as-mmol", "Combined"), element("SO3", "%-as-mmol", "Combined"))), min(2*element("Al2O3", "%-as-mmol", "Combined"), min(element("Na2O", "%-as-mmol", "Combined")-min(element("Na2O", "%-as-mmol", "Combined"), 0.5*element("Cl", "%-as-mmol", "Combined"))+element("K2O", "%-as-mmol", "Combined")+element("Al2O3", "%-as-mmol", "Combined"), min(2*( element("Na2O", "%-as-mmol", "Combined")-min(element("Na2O", "%-as-mmol", "Combined"), 0.5*element("Cl", "%-as-mmol", "Combined")))+2*element("K2O", "%-as-mmol", "Combined")+element("CaO", "%-as-mmol", "Combined")-min(element("CaO", "%-as-mmol", "Combined"), 3.33*element("P2O5", "%-as-mmol", "Combined"))-((element("CaO", "%-as-mmol", "Combined")-min(element("CaO", "%-as-mmol", "Combined"), 3.33*element("P2O5", "%-as-mmol", "Combined")))/(element("CaO", "%-as-mmol", "Combined")-min(element("CaO", "%-as-mmol", "Combined"), 3.33*element("P2O5", "%-as-mmol", "Combined"))+element("MgO", "%-as-mmol", "Combined")))*min(element("CaO", "%-as-mmol", "Combined")-min(element("CaO", "%-as-mmol", "Combined"), 3.33* element("P2O5", "%-as-mmol", "Combined"))+element("MgO", "%-as-mmol", "Combined"), element("SO3", "%-as-mmol", "Combined")), (2/0.7)*( element("Na2O", "%-as-mmol", "Combined")-min(element("Na2O", "%-as-mmol", "Combined"), 0.5*element("Cl", "%-as-mmol", "Combined"))))))))

/* Broken down:

min(
    (1/2.7)*element("SiO2", "%-as-mmol", "Combined"),
    min(
        0.33*element("SiO2", "%-as-mmol", "Combined")+0.2*
            (element("Na2O", "%-as-mmol", "Combined")-
                min(
                    element("Na2O", "%-as-mmol", "Combined"),
                    0.5*element("Cl", "%-as-mmol", "Combined")
                )
            )+
            0.1*
            (element("CaO", "%-as-mmol", "Combined")-
                (element("CaO", "%-as-mmol", "Combined") /
                    (element("Ca", "%-as-mmol", "Combined")+element("MgO", "%-as-mmol", "Combined"))
                )*
                min(
                    element("Ca", "%-as-mmol", "Combined")+element("MgO", "%-as-mmol", "Combined"),
                    element("SO3", "%-as-mmol", "Combined")
                )
            ),
        min(
            2*element("Al2O3", "%-as-mmol", "Combined"),
            min(
                element("Na2O", "%-as-mmol", "Combined")-
                    min(
                        element("Na2O", "%-as-mmol", "Combined"),
                        0.5*element("Cl", "%-as-mmol", "Combined")
                    )+
                    element("K2O", "%-as-mmol", "Combined")+
                    element("Al2O3", "%-as-mmol", "Combined"),
                min(
                    2*(
                        element("Na2O", "%-as-mmol", "Combined")-
                            min(
                                element("Na2O", "%-as-mmol", "Combined"),
                                0.5*element("Cl", "%-as-mmol", "Combined")
                            )
                        )+
                        2*element("K2O", "%-as-mmol", "Combined")+
                        element("CaO", "%-as-mmol", "Combined")-
                        min(
                            element("CaO", "%-as-mmol", "Combined"),
                            3.33*element("P2O5", "%-as-mmol", "Combined")
                        )-(
                            (element("CaO", "%-as-mmol", "Combined")-
                                min(
                                    element("CaO", "%-as-mmol", "Combined"),
                                    3.33*element("P2O5", "%-as-mmol", "Combined")
                                )
                            )/
                                (element("CaO", "%-as-mmol", "Combined")-
                                    min(
                                        element("CaO", "%-as-mmol", "Combined"),
                                        3.33*element("P2O5", "%-as-mmol", "Combined")
                                    )+
                                    element("MgO", "%-as-mmol", "Combined")
                                )
                        )*
                        min(
                            element("CaO", "%-as-mmol", "Combined")-
                            min(
                                element("CaO", "%-as-mmol", "Combined"),
                                3.33* element("P2O5", "%-as-mmol", "Combined")
                            )+
                            element("MgO", "%-as-mmol", "Combined"),
                            element("SO3", "%-as-mmol", "Combined")),
                        (2/0.7)*
                        (
                            element("Na2O", "%-as-mmol", "Combined")-
                            min(
                                element("Na2O", "%-as-mmol", "Combined"),
                                0.5*element("Cl", "%-as-mmol", "Combined")
                            )
                        )
                )
            )
        )
    )
)
*/

/* With variables:

SiO2 = element("SiO2", "%-as-mmol", "Combined")
Na2O = element("Na2O", "%-as-mmol", "Combined")
CaO = element("CaO", "%-as-mmol", "Combined")
Al2O3 = element("Al2O3", "%-as-mmol", "Combined")
Cl = element("Cl", "%-as-mmol", "Combined")
P2O5 = element("P2O5", "%-as-mmol", "Combined")
MgO = element("MgO", "%-as-mmol", "Combined")
SO3 = element("SO3", "%-as-mmol", "Combined")
Ca = element("Ca", "%-as-mmol", "Combined")
K2O = element("K2O", "%-as-mmol", "Combined")

minCaOP2O5 = min(CaO, 3.33*P2O5)
remainingCaO = CaO-minCaOP2O5
minNa2OCl = min(Na2O, 0.5*Cl)
remainingNa = Na2O-minNa2OCl
minCavsS = min(Ca+MgO, SO3)
minRemainingCaOvsS = min(remainingCaO+MgO, SO3)

min(
    (1/2.7)*SiO2,
    min(
        0.33*SiO2 + 0.2*remainingNa + 0.1 * (CaO - (CaO / (Ca+MgO)) * minCavsS),
        min(
            2*Al2O3,
            min(
                remainingNa + K2O + Al2O3,
                min(
                    2 * (remainingNa + K2O) + remainingCaO - (remainingCaO / (remainingCaO + MgO)) * minRemainingCaOvsS,
                    (2/0.7)*remainingNa
                )
            )
        )
    )
)
*/


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//pow(pow(element("P2O5", "err", "Combined")*33.3/142,2)+pow(element("CaO", "err", "Combined")*10/56.1,2)+pow(element("SO3", "err", "Combined")*10*((element("CaO", "%-as-mmol", "Combined")-min(element("CaO", "%-as-mmol", "Combined"), 3.33*element("P2O5", "%-as-mmol", "Combined")))/( element("CaO", "%-as-mmol", "Combined")-min(element("CaO", "%-as-mmol", "Combined"), 3.33*element("P2O5", "%-as-mmol", "Combined"))+element("MgO", "%-as-mmol", "Combined")))/80.1,2)+pow(element("K2O", "err", "Combined")*10/94.2,2)+pow(element("Na2O", "err", "Combined")*10/62,2)+pow(element("Cl", "err", "Combined")*5/35.5,2),0.5)

/* Broken down:

pow(
    pow(
        element("P2O5", "err", "Combined")*33.3/142,
        2
    )+pow(
        element("CaO", "err", "Combined")*10/56.1,
        2
    )+pow(
        element("SO3", "err", "Combined")*10*
        (
            (
                element("CaO", "%-as-mmol", "Combined")-
                min(
                    element("CaO", "%-as-mmol", "Combined"),
                    3.33*element("P2O5", "%-as-mmol", "Combined")
                )
            )/
            (
                element("CaO", "%-as-mmol", "Combined")-
                min(
                    element("CaO", "%-as-mmol", "Combined"),
                    3.33*element("P2O5", "%-as-mmol", "Combined")
                )+element("MgO", "%-as-mmol", "Combined")
            )
        )/80.1,
        2
    )+pow(
        element("K2O", "err", "Combined")*10/94.2,
        2
    )+pow(
        element("Na2O", "err", "Combined")*10/62,
        2
    )+pow(
        element("Cl", "err", "Combined")*5/35.5,
        2
    ),
    0.5
)
*/

/* With variables:

CaO = element("CaO", "%-as-mmol", "Combined")
CaOminusMinCaOP = CaO-min(CaO, 3.33*element("P2O5", "%-as-mmol", "Combined"))

pow(
    pow(
        element("P2O5", "err", "Combined") * 33.3/142,
        2
    )+pow(
        element("CaO", "err", "Combined") * 10/56.1,
        2
    )+pow(
        element("SO3", "err", "Combined")* 10 * (CaOminusMinCaOP/CaOminusMinCaOP+element("MgO", "%-as-mmol", "Combined"))/80.1,
        2
    )+pow(
        element("K2O", "err", "Combined") * 10/94.2,
        2
    )+pow(
        element("Na2O", "err", "Combined") * 10/62,
        2
    )+pow(
        element("Cl", "err", "Combined") * 5/35.5,
        2
    ),
    0.5
)
*/