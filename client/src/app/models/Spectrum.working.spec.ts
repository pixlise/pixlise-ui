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

import { SpectrumValues, SpectrumExpressionDataSource, SpectrumExpressionParser } from "./Spectrum";

describe("SpectrumValue", () =>
{
    let A = new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 8);
    let B = new SpectrumValues(new Float32Array([4, 30, 4200, 20, 250, 40, 0, 0]), 4200, "B", 9.5);
    let Third = new SpectrumValues(new Float32Array([1, 10, 30, 10, 350, 20, 0, 0]), 350, "B", 3);

    it("getAsCountsPerMin should work", () => 
    {
        let liveTimeConv = 60/A.liveTimeSec;
        let AperSec = A.getAsCountsPerMin();
        expect(AperSec).toEqual(
            new SpectrumValues(

                new Float32Array([0, 20*liveTimeConv, 4000*liveTimeConv, 10*liveTimeConv, 300*liveTimeConv, 50*liveTimeConv, 0, 0]),
                4000*liveTimeConv,
                "A",
                60
            )
        );
    });

    it("bulkSum should fail if nothing passed", () => 
    {
        expect(SpectrumValues.bulkSum([])).toEqual(null);
    });

    it("bulkSum with different detectors", () => 
    {
        expect(SpectrumValues.bulkSum([A, B, Third])).toEqual(
            new SpectrumValues(
                new Float32Array([5, 60, 8230, 40, 900, 110, 0, 0]),
                8230,
                "",
                20.5
            )
        );
    });

    it("bulkSum with same detector", () => 
    {
        expect(SpectrumValues.bulkSum([B, Third])).toEqual(
            new SpectrumValues(
                new Float32Array([5, 40, 4230, 30, 600, 60, 0, 0]),
                4230,
                "B",
                12.5
            )
        );
    });

    it("minValue with different detector", () => 
    {
        expect(SpectrumValues.minValue([A, Third, B])).toEqual(
            new SpectrumValues(
                new Float32Array([0, 10, 30, 10, 250, 20, 0, 0]),
                250,
                "",
                6.833333333333333 // Average
            )
        );
    });

    it("minValue with same detector", () => 
    {
        expect(SpectrumValues.minValue([B, Third])).toEqual(
            new SpectrumValues(
                new Float32Array([1, 10, 30, 10, 250, 20, 0, 0]),
                250,
                "B",
                6.25 // Average
            )
        );
    });

    it("maxValue with different detector", () => 
    {
        expect(SpectrumValues.maxValue([A, Third, B])).toEqual(
            new SpectrumValues(
                new Float32Array([4, 30, 4200, 20, 350, 50, 0, 0]),
                4200,
                "",
                6.833333333333333 // Average
            )
        );
    });

    it("maxValue with same detector", () => 
    {
        expect(SpectrumValues.maxValue([B, Third])).toEqual(
            new SpectrumValues(
                new Float32Array([4, 30, 4200, 20, 350, 40, 0, 0]),
                4200,
                "B",
                6.25 // Average
            )
        );
    });

    it("subtract with different detector", () => 
    {
        expect(SpectrumValues.subtract(A, B)).toEqual(
            new SpectrumValues(
                new Float32Array([-4, -10, -200, -10, 50, 10, 0, 0]),
                50,
                "",
                8.75 // Average
            )
        );
    });

    it("subtract with same detector", () => 
    {
        expect(SpectrumValues.subtract(B, Third)).toEqual(
            new SpectrumValues(
                new Float32Array([3, 20, 4170, 10, -100, 20, 0, 0]),
                4170,
                "B",
                6.25 // Average
            )
        );
    });

    /* NOT DONE YET, waiting on email response from Brendan
    it("removeDiffraction", () => 
    {
        expect(SpectrumValues.removeDiffraction(B, Third)).toEqual(
            new SpectrumValues(
                new Float32Array([4, 10, 30, 10, 250, 20, 0, 0]),
                250,
                "B",
                9.5
            )
        );
    });
*/

    it("divideBy returns input spectrum if denominator negative", () => 
    {
        expect(SpectrumValues.divideBy(B, -3)).toEqual(B);
    });

    it("divideBy returns input spectrum if denominator 0", () => 
    {
        expect(SpectrumValues.divideBy(B, 0)).toEqual(B);
    });

    it("divideBy returns input spectrum if denominator negative", () => 
    {
        expect(SpectrumValues.divideBy(B, 4)).toEqual(new SpectrumValues(
            new Float32Array([1, 7.5, 1050, 5, 62.5, 10, 0, 0]),
            1050,
            "B",
            9.5
        ));
    });
});

class MockSpectrumExpressionDataSource implements SpectrumExpressionDataSource
{
    private _callCount = 0;

    constructor(private _expLocationIndexes: number[], private _expectedDetectorId: string[], private _expectedReadType: string[], private _spectraToReturn: SpectrumValues[],
        private _locationsWithNormalSpectra: number, private _idxForBulkMaxValueLocation: number)
    {
        if( this._expLocationIndexes.length != this._expectedDetectorId.length ||
            this._expectedDetectorId.length != this._expectedReadType.length ||
            this._expectedReadType.length != this._spectraToReturn.length)
        {
            throw new Error("Expected equal sets of expected parameters");
        }
    }

    getSpectrum(locationIndex: number, detectorId: string, readType: string): SpectrumValues
    {
        // Check expected
        if(this._callCount >= this._expLocationIndexes.length)
        {
            throw new Error("Unexpected calls to getSpectrum");
        }

        if(locationIndex != this._expLocationIndexes[this._callCount])
        {
            throw new Error("Unexpected locationIndex: "+locationIndex+", expected: "+this._expLocationIndexes[this._callCount]);
        }

        if(detectorId != this._expectedDetectorId[this._callCount])
        {
            throw new Error("Unexpected detectorId: "+detectorId+", expected: "+this._expectedDetectorId[this._callCount]);
        }

        if(readType != this._expectedReadType[this._callCount])
        {
            throw new Error("Unexpected readType: "+readType+", expected: "+this._expectedReadType[this._callCount]);
        }

        let result = this._spectraToReturn[this._callCount];

        this._callCount++;

        return result;
    }

    get locationsWithNormalSpectra(): number
    {
        return this._locationsWithNormalSpectra;
    }

    get idxForBulkMaxValueLocation(): number
    {
        return this._idxForBulkMaxValueLocation;
    }
}

describe("SpectrumExpressionParser - simple bulk(A), no locations", () =>
{
    it("no normalization", () => 
    {
        let expected = new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 80);
        let mockSource = new MockSpectrumExpressionDataSource([0], ["A"], ["BulkSum"], [expected], 4, 0);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [], "bulk(A)", "Bulk A", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["Bulk A", expected]]));
    });

    it("as count/min", () => 
    {
        let read = new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 80);
        let expected = new SpectrumValues(new Float32Array([0, 15, 3000, 7.5, 225, 37.5, 0, 0]), 3000, "A", 60);
        let mockSource = new MockSpectrumExpressionDataSource([0], ["A"], ["BulkSum"], [read], 4, 0);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [], "bulk(A)", "Bulk A", "Normal", true, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["Bulk A", expected]]));
    });

    it("as count/PMC", () => 
    {
        let read = new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 80);
        let expected = new SpectrumValues(new Float32Array([0, 5, 1000, 2.5, 75, 12.5, 0, 0]), 1000, "A", 80);
        let mockSource = new MockSpectrumExpressionDataSource([0], ["A"], ["BulkSum"], [read], 4, 0);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [], "bulk(A)", "Bulk A", "Normal", false, true);

        expect(result).toEqual(new Map<string, SpectrumValues>([["Bulk A", expected]]));
    });

    it("no bulk PMC", () => 
    {
        let mockSource = new MockSpectrumExpressionDataSource([0], ["A"], ["BulkSum"], [null], 4, null);
        let parser = new SpectrumExpressionParser();

        expect(
            ()=>parser.getSpectrumValues(mockSource, [], "bulk(A)", "Bulk A", "Normal", false, true)
        ).toThrowError("getExpressionTerms: failed to get bulk/max location idx from dataset, expression: bulk(A)");
    });
});

describe("SpectrumExpressionParser - simple bulk(A), with locations", () =>
{
    let spectra = [
        new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 8),
        new SpectrumValues(new Float32Array([0, 40, 3000, 12, 250, 40, 0, 0]), 3000, "A", 9),
        new SpectrumValues(new Float32Array([0, 30, 3500, 11, 240, 30, 10, 0]), 3500, "A", 7),
        new SpectrumValues(new Float32Array([0, 20, 1000, 1150, 100, 200, 0, 0]), 1150, "A", 8.5),
    ];

    it("no normalization", () => 
    {
        let expected = new SpectrumValues(new Float32Array([0, 60, 4000, 1162, 350, 240, 0, 0]), 4000, "A", 17.5);
        let mockSource = new MockSpectrumExpressionDataSource([1, 3], ["A", "A"], ["Normal", "Normal"], [spectra[1], spectra[3]], 4, 0);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [1, 3], "bulk(A)", "Bulk A", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["Bulk A", expected]]));
    });

    it("as count/min", () => 
    {
        let expected = new SpectrumValues(new Float32Array([0, 205.7142791748047, 13714.2861328125, 3984, 1200, 822.8571166992188, 0, 0 ]), 13714, "A", 60);
        let mockSource = new MockSpectrumExpressionDataSource([1, 3], ["A", "A"], ["Normal", "Normal"], [spectra[1], spectra[3]], 4, 0);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [1, 3], "bulk(A)", "Bulk A", "Normal", true, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["Bulk A", expected]]));
    });

    it("as count/PMC", () => 
    {
        let expected = new SpectrumValues(new Float32Array([0, 30, 2000, 581, 175, 120, 0, 0]), 2000, "A", 17.5);
        let mockSource = new MockSpectrumExpressionDataSource([1, 3], ["A", "A"], ["Normal", "Normal"], [spectra[1], spectra[3]], 4, 0);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [1, 3], "bulk(A)", "Bulk A", "Normal", false, true);

        expect(result).toEqual(new Map<string, SpectrumValues>([["Bulk A", expected]]));
    });

    it("with invalid location index", () => 
    {
        let expected = spectra[1]; // Second one won't read, but should continue on after just having read first one
        let mockSource = new MockSpectrumExpressionDataSource([1, 35], ["A", "A"], ["Normal", "Normal"], [spectra[1], null], 4, 0);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [1, 35], "bulk(A)", "Bulk A", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["Bulk A", expected]]));
    });
});

describe("SpectrumExpressionParser - sum() on bulk A vs bulk B", () =>
{
    let spectra = [
        new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 8),
        new SpectrumValues(new Float32Array([0, 40, 3000, 12, 250, 40, 0, 0]), 3000, "A", 9),
        new SpectrumValues(new Float32Array([0, 30, 3500, 11, 240, 30, 10, 0]), 3500, "B", 7),
        new SpectrumValues(new Float32Array([0, 20, 1000, 1150, 100, 200, 0, 0]), 1150, "B", 8.5),
    ];

    it("no normalization", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([0, 110, 11500, 1183, 890, 320, 10, 0]), 11500, "", 32.5);
        let mockSource = new MockSpectrumExpressionDataSource([0, 1, 0, 1], ["A", "A", "B", "B"], ["Normal", "Normal", "Normal", "Normal"], spectra, 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0, 1], "sum(bulk(A),bulk(B))", "A+B", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["A+B", expected]]));
    });

    it("as count/min", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([0, 203.07691955566406, 21230.76953125, 2184, 1643.076904296875, 590.7692260742188, 18.461538314819336, 0]), 21230, "", 60);
        let mockSource = new MockSpectrumExpressionDataSource([0, 1, 0, 1], ["A", "A", "B", "B"], ["Normal", "Normal", "Normal", "Normal"], spectra, 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0, 1], "sum(bulk(A),bulk(B))", "A+B", "Normal", true, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["A+B", expected]]));
    });

    it("as count/PMC", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([0, 55, 5750, 591.5, 445, 160, 5, 0]), 5750, "", 32.5);
        let mockSource = new MockSpectrumExpressionDataSource([0, 1, 0, 1], ["A", "A", "B", "B"], ["Normal", "Normal", "Normal", "Normal"], spectra, 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0, 1], "sum(bulk(A),bulk(B))", "A+B", "Normal", false, true);

        expect(result).toEqual(new Map<string, SpectrumValues>([["A+B", expected]]));
    });

    // No need to test this for every operation, but here we try it once... This doesn't error out, it just adds what it can
    it("with invalid location index", () => 
    {
        let expected = new SpectrumValues(new Float32Array([0, 50, 7500, 21, 540, 80, 10, 0]), 7500, "", 15);
        let mockSource = new MockSpectrumExpressionDataSource([0, 17, 0, 17], ["A", "A", "B", "B"], ["Normal", "Normal", "Normal", "Normal"], [spectra[0], null, spectra[2], null], 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0, 17], "sum(bulk(A),bulk(B))", "A+B", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["A+B", expected]]));
    });
});

describe("SpectrumExpressionParser - difference() on bulk A vs bulk B", () =>
{
    let spectra = [
        new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 8),
        new SpectrumValues(new Float32Array([0, 40, 3000, 12, 250, 40, 0, 0]), 3000, "A", 9),
        // Bulk A:                         0, 60, 7000, 22, 550, 90, 0, 0               17
        new SpectrumValues(new Float32Array([0, 30, 3500, 11, 240, 30, 10, 0]), 3500, "B", 7),
        new SpectrumValues(new Float32Array([0, 20, 1000, 1150, 100, 200, 0, 0]), 1150, "B", 8.5),
        // Bulk B:                         0, 50, 4500, 1161, 340, 230, 10, 0           15.5
    ];

    it("A-B, no normalization", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([0, 10, 2500, -1139, 210, -140, -10, 0]), 2500, "", 16.25);
        let mockSource = new MockSpectrumExpressionDataSource([0, 1, 0, 1], ["A", "A", "B", "B"], ["Normal", "Normal", "Normal", "Normal"], spectra, 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0, 1], "diff(bulk(A),bulk(B))", "A-B", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["A-B", expected]]));
    });

    it("B-A, no normalization", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([0, -10, -2500, 1139, -210, 140, 10, 0]), 1139, "", 16.25);
        let mockSource = new MockSpectrumExpressionDataSource([0, 1, 0, 1], ["A", "A", "B", "B"], ["Normal", "Normal", "Normal", "Normal"], spectra, 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0, 1], "diff(bulk(B),bulk(A))", "B-A", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["B-A", expected]]));
    });
/* TODO:
    it("as count/sec", () => 
    it("as count/PMC", () => */
});

describe("SpectrumExpressionParser - minOf() on bulk A vs bulk B", () =>
{
    let spectra = [
        new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 8),
        new SpectrumValues(new Float32Array([0, 40, 3000, 12, 250, 40, 0, 0]), 3000, "A", 9),
        // Bulk A:                         0, 60, 7000, 22, 550, 90, 0, 0               17
        new SpectrumValues(new Float32Array([0, 30, 3500, 11, 240, 30, 10, 0]), 3500, "B", 7),
        new SpectrumValues(new Float32Array([0, 20, 1000, 1150, 100, 200, 0, 0]), 1150, "B", 8.5),
        // Bulk B:                         0, 50, 4500, 1161, 340, 230, 10, 0           15.5
    ];

    it("no normalization", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([0, 50, 4500, 22, 340, 90, 0, 0]), 4500, "", 16.25);
        let mockSource = new MockSpectrumExpressionDataSource([0, 1, 0, 1], ["A", "A", "B", "B"], ["Normal", "Normal", "Normal", "Normal"], spectra, 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0, 1], "minOf(bulk(A),bulk(B))", "min A,B", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["min A,B", expected]]));
    });

/* TODO:
    it("as count/min", () => 
    it("as count/PMC", () => */
});

describe("SpectrumExpressionParser - maxOf() on bulk A vs bulk B", () =>
{
    let spectra = [
        new SpectrumValues(new Float32Array([0, 20, 4000, 10, 300, 50, 0, 0]), 4000, "A", 8),
        new SpectrumValues(new Float32Array([0, 40, 3000, 12, 250, 40, 0, 0]), 3000, "A", 9),
        // Bulk A:                         0, 60, 7000, 22, 550, 90, 0, 0               17
        new SpectrumValues(new Float32Array([0, 30, 3500, 11, 240, 30, 10, 0]), 3500, "B", 7),
        new SpectrumValues(new Float32Array([0, 20, 1000, 1150, 100, 200, 0, 0]), 1150, "B", 8.5),
        // Bulk B:                         0, 50, 4500, 1161, 340, 230, 10, 0           15.5
    ];

    it("no normalization", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([0, 60, 7000, 1161, 550, 230, 10, 0]), 7000, "", 16.25);
        let mockSource = new MockSpectrumExpressionDataSource([0, 1, 0, 1], ["A", "A", "B", "B"], ["Normal", "Normal", "Normal", "Normal"], spectra, 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0, 1], "maxOf(bulk(A),bulk(B))", "min A,B", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["min A,B", expected]]));
    });

/* TODO:
    it("as count/min", () => 
    it("as count/PMC", () => */
});

describe("SpectrumExpressionParser - removeDiffraction() on bulk A vs bulk B", () =>
{
    let A = new SpectrumValues(new Float32Array([4, 30, 4200, 20, 250, 40, 0, 0]), 4200, "A", 9.5);
    let B = new SpectrumValues(new Float32Array([1, 10, 30, 10, 350, 20, 0, 0]), 350, "B", 3);

    it("A->B", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([4, 10, 30, 10, 250, 20, 0, 0]), 250, "A", 9.5);
        let mockSource = new MockSpectrumExpressionDataSource([0, 0], ["A", "B"], ["Normal", "Normal"], [A, B], 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0], "removeDiffraction(bulk(A),bulk(B))", "A without diffraction", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["A without diffraction", expected]]));
    });

    it("B->A", () => 
    {
        // NOTE: expected not to have a detector because this sums A and B so has nothing to put in its place
        let expected = new SpectrumValues(new Float32Array([1, 10, 30, 10, 250, 20, 0, 0]), 250, "B", 3);
        let mockSource = new MockSpectrumExpressionDataSource([0, 0], ["A", "B"], ["Normal", "Normal"], [A, B], 4, null);
        let parser = new SpectrumExpressionParser();
        let result = parser.getSpectrumValues(mockSource, [0], "removeDiffraction(bulk(B),bulk(A))", "B without diffraction", "Normal", false, false);

        expect(result).toEqual(new Map<string, SpectrumValues>([["B without diffraction", expected]]));
    });

/* TODO:
    it("as count/min", () => 
    it("as count/PMC", () => */
});