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

import { Component, ElementRef, EventEmitter, Inject, OnInit, Output, ViewContainerRef } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Colours } from "src/app/utils/colours";
import { positionDialogNearParent } from "src/app/utils/utils";





const gapSizeHalf = 4; // Should be the same as $sz-half from CSS

export class PickerDialogItem
{
    // If id == null, it will be treated as a heading above other radio items
    constructor(
        public id: string,
        public label: string,
        public icon: string,
        public enabled: boolean
    )
    {
    }
}

export class PickerDialogData
{
    constructor(
        public multiSelect: boolean,
        public showClearButton: boolean,
        public showSelectAllButton: boolean,
        public showApplyButton: boolean,
        public items: PickerDialogItem[],
        public initialSelectedIds: string[],
        public disabledTooltip: string,
        public triggerElementRef: ElementRef
    )
    {
    }

    public static getStandardColourChoices(usedColourIds: string[]): PickerDialogItem[]
    {
        let colourblindSafeColourIds = [
            Colours.ORANGE.asString(),
            Colours.HOPBUSH.asString(),
            Colours.YELLOW.asString(),
            Colours.PURPLE.asString(),
        ];

        const colourblindSafeChoiceImgs = [
            "assets/colour-ramps/orange.svg",
            "assets/colour-ramps/hopbush.svg",
            "assets/colour-ramps/yellow.svg",
            "assets/colour-ramps/purple.svg",
        ];

        let unsafeColourIds = [
            Colours.ROI_TEAL.asString(),
            Colours.ROI_GREEN.asString(),
            Colours.ROI_BROWN.asString(),
            Colours.ROI_MAROON.asString(),
            Colours.ROI_RED.asString(),
            Colours.ROI_PINK.asString(),
            Colours.ROI_BLUE.asString(),
        ];

        const unsafeChoiceImgs = [
            "assets/colour-ramps/roi-teal.svg",
            "assets/colour-ramps/roi-green.svg",
            "assets/colour-ramps/roi-brown.svg",
            "assets/colour-ramps/roi-maroon.svg",
            "assets/colour-ramps/roi-red.svg",
            "assets/colour-ramps/roi-pink.svg",
            "assets/colour-ramps/roi-blue.svg",
        ];

        let items: PickerDialogItem[] = [];
        items.push(new PickerDialogItem(null, "Colourblind Safe", null, true));

        // Add each colour, setting each one that's not allowed to be disabled
        for(let c = 0; c < colourblindSafeColourIds.length; c++)
        {
            items.push(new PickerDialogItem(colourblindSafeColourIds[c], null, colourblindSafeChoiceImgs[c], usedColourIds.indexOf(colourblindSafeColourIds[c]) < 0));
        }

        items.push(new PickerDialogItem(null, "Additional", null, true));
        for(let c = 0; c < unsafeColourIds.length; c++)
        {
            items.push(new PickerDialogItem(unsafeColourIds[c], null, unsafeChoiceImgs[c], usedColourIds.indexOf(unsafeColourIds[c]) < 0));
        }

        return items;
    }
}

@Component({
    selector: "picker-dialog",
    templateUrl: "./picker-dialog.component.html",
    styleUrls: ["./picker-dialog.component.scss"]
})
export class PickerDialogComponent implements OnInit
{
    private _selectedIds: string[] = [];

    @Output() onSelectedIdsChanged = new EventEmitter();

    activeIcon: string = "assets/button-icons/radio-on.svg";
    inactiveIcon: string = "assets/button-icons/radio-off.svg";
    disabledIcon: string = "assets/button-icons/radio-disabled.svg";

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: PickerDialogData,
        public dialogRef: MatDialogRef<PickerDialogComponent>,
        private _ViewContainerRef: ViewContainerRef
    )
    {
    }

    ngOnInit()
    {
        if(this.data.multiSelect)
        {
            this.activeIcon = "assets/button-icons/check-on.svg";
            this.inactiveIcon = "assets/button-icons/check-off.svg";
        }

        // Remember selected ones but only ones that exist!
        // This is a bit slow but not likely to have a huge number of items/only happens once anyway
        this._selectedIds = [];
        for(let id of this.data.initialSelectedIds)
        {
            let found = false;
            for(let item of this.data.items)
            {
                if(item.id == id)
                {
                    this._selectedIds.push(id);
                    found = true;
                    break;
                }
            }
            if(!found)
            {
                console.warn("PickerDialog given selection of: "+id+" which does not exist in item list. Ignored.");
            }
        }
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

    get disabledTooltip(): string
    {
        return this.data.disabledTooltip;
    }

    get showClearButton(): boolean
    {
        return this.data.showClearButton;
    }

    get clearButtonDisabled(): boolean
    {
        return this._selectedIds.length <= 0;
    }

    get showSelectAllButton(): boolean
    {
        return this.data.showSelectAllButton;
    }

    get showApplyButton(): boolean
    {
        return this.data.showApplyButton;
    }

    isEnabled(item: PickerDialogItem): boolean
    {
        // If it's disabled, but selected, don't disable!
        if(this._selectedIds.indexOf(item.id) >= 0)
        {
            return true;
        }
        return item.enabled;
    }

    //this.dialogRef.close(null);

    onToggleItem(item: PickerDialogItem): void
    {
        if(!item.enabled)
        {
            // Ignore right here
            return;
        }

        let idx = this._selectedIds.indexOf(item.id);

        if(this.data.multiSelect)
        {
            if(idx < 0)
            {
                this._selectedIds.push(item.id);
            }
            else
            {
                this._selectedIds.splice(idx, 1);
            }
        }
        else
        {
            // Just one id to select
            this._selectedIds = [item.id];
        }

        this.onSelectedIdsChanged.emit(this._selectedIds);
    }

    onClear(): void
    {
        this._selectedIds = [];
        this.onSelectedIdsChanged.emit(this._selectedIds);
    }

    onSelectAll(): void
    {
        this._selectedIds = [];
        for(let item of this.data.items)
        {
            if(item.id && item.enabled)
            {
                this._selectedIds.push(item.id);
            }
        }
        this.onSelectedIdsChanged.emit(this._selectedIds);
    }

    onApply(): void
    {
        this.dialogRef.close(this._selectedIds);
    }

    isSelected(itemId: string): boolean
    {
        let idx = this._selectedIds.indexOf(itemId);
        return idx >= 0;
    }
}
