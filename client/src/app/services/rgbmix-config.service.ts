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
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { DataExpressionService } from "src/app/services/data-expression.service";


export class ChannelConfigWire
{
    constructor(
        public expressionID: string,
        public rangeMin: number,
        public rangeMax: number
    )
    {
    }
}

// We send these to the API for create/edit operations
export class RGBMixInput
{
    constructor(
        public name: string,
        public red: ChannelConfigWire,
        public green: ChannelConfigWire,
        public blue: ChannelConfigWire,
        public tags: string[] = []
    )
    {
    }
}

// What we receive
class RGBMixWire
{
    constructor(
        public name: string,
        public red: ChannelConfigWire,
        public green: ChannelConfigWire,
        public blue: ChannelConfigWire,
        public shared: boolean,
        public creator: ObjectCreator,
        public visible: boolean,
        public create_unix_time_sec: number,
        public mod_unix_time_sec,
        public tags: string[] = []
    )
    {
    }
}

// What we provide to the rest of the app
export class ChannelConfig extends ChannelConfigWire
{
    constructor(
        expressionID: string,
        rangeMin: number,
        rangeMax: number,
        public expressionName: string,
        public isCompatibleExpression: boolean
    )
    {
        super(expressionID, rangeMin, rangeMax);
    }
}

export class RGBMix
{
    private _isCompatibleWithQuantification: boolean = true;

    constructor(
        public id: string,
        public name: string,
        public red: ChannelConfig,
        public green: ChannelConfig,
        public blue: ChannelConfig,
        public shared: boolean,
        public creator: ObjectCreator,
        public visible: boolean,
        public createUnixTimeSec: number,
        public modUnixTimeSec: number,
        public tags: string[] = [],
    )
    {
    }

    get isCompatibleWithQuantification(): boolean
    {
        return this._isCompatibleWithQuantification;
    }

    updateChannelNames(exprService: DataExpressionService)
    {
        let channelExprs = [
            exprService.getExpression(this.red.expressionID),
            exprService.getExpression(this.green.expressionID),
            exprService.getExpression(this.blue.expressionID),
        ];

        let items = [
            this.red,
            this.green,
            this.blue,
        ];

        let compatibleCount = 0;
        for(let c = 0; c < channelExprs.length; c++)
        {
            items[c].expressionName = "Expression not found: "+items[c].expressionID;

            const expr = channelExprs[c];
            if(expr)
            {
                items[c].expressionName = expr.name;
                if(expr.isCompatibleWithQuantification)
                {
                    compatibleCount++;
                }
                else
                {
                    items[c].expressionName += " (Incompatible with Quant)";
                }
            }
        }

        this._isCompatibleWithQuantification = compatibleCount == channelExprs.length;
    }
}

@Injectable({
    providedIn: "root"
})
export class RGBMixConfigService
{
    private _subs = new Subscription();

    public static readonly rgbMixIDPrefix = "rgbmix-";
    public static readonly exploratoryRGBMixName = RGBMixConfigService.rgbMixIDPrefix+"runtime-exploratory";

    public static isRGBMixID(id: string): boolean
    {
        return (id.startsWith(RGBMixConfigService.rgbMixIDPrefix) || id.startsWith("shared-"+RGBMixConfigService.rgbMixIDPrefix));
    }

    private _rgbMixesUpdated$ = new ReplaySubject<void>(1);
    private _rgbMixes: Map<string, RGBMix> = new Map<string, RGBMix>();

    // One only in memory for run-time exploration
    private _rgbExploratory: RGBMix = null;
    private _rgbExploratoryVisible: boolean = true;

    constructor(
        private http: HttpClient,
        private _loadingSvc: LoadingIndicatorService,
        private _exprService: DataExpressionService // To get notified of expression list update (so we can re-run our compatibilty check)
    )
    {
        this.internalSetExploratoryRGBMix("", "", "", false);
        this.refresh();
        this.resubscribeExpressions();
    }

    // Non-dataset related subscriptions
    private resubscribeExpressions()
    {
        this._subs.add(this._exprService.expressionsUpdated$.subscribe(
            ()=>
            {
                this.updateRGBChannelExpressions();
            },
            (err)=>
            {
            },
            ()=>
            {
                this.resubscribeExpressions();
            }
        ));
    }

    get rgbMixesUpdated$(): Subject<void>
    {
        return this._rgbMixesUpdated$;
    }

    getRGBMixes(): Map<string, RGBMix>
    {
        let result = new Map<string, RGBMix>(this._rgbMixes);

        // Add the exploratory layer if exists
        if(this._rgbExploratory)
        {
            result.set(this._rgbExploratory.name, this._rgbExploratory);
        }

        return result;
    }

    private internalSetExploratoryRGBMix(redExpressionId: string, greenExpressionId: string, blueExpressionId: string, visible: boolean): void
    {
        // Get the expressions so we can get name and compatibility status
        let ids = [redExpressionId, greenExpressionId, blueExpressionId];
        let exprs = [];

        for(let id of ids)
        {
            if(id.length > 0)
            {
                exprs.push(this._exprService.getExpression(id));
            }
            else
            {
                exprs.push(null);
            }
        }

        this._rgbExploratory = new RGBMix(
            RGBMixConfigService.exploratoryRGBMixName,
            RGBMixConfigService.exploratoryRGBMixName,
            new ChannelConfig(redExpressionId, 0, 0, exprs[0] ? exprs[0].name : redExpressionId, exprs[0] ? exprs[0].isCompatibleWithQuantification : true),
            new ChannelConfig(greenExpressionId, 0, 0, exprs[1] ? exprs[1].name : redExpressionId, exprs[1] ? exprs[1].isCompatibleWithQuantification : true),
            new ChannelConfig(blueExpressionId, 0, 0, exprs[2] ? exprs[2].name : redExpressionId, exprs[2] ? exprs[2].isCompatibleWithQuantification : true),
            false,
            null,
            visible,
            0,
            0
        );
        this._rgbExploratoryVisible = visible;
    }

    setExploratoryRGBMix(redExpressionId: string, greenExpressionId: string, blueExpressionId: string, visible: boolean): void
    {
        this.internalSetExploratoryRGBMix(redExpressionId, greenExpressionId, blueExpressionId, visible);

        // Notify anyone that cares...
        this._rgbMixesUpdated$.next();
    }

    isExporatoryRGBMixVisible(): boolean
    {
        return this._rgbExploratoryVisible;
    }

    private updateRGBChannelExpressions(): void
    {
        // Run through all expressions and check their compatibility against the info we have about the quantification
        for(let rgb of this._rgbMixes.values())
        {
            rgb.updateChannelNames(this._exprService);
        }
    }

    addRGBMix(mix: RGBMixInput): Observable<void>
    {
        let loadID = this._loadingSvc.add("Saving new RGB mix...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_rgb_mix);

        return this.http.post<void>(apiURL, mix, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                }
            )
        );
    }

    editRGBMix(id: string, rgbMix: RGBMixInput): Observable<void>
    {
        let loadID = this._loadingSvc.add("Saving changed RGB mix...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_rgb_mix+"/"+id);

        return this.http.put<void>(apiURL, rgbMix, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                }
            )
        );
    }

    updateTags(id: string, tags: string[]): Observable<void>
    {
        let loadID = this._loadingSvc.add("Saving new RGB mix tags...");
        let apiURL = APIPaths.getWithHost(`${APIPaths.api_rgb_mix}/${id}`);

        let rgbMix = this._rgbMixes.get(id);
        let toSave = new RGBMixInput(rgbMix.name, rgbMix.red, rgbMix.green, rgbMix.blue, tags);
        return this.http.put<void>(apiURL, toSave, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                },
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                }
            )
        );
    }

    deleteRGBMix(id: string): Observable<void>
    {
        let loadID = this._loadingSvc.add("Deleting RGB mix...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_rgb_mix+"/"+id);
        return this.http.delete<void>(apiURL, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                }
            )
        );
    }

    shareRGBMix(id: string): Observable<string>
    {
        let loadID = this._loadingSvc.add("Sharing RGB mix...");
        let apiURL = APIPaths.getWithHost(APIPaths.api_share+"/"+APIPaths.api_rgb_mix+"/"+id);
        return this.http.post<string>(apiURL, "", makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refresh();
                }
            )
        );
    }

    refresh()
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_rgb_mix);
        this.http.get<Map<string, RGBMix>>(apiURL, makeHeaders()).subscribe(
            (resp: object /*wish this was a Map<string, RGBMixWire>*/)=>
            {
                this._rgbMixes.clear();

                for(let key of Object.keys(resp)) // This really should've been a map but it's not :( Thanks typescript/JS/angular
                //for(let [key, value] of resp)
                {
                    let value = resp[key] as RGBMixWire;
                    let toAdd = new RGBMix(
                        key,
                        value.name,
                        this.readSavedChannelConfig(value.red),
                        this.readSavedChannelConfig(value.green),
                        this.readSavedChannelConfig(value.blue),
                        value.shared,
                        value.creator,
                        value.visible,
                        value.create_unix_time_sec,
                        value.mod_unix_time_sec,
                        value.tags || []
                    );

                    this._rgbMixes.set(key, toAdd);
                }

                // Check compatibility if we happend to have loaded the quant already
                this.updateRGBChannelExpressions();

                this._rgbMixesUpdated$.next();
            },
            (err)=>
            {
                console.error("Failed to refresh element sets!");
            }
        );
    }

    private readSavedChannelConfig(cfg: ChannelConfigWire): ChannelConfig
    {
        let result = new ChannelConfig(cfg.expressionID, cfg.rangeMin, cfg.rangeMin, "", true);

        // Ensure these are a number too!
        if(!result.rangeMin)
        {
            result.rangeMin = 0;
        }
        if(!result.rangeMax)
        {
            result.rangeMax = 0;
        }

        return result;
    }
}
