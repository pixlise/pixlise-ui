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
import { ContextImageService } from "src/app/services/context-image.service";
import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";
import { ColourScheme } from "src/app/UI/context-image-view-widget/model-interface";


@Component({
    selector: "context-visibility-settings",
    templateUrl: "./visibility-settings.component.html",
    styleUrls: ["./layer-settings.component.scss"]
})
export class VisibilitySettingsComponent implements OnInit
{
    @Input() label: string;

    // While we only have 2 settings... but make this an enum or something later
    @Input() bboxSettings: boolean;

    constructor(
        private contextImageService: ContextImageService,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit()
    {
    }

    onColours(event): void
    {
        let layerMan = this.contextImageService.mdl.layerManager;
        if(!layerMan)
        {
            return;
        }

        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";
        //dialogConfig.panelClass = "panel";
        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        let items: PickerDialogItem[] = [];
        items.push(new PickerDialogItem(null, "Colour", null, true));
        if(this.bboxSettings)
        {
            items.push(new PickerDialogItem(ColourScheme.PURPLE_CYAN, null, "assets/colour-ramps/purple-cyan.svg", true));
            items.push(new PickerDialogItem(ColourScheme.RED_GREEN, null, "assets/colour-ramps/red-green.svg", true));
            items.push(new PickerDialogItem(ColourScheme.BW, null, "assets/colour-ramps/black-white.svg", true));
        }
        else
        {
            // Points only allow selection of single colour so we show that image, but it's still the same enums...
            items.push(new PickerDialogItem(ColourScheme.PURPLE_CYAN, null, "assets/colour-ramps/cyan.svg", true));
            items.push(new PickerDialogItem(ColourScheme.BW, null, "assets/colour-ramps/white.svg", true));
        }

        let curr = this.contextImageService.mdl.pointColourScheme;
        if(this.bboxSettings)
        {
            curr = this.contextImageService.mdl.pointBBoxColourScheme;
        }

        dialogConfig.data = new PickerDialogData(false, false, false, false, items, [curr], "", new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
            (ids: string[])=>
            {
                let scheme = ColourScheme[ids[0]];
                if(this.bboxSettings)
                {
                    this.contextImageService.mdl.pointBBoxColourScheme = scheme;
                }
                else
                {
                    this.contextImageService.mdl.pointColourScheme = scheme;
                }
            }
        );
    }

    onVisibility(val: boolean): void
    {
        if(this.contextImageService.mdl)
        {
            if(this.bboxSettings)
            {
                this.contextImageService.mdl.showPointBBox = val;
            }
            else
            {
                this.contextImageService.mdl.showPoints = val;
            }
        }
    }

    get visible(): boolean
    {
        if(!this.contextImageService.mdl)
        {
            return false;
        }

        if(this.bboxSettings)
        {
            return this.contextImageService.mdl.showPointBBox;
        }
        return this.contextImageService.mdl.showPoints;
    }

    onDownload(): void
    {
        // TODO: Download
    }
}
