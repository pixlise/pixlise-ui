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
import { PixliseDataQuerier, ExpressionParts } from "src/app/expression-language/interpret-pixlise";
import { InterpreterDataSource } from "src/app/expression-language/interpreter-data-source";
import { DataSet } from "src/app/models/DataSet";



class MockSource implements QuantifiedDataQuerierSource
{
    constructor(public data: object, protected _elemList: string[], protected _pmcs: number[])
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

    getPMCList(): number[]
    {
        return this._pmcs;
    }

    getDetectors(): string[]
    {
        return ["A", "B"];
    }

    columnExists(col: string): boolean
    {
        return col == "chisq";
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

    getPseudoIntensityElementsList(): string[]
    {
        return Object.keys(this.data);
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

    hasHousekeepingData(name: string): boolean
    {
        let value = this.data[name];
        return (value !== undefined);
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

const srcPMCs = [642, 643, 644];

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

function checkResultOK(querier: PixliseDataQuerier, dataSource: InterpreterDataSource, done: DoneFn, expr: string, expectedResult: any): void
{
    querier.runQuery(expr, dataSource).subscribe(
        (result)=>
        {
            expect(result.resultValues).toEqual(expectedResult);
            done();
        }
    );
}

function checkResultError(querier: PixliseDataQuerier, dataSource: InterpreterDataSource, done: DoneFn, expr: string, expectedResult: any): void
{
    try
    {
        querier.runQuery(expr, dataSource).subscribe(
            ()=>
            {
                fail("Expected failure");
            },
            ()=>
            {
                fail("Expected thrown error");
            }
        );
    }
    catch(e)
    {
        expect(e.message).toEqual(expectedResult);
        done();
    }
}

describe("element() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if non-existant element specified", (done) => 
    {
        checkResultError(querier, dataSource, done, "element(\"Mg\", \"%\", \"B\")", "The currently loaded quantification does not contain column: \"Mg_%_B\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if non-existant detector specified", (done)=>
    {
        checkResultError(querier, dataSource, done, "element(\"Fe\", \"%\", \"C\")", "The currently loaded quantification does not contain column: \"Fe_%_C\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if non-existant data specified", (done)=>
    {
        checkResultError(querier, dataSource, done, "element(\"Fe\", \"err\", \"B\")", "The currently loaded quantification does not contain column: \"Fe_err_B\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if not enough params to element call", (done)=>
    {
        checkResultError(querier, dataSource, done, "element(\"Fe\", \"%\")", "element() expression expects 3 parameters: element, datatype, detector Id. Received: [\"Fe\",\"%\"]");
    });

    it("should fail if too many params to element call", (done)=>
    {
        checkResultError(querier, dataSource, done, "element(\"Fe\", \"%\", \"A\", \"Hello\")", "element() expression expects 3 parameters: element, datatype, detector Id. Received: [\"Fe\",\"%\",\"A\",\"Hello\"]");
    });

    it("should return element map Fe_%_A", (done) => 
    {
        checkResultOK(querier, dataSource, done, "element(\"Fe\", \"%\", \"A\")", srcData["Fe_%_A"]);
    });

    it("should return element map Ti_%_A", (done) => 
    {
        checkResultOK(querier, dataSource, done, "element(\"Ti\", \"%\", \"A\")", srcData["Ti_%_A"]);
    });

    it("%-as-mmol conversion factor Ti_%_A", (done) => 
    {
        let srcValues = srcData["Ti_%_A"];
        let expValues = [];
        for(let val of srcValues.values)
        {
            expValues.push(new PMCDataValue(val.pmc, val.value*10/47.88));
        }
        let expMmol = PMCDataValues.makeWithValues(expValues);

        checkResultOK(querier, dataSource, done, "element(\"Ti\", \"%-as-mmol\", \"A\")", expMmol);
    });

    it("should fail for bad syntax", (done) => 
    {
        checkResultError(querier, dataSource, done, "element(\"Fe\", ", "Expected comma at character 14");
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
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcDataFeO, srcDataElementsFeO, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("%-as-mmol conversion factor FeO-T_%_Combined", (done)=>
    {
        let srcValues = srcDataFeO["FeO-T_%_Combined"];
        let expValues = [];
        for(let val of srcValues.values)
        {
            expValues.push(new PMCDataValue(val.pmc, val.value*10/(55.847+15.9994)));
        }
        let expMmol = PMCDataValues.makeWithValues(expValues);

        checkResultOK(querier, dataSource, done, "element(\"FeO-T\", \"%-as-mmol\", \"Combined\")", expMmol);
    });
});

describe("elementSum() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if non-existant detector specified", (done)=>
    {
        checkResultError(querier, dataSource, done, "elementSum(\"%\", \"C\")", "The currently loaded quantification does not contain column: \"Fe_%_C\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if non-existant data specified", (done)=>
    {
        checkResultError(querier, dataSource, done, "elementSum(\"err\", \"B\")", "The currently loaded quantification does not contain column: \"Fe_err_B\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if not enough params to element call", (done)=>
    {
        checkResultError(querier, dataSource, done, "elementSum(\"%\")", "elementSum() expression expects 2 parameters: datatype, detector Id. Received: [\"%\"]");
    });

    it("should fail if too many params to element call", (done)=>
    {
        checkResultError(querier, dataSource, done, "elementSum(\"%\", \"A\", \"Hello\")", "elementSum() expression expects 2 parameters: datatype, detector Id. Received: [\"%\",\"A\",\"Hello\"]");
    });

    it("should return sum of element map Fe, Ti for _%_A", (done)=>
    {
        let exp = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 5), new PMCDataValue(643, 7), new PMCDataValue(644, 9)]
        );

        checkResultOK(querier, dataSource, done, "elementSum(\"%\", \"A\")", exp);
    });

    it("should fail for bad syntax", (done)=>
    {
        checkResultError(querier, dataSource, done, "elementSum(\"Fe\", ", "Expected comma at character 17");
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
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockPseudoSource(pseudoSrcData);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(null, source, null, null, null, null);
    });

    it("should fail if non-existant pseudo-element specified", (done)=>
    {
        checkResultError(querier, dataSource, done, "pseudo(\"Hg\")", "The currently loaded dataset does not include pseudo-intensity data with column name: \"Hg\"");
    });

    it("should return pseudo-intensity map Fe", (done)=>
    {
        checkResultOK(querier, dataSource, done, "pseudo(\"Fe\")", pseudoSrcData["Fe"]);
    });
});


describe("housekeeping() call", () =>
{
    let source: MockHousekeepingSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockHousekeepingSource(housekeepingSrcData);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(null, null, source, null, null, null);
    });

    it("should fail if non-existant housekeeping column specified", (done)=>
    {
        checkResultError(querier, dataSource, done, "housekeeping(\"Coolant Tmp\")", "The currently loaded dataset does not include housekeeping data with column name: \"Coolant Tmp\"");
    });

    it("should return housekeeping map Cover Tmp", (done)=>
    {
        checkResultOK(querier, dataSource, done, "housekeeping(\"Cover Tmp\")", housekeepingSrcData["Cover Tmp"]);
    });

    it("should return housekeeping map for Z height", (done)=>
    {
        checkResultOK(querier, dataSource, done, "position(\"z\")", housekeepingSrcData["z"]);
    });
});


describe("diffractionPeaks() call", () =>
{
    let source: MockDiffractionSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

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
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(null, null, null, null, source, null);
    });

    it("should return all diffraction peaks", (done)=>
    {
        checkResultOK(querier, dataSource, done, "diffractionPeaks(0, 4097)", diffractionSrcData[0]);
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
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    const diffractionSrcData = [
        PMCDataValues.makeWithValues([
            new PMCDataValue(30, 0.6), new PMCDataValue(58, 0.9), new PMCDataValue(84, 2.6)
        ]),
    ];

    beforeEach(() => 
    {
        source = new MockDiffractionSource(diffractionSrcData);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(null, null, null, null, source, null);
    });

    it("should return all roughness peaks", (done)=>
    {
        checkResultOK(querier, dataSource, done, "roughness()", diffractionSrcData[0]);
    });
/*
    it('should return peaks within channel range', () => {
        expect(()=>querier.runQuery('diffractionPeaks(500, 1000)')).toEqual(diffractionSrcData[1]);
    });
*/
});

describe("makeMap() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no param", (done)=>
    {
        checkResultError(querier, dataSource, done, "makeMap()", "makeMap() expression expects 1 parameter: map value");
    });

    it("should fail if non-number param", (done)=>
    {
        checkResultError(querier, dataSource, done, "makeMap(\"Mg\")", "makeMap() expression expects 1 parameter: map value");
    });

    it("makeMap should work", (done)=>
    {
        let expValues = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 3.1415926), new PMCDataValue(643, 3.1415926), new PMCDataValue(644, 3.1415926)]
        );

        checkResultOK(querier, dataSource, done, "makeMap(3.1415926)", expValues);
    });

    it("makeMap should work when called with scalar func pow", (done)=>
    {
        let expValues = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 8), new PMCDataValue(643, 8), new PMCDataValue(644, 8)]
        );
        checkResultOK(querier, dataSource, done, "makeMap(pow(2, 3))", expValues);
    });

    it("makeMap should work when called with scalar func sin", (done)=>
    {
        let expValues = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0.9092974268256817), new PMCDataValue(643, 0.9092974268256817), new PMCDataValue(644, 0.9092974268256817)]
        );
        checkResultOK(querier, dataSource, done, "makeMap(sin(2))", expValues);
    });
});

describe("math functions", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    let trigFunctionNames = ["sin", "cos", "tan", "asin", "acos", "atan", "exp", "ln"];
    let trigFunctions = [Math.sin, Math.cos, Math.tan, Math.asin, Math.acos, Math.atan, Math.exp, Math.log];

    for(let c = 0; c < trigFunctionNames.length; c++)
    {
        let func = trigFunctionNames[c];
        let funcPtr = trigFunctions[c];

        it(func+" should fail if no param", (done)=>
        {
            checkResultError(querier, dataSource, done, func+"()", func+"() expression expects 1 parameter: scalar (radians) OR map of radians");
        });

        it(func+" should fail if non-number param", (done)=>
        {
            checkResultError(querier, dataSource, done, func+"(\"Mg\")", func+"() expression expects 1 parameter: scalar (radians) OR map of radians. Arg was wrong type.");
        });

        it(func+" should work for scalar (though result wont be map so should print error)", (done)=>
        {
            checkResultError(querier, dataSource, done, func+"(1.5)", "Expression: "+func+"(1.5) did not result in usable map data. Result was: "+funcPtr(1.5));
        });

        it(func+" should work for map", (done)=>
        {
            let expValues = PMCDataValues.makeWithValues(
                [new PMCDataValue(642, funcPtr(1)), new PMCDataValue(643, funcPtr(2)), new PMCDataValue(644, funcPtr(3))]
            );
            checkResultOK(querier, dataSource, done, func+"(element(\"Fe\", \"%\", \"A\"))", expValues);
        });
    }
});

describe("atomicMass function", () =>
{
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(null, null, null, null, null, null);
    });

    it("atomicMass should fail if no param", (done)=>
    {
        checkResultError(querier, dataSource, done, "atomicMass()", "atomicMass() expression expects 1 parameters: Atomic symbol. Received: 0 parameters");
    });

    it("atomicMass should fail if more than 1", (done)=>
    {
        checkResultError(querier, dataSource, done, "atomicMass(\"Hi\", 3)", "atomicMass() expression expects 1 parameters: Atomic symbol. Received: 2 parameters");
    });

    it("atomicMass should fail not string param", (done)=>
    {
        checkResultError(querier, dataSource, done, "atomicMass(3)", "atomicMass() expression expects 1 parameters: Atomic symbol, eg Fe, O or Fe2O3");
    });

    it("atomicMass should fail for invalid formula", (done)=>
    {
        checkResultError(querier, dataSource, done, "atomicMass(\"Hello\")", "atomicMass() Failed to calculate mass for: Hello");
    });

    it("atomicMass should work for element (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "atomicMass(\"Fe\")", "Expression: atomicMass(\"Fe\") did not result in usable map data. Result was: 55.847");
    });

    it("atomicMass should work for formula (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "atomicMass(\"Fe2O3\")", "Expression: atomicMass(\"Fe2O3\") did not result in usable map data. Result was: "+(55.847*2+15.9994*3));
    });
});

describe("Data source NOT set", () =>
{
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(null, null, null, null, null, null);
    });

    it("pseudo() - should fail with cannot find data source error", (done)=>
    {
        checkResultError(querier, dataSource, done, "pseudo(\"Mg\")", "pseudo() failed, no pseudo-intensity data exists in currently loaded data set.");
    });

    it("housekeeping() - should fail with cannot find data source error", (done)=>
    {
        checkResultError(querier, dataSource, done, "housekeeping(\"Mg\")", "housekeeping() data retrieval failed, no housekeeping data exists in currently loaded data set.");
    });

    it("data() - should fail with cannot find data source error", (done)=>
    {
        checkResultError(querier, dataSource, done, "data(\"chisq\", \"A\")", "data() expression failed, no quantification data loaded");
    });

    it("element() - should fail with cannot find data source error", (done)=>
    {
        checkResultError(querier, dataSource, done, "element(\"chisq\", \"%\", \"A\")", "element() expression failed, no quantification data loaded");
    });

    it("makeMap() - should fail with cannot map dimensions error", (done)=>
    {
        checkResultError(querier, dataSource, done, "makeMap(123)", "makeMap() expression failed, failed to determine map dimensions");
    });
});


describe("data() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if non-existant data specified", (done)=>
    {
        checkResultError(querier, dataSource, done, "data(\"livetime\", \"B\")", "The currently loaded quantification does not contain column: \"livetime_B\". Please select (or create) a quantification with the relevant element.");
    });

    it("should fail if non-existant detector specified", (done)=>
    {
        checkResultError(querier, dataSource, done, "data(\"chisq\", \"C\")", "The currently loaded quantification does not contain column: \"chisq_C\". Please select (or create) a quantification with the relevant element.");
    });

    it("should return chisq A map", (done)=>
    {
        checkResultOK(querier, dataSource, done, "data(\"chisq\", \"A\")", srcData["chisq_A"]);
    });
    
    it("should return chisq B map", (done)=>
    {
        checkResultOK(querier, dataSource, done, "data(\"chisq\", \"B\")", srcData["chisq_B"]);
    });
});

describe("normalize() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if param not a map", (done)=>
    {
        checkResultError(querier, dataSource, done, "normalize(37)", "normalize() expects 1 map parameter. Received: 1 parameters");
    });

    it("should fail if > 1 param", (done)=>
    {
        checkResultError(querier, dataSource, done, "normalize(37, 38)", "normalize() expects 1 map parameter. Received: 2 parameters");
    });

    it("should fail if 0 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "normalize()", "normalize() expects 1 map parameter. Received: 0 parameters");
    });

    it("should normalize a data map", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 0.5), new PMCDataValue(644, 1)]
        );
        checkResultOK(querier, dataSource, done, "normalize(data(\"chisq\", \"B\"))", expected);
    });

    it("should work with multiplier", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 2.5), new PMCDataValue(644, 5)]
        );
        checkResultOK(querier, dataSource, done, "5*normalize(data(\"chisq\", \"B\"))", expected);
    });

    it("should normalize a element map", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, (4/5)), new PMCDataValue(643, 0), new PMCDataValue(644, 1)]
        );
        checkResultOK(querier, dataSource, done, "normalize(element(\"Fe\", \"%\", \"B\"))", expected);
    });
});

describe("threshold() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "threshold()", "threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "threshold(37)", "threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 1 parameters");
    });

    it("should fail if 2 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "threshold(37, 38)", "threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 2 parameters");
    });

    it("should fail if 4 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "threshold(37, 38, 49, 50)", "threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 4 parameters");
    });

    it("should fail if first param not a map", (done)=>
    {
        checkResultError(querier, dataSource, done, "threshold(33, 18, 3)", "threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 3 parameters");
    });

    it("should fail if second param not a scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "threshold(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"A\"), 3)", "threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 3 parameters");
    });

    it("should fail if third param not a scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "threshold(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"A\"), element(\"Fe\", \"%\", \"A\"))", "threshold() expects 3 parameters: map, scalar(compare), scalar(threshold). Received: 3 parameters");
    });

    it("should threshold element map to 0,1,0", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 1), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, "threshold(element(\"Ti\", \"%\", \"B\"), 18, 3)", expected);
    });

    it("should threshold element map to 0,1,1", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 1), new PMCDataValue(644, 1)]
        );
        checkResultOK(querier, dataSource, done, "threshold(element(\"Ti\", \"%\", \"B\"), 18, 10)", expected);
    });
});

describe("pow() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "pow()", "pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "pow(37)", "pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: 1 parameters");
    });

    it("should fail if 3 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "pow(37, 38, 39)", "pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Received: 3 parameters");
    });

    it("should fail if second parameter is map", (done)=>
    {
        checkResultError(querier, dataSource, done, "pow(37, element(\"Ti\", \"%\", \"B\"))", "pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Arg1 was wrong type");
    });

    it("should pow for scalars (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "pow(2, 8)", "Expression: pow(2, 8) did not result in usable map data. Result was: 256");
    });

    it("should fail if first param is not scalar or map)", (done)=>
    {
        checkResultError(querier, dataSource, done, "pow(\"Ti\", 8)", "pow() expects 2 parameters: map OR scalar (base), scalar (exponent). Arg0 was wrong type");
    });

    it("should pow for map, scalar", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 125000), new PMCDataValue(643, 8000), new PMCDataValue(644, 729)]
        );
        checkResultOK(querier, dataSource, done, "pow(element(\"Ti\", \"%\", \"B\"), 3)", expected);
    });
});

describe("avg() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "avg()", "avg() expects 2 parameters: (map, map). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "avg(37)", "avg() expects 2 parameters: (map, map). Received: 1 parameters");
    });

    it("should fail if 3 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "avg(37, 38, 39)", "avg() expects 2 parameters: (map, map). Received: 3 parameters");
    });

    it("should fail if first param not a map", (done)=>
    {
        checkResultError(querier, dataSource, done, "avg(33, element(\"Ti\", \"%\", \"B\"))", "avg() expects 2 parameters: (map, map). Received: 2 parameters");
    });

    it("should fail if second param not a map", (done)=>
    {
        checkResultError(querier, dataSource, done, "avg(element(\"Ti\", \"%\", \"A\"), 32)", "avg() expects 2 parameters: (map, map). Received: 2 parameters");
    });

    it("should average 2 maps", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 27), new PMCDataValue(643, 12.5), new PMCDataValue(644, 7.5)]
        );
        checkResultOK(querier, dataSource, done, "avg(element(\"Ti\", \"%\", \"A\"), element(\"Ti\", \"%\", \"B\"))", expected);
    });
});

describe("min() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "min()", "min() expects 2 parameters: (map, map or scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "min(37)", "min() expects 2 parameters: (map, map or scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "min(37, 38, 39)", "min() expects 2 parameters: (map, map or scalar). Received: 3 parameters");
    });

    it("should fail if first param not a map", (done)=>
    {
        checkResultError(querier, dataSource, done, "min(33, element(\"Ti\", \"%\", \"B\"))", "min() expects 2 parameters: (map, map or scalar). Received: 2 parameters");
    });

    it("should take min of 2 maps", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 4), new PMCDataValue(643, 1), new PMCDataValue(644, 6)]
        );
        checkResultOK(querier, dataSource, done, "min(element(\"Fe\", \"%\", \"B\"), element(\"Ti\", \"%\", \"A\"))", expected);
    });

    it("should take min of map and scalar", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 4), new PMCDataValue(643, 1), new PMCDataValue(644, 4)]
        );
        checkResultOK(querier, dataSource, done, "min(element(\"Fe\", \"%\", \"B\"), 4)", expected);
    });
});

describe("max() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "max()", "max() expects 2 parameters: (map, map or scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "max(37)", "max() expects 2 parameters: (map, map or scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "max(37, 38, 39)", "max() expects 2 parameters: (map, map or scalar). Received: 3 parameters");
    });

    it("should fail if first param not a map", (done)=>
    {
        checkResultError(querier, dataSource, done, "max(33, element(\"Ti\", \"%\", \"B\"))", "max() expects 2 parameters: (map, map or scalar). Received: 2 parameters");
    });

    it("should take max of 2 maps", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 5), new PMCDataValue(643, 5), new PMCDataValue(644, 6)]
        );
        checkResultOK(querier, dataSource, done, "max(element(\"Fe\", \"%\", \"B\"), element(\"Ti\", \"%\", \"A\"))", expected);
    });

    it("should take max of map and scalar", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 5), new PMCDataValue(643, 4), new PMCDataValue(644, 6)]
        );
        checkResultOK(querier, dataSource, done, "max(element(\"Fe\", \"%\", \"B\"), 4)", expected);
    });
});

describe("under() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "under()", "under() expects 2 parameters: (map, scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "under(37)", "under() expects 2 parameters: (map, scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "under(37, 38, 39)", "under() expects 2 parameters: (map, scalar). Received: 3 parameters");
    });

    it("should fail if params arent map, scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "under(33, element(\"Ti\", \"%\", \"B\"))", "under() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should fail if second param not a scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "under(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"B\"))", "under() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should make binary map of 1 where Ti < 40 else 0", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 1), new PMCDataValue(644, 1)]
        );
        checkResultOK(querier, dataSource, done, "under(element(\"Ti\", \"%\", \"B\"), 40)", expected);
    });

    it("should make binary map of 1 where Ti < 15 else 0", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0), new PMCDataValue(643, 0), new PMCDataValue(644, 1)]
        );
        checkResultOK(querier, dataSource, done, "under(element(\"Ti\", \"%\", \"B\"), 15)", expected);
    });
});

describe("under_undef() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "under_undef()", "under_undef() expects 2 parameters: (map, scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "under_undef(37)", "under_undef() expects 2 parameters: (map, scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "under_undef(37, 38, 39)", "under_undef() expects 2 parameters: (map, scalar). Received: 3 parameters");
    });

    it("should fail if params arent map, scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "under_undef(33, element(\"Ti\", \"%\", \"B\"))", "under_undef() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should fail if second param not a scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "under_undef(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"B\"))", "under_undef() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should make binary map of 1 where Ti < 40 else undefined", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0, true), new PMCDataValue(643, 1), new PMCDataValue(644, 1)]
        );
        checkResultOK(querier, dataSource, done, "under_undef(element(\"Ti\", \"%\", \"B\"), 40)", expected);
    });

    it("should make binary map of 1 where Ti < 15 else undefined", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0, true), new PMCDataValue(643, 0, true), new PMCDataValue(644, 1)]
        );
        checkResultOK(querier, dataSource, done, "under_undef(element(\"Ti\", \"%\", \"B\"), 15)", expected);
    });
});

describe("over() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "over()", "over() expects 2 parameters: (map, scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "over(37)", "over() expects 2 parameters: (map, scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "over(37, 38, 39)", "over() expects 2 parameters: (map, scalar). Received: 3 parameters");
    });

    it("should fail if params arent map, scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "over(33, element(\"Ti\", \"%\", \"B\"))", "over() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should fail if second param not a scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "over(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"B\"))", "over() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should make binary map of 1 where Ti > 40 else 0", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, "over(element(\"Ti\", \"%\", \"B\"), 40)", expected);
    });

    it("should make binary map of 1 where Ti > 15 else 0", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 1), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, "over(element(\"Ti\", \"%\", \"B\"), 15)", expected);
    });
});

describe("over_undef() call", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if no params", (done)=>
    {
        checkResultError(querier, dataSource, done, "over_undef()", "over_undef() expects 2 parameters: (map, scalar). Received: 0 parameters");
    });

    it("should fail if 1 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "over_undef(37)", "over_undef() expects 2 parameters: (map, scalar). Received: 1 parameters");
    });

    it("should fail if 3 params", (done)=>
    {
        checkResultError(querier, dataSource, done, "over_undef(37, 38, 39)", "over_undef() expects 2 parameters: (map, scalar). Received: 3 parameters");
    });

    it("should fail if params arent map, scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "over_undef(33, element(\"Ti\", \"%\", \"B\"))", "over_undef() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should fail if second param not a scalar", (done)=>
    {
        checkResultError(querier, dataSource, done, "over_undef(element(\"Ti\", \"%\", \"B\"), element(\"Ti\", \"%\", \"B\"))", "over_undef() expects 2 parameters: (map, scalar). Received: 2 parameters");
    });

    it("should make binary map of 1 where Ti > 40 else undefined", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0, true), new PMCDataValue(644, 0, true)]
        );
        checkResultOK(querier, dataSource, done, "over_undef(element(\"Ti\", \"%\", \"B\"), 40)", expected);
    });

    it("should make binary map of 1 where Ti > 15 else undefined", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 1), new PMCDataValue(644, 0, true)]
        );
        checkResultOK(querier, dataSource, done, "over_undef(element(\"Ti\", \"%\", \"B\"), 15)", expected);
    });
});

describe("+ operator", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should just return the number if unary (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "+7", "Expression: +7 did not result in usable map data. Result was: 7");
    });

    it("should fail if missing second param", (done)=>
    {
        checkResultError(querier, dataSource, done, "7+", "Expected expression after + at character 2");
    });

    it("should allow params as scalar+scalar (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "7+3", "Expression: 7+3 did not result in usable map data. Result was: 10");
    });

    it("should allow scalar+map", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 57), new PMCDataValue(643, 27), new PMCDataValue(644, 16)]
        );
        checkResultOK(querier, dataSource, done, "7+element(\"Ti\", \"%\", \"B\")", expected);
    });

    it("should allow map+scalar", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 57), new PMCDataValue(643, 27), new PMCDataValue(644, 16)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Ti\", \"%\", \"B\")+7", expected);
    });

    it("should add 2 maps together", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 9), new PMCDataValue(643, 6), new PMCDataValue(644, 12)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Fe\", \"%\", \"B\")+element(\"Ti\", \"%\", \"A\")", expected);
    });
});

describe("- operator", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should just return negative number if unary (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "-7", "Expression: -7 did not result in usable map data. Result was: -7");
    });

    it("should fail if missing second param", (done)=>
    {
        checkResultError(querier, dataSource, done, "7-", "Expected expression after - at character 2");
    });

    it("should allow params as scalar-scalar (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "7-3", "Expression: 7-3 did not result in usable map data. Result was: 4");
    });

    it("should allow scalar-map", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, -43), new PMCDataValue(643, -13), new PMCDataValue(644, -2)]
        );
        checkResultOK(querier, dataSource, done, "7-element(\"Ti\", \"%\", \"B\")", expected);
    });

    it("should allow map-scalar", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 43), new PMCDataValue(643, 13), new PMCDataValue(644, 2)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Ti\", \"%\", \"B\")-7", expected);
    });

    it("should add 2 maps together", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, -4), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Fe\", \"%\", \"B\")-element(\"Ti\", \"%\", \"A\")", expected);
    });
});

describe("* operator", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if not binary op", (done)=>
    {
        checkResultError(querier, dataSource, done, "*7", "Unexpected \"*\" at character 0");
    });

    it("should fail if missing second param", (done)=>
    {
        checkResultError(querier, dataSource, done, "7*", "Expected expression after * at character 2");
    });

    it("should allow params as scalar*scalar (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "7*3", "Expression: 7*3 did not result in usable map data. Result was: 21");
    });

    it("should allow multiplying scalar*map", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 350), new PMCDataValue(643, 140), new PMCDataValue(644, 63)]
        );
        checkResultOK(querier, dataSource, done, "7*element(\"Ti\", \"%\", \"B\")", expected);
    });

    it("should allow multiplying map*scalar", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 250), new PMCDataValue(643, 100), new PMCDataValue(644, 45)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Ti\", \"%\", \"B\")*5", expected);
    });

    it("should multiply 2 maps together", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 50), new PMCDataValue(643, 200), new PMCDataValue(644, 450)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Fe\", \"%\", \"A\")*data(\"chisq\", \"B\")", expected);
    });
});

describe("/ operator", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("should fail if not binary op", (done)=>
    {
        checkResultError(querier, dataSource, done, "/7", "Unexpected \"/\" at character 0");
    });

    it("should fail if missing second param", (done)=>
    {
        checkResultError(querier, dataSource, done, "7/", "Expected expression after / at character 2");
    });

    it("should allow params as scalar/scalar (though result wont be map so should print error)", (done)=>
    {
        checkResultError(querier, dataSource, done, "6/3", "Expression: 6/3 did not result in usable map data. Result was: 2");
    });

    it("should allow dividing scalar by map", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0.14), new PMCDataValue(643, 0.35), new PMCDataValue(644, 0.7777777777777778)]
        );
        checkResultOK(querier, dataSource, done, "7/element(\"Ti\", \"%\", \"B\")", expected);
    });

    it("should allow dividing map by scalar", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 10), new PMCDataValue(643, 4), new PMCDataValue(644, 1.8)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Ti\", \"%\", \"B\")/5", expected);
    });

    it("should divide map by another", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 0.02), new PMCDataValue(643, 0.02), new PMCDataValue(644, 0.02)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Fe\", \"%\", \"A\")/data(\"chisq\", \"B\")", expected);
    });
});


describe("more complex operations", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("inv-chisq A", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0.9), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, "1-normalize(data(\"chisq\", \"A\"))", expected);
    });

    it("inv-avg(chisq A and B)", (done)=>
    {
        // A [ 200, 210, 300 ], B [ 50, 100, 150 ]
        // Average becomes [ 125, 155, 225 ]
        // Normalised becomes [ 0, 0.3, 1 ]
        // Inverse becomes [ 1, 0.7, 0 ]
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0.7), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, "1-normalize(avg(data(\"chisq\", \"A\"), data(\"chisq\", \"B\")))", expected);
    });

    it("A only where error is low in chisq", (done)=>
    {
        // chisqB is [ 50, 100, 150 ]
        // min(chisqB, 120) is [ 1, 1, 0 ]
        // Multiplied by Ti%B [ 50, 20, 9 ] is [ 50, 20, 0 ]
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 50), new PMCDataValue(643, 20), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, "element(\"Ti\", \"%\", \"B\")*under(data(\"chisq\", \"B\"), 105)", expected);
    });

    it("4 terms multiplied where no brackets", (done)=>
    {
        // chisqA [ 200, 210, 300 ], chisqB [ 50, 100, 150 ], Ti%B [ 50, 20, 9 ]
        // All multiplied: 0.001*[ 500000, 420000, 405000 ] = [ 500, 420, 405 ]
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 500), new PMCDataValue(643, 420), new PMCDataValue(644, 405)]
        );
        checkResultOK(querier, dataSource, done, "0.001*element(\"Ti\", \"%\", \"B\")*data(\"chisq\", \"A\")*data(\"chisq\", \"B\")", expected);
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
    it("works with single line", ()=>
    {
        let result = PixliseDataQuerier.breakExpressionIntoParts("1-normalize(data(\"chisq\", \"A\"))");
        expect(result).toEqual(new ExpressionParts([], [], [], "1-normalize(data(\"chisq\", \"A\"))"));
    });

    it("works with single var", ()=>
    {
        let result = PixliseDataQuerier.breakExpressionIntoParts(`chiSq = data("chisq", "A")
1-normalize(chiSq)`);
        expect(result).toEqual(new ExpressionParts(["chiSq"], ["data(\"chisq\", \"A\")"], [1], "1-normalize(chiSq)"));
    });

    it("fails on invalid var names", ()=>
    {
        expect(()=>PixliseDataQuerier.breakExpressionIntoParts(`2chi$Sq = data("chisq", "A")
1-normalize(chiSqA$)`)).toThrowError("Line 1: Invalid variable name definition: \"2chi$Sq\"");
    });

    it("fails on missing var names", ()=>
    {
        expect(()=>PixliseDataQuerier.breakExpressionIntoParts(`= data("chisq", "A")
1-normalize(chiSqA$)`)).toThrowError("Line 1: Invalid variable name definition: \"\"");
    });

    it("fails on missing var names with whitespace", ()=>
    {
        expect(()=>PixliseDataQuerier.breakExpressionIntoParts(` = data("chisq", "A")
1-normalize(chiSqA$)`)).toThrowError("Line 1: Invalid variable name definition: \"\"");
    });

    it("works with multi-var", ()=>
    {
        let result = PixliseDataQuerier.breakExpressionIntoParts(`\tchiSqA =\tdata( "chisq" ,"A")

 chiSqB  =\t data("chisq", "B")
 chiSqC=data("chisq", "C")

 max ( chiSqA, chiSqB)`);
        expect(result).toEqual(new ExpressionParts(["chiSqA", "chiSqB", "chiSqC"], ["data( \"chisq\" ,\"A\")", "data(\"chisq\", \"B\")", "data(\"chisq\", \"C\")"], [1, 3, 4], "max ( chiSqA, chiSqB)"));
    });

    it("fails if missing expression line", ()=>
    {
        let expr = `\tchiSqA =\tdata( "chisq" ,"A")

 chiSqB  =\t data("chisq", "B")`;
        expect(()=>PixliseDataQuerier.breakExpressionIntoParts(expr)).toThrowError("No usable expression found");
    });

    it("fails if missing expression line, ends in blank lines", ()=>
    {
        let expr = `\tchiSqA =\tdata( "chisq" ,"A")

 chiSqB  =\t data("chisq", "B")


`;
        expect(()=>PixliseDataQuerier.breakExpressionIntoParts(expr)).toThrowError("No usable expression found");
    });

    it("fails if var declared after expression line", ()=>
    {
        let expr = `\tchiSqA =\tdata( "chisq" ,"A")
max ( chiSqA, chiSqB)
chiSqB  =\t data("chisq", "B")`;
        expect(()=>PixliseDataQuerier.breakExpressionIntoParts(expr)).toThrowError("Line 3: Detected unexpected variable declaration. Expressions should end in a statement which can be split over lines for readability.");
    });
});

describe("valid variable name check", () =>
{
    let invalidNames = ["", " ", "3d", "#something", "$something", "some Thing", "SOME&thing", "_something_b@d", "would_be_fine_IfItWasntLongerthan_about__50Characters"];
    let validNames = ["a", "d3d", "_something", "_another__var", "SOME_20plus_characterName", "is_be_fine_BecauseShorterthan_about__50Characters"];

    for(let name of invalidNames)
    {
        it("error on "+name, ()=>
        {
            let result = PixliseDataQuerier.isValidVariableName(name);
            expect(result).toEqual(false);
        });
    }

    for(let name of validNames)
    {
        it("accepts "+name, ()=>
        {
            let result = PixliseDataQuerier.isValidVariableName(name);
            expect(result).toEqual(true);
        });
    }
});

describe("multi-line expression with variables", () =>
{
    let source: MockSource;
    let querier: PixliseDataQuerier;
    let dataSource: InterpreterDataSource;

    beforeEach(() => 
    {
        source = new MockSource(srcData, srcDataElements, srcPMCs);
        querier = new PixliseDataQuerier();
        dataSource = new InterpreterDataSource(source, null, null, null, null, null);
    });

    it("works with one one var, minimum white space", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0.9), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, `chiSq = data("chisq", "A")
1-normalize(chiSq)`, expected);
    });

    it("should fail if var name has spaces", (done)=>
    {
        checkResultError(querier, dataSource, done, `chi Sq = data("chisq", "A")
1-normalize(chiSq)`, "Line 1: Invalid variable name definition: \"chi Sq\"");
    });

    it("should fail if unknown variable used", (done)=>
    {
        checkResultError(querier, dataSource, done, `chiSq = data("chisq", "A")
1-normalize(chiSquared)`, "Unknown identifier: \"chiSquared\"");
    });

    it("should fail if var defined after expression", (done)=>
    {
        checkResultError(querier, dataSource, done, `chiSq = data("chisq", "A")
1-normalize(chiSquared)
something=chiSq`, "Line 3: Detected unexpected variable declaration. Expressions should end in a statement which can be split over lines for readability.");
    });
    
    it("should fail if variable expression is invalid", (done)=>
    {
        checkResultError(querier, dataSource, done, `chiSq = nonExistantFunction("chisq")+47
1-normalize(chiSq)`, "Line 1: Unknown callee: nonExistantFunction in: \"nonExistantFunction(\"chisq\")+47\"");
    });

    it("works with one var+comments+whitespace", (done)=>
    {
        let expected = PMCDataValues.makeWithValues(
            [new PMCDataValue(642, 1), new PMCDataValue(643, 0.9), new PMCDataValue(644, 0)]
        );
        checkResultOK(querier, dataSource, done, `  // Start with a comment
 chiSq\t= data("chisq", "A")
// Another comment

1-normalize(chiSq)`, expected);
    });
});
