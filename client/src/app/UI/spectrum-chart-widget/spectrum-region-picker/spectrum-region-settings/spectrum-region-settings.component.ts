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

import { Component, ElementRef, Input, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { PredefinedROIID } from "src/app/models/roi";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ROIService } from "src/app/services/roi.service";
import { SpectrumChartService } from "src/app/services/spectrum-chart.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";
import { SpectrumChartModel, SpectrumSource } from "src/app/UI/spectrum-chart-widget/model";
import { RGBA } from "src/app/utils/colours";






@Component({
    selector: "spectrum-region-settings",
    templateUrl: "./spectrum-region-settings.component.html",
    styleUrls: ["./spectrum-region-settings.component.scss"]
})
export class SpectrumRegionSettingsComponent implements OnInit
{
    @Input() source: SpectrumSource;

    private _colourRGB: string = "";
    private _sharedBy: string = null;

    constructor(
        private _authService: AuthenticationService,
        private _roiService: ROIService,
        private _viewStateService: ViewStateService,
        private _spectrumService: SpectrumChartService,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit(): void
    {
        this._colourRGB = this.source.colourRGBA ? RGBA.fromWithA(this.source.colourRGBA, 1).asString() : "";

        if(this.source.creator != null && this.source.shared)
        {
            this._sharedBy = this.source.creator.name;
        }
    }

    get selectButtonDisabled(): boolean
    {
        return (this.source.roiID != PredefinedROIID.AllPoints && this.source.locationIndexes.length <= 0);
    }

    get labelToShow(): string
    {
        return this.source.roiName.replace("mist__roi.", "");
    }

    get showColour(): boolean
    {
        return !PredefinedROIID.isPredefined(this.source.roiID);
    }

    get colour(): string
    {
        return this._colourRGB;
    }

    get visible(): boolean
    {
        return this.source.lineChoices.some((line) => line.enabled);
    }

    get sharedBy(): string
    {
        return this._sharedBy;
    }

    get selectedTagIDs(): string[]
    {
        return this.source.tags;
    }

    get isSharedByOtherUser(): boolean
    {
        return this.sharedBy !== null && this.source.creator.user_id !== this._authService.getUserID();
    }

    onTagSelectionChanged(tags: string[]): void
    {
        this._roiService.tag(this.source.roiID, tags).subscribe(
            ()=>
            {
                this._roiService.refreshROIList();
            },
            (err)=>
            {
                alert(`Error while tagging ROI: ${this.source.roiName}`);
                this._roiService.refreshROIList();
            }
        );
    }

    onSelectSpectra(): void
    {
        // If this isn't one of the "special" ROIs, and it has no colour picked yet, tell user they can't access
        if(
            !PredefinedROIID.isPredefined(this.source.roiID) &&
            //this._viewStateService.getROIColour(this.source.roiID).length <= 0)
            this._colourRGB.length <= 0
        )
        {
            alert("No colour defined for ROI: "+this.source.roiName+", cannot show lines");
            return;
        }

        if(this.source.locationIndexes.length <= 0 && this.source.roiID != PredefinedROIID.AllPoints)
        {
            if(this.source.roiID == PredefinedROIID.SelectedPoints)
            {
                alert("Selection is empty!");
            }
            else if(this.source.roiID == PredefinedROIID.RemainingPoints)
            {
                alert("There are no remaining points!"); // NOTE: associated with HelpMessage.REMAINING_POINTS_EMPTY
            }
            else
            {
                alert("Region has no points, cannot calculate spectrum lines.");
            }
            return;
        }

        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";
        //dialogConfig.panelClass = "panel";
        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        let items: PickerDialogItem[] = [
            new PickerDialogItem(null, "Summed Across An Area", null, true)
        ];

        let selectedItems: string[] = [];
        for(let lineChoice of this.source.lineChoices)
        {
            if(lineChoice.lineExpression == SpectrumChartModel.lineExpressionMaxA)
            {
                // Add max subheading
                items.push(new PickerDialogItem(null, "Max Value In An Area", null, true));
            }

            items.push(new PickerDialogItem(lineChoice.lineExpression, lineChoice.label, null, true));
            if(lineChoice.enabled)
            {
                selectedItems.push(lineChoice.lineExpression);
            }
        }

        dialogConfig.data = new PickerDialogData(true, false, false, false, items, Array.from(selectedItems), "", new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
            (selectedIds: string[])=>
            {
                //console.log(JSON.stringify(selectedItems));
                //console.log('PickerDialogComponent onSelectedIdsChanged: '+JSON.stringify(selectedIds));
                // Find what changed and tell the spectrum chart
                for(let id of selectedIds)
                {
                    if(selectedItems.indexOf(id) < 0)
                    {
                        // this didn't exist before, it's added
                        this._spectrumService.mdl.addSpectrumLine(this.source.roiID, id);
                    }
                }
                //console.log(selectedItems);
                for(let id of selectedItems)
                {
                    //console.log('checking remove: '+id);
                    if(selectedIds.indexOf(id) < 0)
                    {
                        // this existed before but not now, it's removed
                        this._spectrumService.mdl.removeSpectrumLine(this.source.roiID, id);
                    }
                }
            }
        );
    }

    onColours(event): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";
        //dialogConfig.panelClass = "panel";
        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        let usedColours = this._viewStateService.getInUseROIColours();
        let items = PickerDialogData.getStandardColourChoices(usedColours);

        // Find the colour we're currently set to
        let curr: string[] = [];

        if(this._colourRGB && this._colourRGB.length > 0)
        {
            curr = [this._colourRGB];
        }

        dialogConfig.data = new PickerDialogData(false, true, false, false, items, curr, "This hue is applied to a different ROI", new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
            (colourRGBs: string[])=>
            {
                let colourRGB = "";
                if(colourRGBs.length > 0)
                {
                    colourRGB = colourRGBs[0];
                }

                // This is a little confusing. We set this on the view state service so it gets saved here, and this is what
                // the other RegionPicker dialog does but we're more complicated - we have a region manager that needs to know
                // of the change too, so we set it there as well
                if(!this._viewStateService.setROIColour(this.source.roiID, colourRGB))
                {
                    alert("Failed to save colour setting \""+colourRGB+"\" for ROI: \""+this.source.roiID+"\"");
                }
                else
                {
                    this._colourRGB = this._viewStateService.getROIColour(this.source.roiID);
                }
            }
        );
    }
}
