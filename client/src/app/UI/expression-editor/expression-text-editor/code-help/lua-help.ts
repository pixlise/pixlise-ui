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


export class LUAHelp extends SourceHelp
{
/*    private _luaKeywords = ["and", "break", "do", "else", "elseif", "end", "false", "for",
                            "function", "if", "in", "local", "nil", "not", "or", "repeat",
                            "return", "then", "true", "until", "while", "goto"];*/

    constructor()
    {
        super("--");

        // These are shared between the 2 languages, same syntax, etc
        PIXLANGHelp.makeDataFunctionHelp(this);
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
        const docLineStart = "--"
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
