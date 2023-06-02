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
import { SourceContextParser, NameAndParamResult } from "./help";


describe("SourceContextParser.stripCommentsAndFlatten", () => 
{
    it("strips comments", () => 
    {
        let p = new SourceContextParser("//");
        expect(p["stripCommentsAndFlatten"]("some\ntext// with lots of\n//comments included\n here")).toEqual("some text   here");
    });
});

describe("SourceContextParser.cleanParam", () => 
{
    it("cleans parameters", () => 
    {
        let p = new SourceContextParser("//");
        expect(p["cleanParam"](" value ")).toEqual("value");
        expect(p["cleanParam"](" \"str")).toEqual("\"str");
        expect(p["cleanParam"](" \"str\"")).toEqual("\"str\"");
        expect(p["cleanParam"](" \"str\" ")).toEqual("\"str\"");
        expect(p["cleanParam"](" str\" ")).toEqual("str\"");
        expect(p["cleanParam"](" str\"")).toEqual("str\"");
    });
});

describe("SourceContextParser.rfindFunctionNameAndParams", () => 
{
    it("finds func and params for complete", () => 
    {
        let p = new SourceContextParser("//");
        expect(p.rfindFunctionNameAndParams("element(")).toEqual(new NameAndParamResult("element", [], ""));
        expect(p.rfindFunctionNameAndParams("element(12,")).toEqual(new NameAndParamResult("element", ["12"], ""));
        expect(p.rfindFunctionNameAndParams("element(12, ")).toEqual(new NameAndParamResult("element", ["12"], ""));
        expect(p.rfindFunctionNameAndParams("element(12, 45, \"something\", ")).toEqual(new NameAndParamResult("element", ["12", "45", "\"something\""], ""));
        expect(p.rfindFunctionNameAndParams("element(12, \"something(a, b)\", ")).toEqual(new NameAndParamResult("element", ["12", "\"something(a, b)\""], ""));
        expect(p.rfindFunctionNameAndParams("element((12 + 45), \"something\", ")).toEqual(new NameAndParamResult("element", ["(12 + 45)", "\"something\""], ""));
        expect(p.rfindFunctionNameAndParams("element(add(12, 45), \"something\", ")).toEqual(new NameAndParamResult("element", ["add(12, 45)", "\"something\""], ""));
        expect(p.rfindFunctionNameAndParams("element(\"param1\", add(12, 45),")).toEqual(new NameAndParamResult("element", ["\"param1\"", "add(12, 45)"], ""));
        expect(p.rfindFunctionNameAndParams("s = data(\"Fe\", \"%\", \"A\")  element(\"CaO\", \"%\",")).toEqual(new NameAndParamResult("element", ["\"CaO\"", "\"%\""], ""));
        expect(p.rfindFunctionNameAndParams("s=data(\"Fe\", \"%\",")).toEqual(new NameAndParamResult("data", ["\"Fe\"", "\"%\""], ""));
        expect(p.rfindFunctionNameAndParams("s=2+data(\"Fe\", \"%\",")).toEqual(new NameAndParamResult("data", ["\"Fe\"", "\"%\""], ""));
        expect(p.rfindFunctionNameAndParams("s=2/data(\"Fe\", \"%\",")).toEqual(new NameAndParamResult("data", ["\"Fe\"", "\"%\""], ""));
        expect(p.rfindFunctionNameAndParams("s=2*data(\"Fe\", \"%\",")).toEqual(new NameAndParamResult("data", ["\"Fe\"", "\"%\""], ""));
        expect(p.rfindFunctionNameAndParams("s=2-data(\"Fe\", \"%\",")).toEqual(new NameAndParamResult("data", ["\"Fe\"", "\"%\""], ""));
        expect(p.rfindFunctionNameAndParams("s=2^data(\"Fe\", \"%\",")).toEqual(new NameAndParamResult("data", ["\"Fe\"", "\"%\""], ""));

        // NOTE: this fails to find a break... and we're ok with that for now
        expect(p.rfindFunctionNameAndParams("s=2#data(\"Fe\", \"%\",")).toEqual(new NameAndParamResult("2#data", ["\"Fe\"", "\"%\""], ""));
    });
});

describe("SourceContextParser.rfindFunctionNameAndParams", () => 
{
    it("finds func and params for incomplete", () => 
    {
        let p = new SourceContextParser("//");
        expect(p.rfindFunctionNameAndParams("element(17")).toEqual(new NameAndParamResult("element", [], "17"));
        expect(p.rfindFunctionNameAndParams("element(12,4.")).toEqual(new NameAndParamResult("element", ["12"], "4."));
        expect(p.rfindFunctionNameAndParams("element(12, 4.")).toEqual(new NameAndParamResult("element", ["12"], "4."));
        expect(p.rfindFunctionNameAndParams("element(12, 45,\"")).toEqual(new NameAndParamResult("element", ["12", "45"], "\""));
        expect(p.rfindFunctionNameAndParams("element(12, 45, \"")).toEqual(new NameAndParamResult("element", ["12", "45"], "\""));
        expect(p.rfindFunctionNameAndParams("element(12, \"45\",\"")).toEqual(new NameAndParamResult("element", ["12", "\"45\""], "\""));
        expect(p.rfindFunctionNameAndParams("element(\"12\", 45,\"")).toEqual(new NameAndParamResult("element", ["\"12\"", "45"], "\""));
        expect(p.rfindFunctionNameAndParams("element(12, 45,\t\"s")).toEqual(new NameAndParamResult("element", ["12", "45"], "\"s"));
        expect(p.rfindFunctionNameAndParams("element(12, 45, \"so")).toEqual(new NameAndParamResult("element", ["12", "45"], "\"so"));
        expect(p.rfindFunctionNameAndParams("s = data(\"Fe\", \"%\", \"A\")  element(\"CaO\", \"%\", \"Co")).toEqual(new NameAndParamResult("element", ["\"CaO\"", "\"%\""], "\"Co"));

        // At this point, we can't know that something(a is a string within quotes, so we expect it to actually return the results for that
        expect(p.rfindFunctionNameAndParams("element(12, \"something(a,")).toEqual(new NameAndParamResult("", ["a"], ""));
    });
});

describe("SourceContextParser.rfindFunctionNameAndParams", () => 
{
    it("handles cases where we're not at a function", () => 
    {
        let p = new SourceContextParser("//");
        expect(p.rfindFunctionNameAndParams("something(12, \"a string\") elem")).toEqual(new NameAndParamResult("", [], ""));
    });
});

describe("SourceContextParser.wordAtEnd", () => 
{
    it("works", () => 
    {
        let p = new SourceContextParser("//");
        expect(p.wordAtEnd("something(12, \"a string\")\nelem")).toEqual("elem");
        expect(p.wordAtEnd("something(12, \"a string\")\n_something12")).toEqual("_something12");
        expect(p.wordAtEnd("something(12, \"a string\")\n_12")).toEqual("_12");

        expect(p.wordAtEnd("something(12, \"a string\")\n12")).toEqual("");

        expect(p.wordAtEnd("\"something\"\nelem")).toEqual("elem");
        expect(p.wordAtEnd("\"something\"\telem")).toEqual("elem");
        expect(p.wordAtEnd("something \"elem")).toEqual("");
        expect(p.wordAtEnd("something\"")).toEqual("");
    });
});

describe("SourceContextParser.rfindModuleName", () => 
{
    it("handles cases where we're not at a function", () => 
    {
        let p = new SourceContextParser("//");
        expect(p.rfindModuleName("local v = Map.")).toEqual("Map");
        expect(p.rfindModuleName("local v = Map.add(Fe, Const.")).toEqual("Const");
    });
});
