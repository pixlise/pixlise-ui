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
import { Observable, ReplaySubject, Subject, forkJoin, of } from "rxjs";
import { tap, map } from "rxjs/operators";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { QuantificationLayer, QuantModes } from "src/app/models/Quantifications";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataSetService } from "src/app/services/data-set.service";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { QuantificationService } from "src/app/services/quantification.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { DataExpression, DataExpressionId, ShortName, ExpressionExecStats, ModuleReference } from "src/app/models/Expression";
import { EXPR_LANGUAGE_LUA, EXPR_LANGUAGE_PIXLANG } from "../expression-language/expression-language";
import { environment } from "src/environments/environment";
import { LuaTranspiler } from "../expression-language/lua-transpiler";
import { DataModuleService } from "./data-module.service";
import { NotificationItem, NotificationService } from "./notification.service";
import { NotificationSubscriptions, UserOptionsService } from "./user-options.service";


class DataExpressionInput
{
    constructor(
        public name: string,
        public sourceCode: string,
        public sourceLanguage: string,
        public comments: string,
        public tags: string[] = [],
        public moduleReferences: ModuleReference[] = [],
    )
    {
    }
}

// What we receive
export class DataExpressionWire
{
    constructor(
        public id: string,
        public name: string,
        public sourceCode: string,
        public sourceLanguage: string,
        public comments: string,
        public shared: boolean,
        public creator: ObjectCreator,
        public create_unix_time_sec: number,
        public mod_unix_time_sec: number,
        public tags: string[] = [],
        public moduleReferences: ModuleReference[],
        public recentExecStats: ExpressionExecStats
    )
    {
    }

    makeExpression(id: string, moduleService: DataModuleService = null): DataExpression
    {
        let moduleReferences = this.moduleReferences || [];
        moduleReferences = moduleReferences.map((ref) => new ModuleReference(ref.moduleID, ref.version));
        let isModuleListUpToDate = true;
        let hasMinorOutdatedModuleReferences = false;
        let hasMajorOutdatedModuleReferences = false;
        if(moduleService && this.sourceLanguage === EXPR_LANGUAGE_LUA && moduleReferences.length > 0)
        {
            moduleReferences.forEach((ref) =>
            {
                if(!ref.checkIsLatest(moduleService))
                {
                    isModuleListUpToDate = false;
                    if(ref.isLatestMajorRelease)
                    {
                        hasMinorOutdatedModuleReferences = true;
                    }
                    else
                    {
                        hasMinorOutdatedModuleReferences = true;
                        hasMajorOutdatedModuleReferences = true;
                    }
                }
            });
        }

        let result = new DataExpression(
            id,
            this.name,
            this.sourceCode,
            this.sourceLanguage,
            this.comments || "",
            this.shared,
            new ObjectCreator(this.creator.name, this.creator.user_id, this.creator.email),
            this.create_unix_time_sec,
            this.mod_unix_time_sec,
            this.tags || [],
            moduleReferences,
            this.recentExecStats || null,
            isModuleListUpToDate
        );

        result.hasMinorOutdatedModuleReferences = hasMinorOutdatedModuleReferences;
        result.hasMajorOutdatedModuleReferences = hasMajorOutdatedModuleReferences;

        return result;
    }
}


@Injectable({
    providedIn: "root"
})
export class DataExpressionService
{
    private _expressionsUpdated$ = new ReplaySubject<void>(1);
    private _expressions: Map<string, DataExpression> = new Map<string, DataExpression>();

    private _elementFormulae: Set<string> = new Set<string>();
    private _validDetectors: string[] = [QuantModes.quantModeCombined];

    private _diffractionCountExpression = "";
    private _diffractionCountExpressionName = "";

    private _minorUpdatesAvailable = false;
    private _majorUpdatesAvailable = false;

    private _isSubscribedToMinorReleases = false;
    private _isSubscribedToMajorReleases = false;

    constructor(
        private _datasetService: DataSetService, // just for getting pseudointensity predefined expression ids
        private _loadingSvc: LoadingIndicatorService,
        private _moduleService: DataModuleService,
        private _notifcationService: NotificationService,
        private _userOptionsService: UserOptionsService,
        private http: HttpClient
    )
    {
        this._moduleService.refresh();

        // When the module list changes, we need to check our expressions to see if they're still up to date
        // This also ensures that we have the latest module list when we first load expressions
        this._moduleService.modulesUpdated$.subscribe(() =>
        {
            this.refreshExpressions();
        });

        this._userOptionsService.userOptionsChanged$.subscribe(() =>
        {
            this._userOptionsService.notificationSubscriptions.topics.forEach((topic) =>
            {
                if(topic.name === NotificationSubscriptions.notificationMinorModuleRelease && topic.config.method.ui)
                {
                    this._isSubscribedToMinorReleases = true;
                }
                else if(topic.name === NotificationSubscriptions.notificationMajorModuleRelease && topic.config.method.ui)
                {
                    this._isSubscribedToMajorReleases = true;
                }
            });

            // These conditionals will fire either if the expression list loaded before the user options or if there were updates 
            // available and the user toggled on the notifications. If not, we handle this when first processing the expressions.
            if(this._isSubscribedToMajorReleases && this._majorUpdatesAvailable)
            {
                this._notifcationService.addNotification("New Major Module Updates Have Been Released", false, NotificationItem.typeOutdatedModules);
                this._majorUpdatesAvailable = false;
                this._minorUpdatesAvailable = false;
            }
            else if(this._isSubscribedToMinorReleases && this._minorUpdatesAvailable)
            {
                this._notifcationService.addNotification("New Module Updates Have Been Released", false, NotificationItem.typeOutdatedModules);
                this._minorUpdatesAvailable = false;
            }
        });
    }

    get expressionsUpdated$(): Subject<void>
    {
        return this._expressionsUpdated$;
    }

    setQuantDataAvailable(elementFormulae: string[], detectors: string[]): void
    {
        this._elementFormulae.clear();
        for(let e of elementFormulae)
        {
            this._elementFormulae.add(e);
        }
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

    private refreshExpressions()
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

    private processReceivedExpressionList(receivedDataExpressions: object, deleteReceived: boolean = false): void
    {
        // This is very hacky, but some endpoints return just the JSON of the object, others
        // return a map of id->object, and others just return the ID. This is done to standardize the response.
        if(typeof receivedDataExpressions === "string" && !String(receivedDataExpressions).startsWith("{"))
        {
            receivedDataExpressions = {[receivedDataExpressions]: {}};
        }
        else if(
            receivedDataExpressions &&
            receivedDataExpressions["id"] &&
            receivedDataExpressions["name"] &&
            receivedDataExpressions["sourceCode"]
        )
        {
            receivedDataExpressions = {[receivedDataExpressions["id"]]: receivedDataExpressions};
        }

        let t0 = performance.now();

        let firstTimeProcessed = true;
        let expressionsNeedUpdating = false;
        let majorModuleVersionsOutdated = false;
        let minorModuleVersionsOutdated = false;

        // Only update changed expressions
        Object.entries(receivedDataExpressions).forEach(([id, expression]: [string, DataExpressionWire])=>
        {
            if(deleteReceived)
            {
                this._expressions.delete(id);
            }
            else
            {
                // NOTE: JS doesn't _actually_ return a DataExpressionWire
                let wireExpr = new DataExpressionWire(
                    id,
                    expression["name"],
                    expression["sourceCode"],
                    expression["sourceLanguage"],
                    expression["comments"],
                    expression["shared"],
                    expression["creator"],
                    expression["create_unix_time_sec"],
                    expression["mod_unix_time_sec"],
                    expression["tags"],
                    expression["moduleReferences"],
                    expression["recentExecStats"]
                );
                // We're passing in the module service here so we can make sure all modules are up to date
                // and cache this once
                let receivedDataExpression = wireExpr.makeExpression(id, this._moduleService);
                if(this._expressions.get(id))
                {
                    firstTimeProcessed = false;
                }
                else if(!receivedDataExpression.isModuleListUpToDate)
                {
                    expressionsNeedUpdating = true;
                    if(receivedDataExpression.hasMajorOutdatedModuleReferences)
                    {
                        majorModuleVersionsOutdated = true;
                        minorModuleVersionsOutdated = true;
                    }
                    else if(receivedDataExpression.hasMinorOutdatedModuleReferences)
                    {
                        minorModuleVersionsOutdated = true;
                    }
                }

                this._expressions.set(id, receivedDataExpression);
            }
        });

        // If this is the first time we're processing expressions and some have ouotdated modules, notify the user
        // Expressions can load quick so sometimes this is loaded before user options. If this is the case, track
        // them as needing updating and notify when the user options are loaded
        if(firstTimeProcessed && expressionsNeedUpdating)
        {
            if(majorModuleVersionsOutdated && this._isSubscribedToMajorReleases)
            {
                this._notifcationService.addNotification("New Major Module Updates Have Been Released", false, NotificationItem.typeOutdatedModules);
            }
            else if(minorModuleVersionsOutdated && this._isSubscribedToMinorReleases)
            {
                this._notifcationService.addNotification("New Module Updates Have Been Released", false, NotificationItem.typeOutdatedModules);
            }
            else if(majorModuleVersionsOutdated)
            {
                this._majorUpdatesAvailable = true;
                this._minorUpdatesAvailable = true;
            }
            else if(minorModuleVersionsOutdated)
            {
                this._minorUpdatesAvailable = true;
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

    getExpressions(): Map<string, DataExpression>
    {
        return this._expressions;
    }

    filterInvalidElements(exprIdList: string[], quantification: QuantificationLayer): string[]
    {
        const exprList = this.getAllExpressionIds(quantification);
        let newDisplayExprIds: string[] = [];

        for(let exprId of exprIdList)
        {
            if(exprList.indexOf(exprId) !== -1)
            {
                // We found a valid one, use it
                newDisplayExprIds.push(exprId);
            }
        }

        return newDisplayExprIds;
    }

    private getAllExpressionIds(quantification: QuantificationLayer): string[]
    {
        let ids = this.getPredefinedExpressionIds(quantification);
        for(let id of this._expressions.keys())
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
        const exprList = this.getAllExpressionIds(quantification);

        let result = [];

        let pseudoStarters = [];
        let elemStarters = [];

        for(let expr of exprList)
        {
            let pseudoElem = DataExpressionId.getPredefinedPseudoIntensityExpressionElement(expr);
            if(pseudoElem.length > 0)
            {
                pseudoStarters.push(expr);
            }

            let elem = DataExpressionId.getPredefinedQuantExpressionElement(expr);
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
                    complexElemExpressions.push(DataExpressionId.makePredefinedQuantElementExpression(elem, "%", det));
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

    private getPredefinedExpressionIds(quantification: QuantificationLayer): string[]
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
                result.push(DataExpressionId.makePredefinedQuantElementExpression(item, "%", det));
            }
        }

        if(this._datasetService.datasetLoaded)
        {
            items = this._datasetService.datasetLoaded.getPseudoIntensityElementsList();
            for(let item of items)
            {
                result.push(DataExpressionId.makePredefinedPseudoIntensityExpression(item));
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
            result = expr.getExpressionShortDisplayName(charLimit);
        }

        return result;
    }

    getExpression(id: string): DataExpression
    {
        // Check if it's one of the predefined expressions that we only supply to the UI for showing/hiding
        // layers on context image
        if(DataExpressionId.isPredefinedExpression(id))
        {
            return this.getPredefinedExpression(id);
        }

        return this._expressions.get(id);
    }

    getExpressionAsync(id: string): Observable<DataExpression>
    {
        let expr = this.getExpression(id);
        if(!expr)
        {
            throw new Error("Expression: "+id+" not found!");
        }

        if(expr.sourceCode.length > 0)
        {
            // We already have the text, so just return it as-is
            return of(expr);
        }

        let apiURL = `${APIPaths.getWithHost(APIPaths.api_data_expression)}/${id}`;
        return this.http.get<DataExpressionWire>(apiURL, makeHeaders())
            .pipe(
                map((expression: DataExpressionWire)=>
                {
                    // NOTE: JS doesn't _actually_ return a DataExpressionWire
                    let wireExpr = new DataExpressionWire(
                        id,
                        expression["name"],
                        expression["sourceCode"],
                        expression["sourceLanguage"],
                        expression["comments"],
                        expression["shared"],
                        expression["creator"],
                        expression["create_unix_time_sec"],
                        expression["mod_unix_time_sec"],
                        expression["tags"],
                        expression["moduleReferences"], 
                        expression["recentExecStats"]
                    );
                    let receivedDataExpression = wireExpr.makeExpression(id);
                    return receivedDataExpression;
                })
            );
    }

    private getPredefinedExpression(id: string): DataExpression
    {
        // Form the expression based on the ID passed in
        let name = "";
        let expr = "";

        // Start off with the first valid one, we do this because detector is optional on a predefined ID
        // due to backwards compatibility, so we may end up using a default
        let detectorId = this._validDetectors[0];

        let exprDetector = DataExpressionId.getPredefinedQuantExpressionDetector(id);
        if(exprDetector.length > 0)
        {
            if(this._validDetectors.indexOf(exprDetector) < 0)
            {
                // If this happens, check that it causes issues - it may not! For example, there are cases when just the name
                // of an expression is being queried and it doesn't matter that the detector specified in the id does not
                // match an valid detector - when the time comes to query it properly the detector may be specified correctly
                // in a later call!
                console.warn("Predefined expression: \""+id+"\" referenced invalid detector: \""+exprDetector+"\", valid choices: "+this._validDetectors);
            }
            detectorId = exprDetector;
        }

        let elem = DataExpressionId.getPredefinedQuantExpressionElement(id);
        if(elem.length > 0)
        {
            let column = DataExpressionId.getPredefinedQuantExpressionElementColumn(id);

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
            if(id.startsWith(DataExpressionId.predefinedUnquantifiedPercentDataExpression))
            {
                expr = "100-elementSum(\"%\",\""+detectorId+"\")";
                name = "Unquantified Weight %";
                if(detectorId != "Combined")
                {
                    name += "-"+detectorId;
                }
            }
            else if(id == DataExpressionId.predefinedHeightZDataExpression)
            {
                expr = "position(\"z\")";
                name = "Height in Z";
            }
            else if(id == DataExpressionId.predefinedRoughnessDataExpression)
            {
                expr = "roughness()";
                name = "Roughness";
            }
            else if(id == DataExpressionId.predefinedDiffractionCountDataExpression)
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
                let pseudoElem = DataExpressionId.getPredefinedPseudoIntensityExpressionElement(id);
                if(pseudoElem.length > 0)
                {
                    expr = "pseudo('"+pseudoElem+"')";
                    name = "Pseudo "+pseudoElem;
                }
                else if(id.startsWith(DataExpressionId.predefinedQuantDataExpression))
                {
                    // Now get the column (sans detector in case it's specified)
                    let idWithoutDetector = DataExpressionId.getExpressionWithoutDetector(id);

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
            EXPR_LANGUAGE_PIXLANG,
            "Built-in expression",
            false,
            null,
            0,
            0,
            [],
            [],
            null
        );

        // Run the compatibility checker on this
        result.checkQuantCompatibility(this._elementFormulae, this._validDetectors);

        return result;
    }

    cache(id: string, expr: DataExpression, name?: string): void
    {
        let receivedDataExpression = new DataExpression(
            id,
            name || expr.name,
            expr.sourceCode,
            expr.sourceLanguage,
            expr.comments || "",
            false,
            null,
            -1,
            Math.round(Date.now() / 1000),
            expr.tags || [],
            expr.moduleReferences,
            expr.recentExecStats
        );
        this._expressions.set(id, receivedDataExpression);
        this._expressionsUpdated$.next();
    }

    clearAllUnsavedFromCache(): void
    {
        this._expressions.forEach((expr, id) =>
        {
            if(id.startsWith("unsaved-"))
            {
                this._expressions.delete(id);
            }
        });
    }

    removeFromCache(id: string): void
    {
        this._expressions.delete(id);
        this._expressionsUpdated$.next();
    }

    convertToLua(id: string, saveExpression: boolean = false): Observable<object>
    {
        let expression = this.getExpressionAsync(id).pipe(
            tap(
                async (expression: DataExpression)=>
                {
                    if(!expression || expression.sourceLanguage === EXPR_LANGUAGE_LUA)
                    {
                        return;
                    }

                    let loadID = null;
                    if(saveExpression)
                    {
                        loadID = this._loadingSvc.add("Converting expression to Lua...");
                    }

                    let transpiler = new LuaTranspiler();
                    expression.sourceCode = transpiler.transpile(expression.sourceCode);
                    expression.sourceLanguage = EXPR_LANGUAGE_LUA;
                    expression.moduleReferences = [];

                    if(saveExpression)
                    {
                        await this.edit(expression.id, expression.name, expression.sourceCode, expression.sourceLanguage, expression.comments, expression.tags, expression.moduleReferences).subscribe(
                            ()=>
                            {
                                this._loadingSvc.remove(loadID);
                            },
                            (err)=>
                            {
                                alert("Error converting expression to Lua: "+err);
                                console.error("Error converting expression to Lua:", err);
                                this._loadingSvc.remove(loadID);
                            }
                        );
                    }

                    return expression;
                },
                (err)=>
                {
                    alert("Error converting expression to Lua: "+err);
                    console.error("Error converting expression to Lua:", err);
                }
            )
        );

        return expression;
    }

    add(name: string, sourceCode: string, sourceLanguage: string, comments: string, tags: string[] = []): Observable<DataExpressionWire>
    {
        let loadID = this._loadingSvc.add("Saving new expression...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_data_expression);
        let toSave = new DataExpressionInput(name, sourceCode, sourceLanguage, comments, tags);
        return this.http.post<DataExpressionWire>(apiURL, toSave, makeHeaders())
            .pipe(
                tap(
                    (resp: DataExpressionWire)=>
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

    edit(id: string, name: string, sourceCode: string, sourceLanguage: string, comments: string, tags: string[] = [], moduleReferences: ModuleReference[] = []): Observable<object>
    {
        let loadID = this._loadingSvc.add("Saving changed expression...");
        let apiURL = `${APIPaths.getWithHost(APIPaths.api_data_expression)}/${id}`;

        let toSave = new DataExpressionInput(name, sourceCode, sourceLanguage, comments, tags, moduleReferences);
        return this.http.put<object>(apiURL, toSave, makeHeaders())
            .pipe(
                tap(
                    (resp: object)=>
                    {
                        this.processReceivedExpressionList(resp);
                        this._loadingSvc.remove(loadID);
                        return resp;
                    },
                    (err)=>
                    {
                        this._loadingSvc.remove(loadID);
                    }
                )
            );
    }

    updateAllExpressions(): Observable<object[]>
    {
        let loadID = this._loadingSvc.add("Updating modules for all expressions...");

        let updatePromises: Observable<object>[] = [];
        this._expressions.forEach((expression, id) =>
        {
            if(!expression.isModuleListUpToDate)
            {
                let moduleReferences = [];
                expression.moduleReferences.forEach((moduleRef) =>
                {
                    if(!moduleRef.checkIsLatest(this._moduleService))
                    {
                        if(moduleRef.latestVersion)
                        {
                            moduleReferences.push(new ModuleReference(moduleRef.moduleID, moduleRef.latestVersion));
                        }
                        else
                        {
                            moduleReferences.push(moduleRef);
                            console.error(`Could not find latest version of module ${moduleRef.moduleID} for expression ${expression.name} (${expression.id}).`);
                        }
                    }
                    else
                    {
                        moduleReferences.push(moduleRef);
                    }
                });

                updatePromises.push(this.getExpressionAsync(id).pipe(map(
                    async (oldExpression: DataExpression)=>
                    {
                        return await this.edit(
                            oldExpression.id,
                            oldExpression.name,
                            oldExpression.sourceCode,
                            oldExpression.sourceLanguage,
                            oldExpression.comments,
                            oldExpression.tags,
                            moduleReferences
                        ).toPromise().then(
                            (response)=>
                            {
                                return response;
                            },
                            (err)=>
                            {
                                alert("Error updating expression: "+err);
                                console.error("Error updating expression:", err);
                            }
                        );
                    }
                )));
            }
        });

        return forkJoin(updatePromises).pipe(tap(
            ()=>
            {
                this._loadingSvc.remove(loadID);
            },
            (err)=>
            {
                alert("Error updating all expressions: "+err);
                this._loadingSvc.remove(loadID);
            }
        ));
    }

    updateTags(id: string, tags: string[]): Observable<object>
    {
        let loadID = this._loadingSvc.add("Saving new expression tags...");
        let apiURL = `${APIPaths.getWithHost(APIPaths.api_data_expression)}/${id}`;

        return this.getExpressionAsync(id).pipe(tap(
            async (expression: DataExpression)=>
            {
                let toSave = new DataExpressionInput(expression.name, expression.sourceCode, expression.sourceLanguage, expression.comments, tags);
                await this.http.put<object>(apiURL, toSave, makeHeaders()).toPromise().then((resp: object)=>
                {
                    this.processReceivedExpressionList(resp);
                    this._loadingSvc.remove(loadID);
                }).catch(() =>
                {
                    this._loadingSvc.remove(loadID);
                });
            })
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
                        // Response is a dictionary of deleted IDs, so we need to remove them from the list
                        this.processReceivedExpressionList(resp, true);
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

    // Call this to save runtime stats. Internally this saves them in local cache and sends to API, subscribing
    // for the result, but does nothing with it except print errors if needed
    saveExecutionStats(id: string, dataRequired: string[], runtimeMs: number): void
    {
        // Don't send for ids that are "special"
        if(
            DataExpressionId.isPredefinedExpression(id) ||
            DataExpressionId.isPredefinedNewID(id) ||
            DataExpressionId.isPredefinedQuantExpression(id) ||
            DataExpressionId.isUnsavedExpressionId(id)
            )
        {
            return;
        }

        // Check if we have a recent cache time, if so, don't send, no point flooding API with this
        let expr = this._expressions.get(id);
        let nowSec = Math.floor(Date.now() / 1000);

        if(expr && expr.recentExecStats && nowSec-expr.recentExecStats.mod_unix_time_sec < environment.expressionExecStatSaveIntervalSec)
        {
            // Don't save too often
            return;
        }

        let toSave = new ExpressionExecStats(dataRequired, runtimeMs, null);
        // Don't send blank timestamps...
        if(!toSave.mod_unix_time_sec)
        {
            delete toSave["mod_unix_time_sec"];
        }

        let apiURL = `${APIPaths.getWithHost(APIPaths.api_data_expression)}/execution-stat/${id}`;
        this.http.put<object>(apiURL, toSave, makeHeaders()).subscribe(
            (result: object)=>
            {
                // Save to our local copy at this point
                if(expr)
                {
                    let recvd = new ExpressionExecStats(result["dataRequired"], result["runtimeMs"], result["mod_unix_time_sec"]);
                    expr.recentExecStats = recvd;
                }
                else
                {
                    console.warn("Failed to find expression: "+id+" when saving execution stats. Ignored.")
                }
            },
            (err)=>
            {
                console.error(err);
            }
        );
    }
}
