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

import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from "@angular/core";
import { QuantificationSummary } from "src/app/models/Quantifications";
import { AuthenticationService } from "src/app/services/authentication.service";




@Component({
    selector: "quant-summary",
    templateUrl: "./quant-result-summary.component.html",
    styleUrls: ["./quant-result-summary.component.scss", "../quantifications.component.scss"]
})
export class QuantResultSummaryComponent implements OnInit
{
    @Input() quant: QuantificationSummary;
    @Input() isLoaded: boolean = false;
    @Input() selected: boolean = false;
    @Input() showAdminData: boolean = false;

    @Output() onDeleteItem = new EventEmitter();
    @Output() onShareItem = new EventEmitter();

    itemState: string = null;
    hasIssues: boolean = false;

    appliedLabel: string = "";
    timeElapsedSec: number = 0;
    timeElapsedLabel: string = "";
    intervalId = null;

    notElements: string[] = [];
    elementAtomicNumbers: number[] = [];
    elementStateType: string = "oxides";

    constructor(
        private authService: AuthenticationService,)
    {
    }

    ngOnInit()
    {
        this.reset();
    }

    ngOnDestroy()
    {
        if(this.intervalId != null)
        {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    ngOnChanges(changes: SimpleChanges): void
    {
        this.reset();
    }

    reset(): void
    {
        if(this.isLoaded)
        {
            this.appliedLabel = "CURRENTLY APPLIED";
        }
        else
        {
            this.appliedLabel = "";
        }

        let elemInfo = QuantificationSummary.getQuantifiedElements(this.quant);

        this.elementStateType = elemInfo.carbonates ? "carbonates" : "oxides";
        this.notElements = elemInfo.nonElementSymbols;
        this.elementAtomicNumbers = elemInfo.elementAtomicNumbers;

        if(this.intervalId != null)
        {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // Work out what kind of row we are - either:
        // progress - showing progress of a quant job
        // complete - a complete quant job
        if(this.quant.status == "complete" || this.quant.status == "error")
        {
            this.itemState = "complete";
        }
        else
        {
            this.itemState = "progress";
        }

        this.hasIssues = ["starting", "preparing_nodes", "nodes_running", "gathering_results", "complete"].indexOf(this.quant.status) < 0;

        this.calcTimeElapsed();

        // If it's too old, just show it as stale
        if(this.timeElapsedSec > 3600)
        {
            this.quant.status = "did-not-finish";
            this.timeElapsedLabel = "Timed Out";
            this.itemState = "did-not-finish";
        }

        if(this.itemState == "complete")
        {
            this.timeElapsedLabel = "Took";
        }
        else if(this.itemState == "progress")
        {
            this.timeElapsedLabel = "Elapsed";
        }

        // If we're showing progress, start a timer to show the elapsed time
        if(this.itemState == "progress")
        {
            this.intervalId = setInterval(() => 
            {
                this.calcTimeElapsed();
            }, 1000);
        }
    }

    onShare(): void
    {
        this.onShareItem.emit(this.quant);
    }

    onDelete(): void
    {
        this.onDeleteItem.emit(this.quant);
    }

    calcTimeElapsed(): void
    {
        let started = this.quant.params.startUnixTime;
        let end = Math.floor(Date.now() / 1000);

        // If it's completed, show how long it ran for
        if(this.itemState == "complete")
        {
            end = this.quant.endUnixTime;
        }

        this.timeElapsedSec = end-started;
    }

    private isNotInProgress(): boolean
    {
        return this.itemState != "progress" && this.itemState != "did-not-finish";
    }

    private isOwnedByUser(): boolean
    {
        return this.quant.params.creator.user_id == this.authService.getUserID();
    }

    get canShare(): boolean
    {
        //console.log('canShare '+this.quant.jobId+': ownedByUser='+this.isOwnedByUser()+', notInProgress='+this.isNotInProgress()+', isShared='+this.isShared);
        return this.isOwnedByUser() && this.isNotInProgress() && !this.isShared;
    }

    get isShared(): boolean
    {
        return this.quant.shared;
    }

    get canDelete(): boolean
    {
        return this.isOwnedByUser() && this.isNotInProgress();
    }
}
