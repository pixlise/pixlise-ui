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

import { Component, ElementRef, Inject, OnInit, ViewContainerRef } from "@angular/core";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { DataSetService } from "src/app/services/data-set.service";
import { QuantificationService } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { ROISettingsItem } from "src/app/UI/roipicker/region-item-settings/region-item-settings.component";
import { Colours } from "src/app/utils/colours";
import { positionDialogNearParent } from "src/app/utils/utils";






export class ROIPickerData
{
    constructor(
        public showAllPoints: boolean,
        public showRemainingPointsIfExists: boolean,
        public showColourButton: boolean,
        public singleSelection: boolean,
        public roiIDsVisible: string[],
        public showIfHasPMCs: boolean,
        public showIfHasPixels: boolean,
        public triggerElementRef: ElementRef
    )
    {
    }
}

@Component({
    selector: "app-roipicker",
    templateUrl: "./roipicker.component.html",
    styleUrls: ["./roipicker.component.scss"]
})
export class ROIPickerComponent implements OnInit
{
    private _subs = new Subscription();

    activeIcon="assets/button-icons/check-on.svg";
    inactiveIcon="assets/button-icons/check-off.svg";

    fullDatasetROI: ROISettingsItem;
    remainingPointsROI: ROISettingsItem;
    userROIs: ROISettingsItem[] = [];
    sharedROIs: ROISettingsItem[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ROIPickerData,
        public dialogRef: MatDialogRef<ROIPickerComponent>,
        public dialog: MatDialog,
        private _roiService: ROIService,
        private _quantService: QuantificationService,
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
        private _ViewContainerRef: ViewContainerRef
    )
    {
    }

    ngOnInit(): void
    {
        if(this.data.singleSelection)
        {
            this.activeIcon="assets/button-icons/radio-on.svg";
            this.inactiveIcon="assets/button-icons/radio-off.svg";
        }

        // Refresh, someone may have shared one for example!
        this._roiService.refreshROIList();

        this._subs.add(this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                // Start with the "all points" special region
                this.fullDatasetROI = new ROISettingsItem(
                    PredefinedROIID.AllPoints,
                    "Full Dataset (bulk/selection)",
                    "", // not shared
                    Colours.GRAY_10.asString(),
                    this.data.roiIDsVisible.indexOf(PredefinedROIID.AllPoints) > -1,
                    Colours.CONTEXT_BLUE.asString()
                );

                // Work out if we're showing remaining PMCs
                this.remainingPointsROI = null;
                if(this.data.showRemainingPointsIfExists)
                {
                    // Check if we have any remaining points...
                    let remainingPMCs = this._quantService.getRemainingPMCs(this._datasetService.datasetLoaded.locationPointCache, rois);
                    if(remainingPMCs.length > 0)
                    {
                        this.remainingPointsROI = new ROISettingsItem(
                            PredefinedROIID.RemainingPoints,
                            ViewStateService.RemainingPointsLabel,
                            "", // not shared
                            Colours.CONTEXT_GREEN.asString(),
                            this.data.roiIDsVisible.indexOf(PredefinedROIID.RemainingPoints) > -1,
                            ""
                        );
                    }
                }

                this.userROIs = [];
                this.sharedROIs = [];
                for(let roi of rois.values())
                {
                    let visible = this.data.roiIDsVisible.indexOf(roi.id) > -1;
                    let colourRGB = this._viewStateService.getROIColour(roi.id);
                    let sharedBy = null;

                    if(roi.shared && roi.creator != null)
                    {
                        sharedBy = roi.creator.name;
                    }

                    // If this one is missing data we expect, don't show it
                    if( this.data.showIfHasPMCs && roi.locationIndexes.length > 0 ||
                        this.data.showIfHasPixels && roi.pixelIndexes.size > 0 )
                    {
                        let newROI = new ROISettingsItem(
                            roi.id,
                            roi.name,
                            sharedBy,
                            colourRGB,
                            visible,
                            ""
                        );

                        if(roi.shared)
                        {
                            this.sharedROIs.push(newROI);
                        }
                        else
                        {
                            this.userROIs.push(newROI);
                        }
                    }
                }

                this.userROIs.sort((a, b) => (a.label.localeCompare(b.label)));
                this.sharedROIs.sort((a, b) => (a.label.localeCompare(b.label)));
            },
            (err)=>
            {
            }
        ));
    }

    ngAfterViewInit()
    {
        // Move to be near the element that opened us
        if(this.data.triggerElementRef)
        {
            const openerRect = this.data.triggerElementRef.nativeElement.getBoundingClientRect();
            const ourWindowRect = this._ViewContainerRef.element.nativeElement.parentNode.getBoundingClientRect();

            let pos = positionDialogNearParent(openerRect, ourWindowRect);
            this.dialogRef.updatePosition(pos);
        }
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    isShowingColourButton(roiID: string): boolean
    {
        // Can't change colours for allpoints/selection
        return this.data.showColourButton && !PredefinedROIID.isPredefined(roiID);
    }

    protected getAllROIs(): ROISettingsItem[]
    {
        let result = [];
        if(this.data.showAllPoints)
        {
            result.push(this.fullDatasetROI);
        }

        if(this.remainingPointsROI)
        {
            result.push(this.remainingPointsROI);
        }

        result.push(...this.userROIs);
        result.push(...this.sharedROIs);

        return result;
    }

    onVisibility(roiID: string): void
    {
        let rois = this.getAllROIs();
        for(let roi of rois)
        {
            if(roi.roiID == roiID)
            {
                // Only allow making it visible if it has a colour assigned
                // But if the colour picker button isn't showing, allow picking anything
                if(this.isShowingColourButton(roiID))
                {
                    let clr = this._viewStateService.getROIColour(roiID);
                    if(!roi.active && clr.length <= 0)
                    {
                        alert("Please set a colour before turning on region visibility");
                        return;
                    }
                }

                if(this.data.singleSelection)
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
            else if(this.data.singleSelection)
            {
                // Mark all others as not active
                roi.active = false;
            }
        }
    }

    onOK()
    {
        let visibleIDs = [];

        let rois = this.getAllROIs();
        for(let roi of rois)
        {
            if(roi.active)
            {
                visibleIDs.push(roi.roiID);

                // If we're adding AllPoints, we implicitly add SelectedPoints too
                if(roi.roiID == PredefinedROIID.AllPoints)
                {
                    visibleIDs.push(PredefinedROIID.SelectedPoints);
                }
            }
        }

        this.dialogRef.close(visibleIDs);
    }

    onCancel()
    {
        this.dialogRef.close(null);
    }
}
