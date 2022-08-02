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


// This service is mainly for bringing up the export dialog easily from code. Several places in the UI have
// to do this so it made sense to bring it up from one place. When the callback happens and user response
// is ready, the caller can do the export task as chosen by user

import { HttpClient, HttpResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ExportDataChoice, ExportGenerator } from "src/app/UI/export-data-dialog/export-models";
import { showExportDialog } from "src/app/UI/export-data-dialog/show-export-dialog";
import { APIPaths } from "src/app/utils/api-helpers";





class ExportFileParams
{
    constructor(
        public fileName: string,
        public quantificationId: string,
        public fileIds: string[],
        public roiIds: string[]
    )
    {
    }
}

class ExportImageParams
{
    constructor(
        public quantificationId: string,
        public quantColumns: string[],
        public choiceIds: string[] = []
    )
    {
    }
}

@Injectable({
    providedIn: "root"
})
export class ExportDataService implements ExportGenerator
{
    constructor(
        private http: HttpClient,
        public dialog: MatDialog
    )
    {
    }

    exportData(title: string, choices: ExportDataChoice[]): Observable<void>
    {
        return showExportDialog(this.dialog, title, true, true, true, false, choices, this);
    }
    /*
    exportImages(datasetID: string, quantID: string, quantColumns: string[]): Observable<HttpResponse<ArrayBuffer>>
    {
        let body = new ExportImageParams(quantID, quantColumns);
        let apiUrl = APIPaths.getWithHost(APIPaths.api_export+"/image/"+datasetID);
        let opt = {
            observe: 'response' as const,
            responseType: 'arraybuffer' as const
        };

        //return this.http.post(apiUrl, body, opt);
        return null;
    }
*/
    generateExport(datasetID: string, quantID: string, choiceIds: string[], selectedROIs: string[], selectedExpressionIDs: string[], selectedExpressionNames: string[], outFileName: string): Observable<Blob>
    {
        let body = new ExportFileParams(outFileName, quantID, choiceIds, selectedROIs);
        let apiUrl = APIPaths.getWithHost(APIPaths.api_export+"/files/"+datasetID);
        let opt = {
            observe: "response" as const,
            responseType: "arraybuffer" as const
        };

        return this.http.post(apiUrl, body, opt).pipe(
            map(
                (data: HttpResponse<ArrayBuffer>)=>
                {
                    return new Blob(
                        [data.body],
                        {
                            type: "application/zip"
                        }
                    );
                }
            )
        );
    }
}
