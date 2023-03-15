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

import { ObjectCreator } from "src/app/models/BasicTypes";
import { UNICODE_GREEK_LOWERCASE_PSI } from "src/app/utils/utils";


export class ShortName
{
    constructor(public shortName: string, public name: string)
    {
    }
}

export class ModuleReference
{
    constructor(
        public moduleID: string,
        public version: string,
    )
    {
    }
}

export class ExpressionExecStats
{
    constructor(
        public dataRequired: string[],
        public runtimeMs: number,
        public mod_unix_time_sec: number
    )
    {
    }
}

export class DataExpression
{
    private _requiredElementFormulae: string[] = [];
    private _requiredDetectors: string[] = [];

    private _isCompatibleWithQuantification: boolean = true;

    constructor(
        public id: string,
        public name: string,
        public sourceCode: string,
        public sourceLanguage: string,
        public comments: string,
        public shared: boolean,
        public creator: ObjectCreator,
        public createUnixTimeSec: number,
        public modUnixTimeSec: number,
        public tags: string[],
        public moduleReferences: ModuleReference[],
        public recentExecStats: ExpressionExecStats
    )
    {
        // Read in the required elements and detectors from the recent exec stats (if any)
        // NOTE: These lists are assembled in the expression language interpreter code
        //       so look there to see what the possibilities are
        if(recentExecStats && recentExecStats.dataRequired)
        {
            let elems = new Set<string>();
            let dets = new Set<string>();
            for(let item of recentExecStats.dataRequired)
            {
                let elem = DataExpressionId.getPredefinedQuantExpressionElement(item);
                if(elem)
                {
                    elems.add(elem);
                }

                let detector = DataExpressionId.getPredefinedQuantExpressionDetector(item);
                if(detector)
                {
                    dets.add(detector);
                }
            }

            this._requiredElementFormulae = Array.from(elems.keys());
            this._requiredDetectors = Array.from(dets.keys());
        }
    }

    copy(): DataExpression
    {
        // We need to instantiate new versions of all complex objects to prevent javascript from passing by reference
        let creator = new ObjectCreator(this.creator?.user_id, this.creator?.name, this.creator?.email);
        let tags = Array.from(this.tags || []);
        let moduleReferences = Array.from(this.moduleReferences || []).map((ref) => new ModuleReference(ref.moduleID, ref.version));
        let recentExecStats = new ExpressionExecStats(
            this.recentExecStats?.dataRequired,
            this.recentExecStats?.runtimeMs,
            this.recentExecStats?.mod_unix_time_sec
        );

        return new DataExpression(
            this.id,
            this.name,
            this.sourceCode,
            this.sourceLanguage,
            this.comments,
            this.shared,
            creator,
            this.createUnixTimeSec,
            this.modUnixTimeSec,
            tags,
            moduleReferences,
            recentExecStats,
        );
    }

    get isCompatibleWithQuantification(): boolean
    {
        return this._isCompatibleWithQuantification;
    }

    // Checks compatibility with passed in params, returns true if flag was changed
    // otherwise false.
    checkQuantCompatibility(elementList: Set<string>, detectors: string[]): boolean
    {
        let wasCompatible = this._isCompatibleWithQuantification;

        // Check if the quant would have the data we're requiring...
        for(let elem of this._requiredElementFormulae)
        {
            if(!elementList.has(elem))
            {
                // NOTE: quant element list returns both pure and oxide/carbonate, so this check is enough
                this._isCompatibleWithQuantification = false;
                return wasCompatible != this._isCompatibleWithQuantification;
            }
        }

        for(let detector of this._requiredDetectors)
        {
            // This is likely a list of 1-2 items so indexOf is fast enough. If we end up with more detectors in future
            // we may need to use a Set for this too
            if(detectors.indexOf(detector) <= -1)
            {
                // Expression contains a detector that doesn't exist in the quantification
                this._isCompatibleWithQuantification = false;
                return wasCompatible != this._isCompatibleWithQuantification;
            }
        }

        // If we made it this far, it's compatible
        this._isCompatibleWithQuantification = true;
        return wasCompatible != this._isCompatibleWithQuantification;
    }

    getExpressionShortDisplayName(charLimit: number): ShortName
    {
        let result = new ShortName(this.id, this.id);

        result.shortName = this.name;
        result.name = this.name;

        let elem = DataExpressionId.getPredefinedQuantExpressionElement(this.id);
        if(elem.length > 0)
        {
            if(elem.endsWith("-T"))
            {
                result.shortName = elem.substring(0, elem.length-2)+"ᴛ";
            }
            /* Replaced with the above to make this more generic in case other element are quantified as totals
            if(elem == "FeO-T")
            {
                result.shortName = "FeOᴛ";
            }*/
            else
            {
                result.shortName = elem;
            }

            // Add the detector if there is one specified!
            let det = DataExpressionId.getPredefinedQuantExpressionDetector(this.id);
            if(det.length > 0)
            {
                // If it's combined, we show something shorter...
                if(det == "Combined")
                {
                    det = "A&B";
                }
                result.shortName += "-"+det;
            }
        }
        else
        {
            elem = DataExpressionId.getPredefinedPseudoIntensityExpressionElement(this.id);
            if(elem.length > 0)
            {
                result.shortName = UNICODE_GREEK_LOWERCASE_PSI+elem;
            }
            else
            {
                // If it's too long, show f(elem)
                if(result.shortName.length > charLimit)
                {
                    // Cut it short
                    result.shortName = result.shortName.substring(0, charLimit)+"...";
                    /*
                    const elemSearch = "element(";
                    let elemPos = expr.sourceCode.indexOf(elemSearch);
                    if(elemPos > -1)
                    {
                        elemPos += elemSearch.length;

                        // Find the element after this
                        let commaPos = expr.sourceCode.indexOf(",", elemPos+1);
                        let elem = expr.sourceCode.substring(elemPos, commaPos);
                        elem = elem.replace(/['"]+/g, "");

                        // Was limiting to 2 chars, but we now deal a lot in oxides/carbonates
                        // so this wasn't triggering often!
                        //if(elem.length <= 2)
                        {
                            //result = 'f('+elem+')';
                            result.shortName = UNICODE_MATHEMATICAL_F+elem;
                        }
                    }*/
                }
            }
        }

        return result;
    }

    // Expects strings like:
    // "FeO-T", "%", "A"
    // Returns each of the above in a string array
    private getExpressionParameters(code: string): string[]
    {
        let inParam = false;
        let params = [];
        let currParam = "";
        let commaCount = 0;

        for(let c = 0; c < code.length; c++)
        {
            const ch = code[c];

            if(ch == "\"" || ch == "'")
            {
                if(!inParam)
                {
                    inParam = true;
                }
                else
                {
                    // Finished up reading a param
                    params.push(currParam);
                    currParam = "";
                    inParam = false;
                }
            }
            else
            {
                if(inParam)
                {
                    currParam += ch;
                }
                else if(ch == ",")
                {
                    commaCount++;
                }
            }
        }

        if(commaCount != 2 || params.length != 3)
        {
            // We failed to get the element requested from the element() function. This is mostly going to happen
            // if the expression defines a string variable to store the name of the element, and passes that to
            // the element() function. The side-effect of this is that the function won't be properly checked for
            // being "crossed-out", so the user won't know that this expression is valid against their loaded quant
            console.warn("Failed to parse parameters for expression("+code+")");
            return [];
        }

        return params;
    }
}


export class DataExpressionId
{
    public static NewExpression = "new-expression";
    public static NewModule = "new-module";

    private static PredefinedPseudoIntensityLayerPrefix = "pseudo-";
    private static PredefinedQuantDataLayerPrefix = "data-";
    private static PredefinedQuantElementLayerPrefix = "elem-";
    private static PredefinedLayerPrefix = "expr-";
    private static PredefinedLayerRoughness = "roughness";
    private static PredefinedLayerDiffractionCounts = "diffraction";
    private static SuffixUnquantified = "unquantified";
    private static SuffixZHeight = "zheight";

    // Static functions for getting/accessing/parsing predefined expression IDs
    public static isPredefinedNewID(id: string): boolean
    {
        id = id ? id.toLowerCase() : "";
        return [DataExpressionId.NewExpression, DataExpressionId.NewModule].includes(id);
    }

    public static isPredefinedExpression(id: string): boolean
    {
        return id.startsWith(DataExpressionId.PredefinedLayerPrefix);
    }
    public static isPredefinedQuantExpression(id: string): boolean
    {
        return id.startsWith(DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedQuantElementLayerPrefix);
    }
    public static getPredefinedPseudoIntensityExpressionElement(id: string): string
    {
        let prefix = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedPseudoIntensityLayerPrefix;
        if(!id.startsWith(prefix))
        {
            return "";
        }

        return id.substring(prefix.length);
    }

    // Returns '' if it's not the right kind of id
    public static getPredefinedQuantExpressionElement(id: string): string
    {
        let prefix = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedQuantElementLayerPrefix;

        // expecting prefix-<elem info: 1-2 chars OR FeO-T>-<column, eg %, int, err, %-as-mmol>
        if(!id.startsWith(prefix))
        {
            return "";
        }

        // Check for column
        let remainder = id.substring(prefix.length);
        let lastDash = remainder.lastIndexOf("-");

        // If it ends with %-as-mmol we have to use a different idx here
        let asMmolIdx = remainder.indexOf("-%-as-mmol");
        if(asMmolIdx > 0)
        {
            lastDash = asMmolIdx;
        }

        if(lastDash < 0)
        {
            return "";
        }

        return remainder.substring(0, lastDash);
    }

    // Returns '' if it's not the right kind of id
    public static getPredefinedQuantExpressionElementColumn(id: string): string
    {
        let prefix = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedQuantElementLayerPrefix;

        // expecting prefix-<elem info: 1-2 chars OR FeO-T>-<column, eg %, int, err>
        if(!id.startsWith(prefix))
        {
            return "";
        }

        // Check for column
        let remainder = id.substring(prefix.length);
        let lastDash = remainder.lastIndexOf("-");

        // If it ends with %-as-mmol we have to use a different idx here
        let asMmolIdx = remainder.indexOf("-%-as-mmol");
        if(asMmolIdx > 0)
        {
            lastDash = asMmolIdx;
        }

        if(lastDash < 0)
        {
            return "";
        }

        let result = remainder.substring(lastDash+1);

        // If result has (A), (B) or (Combined), snip that off
        if(result.endsWith("(A)") || result.endsWith("(B)") || result.endsWith("(Combined)"))
        {
            let bracketIdx = result.lastIndexOf("(");
            result = result.substring(0, bracketIdx);
        }

        return result;
    }

    // Returns detector part of a predefiend expression id:
    // expr-elem-
    public static getPredefinedQuantExpressionDetector(id: string): string
    {
        let elemPrefix = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedQuantElementLayerPrefix;
        let dataPrefix = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedQuantDataLayerPrefix;

        // expecting prefix-<elem info: 1-2 chars OR FeO-T>-<column, eg %, int, err> OR a data column
        if(!id.startsWith(elemPrefix) && !id.startsWith(dataPrefix))
        {
            return "";
        }

        // Check end
        let detectorPossibilities = DataExpressionId.getPossibleDetectors();
        for(let det of detectorPossibilities)
        {
            if(id.endsWith("("+det+")"))
            {
                let bracketIdx = id.lastIndexOf("(");
                id = id.substring(bracketIdx);

                // Snip off the brackets
                return id.substring(1, id.length-1);
            }
        }

        // None specified
        return "";
    }

    public static getExpressionWithoutDetector(id: string): string
    {
        // If the detector is specified, this removes it... bit ugly/hacky but needed in case of comparing
        // active expression IDs where we don't want the selected detector to confuse things
        let detectorPossibilities = DataExpressionId.getPossibleDetectors();

        for(let det of detectorPossibilities)
        {
            if(id.endsWith("("+det+")"))
            {
                return id.substring(0, id.length-2-det.length);
            }
        }
        return id;
    }

    // Instead of hard-coding it in multiple places...
    private static getPossibleDetectors(): string[]
    {
        return ["A", "B", "Combined"];
    }

    public static makePredefinedQuantElementExpression(element: string, column: string, detector: string = null): string
    {
        let result = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedQuantElementLayerPrefix+element+"-"+column;
        if(detector)
        {
            result += "("+detector+")";
        }
        return result;
    }
    public static makePredefinedPseudoIntensityExpression(pseudoElem: string): string
    {
        return DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedPseudoIntensityLayerPrefix+pseudoElem;
    }
    public static makePredefinedQuantDataExpression(column: string, detector: string): string
    {
        let result = DataExpressionId.predefinedQuantDataExpression+column;
        if(detector)
        {
            result += "("+detector+")";
        }
        return result;
    }
    public static readonly predefinedUnquantifiedPercentDataExpression = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedQuantElementLayerPrefix+DataExpressionId.SuffixUnquantified;
    public static readonly predefinedRoughnessDataExpression = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedLayerRoughness;
    public static readonly predefinedDiffractionCountDataExpression = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedLayerDiffractionCounts;
    public static readonly predefinedHeightZDataExpression = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.SuffixZHeight;
    public static readonly predefinedQuantDataExpression = DataExpressionId.PredefinedLayerPrefix+DataExpressionId.PredefinedQuantDataLayerPrefix;

    public static hasPseudoIntensityExpressions(exprIds: string[]): boolean
    {
        for(let exprId of exprIds)
        {
            if(DataExpressionId.getPredefinedPseudoIntensityExpressionElement(exprId).length > 0)
            {
                return true;
            }
        }
        return false;
    }
}