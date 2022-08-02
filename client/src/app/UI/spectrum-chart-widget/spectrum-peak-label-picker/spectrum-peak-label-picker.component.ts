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

import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { QuantificationLayer } from "src/app/models/Quantifications";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { WidgetRegionDataService } from "src/app/services/widget-region-data.service";





export class SpectrumPeakLabelsVisible
{
    constructor(public elems: string[])
    {
    }
}

class LabelItem
{
    constructor(public label: string, public visible: boolean)
    {
    }
}


@Component({
    selector: "app-spectrum-peak-label-picker",
    templateUrl: "./spectrum-peak-label-picker.component.html",
    styleUrls: ["./spectrum-peak-label-picker.component.scss"]
})
export class SpectrumPeakLabelPickerComponent implements OnInit
{
    private _subs = new Subscription();

    elementsVisible: LabelItem[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: SpectrumPeakLabelsVisible,
        private _widgetDataService: WidgetRegionDataService,
        public dialogRef: MatDialogRef<SpectrumPeakLabelPickerComponent>
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._widgetDataService.quantificationLoaded$.subscribe(
            (quant: QuantificationLayer)=>
            {
                this.elementsVisible = [];

                if(quant)
                {
                    // Build a list!
                    let quantedElems = quant.getElementFormulae();

                    for(let elem of quantedElems)
                    {
                        let elemState = periodicTableDB.getElementOxidationState(elem);
                        if(elemState && elemState.isElement)
                        {
                            let visible = this.data.elems.indexOf(elemState.element) > -1;
                            this.elementsVisible.push(new LabelItem(elemState.element, visible));
                        }
                    }
                }
            },
            (err)=>
            {
            }
        ));        
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    onVisibility(elem: string): void
    {
        // Run through and set the flag
        for(let vis of this.elementsVisible)
        {
            if(vis.label == elem)
            {
                vis.visible = !vis.visible;
                break;
            }
        }
    }

    get allVisible(): boolean
    {
        let allVis = true;
        for(let vis of this.elementsVisible)
        {
            if(!vis.visible)
            {
                allVis = false;
                break;
            }
        }
        return allVis;
    }

    onToggleAllVisible(): void
    {
        // If we're not currently all visible, make it so, otherwise make all not visible
        let newVis = !this.allVisible;
        for(let vis of this.elementsVisible)
        {
            vis.visible = newVis;
        }
    }

    onApply(): void
    {
        // Send back all visible elements
        let result = [];
        for(let vis of this.elementsVisible)
        {
            if(vis.visible)
            {
                result.push(vis.label);
            }
        }

        this.dialogRef.close(result);
    }

    onCancel(): void
    {
        this.dialogRef.close(null);
    }
}
