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
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { DataExpressionService } from "src/app/services/data-expression.service";
import { positionDialogNearParent } from "src/app/utils/utils";
import { QuantificationService } from "src/app/services/quantification.service";


// This allows the user to pick the specific column of element data they are interested in. PIQUANT gives us
// several columns, and on top of this PIXLISE now allows recomputing from carbonate/oxide to the pure element
// form AND there are 2 detectors involved here. This all adds up to a lot of choices, and this dialog presents
// them in a simple way resulting in a single expression id chosen.

// Inputs: All columns AKA expression IDs, and the currently selected ID
// For example, with multiple detectors and pure element available:
//  [
//      "expr-elem-Al2O3-%(A)"
//      "expr-elem-Al2O3-int(A)"
//      "expr-elem-Al2O3-err(A)"
//      "expr-elem-Al-%(A)"
//  ]
//
// Outputs: The single chosen one
export class ElementColumnPickerDialogData
{
    constructor(
        public columns: string[],
        public selectedColumn: string,
        public triggerElementRef: ElementRef
    )
    {
    }
}

@Component({
    selector: "app-element-column-picker",
    templateUrl: "./element-column-picker.component.html",
    styleUrls: ["./element-column-picker.component.scss"]
})
export class ElementColumnPickerComponent implements OnInit
{
    private _selectedID: string = "";

    // What we show to user - the column names (if there are more than one!)
    private _printableColumns: string[] = [];
    private _nonPureIDs: string[] = [];

    private _printablePureColumns: string[] = [];
    private _pureIDs: string[] = [];

    // And a pure-element switch
    private _pureElement: boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: ElementColumnPickerDialogData,
        public dialogRef: MatDialogRef<ElementColumnPickerComponent>,
        private _ViewContainerRef: ViewContainerRef
    )
    {
    }

    ngOnInit(): void
    {
        this._selectedID = this.data.selectedColumn;

        this._printableColumns = [];
        this._nonPureIDs = [];

        this._printablePureColumns = [];
        this._pureIDs = [];

        this._pureElement = false;

        // Run through each ID, if it's pure, store in pure, else in the other one
        let nonPurePrintableToID = new Map<string, string>();

        for(let id of this.data.columns)
        {
            const column = DataExpressionService.getPredefinedQuantExpressionElementColumn(id);
            const niceName = QuantificationService.getPrintableColumnName(column);

            const formula = DataExpressionService.getPredefinedQuantExpressionElement(id);
            let state = periodicTableDB.getElementOxidationState(formula);
            if(state && state.isElement)
            {
                this._printablePureColumns.push(niceName);
                this._pureIDs.push(id);

                if(id === this._selectedID)
                {
                    this._pureElement = true;
                }
            }
            else
            {
                this._printableColumns.push(niceName);
                nonPurePrintableToID.set(niceName, id);
            }
        }

        // Sort the columns, so it's consistant no matter what's selected
        // NOTE: we reverse sort, just to have Weight% first!
        this._printableColumns.sort();
        this._printableColumns.reverse();

        // Now build the list of IDs matching the sorted column names
        for(let col of this._printableColumns)
        {
            this._nonPureIDs.push(nonPurePrintableToID.get(col));
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

    get showUsePureElement(): boolean
    {
        return this._pureIDs.length > 0;
    }

    get showColumnSelect(): boolean
    {
        return !this._pureElement;
    }

    get actualColumns(): string[]
    {
        if(this._pureElement)
        {
            return this._pureIDs;
        }
        return this._nonPureIDs;
    }

    get printableColumns(): string[]
    {
        if(this._pureElement)
        {
            return this._printablePureColumns;
        }
        return this._printableColumns;
    }

    get selectedColumn(): string
    {
        return this._selectedID;
    }

    onChangeSelection(event): void
    {
        this._selectedID = event;
    }

    get usePureElement(): boolean
    {
        return this._pureElement;
    }

    togglePureElement(): void
    {
        this._pureElement = !this._pureElement;

        // If we're no longer using pure element, set the multiselector to the first item
        if(!this._pureElement)
        {
            this._selectedID = this._nonPureIDs[0];
        }
        else
        {
            this._selectedID = this._pureIDs[0];
        }
    }

    onAccept(): void
    {
        this.dialogRef.close(this._selectedID);
    }
}