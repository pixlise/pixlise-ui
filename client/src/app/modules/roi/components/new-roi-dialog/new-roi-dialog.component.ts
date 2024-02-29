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
import { Subscription, scan } from "rxjs";
import { ROIItem } from "src/app/generated-protos/roi";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIService } from "src/app/modules/roi/services/roi.service";

export type NewROIDialogData = {
  defaultScanId?: string;
};

@Component({
  selector: "new-roi-dialog",
  templateUrl: "./new-roi-dialog.component.html",
  styleUrls: ["./new-roi-dialog.component.scss"],
})
export class NewROIDialogComponent implements OnInit {
  private _subs = new Subscription();

  newROIName: string = "";
  newROIDescription: string = "";
  newROITags: string[] = [];

  pixelCount: number = 0;
  entryCount: number = 0;
  selectedScanIds: string[] = [];
  defaultScanId: string = "";

  constructor(
    private _roiService: ROIService,
    private _selectionService: SelectionService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<NewROIDialogComponent>
  ) {
    this.defaultScanId = data.defaultScanId;
  }

  ngOnInit(): void {
    this._subs.add(
      this._selectionService.selection$.subscribe(selection => {
        this.selectedScanIds = selection.beamSelection.getScanIds();
        this.pixelCount = selection.pixelSelection.selectedPixels.size;
        this.entryCount = selection.beamSelection.getSelectedEntryCount();
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onSaveNewROI() {
    let selection = this._selectionService.getCurrentSelection();
    let scanIds = selection.beamSelection.getScanIds();

    // We don't have a beam selection to tell us the scan Ids, so attempt to resolve it from the image name
    // and if this fails, then resort to the default scan id
    if (scanIds.length === 0) {
      let imageNameWithScan = selection.pixelSelection.imageName.match(/^(?<ScanId>[0-9]{9})\/.+\.[a-zA-Z]{3,5}$/);
      if (imageNameWithScan && imageNameWithScan?.groups?.["ScanId"]) {
        scanIds = [imageNameWithScan.groups["ScanId"]];
      } else if (this.defaultScanId) {
        scanIds = [this.defaultScanId];
      }
    }

    // TODO: There's a weird edge case here if we have PMCs from multiple scans selected AND pixels selected
    // In this case, the pixels will be duplicated to each scan, which is probably not what we want
    // However, this edge case can currently only be manually crafted and would require changing PixelSelection
    // to include a scan id, which is too big of an undertaking for now.
    scanIds.forEach(scanId => {
      this._roiService.createROI(
        ROIItem.create({
          name: this.newROIName,
          description: this.newROIDescription,
          tags: this.newROITags,
          scanId,
          pixelIndexesEncoded: Array.from(selection.pixelSelection.selectedPixels),
          imageName: selection.pixelSelection.imageName,
          scanEntryIndexesEncoded: Array.from(selection.beamSelection.getSelectedScanEntryPMCs(scanId)),
        })
      );
    });

    this.dialogRef.close(true);
  }

  onNewTagSelectionChanged(tagIDs: string[]) {
    this.newROITags = tagIDs;
  }

  onCancelCreateROI() {
    this.dialogRef.close(false);
  }
}
