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

import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { ObjectCreator } from "src/app/models/BasicTypes";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ElementSetItem, ElementSetService, ElementSetSummary } from "src/app/services/element-set.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { TabSelectors } from "src/app/UI/spectrum-chart-widget/spectrum-peak-identification/tab-selectors";
import { SPECIAL_QUANT_ID } from "src/app/UI/spectrum-chart-widget/spectrum-peak-identification/tabs/element-set-row/element-set-row.component";


@Component({
    selector: TabSelectors.tabElementSets,
    templateUrl: "./element-sets.component.html",
    styleUrls: ["./element-sets.component.scss"]
})
export class ElementSetsComponent implements OnInit, OnDestroy
{
    private _subs = new Subscription();
    private _rawElementSetSummaries: ElementSetSummary[] = [];

    // The one used for display, updated when both quant & element sets update
    quantElementSet: ElementSetSummary = null;
    userElementSetSummaries: ElementSetSummary[] = [];
    sharedElementSetSummaries: ElementSetSummary[] = [];

    constructor(
        private _spectrumService: SpectrumChartService,
        private _elementSetService: ElementSetService,
        private _widgetDataService: WidgetRegionDataService,
        private _authService: AuthenticationService
    )
    {
    }

    ngOnInit()
    {
        // We show a "special" synthetic element set for the elements in loaded quant(s)
        this._subs.add(this._widgetDataService.quantificationLoaded$.subscribe(
            (quant: QuantificationLayer)=>
            {
                // New quant loaded, update our element sets
                this.updateElementSets();
            }
        ));

        this._subs.add(this._elementSetService.elementSets$.subscribe((summaries)=>
        {
            this._rawElementSetSummaries = summaries;
            this.updateElementSets();
        }));
    }

    ngOnDestroy()
    {
        // Ensure we get deleted
        this._subs.unsubscribe();
    }

    private updateElementSets(): void
    {
        this.quantElementSet = null;
        this.userElementSetSummaries = [];
        this.sharedElementSetSummaries = [];

        // Add a special element set which contains all elements we have quantifications for
        let formulae: string[] = [];
        if(this._widgetDataService.quantificationLoaded)
        {
            formulae = this._widgetDataService.quantificationLoaded.getElementFormulae();
        }

        let rawQuantElementAtomicNumbers = Array.from(periodicTableDB.getAtomicNumbersForSymbolList(formulae));

        if(rawQuantElementAtomicNumbers.length > 0)
        {
            this.quantElementSet = new ElementSetSummary(SPECIAL_QUANT_ID, "All Quantified Elements", rawQuantElementAtomicNumbers, false, null);
        }

        // And add all others
        for(let eset of this._rawElementSetSummaries)
        {
            if(!eset.shared)
            {
                this.userElementSetSummaries.push(eset);
            }
            else
            {
                this.sharedElementSetSummaries.push(eset);
            }
        }
    }

    onUseElementSet(item: ElementSetSummary): void
    {
        // If it's the "special" one we handle it separately
        if(item.id == SPECIAL_QUANT_ID)
        {
            let groups = [];
            for(let Z of item.atomicNumbers)
            {
                let group = XRFLineGroup.makeFromAtomicNumber(Z);
                groups.push(group);
            }

            this.applyElementSet(item.id, groups);
            return;
        }

        // Download the element set
        this._elementSetService.get(item.id).subscribe((elemSet: ElementSetItem)=>
        {
            // Replace any lines in the annotation with the lines coming from this element set
            let groups: XRFLineGroup[] = [];
            for(let l of elemSet.lines)
            {
                groups.push(XRFLineGroup.makeFromElementSetItem(l));
            }

            this.applyElementSet(item.id, groups);
        },
        (err)=>
        {
            alert("Failed to get element set: "+item.id);
        }
        );
    }

    private applyElementSet(id: string, lines: XRFLineGroup[]): void
    {
        this._spectrumService.mdl.xrfLinesPicked = lines;
    }

    onShareElementSet(item: ElementSetSummary): void
    {
        if(confirm("Are you sure you want to share a copy of element set \""+item.name+"\" with other users?"))
        {
            this._elementSetService.share(item.id).subscribe((sharedId: string)=>
            {
                // Don't need to do anything, this would force a listing...
            },
            (err)=>
            {
                alert("Failed to share element set: "+name);
            }
            );
        }
    }

    onDeleteElementSet(item: ElementSetSummary): void
    {
        if(confirm("Are you sure you want to delete element set: \""+item.name+"\"?"))
        {
            // Delete it, note it should then refresh and update our list...
            this._elementSetService.del(item.id).subscribe(()=>
            {
                console.log("Deleted element set: "+item.id);
            },
            (err)=>
            {
                alert("Failed to delete element set: "+item.name);
            }
            );
        }
    }

    canDelete(id: string, creator: ObjectCreator, shared: boolean): boolean
    {
        return id != SPECIAL_QUANT_ID && (!shared || creator.user_id == this._authService.getUserID());
    }
}
