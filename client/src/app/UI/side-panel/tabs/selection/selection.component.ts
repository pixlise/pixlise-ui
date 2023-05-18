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

import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { BeamSelection } from "src/app/models/BeamSelection";
import { DataSet, ContextImageItem } from "src/app/models/DataSet";
import { ContextImageService } from "src/app/services/context-image.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { DataSetService } from "src/app/services/data-set.service";
import { ROIService } from "src/app/services/roi.service";
import { SelectionHistoryItem, SelectionService } from "src/app/services/selection.service";
import { httpErrorToString } from "src/app/utils/utils";
import { SelectionTabModel, AverageRGBURatio } from "./model";

const emptySelectionDescription = "Empty";

export class PMCAndDisplay
{
    constructor(public pmc: number, public displayPMC: string)
    {
    }
}

@Component({
    selector: "app-selection",
    templateUrl: "./selection.component.html",
    styleUrls: ["./selection.component.scss", "../../side-panel.component.scss"]
})
export class SelectionComponent implements OnInit
{
    private _subs = new Subscription();

    private _selectedPMCs: number[] = [];
    private _displaySelectedPMCs: PMCAndDisplay[] = [];
    private _summary: string = emptySelectionDescription;
    private _averageRGBURatios: AverageRGBURatio[] = [];
    hoverPMC: number = -1;
    expandedIndices: number[] = [0, 1];
    subDataSetIDs: string[] = [];
    isPublicUser: boolean = false;

    constructor(
        private _datasetService: DataSetService,
        private _roiService: ROIService,
        private _selectionService: SelectionService,
        private _contextImageService: ContextImageService,
        private _authService: AuthenticationService,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit(): void
    {
        this._subs.add(this._datasetService.dataset$.subscribe(
            (dataset: DataSet)=>
            {
                this.subDataSetIDs = [];

                let sources = dataset.experiment.getScanSourcesList();
                for(let src of sources)
                {
                    this.subDataSetIDs.push(src.getRtt());
                }
            }
        ));

        this._subs.add(this._selectionService.selection$.subscribe(
            (selection: SelectionHistoryItem)=>
            {
                this._selectedPMCs = Array.from(selection.beamSelection.getSelectedPMCs()).sort(
                    (pmc1: number, pmc2: number)=>
                    {
                        if(pmc1 === pmc2)
                        {
                            return 0;
                        }

                        if(pmc2 < pmc1)
                        {
                            return 1;
                        }
                        return -1;
                    }
                );

                let pmcsByDataset = SelectionComponent.MakePMCsByDataset(this._selectedPMCs, this._datasetService.datasetLoaded);

                // Now run through the maps and build displayable stuff
                this._displaySelectedPMCs = [];
                for(let [id, pmcs] of pmcsByDataset)
                {
                    if(id != "")
                    {
                        // Add a sub-heading
                        this._displaySelectedPMCs.push(new PMCAndDisplay(-1, "Dataset RTT: "+id));
                    }

                    for(let c = 0; c < pmcs.length; c+=2)
                    {
                        this._displaySelectedPMCs.push(new PMCAndDisplay(pmcs[c], pmcs[c+1].toLocaleString()));
                    }
                }

                this._summary = "";
                if(this._selectedPMCs.length > 0)
                {
                    // Get percentage of selected PMCs with normal spectra out of all PMCs with normal spectra
                    let selectedPMCsWithNormalSpectra = this._datasetService.datasetLoaded.locationPointCache.filter(point =>
                    {
                        return (point.hasNormalSpectra || point.hasDwellSpectra) && this._selectedPMCs.includes(point.PMC);
                    });
                    let percentSelected = Math.round(selectedPMCsWithNormalSpectra.length / this._datasetService.datasetLoaded.locationsWithNormalSpectra * 10000) / 100;

                    this._summary += `${this._selectedPMCs.length.toLocaleString()} PMCs (${percentSelected}%)`;
                }

                if(selection.pixelSelection.selectedPixels.size > 0)
                {
                    if(this._summary.length > 0)
                    {
                        this._summary += ", ";
                    }
                    this._summary += selection.pixelSelection.selectedPixels.size.toLocaleString()+" pixels";
                }
                if(this.summary.length <= 0)
                {
                    this._summary = emptySelectionDescription;
                }

                // Only calculate RGBU ratio averages if dataset has an RGBU Image
                if(this._datasetService.datasetLoaded.rgbuImages.length > 0) 
                {
                    let contextImage = this._contextImageService.mdl.contextImageItemShowing;
                    this._averageRGBURatios = SelectionTabModel.calculateAverageRGBURatios(selection, contextImage);
                }
            }
        ));

        this._subs.add(this._selectionService.hoverChangedReplaySubject$.subscribe(
            ()=>
            {
                this.hoverPMC = this._selectionService.hoverPMC;
            }
        ));

        this._subs.add(this._authService.isPublicUser$.subscribe(
            (isPublicUser)=>
            {
                this.isPublicUser = isPublicUser;
            }
        ));
    }

    ngOnDestroy()
    {
        this._subs.unsubscribe();
    }

    public static MakePMCsByDataset(pmcs: number[], dataset: DataSet): Map<string, number[]>
    {
        // Make a display string list, this includes subheadings for dataset IDs where there are combined datasets
        let pmcsByDataset = new Map<string, number[]>(); // NOTE we add PMC twice to the array, once the original, once the without offset one

        for(let pmc of pmcs)
        {
            let idx = dataset.pmcToLocationIndex.get(pmc);
            let datasetID = "";
            let savePMC = pmc;

            if(idx != undefined)
            {
                let loc = dataset.locationPointCache[idx];
                if(loc.source)
                {
                    savePMC = loc.getPMCWithoutOffset();
                    datasetID = loc.source.getRtt();
                }
            }

            if(pmcsByDataset.get(datasetID) == undefined)
            {
                pmcsByDataset.set(datasetID, []);
            }

            pmcsByDataset.get(datasetID).push(pmc, savePMC);
        }
        return pmcsByDataset;
    }

    get summary(): string
    {
        return this._summary;
    }

    get displaySelectedPMCs(): PMCAndDisplay[]
    {
        return this._displaySelectedPMCs;
    }

    get averageRGBURatios(): AverageRGBURatio[]
    {
        return this._averageRGBURatios;
    }

    onToggleExpand(index: number)
    {
        if(this.expandedIndices.includes(index))
        {
            this.expandedIndices = this.expandedIndices.filter(i => i !== index);
        }
        else
        {
            this.expandedIndices.push(index);
        }
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

    onUndo()
    {
        if(!this._selectionService.undoSelection())
        {
            alert("Nothing to undo");
        }
    }

    onRedo()
    {
        if(!this._selectionService.redoSelection())
        {
            alert("Nothing to redo");
        }
    }

    onPMCEnter(pmc: number)
    {
        // Show this PMC as the "hovered" one, which will highlight it in views
        this._selectionService.setHoverPMC(pmc);
    }

    onPMCLeave(pmc: number)
    {
        this._selectionService.setHoverPMC(-1);
    }

    onClearSelection()
    {
        this._selectionService.clearSelection();
        this._averageRGBURatios = [];
    }

    onNewROI()
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
                    this._averageRGBURatios = [];
                }
            },
            (err)=>
            {
                alert(httpErrorToString(err, ""));
            }
        );
    }


    getRGBUContextImageItemShowing(): ContextImageItem
    {
        // Make sure there's a valid context image before proceeding
        if(!this._contextImageService || !this._contextImageService.mdl || !this._contextImageService.mdl.contextImageItemShowing)
        {
            return null;
        }

        let contextImage = this._contextImageService.mdl.contextImageItemShowing;

        // Verify there's a valid RGBU Source Image
        if(!contextImage.rgbuSourceImage || contextImage.rgbuSourceImage.r.values.length <= 0)
        {
            return null;
        }

        return contextImage;
    }

    onAddNearbyPixels()
    {
        let dataset = this._datasetService.datasetLoaded;
        let contextImage = this.getRGBUContextImageItemShowing();

        if(!dataset || !contextImage) 
        {
            return;
        }

        let currentSelection = this._selectionService.getCurrentSelection();
        let beamSelection = currentSelection.beamSelection;

        let pixelSelection = SelectionTabModel.getJoinedNearbyPixelSelection(dataset, contextImage, currentSelection);
        this._selectionService.setSelection(dataset, beamSelection, pixelSelection);
    }

    onEnterSelection(): void
    {
        this._selectionService.promptUserForPMCSelection(this.dialog);
    }


    onUnselectPMC(pmc: number)
    {
        let dataset = this._datasetService.datasetLoaded;
        if(!dataset)
        {
            return;
        }

        this._selectionService.unselectPMC(pmc, dataset);
    }
    /*
    onToggleHidePMC(pmc: number)
    {
        alert('Not implemented yet');
    }
*/
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

    get canUndo(): boolean
    {
        return this._selectionService.canUndo();
    }

    get canRedo(): boolean
    {
        return this._selectionService.canRedo();
    }

    onDriftCorrection(): void
    {
        alert("Not implemented yet");
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
