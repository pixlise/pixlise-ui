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
import { Observable, ReplaySubject, Subscription } from "rxjs";

import { tap } from "rxjs/operators";
import { DataSet } from "src/app/models/DataSet";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { arraysEqual, httpErrorToString } from "src/app/utils/utils";
import { DataSetService } from "./data-set.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { ItemTag, ItemTagWire } from "../models/tags";

@Injectable({ providedIn: "root" })
export class TaggingService
{
    private _subs = new Subscription();
    private _tags$ = new ReplaySubject<Map<string, ItemTag>>();
    private _lastTagsLookup: Map<string, ItemTag> = null;
    private _lastTagsLookupDatasetID: string = "";

    constructor(
        private http: HttpClient,
        private _datasetService: DataSetService,
        private _loadingSvc: LoadingIndicatorService
    )
    {
        this.resubscribeDataset();
    }

    get tags$(): ReplaySubject<Map<string, ItemTag>>
    {
        return this._tags$;
    }

    private resubscribeDataset()
    {
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                if(dataset)
                {
                    this.refreshTagList();
                }
                else
                {
                    // Dataset cleared, clear tags
                    this._tags$.next(new Map<string, ItemTag>());
                }
            },
            ()=>null,
            ()=>
            {
                this.resubscribeDataset();
            }
        ));
    }

    private makeURL(id: string = null): string
    {
        let datasetID = this.getDatasetID();
        return APIPaths.getWithHost(`${APIPaths.api_tags}/${datasetID}${id ? "/" + id : ""}`);
    }

    private getDatasetID(): string
    {
        return this._datasetService.datasetIDLoaded;
    }

    private areLookupsEqual(a: Map<string, ItemTag>, b: Map<string, ItemTag>): boolean
    {
        if(!a && b || a && !b)
        {
            return false;
        }

        if(a && b)
        {
            // Check keys
            let aKeys = Array.from(a.keys());
            if(!arraysEqual(aKeys, Array.from(b.keys())))
            {
                return false;
            }

            // Both have the same keys, so now compare them one-by-one
            for(let key of aKeys)
            {
                let aItem = a.get(key);
                let bItem = b.get(key);

                if(!aItem && bItem || aItem && !bItem)
                {
                    return false;
                }

                if(!ItemTag.equals(aItem, bItem))
                {
                    return false;
                }
            }
        }

        return true;
    }

    refreshTagList()
    {
        let datasetID = this.getDatasetID();
        if(datasetID !== this._lastTagsLookupDatasetID)
        {
            // Clear our cache because new dataset ID loading
            this._lastTagsLookup = null;
        }

        this.http.get<Map<string, ItemTagWire>>(this.makeURL(), makeHeaders()).subscribe((response: Map<string, ItemTagWire>)=>
        {
            let tags = new Map<string, ItemTag>();
            Object.entries(response).forEach(([tagID, tag]) =>
            {
                let fullTag = new ItemTag(tag.id, tag.name, tag.creator, new Date(tag.dateCreated * 1000), tag.type);
                tags.set(tagID, fullTag);
            });

            // If this matches what we last sent out, ignore it
            if(this.areLookupsEqual(this._lastTagsLookup, tags))
            {
                return; // don't update, we just got sent the same tag list
            }

            // Remember this for next time
            this._lastTagsLookup = tags;
            this._lastTagsLookupDatasetID = datasetID;
            this._tags$.next(tags);
        },
        (err)=>
        {
            console.error(httpErrorToString(err, "Failed to refresh tags"));
            this._tags$.next(new Map<string, ItemTag>());
        }
        );
    }

    createNewTag(name: string, type: string): Observable<{ id: string; }>
    {
        let loadID = this._loadingSvc.add("Saving new Tag...");

        let itemWire = new ItemTagWire(null, name, null, null, type);
        return this.http.post<{ id: string; }>(this.makeURL(), itemWire, makeHeaders()).pipe(
            tap(
                (tagID: { id: string; })=>
                {
                    this.refreshTagList();
                    this._loadingSvc.remove(loadID);
                    return tagID;
                },
                (err)=>
                {
                    console.error("Error occurred saving Tag", err);
                    this._loadingSvc.remove(loadID);
                    return null;
                }
            )
        );
    }

    delete(id: string): Observable<void | ArrayBuffer> 
    {
        let loadID = this._loadingSvc.add("Deleting Tag...");
        let apiURL = this.makeURL(id);
        return this.http.delete<void>(apiURL, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                },
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }
}