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

import { Component, ElementRef, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription, combineLatest } from "rxjs";
import { UNICODE_CARET_DOWN, httpErrorToString } from "src/app/utils/utils";
import { BeamSelection } from "../../../models/beam-selection";
import { SelectionService, SnackbarService } from "../../../pixlisecore.module";
import { SelectionHistoryItem } from "../../../services/selection.service";
import {
  SelectionOptionsDialogData,
  SelectionOptionsComponent,
  SelectionOptionsDialogResult,
  SelectionOption,
} from "./selection-options/selection-options.component";
import { AuthService } from "@auth0/auth0-angular";
import { Permissions } from "src/app/utils/permissions";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { APICachedDataService } from "../../../services/apicacheddata.service";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { PixelSelection } from "../../../models/pixel-selection";
import { ScanEntry } from "src/app/generated-protos/scan-entry";

@Component({
  selector: "selection-changer",
  templateUrl: "./selection-changer.component.html",
  styleUrls: ["./selection-changer.component.scss"],
})
export class SelectionChangerComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _defaultLeftText = "No Selection";
  private _leftText: string = this._defaultLeftText;

  private _userCanCreateROI: boolean = false;

  private _hasDwells: Map<string, boolean> = new Map<string, boolean>();

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    private _snackService: SnackbarService,
    private _authService: AuthService,
    private _cachedDataService: APICachedDataService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._selectionService.selection$.subscribe((selection: SelectionHistoryItem) => {
        // Selection changed, show # points
        const selPtCount = selection.beamSelection.getSelectedEntryCount();
        if (selPtCount > 0) {
          this._leftText = selPtCount + " PMCs Selected";
        } else {
          this._leftText = this._defaultLeftText;
        }
      })
    );

    this._subs.add(
      this._authService.idTokenClaims$.subscribe({
        next: claims => {
          if (claims) {
            // This all went unused during public user feature additions
            if (Permissions.permissionCount(claims) <= 0) {
              // User has no permissions at all, admins would've set them this way!
              // this.setDatasetListingNotAllowedError(HelpMessage.AWAITING_ADMIN_APPROVAL);
            } else {
              this._userCanCreateROI = Permissions.hasPermissionSet(claims, Permissions.permissionEditROI);
            }
          }
        },
      })
    );

    if (this._analysisLayoutService.defaultScanId) {
      this._cachedDataService
        .getScanList(
          ScanListReq.create({
            searchFilters: { scanId: this._analysisLayoutService.defaultScanId },
          })
        )
        .subscribe((resp: ScanListResp) => {
          if (resp.scans) {
            for (const scan of resp.scans) {
              this._hasDwells.set(scan.id, (scan.contentCounts["DwellSpectra"] || 0) > 0);
            }
          } else {
            throw new Error(`Selection changer: Failed to retrieve scan: ${this._analysisLayoutService.defaultScanId}`);
          }
        });
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get leftText(): string {
    return this._leftText + " " + UNICODE_CARET_DOWN;
  }

  onSelection(event): void {
    // User clicked on left side, show menu
    const dialogConfig = new MatDialogConfig();
    dialogConfig.backdropClass = "empty-overlay-backdrop";

    dialogConfig.data = new SelectionOptionsDialogData(
      this._hasDwells.get(this._analysisLayoutService.defaultScanId) || false, // Only show dwell if we have any
      !this._userCanCreateROI,
      [], // TODO: show all scan ids that exist, so we can have options to select ONLY all points for that dataset...
      new ElementRef(event.currentTarget)
    );

    const dialogRef = this.dialog.open(SelectionOptionsComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((choice: SelectionOptionsDialogResult) => {
      if (choice == null || choice == undefined) {
        // User clicked away/cancelled dialog
        return;
      }

      if (choice.result == SelectionOption.SEL_ALL) {
        this.onSelectAll();
      } else if (choice.result == SelectionOption.SEL_ENTER_PMCS) {
        this.onSelectSpecificPMC();
      } else if (choice.result == SelectionOption.SEL_DWELL) {
        this.onSelectDwellPMCs();
      } else if (choice.result == SelectionOption.NEW_ROI) {
        this.onNewROIFromSelection();
      } else if (choice.result == SelectionOption.SEL_SUBDATASET) {
        this.onSelectForSubDataset(choice.value);
      } else if (choice.result == SelectionOption.SEL_INVERT) {
        this.onInvertSelection();
      } else {
        alert("Error: selection failed - not implemented!");
      }
    });
  }

  onClear(): void {
    this._selectionService.clearSelection();
  }

  onSelectAll(): void {
    if (!this._analysisLayoutService.defaultScanId) {
      return;
    }

    this.selectAllForScanId(this._analysisLayoutService.defaultScanId);
  }

  private selectAllForScanId(scanId: string) {
    this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })).subscribe((resp: ScanEntryResp) => {
      const items = new Set<number>();
      for (let c = 0; c < resp.entries.length; c++) {
        if (this.isSelectable(resp.entries[c])) {
          //items.add(resp.entries[c].id)
          items.add(resp.entries[c].id);
        }
      }

      const selection = new Map<string, Set<number>>();
      selection.set(scanId, items);
      this._selectionService.setSelection(new BeamSelection(selection), PixelSelection.makeEmptySelection());
    });
  }

  private isSelectable(entry: ScanEntry): boolean {
    // If it has pseudo-intensities, it's gotta have usable data. We check for normal too but when a dataset
    // isn't fully downloaded we won't have them, but also don't want to only check pseudo-intensity in case
    // it's a dataset that doesn't have any anyway (eg breadboard)
    return entry.pseudoIntensities || entry.normalSpectra > 0;
  }

  onSelectSpecificPMC(): void {
    // TODO: Reimplement this
    //this._selectionService.promptUserForPMCSelection(this.dialog);
  }

  onSelectDwellPMCs(): void {
    if (!this._analysisLayoutService.defaultScanId) {
      return;
    }

    this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: this._analysisLayoutService.defaultScanId })).subscribe((resp: ScanEntryResp) => {
      const items = new Set<number>();
      for (let c = 0; c < resp.entries.length; c++) {
        if (resp.entries[c].dwellSpectra > 0) {
          //items.add(resp.entries[c].id)
          items.add(resp.entries[c].id);
        }
      }

      const selection = new Map<string, Set<number>>();
      selection.set(this._analysisLayoutService.defaultScanId, items);
      this._selectionService.setSelection(new BeamSelection(selection), PixelSelection.makeEmptySelection());
    });
  }

  onNewROIFromSelection(): void {
    // TODO: Reimplement this
    /*this._roiService
      .makeROI(
        this._selectionService.getCurrentSelection().beamSelection.locationIndexes,
        this._selectionService.getCurrentSelection().pixelSelection.selectedPixels,
        this._selectionService.getCurrentSelection().pixelSelection.imageName,
        this.dialog
      )
      .subscribe(
        (created: boolean) => {
          if (created) {
            this._selectionService.clearSelection();
          }
        },
        err => {
          alert(httpErrorToString(err, ""));
        }
      );*/
  }

  onSelectForSubDataset(id: string): void {
    this.selectAllForScanId(id);
  }

  onInvertSelection(): void {
    if (!this._analysisLayoutService.defaultScanId) {
      return;
    }

    // If selection has nothing in it, use teh default scan ID
    const sel = this._selectionService.getCurrentSelection().beamSelection;
    let selScanIds = sel.getScanIds();
    if (selScanIds.length == 0) {
      selScanIds = [this._analysisLayoutService.defaultScanId];
    }

    const entryReqs = [];
    for (const scanId of selScanIds) {
      entryReqs.push(this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })));
    }

    combineLatest(entryReqs).subscribe(results => {
      // We have ALL the entries for ALL the scans, so flip the selection here
      const newSel = new Map<string, Set<number>>();
      for (let c = 0; c < results.length; c++) {
        const curSel = sel.getSelectedScanEntryPMCs(selScanIds[c]);
        const thisScanNewSel = new Set<number>();

        // Run through the scan entries, and add ones to the selection which aren't currently selected
        const entryResp = results[c] as ScanEntryResp;
        for (const entry of entryResp.entries) {
          if (!curSel.has(entry.id) && this.isSelectable(entry)) {
            thisScanNewSel.add(entry.id);
          }
        }

        // We now have the selection for this scan id, add it to the overall selection we're creating
        newSel.set(selScanIds[c], thisScanNewSel);
      }

      this._selectionService.setSelection(new BeamSelection(newSel), PixelSelection.makeEmptySelection());
    });
  }
}
