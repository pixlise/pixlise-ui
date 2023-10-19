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

import { Component, EventEmitter, Inject, OnDestroy, OnInit, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ROIService, ROISummaries } from "../../services/roi.service";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ROISearchFilter } from "../../models/roi-search";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Subscription } from "rxjs";
import { ROIDisplaySettings } from "../../models/roi-region";
import { SubItemOptionSection } from "../roi-item/roi-item.component";

export type ROIPickerResponse = {
  selectedROISummaries: ROIItemSummary[];
  selectedROIs: ROIItem[];
  selectedItems?: Map<string, string[]>;
};

export type ROIPickerData = {
  title?: string;

  requestFullROIs: boolean;
  draggable?: boolean;
  liveUpdate?: boolean;
  selectedIds?: string[];
  selectedROIs?: ROIItem[];
  selectedROISummaries?: ROIItemSummary[];

  // If these are specified, they will replace the checkbox selection
  selectableSubItemOptions?: SubItemOptionSection[];
  subItemButtonName?: string;

  selectedItems?: Map<string, string[]>;
};

@Component({
  selector: "roi-picker",
  templateUrl: "./roi-picker.component.html",
  styleUrls: ["./roi-picker.component.scss"],
})
export class ROIPickerComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  // These are computed values that can be used for initial positioning dialogs.
  // They need to be manually updated if the dialog size changes, but this shouldn't happen often, so not worth making smarter.
  static readonly HEIGHT = 564;
  static readonly WIDTH = 400;

  showSearchControls: boolean = true;

  selectedItems: Map<string, string[]> = new Map();
  selectedROIs: ROISummaries = {};

  manualFilters: Partial<ROISearchFilter> | null = null;
  filteredSummaries: ROIItemSummary[] = [];
  summaries: ROIItemSummary[] = [];
  displaySettingsMap: Record<string, ROIDisplaySettings> = {};

  waitingForROIs: string[] = [];

  fetchedAllSelectedROIs: boolean = true;

  @Output() onChange: EventEmitter<ROIPickerResponse> = new EventEmitter();

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

    if (data?.selectedItems) {
      data.selectedIds = [...data.selectedItems.keys()];
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

    if (data?.selectedItems) {
      data.selectedItems.forEach((subItems, roiId) => {
        this.selectedItems.set(roiId, subItems);
      });
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
        const notFoundROIs: string[] = [];
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

  onROISelect(roi: ROIItemSummary, customSelection: { selectedOptions: string[] }): void {
    const hasSubItemsSelected = customSelection?.selectedOptions && customSelection.selectedOptions.length > 0;

    if (!hasSubItemsSelected && (this.selectedROIs[roi.id] || this.selectedItems.has(roi.id))) {
      delete this.selectedROIs[roi.id];
      this.selectedItems.delete(roi.id);
    } else {
      this.selectedROIs[roi.id] = roi;
      this._roiService.fetchROI(roi.id, true);
      if (!this._roiService.roiItems$.value[roi.id]) {
        this.waitingForROIs.push(roi.id);
      }

      if (hasSubItemsSelected) {
        this.selectedItems.set(roi.id, customSelection.selectedOptions);
      }
    }

    if (this.data.liveUpdate) {
      this.onConfirm();
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
    const newSelection: ROISummaries = {};
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
    const selectedROISummaries = Object.values(this.selectedROIs);
    const selectedROIs: ROIItem[] = selectedROISummaries.map(summary => {
      const roi = this._roiService.roiItems$.value[summary.id];
      if (!roi) {
        this._snackBarService.openError(`ROI ${summary.id} was not found in the ROI cache`);
      }
      return roi;
    });

    const pickerResponse = {
      selectedROISummaries,
      selectedROIs,
      selectedItems: this.selectedItems,
    };

    if (this.data.liveUpdate) {
      this.onChange.emit(pickerResponse);
    } else {
      this.dialogRef.close(pickerResponse);
    }
  }

  onClear(): void {
    this.selectedROIs = {};
    this.selectedItems.clear();

    if (this.data.liveUpdate) {
      this.onConfirm();
    }
  }
}
