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

import { HttpClient, HttpEventType, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, ReplaySubject, Subject, Subscription, throwError, of, combineLatest } from "rxjs";
import { map, mergeMap, shareReplay, tap, filter, first } from "rxjs/operators";
import { DataSetLocation } from "src/app/models/DataSet";
import { QuantificationBlessingDetails, QuantificationLayer, QuantificationSummary } from "src/app/models/Quantifications";
import { QuantificationStartOptionsComponent, QuantificationStartOptionsParams, QuantCreateParameters } from "src/app/UI/quantification-start-options/quantification-start-options.component";
import { httpErrorToString } from "src/app/utils/utils";
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { Quantification } from "src/app/protolibs/quantification_pb";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { arraysEqual, getMB } from "src/app/utils/utils";


// Returned when listing quants
class QuantListResponse
{
    constructor(
        public summaries: QuantificationSummary[],
        public blessedQuant: QuantificationBlessingDetails
    )
    {
    }
}

// API returns this when loading a quant, we then download the data from the url. Not needed to be exported!
class QuantGetResponse
{
    constructor(
        public summary: QuantificationSummary,
        public url: string
    )
    {
    }
}


class MultiQuantificationComparisonRequest
{
    constructor(
        public quantIDs: string[],
        public remainingPointsPMCs: number[]
    )
    {
    }
}

export class QuantTable
{
    constructor(
        public quantID: string,
        public quantName: string,
        public tableData: Map<string, number>,
        public totalValue: number
    )
    {
    }
}

export class MultiQuantificationComparisonResponse
{
    constructor(
        public roiID: string,
        public quantTables: QuantTable[],
    )
    {
    }
}

export class ZStackItem
{
    constructor(public roiID: string, public quantificationID: string)
    {
    }
}

export class CombineQuantificationRequest
{
    constructor(public name: string, public description: string, public roiZStack: ZStackItem[], public summaryOnly: boolean)
    {
    }
}

export class QuantCombineList
{
    constructor(public roiZStack: ZStackItem[])
    {
    }
}


export class QuantCombineSummaryItem
{
    constructor(public values: number[], public roiIDs: string[], public roiNames: string[])
    {
    }
}

export class QuantCombineSummaryResponse
{
    constructor(
        public detectors: string[],
        public weightPercents: Map<string, QuantCombineSummaryItem>,
    )
    {
    }
}

const CACHE_SIZE = 1;

@Injectable({
    providedIn: "root"
})
export class QuantificationService
{
    private _subs = new Subscription();

    //private _quantification: QuantificationLayer = null;
    private _quantifications$Loaded = new Map<string, Observable<QuantificationLayer>>();

    private _quantificationList$ = new ReplaySubject<QuantificationSummary[]>(1);
    private _lastQuantificationList: QuantificationSummary[] = [];

    // Admin view of quants is a separate list
    private _quantificationAdminList$ = new ReplaySubject<QuantificationSummary[]>(1);

    private _multiQuantZStack: ZStackItem[] = [];
    private _multiQuantZStack$ = new ReplaySubject<ZStackItem[]>();

    private _multiQuantZStackSummaryTable$ = new ReplaySubject<QuantCombineSummaryResponse>();
    private _multiQuantZStackSummaryTableSubs = new Subscription();

    private _datasetIDLoaded: string = null;

    private _cachedQuantCompare$: Observable<MultiQuantificationComparisonResponse> = null;
    private _lastQuantCompareRoiID: string = "";
    private _lastQuantIDs: string[] = [];
    private _remainingPointsPMCs: number[] = [];

    constructor(
        private http: HttpClient,
        private _loadingSvc: LoadingIndicatorService,
        public dialog: MatDialog
    )
    {
    }

    get quantificationList$(): Subject<QuantificationSummary[]>
    {
        return this._quantificationList$;
    }

    get quantificationAdminList$(): Subject<QuantificationSummary[]>
    {
        return this._quantificationAdminList$;
    }

    get multiQuantZStack$(): Subject<ZStackItem[]>
    {
        return this._multiQuantZStack$;
    }

    get multiQuantZStackSummaryTable$(): Subject<QuantCombineSummaryResponse>
    {
        return this._multiQuantZStackSummaryTable$;
    }

    notifyDatasetLoaded(datasetID: string): void
    {
        // Clear all loaded quantifications
        this._quantifications$Loaded.clear();

        // And lists
        this._quantificationList$.next([]);

        // And z-stack
        this._multiQuantZStack$.next([]);

        // And its summary table
        this.clearMultiQuantSummaryTable();

        // New dataset ID is loaded, remember it
        this._datasetIDLoaded = datasetID;

        // Refresh stuff for this new dataset
        this.refreshQuantList();
        this.refreshMultiQuantZStack();
    }

    refreshQuantList(): void
    {
        if(!this._datasetIDLoaded)
        {
            console.error("refreshQuantList before dataset ID set");
            return;
        }

        console.log("Refreshing quantification list for datasetID: "+this._datasetIDLoaded);

        // Call search API
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/"+this._datasetIDLoaded);

        this.http.get<QuantListResponse>(apiUrl, makeHeaders()).subscribe(
            (resp: QuantListResponse)=>
            {
                this._lastQuantificationList = resp.summaries;
                this._quantificationList$.next(this.makePublishable(resp.summaries, resp.blessedQuant));
            },
            (err)=>
            {
                console.error(err);
            }
        );
    }

    refreshAdminQuantList(): void
    {
        console.log("Refreshing quantification admin list");

        // Call search API
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification);

        this.http.get<QuantificationSummary[]>(apiUrl, makeHeaders()).subscribe(
            (quants: QuantificationSummary[])=>
            {
                this._quantificationAdminList$.next(this.makePublishable(quants, null));
            },
            (err)=>
            {
                console.error(err);
            }
        );
    }

    filterQuantificationsForROI(
        roiID: string,
        quantList: QuantificationSummary[],
        statusFilter: string,
        allowROILessQuants: boolean,
        allowMultiQuants: boolean
    ): QuantificationSummary[]
    {
        let result: QuantificationSummary[] = [];

        // Standardise for nulls & stuff
        if(!roiID)
        {
            roiID = "";
        }

        // Only show quants for this ROI (All points ROI is a special case, because old/test quants
        // won't have an ROI set so we consider them to be for the all points ROI for now)
        // TODO: Remove the hack allowing quants without ROI to show up on all points...
        for(let quant of quantList)
        {
            // Check each item separately, cleaner/more readable
            if(quant.status != statusFilter)
            {
                continue; // Wrong filter
            }

            if(
                (!PredefinedROIID.isPredefined(roiID) || quant.params.roiID.length > 0) &&
                roiID != quant.params.roiID &&
                (!allowROILessQuants || quant.params.roiID.length > 0)
            )
            {
                continue;
            }

            if(!allowMultiQuants && quant.jobId.indexOf("multi_") >= 0)
            {
                continue; // Caller doesn't want multi quants, and this is one
            }

            result.push(quant);
        }

        return result;
    }

    private makePublishable(quants: QuantificationSummary[], blessedQuant: QuantificationBlessingDetails): QuantificationSummary[]
    {
        // Sort it so we don't get stuff shuffling around on the UI
        let sortedQuants = quants.sort((q1: QuantificationSummary, q2: QuantificationSummary) => 
        {
            if(q1.params.startUnixTime < q2.params.startUnixTime) 
            {
                return 1;
            }

            if(q1.params.startUnixTime > q2.params.startUnixTime) 
            {
                return -1;
            }

            return 0;
        });

        // Attach bless details if we have them
        if(blessedQuant)
        {
            for(let quant of sortedQuants)
            {
                if(quant.jobId == blessedQuant.jobId)
                {
                    quant.blessDetails = blessedQuant;
                }
                else
                {
                    quant.blessDetails = null;
                }
            }
        }

        return sortedQuants;
    }

    getQuantification(quantID: string): Observable<QuantificationLayer>
    {
        // check if it's already been requested... if not, request
        // See: https://blog.thoughtram.io/angular/2018/03/05/advanced-caching-with-rxjs.html
        let existing = this._quantifications$Loaded.get(quantID);
        if(!existing)
        {
            this._quantifications$Loaded.set(quantID,
                this.requestQuantification(quantID).pipe(
                    shareReplay(CACHE_SIZE)
                )
            );

            existing = this._quantifications$Loaded.get(quantID);
        }

        // Just return the one already loaded
        return existing;
    }

    private requestQuantification(quantID: string): Observable<QuantificationLayer>
    {
        // Find the name of this quant to show on loading dialog... if we don't have it, we just use the quant ID
        let quantName = this.getCachedQuantName(quantID);
        if(!quantName)
        {
            quantName = quantID;
        }

        let loadID = this._loadingSvc.add("Quantification Summary");

        // Simple function to request/download a quantification
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/"+this._datasetIDLoaded+"/"+quantID);
        return this.http.get<QuantGetResponse>(apiUrl, makeHeaders()).pipe(
            // First, load summary...
            mergeMap(
                (resp: QuantGetResponse)=>
                {
                    this._loadingSvc.update(loadID, "Quantification Data...");

                    // We now load the actual quant data using the URL from summary, but we want both results available later...
                    return combineLatest(
                        of(resp),
                        this.http.request("GET", resp.url, {
                            observe: "events",
                            reportProgress: true,
                            responseType: "arraybuffer"
                        })
                    );
                }
            ),
            // Keep listening for any updates, we pick off progress events to pass to loading service for display
            tap(
                ([resp, event])=>
                {
                    if(event.type === HttpEventType.DownloadProgress)
                    {
                        this._loadingSvc.update(loadID, "Quantification Data "+getMB(event.loaded)+" / "+getMB(event.total));
                    }
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                    console.error(err);
                }
            ),
            // We want to end up with only one observable completion event, that being the downloaded HTTP response
            filter(([resp, event])=>{ return event.type === HttpEventType.Response; }),
            // Decode the returned bytes and pass that out
            map(
                ([resp, event])=>
                {
                    // Redundant, already sorted by the filter... But doesn't compile otherwise?
                    if(event.type !== HttpEventType.Response)
                    {
                        throw throwError("Expected response as last event from quant download");
                    }

                    this._loadingSvc.remove(loadID);

                    // Decode the incoming data array
                    const data = new Uint8Array(event.body);
                    console.log("  Loaded quantification: "+quantID+", size: "+getMB(data.length));

                    let decoded = Quantification.deserializeBinary(data);
                    let quantification = new QuantificationLayer(quantID, resp.summary, decoded);
                    return quantification;
                }
            )
        );
    }

    private getCachedQuantName(quantID: string): string
    {
        for(let summary of this._lastQuantificationList)
        {
            if(summary.jobId == quantID)
            {
                return summary.params.name;
            }
        }

        return null;
    }

    createQuantification(params: QuantCreateParameters): Observable<string>
    {
        //console.log('create quantification called with parameters:');
        //console.log(params);

        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/"+this._datasetIDLoaded);
        return this.http.post<string>(apiUrl, params, makeHeaders());
    }

    deleteQuantification(quantID: string): Observable<void>
    {
        let loadID = this._loadingSvc.add("Deleting quantification...");
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/"+this._datasetIDLoaded+"/"+quantID);
        return this.http.delete<void>(apiUrl, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    shareQuantification(quantID: string): Observable<string>
    {
        let loadID = this._loadingSvc.add("Sharing quantification...");
        let apiUrl = APIPaths.getWithHost(APIPaths.api_share+"/"+APIPaths.api_quantification+"/"+this._datasetIDLoaded+"/"+quantID);
        return this.http.post<string>(apiUrl, "", makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                },
                (err)=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    getQuantificationLog(quantID: string, logName: string): Observable<string>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/log/download/"+this._datasetIDLoaded+"/"+quantID+"/"+logName);

        const httpOptions = {
            headers: new HttpHeaders({
                "Content-Type":  "text/plain",
            }),
            responseType: "text" as "json"
        };

        return this.http.get<string>(apiUrl, httpOptions);
    }

    blessQuantification(quantID: string): Observable<void>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/bless/"+this._datasetIDLoaded+"/"+quantID);
        return this.http.post<void>(apiUrl, "", makeHeaders());
    }

    publishQuantification(quantID: string): Observable<void>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/publish/"+this._datasetIDLoaded+"/"+quantID);
        return this.http.post<void>(apiUrl, "", makeHeaders());
    }

    // Converts quantification columns to a nicer printable name, eg % becomes Weight %, int becomes Int.
    public static getPrintableColumnName(column: string): string
    {
        if(column == "%")
        {
            return "Weight %";
        }
        if(column == "int")
        {
            return "Int.";
        }
        if(column == "err")
        {
            return "Err.";
        }

        // If we don't have anything better to call it, use the column name as is
        return column;
    }

    uploadQuantificationCSV(name: string, comments: string, csvFileData: File): Observable<void>
    {
        // Seems file interface with onload/onerror functions is still best implemented wrapped in a new Observable
        return new Observable<void>(
            (observer)=>
            {
                let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/upload/"+this._datasetIDLoaded);

                // If comments have new lines, encode them
                let body = "Name="+name+"\nComments=";
                body += encodeURIComponent(comments)+"\nCSV\n";

                // Now dump CSV contents into body
                let self = this;

                let fr = new FileReader();
                fr.onload = function(e) 
                {
                    body += fr.result;

                    // We now have the whole body, send it up
                    self.http.post<string>(apiUrl, body, makeHeaders()).subscribe(
                        ()=>
                        {
                            // New quant is there, should be on our list of selectable quants then
                            self.refreshQuantList();

                            observer.next();
                            observer.complete();
                        },
                        (err)=>
                        {
                            observer.error(err);
                        }
                    );
                };

                fr.onerror = function(e) 
                {
                    observer.error("Failed to read CSV for upload");
                };

                fr.readAsText(csvFileData);
            }
        );
    }

    compareQuantificationsForROI(roiID: string, quantIDs: string[], remainingPointsPMCs: number[]): Observable<MultiQuantificationComparisonResponse>
    {
        if(
            !this._cachedQuantCompare$ ||
            this._lastQuantCompareRoiID != roiID ||
            !arraysEqual(this._lastQuantIDs, quantIDs) ||
            !arraysEqual(this._remainingPointsPMCs, remainingPointsPMCs)
        )
        {
            this._cachedQuantCompare$ = this.requestCompareQuantificationsForROI(roiID, quantIDs, remainingPointsPMCs).pipe(shareReplay(1));
            this._lastQuantCompareRoiID = roiID;
            this._lastQuantIDs = Array.from(quantIDs);
            this._remainingPointsPMCs = Array.from(remainingPointsPMCs);
        }

        return this._cachedQuantCompare$;
    }

    private requestCompareQuantificationsForROI(roiID: string, quantIDs: string[], remainingPointsPMCs: number[]): Observable<MultiQuantificationComparisonResponse>
    {
        let req = new MultiQuantificationComparisonRequest(quantIDs, remainingPointsPMCs);
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/comparison-for-roi/"+this._datasetIDLoaded+"/"+roiID);
        return this.http.post<object>(apiUrl, req, makeHeaders()).pipe(
            map((result: object)=>
            {
                let tables: QuantTable[] = [];
                for(let table of result["quantTables"])
                {
                    // Get the elements and sort them
                    let elemKeys = Object.keys(table["elementWeights"]).sort();

                    let elemWeights: Map<string, number> = new Map<string, number>();
                    let total = 0;
                    for(let key of elemKeys)
                    {
                        // Snip off the _% (if exists)
                        let elem = key;
                        if(elem.endsWith("_%"))
                        {
                            elem = key.substring(0, key.length-2);
                        }

                        let value = table["elementWeights"][key];
                        total += value;
                        elemWeights.set(elem, value);
                    }

                    tables.push(new QuantTable(table["quantID"], table["quantName"], elemWeights, total));
                }

                // Sort the tables so we have increasing totals
                tables.sort((a: QuantTable, b: QuantTable)=>
                {
                    if(a.totalValue < b.totalValue) return -1;
                    else if(a.totalValue > b.totalValue) return 1;
                    return 0;
                }
                );

                return new MultiQuantificationComparisonResponse(
                    result["roiID"],
                    tables
                );
            }
            )
        );
    }

    combineMultipleQuantifications(name: string, description: string, zStack: ZStackItem[]): Observable<string>
    {
        let req = new CombineQuantificationRequest(name, description, zStack, false);
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/combine/"+this._datasetIDLoaded);
        return this.http.post<string>(apiUrl, req, makeHeaders()).pipe(
            // New quant is there, should be on our list of selectable quants then
            tap(()=>{this.refreshQuantList();})
        );                  
    }

    private generateSummaryForCombiningMultipleQuantifications(zStack: ZStackItem[]): Observable<QuantCombineSummaryResponse>
    {
        let req = new CombineQuantificationRequest("", "", zStack, true);

        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/combine/"+this._datasetIDLoaded);
        return this.http.post<QuantCombineSummaryResponse>(apiUrl, req, makeHeaders()).pipe(
            map((item: object)=>
            {
                let result = new QuantCombineSummaryResponse(item["detectors"], new Map<string, QuantCombineSummaryItem>());
                let weightPercents = item["weightPercents"];

                for(let key of Object.keys(weightPercents))
                {
                    let itemRead = weightPercents[key];
                    let item: QuantCombineSummaryItem = new QuantCombineSummaryItem(
                        itemRead["values"],
                        itemRead["roiIDs"],
                        itemRead["roiNames"]
                    );
                    result.weightPercents.set(key, item);
                }
                return result;
            }
            )
        );                  
    }

    private regenerateMultiQuantSummaryTable(): void
    {
        // Cancel any we've been waiting for
        this._multiQuantZStackSummaryTableSubs.unsubscribe();
        this._multiQuantZStackSummaryTableSubs = new Subscription();

        // If our z-stack is not valid enough to make a table from, stop here
        if(!this.isValidZStack(this._multiQuantZStack))
        {
            this.clearMultiQuantSummaryTable();
            return;
        }

        this._multiQuantZStackSummaryTable$.next(null);

        // Refresh from API. Note we store the subscription here because if we get another request
        // we don't want the old one to still be pending
        this._multiQuantZStackSummaryTableSubs.add(this.generateSummaryForCombiningMultipleQuantifications(this._multiQuantZStack).subscribe(
            (summary: QuantCombineSummaryResponse)=>
            {
                // Publish to UI
                this._multiQuantZStackSummaryTable$.next(summary);
            },
            (err)=>
            {
                // Create a new subject because this one is about to get nuked and if anything resubscribes, we want them subscribing to the new one
                let currSubs = this._multiQuantZStackSummaryTable$;
                this._multiQuantZStackSummaryTable$ = new ReplaySubject<QuantCombineSummaryResponse>();

                currSubs.error(err);
            }
        ));
    }

    private clearMultiQuantSummaryTable(): void
    {
        this._multiQuantZStackSummaryTable$.next(new QuantCombineSummaryResponse([], new Map<string, QuantCombineSummaryItem>()));
    }

    private isValidZStack(zStack: ZStackItem[]): boolean
    {
        if(zStack.length <= 1)
        {
            // Has to have more than 1 ROI
            return false;
        }

        // All ROIs need a quant ID
        for(let z of zStack)
        {
            if(!z.quantificationID)
            {
                return false;
            }
        }

        return true;
    }

    private refreshMultiQuantZStack(): void
    {
        if(!this._datasetIDLoaded)
        {
            console.error("refreshMultiQuantZStack before dataset ID set");
            return;
        }

        console.log("Refreshing multi-quant z-stack for datasetID: "+this._datasetIDLoaded);

        // Call search API
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/combine-list/"+this._datasetIDLoaded);

        this.http.get<QuantCombineList>(apiUrl, makeHeaders()).subscribe(
            (resp: QuantCombineList)=>
            {
                // Copy to our items, just so there's no misunderstandings
                this._multiQuantZStack = [];
                for(let item of resp.roiZStack)
                {
                    this._multiQuantZStack.push(new ZStackItem(item.roiID, item.quantificationID));
                }

                this._multiQuantZStack$.next(this._multiQuantZStack);

                // NOTE: we refresh the summary table at this point. The other time is when we upload a z-stack to API
                // as the assumption is that it has changed...
                this.regenerateMultiQuantSummaryTable();
            },
            (err)=>
            {
                console.error(err);
            }
        );
    }

    saveMultiQuantZStack(zStack: ZStackItem[]): void
    {
        if(!this._datasetIDLoaded)
        {
            console.error("refreshMultiQuantZStack before dataset ID set");
            return;
        }

        console.log("Refreshing multi-quant z-stack for datasetID: "+this._datasetIDLoaded);

        // Call search API
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/combine-list/"+this._datasetIDLoaded);

        let toSave = new QuantCombineList(zStack);

        this.http.post<void>(apiUrl, toSave, makeHeaders()).subscribe(
            ()=>
            {
                this._multiQuantZStack = zStack;
                this._multiQuantZStack$.next(this._multiQuantZStack);

                // Request a new table too
                this.regenerateMultiQuantSummaryTable();
            },
            (err)=>
            {
                console.error(err);
            }
        );
    }

    get multiQuantZStack(): ZStackItem[]
    {
        return this._multiQuantZStack;
    }

    // Run through all regions added, work out how many PMCs (with spectra) are NOT in any added ROI
    getRemainingPMCs(locationPointCache: DataSetLocation[], rois: Map<string, ROISavedItem>): number[]
    {
        let result: number[] = [];

        // No ROIs yet, don't consider these "remaining"
        if(this._multiQuantZStack.length <= 0 || !rois)
        {
            return result;
        }

        // Make a map containing ALL pmcs
        let pmcsRemaining: Map<number, boolean> = new Map<number, boolean>();
        let locs = locationPointCache;

        for(let loc of locs)
        {
            if(loc.hasNormalSpectra)
            {
                pmcsRemaining.set(loc.PMC, true);
            }
        }

        // Remove the ones used by each ROI
        for(let zItem of this._multiQuantZStack)
        {
            let roi = rois.get(zItem.roiID);
            if(roi)
            {
                for(let locIdx of roi.locationIndexes)
                {
                    if(locIdx >= 0 && locIdx < locs.length)
                    {
                        let loc = locs[locIdx];
                        if(loc && loc.hasNormalSpectra)
                        {
                            pmcsRemaining.set(loc.PMC, false);
                        }
                    }
                }
            }
        }

        // Now get all the ones marked remaining
        for(let [pmc, remaining] of pmcsRemaining.entries())
        {
            if(remaining)
            {
                result.push(pmc);
            }
        }

        return result;
    }

    showQuantificationDialog(
        defaultCommand: string,
        atomicNumbers: Set<number>,
    ): Observable<QuantCreateParameters>
    {
        // Show the confirmation dialog
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        dialogConfig.data = new QuantificationStartOptionsParams(
            defaultCommand,
            atomicNumbers
        );

        const dialogRef = this.dialog.open(QuantificationStartOptionsComponent, dialogConfig);

        return dialogRef.afterClosed();
    }

    getPiquantLastCommandOutput(command: string, file: string): Observable<string>
    {
        let apiUrl = APIPaths.getWithHost(APIPaths.api_quantification+"/last/download/"+this._datasetIDLoaded+"/"+command+"/"+file);

        const httpOptions = {
            headers: new HttpHeaders({
                "Content-Type":  "text/plain",
            }),
            responseType: "text" as "json"
        };

        return this.http.get<string>(apiUrl, httpOptions);
    }
}
