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

function cleanParam(param: string): string
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
    // Now remove any \" in case it's a string
    if(noWhite[0] == "\"")
    {
        noWhite = noWhite.substring(1);
    }
    if(noWhite[noWhite.length-1] == "\"")
    {
        noWhite = noWhite.substring(0, noWhite.length-1);
    }
    return noWhite;
}

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

export function rfindFunctionNameAndParams(text: string): NameAndParamResult
{
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
                        result.params.push(cleanParam(text.substring(c+1, currMark)));
                        currMark = c;
                    }
                }
                else
                {
                    // We must have a partial parameter typed, eg element("Fe", "%
                    // So save it here
                    let typedParam = text.substring(c+1).trim();
                    if(typedParam)
                    {
                        result.partialParam = cleanParam(typedParam);
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
                            result.partialParam = cleanParam(typedParam);
                        }

                        currMark = c;
                    }
                    else
                    {
                        // We have just found a param, save the whole thing
                        result.params.push(cleanParam(text.substring(c+1, currMark)));
                        currMark = c;
                    }
                }
                else if(ch == " " || ch == "\t" || c == 0)
                {
                    if(bracketDepth < 0)
                    {
                        result.funcName = cleanParam(text.substring(c, currMark));
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