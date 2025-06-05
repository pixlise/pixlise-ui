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

import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { string } from "mathjs";
import { Observable, Subscription, combineLatest, map, of, scan, switchMap } from "rxjs";
import { DetectorConfigReq, DetectorConfigResp } from "src/app/generated-protos/detector-config-msgs";
import { ImageBeamLocationsResp } from "src/app/generated-protos/image-beam-location-msgs";
import { ROIItem } from "src/app/generated-protos/roi";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { ContextImageScanModelGenerator, PMCClusters } from "src/app/modules/image-viewers/widgets/context-image/context-image-scan-model-generator";
import { ContextImageDataService, SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";

export type NewROIDialogData = {
  defaultScanId?: string;
  pmcs?: number[]; // If PMCs are specified, dialog will just create the ROI using these, otherwise it will subscribe to selection
};

@Component({
  selector: "new-roi-dialog",
  templateUrl: "./new-roi-dialog.component.html",
  styleUrls: ["./new-roi-dialog.component.scss"],
})
export class NewROIDialogComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  newROIName: string = "";
  newROIDescription: string = "";
  newROITags: string[] = [];

  pixelCount: number = 0;
  entryCount: number = 0;
  selectedScanIds: string[] = [];
  defaultScanId: string = "";

  saveSeparateContiguousRegions: boolean = false;

  constructor(
    private _roiService: ROIService,
    private _selectionService: SelectionService,
    private _cachedDataService: APICachedDataService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<NewROIDialogComponent>
  ) {
    this.defaultScanId = data.defaultScanId;
  }

  ngOnInit(): void {
    if (this.data.pmcs === undefined) {
      this._subs.add(
        this._selectionService.selection$.subscribe(selection => {
          // NOTE: We can get multiple scan ids here but we need to check that each one
          // actually has PMCs selected before we go warning all over the place
          const scanIds = selection.beamSelection.getScanIds();
          this.selectedScanIds = [];

          for (const scanId of scanIds) {
            const pmcs = selection.beamSelection.getSelectedScanEntryPMCs(scanId);
            if (pmcs.size > 0 || selection.pixelSelection.selectedPixels.size > 0) {
              this.selectedScanIds.push(scanId);
            }
          }

          this.pixelCount = selection.pixelSelection.selectedPixels.size;
          this.entryCount = selection.beamSelection.getSelectedEntryCount();
        })
      );
    } else {
      this.entryCount = this.data.pmcs.length;
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onToggleSeparateContiguous() {
    this.saveSeparateContiguousRegions = !this.saveSeparateContiguousRegions;
  }

  onSaveNewROI() {
    if (this.data.pmcs) {
      this._roiService.createROI(
        ROIItem.create({
          name: this.newROIName,
          description: this.newROIDescription,
          tags: this.newROITags,
          scanId: this.defaultScanId,
          scanEntryIndexesEncoded: this.data.pmcs,
        })
      );
    } else {
      const selection = this._selectionService.getCurrentSelection();
      let scanIds = selection.beamSelection.getScanIds();

      // We don't have a beam selection to tell us the scan Ids, so attempt to resolve it from the image name
      // and if this fails, then resort to the default scan id
      if (scanIds.length === 0) {
        const imageNameWithScan = selection.pixelSelection.imageName.match(/^(?<ScanId>[0-9]{9})\/.+\.[a-zA-Z]{3,5}$/);
        if (imageNameWithScan && imageNameWithScan?.groups?.["ScanId"]) {
          scanIds = [imageNameWithScan.groups["ScanId"]];
        } else if (this.defaultScanId) {
          scanIds = [this.defaultScanId];
        }
      }

      // Now we create the ROIs - NOTE that we only create an ROI if there are more than 0 PMCs or 0 pixels in it!

      // TODO: There's a weird edge case here if we have PMCs from multiple scans selected AND pixels selected
      // In this case, the pixels will be duplicated to each scan, which is probably not what we want
      // However, this edge case can currently only be manually crafted and would require changing PixelSelection
      // to include a scan id, which is too big of an undertaking for now.
      scanIds.forEach(scanId => {
        const pmcs = selection.beamSelection.getSelectedScanEntryPMCs(scanId);
        if (selection.pixelSelection.selectedPixels.size > 0 || pmcs.size > 0) {
          // If we're saving separate contiguous regions, do that here
          this.getPMCsToSave(scanId, pmcs).subscribe(pmcGroups => {
            if (pmcGroups.clusters.length == 1 && pmcGroups.residual.size <= 0) {
              // Just create one normally
              const roi = ROIItem.create({
                name: this.newROIName,
                description: this.newROIDescription,
                tags: this.newROITags,
                scanId,
                pixelIndexesEncoded: Array.from(selection.pixelSelection.selectedPixels),
                imageName: selection.pixelSelection.imageName,
                scanEntryIndexesEncoded: Array.from(pmcGroups.clusters[0].values()),
              });
              this._roiService.createROI(roi);
            } else {
              const rois: ROIItem[] = [];
              let counter = 1;

              for (const pmcGroup of pmcGroups.clusters) {
                if (pmcGroup.size > 0) {
                  let padChars = 1;
                  if (pmcGroups.clusters.length >= 100) {
                    padChars = 3;
                  } else if (pmcGroups.clusters.length >= 10) {
                    padChars = 2;
                  }

                  const roi = ROIItem.create({
                    name: `${this.newROIName} (${String(counter).padStart(padChars, "0")})`,
                    description: `${pmcGroup.size} points` + (this.newROIDescription.length > 0 ? ": " + this.newROIDescription : ""),
                    tags: this.newROITags,
                    scanId,
                    pixelIndexesEncoded: Array.from(selection.pixelSelection.selectedPixels),
                    imageName: selection.pixelSelection.imageName,
                    scanEntryIndexesEncoded: Array.from(pmcGroup),
                  });

                  rois.push(roi);
                  counter++;
                }
              }

              // If we have residual points, create a differently named cluster for that
              if (pmcGroups.residual.size > 0) {
                const residualROI = ROIItem.create({
                  name: this.newROIName + " residual points",
                  description: `${pmcGroups.residual.size} individual points left over from clustering of ROI: "${this.newROIName}"`,
                  tags: this.newROITags,
                  scanId,
                  pixelIndexesEncoded: Array.from(selection.pixelSelection.selectedPixels),
                  imageName: selection.pixelSelection.imageName,
                  scanEntryIndexesEncoded: Array.from(pmcGroups.residual),
                });
                rois.push(residualROI);
              }

              this._roiService.bulkWriteROIs(rois, false, false, false);
            }

            this.dialogRef.close(true);
          });
        }
      });
    }
  }

  getPMCsToSave(scanId: string, pmcList: Set<number>): Observable<PMCClusters> {
    if (!this.saveSeparateContiguousRegions) {
      // Just save all in one group
      return of(new PMCClusters([], new Set<number>()));
    }
    return this._cachedDataService.getScanList(ScanListReq.create({ searchFilters: { scanId } })).pipe(
      switchMap((scanListResp: ScanListResp) => {
        // There should be one scan!
        if (scanListResp.scans.length != 1) {
          throw new Error("Expected single scan to load for: " + scanId);
        }

        const requests = [
          this._cachedDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId })),
          this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId })),
        ];

        return combineLatest(requests).pipe(
          map((results: (ScanBeamLocationsResp | ScanEntryResp | DetectorConfigResp)[]) => {
            const beamResp: ScanBeamLocationsResp = results[0] as ScanBeamLocationsResp;
            const scanEntryResp: ScanEntryResp = results[1] as ScanEntryResp;

            // Loop through all PMCs and find contiguous regions, saved in separate groups
            const gen = new ContextImageScanModelGenerator();
            return gen.processBeamDataToGenerateClusters(3, scanListResp.scans[0], scanEntryResp.entries, beamResp.beamLocations, pmcList);
          })
        );
      })
    );
  }

  onNewTagSelectionChanged(tagIDs: string[]) {
    this.newROITags = tagIDs;
  }

  onCancelCreateROI() {
    this.dialogRef.close(false);
  }
}
