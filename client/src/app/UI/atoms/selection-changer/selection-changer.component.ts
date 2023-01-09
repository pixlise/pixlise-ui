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
import { BeamSelection } from "src/app/models/BeamSelection";
import { DataSetService } from "src/app/services/data-set.service";
import { DataSet } from "src/app/models/DataSet";
import { ROIService } from "src/app/services/roi.service";
import { SelectionHistoryItem, SelectionService, makeSelectionPrompt } from "src/app/services/selection.service";
import { SelectionOption, SelectionOptionsComponent, SelectionOptionsDialogData, SelectionOptionsDialogResult } from "src/app/UI/atoms/selection-changer/selection-options/selection-options.component";
import { httpErrorToString, parseNumberRangeString, UNICODE_CARET_DOWN } from "src/app/utils/utils";


@Component({
    selector: "selection-changer",
    templateUrl: "./selection-changer.component.html",
    styleUrls: ["./selection-changer.component.scss"]
})
export class SelectionChangerComponent implements OnInit
{
    private _subs = new Subscription();

    private _defaultLeftText = "No Selection";
    private _leftText: string = this._defaultLeftText;
    private _subDataSetIDs: string[] = [];

    constructor(
        private _selectionService: SelectionService,
        private _datasetService: DataSetService,
        private _roiService: ROIService,
        public dialog: MatDialog
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                this._subDataSetIDs = [];

                let sources = dataset.experiment.getScanSourcesList();
                for(let src of sources)
                {
                    this._subDataSetIDs.push(src.getRtt());
                }
            }
        ));

        this._subs.add(this._selectionService.selection$.subscribe(
            (selection: SelectionHistoryItem) =>
            {
                // Selection changed, show # points
                if(selection.beamSelection.locationIndexes.size > 0)
                {
                    this._leftText = selection.beamSelection.locationIndexes.size+" PMCs Selected";
                }
                else
                {
                    this._leftText = this._defaultLeftText;
                }
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    get leftText(): string
    {
        return this._leftText+" "+UNICODE_CARET_DOWN;
    }

    onSelection(): void
    {
        // User clicked on left side, show menu
        const dialogConfig = new MatDialogConfig();
        dialogConfig.backdropClass = "empty-overlay-backdrop";

        let dwellPMCs = this._datasetService.datasetLoaded.getDwellLocationIdxs();
        dialogConfig.data = new SelectionOptionsDialogData(dwellPMCs.size > 0, this._subDataSetIDs, new ElementRef(event.currentTarget));

        const dialogRef = this.dialog.open(SelectionOptionsComponent, dialogConfig);

        dialogRef.afterClosed().subscribe(
            (choice: SelectionOptionsDialogResult)=>
            {
                if(choice == null || choice == undefined)
                {
                    // User clicked away/cancelled dialog
                    return;
                }

                if(choice.result == SelectionOption.SEL_ALL)
                {
                    this.onSelectAll();
                }
                else if(choice.result == SelectionOption.SEL_ENTER_PMCS)
                {
                    this.onSelectSpecificPMC();
                }
                else if(choice.result == SelectionOption.SEL_DWELL)
                {
                    this.onSelectDwellPMCs();
                }
                else if(choice.result == SelectionOption.NEW_ROI)
                {
                    this.onNewROIFromSelection();
                }
                else if(choice.result == SelectionOption.SEL_SUBDATASET)
                {
                    this.onSelectForSubDataset(choice.value);
                }
                else
                {
                    alert("Error: selection failed - not implemented!");
                }
            }
        );
    }

    onClear(): void
    {
        this._selectionService.clearSelection();
    }

    onSelectAll(): void
    {
        // Just select all points!
        let selection = new Set<number>();

        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        for(let loc of dataset.locationPointCache)
        {
            selection.add(loc.locationIdx);
        }

        this._selectionService.setSelection(dataset, new BeamSelection(dataset, selection), null);
    }

    onSelectSpecificPMC(): void
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        let promptMsg = makeSelectionPrompt(dataset);
        let pmcStr = prompt(promptMsg);
        if(pmcStr)
        {
            let selectPMCs = parseNumberRangeString(pmcStr);

            let selection = new Set<number>();
            for(let pmc of selectPMCs)
            {
                let locIdx = dataset.pmcToLocationIndex.get(pmc);
                if(locIdx == undefined)
                {
                    alert("PMC: "+pmc+" is not valid");
                    return;
                }

                selection.add(locIdx);
            }

            if(selection.size > 0)
            {
                this._selectionService.setSelection(dataset, new BeamSelection(dataset, selection), null);
                return;
            }

            alert("No PMCs were able to be read from entered text. Selection not changed.");
        }
    }

    onSelectDwellPMCs(): void
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        let selection = dataset.getDwellLocationIdxs();
        this._selectionService.setSelection(dataset, new BeamSelection(dataset, selection), null);
    }

    onNewROIFromSelection(): void
    {
        this._roiService.makeROI(
            this._selectionService.getCurrentSelection().beamSelection.locationIndexes,
            this._selectionService.getCurrentSelection().pixelSelection.selectedPixels,
            this._selectionService.getCurrentSelection().pixelSelection.imageName,
            this.dialog
        ).subscribe(
            (created: boolean)=>
            {
                if(created)
                {
                    this._selectionService.clearSelection();
                }
            },
            (err)=>
            {
                alert(httpErrorToString(err, ""));
            }
        );
    }

    onSelectForSubDataset(id: string): void
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        let selection = dataset.getLocationIdxsForSubDataset(id);
        this._selectionService.setSelection(dataset, new BeamSelection(dataset, selection), null);
    }
}
