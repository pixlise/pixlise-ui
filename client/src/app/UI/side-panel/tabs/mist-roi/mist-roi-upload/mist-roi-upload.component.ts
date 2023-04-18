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

import { MistROIItem, ROIItem } from "src/app/models/roi";

export class MistROIUploadData
{
    static readonly MIST_ROI_HEADERS = ["ClassificationTrail", "ID_Depth", "PMC", "group1", "group2", "group3", "group4", "species", "formula"];
    static readonly DatasetIDHeader = "DatasetID";

    constructor(
        public datasetID: string = "",
    )
    {}
}


@Component({
    selector: "app-mist-roi-upload",
    templateUrl: "./mist-roi-upload.component.html",
    styleUrls: ["./mist-roi-upload.component.scss"]
})
export class MistRoiUploadComponent implements OnInit 
{
    public overwriteOption: string = "Over-Write All";
    public overwriteOptions: string[] = ["Over-Write All", "Over-Write ROIs With the Same Name", "Do Not Over-Write"];
    public csvFile: File;
    public mistROIs: ROIItem[] = [];
    public mistROIsByDatasetID: Map<string, ROIItem[]> = new Map<string, ROIItem[]>();
    public includesMultipleDatasets: boolean = false;
    public uploadToSubDatasets: boolean = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: MistROIUploadData,
        public dialogRef: MatDialogRef<MistRoiUploadComponent>,
        public dialog: MatDialog,
    )
    {
    }

    ngOnInit(): void 
    {
    }

    onBrowse(file): void
    {
        this.csvFile = file.target.files[0];
        let fileReader = new FileReader();
        fileReader.onload = (evt) => 
        {
            this.mistROIs = this.readInMistROIs(fileReader.result as string);
        };
        fileReader.readAsText(this.csvFile);
    }

    onCancel(): void
    {
        this.dialogRef.close(null);
    }

    readInMistROIs(rawCSV: string): ROIItem[]
    {
        let items: ROIItem[] = [];

        let expectedHeaders = MistROIUploadData.MIST_ROI_HEADERS;

        let rows = papa.parse(rawCSV);
        let headers = rows.data.length > 0 ? rows.data[0] : [];
        if(!expectedHeaders.every(header => headers.includes(header)))
        {
            alert("Malformed Mist ROI CSV! Unexpected headers found.");
            return [];
        }
        this.includesMultipleDatasets = headers.includes(MistROIUploadData.DatasetIDHeader);

        for(let row of rows.data.slice(1))
        {
            let rawItem = headers.reduce((fields, key, i) => ({...fields, [key]: row[i] }), {});

            // Convert csv fields to numbers
            rawItem.PMC = Number(rawItem.PMC);
            rawItem.ID_Depth = Number(rawItem.ID_Depth);

            // Ignore all rows where nothing was identified
            if(rawItem.ID_Depth === 0 || rawItem.ClassificationTrail.length === 0)
            {
                continue;
            }

            let existingIndex = items.findIndex((item) => item.mistROIItem.ClassificationTrail === rawItem.ClassificationTrail);
            if(existingIndex >= 0)
            {
                items[existingIndex].locationIndexes.push(rawItem.PMC);

                if(this.includesMultipleDatasets)
                {

                    let datasetID = rawItem?.DatasetID || this.data.datasetID;
                    let datasetItems = this.mistROIsByDatasetID.get(datasetID);
                    if(datasetItems)
                    {
                        let existingMistIndex = datasetItems.findIndex((item) => item.mistROIItem.ClassificationTrail === rawItem.ClassificationTrail);
                        if(existingMistIndex >= 0)
                        {
                            datasetItems[existingMistIndex].locationIndexes.push(rawItem.PMC);
                        }
                        else
                        {
                            datasetItems.push(items[existingIndex]);
                        }
                    }
                    else
                    {
                        this.mistROIsByDatasetID.set(datasetID, [items[existingIndex]]);
                    }
                }
            }
            else
            {
                let mineralGroupID = rawItem.ClassificationTrail.substring(rawItem.ClassificationTrail.lastIndexOf(".") + 1);

                // There are occcasionally duplicate mineralGroupIDs, so we need to check if any already exist and use
                // the unique classification trail as a name if one already exists
                // Adding the "mist__roi." prefix so we can duplicate a MIST ROI into a "regular" ROI and keep the same name
                let name = rawItem.species && rawItem.species.length > 0 ? rawItem.species : mineralGroupID;
                let existingName = items.findIndex((item) => item.name.replace("mist__roi.", "") === name) >= 0;

                let mistROI = new ROIItem(
                    `mist__roi.${existingName ? rawItem.ClassificationTrail : name}`,
                    [rawItem.PMC],
                    rawItem.ClassificationTrail,
                    null,
                    null,
                    new MistROIItem(
                        rawItem.species,
                        mineralGroupID,
                        rawItem.ID_Depth,
                        rawItem.ClassificationTrail,
                        rawItem.formula
                    )
                );
                items.push(mistROI);

                if(this.includesMultipleDatasets)
                {
                    let datasetID = rawItem?.DatasetID || this.data.datasetID;
                    if(!this.mistROIsByDatasetID.has(datasetID))
                    {
                        this.mistROIsByDatasetID.set(datasetID, []);
                    }
                    this.mistROIsByDatasetID.get(datasetID).push(mistROI);
                }
            }
        }

        return items;
    }

    get isValidMistROIFile(): boolean 
    {
        return this.mistROIs.length > 0;
    }

    onUpload(): void
    {
        if(this.mistROIs.length > 0) 
        {
            let deleteExisting = this.overwriteOption === "Over-Write All";
            let overwrite = deleteExisting || this.overwriteOption === "Over-Write ROIs With the Same Name";
            let skipDuplicates = this.overwriteOption === "Do Not Over-Write";
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
