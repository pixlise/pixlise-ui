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
import { MatDialog } from "@angular/material/dialog";
import { Observable, ReplaySubject, Subscription } from "rxjs";
import { tap } from "rxjs/operators";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { PredefinedROIID } from "src/app/models/roi";
import { APIPaths, makeHeaders } from "src/app/utils/api-helpers";
import { DataSetService } from "./data-set.service";
import { SelectionService } from "./selection.service";



// Data types the API expects/sends us
/*
class WireAnnotationItem
{
    constructor(
        public eV: number,
        public name: string,
        public roiID: string,
        public shared: boolean,
        public creator: ObjectCreator
    )
    {
    }
}
*/

class WireAnnotationItemInput
{
    constructor(
        public eV: number,
        public name: string,
        public roiID: string
    )
    {
    }
}

// Convenience version of the above, used by the rest of the app
export class AnnotationItem
{
    // Not sent to us containing id, it's in an obj referenced by id, but we store id here so it can be used by UI
    constructor(
        public eV: number,
        public name: string,
        public id: string,
        public roiID: string,
        public shared: boolean,
        public creator: ObjectCreator
    )
    {
    }
}


@Injectable({
    providedIn: "root"
})
export class AnnotationService
{
    private _subs = new Subscription();

    private _annotations: AnnotationItem[] = [];
    private _annotations$ = new ReplaySubject<AnnotationItem[]>(1);

    constructor(
        private http: HttpClient,
        public dialog: MatDialog,
        private _selectionService: SelectionService,
        private _datasetService: DataSetService
    )
    {
        // Fetch the intial set of lines
        this.refreshAnnotations();
    }

    private getDatasetID(): string
    {
        return this._datasetService.datasetIDLoaded;
    }

    private makeURL(ItemID: string): string
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_annotation+"/"+this.getDatasetID());
        if(ItemID != null)
        {
            apiURL += "/"+ItemID;
        }
        return apiURL;
    }

    get annotations$(): ReplaySubject<AnnotationItem[]>
    {
        return this._annotations$;
    }

    //updateAnnotations(annotations: Map<string, WireAnnotationItem>): void
    // Above is wrong... it comes in as an object, yuck
    // Note: we now take a param for preserveShared - required because some responses return annotations, but they only
    //       contain the user ones, not the shared ones (eg if user adds/edits an annotation), so we dont want to delete
    //       the shared ones in this case
    updateAnnotations(annotations: object, preserveShared: boolean): void
    {
        let preserve = [];
        if(preserveShared)
        {
            for(let annotation of this._annotations)
            {
                if(annotation.shared)
                {
                    preserve.push(annotation);
                }
            }
        }
        this._annotations = preserve;

        for(let k of Object.keys(annotations))
        {
            let annotation = annotations[k];
            let roiID = annotation.roiID;

            // TODO: Remove this eventually:
            // We originally had this as the standard way of saying no ROI is assigned:
            // export const AnnotationNoROI = "NoROI";
            // Now however more code needed a similar concept, so we have the global PredefinedROIID.AllPoints
            // and here if we load the "old" ID, we convert to the new ID, over time anything saved
            // will transition anyway
            if(roiID == "NoROI")
            {
                roiID = PredefinedROIID.AllPoints;
            }

            // The API gives us back annotations that are a bit different from what we pass around in the application:
            this._annotations.push(
                new AnnotationItem(
                    annotation.eV,
                    annotation.name,
                    k,
                    roiID,
                    annotation.shared,
                    annotation.creator
                )
            );
        }

        this._annotations$.next(this._annotations);
    }

    refreshAnnotations()
    {
        let apiURL = this.makeURL(null);
        this.http.get<object>(apiURL, makeHeaders()).subscribe(
            (resp: object)=>
            {
                // We've got a new set of annotations, update UI!
                this.updateAnnotations(resp, false); // we get a full snapshot, so don't preserve shared
            },
            (err)=>
            {
                console.error("Failed to update annotations");
            }
        );
    }

    createAnnotation(eV: number, text: string, roiID: string): Observable<object>
    {
        let body = new WireAnnotationItemInput(eV, text, roiID);

        let apiURL = this.makeURL(null);
        return this.http.post<object>(apiURL, body, makeHeaders())
            .pipe(tap((resp: object)=>
            {
                this.updateAnnotations(resp, true); // we only get back user ones, keep shared
            }
            )
            );
    }

    editAnnotation(id: string, eV: number, text: string, roiID: string): Observable<object>
    {
        // Get the ROI to save this change under
        //let roi = this.getROI();

        let body = new WireAnnotationItemInput(eV, text, roiID);

        let apiURL = this.makeURL(id);
        return this.http.put<object>(apiURL, body, makeHeaders())
            .pipe(tap((resp: object)=>
            {
                this.updateAnnotations(resp, true); // we only get back user ones, keep shared
            }
            )
            );
    }

    deleteAnnotation(id: string): Observable<void>
    {
        let apiURL = this.makeURL(id);
        return this.http.delete<void>(apiURL, makeHeaders())
            .pipe(tap(()=>
            {
                // On success, we update...
                this.refreshAnnotations();
            }
            )
            );
    }

    share(id: string): Observable<string>
    {
        let apiURL = APIPaths.getWithHost(APIPaths.api_share+"/"+APIPaths.api_annotation+"/"+this.getDatasetID()+"/"+id);
        return this.http.post<string>(apiURL, "", makeHeaders())
            .pipe(
                tap(ev=>{this.refreshAnnotations();})
            );
    }
}
