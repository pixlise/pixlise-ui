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
import { QuantificationSummary } from "src/app/models/Quantifications";
import { DataSetService } from "src/app/services/data-set.service";
import { QuantificationService } from "src/app/services/quantification.service";





@Component({
    selector: "app-quant-result-list",
    templateUrl: "./quant-result-list.component.html",
    styleUrls: ["./quant-result-list.component.scss", "../quantifications.component.scss"]
})
export class QuantResultListComponent implements OnInit
{
    private _subs = new Subscription();

    listTitle: string = "Quantifications For Loaded Dataset";
    userQuantifications: QuantificationSummary[] = null;
    sharedQuantifications: QuantificationSummary[] = null;
    loadedQuantId: string = "";
    selectedQuantId: string = "";

    private _refreshIntervalId = null;
    private _adminView: boolean = false;

    constructor(
        private _router: Router,
        private _route: ActivatedRoute,
        private _datasetService: DataSetService,
        private _quantService: QuantificationService
    )
    {
    }

    get adminView(): boolean
    {
        return this._adminView;
    }

    ngOnInit()
    {
        this._subs.add(this._route.parent.url.subscribe(
            (urlPath)=>
            {
                if(urlPath[urlPath.length-1].path == "admin")
                {
                    this._adminView = true;
                }

                // Now that we know what kind of view we are, we can subscribe for the right kind of list
                this.subscribeQuantList();
            }
        ));

        if(this._route.firstChild)
        {
            this._subs = this._route.firstChild.params.subscribe(
                (params)=>
                {
                    // If we've got child params, we're showing the child route, so show the appropriate quant as selected
                    let jobId = params["job_id"];
                    if(jobId)
                    {
                        this.selectedQuantId = jobId;
                    }
                    else
                    {
                        this.selectedQuantId = "";
                    }
                }
            );
        }

        // Also refresh it a few sec later, in case someone just started a quant and maybe the 
        let refreshId = setInterval(
            ()=>
            {
                this.refreshQuantifications();
                clearInterval(refreshId);
            },
            3000
        );
    }

    private subscribeQuantList(): void
    {
        if(this.adminView)
        {
            this.listTitle = "All Quantifications Jobs";
            this._subs.add(this._quantService.quantificationAdminList$.subscribe(
                (quants: QuantificationSummary[])=>
                {
                    this.quantificationsUpdated(quants);
                },
                (err)=>
                {
                    console.error(err);
                    this.userQuantifications = [];
                    this.sharedQuantifications = [];
                }
            ));
        }
        else
        {
            this._subs.add(this._quantService.quantificationList$.subscribe(
                (quants: QuantificationSummary[])=>
                {
                    this.quantificationsUpdated(quants);
                },
                (err)=>
                {
                    console.error(err);
                    this.userQuantifications = [];
                    this.sharedQuantifications = [];
                }
            ));
        }

        this.refreshQuantifications();
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();

        if(this._refreshIntervalId)
        {
            console.log("Quantification refresh shutdown");
            clearInterval(this._refreshIntervalId);
            this._refreshIntervalId = null;
        }
    }

    onRefreshQuantifications(event): void
    {
        this.refreshQuantifications();
        event.stopPropagation();
    }

    private refreshQuantifications(): void
    {
        if(this.adminView)
        {
            this._quantService.refreshAdminQuantList();
        }
        else
        {
            this._quantService.refreshQuantList();
        }
    }

    private quantificationsUpdated(quantifications: QuantificationSummary[]): void
    {
        // If we got any non-completed quants, ensure we're refreshing
        // Also bin-sort into user vs shared quants
        let needsRefresh = false;
        this.userQuantifications = [];
        this.sharedQuantifications = [];

        for(let quant of quantifications)
        {
            if(quant.status != "complete" && quant.status != "error")
            {
                needsRefresh = true;
            }

            if(quant.shared)
            {
                this.sharedQuantifications.push(quant);
            }
            else
            {
                this.userQuantifications.push(quant);
            }
        }

        // If we need a refresh...
        if(needsRefresh)
        {
            // If not set up yet, set up an interval thingy
            if(!this._refreshIntervalId)
            {
                this._refreshIntervalId = setInterval(()=>{this.refreshQuantifications();}, 10000);
                console.log("Quantification refresh inited");
            }
        }
        else
        {
            // Ensure refreshing is stopped
            if(this._refreshIntervalId)
            {
                console.log("Quantification refresh ended");
                clearInterval(this._refreshIntervalId);
                this._refreshIntervalId = null;
            }
        }
    }

    onClicked(quant: QuantificationSummary): void
    {
        this.setSelectedQuantId(quant.jobId);

        // Dont do more...
        event.stopPropagation();
    }

    onClickList(): void
    {
        this.setSelectedQuantId(null);
    }

    private setSelectedQuantId(jobId: string): void
    {
        if(jobId && jobId.length > 0)
        {
            this.selectedQuantId = jobId;

            // Navigate to view the quant
            this._router.navigate([jobId], { relativeTo: this._route });
        }
        else
        {
            this.selectedQuantId = "";

            // Navigate to the root (nothing selected)
            this._router.navigateByUrl("/dataset/"+this._datasetService.datasetIDLoaded+"/quant-logs");
        }
    }

    onDelete(quant: QuantificationSummary): void
    {
        // Delete it
        if(confirm("Are you sure you want to delete applied quantification: "+quant.params.name+"?"))
        {
            // Find the one with this name
            this._quantService.deleteQuantification(quant.jobId).subscribe(
                ()=>
                {
                    this.refreshQuantifications();
                },
                (err)=>
                {
                    this.refreshQuantifications();
                }
            );
        }
    }

    onShare(quant: QuantificationSummary): void
    {
        if(confirm("Are you sure you want to share a copy of \""+quant.params.name+"\" with other users?"))
        {
            // Add it to the list of quants!
            this._quantService.shareQuantification(quant.jobId).subscribe(()=>
            {
                this.refreshQuantifications();
            },
            (err)=>
            {
                alert("Failed to share quantification: "+quant.params.name);
                this.refreshQuantifications();
            }
            );
        }
    }
}
