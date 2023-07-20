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
import { Subscription } from "rxjs";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { QuantificationSelectionInfo, QuantificationSelectionService } from "src/app/services/quantification-selection.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";





// Primarily exists so we can remove the use of these services from the main toolbar, and they are only used when the toolbar
// needs these items shown. For example, this way we don't instantiate a widget region data service before loading a dataset
@Component({
    selector: "current-quantification",
    templateUrl: "./current-quantification.component.html",
    styleUrls: ["./current-quantification.component.scss"]
})
export class CurrentQuantificationComponent implements OnInit
{
    private _subs = new Subscription();

    selectedQuantID: string = "";
    loadedQuantID: string = "";

    constructor(
        private _viewStateService: ViewStateService,
        private _quantSelectionService: QuantificationSelectionService,
        private _widgetDataService: WidgetRegionDataService,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._quantSelectionService.quantificationsSelected$.subscribe(
            (selection: QuantificationSelectionInfo)=>
            {
                // Should ONLY process ones without an ROI
                if(!selection.roiID)
                {
                    if(confirm("Are you sure you want to load quantification: \""+selection.quantificationName+"\"?"))
                    {
                        this._viewStateService.setQuantification(selection.quantificationID);
                    }
                }
            }
        ));

        this._subs.add(this._widgetDataService.quantificationLoaded$.subscribe(
            (quant: QuantificationLayer)=>
            {
                if(!quant)
                {
                    this.loadedQuantID = "";
                }
                else
                {
                    this.loadedQuantID = quant.quantId;
                }
            }
        ));

        this._subs.add(this._viewStateService.appliedQuantification$.subscribe(
            (quantID: string)=>
            {
                this.selectedQuantID = quantID;
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get errorMsg(): string
    {
        return this.selectedQuantID != this.loadedQuantID ? "Quantification not loaded" : "";
    }
}
