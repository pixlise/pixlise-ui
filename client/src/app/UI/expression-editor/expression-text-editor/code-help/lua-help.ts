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

import { PIXLANGHelp } from "./pixlang-help";
import { SourceHelp, FunctionHelp, FunctionParamHelp } from "./help";
import { InterpreterDataSource } from "src/app/expression-language/interpreter-data-source";


export class LUAHelp extends SourceHelp
{
    constructor()
    {
        super("--");

        this._keywords = ["and", "break", "do", "else", "elseif", "end", "false", "for",
            "function", "if", "in", "local", "nil", "not", "or", "repeat",
            "return", "then", "true", "until", "while", "goto"
        ];

        // These are shared between the 2 languages, same syntax, etc
        PIXLANGHelp.makeDataFunctionHelp(this);

        // This is more similar to what's in PIXLANGHelp.makeDataFunctionHelp but new to Lua only
        this.addHelp(
            new FunctionHelp("exists", "", "Checks if a given column exists in the given data type. For example: exists(\"element\", \"CaO\")", "", [
                new FunctionParamHelp("DataType", "The data type we're checking", InterpreterDataSource.validExistsDataTypes), 
                new FunctionParamHelp("Column", "The column to check, depends on DataType passed")
            ])
        );

        // These are local help items that we have stick around, not part of modules, so shouldn't be cleared later
        this.loadBuiltinHelp();
    }

    private loadBuiltinHelp(): void
    {
        // Lua global functions
        const OriginID = "";
        this.addHelp(
            new FunctionHelp("print", "", "Print a string or value to the Logs view", OriginID, 
                [new FunctionParamHelp("message", "The message to print")])
        );

        this.addHelp(
            new FunctionHelp("next", "", "Returns the next key and value in a table", OriginID,
                [new FunctionParamHelp("table", "The table to iterate over"), new FunctionParamHelp("index", "The index to start from")])
        );

        this.addHelp(
            new FunctionHelp("tostring", "", "Converts a value to a string", OriginID,
                [new FunctionParamHelp("value", "The value to convert")])
        );

        this.addHelp(
            new FunctionHelp("tonumber", "", "Converts a value to a number. Returns nil if it can't be converted", OriginID,
                [new FunctionParamHelp("value", "The value to convert")])
        );

        this.addHelp(
            new FunctionHelp("type", "", "Returns the type of a value", OriginID,
                [new FunctionParamHelp("value", "The value to check")])
        );

        this.addHelp(
            new FunctionHelp("pairs", "", "Returns an iterator function that iterates over all key-value pairs in a table", OriginID,
                [new FunctionParamHelp("table", "The table to iterate over")])
        );

        this.addHelp(
            new FunctionHelp("assert", "", "Checks if a value is true, and if not, throws an error", OriginID,
                [new FunctionParamHelp("value", "The value to check"), new FunctionParamHelp("message", "The error message to throw")])
        );

        this.addHelp(
            new FunctionHelp("error", "", "Throws an error", OriginID,
                [new FunctionParamHelp("message", "The error message to throw")])
        );

        this.addHelp(
            new FunctionHelp("ipairs", "", "Returns an iterator function that iterates over all key-value pairs in a table", OriginID,
                [new FunctionParamHelp("table", "The table to iterate over")])
        );

        this.addHelp(
            new FunctionHelp("select", "", "Returns the value at the given index in the given table", OriginID,
                [new FunctionParamHelp("index", "The index to get"), new FunctionParamHelp("table", "The table to get from")])
        );

        // Lua math lib

        const mathHelp = [
            ["abs", "Returns the absolute value of x."],
            ["acos", "Returns the arc cosine of x (in radians)."],
            ["asin", "Returns the arc cosine of x (in radians)."],
            ["atan", "Returns the arc cosine of x (in radians)."],
            ["ceil", "Returns the smallest integer larger than or equal to x."],
            ["cos", "Returns the cosine of x (assumed to be in radians)."],
            ["cosh", "Returns the hyperbolic cosine of x."],
            ["deg", "Returns the angle x (given in radians) in degrees."],
            ["exp", "Returns the value e power x."],
            ["floor", "Returns the largest integer smaller than or equal to x."],
            ["frexp", "Returns m and e such that x = m2e, e is an integer and the absolute value of m is in the range [0.5, 1) (or zero when x is zero)."],
            ["log", "Returns the natural logarithm of x."],
            ["log10", "Returns the base-10 logarithm of x."],
            ["modf", "Returns two numbers, the integral part of x and the fractional part of x."],
            ["rad", "Returns the angle x (given in degrees) in radians."],
            ["randomseed", "Sets x as the \"seed\" for the pseudo-random generator: equal seeds produce equal sequences of numbers."],
            ["sin", "Returns the sine of x (assumed to be in radians)."],
            ["sinh", "Returns the hyperbolic sine of x."],
            ["sqrt", "Returns the square root of x. (You can also use the expression x^0.5 to compute this value.)"],
            ["tan", "Returns the tangent of x (assumed to be in radians)."],
            ["tanh", "Returns the hyperbolic tangent of x."],
        ];

        for(let item of mathHelp)
        {
            this.addHelp(
                new FunctionHelp(item[0], "math", item[1], OriginID,
                    [new FunctionParamHelp("x", "Numerical value")]
                )
            );
        }

        this.addHelp(
            new FunctionHelp("atan2", "math", "Returns the arc tangent of y/x (in radians), but uses the signs of both parameters to find the quadrant of the result. (It also handles correctly the case of x being zero.)", OriginID,
                [new FunctionParamHelp("y", "Numerical value"), new FunctionParamHelp("x", "Numerical value")]
            )
        );

        this.addHelp(
            new FunctionHelp("fmod", "math", "Returns the remainder of the division of x by y that rounds the quotient towards zero.", OriginID,
                [new FunctionParamHelp("x", "Numerical value"), new FunctionParamHelp("y", "Numerical value")]
            )
        );

        this.addHelp(
            new FunctionHelp("ldexp", "math", "Returns m2e (e should be an integer).", OriginID,
                [new FunctionParamHelp("m", "Numerical value"), new FunctionParamHelp("e", "Numerical value")]
            )
        );

        this.addHelp(
            new FunctionHelp("fmod", "math", "Returns the remainder of the division of x by y that rounds the quotient towards zero.", OriginID,
                [new FunctionParamHelp("x", "Numerical value"), new FunctionParamHelp("y", "Numerical value")]
            )
        );

        this.addHelp(
            new FunctionHelp("pow", "math", "Returns x to the power of y. (You can also use the expression x^y to compute this value.)", OriginID,
                [new FunctionParamHelp("x", "Numerical value"), new FunctionParamHelp("y", "Numerical value")]
            )
        );

        this.addHelp(
            new FunctionHelp("max", "math", "Returns the maximum value among its arguments.", OriginID,
                [new FunctionParamHelp("x", "Numerical value"), new FunctionParamHelp("...", "Any number of other numerical values")]
            )
        );

        this.addHelp(
            new FunctionHelp("min", "math", "Returns the minimum value among its arguments.", OriginID,
                [new FunctionParamHelp("x", "Numerical value"), new FunctionParamHelp("...", "Any number of other numerical values")]
            )
        );

        this.addHelp(
            new FunctionHelp("random", "math", "This function is an interface to the simple pseudo-random generator function rand provided by ANSI C.When called without arguments, returns a uniform pseudo-random real number in the range [0,1). When called with an integer number m, math.random returns a uniform pseudo-random integer in the range [1, m]. When called with two integer numbers m and n, math.random returns a uniform pseudo-random integer in the range [m, n].", OriginID,
                [new FunctionParamHelp("[m [, n]]", "Optional parameters")]
            )
        );

        this.addConstHelp("math", new Map<string, string>([
            ["huge", "The value HUGE_VAL, a value larger than or equal to any other numerical value."],
            ["pi", "The value of pi."],
        ]));

        // Lua string lib
        this.addHelp(
            new FunctionHelp("upper", "string", "Returns a upper case representation of the argument.", OriginID,
                [new FunctionParamHelp("s", "String")]
            )
        );
        this.addHelp(
            new FunctionHelp("lower", "string", "Returns a lower case representation of the argument.", OriginID,
                [new FunctionParamHelp("s", "String")]
            )
        );
        this.addHelp(
            new FunctionHelp("reverse", "string", "Returns a string by reversing the characters of the passed string.", OriginID,
                [new FunctionParamHelp("s", "String")]
            )
        );
        this.addHelp(
            new FunctionHelp("len", "string", "Returns the length of the passed string.", OriginID,
                [new FunctionParamHelp("s", "String")]
            )
        );
        this.addHelp(
            new FunctionHelp("find", "string", "Returns the start index and end index of the findString in the main string and nil if not found.", OriginID,
                [
                    new FunctionParamHelp("mainString", "String"),
                    new FunctionParamHelp("findString", "String"),
                    new FunctionParamHelp("optionalStartIndex", "Number"),
                    new FunctionParamHelp("optionalEndIndex", "Number")
                ]
            )
        );
        this.addHelp(
            new FunctionHelp("gsub", "string", "Returns a string by replacing occurrences of findString with replaceString.", OriginID,
                [
                    new FunctionParamHelp("mainString", "String"),
                    new FunctionParamHelp("findString", "String"),
                    new FunctionParamHelp("replaceString", "String")
                ]
            )
        );
        this.addHelp(
            new FunctionHelp("format", "string", "Returns a formatted string.", OriginID,
                [
                    new FunctionParamHelp("...", "Variable parameters")
                ]
            )
        );
        this.addHelp(
            new FunctionHelp("char", "string", "Returns internal character representations of input argument.", OriginID,
                [new FunctionParamHelp("arg", "String")]
            )
        );
        this.addHelp(
            new FunctionHelp("byte", "string", "Returns internal numeric representations of input argument.", OriginID,
                [new FunctionParamHelp("arg", "String")]
            )
        );
        this.addHelp(
            new FunctionHelp("rep", "string", "Returns a string by repeating the same string n number times.", OriginID,
                [new FunctionParamHelp("arg", "String to repeat"), new FunctionParamHelp("n", "Number of times")]
            )
        );

        // Lua table lib
        this.addHelp(
            new FunctionHelp("maxn", "table", "Returns the largest positive numerical index of the given table, or zero if the table has no positive numerical indices. (To do its job this function does a linear traversal of the whole table.)", OriginID,
                [new FunctionParamHelp("arg", "Table to check")]
            )
        );
        this.addHelp(
            new FunctionHelp("sort", "table", "Sorts table elements in a given order, in-place, from table[1] to table[n], where n is the length of the table. If comp is given, then it must be a function that receives two table elements, and returns true when the first is less than the second (so that not comp(a[i+1],a[i]) will be true after the sort). If comp is not given, then the standard Lua operator < is used instead. The sort algorithm is not stable; that is, elements considered equal by the given order may have their relative positions changed by the sort.", OriginID,
                [new FunctionParamHelp("arg", "Table to sort"), new FunctionParamHelp("comp", "Comparator function (optional)")]
            )
        );
        this.addHelp(
            new FunctionHelp("remove", "table", "Removes from table the element at position pos, shifting down other elements to close the space, if necessary. Returns the value of the removed element. The default value for pos is n, where n is the length of the table, so that a call table.remove(t) removes the last element of table t.", OriginID,
                [new FunctionParamHelp("arg", "Table to remove from"), new FunctionParamHelp("pos", "Removal index (optional)")]
            )
        );
        this.addHelp(
            new FunctionHelp("insert", "table", "Inserts element value at position pos in table, shifting up other elements to open space, if necessary. The default value for pos is n+1, where n is the length of the table. So calling insert(t, v) inserts v at the end of the table t.", OriginID,
                [new FunctionParamHelp("arg", "Table to insert into"), new FunctionParamHelp("pos", "Insertion index (optional)"), new FunctionParamHelp("val", "Value to insert")]
            )
        );
        this.addHelp(
            new FunctionHelp("concat", "table", "Given an array where all elements are strings or numbers, returns table[i]..sep..table[i+1] ··· sep..table[j]. The default value for sep is the empty string, the default for i is 1, and the default for j is the length of the table. If i is greater than j, returns the empty string.", OriginID,
                [new FunctionParamHelp("arg", "Table to insert into"), new FunctionParamHelp("[, sep [, i [, j]]]", "Optional separators, indexes")]
            )
        );
    }

    buildHelpForSource(originID: string, sourceCode: string): void
    {
        // Clear any that we have
        this.clearHelp(originID);

        // Form new help
        let help = this.makeHelpForSource(originID, sourceCode);

        for(let h of help)
        {
            this.addHelp(h);
        }
    }

    private makeHelpForSource(originID: string, sourceCode: string): FunctionHelp[]
    {
        let result: FunctionHelp[] = [];

        // Run through the source code:
        // - Find all function definitions
        // - Find any docs around it
        // - Form function help from it and add it to our return value

        let sourceLines = sourceCode.split("\n");
        let c = 0;
        const funcStart = "function ";

        for(let line of sourceLines)
        {
            line = line.trim();

            // eg found: function Map.add(l, r)
            if(line.startsWith(funcStart))
            {
                let openBracketIdx = line.indexOf("(");
                if(openBracketIdx > 0)
                {
                    let closeBracketIdx = line.indexOf(")", openBracketIdx+1);
                    if(closeBracketIdx > 0)
                    {
                        // We've now found the 2 brackets, anything in between is a parameter
                        let params = line.substring(openBracketIdx+1, closeBracketIdx);
                        let paramItems = params.split(",");
                        for(let c = 0; c < paramItems.length; c++)
                        {
                            paramItems[c] = paramItems[c].trim();
                        }

                        let funcName = line.substring(funcStart.length, openBracketIdx);
                        if(funcName.length > 0)
                        {
                            let funcDoc = this.getFuncDoc(sourceLines, c);

                            // Check if it's a global func vs a module function
                            let moduleName = "";
                            let dotPos = funcName.indexOf(".");
                            if(dotPos > 0)
                            {
                                moduleName = funcName.substring(0, dotPos);
                                funcName = funcName.substring(dotPos+1);
                            }

                            let helpItem = new FunctionHelp(funcName, moduleName, "", originID, []);

                            // Save each param to the function. Meanwhile read per-variable doc
                            // lines (which removes them from the line list). Anything left over
                            // is the func docs!
                            for(let paramItem of paramItems)
                            {
                                let paramDocLines = this.getParamHelp(funcDoc, paramItem, paramItems);
                                helpItem.params.push(new FunctionParamHelp(paramItem, paramDocLines.join("\n"), []));
                            }

                            // Anything left over is the func doc
                            let funcDocString = funcDoc.join("\n");
                            if(funcDocString.length > 0)
                            {
                                helpItem.doc = funcDocString;
                            }

                            result.push(helpItem);
                        }
                    }
                }
            }
            c++;
        }

        return result;
    }

    // funcLine is the line index where the function definition is. So here we search backwards in the
    // list of lines, and building help text as we find it
    private getFuncDoc(sourceLines: string[], funcLine: number): string[]
    {
        const docLineStart = "--";
        let docLines: string[] = [];

        for(let c = funcLine-1; c >= 0; c--)
        {
            if(sourceLines[c].startsWith(docLineStart))
            {
                docLines.push(sourceLines[c].substring(docLineStart.length).trim())
            }
            else
            {
                break;
            }
        }

        return docLines.reverse();
    }

    private getParamHelp(sourceLines: string[], paramName: string, allParamNames: string[]): string[]
    {
        let docLines: string[] = [];

        let deleteLineIdxs: number[] = [];

        let paramReadStarted = false;
        for(let c = 0; c < sourceLines.length; c++)
        {
            let paramStart = paramName+":";
            if(sourceLines[c].startsWith(paramStart))
            {
                paramReadStarted = true;
                docLines.push(sourceLines[c].substring(paramStart.length).trim());
                deleteLineIdxs.push(c);
            }
            else if(paramReadStarted)
            {
                // Keep adding to the doc string until we find one that refers to another variable
                let paramStartCheck = "";
                let newParamParseFound = false;
                for(let paramCheck of allParamNames)
                {
                    paramStartCheck = paramCheck+":";
                    if(sourceLines[c].startsWith(paramStartCheck))
                    {
                        // We've found a line that now refers to another var, stop here
                        newParamParseFound = true;
                        break;
                    }
                }

                if(newParamParseFound)
                {
                    break;
                }

                docLines.push(sourceLines[c]);
                deleteLineIdxs.push(c);
            }
        }

        // Now delete the lines we just read out
        deleteLineIdxs = deleteLineIdxs.reverse();
        for(let deleteLineIdx of deleteLineIdxs)
        {
            sourceLines.splice(deleteLineIdx, 1);
        }

        // Return this params docstring as we constructed
        return docLines;
    }
}
