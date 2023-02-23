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
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ExportGenerator } from "src/app/UI/atoms/export-data-dialog/export-models";
import { APIPaths } from "src/app/utils/api-helpers";
import { DataSourceParams, RegionDataResults, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { PredefinedROIID } from "src/app/models/roi";


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

export function generateExportCSVForExpression(
    expressionIDs: string[],
    roiID: string,
    datasetId: string,
    widgetRegionDataService: WidgetRegionDataService): Observable<string>
{
    let query = [];
    for(let exprId of expressionIDs)
    {
        query.push(new DataSourceParams(exprId, roiID || PredefinedROIID.AllPoints, datasetId));
    }

    return widgetRegionDataService.getData(query, false).pipe(
        map((queryData: RegionDataResults)=>
        {
            if(queryData.error)
            {
                throw new Error(`Failed to query CSV data: ${queryData.error}`);
            }

            // Check for any errors in other results
            for(let result of queryData.queryResults)
            {
                if(result.error)
                {
                    throw new Error(`Failed to generate CSV, expression "${result.expression.name}" failed: ${result.error}`)
                }
            }

            let header = "\"PMC\"";
            let csv = "";

            // PMCs should be in the same order, but we're not 100% sure on that, check here that it is the case
            for(let rowIdx = 0; rowIdx < queryData.queryResults[0].values.values.length; rowIdx++)
            {
                let pmc = -1;

                for(let exprIdx = 0; exprIdx < queryData.queryResults.length; exprIdx++)
                {
                    let queryResult = queryData.queryResults[exprIdx];

                    // If it's our first time here, add to the header
                    if(rowIdx == 0)
                    {
                        header += ",\""+queryResult.expression.name+"\"";
                    }

                    if(exprIdx == 0)
                    {
                        // First expression, add the PMC directly
                        pmc = queryResult.values.values[rowIdx].pmc;
                        csv += `\n${pmc}`;
                    }
                    else
                    {
                        // Not the first expression, ensure PMC is the same
                        if(exprIdx > 0 && queryResult.values.values[rowIdx].pmc != pmc)
                        {
                            throw new Error(`CSV data PMC mismatch on row ${rowIdx}`);
                        }
                    }

                    // Add the value
                    csv += ",";
                    let val = queryResult.values.values[rowIdx];
                    if(!val.isUndefined)
                    {
                        csv += `${val.value}`
                    }
                }
            }

            return header+csv;
        })
    );
}

@Injectable({
    providedIn: "root"
})
export class ExportDataService implements ExportGenerator
{
    constructor(
        private http: HttpClient
    )
    {
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
