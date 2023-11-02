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
import { ReplaySubject, combineLatest } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { BeamSelection } from "../models/beam-selection";
import { PixelSelection } from "../models/pixel-selection";
import { parseNumberRangeString, invalidPMC, encodeIndexList, httpErrorToString } from "src/app/utils/utils";

import {
  UserPromptDialogComponent,
  UserPromptDialogParams,
  UserPromptDialogResult,
  UserPromptDialogStringItem,
} from "../components/atoms/user-prompt-dialog/user-prompt-dialog.component";
import { APIDataService } from "./apidata.service";
import { SelectedScanEntriesWriteReq } from "src/app/generated-protos/selection-entry-msgs";
import { SelectedImagePixelsWriteReq } from "src/app/generated-protos/selection-pixel-msgs";
import { ScanEntryRange } from "src/app/generated-protos/scan";
import { ScanIdConverterService } from "./scan-id-converter.service";

// The Selection service. It should probably be named something like CrossViewLinkingService though!
//
// This ended up being a catch-all for cross-view functionality. Primarily its function is to store the selection (and restore
// it from view state after reload), and notify views of selection changing. See selectionReplaySubject$ and selectionSubject$
// Somewhat related is the ability to hover over a PMC and see it shown in other views, so this ended up here too, see
// hoverChangedReplaySubject$
// Finally, chord diagrams allow clicking on a chord and this is then displayed on a binary diagram. This functionality is also
// cross-view linking, so it was added here (previously it was in LayoutService)

const maxSelectionStackLength = 20;

export class SelectionHistoryItem {
  constructor(
    public beamSelection: BeamSelection,
    public pixelSelection: PixelSelection,
    public cropSelection: PixelSelection | null = null
  ) {}

  isEqualTo(other: SelectionHistoryItem): boolean {
    const isEqualCrop =
      this.cropSelection === other.cropSelection ||
      (this.cropSelection !== null && other.cropSelection !== null && this.cropSelection.isEqualTo(other.cropSelection));
    return this.beamSelection.isEqualTo(other.beamSelection) && this.pixelSelection.isEqualTo(other.pixelSelection) && isEqualCrop;
  }

  static makeEmptySelectionItem(): SelectionHistoryItem {
    return new SelectionHistoryItem(BeamSelection.makeEmptySelection(), PixelSelection.makeEmptySelection(), PixelSelection.makeEmptySelection());
  }
}

@Injectable({
  providedIn: "root",
})
export class SelectionService {
  private _selectionStack: SelectionHistoryItem[] = [SelectionHistoryItem.makeEmptySelectionItem()];
  private _selectionSubject$ = new ReplaySubject<SelectionHistoryItem>();

  private _selectionCurrIdx: number = 0;

  private _hoverScanId: string = "";
  private _hoverEntryIndex: number = -1;
  private _hoverEntryPMC: number = invalidPMC; // We want to name these entry ID to make it more generic, but in code
  // id and idx (for index) are too similar and confusing so PMC all the way!

  private _hoverChangedReplaySubject$ = new ReplaySubject<void>(1);

  private _chordClicks$ = new ReplaySubject<string[]>(1);

  constructor(
    private _dataService: APIDataService,
    private _scanIdConverterService: ScanIdConverterService
  ) {}

  private updateListeners(): void {
    const currSel = this._selectionStack[this._selectionCurrIdx];
    this._selectionSubject$.next(currSel);
  }

  private addSelection(sel: SelectionHistoryItem): void {
    // Don't add if it's the same as what's already there (eg clearing multiple times)
    if (sel.isEqualTo(this.getCurrentSelection())) {
      return;
    }

    // If we're not currently pointing at the end of the array, delete everything above this point
    if (this._selectionCurrIdx < this._selectionStack.length - 1) {
      this._selectionStack.splice(this._selectionCurrIdx + 1, this._selectionStack.length - (this._selectionCurrIdx + 1));
    }

    this._selectionStack.push(sel);

    // If it's too long, drop something off the start of the array
    let pastLimit = this._selectionStack.length - maxSelectionStackLength;
    if (pastLimit > 0) {
      this._selectionStack.splice(0, pastLimit);
    }
    this._selectionCurrIdx = this._selectionStack.length - 1;
  }

  // Sets the selection. If beam or pixels isn't required, use makeEmptySelection() on the selection class!
  setSelection(beams: BeamSelection, pixels: PixelSelection, persist: boolean = true): void {
    const currentSelection = this.getCurrentSelection();

    console.log("Set selection to " + beams.getSelectedEntryCount() + " PMCs, " + pixels.selectedPixels.size + " pixels...");
    this.addSelection(new SelectionHistoryItem(beams, pixels, currentSelection.cropSelection));

    this.updateListeners();

    if (persist) {
      // We write out each item to API separately
      this.persistSelection(beams, pixels, false);
    }
  }

  private persistSelection(beams: BeamSelection, pixels: PixelSelection, isPixelCrop: boolean) {
    const wait$ = [];
    const entries: { [x: string]: ScanEntryRange } = {};
    let hasBeams = false;

    for (const id of beams.getScanIds()) {
      const idxs = encodeIndexList(Array.from(beams.getSelectedScanEntryIndexes(id)));
      entries[id] = ScanEntryRange.create({ indexes: idxs });
      hasBeams = true;
    }

    if (hasBeams) {
      wait$.push(
        this._dataService.sendSelectedScanEntriesWriteRequest(
          SelectedScanEntriesWriteReq.create({
            scanIdEntryIndexes: entries,
          })
        )
      );
    }

    if (pixels.selectedPixels.size > 0 && pixels.imageName.length > 0) {
      let imageName = pixels.imageName;
      if (isPixelCrop) {
        // TODO: What do we do with this?? Maybe need a crop field in API storage??
      }

      wait$.push(
        this._dataService.sendSelectedImagePixelsWriteRequest(
          SelectedImagePixelsWriteReq.create({
            image: pixels.imageName,
            pixelIndexes: {
              indexes: encodeIndexList(Array.from(pixels.selectedPixels)),
            },
          })
        )
      );
    }

    combineLatest(wait$).subscribe(results => {});
  }

  toggleCropSelection(): void {
    const currentSelection = this.getCurrentSelection();
    if (currentSelection.cropSelection && currentSelection.cropSelection.selectedPixels.size > 0) {
      this.uncropSelection();
    } else {
      this.cropSelection();
    }
  }

  cropSelection(): void {
    const currentSelection = this.getCurrentSelection();
    if (currentSelection.pixelSelection && currentSelection.pixelSelection.selectedPixels.size > 0) {
      this.addSelection(new SelectionHistoryItem(BeamSelection.makeEmptySelection(), PixelSelection.makeEmptySelection(), currentSelection.pixelSelection));
      this.updateListeners();
      this.persistSelection(BeamSelection.makeEmptySelection(), currentSelection.pixelSelection, true);
    }
  }

  uncropSelection(): void {
    const currentSelection = this.getCurrentSelection();
    if (currentSelection.cropSelection && currentSelection.cropSelection.selectedPixels.size > 0) {
      let saveCrop = false;
      if (!currentSelection.pixelSelection || currentSelection.pixelSelection.selectedPixels.size === 0) {
        this.addSelection(new SelectionHistoryItem(currentSelection.beamSelection, currentSelection.cropSelection, PixelSelection.makeEmptySelection()));
        saveCrop = true;
      } else {
        this.addSelection(new SelectionHistoryItem(currentSelection.beamSelection, currentSelection.pixelSelection, PixelSelection.makeEmptySelection()));
      }
      this.updateListeners();
      this.persistSelection(currentSelection.beamSelection, currentSelection.pixelSelection, saveCrop);
    }
  }
  /*
  // Beam Selection specific
  unselectPMC(pmc: number): boolean {
    // Run through the current selection, remove the specified one
    let locIdx = dataset.pmcToLocationIndex.get(pmc);
    if (!locIdx) {
      console.error("Failed to unselect PMC: " + pmc + ", could not find corresponding location index");
      return false;
    }

    let curSel = this.getCurrentSelection();

    if (curSel.beamSelection) {
      let newSel = new Set<number>(curSel.beamSelection.locationIndexes);
      newSel.delete(locIdx);
      this.setSelection(new BeamSelection(dataset, newSel), PixelSelection.makeEmptySelection());
    }

    return true;
  }
*/
  // General selection operations
  clearSelection(): void {
    console.log("Selection cleared");

    // Clear selection, but preserve cropped area
    const currentSelection = this.getCurrentSelection();
    const emptySelection = SelectionHistoryItem.makeEmptySelectionItem();
    emptySelection.cropSelection = currentSelection.cropSelection;
    this.addSelection(emptySelection);

    this.updateListeners();

    //let toSave = new selectionState([], "", []);
    //this._viewStateService.setSelection(toSave);
  }

  clearSelectionAndHistory(): void {
    this._selectionStack = [SelectionHistoryItem.makeEmptySelectionItem()];
    this._selectionCurrIdx = 0;
  }

  get selection$(): ReplaySubject<SelectionHistoryItem> {
    return this._selectionSubject$;
  }

  getCurrentSelection(): SelectionHistoryItem {
    return this._selectionStack[this._selectionCurrIdx];
  }

  undoSelection(): boolean {
    // Go back one in the array if possible
    if (this._selectionCurrIdx <= 0) {
      return false;
    }

    this._selectionCurrIdx--;
    this.updateListeners();
    return true;
  }

  redoSelection(): boolean {
    // Move up the array if possible
    if (this._selectionCurrIdx >= this._selectionStack.length - 1) {
      return false;
    }

    this._selectionCurrIdx++;
    this.updateListeners();
    return true;
  }

  canUndo(): boolean {
    return this._selectionCurrIdx > 0;
  }

  canRedo(): boolean {
    return this._selectionCurrIdx < this._selectionStack.length - 1;
  }

  // Mouse hovering over scan entries - we update listeners when this is called
  setHoverEntryPMC(scanId: string, entryPMC: number) {
    this._scanIdConverterService.convertScanEntryPMCToIndex(scanId, [entryPMC]).subscribe({
      next: (idxs: number[]) => {
        this._hoverScanId = scanId;
        this._hoverEntryPMC = entryPMC;
        this._hoverEntryIndex = idxs[0];
        this._hoverChangedReplaySubject$.next();
      },
      error: err => {
        console.log(httpErrorToString(err, "Failed to set hover PMC"));

        this.clearHoverEntry();
      },
    });
  }

  setHoverEntryIndex(scanId: string, entryIdx: number) {
    this._scanIdConverterService.convertScanEntryIndexToPMC(scanId, [entryIdx]).subscribe({
      next: (pmcs: number[]) => {
        this._hoverScanId = scanId;
        this._hoverEntryPMC = pmcs[0];
        this._hoverEntryIndex = entryIdx;
        this._hoverChangedReplaySubject$.next();
      },
      error: err => {
        console.log(httpErrorToString(err, "Failed to set hover index"));

        this.clearHoverEntry();
      },
    });
  }

  clearHoverEntry() {
    this._hoverScanId = "";
    this._hoverEntryPMC = invalidPMC;
    this._hoverEntryIndex = -1;
    this._hoverChangedReplaySubject$.next();
  }

  get hoverChangedReplaySubject$(): ReplaySubject<void> {
    return this._hoverChangedReplaySubject$;
  }

  get hoverScanId(): string {
    return this._hoverScanId;
  }

  get hoverEntryPMC(): number {
    return this._hoverEntryPMC;
  }

  get hoverEntryIdx(): number {
    return this._hoverEntryIndex;
  }

  // Chord clicking on context image, and showing that on binary diagram
  get chordClicks$(): ReplaySubject<string[]> {
    return this._chordClicks$;
  }

  // Central place where UI can come to ask for user entry of selected PMCs
  public promptUserForPMCSelection(dialog: MatDialog, scanIds: string[]): void {
    let promptMsg = "You can enter PMCs in a comma-separated list, and ranges are also allowed.\n\nFor example: 10,11,13-17";
    let prompts = [];

    for (const scanId of scanIds) {
      prompts.push("Enter PMCs for scan: " + scanId);
    }

    if (prompts.length <= 0) {
      prompts.push("Enter PMCs for current scan:");
    }

    let promptItems = [];

    for (let prompt of prompts) {
      promptItems.push(
        new UserPromptDialogStringItem(prompt, (val: string) => {
          return true;
        })
      );
    }

    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = new UserPromptDialogParams("Enter PMCs to Select", "Select", "Cancel", promptItems, false, "", () => {}, promptMsg);

    const dialogRef = dialog.open(UserPromptDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: UserPromptDialogResult) => {
      if (result) {
        /*let enteredValues = Array.from(result.enteredValues.values());

        try {
          let selection = new Set<number>(); //this.getPMCsForRTTs(enteredValues, dataset);
          if (selection.size > 0) {
            this.setSelection(BeamSelection.makeSelectionFromSingleScanEntryIndexes("abc123", selection), PixelSelection.makeEmptySelection());
            return;
          }
        } catch (e) {
          alert(e);
          return;
        }*/

        alert("No PMCs were able to be read from entered text. Selection not changed.");
      }
      // else: User cancelled...
    });
  }
}
