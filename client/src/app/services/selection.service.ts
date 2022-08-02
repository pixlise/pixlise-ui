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

import { Injectable } from "@angular/core";
import { ReplaySubject, Subscription } from "rxjs";
import { BeamSelection } from "src/app/models/BeamSelection";
import { PixelSelection } from "src/app/models/PixelSelection";
import { ROIService } from "src/app/services/roi.service";
import { selectionState, ViewState, ViewStateService } from "src/app/services/view-state.service";
import { DataSet } from "../models/DataSet";
import { DataSetService } from "./data-set.service";





// The Selection service. It should probably be named something like CrossViewLinkingService though!
//
// This ended up being a catch-all for cross-view functionality. Primarily its function is to store the selection (and restore
// it from view state after reload), and notify views of selection changing. See selectionReplaySubject$ and selectionSubject$
// Somewhat related is the ability to hover over a PMC and see it shown in other views, so this ended up here too, see
// hoverChangedReplaySubject$
// Finally, chord diagrams allow clicking on a chord and this is then displayed on a binary diagram. This functionality is also
// cross-view linking, so it was added here (previously it was in LayoutService)

const maxSelectionStackLength = 20;


export class SelectionHistoryItem
{
    constructor(public beamSelection: BeamSelection, public pixelSelection: PixelSelection, public cropSelection: PixelSelection = null)
    {
    }

    isEqualTo(other: SelectionHistoryItem): boolean
    {
        let isEqualCrop = this.cropSelection === other.cropSelection || (this.cropSelection !== null && other.cropSelection !== null && this.cropSelection.isEqualTo(other.cropSelection));
        return this.beamSelection.isEqualTo(other.beamSelection) && this.pixelSelection.isEqualTo(other.pixelSelection) && isEqualCrop;
    }

    static makeEmptySelectionItem(): SelectionHistoryItem
    {
        return new SelectionHistoryItem(BeamSelection.makeEmptySelection(), PixelSelection.makeEmptySelection(), PixelSelection.makeEmptySelection());
    }
}

@Injectable({
    providedIn: "root"
})
export class SelectionService
{
    private _subs = new Subscription();

    private _selectionStack: SelectionHistoryItem[] = [SelectionHistoryItem.makeEmptySelectionItem()];
    private _selectionSubject$ = new ReplaySubject<SelectionHistoryItem>();

    private _selectionCurrIdx: number = 0;

    private _hoverPMC: number = DataSet.invalidPMC;
    private _hoverLocationIdx: number = -1; // retrieved when PMC is set

    private _hoverChangedReplaySubject$ = new ReplaySubject<void>(1);

    private _chordClicks$ = new ReplaySubject<string[]>(1);

    constructor(
        private _datasetService: DataSetService,
        private _roiService: ROIService,
        private _viewStateService: ViewStateService
    )
    {
        this._subs.add(this._viewStateService.viewState$.subscribe(
            (viewState: ViewState)=>
            {
                // Clear everything!

                // NOTE: don't call this! It notifies this through view state and kills what we just loaded
                //this.clearPMCSelection();
                //this.clearPixelSelection();

                this._selectionStack = [SelectionHistoryItem.makeEmptySelectionItem()];
                this._selectionCurrIdx = 0;

                if(viewState.selection)
                {
                    console.log("Restoring selection from view-state...");

                    let beamSel: BeamSelection = null;
                    let pixSel: PixelSelection = null;

                    if(viewState.selection.locIdxs && viewState.selection.locIdxs.length > 0)
                    {
                        beamSel = new BeamSelection(this._datasetService.datasetLoaded, new Set<number>(viewState.selection.locIdxs), null);
                    }

                    if(viewState.selection.pixelIdxs && viewState.selection.pixelIdxs.length > 0)
                    {
                        pixSel = new PixelSelection(this._datasetService.datasetLoaded, new Set<number>(viewState.selection.pixelIdxs), 0, 0, viewState.selection.pixelSelectionImageName);
                    }

                    // Ensure we don't save the view state back straight away, we're only here because we just got given
                    // a new loaded view state with selection data!
                    this.setSelection(
                        this._datasetService.datasetLoaded,
                        beamSel,
                        pixSel,
                        false
                    );
                }
                else
                {
                    console.error("Selection service: View state not applied, invalid view state specified");
                }
            }
        ));
    }

    private updateListeners(): void
    {
        let currSel = this._selectionStack[this._selectionCurrIdx];
        this._selectionSubject$.next(currSel);
    }

    private addSelection(sel: SelectionHistoryItem): void
    {
        // Don't add if it's the same as what's already there (eg clearing multiple times)
        if(sel.isEqualTo(this.getCurrentSelection()))
        {
            return;
        }

        // If we're not currently pointing at the end of the array, delete everything above this point
        if(this._selectionCurrIdx < this._selectionStack.length-1)
        {
            this._selectionStack.splice(this._selectionCurrIdx+1, this._selectionStack.length-(this._selectionCurrIdx+1));
        }

        this._selectionStack.push(sel);

        // If it's too long, drop something off the start of the array
        let pastLimit = this._selectionStack.length-maxSelectionStackLength;
        if(pastLimit > 0)
        {
            this._selectionStack.splice(0, pastLimit);
        }
        this._selectionCurrIdx = this._selectionStack.length-1;
    }

    setSelection(dataset: DataSet, beams: BeamSelection, pixels: PixelSelection, saveViewState: boolean = true): void
    {
        // Don't allow nulls to be saved
        if(!beams)
        {
            beams = BeamSelection.makeEmptySelection();
        }

        if(!pixels)
        {
            pixels = PixelSelection.makeEmptySelection();
        }

        let currentSelection = this.getCurrentSelection();

        console.log("Set selection to " + beams.locationIndexes.size + " PMCs, "+ pixels.selectedPixels.size+" pixels...");
        this.addSelection(new SelectionHistoryItem(beams, pixels, currentSelection.cropSelection));

        this.updateListeners();

        if(saveViewState)
        {
            let toSave: selectionState = new selectionState(Array.from(beams.locationIndexes), pixels.imageName, Array.from(pixels.selectedPixels));
            this._viewStateService.setSelection(toSave);
        }
    }

    toggleCropSelection(): void
    {
        let currentSelection = this.getCurrentSelection();
        if(currentSelection.cropSelection && currentSelection.cropSelection.selectedPixels.size > 0) 
        {
            this.uncropSelection();   
        }
        else 
        {
            this.cropSelection();
        }
    }

    cropSelection(): void
    {
        let currentSelection = this.getCurrentSelection();
        if(currentSelection.pixelSelection && currentSelection.pixelSelection.selectedPixels.size > 0) 
        {
            this.addSelection(new SelectionHistoryItem(BeamSelection.makeEmptySelection(), PixelSelection.makeEmptySelection(), currentSelection.pixelSelection));
            this.updateListeners();

            let pixels = currentSelection.pixelSelection;
            let toSave: selectionState = new selectionState([], pixels.imageName, [], Array.from(pixels.selectedPixels));
            this._viewStateService.setSelection(toSave);
        }
    }

    uncropSelection(): void
    {
        let currentSelection = this.getCurrentSelection();
        if(currentSelection.cropSelection && currentSelection.cropSelection.selectedPixels.size > 0) 
        {
            let pixels = currentSelection.pixelSelection;
            let toSave: selectionState = null;

            if(!currentSelection.pixelSelection || currentSelection.pixelSelection.selectedPixels.size === 0) 
            {
                this.addSelection(new SelectionHistoryItem(currentSelection.beamSelection, currentSelection.cropSelection, PixelSelection.makeEmptySelection()));
                toSave = new selectionState(Array.from(currentSelection.beamSelection.locationIndexes), pixels.imageName, [], Array.from(pixels.selectedPixels));
            }
            else 
            {
                this.addSelection(new SelectionHistoryItem(currentSelection.beamSelection, currentSelection.pixelSelection, PixelSelection.makeEmptySelection()));
                toSave = new selectionState(Array.from(currentSelection.beamSelection.locationIndexes), pixels.imageName, Array.from(pixels.selectedPixels), []);
            }
            this.updateListeners();

            this._viewStateService.setSelection(toSave);
        }
    }

    // Beam Selection specific
    unselectPMC(pmc: number, dataset: DataSet): boolean
    {
        // Run through the current selection, remove the specified one
        let locIdx = dataset.pmcToLocationIndex.get(pmc);
        if(!locIdx)
        {
            console.error("Failed to unselect PMC: "+pmc+", could not find corresponding location index");
            return false;
        }

        let curSel = this.getCurrentSelection();

        if(curSel.beamSelection)
        {
            let newSel = new Set<number>(curSel.beamSelection.locationIndexes);
            newSel.delete(locIdx);
            this.setSelection(dataset, new BeamSelection(dataset, newSel), null);
        }

        return true;
    }

    // General selection operations
    clearSelection(): void
    {
        console.log("Selection cleared");

        // Clear selection, but preserve cropped area
        let currentSelection = this.getCurrentSelection();
        let emptySelection = SelectionHistoryItem.makeEmptySelectionItem();
        emptySelection.cropSelection = currentSelection.cropSelection;
        this.addSelection(emptySelection);

        this.updateListeners();

        let toSave = new selectionState([], "", []);
        this._viewStateService.setSelection(toSave);
    }

    get selection$(): ReplaySubject<SelectionHistoryItem>
    {
        return this._selectionSubject$;
    }

    getCurrentSelection(): SelectionHistoryItem
    {
        return this._selectionStack[this._selectionCurrIdx];
    }

    undoSelection(): boolean
    {
        // Go back one in the array if possible
        if(this._selectionCurrIdx <= 0)
        {
            return false;
        }

        this._selectionCurrIdx--;
        this.updateListeners();
        return true;
    }

    redoSelection(): boolean
    {
        // Move up the array if possible
        if(this._selectionCurrIdx >= this._selectionStack.length-1)
        {
            return false;
        }

        this._selectionCurrIdx++;
        this.updateListeners();
        return true;
    }

    canUndo(): boolean
    {
        return this._selectionCurrIdx > 0;
    }

    canRedo(): boolean
    {
        return this._selectionCurrIdx < this._selectionStack.length-1;
    }

    // Hovering over PMCs, updating other views to show where they are
    setHoverPMC(pmc: number): void
    {
        // ONLY publish this if there's a real change. It's a costly operation because it will redraw multiple canvases
        if(this._hoverPMC != pmc)
        {
            this._hoverPMC = pmc;

            let dataset = this._datasetService.datasetLoaded;
            if(dataset && this._hoverPMC > DataSet.invalidPMC)
            {
                this._hoverLocationIdx = dataset.pmcToLocationIndex.get(this._hoverPMC);
            }
            else
            {
                this._hoverLocationIdx = -1;
            }

            this._hoverChangedReplaySubject$.next();
        }
    }

    get hoverChangedReplaySubject$(): ReplaySubject<void>
    {
        return this._hoverChangedReplaySubject$;
    }

    get hoverPMC(): number
    {
        return this._hoverPMC;
    }

    get hoverLocationIdx(): number
    {
        return this._hoverLocationIdx;
    }

    // Like hoverLocationIdx but returns -1 if the location doesn't have a coordinate defined
    // Required by code that wants to show the position of the selected PMC, eg context image tools
    get hoverLocationWithCoordsIdx(): number
    {
        let dataset = this._datasetService.datasetLoaded;
        if(
            dataset &&
            this._hoverLocationIdx >= 0 &&
            this._hoverLocationIdx < dataset.locationPointCache.length &&
            dataset.locationPointCache[this._hoverLocationIdx] &&
            dataset.locationPointCache[this._hoverLocationIdx].coord
        )
        {
            return this._hoverLocationIdx;
        }

        return -1;
    }

    // Chord clicking on context image, and showing that on binary diagram
    get chordClicks$(): ReplaySubject<string[]>
    {
        return this._chordClicks$;
    }
}
