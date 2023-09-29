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
import { MatDialogRef } from "@angular/material/dialog";
import { ROIService, ROISummaries } from "../../services/roi.service";
import { ROIItemSummary } from "src/app/generated-protos/roi";
import { ROISearchFilter } from "../roi-search-controls/roi-search-controls.component";

export type ROIPickerResponse = {
  selectedROIs: ROIItemSummary[];
};

@Component({
  selector: "roi-picker",
  templateUrl: "./roi-picker.component.html",
  styleUrls: ["./roi-picker.component.scss"],
})
export class ROIPickerComponent implements OnInit {
  showSearchControls: boolean = false;

  selectedROIs: ROISummaries = {};

  filteredSummaries: ROIItemSummary[] = [];
  summaries: ROIItemSummary[] = [];

  constructor(
    private _roiService: ROIService,
    public dialogRef: MatDialogRef<ROIPickerComponent, ROIPickerResponse>
  ) {
    this._roiService.roiSummaries$.subscribe(summaries => {
      this.summaries = Object.values(summaries);
    });
  }

  ngOnInit(): void {}

  onROISelect(roi: ROIItemSummary): void {
    if (this.selectedROIs[roi.id]) {
      delete this.selectedROIs[roi.id];
    } else {
      this.selectedROIs[roi.id] = roi;
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
    this.dialogRef.close({
      selectedROIs: Object.values(this.selectedROIs),
    });
  }
}
