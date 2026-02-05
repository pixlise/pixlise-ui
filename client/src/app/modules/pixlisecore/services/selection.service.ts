/* eslint-disable prefer-const */
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
import { Observable, ReplaySubject, combineLatest, forkJoin, map } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { BeamSelection } from "../models/beam-selection";
import { PixelSelection } from "../models/pixel-selection";
import { invalidPMC, encodeIndexList, httpErrorToString, decodeIndexList, getPathBase, SDSFields } from "src/app/utils/utils";

import { APIDataService } from "./apidata.service";
import { SelectedScanEntriesReq, SelectedScanEntriesResp, SelectedScanEntriesWriteReq } from "src/app/generated-protos/selection-entry-msgs";
import { SelectedImagePixelsReq, SelectedImagePixelsResp, SelectedImagePixelsWriteReq } from "src/app/generated-protos/selection-pixel-msgs";
import { ScanEntry } from "src/app/generated-protos/scan-entry";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ImageGetReq, ImageGetResp, ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { ScanImagePurpose, ScanImageSource } from "src/app/generated-protos/image";
import { ScanEntryRange } from "src/app/generated-protos/scan";

import { PMCConversionResult, ScanIdConverterService } from "src/app/modules/pixlisecore/services/scan-id-converter.service";
import { ContextImageDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { NewROIDialogData, NewROIDialogComponent } from "src/app/modules/roi/components/new-roi-dialog/new-roi-dialog.component";
import { PMCSelectorDialogComponent } from "src/app/modules/pixlisecore/components/atoms/selection-changer/pmc-selector-dialog/pmc-selector-dialog.component";
import { PixelPoint } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/selection/model";

import { ContextImageItemTransform } from "src/app/modules/image-viewers/models/image-transform";
import { ContextImageModelLoadedData, ContextImageScanModel } from "src/app/modules/image-viewers/widgets/context-image/context-image-model-internals";
import { Point } from "src/app/models/Geometry";
import { RGBUImage } from "src/app/models/RGBUImage";

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

  static makeEmptySelectionItem(scanIds: string[] = []): SelectionHistoryItem {
    const beamSel = new Map<string, Set<number>>();
    for (const scanId of scanIds) {
      beamSel.set(scanId, new Set<number>());
    }

    const result = new SelectionHistoryItem(new BeamSelection(beamSel), PixelSelection.makeEmptySelection(), PixelSelection.makeEmptySelection());
    return result;
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
      conversions.push(
        this._scanIdConverterService.convertScanEntryPMCToIndex(
          scanId,
          Array.from(beams.getSelectedScanEntryPMCs(scanId)),
          ignoreInvalidPMCs
        )
      );
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

  restoreSavedSelection(scanIds: string[], imageName: string) {
    const reads = [];
    let entryIdx = -1;
    let pixelIdx = -1;
    let imgIdx = -1;

    if (scanIds.length > 0) {
      entryIdx = reads.length;
      reads.push(this._dataService.sendSelectedScanEntriesRequest(SelectedScanEntriesReq.create({ scanIds: scanIds })));
    }
    if (imageName.length > 0) {
      pixelIdx = reads.length;
      reads.push(this._dataService.sendSelectedImagePixelsRequest(SelectedImagePixelsReq.create({ image: imageName })));
      imgIdx = reads.length;
      reads.push(this._dataService.sendImageGetRequest(ImageGetReq.create({ imageName: imageName })));
    }

    combineLatest(reads).subscribe(results => {
      let beamSel = BeamSelection.makeEmptySelection();
      let pixelSel = PixelSelection.makeEmptySelection();

      if (entryIdx > -1) {
        const scanEntries = results[entryIdx] as SelectedScanEntriesResp;

        const selPMCs = new Map<string, Set<number>>();
        for (const scanId in scanEntries.scanIdEntryIndexes) {
          selPMCs.set(scanId, new Set<number>(decodeIndexList(scanEntries.scanIdEntryIndexes[scanId].indexes)));
        }

        beamSel = BeamSelection.makeSelectionFromScanEntryPMCSets(selPMCs);
      }

      if (pixelIdx > -1 && imgIdx > -1) {
        const pixelEntries = results[pixelIdx] as SelectedImagePixelsResp;
        const imgResp = results[imgIdx] as ImageGetResp;

        if (pixelEntries.pixelIndexes && (pixelEntries?.pixelIndexes?.indexes.length || 0) > 0 && imgResp.image) {
          pixelSel = new PixelSelection(new Set<number>(decodeIndexList(pixelEntries.pixelIndexes.indexes)), imgResp.image?.width, imgResp.image?.height, imageName);
        }
      }

      console.log("Restoring selection to saved " + beamSel.getSelectedEntryCount() + " PMCs, " + pixelSel.selectedPixels.size + " pixels...");

      this.setSelection(beamSel, pixelSel, false, false);
    });
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
      const pmcs = encodeIndexList(Array.from(beams.getSelectedScanEntryPMCs(id)));
      entries[id] = ScanEntryRange.create({ indexes: pmcs });
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

    if (wait$.length > 0) {
      combineLatest(wait$).subscribe();
    }
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
  clearSelection(scanIds: string[]): void {
    console.log("Selection cleared");

    // Clear selection, but preserve cropped area
    const currentSelection = this.getCurrentSelection();
    const emptySelection = SelectionHistoryItem.makeEmptySelectionItem(scanIds);
    emptySelection.cropSelection = currentSelection.cropSelection;
    this.addSelection(emptySelection);

    this.updateListeners();

    this.persistSelection(emptySelection.beamSelection, emptySelection.pixelSelection, false);

    //let toSave = new selectionState([], "", []);
    //this._viewStateService.setSelection(toSave);
  }
  /*
  clearSelectionAndHistory(): void {
    this._selectionStack = [SelectionHistoryItem.makeEmptySelectionItem()];
    this._selectionCurrIdx = 0;
  }
*/
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
    if (entryPMC === invalidPMC) {
      this.clearHoverEntry();
      return;
    }

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

  newROIFromSelection(defaultScanId: string = ""): void {
    const dialogConfig = new MatDialogConfig<NewROIDialogData>();

    dialogConfig.data = {
      defaultScanId: defaultScanId,
    };
    const dialogRef = this._dialog.open(NewROIDialogComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((created: boolean) => {
      if (created) {
        this.clearSelection([defaultScanId]);
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

  selectNearbyPixels(scanIds: string[], contextImageDataService: ContextImageDataService) {
    // Get context image model for each scan that has a MSA file
    this._cachedDataService.getImageList(ImageListReq.create({ scanIds: scanIds })).subscribe((imageListResp: ImageListResp) => {
      const imagesToSelectFor: string[] = [];
      const scanIdForImage: string[] = [];
      for (const img of imageListResp.images) {
        if (img.purpose === ScanImagePurpose.SIP_MULTICHANNEL && img.source === ScanImageSource.SI_UPLOAD) {
          const fields = SDSFields.makeFromFileName(getPathBase(img.imagePath));
          if (fields?.prodType === "MSA") {
            imagesToSelectFor.push(img.imagePath);
            let scanId = "";
            if (img.originScanId.length > 0) {
              scanId = img.originScanId;
            } else if (img.imagePath.startsWith(scanIds[0])) {
              scanId = scanIds[0];
            }

            if (scanId.length <= 0) {
              console.error(`Failed to find Origin scan ID for MSA image: ${img.imagePath}`);
              continue;
            }

            scanIdForImage.push(scanId);

            // NOTE: for now, we only work on the first image, because selection doesn't support multiple images!
            break;
          }
        }
      }

      if (imagesToSelectFor.length <= 0) {
        return;
      }

      // For all the images we want to select pixels for, do it
      const models$ = [];
      for (const img of imagesToSelectFor) {
        models$.push(contextImageDataService.getModelData(img, new Map<string, number>(), ""));
      }

      forkJoin(models$).subscribe((models: ContextImageModelLoadedData[]) => {
        const currSel = this.getCurrentSelection();

        // Read pixel selections back from each image/model we're working on
        const idxs = currSel.beamSelection.getSelectedScanEntryIndexes(scanIdForImage[0]);

        if (idxs.size <= 0) {
          this._snackbarService.openError("No PMCs selected", "Cannot select nearby pixels if no PMCs are selected!");
          return;
        }

        const scanMdl = models[0].scanModels.get(scanIdForImage[0]);
        if (scanMdl && models[0].rgbuSourceImage && models[0].imageTransform) {
          let pixelSelection = this.getJoinedNearbyPixelSelection(
            imagesToSelectFor[0],
            idxs,
            scanMdl,
            models[0].rgbuSourceImage,
            models[0].imageTransform,
            currSel.pixelSelection
          );
          this.setSelection(currSel.beamSelection, pixelSelection, true);
        }
      });
    });
  }

  private getJoinedNearbyPixelSelection(
    imageName: string,
    locationIndexes: Set<number>,
    mdl: ContextImageScanModel,
    rgbuImage: RGBUImage,
    imageTransform: ContextImageItemTransform,
    currPixelSel: PixelSelection
  ): PixelSelection {
    // Transform PMC selection into a list of pixel indices that are within all PMC sub-polygons
    const selectedPixels = Array.from(locationIndexes).reduce((prevPixels: number[], location: number) => {
      // Get pixels within each polygon corresponding to selected PMCs
      let polygonPixels = this.getPixelsInPolygon(mdl.scanPointPolygons[location].points, rgbuImage, imageTransform);
      return [...prevPixels, ...polygonPixels];
    }, []);

    // Get width and height from red channel
    const redChannel = rgbuImage.r;
    const [width, height] = [redChannel.width, redChannel.height];

    let newPixelSelection: Set<number> = new Set();
    // If there's a current pixel selection, use this as the starting point
    if (currPixelSel) {
      newPixelSelection = currPixelSel.selectedPixels;
    }

    newPixelSelection = new Set([...newPixelSelection, ...selectedPixels]);
    return new PixelSelection(newPixelSelection, width, height, imageName);
  }

  private getPixelsInPolygon(
    polygon: Point[],
    rgbuImage: RGBUImage,
    imageTransform: ContextImageItemTransform,
    oversizeRadius: number = 2,
    includeOversizedPoints: boolean = false
  ): number[] {
    const polygonPixels: Set<number> = new Set();
    polygon.forEach(point => {
      // Convert point to pixel index
      const currentPixel = this.getPixelIndexAtPoint(point, rgbuImage, imageTransform);
      if (currentPixel >= 0) {
        // Get an oversized pixel selection based on polygon points
        const nearbyPixels = this.getNearbyPixels(currentPixel, rgbuImage, imageTransform, oversizeRadius);
        nearbyPixels.forEach(pixel => {
          // Add pixel from oversized pixel selection to polygon pixels if it's in the polygon or oversized points are included
          if (includeOversizedPoints || this.pointInPolygon(polygon, pixel.point)) {
            polygonPixels.add(pixel.i);
          }
        });
      }
    });
    return Array.from(polygonPixels);
  }

  private getNearbyPixels(pixelIndex: number, rgbuImage: RGBUImage, imageTransform: ContextImageItemTransform, radius: number = 3): PixelPoint[] {
    // Only contine if we have a valid RGBU context image and requested radius >= 0
    if (radius < 0) {
      return [];
    }
    const redChannel = rgbuImage.r;
    // Convert pixelIndex to x and y point coordinates
    const yCoord = Math.floor(pixelIndex / redChannel.width);
    const xCoord = pixelIndex % redChannel.width;
    // Calculate top left starting point
    const startX = Math.max(xCoord - radius, 0);
    const startY = Math.max(yCoord - radius, 0);
    // Calculate bottom right ending point
    const endX = Math.min(xCoord + radius, redChannel.width - 1);
    const endY = Math.min(yCoord + radius, redChannel.height - 1);
    const pixels = [];
    // Generate a square with pixelIndex in center with specified radius
    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const index = y * redChannel.width + x;
        // Verify nothing went wrong and this is a valid index
        if (index >= 0 && index < redChannel.values.length) {
          // Offset coordinates to be in global draw coordinate system
          const offsetX = x + imageTransform.xOffset;
          const offsetY = y + imageTransform.yOffset;
          // Join point with pixel index
          pixels.push({ point: new Point(offsetX, offsetY), i: index });
        }
      }
    }
    return pixels;
  }

  private getPixelIndexAtPoint(point: Point, rgbuImage: RGBUImage, imageTransform: ContextImageItemTransform): number {
    const redChannel = rgbuImage.r;
    // Remove offset from point and convert to index using red channel for width
    const rawX = Math.round(point.x) - imageTransform.xOffset;
    const rawY = Math.round(point.y) - imageTransform.yOffset;
    const pixelIndex = rawY * redChannel.width + rawX;
    // Return -1 if pixel index is not within bounds
    if (pixelIndex <= 0 || pixelIndex >= redChannel.values.length) {
      return -1;
    }
    return pixelIndex;
  }

  // Algorithm adapted from https://www.algorithms-and-technologies.com/point_in_polygon/javascript
  private pointInPolygon(polygon: Point[], point: Point): boolean {
    // A point is in a polygon if a line from the point to infinity crosses the polygon an odd number of times
    let oddNumberOfCrossings = false;
    // For each edge (In this case for each point of the polygon and the previous one)
    for (let i = 0, j = polygon.length - 1; i < polygon.length; i++) {
      // If a line from the point into infinity crosses this edge
      if (
        polygon[i].y > point.y !== polygon[j].y > point.y && // One point needs to be above, one below our y coordinate
        // ...and the edge doesn't cross our Y corrdinate before our x coordinate (but between our x coordinate and infinity)
        point.x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / (polygon[j].y - polygon[i].y) + polygon[i].x
      ) {
        oddNumberOfCrossings = !oddNumberOfCrossings;
      }
      j = i;
    }
    // If the number of crossings was odd, the point is in the polygon
    return oddNumberOfCrossings;
  }
}
