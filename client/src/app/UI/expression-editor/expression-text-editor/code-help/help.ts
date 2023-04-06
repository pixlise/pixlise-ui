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

import { QuantificationLayer } from "src/app/models/Quantifications";
import { DataSet } from "src/app/models/DataSet";


export class NameAndParamResult
{
    constructor(public funcName: string, public params: string[], public partialParam: string)
    {
    }

    get empty(): boolean
    {
        return this.funcName.length <= 0 && this.params.length <= 0 && this.partialParam.length <= 0;
    }
}

export class SourceContextParser
{
    constructor(private _commentMarker: string)
    {
        if(!this._commentMarker)
        {
            throw new Error("Comment marker cannot be blank");
        }
    }

    // If we can, extract the word right before the end of the string
    // This means we're looking back from the end of the string and only reporting
    // we found a "word" if it's alpha-numeric but is a valid variable/function name
    wordAtEnd(source: string): string
    {
        let text = this.stripCommentsAndFlatten(source);

        let foundLetters = false;
        for(let c = text.length-1; c >= 0; c--)
        {
            let ch = text[c];
            if(ch == "\"" || ch == "'")
            {
                // If we found a quote char, we're likely something like "blah where this isn't a word, but a string def 
                break;
            }
            else if(ch == ")" || ch == "(" || ch == " " || ch == "\t")
            {
                if(foundLetters)
                {
                    // Found these but had some valid letters until then, so cut off here
                    return text.substring(c+1);
                }
                else
                {
                    // If we've found these, we don't have a word anyway so stop here
                    break;
                }
            }
            else if(ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch == "_")
            {
                foundLetters = true;
            }
        }

        return "";
    }

    // Get module name typed, expects "." with a name before it
    rfindModuleName(source: string): string
    {
        let modName = "";
        let validModuleChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";

        if(source.length > 0 && source[source.length-1] == ".")
        {
            // Likely won't have a longer module name than 20 chars, API limits it
            for(let c = 0; c < 20; c++)
            {
                let idx = source.length-2-c;
                if(idx >= 0)
                {
                    let ch = source[idx];
                    // Check if it's still module name goodness
                    if(validModuleChars.indexOf(ch) == -1)
                    {
                        modName = source.substring(idx+1, source.length-1);
                        break;
                    }
                }
                else
                {
                    // Too long, not a module name, stop here
                    break;
                }
            }
        }

        return modName;
    }

    // Reverse-find from the end of the text, what function we're in, and what parameters have already been provided
    rfindFunctionNameAndParams(source: string): NameAndParamResult
    {
        let text = this.stripCommentsAndFlatten(source);

        let result = new NameAndParamResult("", [], "");

        let inQuotes = false;
        let bracketDepth = 0;
        let currMark = -1;

        for(let c = text.length-1; c >= 0; c--)
        {
            let ch = text[c];
            if(ch == "\"")
            {
                // If this is the first thing we've seen, we may be partially through typing
                // a parameter with quotes, eg: element("Fe
                // So in this case we have to assume we've just LEFT the quoted area, not just
                // entered
                if(result.empty)
                {
                    // This is the special case...
                    inQuotes = false;
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if(!inQuotes)
            {
                if(ch == ")")
                {
                    bracketDepth++;
                }
                else if(ch == "(")
                {
                    bracketDepth--;
                    if(currMark >= 0)
                    {
                        // Likely end of 1st param, into the function call
                        if(bracketDepth < 0)
                        {
                            result.params.push(this.cleanParam(text.substring(c+1, currMark)));
                            currMark = c;
                        }
                    }
                    else
                    {
                        if(bracketDepth < 0)
                        {
                            // We must have a partial parameter typed, eg element("Fe", "%
                            // So save it here
                            let typedParam = text.substring(c+1).trim();
                            if(typedParam)
                            {
                                result.partialParam = this.cleanParam(typedParam);
                            }
                        }
                        currMark = c;
                    }
                }
                else if(bracketDepth <= 0)
                {
                    if(ch == ",")
                    {
                        if(currMark < 0)
                        {
                            // We must have a partial parameter typed, eg element("Fe", "%
                            // So save it here
                            let typedParam = text.substring(c+1).trim();
                            if(typedParam)
                            {
                                result.partialParam = this.cleanParam(typedParam);
                            }

                            currMark = c;
                        }
                        else
                        {
                            // We have just found a param, save the whole thing
                            result.params.push(this.cleanParam(text.substring(c+1, currMark)));
                            currMark = c;
                        }
                    }
                    else if(ch == " " || ch == "\t" || c == 0)
                    {
                        if(bracketDepth < 0)
                        {
                            result.funcName = this.cleanParam(text.substring(c, currMark));
                            break;
                        }
                    }
                }
            }
        }

        // Reverse the param order here, we were parsing backwards!
        result.params = result.params.reverse();
        return result;
    }

    private cleanParam(param: string): string
    {
        let noWhite = param.trim();
    /*
        // Now remove quotes if they exist on both ends
        // NOTE: This is only because if we're dealing with "cleaning" a partially typed param
        // eg element("Fe, we don't want to clear the ", so it's displayed correctly
        if(noWhite[0] == "\"" && noWhite[noWhite.length-1] == "\"")
        {
            noWhite = noWhite.substring(1, noWhite.length-2);
        }
    */
    /*
        // Now remove any \" in case it's a string
        if(noWhite[0] == "\"")
        {
            noWhite = noWhite.substring(1);
        }
        if(noWhite[noWhite.length-1] == "\"")
        {
            noWhite = noWhite.substring(0, noWhite.length-1);
        }*/
        return noWhite;
    }

    public static stripQuotes(param: string): string
    {
        // Now remove any \" in case it's a string
        if(param[0] == "\"" && param[param.length-1] == "\"")
        {
            return param.substring(1, param.length-1);
        }
        return param;
    }

    private stripCommentsAndFlatten(searchTextLines: string): string
    {
        // Split by line, and remove comments, then recombine
        let searchLines = searchTextLines.split("\n");
        let searchText = "";
        for(let line of searchLines)
        {
            // Trim comments
            let pos = line.indexOf(this._commentMarker);
            if(pos > -1)
            {
                line = line.substring(0, pos);
            }

            if(searchText.length > 0)
            {
                searchText += " ";
            }
            searchText += line;
        }

        return searchText;
    }
}

export class FunctionParamHelp
{
    constructor(
        public name: string,
        public doc: string,
        private _possibleValues: string[] = []
    )
    {
    }

    // Can be overridden if needed
    getPossibleValues(paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet): string[]
    {
        return this._possibleValues;
    }
}

export class FunctionHelp
{
    constructor(
        public name: string,
        public moduleName: string,
        public doc: string,
        public originID: string, // The module ID it's defined in, or blank in case of PIXLISE functions, element() etc
        public params: FunctionParamHelp[] = [] // For parameter-less functions
    )
    {
    }
}

export class HelpCompletionItem
{
    constructor(
        public name: string,
        public doc: string,
        //public sig: string
    )
    {

    }
}
/*
class HelpSignatureParam
{
    constructor(
        public name: string,
        public doc: string,
        public possibleValues: string[]
    )
    {
    }
}
*/
export class HelpSignature
{
    constructor(
/*        public funcName: string,
        public funcDoc: string,
        public params: HelpSignatureParam[]*/
        public prefix: string,
        public activeParam: string,
        public suffix: string,
        public paramDoc: string,
        public paramPossibleValues: string[],
        public activeParamIdx: number
    )
    {
    }
}


export class SourceHelp
{
    private _allHelp = new Map<string, FunctionHelp>();

    constructor(public commentStartToken: string)
    {
    }

    addHelp(h: FunctionHelp): void
    {
        let fullName = h.moduleName.length > 0 ? h.moduleName+"."+h.name : h.name;
        this._allHelp.set(fullName, h);
    }

    clearHelp(originID: string): void
    {
        // Remove all entries that have this origin ID
        for(let [k, v] of this._allHelp)
        {
            if(v.originID == originID)
            {
                this._allHelp.delete(k);
            }
        }
    }

    getKeywords(): string[]
    {
        return Array.from(this._allHelp.keys());
    }

    getCompletionFunctions(moduleName: string): HelpCompletionItem[]
    {
        let result: HelpCompletionItem[] = [];

        for(let item of this._allHelp.values())
        {
            if(item.moduleName == moduleName)
            {
                result.push(new HelpCompletionItem(item.name, item.doc/*, sig*/));
            }
        }

        return result;
    }

    // Blank input returns all modules
    getCompletionModules(moduleName: string): HelpCompletionItem[]
    {
        let modules = new Set<string>();

        let result: HelpCompletionItem[] = [];

        for(let item of this._allHelp.values())
        {
            if(moduleName.length <= 0 && item.moduleName.length > 0 || moduleName.length > 0 && item.moduleName == moduleName)
            {
                modules.add(item.moduleName);
            }
        }

        for(let mod of modules)
        {
            result.push(new HelpCompletionItem(mod, ""));
        }
        return result;
    }

    getSignatureHelp(moduleName: string, funcName: string, paramsProvided: string[], quantificationLoaded: QuantificationLayer, dataset: DataSet): HelpSignature
    {
        let fullName = moduleName.length > 0 ? moduleName+"."+funcName : funcName;
        let help = this._allHelp.get(fullName);
        if(!help)
        {
            return null;
        }

        if(help.params.length <= 0)
        {
            return new HelpSignature(
                funcName+"(",
                "",
                ")",
                "",
                [],
                0
            );
        }

        let paramIdx = paramsProvided.length;
        let result = new HelpSignature(
            funcName+"(",
            help.params[paramIdx].name,
            "",
            help.params[paramIdx].doc,
            [],
            paramIdx-1
        );

        // Fill in params we've passed over already
        for(let c = 0; c < paramIdx; c++)
        {
            result.prefix += help.params[c].name;

            if(c < help.params.length-1)
            {
                result.prefix += ", ";
            }
        }

        // Add in parameters we haven't specified yet
        for(let c = paramIdx+1; c < help.params.length; c++)
        {
            //if(result.suffix.length > 0 || paramIdx == 0)
            {
                result.suffix += ", ";
            }
            result.suffix += help.params[c].name;
        }
        result.suffix += ")";

        // Add possible values to docs if needed
        let possibilities = help.params[paramIdx].getPossibleValues(paramsProvided, quantificationLoaded, dataset);
        if(possibilities && possibilities.length > 0)
        {
            result.paramPossibleValues = possibilities;
        }
        return result;
    }
}
