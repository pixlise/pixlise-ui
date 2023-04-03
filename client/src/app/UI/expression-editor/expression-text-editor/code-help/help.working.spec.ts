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
//   Laboratory, nor the names of its contributors may be used to endorse orDataExpressionId.
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

//import { TestBed } from "@angular/core/testing";
import { rfindFunctionNameAndParams, NameAndParamResult } from "./help";

describe("rfindFunctionNameAndParams", () => 
{
    it("finds func and params for complete", () => 
    {
        expect(rfindFunctionNameAndParams("element(")).toEqual(new NameAndParamResult("element", [], ""));
        expect(rfindFunctionNameAndParams("element(12,")).toEqual(new NameAndParamResult("element", ["12"], ""));
        expect(rfindFunctionNameAndParams("element(12, ")).toEqual(new NameAndParamResult("element", ["12"], ""));
        expect(rfindFunctionNameAndParams("element(12, 45, \"something\", ")).toEqual(new NameAndParamResult("element", ["12", "45", "something"], ""));
        expect(rfindFunctionNameAndParams("element(12, \"something(a, b)\", ")).toEqual(new NameAndParamResult("element", ["12", "something(a, b)"], ""));
        expect(rfindFunctionNameAndParams("element((12 + 45), \"something\", ")).toEqual(new NameAndParamResult("element", ["(12 + 45)", "something"], ""));
        expect(rfindFunctionNameAndParams("element(add(12, 45), \"something\", ")).toEqual(new NameAndParamResult("element", ["add(12, 45)", "something"], ""));
        expect(rfindFunctionNameAndParams("element(\"param1\", add(12, 45),")).toEqual(new NameAndParamResult("element", ["param1", "add(12, 45)"], ""));
        expect(rfindFunctionNameAndParams("s = data(\"Fe\", \"%\", \"A\")  element(\"CaO\", \"%\",")).toEqual(new NameAndParamResult("element", ["CaO", "%"], ""));
    });
});

describe("rfindFunctionNameAndParams", () => 
{
    it("finds func and params for incomplete", () => 
    {
        expect(rfindFunctionNameAndParams("element(17")).toEqual(new NameAndParamResult("element", [], "17"));
        expect(rfindFunctionNameAndParams("element(12,4.")).toEqual(new NameAndParamResult("element", ["12"], "4."));
        expect(rfindFunctionNameAndParams("element(12, 4.")).toEqual(new NameAndParamResult("element", ["12"], "4."));
        expect(rfindFunctionNameAndParams("element(12, 45,\"")).toEqual(new NameAndParamResult("element", ["12", "45"], ""));
        expect(rfindFunctionNameAndParams("element(12, 45,\"")).toEqual(new NameAndParamResult("element", ["12", "45"], ""));
        expect(rfindFunctionNameAndParams("element(12, \"45\",\"")).toEqual(new NameAndParamResult("element", ["12", "45"], ""));
        expect(rfindFunctionNameAndParams("element(\"12\", 45,\"")).toEqual(new NameAndParamResult("element", ["12", "45"], ""));
        expect(rfindFunctionNameAndParams("element(12, 45,\"s")).toEqual(new NameAndParamResult("element", ["12", "45"], "s"));
        expect(rfindFunctionNameAndParams("element(12, 45,\"so")).toEqual(new NameAndParamResult("element", ["12", "45"], "so"));
        expect(rfindFunctionNameAndParams("s = data(\"Fe\", \"%\", \"A\")  element(\"CaO\", \"%\", \"Co")).toEqual(new NameAndParamResult("element", ["CaO", "%"], "Co"));

        // At this point, we can't know that something(a is a string within quotes, so we expect it to actually return the results for that
        expect(rfindFunctionNameAndParams("element(12, \"something(a,")).toEqual(new NameAndParamResult("", ["a"], ""));
    });
});