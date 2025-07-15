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

import { Component, ElementRef, Input, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { Subscription } from "rxjs";

import { UNICODE_CARET_DOWN } from "src/app/utils/utils";

import {
  SelectionOptionsDialogData,
  SelectionOptionsComponent,
  SelectionOptionsDialogResult,
  SelectionOption,
} from "./selection-options/selection-options.component";

import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";

import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { ContextImageDataService } from "src/app/modules/pixlisecore/services/context-image-data.service";
import { SnackbarService } from "src/app/modules/pixlisecore/services/snackbar.service";
import { SelectionHistoryItem, SelectionService } from "src/app/modules/pixlisecore/services/selection.service";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/services/analysis-layout.service";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";

export class SelectionChangerImageInfo {
  constructor(
    public scanIds: string[],
    public image: string,
    public contextImageSvc: ContextImageDataService
  ) {}
}

@Component({
  selector: "selection-changer",
  templateUrl: "./selection-changer.component.html",
  styleUrls: ["./selection-changer.component.scss"],
})
export class SelectionChangerComponent implements OnInit, OnDestroy {
  @Input() imageInfo: SelectionChangerImageInfo | undefined = undefined;

  private _subs = new Subscription();

  private _defaultLeftText = "No Selection";
  private _leftText: string = this._defaultLeftText;

  private _hasDwells: Map<string, boolean> = new Map<string, boolean>();

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    private _userOptionsService: UserOptionsService,
    private _cachedDataService: APICachedDataService,
    private _snackServie: SnackbarService,
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

  get userCanCreateROI(): boolean {
    return this._userOptionsService.hasFeatureAccess("editROI");
  }

  get leftText(): string {
    return this._leftText + " " + UNICODE_CARET_DOWN;
  }

  onSelection(event: any): void {
    // User clicked on left side, show menu
    const dialogConfig = new MatDialogConfig();
    dialogConfig.backdropClass = "empty-overlay-backdrop";

    let allScanIds = [];
    for (const scan of Object.values(this._analysisLayoutService.activeScreenConfiguration$.value.scanConfigurations)) {
      allScanIds.push(scan.id);
    }
    if (allScanIds.length < 2) {
      allScanIds = [];
    }

    dialogConfig.data = new SelectionOptionsDialogData(
      this._hasDwells.get(this._analysisLayoutService.defaultScanId) || false, // Only show dwell if we have any
      this.userCanCreateROI,
      !!this.imageInfo && !!this.imageInfo.contextImageSvc,
      allScanIds,
      new ElementRef(event.currentTarget)
    );

    const dialogRef = this.dialog.open(SelectionOptionsComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((choice: SelectionOptionsDialogResult) => {
      if (choice == null || choice == undefined) {
        // User clicked away/cancelled dialog
        return;
      }

      if (choice.result == SelectionOption.SEL_ALL) {
        this._selectionService.selectAllPMCs(this.getSelectionScanIds());
      } else if (choice.result == SelectionOption.SEL_ENTER_PMCS) {
        this._selectionService.selectUserSpecifiedPMCs();
      } else if (choice.result == SelectionOption.SEL_DWELL) {
        this._selectionService.selectDwellPMCs(this.getSelectionScanIds());
      } else if (choice.result == SelectionOption.NEW_ROI) {
        this._selectionService.newROIFromSelection(this._analysisLayoutService.defaultScanId);
      } else if (choice.result == SelectionOption.SEL_SUBDATASET) {
        this._selectionService.selectAllPMCs([choice.value]);
      } else if (choice.result == SelectionOption.SEL_INVERT) {
        this._selectionService.invertPMCSelection(this.getSelectionScanIds());
      } else if (choice.result == SelectionOption.SEL_NEARBY_PIXELS) {
        if (this.imageInfo && this.imageInfo.scanIds.length > 0) {
          this._selectionService.selectNearbyPixels(this.imageInfo?.scanIds, this.imageInfo?.contextImageSvc);
        } else {
          this._snackServie.openWarning(
            "Cannot select pixels when viewing non-RGBU image",
            "Select Nearby Pixels requires an RGBU image to be visible on context image"
          );
        }
      } else {
        alert("Error: selection failed - not implemented!");
      }
    });
  }

  onClear(): void {
    const allScanIds = [];
    for (const scan of Object.values(this._analysisLayoutService.activeScreenConfiguration$.value.scanConfigurations)) {
      allScanIds.push(scan.id);
    }
    this._selectionService.clearSelection(allScanIds);
  }

  private getSelectionScanIds(): string[] {
    const sel = this._selectionService.getCurrentSelection().beamSelection;
    let selScanIds = sel.getScanIds();
    if (selScanIds.length == 0) {
      selScanIds = [this._analysisLayoutService.defaultScanId];
    }
    return selScanIds;
  }
}
