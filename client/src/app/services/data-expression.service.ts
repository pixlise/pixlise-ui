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

import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, ReplaySubject, Subject, Subscription } from "rxjs";
import { tap } from "rxjs/operators";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { QuantificationLayer, QuantModes } from "src/app/models/Quantifications";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataSetService } from "src/app/services/data-set.service";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { UNICODE_GREEK_LOWERCASE_PSI } from "src/app/utils/utils";
import { QuantificationService } from "./quantification.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";


class DataExpressionInput
{
    constructor(
        public name: string,
        public expression: string,
        public type: string,
        public comments: string
    )
    {
    }
}

// What we receive
class DataExpressionWire
{
    constructor(
        public name: string,
        public expression: string,
        public type: string,
        public comments: string,
        public shared: boolean,
        public creator: ObjectCreator,
        public create_unix_time_sec: number,
        public mod_unix_time_sec: number
    )
    {
    }
}

// What we provide to the rest of the app
export class DataExpression
{
    private _requiredElementFormulae = new Set<string>();
    private _requiredDetectors = new Set<string>();

    private _isCompatibleWithQuantification: boolean = true;

    constructor(
        public id: string,
        public name: string,
        public expression: string,
        public type: string,
        public comments: string,
        public shared: boolean,
        public creator: ObjectCreator,
        public createUnixTimeSec: number,
        public modUnixTimeSec: number
    )
    {
        this.parseRequiredQuantificationData();
    }

    get isCompatibleWithQuantification(): boolean
    {
        return this._isCompatibleWithQuantification;
    }

    // Checks compatibility with passed in params, returns true if flag was changed
    // otherwise false.
    checkQuantCompatibility(elementList: string[], detectors: string[]): boolean
    {
        let wasCompatible = this._isCompatibleWithQuantification;

        // Check if the quant would have the data we're requiring...
        for(let elem of this._requiredElementFormulae)
        {
            if(elementList.indexOf(elem) <= -1)
            {
                // NOTE: quant element list returns both pure and oxide/carbonate, so this check is enough
                this._isCompatibleWithQuantification = false;
                return wasCompatible != this._isCompatibleWithQuantification;
            }
        }

        for(let detector of this._requiredDetectors)
        {
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

    private parseRequiredQuantificationData()
    {
        this._requiredElementFormulae.clear();
        this._requiredDetectors.clear();

        // Find all occurances of element() in expression and determine what element formulae (eg element or oxide/carbonate)
        // are used, and what detectors are referenced
        // This can be used elsewhere to show if this expression is compatible with the currently loaded quantification
        const element = "element";
        let elemPos = this.expression.indexOf(element);

        while(elemPos > -1)
        {
            let nextSearchStart = elemPos+element.length;

            // Make sure it's not elementSum()
            if(this.expression.substring(elemPos, elemPos+element.length+3) != "elementSum")
            {
                // Find (
                let openBracketPos = this.expression.indexOf("(", elemPos+element.length);
                let closeBracketPos = openBracketPos;
                if(openBracketPos > -1)
                {
                    // Find )
                    closeBracketPos = this.expression.indexOf(")", openBracketPos);

                    if(closeBracketPos > -1)
                    {
                        // We've now got the start and end of the expression parameters. Break this into tokens
                        let params = this.getExpressionParameters(this.expression.substring(openBracketPos+1, closeBracketPos));
                        if(params.length == 3)
                        {
                            this._requiredElementFormulae.add(params[0]);
                            this._requiredDetectors.add(params[2]);
                        }

                        nextSearchStart = closeBracketPos;
                    }
                }
            }

            elemPos = this.expression.indexOf(element, nextSearchStart);
        }
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
            console.error("Failed to parse parameters for expression("+code+")");
            return [];
        }

        return params;
    }
}

export class ShortName
{
    constructor(public shortName: string, public name: string)
    {
    }
}

const PredefinedPseudoIntensityLayerPrefix = "pseudo-";
const PredefinedQuantDataLayerPrefix = "data-";
const PredefinedQuantElementLayerPrefix = "elem-";
const PredefinedLayerPrefix = "expr-";
const PredefinedLayerRoughness = "roughness";
const PredefinedLayerDiffractionCounts = "diffraction";
const SuffixUnquantified = "unquantified";
const SuffixZHeight = "zheight";

@Injectable({
    providedIn: "root"
})
export class DataExpressionService
{
    private subs = new Subscription();

    private _expressionsUpdated$ = new ReplaySubject<void>(1);
    private _expressions: Map<string, DataExpression> = new Map<string, DataExpression>();

    private _elementFormulae: string[] = [];
    private _validDetectors: string[] = [QuantModes.quantModeCombined];

    private _diffractionCountExpression = "";
    private _diffractionCountExpressionName = "";

    constructor(
        private _datasetService: DataSetService, // just for getting pseudointensity predefined expression ids
        private _loadingSvc: LoadingIndicatorService,
        private http: HttpClient
    )
    {
        this.refreshExpressions();
    }

    get expressionsUpdated$(): Subject<void>
    {
        return this._expressionsUpdated$;
    }

    setQuantDataAvailable(elementFormulae: string[], detectors: string[]): void
    {
        this._elementFormulae = elementFormulae;
        this._validDetectors = detectors;

        // If we have expressions, run their compatibility check against these
        // otherwise it'll happen the next time we get an expression refresh
        let changeCount = this.checkQuantCompatibleExpressions();
        if(changeCount > 0)
        {
            // We did change some flags - quant loaded, maybe we already had expressions, so notify out here
            this._expressionsUpdated$.next();
        }
    }

    get validDetectors(): string[]
    {
        return this._validDetectors;
    }

    setDiffractionCountExpression(expr: string, name: string): void
    {
        // If it changed, we notify the world
        if(expr == this._diffractionCountExpression && name == this._diffractionCountExpressionName)
        {
            return; // No change!
        }

        this._diffractionCountExpression = expr;
        this._diffractionCountExpressionName = name;

        // Seems a bit drastic, but works for now...
        this._expressionsUpdated$.next();
    }

    refreshExpressions()
    {
        let loadID = this._loadingSvc.add("Refreshing expressions...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_expression);
        this.http.get<Map<string, DataExpressionWire>>(apiURL, makeHeaders()).subscribe(
            (resp: object)=>
            {
                this.processReceivedExpressionList(resp);
                this._loadingSvc.remove(loadID);
            },
            (err)=>
            {
                this._loadingSvc.remove(loadID);
                console.error("Failed to refresh data expressions!");
            }
        );
    }

    private processReceivedExpressionList(respObj: object): void
    {
        let t0 = performance.now();
        let receivedExprs = new Map<string, DataExpression>();

        for(let key of Object.keys(respObj)) // This really should've been a map but it's not :( Thanks typescript/JS/angular
        //for(let [key, value] of resp)
        {
            let value = respObj[key];

            // This wasn't in old expressions...
            let comments = value.comments;
            if(!comments)
            {
                comments = "";
            }

            let toAdd = new DataExpression(key, value.name, value.expression, value.type, comments, value.shared, value.creator, value.create_unix_time_sec, value.mod_unix_time_sec);
            receivedExprs.set(key, toAdd);
        }

        // Back up existing
        let existingExprs = this._expressions;

        // Read in new ones
        this._expressions = new Map<string, DataExpression>();

        let hadUser = false;
        let hadShared = false;
        for(let [id, expr] of receivedExprs)
        {
            this._expressions.set(id, expr);
            if(expr.shared)
            {
                hadShared = true;
            }
            else
            {
                hadUser = true;
            }
        }

        // If new ones didn't have shared or non-shared, substitute with what we already have, because responses to things like put/share
        // may only return the shared list which they edited
        if(!hadShared || !hadUser)
        {
            for(let [id, expr] of existingExprs)
            {
                if(!hadUser && !expr.shared || !hadShared && expr.shared)
                {
                    this._expressions.set(id, expr);
                }
            }
        }

        this.checkQuantCompatibleExpressions();

        let t1 = performance.now();
        console.log("Expression list processed in "+(t1 - t0).toLocaleString() + "ms");

        // Always update in this case
        this._expressionsUpdated$.next();
    }

    private checkQuantCompatibleExpressions(): number
    {
        let changeCount = 0;

        // Run through all expressions and check their compatibility against the info we have about the quantification
        for(let expr of this._expressions.values())
        {
            changeCount += (expr.checkQuantCompatibility(this._elementFormulae, this._validDetectors) ? 1 : 0);
        }

        return changeCount;
    }

    getExpressions(type: string): Map<string, DataExpression>
    {
        // This used to take a type field because we thought we'd have "types" of expressions specific to a given widget
        // but this never eventuated. type field is deprecated and currently we expect it to be set to all...
        if(type != DataExpressionService.DataExpressionTypeAll)
        {
            throw new Error("getExpressions called with unexpected type: "+type);
        }

        return this._expressions;
    }

    getAllExpressionIds(type: string, quantification: QuantificationLayer): string[]
    {
        let ids = this.getPredefinedExpressionIds(type, quantification);
        let exprs = this.getExpressions(type);
        for(let id of exprs.keys())
        {
            ids.push(id);
        }
        return ids;
    }

    // getAllExpressionIds returns all possibilities, but now that we support carbonates/oxides, we may be
    // returning both the carbonate/oxide and the element. This function filters the list so only carbonates/oxides,
    // or only elements are returned, because we don't want the default state of anything to have carbonate/oxide
    // and its elements - the data are related so it makes plots look wonky
    getStartingExpressions(quantification: QuantificationLayer): string[]
    {
        const exprList = this.getAllExpressionIds(DataExpressionService.DataExpressionTypeAll, quantification);

        let result = [];

        let pseudoStarters = [];
        let elemStarters = [];

        for(let expr of exprList)
        {
            let pseudoElem = DataExpressionService.getPredefinedPseudoIntensityExpressionElement(expr);
            if(pseudoElem.length > 0)
            {
                pseudoStarters.push(expr);
            }

            let elem = DataExpressionService.getPredefinedQuantExpressionElement(expr);
            if(elem.length > 0)
            {
                elemStarters.push(elem);
            }
        }

        if(elemStarters.length > 0)
        {
            // NOTE: Here we have to get the "most complex" state of each element - since if we have a carbonate/oxide defined, we also
            //       would see the "pure" element in this list, we don't want to end up with the chord diagram showing Fe and FeCO3, so
            //       this filters out the "pure" elements
            let complexElems = periodicTableDB.getOnlyMostComplexStates(elemStarters);

            // Because we were dealing in elements, we now have to convert to their expressions for it to work in the chart
            // % hard-code is OK because getAllExpressionIds would've delivered us % already anyway
            let complexElemExpressions = [];
            for(let elem of complexElems)
            {
                for(let det of this._validDetectors)
                {
                    complexElemExpressions.push(DataExpressionService.makePredefinedQuantElementExpression(elem, "%", det));
                }
            }
            result = complexElemExpressions;
        }
        else
        {
            result = pseudoStarters;
        }

        return result;
    }

    private getPredefinedExpressionIds(type: string, quantification: QuantificationLayer): string[]
    {
        let result: string[] = [];

        let items = [];

        // Expression service needs widget data service to query elements (to form predefined expression list with)
        let allFormulae: string[] = [];
        if(quantification)
        {
            allFormulae = quantification.getElementFormulae();
        }

        for(let item of allFormulae)
        {
            for(let det of this._validDetectors)
            {
                result.push(DataExpressionService.makePredefinedQuantElementExpression(item, "%", det));
            }
        }

        if(this._datasetService.datasetLoaded)
        {
            items = this._datasetService.datasetLoaded.getPseudoIntensityElementsList();
            for(let item of items)
            {
                result.push(DataExpressionService.makePredefinedPseudoIntensityExpression(item));
            }
        }

        return result;
    }

    getExpressionShortDisplayName(id: string, charLimit: number): ShortName
    {
        let result = new ShortName(id, id);
        let expr = this.getExpression(id);
        if(expr)
        {
            result.shortName = expr.name;
            result.name = expr.name;

            let elem = DataExpressionService.getPredefinedQuantExpressionElement(id);
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
                let det = DataExpressionService.getPredefinedQuantExpressionDetector(id);
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
                elem = DataExpressionService.getPredefinedPseudoIntensityExpressionElement(id);
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
                        let elemPos = expr.expression.indexOf(elemSearch);
                        if(elemPos > -1)
                        {
                            elemPos += elemSearch.length;

                            // Find the element after this
                            let commaPos = expr.expression.indexOf(",", elemPos+1);
                            let elem = expr.expression.substring(elemPos, commaPos);
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
        }

        return result;
    }

    getExpression(id: string): DataExpression
    {
        // Check if it's one of the predefined expressions that we only supply to the UI for showing/hiding
        // layers on context image
        if(DataExpressionService.isPredefinedExpression(id))
        {
            return this.getPredefinedExpression(id);
        }

        return this._expressions.get(id);
    }

    private getPredefinedExpression(id: string): DataExpression
    {
        // Form the expression based on the ID passed in
        let name = "";
        let expr = "";

        // Start off with the first valid one, we do this because detector is optional on a predefined ID
        // due to backwards compatibility, so we may end up using a default
        let detectorId = this._validDetectors[0];

        let exprDetector = DataExpressionService.getPredefinedQuantExpressionDetector(id);
        if(exprDetector.length > 0)
        {
            if(this._validDetectors.indexOf(exprDetector) < 0)
            {
                console.error("Predefined expression: \""+id+"\" referenced invalid detector: \""+exprDetector+"\", valid choices: "+this._validDetectors);
            }
            detectorId = exprDetector;
        }

        let elem = DataExpressionService.getPredefinedQuantExpressionElement(id);
        if(elem.length > 0)
        {
            let column = DataExpressionService.getPredefinedQuantExpressionElementColumn(id);

            if(column.length > 0)
            {
                expr = "element('"+elem+"','"+column+"','"+detectorId+"')";
                name = elem+" "+QuantificationService.getPrintableColumnName(column);
                if(detectorId != "Combined")
                {
                    name += "-"+detectorId;
                }
            }
        }
        else
        {
            // If the element is actually saying we want the unquantified expression, return that
            if(id.startsWith(DataExpressionService.predefinedUnquantifiedPercentDataExpression))
            {
                expr = "100-elementSum(\"%\",\""+detectorId+"\")";
                name = "Unquantified Weight %";
                if(detectorId != "Combined")
                {
                    name += "-"+detectorId;
                }
            }
            else if(id == DataExpressionService.predefinedHeightZDataExpression)
            {
                expr = "position(\"z\")";
                name = "Height in Z";
            }
            else if(id == DataExpressionService.predefinedRoughnessDataExpression)
            {
                expr = "roughness()";
                name = "Roughness";
            }
            else if(id == DataExpressionService.predefinedDiffractionCountDataExpression)
            {
                expr = "diffractionPeaks(0,4096)";
                if(this._diffractionCountExpression.length > 0)
                {
                    expr = this._diffractionCountExpression;
                }
                name = "Diffraction Count";
                if(this._diffractionCountExpressionName.length > 0)
                {
                    name = this._diffractionCountExpressionName;
                }
            }
            else
            {
                let pseudoElem = DataExpressionService.getPredefinedPseudoIntensityExpressionElement(id);
                if(pseudoElem.length > 0)
                {
                    expr = "pseudo('"+pseudoElem+"')";
                    name = "Pseudo "+pseudoElem;
                }
                else if(id.startsWith(PredefinedLayerPrefix+PredefinedQuantDataLayerPrefix))
                {
                    // Now get the column (sans detector in case it's specified)
                    let idWithoutDetector = DataExpressionService.getExpressionWithoutDetector(id);

                    let bits = idWithoutDetector.split("-");
                    let col = bits[2];

                    expr = "data('"+col+"','"+detectorId+"')";
                    name = col;

                    if(name == "chisq")
                    {
                        name = "Chi\u00B2 uncertainty/spectrum";
                    }
                    if(detectorId != "Combined")
                    {
                        name += "-"+detectorId;
                    }
                }
            }
        }

        if(expr.length <= 0)
        {
            return null;
        }

        let result = new DataExpression(
            id,
            name,
            expr,
            DataExpressionService.DataExpressionTypeAll, // TODO: bad hard code here! Should be a param for this func
            "Built-in expression",
            false,
            null,
            0,
            0
        );

        // Run the compatibility checker on this
        result.checkQuantCompatibility(this._elementFormulae, this._validDetectors);

        return result;
    }

    add(name: string, expression: string, type: string, comments: string): Observable<object>
    {
        let loadID = this._loadingSvc.add("Saving new expression...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_expression);
        let toSave = new DataExpressionInput(name, expression, type, comments);
        return this.http.post<object>(apiURL, toSave, makeHeaders())
            .pipe(
                tap(
                    (resp: object)=>
                    {
                        if(resp) 
                        {
                            this.processReceivedExpressionList(resp);
                        }
                        else 
                        {
                            console.error("Invalid Expression List returned while saving:", resp);
                        }
                        this._loadingSvc.remove(loadID);
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);
                    }
                )
            );
    }

    edit(id: string, name: string, expression: string, type: string, comments: string): Observable<object>
    {
        let loadID = this._loadingSvc.add("Saving changed expression...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_expression+"/"+id);

        let toSave = new DataExpressionInput(name, expression, type, comments);
        return this.http.put<object>(apiURL, toSave, makeHeaders())
            .pipe(
                tap(
                    (resp: object)=>
                    {
                        this.processReceivedExpressionList(resp);
                        this._loadingSvc.remove(loadID);
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);
                    }
                )
            );
    }

    del(id: string): Observable<object>
    {
        let loadID = this._loadingSvc.add("Deleting expression...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_expression+"/"+id);
        return this.http.delete<object>(apiURL, makeHeaders())
            .pipe(
                tap(
                    (resp: object)=>
                    {
                        this.processReceivedExpressionList(resp);
                        this._loadingSvc.remove(loadID);
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);
                    }
                )
            );
    }

    share(id: string): Observable<string>
    {
        let loadID = this._loadingSvc.add("Sharing expression...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_share+"/"+APIPaths.api_data_expression+"/"+id);
        return this.http.post<string>(apiURL, "", makeHeaders())
            .pipe(
                tap(
                    ()=>
                    {
                        this._loadingSvc.remove(loadID);
                        this.refreshExpressions();
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);
                    }
                )
            );
    }
    /*
    setContextImageExpressions(contextImageExpressions: DataExpression[])
    {
        this._expressions = contextImageExpressions;
    }*/

    // Static functions for getting/accessing/parsing predefined expression IDs
    // TODO: remove this if the whole concept of expression types
    // goes unused... this is already a hack to get them to all show up
    public static get DataExpressionTypeAll(): string { return "All"; }
    /*
    public static get DataExpressionTypeContextImage(): string { return "ContextImage"; }
    public static get DataExpressionTypeChordDiagram(): string { return "ChordDiagram"; }
    public static get DataExpressionTypeBinaryPlot(): string { return "BinaryPlot"; }
    public static get DataExpressionTypeTernaryPlot(): string { return "TernaryPlot"; }
*/
    public static isPredefinedExpression(id: string): boolean
    {
        return id.startsWith(PredefinedLayerPrefix);
    }
    public static isPredefinedQuantExpression(id: string): boolean
    {
        return id.startsWith(PredefinedLayerPrefix+PredefinedQuantElementLayerPrefix);
    }
    public static getPredefinedPseudoIntensityExpressionElement(id: string): string
    {
        let prefix = PredefinedLayerPrefix+PredefinedPseudoIntensityLayerPrefix;
        if(!id.startsWith(prefix))
        {
            return "";
        }

        return id.substring(prefix.length);
    }

    // Returns '' if it's not the right kind of id
    public static getPredefinedQuantExpressionElement(id: string): string
    {
        let prefix = PredefinedLayerPrefix+PredefinedQuantElementLayerPrefix;

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
        let prefix = PredefinedLayerPrefix+PredefinedQuantElementLayerPrefix;

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
        let elemPrefix = PredefinedLayerPrefix+PredefinedQuantElementLayerPrefix;
        let dataPrefix = PredefinedLayerPrefix+PredefinedQuantDataLayerPrefix;

        // expecting prefix-<elem info: 1-2 chars OR FeO-T>-<column, eg %, int, err> OR a data column
        if(!id.startsWith(elemPrefix) && !id.startsWith(dataPrefix))
        {
            return "";
        }

        // Check end
        let detectorPossibilities = DataExpressionService.getPossibleDetectors();
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
        let detectorPossibilities = DataExpressionService.getPossibleDetectors();

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
        let result = PredefinedLayerPrefix+PredefinedQuantElementLayerPrefix+element+"-"+column;
        if(detector)
        {
            result += "("+detector+")";
        }
        return result;
    }
    public static makePredefinedPseudoIntensityExpression(pseudoElem: string): string
    {
        return PredefinedLayerPrefix+PredefinedPseudoIntensityLayerPrefix+pseudoElem;
    }
    public static makePredefinedQuantDataExpression(column: string, detector: string): string
    {
        let result = PredefinedLayerPrefix+PredefinedQuantDataLayerPrefix+column;
        if(detector)
        {
            result += "("+detector+")";
        }
        return result;
    }
    public static readonly predefinedUnquantifiedPercentDataExpression = PredefinedLayerPrefix+PredefinedQuantElementLayerPrefix+SuffixUnquantified;
    public static readonly predefinedRoughnessDataExpression = PredefinedLayerPrefix+PredefinedLayerRoughness;
    public static readonly predefinedDiffractionCountDataExpression = PredefinedLayerPrefix+PredefinedLayerDiffractionCounts;
    public static readonly predefinedHeightZDataExpression = PredefinedLayerPrefix+SuffixZHeight;

    public static hasPseudoIntensityExpressions(exprIds: string[]): boolean
    {
        for(let exprId of exprIds)
        {
            if(DataExpressionService.getPredefinedPseudoIntensityExpressionElement(exprId).length > 0)
            {
                return true;
            }
        }
        return false;
    }
}
