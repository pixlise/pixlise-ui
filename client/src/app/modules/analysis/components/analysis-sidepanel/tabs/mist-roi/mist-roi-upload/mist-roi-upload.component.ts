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
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import papa from "papaparse";
import { ROIItem } from "src/app/generated-protos/roi";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";

export class MistROIUploadData {
  static readonly MIST_ROI_HEADERS = ["ClassificationTrail", "ID_Depth", "PMC", "group1", "group2", "group3", "group4", "species", "formula"];
  static readonly DatasetIDHeader = "DatasetID";

  constructor(public datasetID: string = "") {}
}

@Component({
  selector: "app-mist-roi-upload",
  templateUrl: "./mist-roi-upload.component.html",
  styleUrls: ["./mist-roi-upload.component.scss"],
})
export class MistRoiUploadComponent implements OnInit {
  public overwriteOption: string = "Over-Write All";
  public overwriteOptions: string[] = ["Over-Write All", "Over-Write ROIs With the Same Name", "Do Not Over-Write"];
  public csvFile: File | null = null;
  public mistROIs: ROIItem[] = [];
  public mistROIsByDatasetID: Map<string, ROIItem[]> = new Map<string, ROIItem[]>();
  public uploadToSubDatasets: boolean = false;

  public uniqueROIs: Record<string, ROIItem> = {};
  public uploadedScanIds: string[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MistROIUploadData,
    public dialogRef: MatDialogRef<MistRoiUploadComponent>,
    public dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _roiService: ROIService
  ) {}

  ngOnInit(): void {}

  onBrowse(file: any): void {
    this.csvFile = file.target.files[0];
    let fileReader = new FileReader();
    fileReader.onload = evt => {
      this.mistROIs = this.readInMistROIs(fileReader.result as string);
    };
    fileReader.readAsText(this.csvFile as Blob);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  readInMistROIs(rawCSV: string): ROIItem[] {
    let items: ROIItem[] = [];

    let expectedHeaders = MistROIUploadData.MIST_ROI_HEADERS;

    let rows: any = papa.parse(rawCSV);
    let headers: any[] = rows.data.length > 0 ? rows.data[0] : [];
    if (!expectedHeaders.every(header => headers.includes(header))) {
      alert("Malformed Mist ROI CSV! Unexpected headers found.");
      return [];
    }

    let scanIdPerRow = headers.includes(MistROIUploadData.DatasetIDHeader);

    let scanIds = new Set<string>();
    if (!scanIdPerRow) {
      scanIds.add(this._analysisLayoutService.defaultScanId);
    }

    let uniqueROIs: Record<string, ROIItem> = {};
    for (let row of rows.data.slice(1)) {
      let rawItem = headers.reduce((fields: string[], key: string, i: number) => ({ ...fields, [key]: row[i] }), {});

      let scanId = this._analysisLayoutService.defaultScanId;
      if (scanIdPerRow && rawItem[MistROIUploadData.DatasetIDHeader]) {
        scanId = rawItem[MistROIUploadData.DatasetIDHeader];
        scanIds.add(scanId);
      }
      // Convert csv fields to numbers
      rawItem.PMC = Number(rawItem.PMC);
      rawItem.ID_Depth = Number(rawItem.ID_Depth);

      // Ignore all rows where nothing was identified
      if (!rawItem.ID_Depth || !rawItem.ClassificationTrail || isNaN(rawItem.PMC)) {
        continue;
      }

      let uniqueID = `${scanId}-${rawItem.ClassificationTrail}`;
      if (uniqueROIs[uniqueID]) {
        uniqueROIs[uniqueID].scanEntryIndexesEncoded.push(rawItem.PMC);
      } else {
        let mineralGroupID = rawItem.ClassificationTrail.substring(rawItem.ClassificationTrail.lastIndexOf(".") + 1);
        let name = rawItem.species && rawItem.species.length > 0 ? rawItem.species : mineralGroupID;

        let roiItem: ROIItem = ROIItem.create({
          scanId,
          name,
          description: rawItem.ClassificationTrail,
          scanEntryIndexesEncoded: [rawItem.PMC],
          imageName: "",
          pixelIndexesEncoded: [],
          mistROIItem: {
            scanId,
            classificationTrail: rawItem.ClassificationTrail,
            species: rawItem.species,
            mineralGroupID: mineralGroupID,
            idDepth: rawItem.ID_Depth,
            formula: rawItem.formula,
          },
        });

        uniqueROIs[uniqueID] = roiItem;
      }
    }

    this.uniqueROIs = uniqueROIs;
    this.uploadedScanIds = Array.from(scanIds);
    this.uploadToSubDatasets = this.uploadedScanIds.length > 1;

    return items;
  }

  get isValidMistROIFile(): boolean {
    return Object.keys(this.uniqueROIs).length > 0;
  }

  get includesMultipleDatasets(): boolean {
    return this.uploadedScanIds.length > 1;
  }

  onUpload(): void {
    if (this.isValidMistROIFile) {
      let deleteExisting = this.overwriteOption === "Over-Write All";
      let overwrite = deleteExisting || this.overwriteOption === "Over-Write ROIs With the Same Name";
      let skipDuplicates = this.overwriteOption === "Do Not Over-Write";

      let idsToDelete = deleteExisting ? this.uploadedScanIds : [];
      this._roiService.bulkWriteROIs(Object.values(this.uniqueROIs), overwrite, skipDuplicates, true, idsToDelete);

      this.dialogRef.close({
        deleteExisting,
        overwrite,
        skipDuplicates,
        mistROIs: this.mistROIs,
        mistROIsByDatasetID: this.mistROIsByDatasetID,
        includesMultipleDatasets: this.includesMultipleDatasets,
        uploadToSubDatasets: this.uploadToSubDatasets,
      });
    }
  }
}
