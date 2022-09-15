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

import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { ViewStateService } from "src/app/services/view-state.service";
import { PickerDialogComponent, PickerDialogData } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";






export class ROISettingsItem
{
    constructor(public roiID: string, public label: string, public sharedBy: string, public colour: string, public active: boolean, public colour2: string, public shape: string)
    {
    }
}

@Component({
    selector: "region-item-settings",
    templateUrl: "./region-item-settings.component.html",
    styleUrls: ["./region-item-settings.component.scss"]
})
export class RegionItemSettingsComponent implements OnInit
{
    @Input() item: ROISettingsItem;
    @Input() showColourButton: boolean;
    @Input() activeIcon: string;
    @Input() inactiveIcon: string;
    @Output() toggleVisible = new EventEmitter();

    private _subs = new Subscription();
    private _colourRGB: string = "";
    private _colour2RGB: string = ""; // Should only be set for the "special" all points ROI
    private _shape: string = "circle";

    constructor(
        private _viewStateService: ViewStateService,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit(): void
    {
        this._colourRGB = this.item.colour;
        this._colour2RGB = this.item.colour2;
        this._shape = this.item.shape;
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get label(): string
    {
        return this.item.label;
    }

    get sharedBy(): string
    {
        return this.item.sharedBy;
    }

    get visible(): boolean
    {
        return this.item.active;
    }

    get colour(): string
    {
        return this._colourRGB;
    }

    get colour2(): string
    {
        return this._colour2RGB;
    }

    get shape(): string
    {
        return this._shape;
    }

    getAtomicNumber(elemSymbol: string): number
    {
        return periodicTableDB.getElementBySymbol(elemSymbol).Z;
    }

    onColours(event): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";

        // let usedColours = this._viewStateService.getInUseROIColours();
        let items = PickerDialogData.getStandardColourChoices([]);

        // Find the colour we're currently set to
        let curr: string[] = [];

        if(this._colourRGB && this._colourRGB.length > 0)
        {
            curr.push(this._colourRGB);
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

                // Save this colour
                if(!this._viewStateService.setROIColour(this.item.roiID, colourRGB))
                {
                    alert("Failed to save colour setting \""+colourRGB+"\" for ROI: \""+this.item.roiID+"\"");
                }
                else
                {
                    this._colourRGB = this._viewStateService.getROIColour(this.item.roiID);
                }
            }
        );
    }

    onShapes(event): void
    {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";

        // let usedShapes = this._viewStateService.getInUseROIShapes();
        let items = PickerDialogData.getStandardShapeChoices([]);

        // Find the colour we're currently set to
        let currentShape: string[] = [];

        if(this._shape && this._shape.length > 0)
        {
            currentShape.push(this._shape);
        }

        dialogConfig.data = new PickerDialogData(false, true, false, false, items, currentShape, "This shape is applied to a different ROI", new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
            (shapes: string[])=>
            {
                let shape = "";
                if(shapes.length > 0)
                {
                    shape = shapes[0];
                }

                // Save this colour
                if(!this._viewStateService.setROIShape(this.item.roiID, shape))
                {
                    alert("Failed to save shape setting \""+shape+"\" for ROI: \""+this.item.roiID+"\"");
                }
                else
                {
                    this._shape = this._viewStateService.getROIShape(this.item.roiID);
                }
            }
        );
    }

    onVisibility(event)
    {
        this.toggleVisible.emit(this.item.roiID);
    }
}
