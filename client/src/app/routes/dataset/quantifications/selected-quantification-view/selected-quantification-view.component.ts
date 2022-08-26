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

import { Component, OnInit, SimpleChanges } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { QuantificationSummary, QuantModes } from "src/app/models/Quantifications";
import { ROISavedItem } from "src/app/models/roi";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { QuantificationService } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";






@Component({
    selector: "app-selected-quantification-view",
    templateUrl: "./selected-quantification-view.component.html",
    styleUrls: ["./selected-quantification-view.component.scss", "../quantifications.component.scss"]
})
export class SelectedQuantificationViewComponent implements OnInit
{
    private _subs = new Subscription();
    private _quantSubs = new Subscription();

    selectedQuantDetails: QuantificationSummary = null;

    private _roiName: string = "";
    private _rois: Map<string, ROISavedItem> = null;

    hasLogs: boolean = false;
    logMissingReason: string = "";
    elementStateType: string = "";
    ignoreAr: string = "";
    outputElements: string = "";
    displayMsg: string = "";
    quantMode: string = "";
    comments: string = "";
    piquantParameters: string = "";
    elapsedTime: number = 0;
    includeDwells: string = "";
    roisQuantified: string = "";

    constructor(
        private _router: Router,
        private _route: ActivatedRoute,
        private _roiService: ROIService,
        private _quantService: QuantificationService
    )
    {
    }

    ngOnInit()
    {
        this._subs.add(this._route.params.subscribe(
            (params)=>
            {
                const jobId = params["job_id"];

                // Re-subscribe to all things quant...
                this._quantSubs.unsubscribe();
                this._quantSubs = new Subscription();

                // Subscribe to both admin & user lists, when one of them updates, we'll look up the info we're after
                this._quantSubs.add(this._quantService.quantificationList$.subscribe(
                    (quants: QuantificationSummary[])=>
                    {
                        this.quantListUpdated(quants, jobId);
                    }
                ));

                this._quantSubs.add(this._quantService.quantificationAdminList$.subscribe(
                    (quants: QuantificationSummary[])=>
                    {
                        this.quantListUpdated(quants, jobId);
                    }
                ));
            }
        ));

        this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this._rois = rois;
                this.updateROIName();
            }
        );
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
        this._quantSubs.unsubscribe();
    }

    private quantListUpdated(quants: QuantificationSummary[], showJobId: string): void
    {
        for(let quant of quants)
        {
            if(quant.jobId == showJobId)
            {
                this.setSelectedQuantification(quant);
                break;
            }
        }
    }

    private setSelectedQuantification(quant: QuantificationSummary): void
    {
        this.selectedQuantDetails = quant;

        let elemInfo = QuantificationSummary.getQuantifiedElements(quant);
        this.elementStateType = elemInfo.carbonates ? "carbonates" : "oxides";
        this.ignoreAr = elemInfo.ignoreAr ? "Yes" : "No";
        let allSymbols = [];
        for(let sym of elemInfo.nonElementSymbols)
        {
            // Don't add CO3, it's a special parameter that makes PIQUANT generate carbonates
            // Same as Ar_I
            // NOTE: The above 2 would only appear in the list as part of a fallback scenario
            //       when the quants original parameter list is read
            if(sym != "CO3" && sym != "Ar_I")
            {
                allSymbols.push(sym);
            }
        }
        for(let z of elemInfo.elementAtomicNumbers)
        {
            allSymbols.push(periodicTableDB.getElementByAtomicNumber(z).symbol);
        }
        this.includeDwells = (quant.params.includeDwells ? "Yes" : "No");
        this.roisQuantified = quant.params.roiIDs.join(",");
        this.outputElements = allSymbols.join(",");
        this.displayMsg = quant.message && quant.message.length ? " ("+quant.message+")" : "";
        this.comments = quant.params.comments ? quant.params.comments : "(None)";
        this.quantMode = QuantModes.getShortDescription(this.selectedQuantDetails.params.quantMode);
        this.piquantParameters = quant.params.parameters ? quant.params.parameters : "(None specified)";
        this.elapsedTime = this.getElapsedTimeSec(quant);

        // If it's a multi-quant we don't have logs anyway
        if(this.selectedQuantDetails.jobId.indexOf("multi_") >= 0)
        {
            this.logMissingReason = "No logs are generated for multi-quantifications";
        }

        // Decide on a few things we're showing/not showing
        if(
            this.selectedQuantDetails.endUnixTime &&
            this.selectedQuantDetails.piquantLogList &&
            this.selectedQuantDetails.piquantLogList.length > 0
        )
        {
            // Looks valid, check them though because older quant logs were signed links to AWS, and we no longer bother showing these
            // Look at the first one and decide
            this.hasLogs = true;
            this.logMissingReason = "";

            let firstLog = this.selectedQuantDetails.piquantLogList[0];

            // Logs used to contain a signed URL, we no longer support viewing those, so this message is here...
            if(firstLog.toUpperCase().indexOf("AMZ-CREDENTIAL") > -1)
            {
                this.logMissingReason = "Pre-April 2021 quantification detected. Log file viewing not supported.";
            }
        }

        this.updateROIName();
    }

    ngOnChanges(changes: SimpleChanges): void
    {
        this.updateROIName();
    }

    private updateROIName(): void
    {
        this._roiName = "";

        if(this._rois && this.selectedQuantDetails)
        {
            let roi = this._rois.get(this.selectedQuantDetails.params.roiID);
            if(roi)
            {
                this._roiName = roi.name;
            }
        }
    }

    get roiName(): string
    {
        if(!this._roiName)
        {
            return "Entire dataset";
        }

        return this._roiName;
    }

    getLogName(link: string): string
    {
        let justLink = link.split("?")[0];
        let bits = justLink.split("/");
        return bits[bits.length-1];
    }

    private getElapsedTimeSec(quant: QuantificationSummary): number
    {
        let started = quant.params.startUnixTime;
        let end = Math.floor(Date.now() / 1000);

        // If it's completed, show how long it ran for
        if(quant.status == "complete" || quant.status == "error")
        {
            end = quant.endUnixTime;
        }

        return end-started;
    }

    onClickLog(logName: string): void
    {
        this._router.navigate(["log", logName], { relativeTo: this._route });
    }
}
