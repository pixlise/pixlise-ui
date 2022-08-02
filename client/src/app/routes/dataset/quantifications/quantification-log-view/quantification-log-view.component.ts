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

import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { DataSetService } from "src/app/services/data-set.service";
import { QuantificationService } from "src/app/services/quantification.service";




@Component({
    selector: "app-quantification-log-view",
    templateUrl: "./quantification-log-view.component.html",
    styleUrls: ["./quantification-log-view.component.scss", "../quantifications.component.scss"]
})
export class QuantificationLogViewComponent implements OnInit
{
    private _routeSub: Subscription;

    private _jobId: string = "";
    private _logName: string = "";
    private _logText: string = "";
    errorMsg: string = "";

    constructor(
        private _router: Router,
        private _route: ActivatedRoute,
        private _datasetService: DataSetService,
        private _quantService: QuantificationService
    )
    {
    }

    ngOnInit(): void
    {
        this._routeSub = this._route.params.subscribe(
            (params)=>
            {
                this._jobId = params["job_id"];
                this._logName = params["log_name"];

                this.refreshLogView();
            }
        );
    }

    ngOnDestroy()
    {
        this._routeSub.unsubscribe();
    }

    get logName(): string
    {
        return this._logName;
    }

    get logText(): string
    {
        return this._logText;
    }

    onClickBack(): void
    {
        this._router.navigateByUrl("/dataset/"+this._datasetService.datasetIDLoaded+"/quant-logs/"+this._jobId);
    }

    refreshLogView(): void
    {
        this._logText = null;
        this.errorMsg = null;

        this._quantService.getQuantificationLog(this._jobId, this._logName).subscribe(
            (logContent: string)=>
            {
                this._logText = logContent;
            },
            (err)=>
            {
                let msg = "Failed to download quantification log: "+this._logName+" for quantification: "+this._jobId+". Error: "+JSON.stringify(err);
                console.error(msg);
                console.log(err);

                this.errorMsg = "Failed to download quantification log file";
                this._logText = "";
            }
        );
    }
}
