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

import { UserGroupInfo, UserGroupRelationship } from "src/app/generated-protos/user-group";
import { UserGroupList } from "src/app/generated-protos/ownership-access";
import { ROIItem } from "src/app/generated-protos/roi";
import { ScanItem } from "src/app/generated-protos/scan";

import { GroupsService, UserOptionsService } from "src/app/modules/settings/settings.module";
import { ROIService } from "src/app/modules/roi/services/roi.service";

import { AnalysisLayoutService } from "src/app/modules/pixlisecore/pixlisecore.module";

export class MistROIUploadData {
  static readonly MIST_ROI_HEADERS = ["ClassificationTrail", "ID_Depth", "PMC", "group1", "group2", "group3", "group4", "species", "formula"];
  static readonly DatasetIDHeader = "DatasetID";
  static readonly ConfidenceHeader = "Reproducibility";

  static readonly ConfidenceLevelMap: Record<string, number> = {
    high: 1,
    medium: 0.5,
    low: 0.25,
  };

  constructor(
    public scanId: string = "",
    public configuredScans: ScanItem[] = [],
    public allScans: ScanItem[] = []
  ) {}
}

export type ROIUploadSummary = {
  scanId: string;
  scanName: string;
  mistROIs: ROIItem[];
  upload: boolean;
  isScanConfigured: boolean;
};

@Component({
  standalone: false,
  selector: "app-mist-roi-upload",
  templateUrl: "./mist-roi-upload.component.html",
  styleUrls: ["./mist-roi-upload.component.scss"],
})
export class MistRoiUploadComponent implements OnInit {
  public static readonly OVERWRITE_ALL = "Over-Write All";
  public static readonly OVERWRITE_SAME_NAME = "Over-Write ROIs With the Same Name";
  public static readonly DO_NOT_OVERWRITE = "Do Not Over-Write";

  public overwriteOption: string = "Over-Write All";
  public overwriteOptions: string[] = [MistRoiUploadComponent.OVERWRITE_ALL, MistRoiUploadComponent.OVERWRITE_SAME_NAME, MistRoiUploadComponent.DO_NOT_OVERWRITE];
  public csvFile: File | null = null;
  public mistROIs: ROIItem[] = [];
  public uploadToSubDatasets: boolean = false;

  public uniqueROIs: Record<string, ROIItem> = {};
  public uploadedScanIds: string[] = [];

  expectedHeaders = MistROIUploadData.MIST_ROI_HEADERS;

  datasetIDHeader = MistROIUploadData.DatasetIDHeader;
  optionalHeaders = [MistROIUploadData.DatasetIDHeader, MistROIUploadData.ConfidenceHeader];

  allScans: ScanItem[] = [];
  configuredScans: ScanItem[] = [];

  selectedScanId: string = "";

  public uploadSummaries: ROIUploadSummary[] = [];
  public mistROIsByDatasetID: Map<string, ROIItem[]> = new Map<string, ROIItem[]>();

  public editableGroups: UserGroupInfo[] = [];
  public groupIdToShareWith: string = "";

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MistROIUploadData,
    public dialogRef: MatDialogRef<MistRoiUploadComponent>,
    public dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _roiService: ROIService,
    private _groupsService: GroupsService,
    private _userOptionsService: UserOptionsService
  ) {}

  ngOnInit(): void {
    this.selectedScanId = this.data.scanId || this._analysisLayoutService.defaultScanId;
    this.configuredScans = this.data.configuredScans;
    this.allScans = this.data.allScans;

    this._groupsService.fetchGroupsAsync().subscribe(groups => {
      if (!groups || groups.length === 0) {
        return;
      }

      this.editableGroups = groups.filter(
        group => group.relationshipToUser >= UserGroupRelationship.UGR_MEMBER || this._userOptionsService.hasFeatureAccess("admin")
      );
      let groupToShareWith = groups.find(group => group.name === "MIST");
      if (!groupToShareWith) {
        groupToShareWith = groups[0];
      }

      this.groupIdToShareWith = groupToShareWith?.id || "";
    });
  }

  get browseTooltip(): string {
    return `Expected Headers: ${this.expectedHeaders.join(", ")}\nOptional Headers: ${this.optionalHeaders.join(", ")}\n`;
  }

  get allChecked(): boolean {
    return this.uploadSummaries.every(summary => summary.upload);
  }

  set allChecked(checked: boolean) {
    this.uploadSummaries.forEach(summary => (summary.upload = checked));
  }

  get allScansConfigured(): boolean {
    return this.uploadSummaries.every(summary => !summary.upload || summary.isScanConfigured);
  }

  private formSummary() {
    Object.entries(this.uniqueROIs).forEach(([id, roi]) => {
      let datasetId = roi.scanId;
      if (!this.mistROIsByDatasetID.has(datasetId)) {
        this.mistROIsByDatasetID.set(datasetId, []);
      }
      this.mistROIsByDatasetID.get(datasetId)?.push(roi);
    });

    this.uploadSummaries = Array.from(this.mistROIsByDatasetID.keys()).map(scanId => {
      let scanName = this.allScans.find(scan => scan.id === scanId)?.title || scanId;
      let isScanConfigured = this.configuredScans.some(scan => scan.id === scanId);
      return { scanId, scanName, mistROIs: this.mistROIsByDatasetID.get(scanId) || [], upload: true, isScanConfigured };
    });
  }

  onBrowse(file: any): void {
    this.csvFile = file.target.files[0];
    let fileReader = new FileReader();
    fileReader.onload = evt => {
      this.mistROIs = this.readInMistROIs(fileReader.result as string);
      this.formSummary();
    };
    fileReader.readAsText(this.csvFile as Blob);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  readInMistROIs(rawCSV: string): ROIItem[] {
    let items: ROIItem[] = [];

    let rows: any = papa.parse(rawCSV);
    let headers: any[] = rows.data.length > 0 ? rows.data[0] : [];
    if (!this.expectedHeaders.every(header => headers.includes(header))) {
      alert("Malformed Mist ROI CSV! Unexpected headers found.");
      return [];
    }

    let scanIdPerRow = headers.includes(MistROIUploadData.DatasetIDHeader);

    let scanIds = new Set<string>();
    if (!scanIdPerRow) {
      scanIds.add(this.selectedScanId);
    }

    let uniqueROIs: Record<string, ROIItem> = {};
    for (let row of rows.data.slice(1)) {
      let rawItem = headers.reduce((fields: string[], key: string, i: number) => ({ ...fields, [key]: row[i] }), {});

      let scanId = this.selectedScanId;
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

      let confidenceLevel: string = rawItem[MistROIUploadData.ConfidenceHeader];
      let confidenceKey = `${confidenceLevel}`.toLowerCase().trim();
      let confidencePercent = 1;
      if (MistROIUploadData.ConfidenceLevelMap[confidenceKey] !== undefined) {
        confidencePercent = MistROIUploadData.ConfidenceLevelMap[confidenceKey];
      } else if (!isNaN(Number(confidenceLevel))) {
        confidencePercent = Number(confidenceLevel) / 100;
      }

      let uniqueID = `${scanId}-${rawItem.ClassificationTrail}`;
      if (uniqueROIs[uniqueID]) {
        uniqueROIs[uniqueID].scanEntryIndexesEncoded.push(rawItem.PMC);
        if (uniqueROIs[uniqueID].mistROIItem) {
          // Have to support backwards compatibility with old MIST ROI files where the confidence map was not included
          if (!uniqueROIs[uniqueID].mistROIItem?.pmcConfidenceMap) {
            uniqueROIs[uniqueID].mistROIItem.pmcConfidenceMap = { [rawItem.PMC]: confidencePercent };
          } else {
            uniqueROIs[uniqueID].mistROIItem.pmcConfidenceMap[rawItem.PMC] = confidencePercent;
          }
        }
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
            pmcConfidenceMap: { [rawItem.PMC]: confidencePercent },
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
      let deleteExisting = this.overwriteOption === MistRoiUploadComponent.OVERWRITE_ALL;
      let overwrite = deleteExisting || this.overwriteOption === MistRoiUploadComponent.OVERWRITE_SAME_NAME;
      let skipDuplicates = this.overwriteOption === MistRoiUploadComponent.DO_NOT_OVERWRITE;

      let idsToDelete = deleteExisting ? this.uploadedScanIds : [];
      let filteredROIs = Object.values(this.uniqueROIs).filter(roi => this.uploadSummaries.some(summary => summary.scanId === roi.scanId && summary.upload));

      let editors: UserGroupList | undefined = undefined;
      if (this.groupIdToShareWith) {
        editors = UserGroupList.create({ groupIds: [this.groupIdToShareWith] });
      }

      this._roiService.bulkWriteROIs(filteredROIs, overwrite, skipDuplicates, true, idsToDelete, editors);

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
