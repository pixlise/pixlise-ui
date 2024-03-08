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
import { Observable, ReplaySubject, combineLatest, map } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { BeamSelection } from "../models/beam-selection";
import { PixelSelection } from "../models/pixel-selection";
import { invalidPMC, encodeIndexList, httpErrorToString } from "src/app/utils/utils";

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
import { PMCConversionResult, ScanIdConverterService } from "./scan-id-converter.service";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APICachedDataService } from "./apicacheddata.service";
import { Dialog } from "@angular/cdk/dialog";
import { ScanEntry } from "src/app/generated-protos/scan-entry";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { NewROIDialogData, NewROIDialogComponent } from "../../roi/components/new-roi-dialog/new-roi-dialog.component";
import { PMCSelectorDialogComponent } from "../components/atoms/selection-changer/pmc-selector-dialog/pmc-selector-dialog.component";

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
    private _scanIdConverterService: ScanIdConverterService,
    private _snackbarService: SnackbarService,
    private _cachedDataService: APICachedDataService,
    private _dialog: MatDialog
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
    const pastLimit = this._selectionStack.length - maxSelectionStackLength;
    if (pastLimit > 0) {
      this._selectionStack.splice(0, pastLimit);
    }
    this._selectionCurrIdx = this._selectionStack.length - 1;
  }

  // Sets the selection. If beam or pixels isn't required, use makeEmptySelection() on the selection class!
  setSelection(beams: BeamSelection, pixels: PixelSelection, persist: boolean = true, ignoreInvalidPMCs: boolean = false): void {
    // At this point, beams contains indexes, we want to also have PMCs stored so start with that
    const scanIds = beams.getScanIds();
    const conversions = [];

    for (const scanId of scanIds) {
      conversions.push(this._scanIdConverterService.convertScanEntryPMCToIndex(scanId, Array.from(beams.getSelectedScanEntryPMCs(scanId)), ignoreInvalidPMCs));
    }

    // If we don't have anything to subscribe for (because we have no beams), stop here
    if (conversions.length <= 0) {
      this.setSelectionInternal(scanIds, [], beams, pixels, persist);
    } else {
      combineLatest(conversions).subscribe((conversionResults: PMCConversionResult[]) => {
        let allScanIndexes: number[][] = [];

        let failedCount = 0;
        let failedPMCMessages: string[] = [];
        conversionResults.forEach((conversion: PMCConversionResult, i) => {
          allScanIndexes.push(conversion.result);
          if (conversion.failedPMCs.length > 0) {
            // Show a warning to the user that some PMCs were not found
            failedPMCMessages.push(`Failed to select PMCs for ${scanIds[i]}: ${conversion.failedPMCs.join(", ")}`);
            failedCount += conversion.failedPMCs.length;

            // Remove the failed PMCs from the selection
            for (const failedPMC of conversion.failedPMCs) {
              beams.getSelectedScanEntryPMCs(scanIds[i]).delete(failedPMC);
            }
          }
        });

        if (failedCount > 0) {
          this._snackbarService.openWarning(`${failedCount} PMCs could not be selected!`, failedPMCMessages.join("\n"));
        }

        this.setSelectionInternal(scanIds, allScanIndexes, beams, pixels, persist);
      });
    }
  }

  private setSelectionInternal(scanIds: string[], allScanIndexes: number[][], beams: BeamSelection, pixels: PixelSelection, persist: boolean) {
    const currentSelection = this.getCurrentSelection();

    for (let c = 0; c < scanIds.length; c++) {
      beams.setSelectedScanEntryIndexes(scanIds[c], allScanIndexes[c]);
    }

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
      const idxs = encodeIndexList(Array.from(beams.getSelectedScanEntryPMCs(id)));
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

  // Beam Selection specific
  unselectPMC(scanId: string, pmc: number): boolean {
    // Run through the current selection, remove the specified one
    const curSel = this.getCurrentSelection();
    const selPMCs = curSel.beamSelection.getSelectedScanEntryPMCs(scanId);
    if (selPMCs.has(pmc)) {
      selPMCs.delete(pmc);

      const newSel = new Map<string, Set<number>>();
      for (const selScanId of curSel.beamSelection.getScanIds()) {
        if (selScanId == scanId) {
          newSel.set(scanId, selPMCs);
        } else {
          newSel.set(selScanId, curSel.beamSelection.getSelectedScanEntryPMCs(selScanId));
        }
      }

      this.setSelection(new BeamSelection(newSel), curSel.pixelSelection);
      return true;
    }

    return false;
  }

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
      next: (conversionResults: PMCConversionResult) => {
        this._hoverScanId = scanId;
        this._hoverEntryPMC = entryPMC;
        this._hoverEntryIndex = conversionResults.result[0];
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
/*
  // Central place where UI can come to ask for user entry of selected PMCs
  promptUserForPMCSelection(dialog: MatDialog, scanIds: string[]): void {
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
        }* /

        alert("No PMCs were able to be read from entered text. Selection not changed.");
      }
      // else: User cancelled...
    });
  }
*/
  private isSelectable(entry: ScanEntry): boolean {
    // If it has pseudo-intensities, it's gotta have usable data. We check for normal too but when a dataset
    // isn't fully downloaded we won't have them, but also don't want to only check pseudo-intensity in case
    // it's a dataset that doesn't have any anyway (eg breadboard)
    return entry.pseudoIntensities || entry.normalSpectra > 0;
  }

  selectUserSpecifiedPMCs(): void {
    this._dialog.open(PMCSelectorDialogComponent, new MatDialogConfig());
  }

  newROIFromSelection(defaultScanId: string): void {
    const dialogConfig = new MatDialogConfig<NewROIDialogData>();

    dialogConfig.data = {
      defaultScanId: defaultScanId,
    };
    const dialogRef = this._dialog.open(NewROIDialogComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((created: boolean) => {
      if (created) {
        this.clearSelection();
      }
    });
  }

  selectAllPMCs(scanIds: string[]) {
    this.selectPMCs(scanIds, (scanId: string, entry: ScanEntry) => {
      return this.isSelectable(entry);
    });
  }

  selectDwellPMCs(scanIds: string[]) {
    this.selectPMCs(scanIds, (scanId: string, entry: ScanEntry) => {
      return entry.dwellSpectra > 0;
    });
  }

  invertPMCSelection(scanIds: string[]) {
    const currentSelection = this.getCurrentSelection().beamSelection;
    let selScanIds = currentSelection.getScanIds();
    if (selScanIds.length == 0) {
      selScanIds = scanIds;
    }

    this.selectPMCs(selScanIds, (scanId: string, entry: ScanEntry) => {
      return !currentSelection.has(scanId, entry.id) && this.isSelectable(entry);
    });
  }

  private selectPMCs(scanIds: string[], includeFunc: (scanId: string, entry: ScanEntry) => boolean) {
    const obs$ = [];

    for (const scanId of scanIds) {
      obs$.push(this.makePMCsForScanId(scanId, includeFunc));
    }

    combineLatest(obs$).subscribe((results: Set<number>[]) => {
      const selection = new Map<string, Set<number>>();
      for (let c = 0; c < scanIds.length; c++) {
        selection.set(scanIds[c], results[c]);
      }

      this.setSelection(new BeamSelection(selection), PixelSelection.makeEmptySelection());
    });
  }

  private makePMCsForScanId(scanId: string, includeFunc: (scanId: string, entry: ScanEntry) => boolean): Observable<Set<number>> {
    return this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })).pipe(
      map((resp: ScanEntryResp) => {
        const items = new Set<number>();
        for (let c = 0; c < resp.entries.length; c++) {
          if (includeFunc(scanId, resp.entries[c])) {
            items.add(resp.entries[c].id);
          }
        }

        return items;
      })
    );
  }
}
