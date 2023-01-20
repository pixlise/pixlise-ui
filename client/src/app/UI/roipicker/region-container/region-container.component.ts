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
import { PredefinedROIID } from "src/app/models/roi";
import { ROIService } from "src/app/services/roi.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { ROISettingsItem } from "../region-item-settings/region-item-settings.component";


@Component({
    selector: "region-container",
    templateUrl: "./region-container.component.html",
    styleUrls: ["./region-container.component.scss"]
})
export class RegionContainerComponent implements OnInit
{
    @Input() regionTitle: string = "";
    
    isOpen: boolean = true;
    @Output() onToggleOpen = new EventEmitter();

    @Input() rois: ROISettingsItem[];
    @Input() filteredROIs: ROISettingsItem[];

    @Input() showColourButton: boolean;
    @Input() isDisplayed: boolean;
    @Input() singleSelection: boolean;

    private _subs = new Subscription();

    constructor(
        private _viewStateService: ViewStateService,
        private _roiService: ROIService,
    )
    {
    }

    ngOnInit(): void
    {
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get activeSelectIcon(): string
    {
        return this.singleSelection ? "assets/button-icons/radio-on.svg" : "assets/button-icons/check-on.svg";
    }

    get inactiveSelectIcon(): string
    {
        return this.singleSelection ? "assets/button-icons/radio-off.svg" : "assets/button-icons/check-off.svg";
    }

    get selectableROIs(): ROISettingsItem[]
    {
        return this.rois.filter((roi) => !this.isShowingColourButton(roi.roiID) || this._viewStateService?.getROIColour(roi.roiID)?.length > 0);
    }

    get isAllSelected(): boolean
    {
        return this.selectableROIs.length > 0 && this.selectableROIs.every(roi => roi.active);
    }

    onToggleAllSelected(): void
    {
        let isActive = !this.isAllSelected;
        this.rois.forEach((roi) => 
        {
            if(!this.isShowingColourButton(roi.roiID) || this._viewStateService?.getROIColour(roi.roiID)?.length > 0)
            {
                roi.active = isActive;
            }
        });
    }
    
    get selectAllTooltipText(): string
    {
        if(this.selectableROIs.length === 0)
        {
            return "No ROIs with an active colour to select";
        }

        let action = this.isAllSelected ? "Deselect" : "Select";
        let singleActive = this.selectableROIs.length == 1;
        return `${action} ${this.selectableROIs.length} ROI${singleActive ? "" : "s"} with an active colour`;
    }

    isShowingColourButton(roiID: string): boolean
    {
        // Can't change colours for allpoints/selection
        return this.showColourButton && !PredefinedROIID.isPredefined(roiID);
    }

    onToggleSection()
    {
        this.isOpen = !this.isOpen;
        this.onToggleOpen.emit(this.isOpen);
    }

    onVisibility(roiID: string): void
    {
        for(let roi of this.rois)
        {
            if(roi.roiID === roiID)
            {
                // Only allow making it visible if it has a colour assigned
                // But if the colour picker button isn't showing, allow picking anything
                if(this.isShowingColourButton(roiID))
                {
                    let clr = this._viewStateService.getROIColour(roiID);
                    if(this.isDisplayed && !roi.active && clr.length <= 0)
                    {
                        alert("Please set a colour before turning on region visibility");
                        return;
                    }
                }

                if(this.singleSelection)
                {
                    // Single selection, anything clicked on becomes active
                    roi.active = true;
                }
                else
                {
                    // Multi-selection, just invert
                    roi.active = !roi.active;
                }
            }
            else if(this.singleSelection)
            {
                // Mark all others as not active
                roi.active = false;
            }
        }
    }

    onTagSelectionChanged({roiID, tags})
    {
        this._roiService.tag(roiID, tags).subscribe(
            ()=>
            {
                this._roiService.refreshROIList();
            },
            (err)=>
            {
                alert(`Error while tagging ROI: ${roiID}`);
                this._roiService.refreshROIList();
            }
        );
    }
}
