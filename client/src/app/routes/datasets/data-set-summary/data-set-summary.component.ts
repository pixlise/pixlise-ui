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
import { DataSetSummary } from "src/app/models/DataSet";
import { DataSetService } from "src/app/services/data-set.service";



@Component({
    selector: "data-set-summary",
    templateUrl: "./data-set-summary.component.html",
    styleUrls: ["./data-set-summary.component.scss"]
})
export class DataSetSummaryComponent implements OnInit
{
    private _subs = new Subscription();

    @Input() summary: DataSetSummary = null;
    @Input() selected: DataSetSummary = null;
    @Output() onSelect = new EventEmitter();

    private _title: string = "";
    private _missingData: string = "";

    constructor(
        private datasetService: DataSetService
    )
    {
    }

    ngOnInit()
    {
        // Prepend SOL if it's there
        this._title = "";
        if(this.summary.sol)
        {
            this._title += "SOL-"+this.summary.sol+": ";
        }
        this._title += this.summary.title;

        let missing = DataSetSummary.listMissingData(this.summary);
        if(missing.length > 0)
        {
            this._missingData = "Missing: "+Array.from(missing).join(",");
        }
        else
        {
            this._missingData = "";
        }
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get tileImageURL(): string
    {
        // Snip off the end and replace with context-thumb, which allows the API to work out the image to return
        let pos = this.summary.context_image_link.lastIndexOf("/");
        if(pos < 0)
        {
            return this.summary.context_image_link;
        }

        let url = this.summary.context_image_link.substring(0, pos+1)+"context-thumb";
        return url;
    }

    get title(): string
    {
        return this._title;
    }

    get incomplete(): boolean
    {
        return this._missingData.length > 0;
    }

    get missingDataList(): string
    {
        return this._missingData;
    }

    get isSelected(): boolean
    {
        let selected = this.selected && this.selected.dataset_id == this.summary.dataset_id;
        return selected;
    }

    get isRGBU(): boolean
    {
        let rgbuImageCount = this.summary.tiff_context_images || 0;
        return rgbuImageCount > 0;
    }
    get isXRF(): boolean
    {
        return this.summary.normal_spectra && this.summary.normal_spectra > 0;
    }

    get dwellSpectra(): number
    {
        let dwells = this.summary.dwell_spectra;
        if(!dwells)
        {
            return 0;
        }
        return dwells;
    }

    get displaySol(): string
    {
        if(this.summary.sol.length <= 0)
        {
            return "pre-mission";
        }
        return this.summary.sol;
    }

    get displayTarget(): string
    {
        if(this.summary.target_id == "?" || this.summary.target.length <= 0)
        {
            return "--";
        }

        return this.summary.target;
    }

    get displayValue(): string
    {
        if(this.summary.drive_id <= 0)
        {
            return "--";
        }
        return this.summary.drive_id.toString();
    }

    onClickTileBackground(event): void
    {
        // Consume event so our parent doesn't get our clicks
        event.stopPropagation();
    }

    onClickTileArea(event): void
    {
        // Consume event so our parent doesn't get our clicks
        event.stopPropagation();

        if(this.summary == null)
        {
            return;
        }

        // Tell container we're clicked on
        this.onSelect.emit(this.summary);
    }
}
