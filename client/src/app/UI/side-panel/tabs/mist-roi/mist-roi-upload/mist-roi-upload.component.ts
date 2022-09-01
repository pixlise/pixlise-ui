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

import { Component, ElementRef, Inject, OnInit } from "@angular/core";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MistROIItem } from "src/app/models/roi";

export class MistROIUploadData
{
    constructor()
    {
    }
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
    public mistROIs: MistROIItem[] = [];

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

    readInMistROIs(rawCSV: string): MistROIItem[]
    {
        let items: MistROIItem[] = [];

        let expectedHeaders = ["speciesLevelID", "mineralGroupID", "identificationDepth", "classificationTrail"];
        let headers = [];
        for(let [i, line] of rawCSV.trim().split("\n").entries())
        {
            let columns = line.split(",").map(col => col.trim());
            if(i === 0) 
            {
                headers = columns;
                if(headers.filter(header => expectedHeaders.includes(header)).length !== expectedHeaders.length) 
                {
                    alert("Malformed Mist ROI CSV! Unexpected headers found.");
                    return [];
                }
            }
            else 
            {
                let rawItem = headers.reduce((fields, key, i) => ({...fields, [key]: columns[i] }), {});
                items.push(new MistROIItem(
                    rawItem.speciesLevelID,
                    rawItem.mineralGroupID,
                    rawItem.identificationDepth,
                    rawItem.classificationTrail
                ));
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
            this.dialogRef.close({
                overwriteOption: this.overwriteOption,
                mistROIs: this.mistROIs
            });
        }
    }
}
