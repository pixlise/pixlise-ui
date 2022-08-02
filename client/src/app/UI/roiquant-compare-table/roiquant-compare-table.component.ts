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
import { Subscription } from "rxjs";
import { QuantificationSummary } from "src/app/models/Quantifications";
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { MultiQuantificationComparisonResponse, QuantificationService } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { roiQuantTableState, ViewState, ViewStateService } from "src/app/services/view-state.service";
import { WidgetDataUpdateReason, WidgetRegionDataService } from "src/app/services/widget-region-data.service";
import { IconButtonState } from "src/app/UI/atoms/buttons/icon-button/icon-button.component";
import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";
import { TableData, TableHeaderItem, TableRow } from "src/app/UI/atoms/table/table.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { httpErrorToString } from "src/app/utils/utils";


@Component({
    selector: ViewStateService.widgetSelectorROIQuantCompareTable,
    templateUrl: "./roiquant-compare-table.component.html",
    styleUrls: ["./roiquant-compare-table.component.scss", "../atoms/table/table.component.scss"]
})
export class ROIQuantCompareTableComponent implements OnInit
{
    private _subs = new Subscription();
    private _quantCompareQuery = new Subscription();

    @Input() widgetPosition: string = "";

    private _selectedROIID: string = "";
    private _selectedROI: ROISavedItem = null;
    private _selectedROIColour: string = "";

    private _quantIDs: string[] = [];

    private _lastQuantList: QuantificationSummary[] = [];
    private _lastROIMap: Map<string, ROISavedItem> = new Map<string, ROISavedItem>();

    private _errorMessage: string = "";

    quantTables: TableData = TableData.makeEmpty();

    constructor(
        private _widgetDataService: WidgetRegionDataService,
        private _viewStateService: ViewStateService,
        private _quantService: QuantificationService,
        private _roiService: ROIService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._quantService.quantificationList$.subscribe(
            (quants: QuantificationSummary[])=>
            {
                this._lastQuantList = quants;
                this.updateTable("quant-list", null);
            },
            (err)=>
            {
            }
        ));

        this._subs.add(this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this._lastROIMap = rois;
                this.updateTable("roi-list", null);
            }
        ));

        this._subs.add(this._viewStateService.roiColours$.subscribe(
            ()=>
            {
                this.updateTable("roi-colours", null);
            }
        ));

        this._subs.add(this._viewStateService.viewState$.subscribe(
            (viewState: ViewState)=>
            {
                console.log("Restoring table view state...");

                let loadedState = viewState.roiQuantTables.get(this.widgetPosition);
                if(loadedState)
                {
                    this._selectedROIID = loadedState.roi;
                    this._quantIDs = loadedState.quantIDs;

                    this.updateTable("view-state", null);
                }
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
        this._quantCompareQuery.unsubscribe();
    }

    get thisSelector(): string
    {
        return ViewStateService.widgetSelectorROIQuantCompareTable;
    }

    get isSolo(): IconButtonState
    {
        return this._viewStateService.isSoloView(this.thisSelector, this.widgetPosition) ? IconButtonState.ACTIVE : IconButtonState.OFF;
    }

    onToggleSolo(): void
    {
        this._viewStateService.toggleSoloView(this.thisSelector, this.widgetPosition);
    }

    private saveState(reason: string): void
    {
        console.log("ROI quant table saveState called due to: "+reason);
        this._viewStateService.setROIQuantTable(this.getViewState(), this.widgetPosition);
    }

    private getViewState(): roiQuantTableState
    {
        let toSave = new roiQuantTableState(
            this._selectedROIID,
            this._quantIDs
        );
        return toSave;
    }

    get message(): string
    {
        if(!this._selectedROIID)
        {
            return "Please select a region...";
        }

        if(!this._quantIDs || this._quantIDs.length <= 0)
        {
            return "Please select one or more quantifications...";
        }

        return this._errorMessage;
    }
    
    get quantButtonEnabled(): boolean
    {
        return this._selectedROI != null || this._selectedROIID == PredefinedROIID.RemainingPoints;
    }

    onRegion(event): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';
        dialogConfig.data = new ROIPickerData(true, true, false, true, [this._selectedROIID], true, false, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (visibleROIs: string[])=>
            {
                // Result should be a list of element symbol strings
                if(visibleROIs && visibleROIs.length > 0)
                {
                    this._selectedROIID = visibleROIs[0];

                    const reason = "rois-dialog";

                    this.saveState(reason);
                    this.updateTable(reason, null);
                }
            }
        );
    }

    onQuants(event): void
    {
        const dialogConfig = new MatDialogConfig();
        //dialogConfig.backdropClass = 'empty-overlay-backdrop';

        let userQuants: PickerDialogItem[] = [];
        userQuants.push(new PickerDialogItem(null, "My Quantifications", null, true));

        let sharedQuants: PickerDialogItem[] = [];
        sharedQuants.push(new PickerDialogItem(null, "Shared Quantifications", null, true));

        let roiQuants = this._quantService.filterQuantificationsForROI(this._selectedROIID, this._lastQuantList, "complete", true, true);
        //let roiQuants = this._lastQuantList;
        for(let quant of roiQuants)
        {
            // Only interested in completed, combined quantifications, we can't view the others...
            if(/*quant.status == "complete" &&*/ quant.params.quantMode == "Combined")
            {
                let item = new PickerDialogItem(quant.jobId, quant.params.name, null, true);
                if(quant.shared)
                {
                    sharedQuants.push(item);
                }
                else
                {
                    userQuants.push(item);
                }
            }
        }

        let items: PickerDialogItem[] = [];
        if(userQuants.length > 1)
        {
            items.push(...userQuants);
        }
        if(sharedQuants.length > 1)
        {
            items.push(...sharedQuants);
        }

        dialogConfig.data = new PickerDialogData(true, true, true, true, items, this._quantIDs, "", new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);

        // NOTE: We don't update as clicks happen, we wait for an apply button press!
        //
        //        dialogRef.componentInstance.onSelectedIdsChanged.subscribe(
        //            (ids: string[])=>
        dialogRef.afterClosed().subscribe(
            (ids: string[])=>
            {
                if(ids)
                {
                    this._quantIDs = ids;
                    
                    const reason = "quants-dialog";

                    this.saveState(reason);
                    this.updateTable(reason, null);
                }
            }
        );
    }

    private updateTable(reason: string, widgetUpdReason: WidgetDataUpdateReason): void
    {
        // Firstly, we update our ROI information so we're showing the right label/colour
        this._selectedROI = this._lastROIMap.get(this._selectedROIID);
        if(!this._selectedROI)
        {
            this._selectedROI = null;
            this._selectedROIColour = "";
        }
        else
        {
            this._selectedROIColour = this._viewStateService.getROIColour(this._selectedROIID);
        }

        // If we have everything we need, request the list
        if(this._selectedROIID && this._quantIDs.length > 0)
        {
            this.quantTables = null; // indicate loading...
            this._errorMessage = ""; // no error (yet)

            this._quantCompareQuery.unsubscribe();
            this._quantCompareQuery = new Subscription();

            let remainingPMCs = [];
            if(this._selectedROIID == PredefinedROIID.RemainingPoints)
            {
                remainingPMCs = this._widgetDataService.getRemainingPMCs();
            }

            this._quantCompareQuery.add(this._quantService.compareQuantificationsForROI(this._selectedROIID, this._quantIDs, remainingPMCs).subscribe(
                (resp: MultiQuantificationComparisonResponse)=>
                {
                    // Reprocess the returned data for presentation. We want to show 1 table with all values in it
                    // so first column is elements, then each column is the values for those elements in that quantification
                    // and header rows are quant names.
                    let headers: TableHeaderItem[] = [new TableHeaderItem("Element", "")];
                    let totalsRow: TableRow = new TableRow("Total:", [], []);
                    let elems: Set<string> = new Set<string>();

                    for(let table of resp.quantTables)
                    {
                        headers.push(new TableHeaderItem(table.quantName, ""));

                        for(let [elemLabel, value] of table.tableData.entries())
                        {
                            // Snip off the _% (if exists)
                            let elem = elemLabel;
                            if(elem.endsWith("_%"))
                            {
                                elem = elemLabel.substring(0, elemLabel.length-2);
                            }

                            elems.add(elem);
                        }

                        totalsRow.values.push(table.totalValue);
                    }

                    // Order the elements
                    let orderedElems = Array.from(elems).sort();

                    // Now build the table rows using the sorted elements
                    let rows: TableRow[] = [];

                    for(let elem of orderedElems)
                    {
                        let row = new TableRow(elem, [], []);
                        for(let table of resp.quantTables)
                        {
                            let value = table.tableData.get(elem);
                            if(value === undefined)
                            {
                                value = null;
                            }
                            row.values.push(value);
                        }

                        rows.push(row);
                    }

                    this.quantTables = new TableData(
                        this.selectedROIName,
                        this.selectedROIColour,
                        "%",
                        headers,
                        rows,
                        totalsRow
                    );
                },
                (err)=>
                {
                    this._errorMessage = httpErrorToString(err, "Compare Failed");
                    this.quantTables = TableData.makeEmpty();
                }
            ));
        }
    }

    get selectedROIName(): string
    {
        if(!this._selectedROI)
        {
            return "";
        }
        return this._selectedROI.name;
    }

    get selectedROIColour(): string
    {
        return this._selectedROIColour;
    }
}
