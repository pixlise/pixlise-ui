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

import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ROIService, ROISummaries } from "../../services/roi.service";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ROISearchFilter } from "../../models/roi-search";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Subscription } from "rxjs";
import { ROIDisplaySettings } from "../../models/roi-region";

export type ROIPickerResponse = {
  selectedROISummaries: ROIItemSummary[];
  selectedROIs: ROIItem[];
};

export type ROIPickerData = {
  requestFullROIs: boolean;
  selectedIds?: string[];
  selectedROIs?: ROIItem[];
  selectedROISummaries?: ROIItemSummary[];
};

@Component({
  selector: "roi-picker",
  templateUrl: "./roi-picker.component.html",
  styleUrls: ["./roi-picker.component.scss"],
})
export class ROIPickerComponent implements OnInit {
  private _subs = new Subscription();

  showSearchControls: boolean = true;

  selectedROIs: ROISummaries = {};

  manualFilters: Partial<ROISearchFilter> | null = null;
  filteredSummaries: ROIItemSummary[] = [];
  summaries: ROIItemSummary[] = [];
  displaySettingsMap: Record<string, ROIDisplaySettings> = {};

  waitingForROIs: string[] = [];

  fetchedAllSelectedROIs: boolean = true;

  constructor(
    private _roiService: ROIService,
    private _snackBarService: SnackbarService,
    @Inject(MAT_DIALOG_DATA) public data: ROIPickerData,
    public dialogRef: MatDialogRef<ROIPickerComponent, ROIPickerResponse>
  ) {
    if (data?.selectedROIs) {
      this.selectedROIs = Object.fromEntries(data.selectedROIs.map(roi => [roi.id, ROIService.formSummaryFromROI(roi)]));
    }

    if (data?.selectedROISummaries) {
      this.selectedROIs = Object.fromEntries(data.selectedROISummaries.map(roi => [roi.id, roi]));
    }

    if (data?.selectedIds) {
      data.selectedIds.forEach(id => {
        if (!this._roiService.roiItems$.value[id]) {
          this.fetchedAllSelectedROIs = false;
          this._roiService.fetchROI(id, true);
        }
      });

      if (this.fetchedAllSelectedROIs) {
        this.selectedROIs = Object.fromEntries(data.selectedIds.map(id => [id, ROIService.formSummaryFromROI(this._roiService.roiItems$.value[id])]));
      }
    }
  }

  ngOnInit(): void {
    this._subs.add(
      this._roiService.roiSummaries$.subscribe(summaries => {
        this.summaries = Object.values(summaries);
      })
    );

    this._subs.add(
      this._roiService.roiItems$.subscribe(roiItems => {
        let notFoundROIs: string[] = [];
        this.waitingForROIs.forEach((roiId, i) => {
          if (!roiItems[roiId]) {
            notFoundROIs.push(roiId);
          }
        });

        if (!this.fetchedAllSelectedROIs && this.data?.selectedIds) {
          let fetchedAll = true;
          this.data.selectedIds?.forEach(id => {
            if (!this._roiService.roiItems$.value[id]) {
              fetchedAll = false;
            }
          });

          if (fetchedAll) {
            this.fetchedAllSelectedROIs = true;
            this.selectedROIs = Object.fromEntries(this.data.selectedIds.map(id => [id, ROIService.formSummaryFromROI(this._roiService.roiItems$.value[id])]));
          }
        }

        this.waitingForROIs = notFoundROIs;
      })
    );

    this._subs.add(
      this._roiService.displaySettingsMap$.subscribe(displaySettingsMap => {
        this.displaySettingsMap = displaySettingsMap;
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  trackBySummaryId(index: number, summary: ROIItemSummary): string {
    return summary.id;
  }

  onROISelect(roi: ROIItemSummary): void {
    if (this.selectedROIs[roi.id]) {
      delete this.selectedROIs[roi.id];
    } else {
      this.selectedROIs[roi.id] = roi;
      this._roiService.fetchROI(roi.id, true);
      if (!this._roiService.roiItems$.value[roi.id]) {
        this.waitingForROIs.push(roi.id);
      }
    }
  }

  onFilterAuthor(author: string): void {
    if (author === "builtin") {
      this.manualFilters = { types: ["builtin"] };
    } else {
      this.manualFilters = { authors: [author] };
    }
  }

  onFilterChanged({ filteredSummaries }: ROISearchFilter): void {
    this.filteredSummaries = filteredSummaries;

    // Remove any ROIs from the selection that are no longer visible
    let newSelection: ROISummaries = {};
    this.filteredSummaries.forEach(summary => {
      if (this.selectedROIs[summary.id]) {
        newSelection[summary.id] = summary;
      }
    });

    this.selectedROIs = newSelection;
  }

  onToggleSearch(): void {
    this.showSearchControls = !this.showSearchControls;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    let selectedROISummaries = Object.values(this.selectedROIs);
    let selectedROIs: ROIItem[] = selectedROISummaries.map(summary => {
      let roi = this._roiService.roiItems$.value[summary.id];
      if (!roi) {
        this._snackBarService.openError(`ROI ${summary.id} was not found in the ROI cache`);
      }
      return roi;
    });

    this.dialogRef.close({
      selectedROISummaries,
      selectedROIs,
    });
  }

  onClear(): void {
    this.selectedROIs = {};
  }
}
