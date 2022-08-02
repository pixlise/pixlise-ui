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

import { Quantification } from "src/app/protolibs/quantification_pb";
import {
    QuantificationLayer,
    QuantificationSummary
} from "./Quantifications";




class MockLocation
{
    constructor(public detector: string)
    {
    }

    getDetector(): string
    {
        return this.detector;
    }
}

class MockQuantification
{
    constructor(public labels: string[], public locations: MockLocation[])
    {
    }

    getLabelsList(): string[]
    {
        return this.labels;
    }

    getLocationsetList(): MockLocation[]
    {
        return this.locations;
    }
}

describe("quant layer column sorting", () =>
{
    it("should correctly store columns and lookups", () => 
    {
        let mockQuant = new MockQuantification(
            ["SiCO3_%", "SiCO3_int", "eVstart", "SiCO3_err", "Ca_%", "Ca_int", "Ca_err", "S_%", "S_int", "S_err", "chisq", "FeCO3_%", "FeCO3_int", "FeCO3_err"],
            [new MockLocation("A"), new MockLocation("B")]
        );

        let quantLayer = new QuantificationLayer(
            "id123",
            new QuantificationSummary(
                "id123",
                "complete",
                "message",
                1234567890,
                "path/file.bin",
                null,
                [],
                false,
                ["SiCO3", "Ca", "S", "FeCO3"],
                null
            ),
            (mockQuant as Quantification)
        );

        let expElementColumns = new Map<string, string[]>();
        expElementColumns.set("SiCO3", ["%", "int", "err"]);
        expElementColumns.set("Si", ["%"]);
        expElementColumns.set("Ca", ["%", "int", "err"]);
        expElementColumns.set("S", ["%", "int", "err"]);
        expElementColumns.set("FeCO3", ["%", "int", "err"]);
        expElementColumns.set("Fe", ["%"]);

        let expPureElementColumnLookup = new Map<string, string>();
        expPureElementColumnLookup.set("Si_%", "SiCO3_%");
        expPureElementColumnLookup.set("Fe_%", "FeCO3_%");

        expect(quantLayer.getDetectors()).toEqual(["A", "B"]);
        expect(quantLayer.getDataColumns()).toEqual(["eVstart", "chisq"]);
        expect(quantLayer.getElementFormulae()).toEqual(["SiCO3", "Si", "Ca", "S", "FeCO3", "Fe"]);
        expect(quantLayer.getElementColumns("SiCO3")).toEqual(["%", "int", "err"]);
        expect(quantLayer.getElementColumns("Si")).toEqual(["%"]);
        expect(quantLayer.getElementColumns("Ca")).toEqual(["%", "int", "err"]);
        expect(quantLayer.getElementColumns("S")).toEqual(["%", "int", "err"]);
        expect(quantLayer.getElementColumns("FeCO3")).toEqual(["%", "int", "err"]);
        expect(quantLayer.getElementColumns("Fe")).toEqual(["%"]);

        expect(quantLayer["_elementColumns"]).toEqual(expElementColumns);
        expect(quantLayer["_pureElementColumnLookup"]).toEqual(expPureElementColumnLookup);
    });
});
