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

import { DataSet } from "src/app/models/DataSet";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { Experiment } from "src/app/protolibs/experiment_pb";
import { EnclosingFunctionPosition, ExpressionHelp, FunctionParameterPosition, LabelElement, Suggestion } from "./expression-help";




const expSuggestionElement = new Suggestion([ new LabelElement("cm-element", "Elements", null) ], null, null);
const expSuggestionFunctions = new Suggestion([ new LabelElement("cm-function", "Functions", null) ], null, null);
const expSuggestionDataColumns = new Suggestion([ new LabelElement("cm-string", "\"Data Columns\"", null) ], null, null);
const expSuggestionOperators = new Suggestion([ new LabelElement("cm-operator", "Operators", null) ], null, null);
const expSuggestionNumericValues = new Suggestion([ new LabelElement("cm-number", "Numeric Values", null) ], null, null);

const mockQuant = {
    getElementFormulae(): string[]
    {
        return ["Ca", "Fe"];
    },

    getElementColumns(formulae: string): string[]
    {
        return ["%", "err"];
    },

    getDetectors(): string[]
    {
        return ["A", "B"];
    },

    getDataColumns(): string[]
    {
        return ["chisq"];
    }
} as QuantificationLayer;

const mockDataset = {
    experiment: {
        getMetaLabelsList(): string[]
        {
            return ["case_temp", "open_count"];
        },

        getMetaTypesList(): number[]
        {
            return [Experiment.MetaDataType.MT_FLOAT, Experiment.MetaDataType.MT_INT];
        }
    } as Experiment,
    detectorIds: ["A", "B"],
    getPseudoIntensityElementsList(): string[]
    {
        return ["Ti", "Si"];
    }
} as DataSet;


/*
describe('ExpressionHelp', () =>
{
    it('show root outside of function', () => {
        let help = new ExpressionHelp();
        let expRoot = new CursorSuggestions(
            'Options',
            [
                expSuggestionElement,
                expSuggestionFunctions,
                expSuggestionDataColumns,
                expSuggestionOperators,
                expSuggestionNumericValues
            ]
        );

        expect(help.getExpressionHelp("", 0, mockDataset, mockQuant)).toEqual(expRoot);
        expect(help.getExpressionHelp(" ", -1, mockDataset, mockQuant)).toEqual(expRoot);
        expect(help.getExpressionHelp(" ", 0, mockDataset, mockQuant)).toEqual(expRoot);
        expect(help.getExpressionHelp(" ", 1, mockDataset, mockQuant)).toEqual(expRoot);
        expect(help.getExpressionHelp(" ", 2, mockDataset, mockQuant)).toEqual(expRoot);
        expect(help.getExpressionHelp(" ", 0, mockDataset, mockQuant)).toEqual(expRoot);
        //expect(help.getExpressionHelp(' element("Fe", "%") ', 0, mockDataset, mockQuant)).toEqual(expRoot);
        //expect(help.getExpressionHelp(' element("Fe", "%") ', 1, mockDataset, mockQuant)).toEqual(expRoot);
    });
});
*/

let help = new ExpressionHelp();

describe("getEnclosingFunctionPosition", () =>
{
    it("works for empty string", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("", 0, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"]("", -1, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"]("", 1, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"](" ", -1, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"](" ", 0, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"](" ", 1, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"](" ", 2, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"]("  ", -1, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"]("  ", 0, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"]("  ", 1, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"]("  ", 2, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"]("  ", 3, 0, 0)).toEqual(null);
    });

    it("Invalid index into valid string", () => 
    {
        expect(help["getEnclosingFunctionPosition"](" element(\"Fe\", \"%\")", -1, 0, 0)).toEqual(null);
        expect(help["getEnclosingFunctionPosition"](" element(\"Fe\", \"%\")", 90, 0, 0)).toEqual(null);

        // Removed, doesn't fail, line number is only passed as annotation and this func doesn't dismantle the string passed, assumes 1 line only!
        //expect(help['getEnclosingFunctionPosition'](' element("Fe", "%")', 10, 5, 14)).toEqual(null);
    });

    it("Finding it with whitespace before", () => 
    {
        expect(help["getEnclosingFunctionPosition"](" element(\"Fe\", \"%\")", 0, 0, 0)).toEqual(
            new EnclosingFunctionPosition("element", 1, 8, -1,
                [
                    new FunctionParameterPosition("\"Fe\"", 0, 9, 9, 4),
                    new FunctionParameterPosition("\"%\"", 0, 14, 14, 4),
                ]
            ));
    });

    const expr = "1+element(\"Fe\", \"%\")*12+data(\"chisq\")/2";

    let expElemParams = [
        new FunctionParameterPosition("\"Fe\"", 0, 10, 10, 4),
        new FunctionParameterPosition("\"%\"", 0, 15, 15, 4),
    ];

    let expDataParams = [
        new FunctionParameterPosition("\"chisq\"", 0, 29, 29, 7),
    ];

    for(let c = 0; c < expr.length; c++)
    {
        let expResult = null;

        if(c >= 2 && c <= 9)
        {
            expResult = new EnclosingFunctionPosition("element", 2, 9, -1, expElemParams);
        }

        // After element, we expect it to see it's in the first parameter:
        if(c > 9 && c <= 14)
        {
            expResult = new EnclosingFunctionPosition("element", 2, 9, 0, expElemParams);
        }

        // second parameter
        if(c > 14 && c <= 19)
        {
            expResult = new EnclosingFunctionPosition("element", 2, 9, 1, expElemParams);
        }

        // data call
        if(c >= 24 && c <= 28)
        {
            expResult = new EnclosingFunctionPosition("data", 24, 28, -1, expDataParams);
        }

        // data call first parameter
        if(c > 28 && c <= 36)
        {
            expResult = new EnclosingFunctionPosition("data", 24, 28, 0, expDataParams);
        }

        let exprWithPosShown = expr.slice(0, c)+">"+expr[c]+"<"+expr.slice(c+1);

        // help='+expResult.functionName+', param='+expResult.paramIdxAt
        it("Shows expected help "+" at char: "+c+" ("+expr[c]+") in expr: "+exprWithPosShown, () => 
        {
            expect(help["getEnclosingFunctionPosition"](expr, c, 0, 0)).toEqual(expResult);
        });
    }

    it("Finding it with whitespace around params", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("  element( \"Fe\" ,  \"%\" ) ", 4, 0, 0)).toEqual(
            new EnclosingFunctionPosition("element", 2, 9, -1,
                [
                    new FunctionParameterPosition("\"Fe\"", 0, 10, 10, 6),
                    new FunctionParameterPosition("\"%\"", 0, 17, 17, 6),
                ]
            ));
    });

    it("Finding with cursor on function still open", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("1+data(", 4, 0, 0)).toEqual(
            new EnclosingFunctionPosition("data", 2, 6, -1, [])
        );
    });

    it("Finding with cursor on function still open, cursor at end", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("1+data(", 7, 0, 0)).toEqual(
            new EnclosingFunctionPosition("data", 2, 6, 0, [
                new FunctionParameterPosition("", 0, 7, 7, 0),
            ]
            ));
    });

    it("Finding with cursor on function still open+space, cursor at end", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("1+data( ", 8, 0, 0)).toEqual(
            new EnclosingFunctionPosition("data", 2, 6, 0, [
                new FunctionParameterPosition("", 0, 7, 7, 1),
            ]
            ));
    });

    it("Finding with cursor after open function with param, cursor at start of param 1", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("1+data(\"chisq\",", 7, 0, 0)).toEqual(
            new EnclosingFunctionPosition("data", 2, 6, 0, [
                new FunctionParameterPosition("\"chisq\"", 0, 7, 7, 7),
            ]
            ));
    });

    it("Finding with cursor after open function with param, cursor at middle of param 1", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("1+data(\"chisq\",", 11, 0, 0)).toEqual(
            new EnclosingFunctionPosition("data", 2, 6, 0, [
                new FunctionParameterPosition("\"chisq\"", 0, 7, 7, 7),
            ]
            ));
    });

    it("Finding with cursor after open function with param, cursor at middle of param 1", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("1+data(\"chisq\"", 11, 0, 0)).toEqual(
            new EnclosingFunctionPosition("data", 2, 6, 0, [
                new FunctionParameterPosition("\"chisq\"", 0, 7, 7, 7),
            ]
            ));
    });

    it("Finding with cursor after open function with param, cursor at middle of param 1", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("1+data(\"chisq\" ", 11, 0, 0)).toEqual(
            new EnclosingFunctionPosition("data", 2, 6, 0, [
                new FunctionParameterPosition("\"chisq\"", 0, 7, 7, 8),
            ]
            ));
    });

    it("Cursor after a , in function params", () => 
    {
        expect(help["getEnclosingFunctionPosition"]("1+data(\"chisq\",", 15, 0, 0)).toEqual(
            new EnclosingFunctionPosition("data", 2, 6, 1, [
                new FunctionParameterPosition("\"chisq\"", 0, 7, 7, 7),
                new FunctionParameterPosition("", 0, 15, 15, 0),
            ]
            ));
    });
});
