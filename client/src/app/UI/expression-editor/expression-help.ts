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
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { Experiment } from "src/app/protolibs/experiment_pb";


//import { DataExpression } from 'src/app/services/data-expression.service';


export class LabelElement
{
    // IDs for specific menus that we made, so we know what the user is clicking on
    // Otherwise we just assume it's a text/parameter replacement
    public static readonly idRoot = "idRoot";
    public static readonly idElements = "idElements";
    public static readonly idFunctions = "idFunctions";
    public static readonly idElementFunction = "idElementFunction";
    public static readonly idSpecificFunction = "idSpecificFunction";
    public static readonly idOperators = "idOperators";
    public static readonly idNumericValues = "idNumericValues";
    public static readonly idParameterOption = "idParameterOption";
    public static readonly idOperator = "idOperator";

    constructor(
        public cssClass: string,
        public txt: string,
        public actionId: string // what to do if clicked on
    )
    {
    }
}

export class Suggestion
{
    constructor(
        public labelElements: LabelElement[],
        public description: string,
        public positionInfo: FunctionParameterPosition
    )
    {
    }
}

export class CursorSuggestions
{
    constructor(
        public heading: string,
        public options: Suggestion[],
        public parentId: string // what to jump to if menu escape button clicked
    )
    {
    }
}

class FunctionHelp
{
    constructor(
        public name: string,
        public paramNames: string[],
        public description: string,
        public params: string[]
    )
    {
    }
}

// When parsing an expression, this contains the locations of a function parameter
// for example:
// element( "Cl" , "%")
// Would find 2 of these, "Cl" lineNumber=whatever, startIdx=8, length=6 (so it goes from the index after "(" to index of ",")
export class FunctionParameterPosition
{
    constructor(
        public value: string,
        public lineNumber: number,
        public startIdx: number,
        public startIdxOnLine: number,
        public length: number
    )
    {
    }
}

export class EnclosingFunctionPosition
{
    constructor(
        public functionName: string,
        public funcNameStartIdx: number,
        public funcNameEndIdx: number,
        public paramIdxAt: number,
        public parameters: FunctionParameterPosition[]
    )
    {
    }
}

const operatorList = ["+", "-", "*", "/"];

const funcDescriptionList = [
    new FunctionHelp(
        "element",
        ["Symbol", "Column", "Detector"],
        "Reads element, for data type (%, int, err, etc) and detector",
        ["elements", "element-columns", "quant-detectors"]
    ),
    new FunctionHelp(
        "elementSum",
        ["Column", "Detector"],
        "Returns the sum of all quantified elements for data type (%, int, err, etc) and detector",
        ["element-columns", "quant-detectors"]
    ),
    new FunctionHelp(
        "data",
        ["Column", "Detector"],
        "Reads a map data column, eg chisq",
        ["quant-columns", "quant-detectors"]
    ),
    new FunctionHelp(
        "spectrum",
        ["StartChannel", "EndChannel", "Detector"],
        "Forms a map from sum of spectrum counts within the specified channel range and detector",
        ["number", "number", "spectrum-detectors"]
    ),
    new FunctionHelp(
        "spectrumDiff",
        ["StartChannel", "EndChannel", "Mode"],
        "Forms a map from differences between channel A and B within the specified channel range. Mode must be \"sum\" or \"max\"",
        ["number", "number", "spectrum-diff-mode"]
    ),
    new FunctionHelp(
        "pseudo",
        ["PseudoElement"],
        "Reads pseudo-intensities for given element",
        ["pseudo-elements"]
    ),
    new FunctionHelp(
        "housekeeping",
        ["ColumnName"],
        "Reads the named house-keeping values",
        ["housekeeping-columns"]
    ),
    new FunctionHelp(
        "position",
        ["Axis"],
        "Reads the x, y or z position values for each PMC",
        ["axis"]
    ),
    new FunctionHelp(
        "diffractionPeaks",
        ["MinChannelNum", "MaxChannelNum"],
        "Reads number of diffraction peaks detected for each PMC",
        ["number", "number"]
    ),
    new FunctionHelp(
        "roughness",
        [],
        "Reads roughness data for each PMC",
        []
    ),
    new FunctionHelp(
        "over",
        ["Map", "Scalar"],
        "Map containing 1 where input map > Scalar, else 0",
        ["map", "number"]
    ),
    new FunctionHelp(
        "under",
        ["Map", "Scalar"],
        "Map containing 1 where input map < Scalar, else 0",
        ["map", "number"]
    ),
    new FunctionHelp(
        "threshold",
        ["Map", "Ref", "Threshold"],
        "Map containing 1 where input map value in range [Ref +/- T], else 0",
        ["map", "number", "number"]
    ),
    new FunctionHelp(
        "normalize",
        ["Map"],
        "Map of values [0-1] where 0=min of input map, 1=max",
        ["map"]
    ),
    new FunctionHelp(
        "min",
        ["Map", "Map"],
        "Map containing the min of 2 input maps",
        ["map", "map"]
    ),
    new FunctionHelp(
        "max",
        ["Map", "Map"],
        "Map containing the min of 2 input maps",
        ["map", "map"]
    ),
    new FunctionHelp(
        "avg",
        ["Map", "Map"],
        "Map containing average of 2 input maps",
        ["map", "map"]
    ),
    new FunctionHelp(
        "pow",
        ["Base", "Exponent"],
        "Raise base to the power of exponent",
        ["map|number", "number"]
    )
];

export class ExpressionHelp
{
    constructor()
    {
    }

    getExpressionHelp(exprStr: string, cursorLine: number, cursorIdxOnLine: number, dataset: DataSet, quant: QuantificationLayer): CursorSuggestions
    {
        let lines = exprStr.split("\n");
        let lineStartIdx = ExpressionHelp.getIndexInExpression(cursorLine, cursorIdxOnLine, lines)-cursorIdxOnLine;

        if(cursorLine < 0 || cursorLine >= lines.length)
        {
            console.warn("Expression help: invalid cursor line "+cursorLine);
            return null;
        }

        let exprLine = lines[cursorLine];

        let enclosingFunc = this.getEnclosingFunctionPosition(exprLine, cursorIdxOnLine, cursorLine, lineStartIdx);
        //console.log('Enclosing expr: '+JSON.stringify(enclosingFunc));

        // if no expression or we're at the end of an expression, show the root suggestions
        if(exprLine.length <= 0 || (enclosingFunc==null && cursorIdxOnLine >= exprLine.length))
        {
            return this.makeRootSuggestions();
        }

        if(cursorIdxOnLine >= 0 && cursorIdxOnLine < exprLine.length && this.isOperator(exprLine[cursorIdxOnLine]))
        {
            // It's an operator...
            return this.makeOperatorSuggestions(new FunctionParameterPosition(exprLine[cursorIdxOnLine], cursorLine, lineStartIdx+cursorIdxOnLine, cursorIdxOnLine, 1));
        }

        if(enclosingFunc == null)
        {
            return null;
        }

        return this.makeFunctionSuggestions(enclosingFunc, exprLine, dataset, quant);
    }

    getHelpMenu(menuId: string, quant: QuantificationLayer): CursorSuggestions
    {
        if(menuId == LabelElement.idFunctions)
        {
            return this.makeFunctionList();
        }
        else if(menuId == LabelElement.idElements)
        {
            // Suggesting elements, this adds an entire element() call, different from makeElementSuggestions()
            // which is allowing a choice of elements as parameters of an element() call
            return this.makeElementFunctionSuggestions(quant);
        }
        else if(menuId == LabelElement.idOperators)
        {
            return this.makeOperatorSuggestions(null);
        }
        else if(menuId == LabelElement.idNumericValues)
        {
            return this.makeNumberSuggestions();
        }
        //else if(menuId == LabelElement.idRoot)
        return this.makeRootSuggestions();
    }

    public static getIndexInExpression(line: number, charOnLine: number, expressionLines: string[]): number
    {
        let exprIdx = 0;
        for(let c = 0; c < line; c++)
        {
            exprIdx += expressionLines[c].length+1;
        }

        exprIdx += charOnLine;
        return exprIdx;
    }

    private isOperator(str: string): boolean
    {
        return (str == "+" || str == "-" || str == "*" || str == "/");
    }

    private isWhitespace(str: string): boolean
    {
        return (str == "\t" || str == " ");
    }

    private getEnclosingFunctionPosition(exprLine: string, idx: number, lineNumber: number, lineStartIdx: number): EnclosingFunctionPosition
    {
        // Check idx is valid
        if(idx < 0 || idx > exprLine.length)
        {
            return null;
        }

        // Search left:
        // * If we're AT a ), we're within a function, last param, let it search
        // * If we find a ) to the left of our position, we're past a function name, so nothing to return
        // * If no ) on our left, find the ( and it's the alnum chars before it
        // We also count brackets for later...
        let openBracketIdx = -1;
        let closeBracketIdx = -1;
        let commaCount = 0;
        for(let c = idx; c > 0; c--)
        {
            if(exprLine[c] == ")" && c < idx)
            {
                closeBracketIdx = c;
                break;
            }

            if(exprLine[c] == ",")
            {
                commaCount++;
            }

            if(exprLine[c] == "(")
            {
                openBracketIdx = c;
                break;
            }
        }

        // If we didn't find a (, we're not in the param list of the function so search forward, we might be at the
        // start of something
        if(openBracketIdx == -1)
        {
            // Definitely not within params...
            commaCount = -1;

            // Search right for a (, thereby maybe extracting name of function at least
            for(let c = idx; c < exprLine.length; c++)
            {
                if(exprLine[c] == "(")
                {
                    openBracketIdx = c;
                    break;
                }
            }
        }

        let funcNameStartIdx = -1;
        let funcNameEndIdx = -1;

        if(openBracketIdx > -1)
        {
            funcNameEndIdx = openBracketIdx;

            // If we did find a (, we're only in the param list if we're AFTER the (
            if(openBracketIdx == idx)
            {
                commaCount = -1;
            }
        }

        // If funcName has something in it, it's likely more than just the func name, it'd have leading stuff in it (like operators)
        // so here we find the first non-function-name char
        if(funcNameEndIdx > -1)
        {
            funcNameStartIdx = 0;
            for(let c = funcNameEndIdx-1; c > 0; c--)
            {
                let ch = exprLine.charAt(c);

                // Is it a letter?
                // https://stackoverflow.com/questions/9862761/how-to-check-if-character-is-a-letter-in-javascript
                //if(ch.toUpperCase() == ch.toLowerCase())
                let chLower = ch.toLowerCase();
                if((chLower < "a" || chLower > "z") && chLower != "_")
                {
                    // This is the first non-character, so set startIdx to be 1 up from here
                    // For example, we're at +data(
                    //                       ^
                    funcNameStartIdx = c+1;
                    break;
                }
            }

            // If idx is before the start of the function, we are not in an enclosing function!
            if(funcNameStartIdx > idx)
            {
                return null;
            }

            // Snip off any white space
            for(let c = funcNameStartIdx; c < funcNameEndIdx && exprLine[c] == " "; c++)
            {
                funcNameStartIdx++;
            }
            for(let c = funcNameEndIdx; c > funcNameStartIdx && exprLine[c] == " "; c--)
            {
                funcNameEndIdx--;
            }
        }

        if(funcNameStartIdx < 0 || funcNameEndIdx < 0)
        {
            return null;
        }

        let paramIdx = commaCount;
        // NOTE: if cursor is ON the comma, we want it to be the param before
        if(exprLine[idx] == "," && paramIdx > 0)
        {
            paramIdx--;
        }

        // Find the param locations/values
        let parameters: FunctionParameterPosition[] = [];

        let startPos = funcNameEndIdx+1;

        // Special case, if there is nothing after the function(, we're still at the parameter, so create a position indicating that
        if(paramIdx > -1 && startPos >= exprLine.length-1)
        {
            parameters.push(new FunctionParameterPosition("", lineNumber, lineStartIdx+startPos, startPos, exprLine.length-startPos));
        }
        else
        {
            for(let c = startPos; c < exprLine.length; c++)
            {
                let endToken = exprLine[c] == "," || exprLine[c] == ")";
                if(endToken || c == exprLine.length-1)
                {
                    if(!endToken && c == exprLine.length-1)
                    {
                        // make it cover 1 index past, so it includes the last char in the string
                        c++;
                    }

                    parameters.push(new FunctionParameterPosition(exprLine.substring(startPos, c).trim(), lineNumber, lineStartIdx+startPos, startPos, c-startPos));
                    startPos = c+1;
                }

                if(c < exprLine.length && exprLine[c] == ")")
                {
                    break;
                }
            }

            // If we're just after a , and end of string, throw in an empty param position
            if(idx == startPos && idx == exprLine.length && exprLine[idx-1] == ",")
            {
                parameters.push(new FunctionParameterPosition("", lineNumber, lineStartIdx+idx, idx, 0));
            }
        }

        let result = new EnclosingFunctionPosition(exprLine.substring(funcNameStartIdx, funcNameEndIdx), funcNameStartIdx, funcNameEndIdx, paramIdx, parameters);
        return result;
    }

    private makeRootSuggestions(): CursorSuggestions
    {
        let result = new CursorSuggestions("Options",
            [
                new Suggestion([new LabelElement("cm-element", "Elements", LabelElement.idElements)], null, null),
                new Suggestion([new LabelElement("cm-function", "Functions", LabelElement.idFunctions)], null, null),
                new Suggestion([new LabelElement("cm-operator", "Operators", LabelElement.idOperators)], null, null),
                new Suggestion([new LabelElement("cm-number", "Numeric Values", LabelElement.idNumericValues)], null, null),
            ],
            null
        );

        return result;
    }

    listFunctions(): string[]
    {
        let result: string[] = [];
        for(let f of funcDescriptionList)
        {
            result.push(f.name);
        }
        return result;
    }

    private makeFunctionList(): CursorSuggestions
    {
        let funcs: Suggestion[] = [];
        for(let f of funcDescriptionList)
        {
            funcs.push(this.makeFunctionSuggestion(f));
        }

        let result = new CursorSuggestions("Function List", funcs, LabelElement.idRoot);
        return result;
    }

    private makeFunctionSuggestion(f: FunctionHelp): Suggestion
    {
        // This shows the whole thing with multi-coloured brackets+description, eg:
        //
        //   element(Symbol, Column, Detector)
        //   <description>

        let labelBits = [
            new LabelElement("cm-function", f.name, LabelElement.idSpecificFunction),
            new LabelElement("cm-element", "(", null),
        ];

        for(let c = 0; c < f.paramNames.length; c++)
        {
            labelBits.push(new LabelElement("cm-string", f.paramNames[c], null));

            if(c < f.paramNames.length-1)
            {
                labelBits.push(new LabelElement("cm-element", ",", null));
            }
        }

        labelBits.push(new LabelElement("cm-element", ")", null));

        return new Suggestion(
            labelBits,
            f.description,
            null
        );
    }

    private makeFunctionSuggestions(pos: EnclosingFunctionPosition, expression: string, dataset: DataSet, quant: QuantificationLayer): CursorSuggestions
    {
        let result = new CursorSuggestions("Function Parameters", [], LabelElement.idRoot);

        let itemPos = null;
        if(pos.parameters && pos.paramIdxAt >= 0 && pos.paramIdxAt < pos.parameters.length)
        {
            itemPos = pos.parameters[pos.paramIdxAt];
        }

        for(let f of funcDescriptionList)
        {
            if(f.name.startsWith(pos.functionName))
            {
                if(pos.paramIdxAt >= 0 && pos.paramIdxAt < f.params.length)
                {
                    // Cursor is somewhere within params, try show a list of possible choices if we can
                    const paramType = f.params[pos.paramIdxAt];

                    if(paramType == "elements")
                    {
                        return this.makeElementSuggestions(quant, itemPos);
                    }
                    else if(paramType == "element-columns")
                    {
                        // Get the element (previous parameter), because this depends on that!
                        if(expression && pos.paramIdxAt > 0 && pos.paramIdxAt < pos.parameters.length)
                        {
                            let prevParam = pos.parameters[pos.paramIdxAt-1].value;
                            if(prevParam.length > 0)
                            {
                                // Snip off "
                                if(prevParam.length > 2)
                                {
                                    if(prevParam[0] == "\"")
                                    {
                                        prevParam = prevParam.substring(1);
                                    }
                                    if(prevParam[prevParam.length-1] == "\"")
                                    {
                                        prevParam = prevParam.substring(0, prevParam.length-1);
                                    }
                                }

                                return this.makeElementColumnSuggestions(prevParam, quant, itemPos);
                            }
                        }

                        return result;
                    }
                    else if(paramType == "quant-detectors")
                    {
                        return this.makeQuantDetectorSuggestions(quant, itemPos);
                    }
                    else if(paramType == "quant-columns")
                    {
                        return this.makeQuantColumnsSuggestions(quant, itemPos);
                    }
                    else if(paramType == "spectrum-detectors")
                    {
                        return this.makeSpectrumDetectorSuggestions(dataset, itemPos);
                    }
                    else if(paramType == "spectrum-diff-mode")
                    {
                        return this.makeSpectrumDetectorDiffModeSuggestions(dataset, itemPos);
                    }
                    else if(paramType == "pseudo-elements")
                    {
                        return this.makePseudointensitySuggestions(dataset, itemPos);
                    }
                    else if(paramType == "housekeeping-columns")
                    {
                        return this.makeHousekeepingSuggestions(dataset, itemPos);
                    }
                    else if(paramType == "axis")
                    {
                        return this.makeAxisSuggestions(dataset, itemPos);
                    }
                }
                else
                {
                    // Show general help for this function
                    let suggestion = this.makeFunctionSuggestion(f);
                    result.options.push(suggestion);
                }
            }
        }

        return result;
    }

    private makeOperatorSuggestions(posInfo: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Operators", [], LabelElement.idRoot);

        for(let o of operatorList)
        {
            result.options.push(
                new Suggestion(
                    [new LabelElement("cm-operator", o, LabelElement.idOperator)],
                    null,
                    posInfo,
                )
            );
        }
        return result;
    }

    private makeElementFunctionSuggestions(quant: QuantificationLayer): CursorSuggestions
    {
        let result = new CursorSuggestions("Elements", [], LabelElement.idRoot);

        if(quant)
        {
            for(let e of quant.getElementFormulae())
            {
                result.options.push(
                    new Suggestion(
                        [
                            new LabelElement(
                                "cm-element",
                                "\""+e+"\"",
                                LabelElement.idElementFunction
                            )
                        ],
                        null,
                        null,
                    )
                );
            }
        }
        return result;
    }

    private makeNumberSuggestions(): CursorSuggestions
    {
        let result = new CursorSuggestions("Numeric Values",
            [
                new Suggestion(
                    [
                        new LabelElement(
                            "opt-description",
                            "PIXLISE supports numbers, fractions and decimals in its expression language",
                            null
                        )
                    ],
                    null,
                    null,
                )
            ],
            LabelElement.idRoot
        );

        return result;
    }
    /*
    private makeStringSuggestions(): CursorSuggestions
    {
        let result = new CursorSuggestions("String Values",
            [
                new Suggestion(
                    [
                        new LabelElement(
                            "opt-description",
                            "What do we put here???",
                            null
                        )
                    ],
                    null,
                    null,
                )
            ],
            LabelElement.idRoot
        );

        return result;
    }
*/
    private makeElementSuggestions(quant: QuantificationLayer, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Element Parameters", [], null);

        if(quant)
        {
            let elems = quant.getElementFormulae();
            let elemsByZ = periodicTableDB.getElementsInAtomicNumberOrder(elems);

            for(let e of elemsByZ)
            {
                result.options.push(
                    new Suggestion(
                        [
                            new LabelElement(
                                "cm-element",
                                "\""+e+"\"",
                                LabelElement.idParameterOption
                            )
                        ],
                        null,
                        pos,
                    )
                );
            }
        }
        return result;
    }

    private makeElementColumnSuggestions(elemFormula: string, quant: QuantificationLayer, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Element Data Columns", [], null);

        if(quant)
        {
            let cols = quant.getElementColumns(elemFormula);
            if(cols.indexOf("%") >= 0 && cols.indexOf("%-as-mmol") < 0)
            {
                cols.push("%-as-mmol");
            }

            for(let e of cols)
            {
                result.options.push(
                    new Suggestion(
                        [
                            new LabelElement(
                                "cm-element",
                                "\""+e+"\"",
                                LabelElement.idParameterOption
                            )
                        ],
                        null,
                        pos,
                    )
                );
            }
        }
        return result;
    }

    private makeQuantDetectorSuggestions(quant: QuantificationLayer, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Quantification Detectors", [], null);

        if(quant)
        {
            for(let d of quant.getDetectors())
            {
                result.options.push(
                    new Suggestion(
                        [
                            new LabelElement(
                                "cm-element",
                                "\""+d+"\"",
                                LabelElement.idParameterOption
                            )
                        ],
                        null,
                        pos,
                    )
                );
            }
        }
        return result;
    }

    private makeQuantColumnsSuggestions(quant: QuantificationLayer, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Quantification Data Columns", [], null);

        if(quant)
        {
            for(let c of quant.getDataColumns())
            {
                result.options.push(
                    new Suggestion(
                        [
                            new LabelElement(
                                "cm-element",
                                "\""+c+"\"",
                                LabelElement.idParameterOption
                            )
                        ],
                        null,
                        pos,
                    )
                );
            }
        }
        return result;
    }

    private makeSpectrumDetectorSuggestions(dataset: DataSet, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Spectrum Detectors", [], LabelElement.idFunctions);

        if(dataset)
        {
            for(let d of dataset.detectorIds)
            {
                result.options.push(
                    new Suggestion(
                        [
                            new LabelElement(
                                "cm-string",
                                "\""+d+"\"",
                                LabelElement.idParameterOption
                            )
                        ],
                        null,
                        pos,
                    )
                );
            }
        }
        return result;
    }

    private makeSpectrumDetectorDiffModeSuggestions(dataset: DataSet, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Spectrum Detector Differences", [], LabelElement.idFunctions);

        if(dataset)
        {
            result.options.push(
                new Suggestion(
                    [
                        new LabelElement(
                            "cm-string",
                            "\"sum\"",
                            LabelElement.idParameterOption
                        )
                    ],
                    null,
                    pos,
                )
            );

            result.options.push(
                new Suggestion(
                    [
                        new LabelElement(
                            "cm-string",
                            "\"max\"",
                            LabelElement.idParameterOption
                        )
                    ],
                    null,
                    pos,
                )
            );
            for(let d of dataset.detectorIds)
            {
                
            }
        }
        return result;
    }

    private makeHousekeepingSuggestions(dataset: DataSet, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Housekeeping Fields", [], LabelElement.idFunctions);

        if(dataset)
        {
            let metaLabels = dataset.experiment.getMetaLabelsList();
            let metaTypes = dataset.experiment.getMetaTypesList();

            for(let c = 0; c < metaLabels.length; c++)
            {
                // #1068: Hiding LIVETIME for now as it's only here because of bulk+max MSA (on prod datasets), user should probably be
                // querying this from quant data anyway which has its own livetime column
                if(metaLabels[c] != "LIVETIME" && metaTypes[c] == Experiment.MetaDataType.MT_FLOAT || metaTypes[c] == Experiment.MetaDataType.MT_INT)
                {
                    result.options.push(
                        new Suggestion(
                            [
                                new LabelElement(
                                    "cm-element",
                                    "\""+metaLabels[c]+"\"",
                                    LabelElement.idParameterOption
                                )
                            ],
                            null,
                            pos,
                        )
                    );
                }
            }
        }
        return result;
    }

    private makeAxisSuggestions(dataset: DataSet, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Axes", [], LabelElement.idFunctions);

        let axes = ["x", "y", "z"];
        for(let axis of axes)
        {
            result.options.push(
                new Suggestion(
                    [
                        new LabelElement(
                            "cm-element",
                            "\""+axis+"\"",
                            LabelElement.idParameterOption
                        )
                    ],
                    null,
                    pos,
                )
            );
        }

        return result;
    }

    private makePseudointensitySuggestions(dataset: DataSet, pos: FunctionParameterPosition): CursorSuggestions
    {
        let result = new CursorSuggestions("Pseudo-Intensities", [], LabelElement.idFunctions);

        if(dataset)
        {
            for(let e of dataset.getPseudoIntensityElementsList())
            {
                result.options.push(
                    new Suggestion(
                        [
                            new LabelElement(
                                "cm-element",
                                "\""+e+"\"",
                                LabelElement.idParameterOption
                            )
                        ],
                        null,
                        pos,
                    )
                );
            }
        }
        return result;
    }
}
