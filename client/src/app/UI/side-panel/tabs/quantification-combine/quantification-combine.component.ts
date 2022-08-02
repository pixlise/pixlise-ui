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

import { Component, ElementRef, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { PredefinedROIID, ROISavedItem } from "src/app/models/roi";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { ContextImageService } from "src/app/services/context-image.service";
import { DataSetService } from "src/app/services/data-set.service";
import { QuantificationSelectionInfo, QuantificationSelectionService } from "src/app/services/quantification-selection.service";
import { QuantCombineSummaryResponse, QuantificationService, ZStackItem } from "src/app/services/quantification.service";
import { ROIService } from "src/app/services/roi.service";
import { ViewStateService } from "src/app/services/view-state.service";
import { TableData, TableHeaderItem, TableRow } from "src/app/UI/atoms/table/table.component";
import { UserPromptDialogComponent, UserPromptDialogParams, UserPromptDialogResult, UserPromptDialogStringItem } from "src/app/UI/atoms/user-prompt-dialog/user-prompt-dialog.component";
import { ROIPickerComponent, ROIPickerData } from "src/app/UI/roipicker/roipicker.component";
import { RGBA } from "src/app/utils/colours";
import { httpErrorToString } from "src/app/utils/utils";
import { ZStackItemForDisplay } from "./zstack/zstack-item/zstack-item.component";











@Component({
    selector: "multi-quant-combine",
    templateUrl: "./quantification-combine.component.html",
    styleUrls: ["./quantification-combine.component.scss", "../../side-panel.component.scss"]
})
export class QuantificationCombineComponent implements OnInit
{
    private _subs = new Subscription();
    private _rois: Map<string, ROISavedItem> = null;

    zStack: ZStackItemForDisplay[] = [];
    message: string = "";
    summaryTableData: TableData = TableData.makeEmpty();

    waitingForCreate: boolean = false;

    //private _lastReceivedAPIZStack: ZStackItem[] = null;

    constructor(
        private _roiService: ROIService,
        private _quantService: QuantificationService,
        private _datasetService: DataSetService,
        private _viewStateService: ViewStateService,
        private _contextImageService: ContextImageService,
        private _quantSelectionService: QuantificationSelectionService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._roiService.roi$.subscribe(
            (rois: Map<string, ROISavedItem>)=>
            {
                this._rois = rois;
                /*
    Found to not be needed because editing ROIs is done on a different side bar panel so we don't need this live-updating

                // This is like when the API returns a z-stack... we have to regenerate our remaining points
                // count and colours on context image
                if(this._lastReceivedAPIZStack)
                {
                    this.handleZStackFromAPI(this._lastReceivedAPIZStack);
                }
*/
            },
            (err)=>
            {
            }
        ));

        // For now this has to listen to the service...
        this._subs.add(this._quantSelectionService.quantificationsSelected$.subscribe(
            (selection: QuantificationSelectionInfo)=>
            {
                // Should ONLY process ones with an ROI
                if(selection.roiID && selection.roiID.length > 0)
                {
                    this.onQuantificationSelected(selection);
                }
            }
        ));

        // Listen for changes to z-stack
        this._subs.add(this._quantService.multiQuantZStack$.subscribe(
            (zStackReceived: ZStackItem[])=>
            {
                this.handleZStackFromAPI(zStackReceived);

                // Save for later (so we can act on ROI changes)
                //this._lastReceivedAPIZStack = zStackReceived;
            }
        ));

        this.subscribeZStackTable();
    }

    private subscribeZStackTable(): void
    {
        this._subs.add(this._quantService.multiQuantZStackSummaryTable$.subscribe(
            (summary: QuantCombineSummaryResponse)=>
            {
                this.message = "";
                this.refreshSummaryTable(summary);
            },
            (err)=>
            {
                console.error(err);

                // Show the error too
                this.summaryTableData = TableData.makeEmpty();
                this.message = httpErrorToString(err, "Summary table generation failed");

                // Resubscribe for future
                this.subscribeZStackTable();
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();

        // Closing the side-bar panel hides the special PMC colouring on context image
        this.resetContextImageColouring();
    }

    private resetContextImageColouring(): void
    {
        if(this._contextImageService.mdl)
        {
            this._contextImageService.mdl.setPointDrawROIs(new Map<number, RGBA>());
        }
    }

    onRegions(): void
    {
        const dialogConfig = new MatDialogConfig();

        //dialogConfig.disableClose = true;
        //dialogConfig.autoFocus = true;
        //dialogConfig.width = '1200px';

        let rois: string[] = [];
        for(let item of this.zStack)
        {
            rois.push(item.zStackItem.roiID);
        }

        dialogConfig.data = new ROIPickerData(false, false, true, false, rois, true, false, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (roisSelected: string[])=>
            {
                // Result should be a list of element symbol strings
                if(roisSelected)
                {
                    // If there are any that have been removed, remove. Add new ones at the top. We were previously
                    // clearing and rebuilding but then you lose quants and order

                    // First, scan for removed ones
                    let newZStack: ZStackItem[] = [];
                    let existingROIs: string[] = [];
                    for(let item of this.zStack)
                    {
                        if(roisSelected.indexOf(item.zStackItem.roiID) > -1)
                        {
                            // Not deleted, preserve it!
                            newZStack.push(item.zStackItem);
                            existingROIs.push(item.zStackItem.roiID);
                        }
                    }

                    // Now add any new ones at the top
                    for(let roiID of roisSelected)
                    {
                        if(existingROIs.indexOf(roiID) == -1)
                        {
                            newZStack.unshift(new ZStackItem(roiID, ""));
                        }
                    }

                    // Display the changes
                    this.storeZStackForDisplay(newZStack);

                    // Handle the fact that these changed, will save to API
                    this.handleUserChangedZStack();
                }
            }
        );
    }

    onCreate(): void
    {
        // Ask user for extra parameters
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = new UserPromptDialogParams(
            "Multi-Quant Details",
            "Create",
            "Cancel",
            [
                new UserPromptDialogStringItem(
                    "Name",
                    (val: string)=>{return val.length > 0;}
                ),
                new UserPromptDialogStringItem(
                    "Description",
                    (val: string)=>{return true;}
                ),
            ]
        );

        const dialogRef = this.dialog.open(UserPromptDialogComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (result: UserPromptDialogResult)=>
            {
                if(result) // could've cancelled
                {
                    let zStack = this.makeZStackForAPI();

                    this.waitingForCreate = true;
                    this.summaryTableData = TableData.makeEmpty();
                    this.message = "Creating multi-quant, please wait...";

                    this.resetContextImageColouring();

                    this._quantService.combineMultipleQuantifications(result.enteredValues.get("Name"), result.enteredValues.get("Description"), zStack).subscribe(
                        (id: string)=>
                        {
                            this.waitingForCreate = false;
                            this.message = "Multi-quant created with id: "+id;
                        },
                        (err)=>
                        {
                            this.waitingForCreate = false;
                            this.message = httpErrorToString(err, "Multi-quant creation failed");
                        }
                    );
                }
            }
        );
    }

    // Make z-stack for saving to API. Adds remaining points ROI if z-stack is not empty AND if there is one defined
    private makeZStackForAPI(): ZStackItem[]
    {
        let result: ZStackItem[] = [];
        for(let item of this.zStack)
        {
            result.push(new ZStackItem(item.zStackItem.roiID, item.zStackItem.quantificationID));
        }

        return result;
    }

    // Takes the given z-stack and forms a displayable one which we use internally. This reads the
    // z-stack specified and expands it with ROI names and colours. Saves in this.zStack and also
    // manage the existance/updating of this.remainingPoints
    private storeZStackForDisplay(items: ZStackItem[]): number[] // Returns the remaining points
    {
        let toDisplay: ZStackItemForDisplay[] = [];
        let existingRemainingROIQuantID: string = "";

        for(let item of items)
        {
            // Split out the remaining points ROI if there is one
            if(item.roiID == PredefinedROIID.RemainingPoints)
            {
                existingRemainingROIQuantID = item.quantificationID;
            }
            else
            {
                // Expand ROI info - find the name and colour to save
                let name = "?";
                let sharer = "";

                if(this._rois)
                {
                    let roi = this._rois.get(item.roiID);
                    if(roi)
                    {
                        name = roi.name;

                        // If it's shared, show this too!
                        if(roi.shared)
                        {
                            sharer = roi.creator.name;
                        }
                    }
                }

                let colour = this._viewStateService.getROIColour(item.roiID);

                toDisplay.push(new ZStackItemForDisplay(name, sharer, colour, new ZStackItem(item.roiID, item.quantificationID)));
            }
        }

        // Manage remaining points

        // If we didn't have a remaining points, add one, if there are indeed remaining points. Otherwise delete if no remaining points
        let remainingPoints = this.getRemainingPMCs();

        if(remainingPoints.length > 0)
        {
            let remainingPointsLabel = "Remaining PMCs: "+remainingPoints.length;
            toDisplay.push(new ZStackItemForDisplay(
                remainingPointsLabel,
                "",
                ViewStateService.RemainingPointsColour.asString(),
                new ZStackItem(
                    PredefinedROIID.RemainingPoints,
                    existingRemainingROIQuantID
                )
            ));
        }

        // Use this for display
        this.zStack = toDisplay;

        return remainingPoints;
    }

    onReset(): void
    {
        // Set default UI state
        this.waitingForCreate = false;
        this.message = "";
        this.zStack = [];
        this.summaryTableData = TableData.makeEmpty();

        this.handleUserChangedZStack();
    }

    onShowUI(): void
    {
        this._viewStateService.enableMultiQuantCombineMode();
    }

    onQuantificationSelected(sel: QuantificationSelectionInfo): void
    {
        // Run through and find the ROI this was for, set it
        // NOTE: When we set it, we replace it with a new copy of the item, thereby triggering
        // change detection

        for(let c = 0; c < this.zStack.length; c++)
        {
            let item = this.zStack[c];
            if(item.zStackItem.roiID == sel.roiID)
            {
                this.zStack.splice(
                    c, 1,
                    new ZStackItemForDisplay(
                        item.roiName,
                        item.sharer,
                        item.colour,
                        new ZStackItem(
                            item.zStackItem.roiID,
                            sel.quantificationID
                        )
                    )
                );
                break;
            }
        }

        this.handleUserChangedZStack();
    }

    onZStackChanged(): void
    {
        this.handleUserChangedZStack();
    }

    onMakeROIFromRemainingPoints(): void
    {
        // Make an ROI out of the remaining points
        let pmcs = this.getRemainingPMCs();
        if(pmcs.length <= 0)
        {
            return;
        }

        // Form location indexes... annoying that we can't get them this way already
        let locIdxs: Set<number> = new Set<number>();
        for(let pmc of pmcs)
        {
            let locIdx = this._datasetService.datasetLoaded.pmcToLocationIndex.get(pmc);
            if(locIdx != undefined)
            {
                locIdxs.add(locIdx);
            }
        }

        this._roiService.makeROI(
            locIdxs,
            new Set<number>(),
            "",
            this.dialog
        ).subscribe(
            (created: boolean)=>
            {
                // Nothing to do, the ROI will come through roi$
            },
            (err)=>
            {
                alert(httpErrorToString(err, ""));
            }
        );
    }

    // User did something to the z-stack on UI, reorder, add/remove ROIs
    // Here we manage the remaining points ROI situation then save it to API
    private handleUserChangedZStack(): void
    {
        let zStack = this.makeZStackForAPI();

        // User has done something, here we update the quant service. We handle changes published by it
        // so if there is anything further to be done, that'll be handled that way.
        this._quantService.saveMultiQuantZStack(zStack);
    }

    // API just sent us an updated z-stack. Here we form the display version
    // and manage the remaining points ROI. Also notifies context image what point
    // colours to show per ROI point
    private handleZStackFromAPI(zStackReceived: ZStackItem[]): void
    {
        let remainingPoints = this.storeZStackForDisplay(zStackReceived);

        // Set the point colours in context image. NOTE: this may need to be modified
        // so it listens to zstack by itself
        if(this._contextImageService.mdl)
        {
            let colours = this.makePMCColours(remainingPoints);
            this._contextImageService.mdl.setPointDrawROIs(colours);
        }
    }

    private makePMCColours(remainingPMCs: number[]): Map<number, RGBA>
    {
        // At this point we tell the context image that it's now to draw points with these ROIs in mind...
        let colours = new Map<number, RGBA>();

        // Run through the PMCs, give them a colour
        if(this._rois)
        {
            let locs = this._datasetService.datasetLoaded.locationPointCache;

            // NOTE: we have to process the z-stack in reverse order, because PMCs within [0] in the array are
            // supposed to overwrite PMCs of [1], [2] etc
            for(let c = 0; c < this.zStack.length; c++)
            {
                let item = this.zStack[this.zStack.length-c-1];

                let roi = this._rois.get(item.zStackItem.roiID);
                if(roi)
                {
                    for(let locIdx of roi.locationIndexes)
                    {
                        if(locIdx >= 0 && locIdx < locs.length)
                        {
                            let loc = locs[locIdx];
                            if(loc && loc.hasNormalSpectra)
                            {
                                colours.set(loc.PMC, RGBA.fromString(item.colour));
                            }
                        }
                    }
                }
            }
        }

        for(let pmc of remainingPMCs)
        {
            colours.set(pmc, ViewStateService.RemainingPointsColour);
        }

        return colours;
    }

    private getRemainingPMCs(): number[]
    {
        let result: number[] = [];

        if(this._datasetService.datasetLoaded)
        {
            result = this._quantService.getRemainingPMCs(this._datasetService.datasetLoaded.locationPointCache, this._rois);
        }

        return result;
    }

    private refreshSummaryTable(summary: QuantCombineSummaryResponse): void
    {
        if(!summary)
        {
            this.summaryTableData = null;
            this.message = "Generating Multi-Quant Totals...";
            return;
        }

        let headers: TableHeaderItem[] = [
            new TableHeaderItem("Element", "")
        ];

        for(let det of summary.detectors)
        {
            headers.push(new TableHeaderItem("Weight %", "Detector: "+det));
        }

        let rows: TableRow[] = [];

        let totalValues: number[] = [];

        // We want to order the elements in atomic order, so get them first
        let elems = periodicTableDB.getElementsInAtomicNumberOrder(Array.from(summary.weightPercents.keys()));
        

        for(let elem of elems)
        {
            let item = summary.weightPercents.get(elem);
            let values = item.values;

            // Make the values all have the same tooltip
            let roiNameString = item.roiNames.join(",");
            let tooltips = [];
            for(let c = 0; c < values.length; c++)
            {
                tooltips.push(roiNameString);
            }
            rows.push(new TableRow(elem, values, tooltips));

            if(totalValues.length <= 0)
            {
                // Assign, first one
                totalValues = Array.from(values);
            }
            else
            {
                for(let c = 0; c < values.length; c++)
                {
                    totalValues[c] += values[c];
                }
            }
        }

        let totalsRow = new TableRow("Total:", totalValues, []);

        this.summaryTableData = new TableData(
            "Element Totals for Multi Quant",
            "",
            "%",
            headers,
            rows,
            totalsRow
        );
        this.message = "";
    }
}
