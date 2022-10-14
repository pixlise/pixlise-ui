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

import { Component, Input, OnInit } from "@angular/core";

import { APILogService, LogData, LogLine } from "src/app/services/apilog.service";
import { LayoutService } from "src/app/services/layout.service";
import { httpErrorToString } from "src/app/utils/utils";


const logAutoRetrieveLimit = 10; // 10 requests

@Component({
    selector: "log-viewer",
    templateUrl: "./log-viewer.component.html",
    styleUrls: ["./log-viewer.component.scss"]
})
export class LogViewerComponent implements OnInit
{
    @Input() title: string = "";
    @Input() logID: string = "";

    logData: LogLine[] = [];

    private _logAutoRetrieveCount: number = 0;
    private _loading: boolean = false;

    constructor(
        private _logService: APILogService,
        private _layoutService: LayoutService,
        )
    {
    }

    ngOnInit(): void
    {
        this.onRefreshLog();
    }

    onRefreshLog(): void
    {
        if(!this.logID)
        {
            return;
        }

        this._loading = true;
        this._logService.getLog(this.logID).subscribe(
            (resp: LogData)=>
            {
                this._loading = false;
                if(resp.lines.length > this.logData.length)
                {
                    this.logData = resp.lines;

                    // Resize any canvases, as we have likely grown in size
                    this._layoutService.notifyWindowResize();
                }

                this._logAutoRetrieveCount++;

                if(this._logAutoRetrieveCount < logAutoRetrieveLimit)
                {
                    setTimeout(()=>{this.onRefreshLog();}, 2000);
                }
            },
            (err)=>
            {
                this._loading = false;
                this.logData = [new LogLine(Date.now(), httpErrorToString(err, "Failed to retrieve log"))];
            }
        );
    }

    get loading(): boolean
    {
        return this._loading;
    }
}
