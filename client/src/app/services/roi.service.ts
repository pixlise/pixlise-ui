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
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, ReplaySubject, Subscription, of } from "rxjs";

import { tap, switchMap, map } from "rxjs/operators";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { DataSet } from "src/app/models/DataSet";
import { MistROIItem, ROIItem, ROISavedItem } from "src/app/models/roi";
import { UserPromptDialogComponent, UserPromptDialogParams, UserPromptDialogResult, UserPromptDialogStringItem } from "src/app/UI/atoms/user-prompt-dialog/user-prompt-dialog.component";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { arraysEqual, httpErrorToString } from "src/app/utils/utils";
import { DataSetService } from "./data-set.service";
import { ViewStateService } from "./view-state.service";
import { LoadingIndicatorService } from "src/app/services/loading-indicator.service";


export class ROISavedItemWire
{
    constructor(
        public name: string,
        public description: string,
        public locationIndexes: number[],
        public imageName: string,
        public pixelIndexes: number[],
        public shared: boolean,
        public creator: ObjectCreator,
        public tags: string[],
        public mistROIItem: MistROIItem = null,
        public create_unix_time_sec: number,
        public mod_unix_time_sec: number,
    )
    {
    }
}

export class ROIReference
{
    constructor(
        public id: string,
        public roi: ROIItem
    )
    {
    }
}



@Injectable({
    providedIn: "root"
})
export class ROIService
{
    private _subs = new Subscription();
    private _roi$ = new ReplaySubject<Map<string, ROISavedItem>>(1);
    private _lastROILookup: Map<string, ROISavedItem> = null;
    private _lastROILookupDatasetID: string = "";

    constructor(
        private http: HttpClient,
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
        private _loadingSvc: LoadingIndicatorService
    )
    {
        this.resubscribeDataset();
    }

    get roi$(): ReplaySubject<Map<string, ROISavedItem>>
    {
        return this._roi$;
    }

    private resubscribeDataset()
    {
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                if(dataset)
                {
                    this.refreshROIList();
                }
                else
                {
                    // Dataset cleared, clear ROIs
                    this._roi$.next(new Map<string, ROISavedItem>());
                }
            },
            ()=>null,
            ()=>
            {
                this.resubscribeDataset();
            }
        ));
    }

    private makeURL(datasetID: string, ROIName: string): string
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_roi+"/"+datasetID);
        if(ROIName != null)
        {
            apiURL += "/"+ROIName;
        }
        return apiURL;
    }

    private getDatasetID(): string
    {
        return this._datasetService.datasetIDLoaded;
    }

    private areROILookupsEqual(a: Map<string, ROISavedItem>, b: Map<string, ROISavedItem>): boolean
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

                if(!ROISavedItem.equals(aItem, bItem))
                {
                    return false;
                }
            }
        }

        return true;
    }

    refreshROIList()
    {
        let datasetID = this.getDatasetID();
        if(datasetID !== this._lastROILookupDatasetID)
        {
            // Clear our cache because new dataset ID loading
            this._lastROILookup = null;
        }

        let apiURL = this.makeURL(datasetID, null);
        this.http.get<Map<string, ROISavedItemWire>>(apiURL, makeHeaders()).subscribe((response: Map<string, ROISavedItemWire>)=>
        {
            let rois: Map<string, ROISavedItem> = new Map<string, ROISavedItem>();
            Object.entries(response).forEach(([roiID, roi]) =>
            {
                let mistROI = null;
                if(roi.mistROIItem && roi.mistROIItem?.ClassificationTrail.length > 0)
                {
                    mistROI = new MistROIItem(
                        roi.mistROIItem.species,
                        roi.mistROIItem.mineralGroupID,
                        roi.mistROIItem.ID_Depth,
                        roi.mistROIItem.ClassificationTrail,
                        roi.mistROIItem.formula
                    );
                }
                rois.set(roiID,
                    new ROISavedItem(
                        roiID,
                        roi.name,
                        roi.locationIndexes,
                        roi["description"] || "",
                        roi["imageName"] || "",
                        new Set<number>(roi["pixelIndexes"] || []),
                        roi.shared,
                        roi.creator,
                        mistROI,
                        roi.tags || [],
                        this._lastROILookup ? this._lastROILookup[roiID]?.visible : false,
                        roi.create_unix_time_sec,
                        roi.mod_unix_time_sec,
                    )
                );
            });

            // At this point we know the view state would've loaded already (we're only loaded once a dataset finishes loading, and that
            // only finishes after the view state arrives). Therefore here we can tell the view state service what ROI IDs are valid, so
            // it can delete ROI colours stored for old IDs. They're loaded as a map and are otherwise harmless (maybe a few warning msgs
            // go to the console), but we don't want them growing forever.
            // If this happens multiple times at runtime (if we're not just refreshing after a dataset load but for another reason), it's fine!
            this._viewStateService.notifyValidROIIDs(Array.from(rois.keys()));

            // If this matches what we last sent out, ignore it
            if(this.areROILookupsEqual(this._lastROILookup, rois))
            {
                return; // don't update, we just got sent the same ROI list
            }

            // Remember this for next time
            this._lastROILookup = rois;
            this._lastROILookupDatasetID = datasetID;
            this._roi$.next(rois);
        },
        (err)=>
        {
            console.error(httpErrorToString(err, "Failed to refresh ROIs"));

            // Still need to notify out otherwise things break because widget region data service will wait indefinitely for this...
            this._roi$.next(new Map<string, ROISavedItem>());
        }
        );
    }

    setROIVisibility(roiID: string, visibility: boolean): void
    {
        let rois = new Map<string, ROISavedItem>(this._lastROILookup);
        rois.get(roiID).visible = visibility;
        this._lastROILookup = rois;
        this._roi$.next(rois);
    }

    // Normally trying to keep UI out of these services, but this is called from several places
    // so made an exception.
    // This presents the "save selection as ROI" dialog, allowing users to either overwrite an ROI
    // or create a new one from scratch
    makeROI(locationIndexes: Set<number>, pixelIndexes: Set<number>, imageName: string, dialog: MatDialog): Observable<boolean>
    {
        if(locationIndexes.size <= 0 && pixelIndexes.size <= 0)
        {
            alert("Selection is empty!");
            return of(false);
        }

        if(pixelIndexes.size > 0 && !imageName)
        {
            alert("No image name for selected pixels!");
            return of(false);
        }

        // Show dialog to ask where to save this selection (user may create a new ROI or select
        // an existing one)

        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new UserPromptDialogParams(
            "Save Selection as ROI",
            "Save",
            "Cancel",
            [
                new UserPromptDialogStringItem(
                    "Name",
                    (val: string)=>{return val.length > 0;}
                ),
                new UserPromptDialogStringItem(
                    "Description",
                    ()=>true
                ),
            ],
            false,
            null,
            ()=>null,
            null,
            true,
            ["roi"]
        );

        const dialogRef = dialog.open(UserPromptDialogComponent, dialogConfig);

        return dialogRef.afterClosed().pipe(
            switchMap(
                (result: UserPromptDialogResult)=>
                {
                    // User might have cancelled
                    if(!result)
                    {
                        return of(false);
                    }

                    let roiName = result.enteredValues.get("Name");

                    let toSave = new ROIItem(roiName, Array.from(locationIndexes), result.enteredValues.get("Description"), imageName, Array.from(pixelIndexes), null, result.tags);
                    return this.add(toSave);
                }
            ),
            map(
                ()=>
                {
                    this.refreshROIList();
                    return true;
                },
                (err)=>
                {
                    console.error(err);
                    this.refreshROIList();
                }
            )
        );
    }

    add(item: ROIItem): Observable<void>
    {
        let loadID = this._loadingSvc.add("Saving new ROI...");
        let apiURL = this.makeURL(this.getDatasetID(), null); 

        return this.http.post<void>(apiURL, item, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                },
                (err)=>
                {
                    console.error("Error occurred saving ROI", err);
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    bulkAdd(roiItems: ROIItem[], overwrite: boolean = false, skipDuplicates: boolean = false, deleteExistingMistROIs: boolean = false, shareROIs: boolean = false): Observable<void | unknown[]>
    {
        let loadID = this._loadingSvc.add(`Saving ${roiItems.length} new ROIs...`);
        let apiURL = this.makeURL(this.getDatasetID(), "bulk"); 

        return this.http.post<void>(apiURL, { roiItems, overwrite, skipDuplicates, deleteExistingMistROIs, shareROIs }, makeHeaders()).pipe(
            tap(
                () =>
                {
                    this.refreshROIList();
                    this._loadingSvc.remove(loadID);
                },
                (err) =>
                {
                    console.error("Error occurred bulk saving ROIs", err);
                    this.refreshROIList();
                    this._loadingSvc.remove(loadID);
                }   
            )
        );
    }

    bulkUpdate(roiReferences: ROIReference[])
    {
        let loadID = this._loadingSvc.add(`Saving ${roiReferences.length} changed ROIs...`);
        let apiURL = this.makeURL(this.getDatasetID(), "bulk");
        return this.http.put<void>(apiURL, roiReferences, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this.refreshROIList();
                    this._loadingSvc.remove(loadID);
                },
                ()=>
                {
                    this.refreshROIList();
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    update(id: string, item: ROIItem): Observable<void>
    {
        let loadID = this._loadingSvc.add("Saving changed ROI...");
        let apiURL = this.makeURL(this.getDatasetID(), id);
        return this.http.put<void>(apiURL, item, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this.refreshROIList();
                    this._loadingSvc.remove(loadID);
                },
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    tag(id: string, tags: string[]): Observable<void>
    {
        let item = this._lastROILookup.get(id);
        let roi = new ROIItem(item.name, item.locationIndexes, item.description, item.imageName, Array.from(item.pixelIndexes), item.mistROIItem, tags);

        // If the ID is available, then we should already have the roi in the lookup
        if(!roi)
        {
            console.error("Could not find ROI with ID", id);
            return of(null);
        }

        roi.tags = tags;
        let loadID = this._loadingSvc.add("Saving changed ROI...");
        let apiURL = this.makeURL(this.getDatasetID(), id);
        return this.http.put<void>(apiURL, roi, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this.refreshROIList();
                    this._loadingSvc.remove(loadID);
                },
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }
    
    bulkDelete(ids: string[]): Observable<void | ArrayBuffer>
    {
        let loadID = this._loadingSvc.add(`Deleting ${ids.length} ROIs...`);
        let apiURL = this.makeURL(this.getDatasetID(), "bulk");
        return this.http.request<void>("delete", apiURL, { body: { ids }, ...makeHeaders() }).pipe(
            tap(
                ()=>
                {
                    this.refreshROIList();
                    this._loadingSvc.remove(loadID);
                },
                (err)=>
                {
                    this.refreshROIList();
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    del(id: string): Observable<void | ArrayBuffer>
    {
        let loadID = this._loadingSvc.add("Deleting ROI...");
        let apiURL = this.makeURL(this.getDatasetID(), id);

        return this.http.delete<void>(apiURL, makeHeaders()).pipe(
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

    bulkShare(roiReferences: ROIReference[])
    {
        let loadID = this._loadingSvc.add(`Sharing ${roiReferences.length} ROIs...`);
        let apiURL = APIPaths.getWithHost(`${APIPaths.api_share}/${APIPaths.api_roi}/${this.getDatasetID()}/bulk`);
        return this.http.post<string>(apiURL, roiReferences, makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshROIList();
                },
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }

    share(id: string): Observable<string>
    {
        let loadID = this._loadingSvc.add("Sharing ROI...");
        let apiURL = APIPaths.getWithHost(`${APIPaths.api_share}/${APIPaths.api_roi}/${this.getDatasetID()}/${id}`);
        return this.http.post<string>(apiURL, "", makeHeaders()).pipe(
            tap(
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                    this.refreshROIList();
                },
                ()=>
                {
                    this._loadingSvc.remove(loadID);
                }
            )
        );
    }
}
