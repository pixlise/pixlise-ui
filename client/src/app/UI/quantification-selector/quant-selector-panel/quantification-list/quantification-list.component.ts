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

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { Subscription } from "rxjs";
import { QuantificationSummary } from "src/app/models/Quantifications";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DataSetService } from "src/app/services/data-set.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { QuantificationItemInfo } from "./quantification-item/quantification-item.component";






@Component({
    selector: "quantification-list",
    templateUrl: "./quantification-list.component.html",
    styleUrls: ["./quantification-list.component.scss"]
})
export class QuantificationListComponent implements OnInit
{
    private subs = new Subscription();

    @Input() roiID = "";
    @Input() selectedQuantId: string = null; // If this is null while initing, we take the one from widget region data service
    @Input() showControlButtons: boolean = true;
    @Input() hideMulti: boolean = false;
    @Input() showNoneOption: boolean = false;

    @Output() onQuantSelected = new EventEmitter();
    @Output() onQuantDeleted = new EventEmitter();

    private _FilteredQuantificationList: QuantificationSummary[] = [];

    userQuants: QuantificationItemInfo[] = [];
    sharedQuants: QuantificationItemInfo[] = [];

    loadedQuantDetectors: string[] = [];
    loading: boolean = false;

    canBless = false;
    canPublish = false;

    constructor(
        private _datasetService: DataSetService,
        private _quantService: QuantificationService,
        private _authService: AuthenticationService,
    )
    {
    }

    ngOnInit()
    {
        this.loading = true;
        this.subs.add(this._quantService.quantificationList$.subscribe(
            (quants: QuantificationSummary[])=>
            {
                this._FilteredQuantificationList = this._quantService.filterQuantificationsForROI(this.roiID, quants, "complete", true, !this.hideMulti);

                this.loading = false;
                this.rebuildQuantList();
            },
            (err)=>
            {
                this.loading = false;

                this.userQuants = [];
                this.sharedQuants = [];

                console.error(err);
            }
        ));

        this._authService.getIdTokenClaims$().subscribe(
            (claims)=>
            {
                if(claims)
                {
                    this.canBless = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionBlessQuantification);
                    this.canPublish = AuthenticationService.hasPermissionSet(claims, AuthenticationService.permissionBlessQuantification);
                }
            }
        );

        this.refreshAvailable();
    }

    private rebuildQuantList(): void
    {
        this.userQuants = [];
        this.sharedQuants = [];

        for(let quant of this._FilteredQuantificationList)
        {
            if(quant.shared)
            {
                this.sharedQuants.push(new QuantificationItemInfo(quant, quant.jobId == this.selectedQuantId));
            }
            else
            {
                this.userQuants.push(new QuantificationItemInfo(quant, quant.jobId == this.selectedQuantId));
            }
        }
    }

    ngOnDestroy()
    {
        this.subs.unsubscribe();
    }

    isROIMatch(quant: QuantificationItemInfo): boolean
    {
        return this.roiID != null && this.roiID == quant.quant.params.roiID;
    }

    get noQuants(): boolean
    {
        return !this.loading && this.userQuants.length == 0 && this.sharedQuants.length == 0;
    }

    onClearSelection(): void
    {
        this.onQuantSelected.emit(null);
    }

    onSelectQuant(quantItem: QuantificationItemInfo): void
    {
        this.onQuantSelected.emit({"name": quantItem.quant.params.name, "id": quantItem.quant.jobId});
    }
  
    onShare(quantItem: QuantificationItemInfo, event: any): void
    {
        event.stopPropagation();
        if(confirm("Are you sure you want to share a copy of \""+quantItem.quant.params.name+"\" with other users?"))
        {
            // Add it to the list of quants!
            this._quantService.shareQuantification(quantItem.quant.jobId).subscribe(
                ()=>
                {
                    this.refreshAvailable();
                },
                (err)=>
                {
                    alert("Failed to share quantification: "+quantItem.quant.params.name);
                    this.refreshAvailable();
                }
            );
        }
    }

    onDelete(quantItem: QuantificationItemInfo, event: any): void
    {
        event.stopPropagation();
        if(confirm("Are you sure you want to delete \""+quantItem.quant.params.name+"\"?"))
        {
            // Add it to the list of quants!
            this._quantService.deleteQuantification(quantItem.quant.jobId).subscribe(
                ()=>
                {
                    this.refreshAvailable();
                },
                (err)=>
                {
                    alert("Failed to delete quantification: "+quantItem.quant.params.name);
                    this.refreshAvailable();
                }
            );
        }

        this.onQuantDeleted.emit(quantItem.quant.jobId);
    }

    private refreshAvailable(): void
    {
        this._quantService.refreshQuantList(); // this will signal our subscription above
    }

    canDelete(quantItem: QuantificationItemInfo): boolean
    {
        return !quantItem.quant.shared || quantItem.quant.params.creator.user_id == this._authService.getUserID();
    }

    onBless(quantItem: QuantificationItemInfo, event: any): void
    {
        event.stopPropagation();

        if( quantItem &&
            quantItem.quant.jobId &&
            confirm("Are you sure you want to mark quantification: "+quantItem.quant.params.name+" as the one to use (the blessed quantification) for this dataset? All users opening this dataset who have not explicitly chosen another will have this quantification auto-loaded.")
        )
        {
            this._quantService.blessQuantification(quantItem.quant.jobId).subscribe(
                ()=>
                {
                    this.refreshAvailable();
                },
                (err)=>
                {
                    alert("Failed to bless quantification: "+quantItem.quant.params.name+", error: "+err.error);
                    this.refreshAvailable();
                }
            );
        }
    }

    onPublish(quantItem: QuantificationItemInfo, event: any): void
    {
        event.stopPropagation();

        if(confirm("Are you sure you want to publish this quantification to PDS? It will be archived as the definitive quantification for this dataset"))
        {
            this._quantService.publishQuantification(quantItem.quant.jobId).subscribe(
                ()=>
                {
                },
                (err)=>
                {
                    alert("Failed to pubhlish quantification: "+quantItem.quant.params.name+", error: "+err.error);
                }
            );
        }
    }
}
