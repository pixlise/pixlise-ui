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

import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ScanItem } from "src/app/generated-protos/scan";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROISearchFilter } from "src/app/modules/roi/models/roi-search";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { Colours } from "src/app/utils/colours";

@Component({
  selector: "roi-tab",
  templateUrl: "./roi-tab.component.html",
  styleUrls: ["./roi-tab.component.scss"],
})
export class ROITabComponent implements OnInit {
  private _subs = new Subscription();

  @ViewChild("newROIButton") newROIButton!: ElementRef;

  allPointsColour = Colours.GRAY_10.asString();

  private _selectionEmpty: boolean = false;

  newROIName: string = "";
  newROIDescription: string = "";
  newROITags: string[] = [];

  summaries: ROIItemSummary[] = [];
  filteredSummaries: ROIItemSummary[] = [];

  allScans: ScanItem[] = [];
  _visibleScanId: string = "";

  constructor(
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    public dialog: MatDialog
  ) {}

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    this._visibleScanId = scanId;
  }

  ngOnInit(): void {
    this._subs.add(
      this._roiService.roiSummaries$.subscribe(summaries => {
        this.summaries = Object.values(summaries).filter(summary => !summary.isMIST);
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get canCreateROIs(): boolean {
    return true;
  }

  get showSearch(): boolean {
    return this._analysisLayoutService.showSearch;
  }

  onFilterChanged({ filteredSummaries, scanId }: ROISearchFilter) {
    this.filteredSummaries = filteredSummaries;
    this.visibleScanId = scanId;
  }

  get selectionEmpty(): boolean {
    return this._selectionEmpty;
  }

  onCancelCreateROI() {
    this.closeCreateROIMenu();
  }

  onSaveNewROI() {
    let selection = this._selectionService.getCurrentSelection();

    this._roiService.createROI(
      ROIItem.create({
        name: this.newROIName,
        description: this.newROIDescription,
        tags: this.newROITags,
        scanId: this.visibleScanId,
        pixelIndexesEncoded: Array.from(selection.pixelSelection.selectedPixels),
        imageName: selection.pixelSelection.imageName,
        scanEntryIndexesEncoded: Array.from(selection.beamSelection.getSelectedScanEntryIndexes(this.visibleScanId)),
      })
    );
    this.closeCreateROIMenu();
  }

  onNewTagSelectionChanged(tagIDs: string[]) {
    this.newROITags = tagIDs;
  }

  private closeCreateROIMenu(): void {
    if (this.newROIButton && this.newROIButton instanceof PushButtonComponent) {
      (this.newROIButton as PushButtonComponent).closeDialog();

      this.newROIName = "";
      this.newROIDescription = "";
      this.newROITags = [];
    }
  }
}
