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
import { QuantificationService } from "src/app/services/quantification.service";
import { httpErrorToString } from "src/app/utils/utils";





@Component({
    selector: "app-quantification-upload-dialog",
    templateUrl: "./quantification-upload-dialog.component.html",
    styleUrls: ["./quantification-upload-dialog.component.scss"]
})
export class QuantificationUploadDialogComponent implements OnInit
{
    quantName: string = "";
    quantComments: string = "";

    state: string = "initial";
    prompt: string = "";

    droppedFiles: File[] = [];

    //private _closed = false;

    constructor(
        public dialogRef: MatDialogRef<QuantificationUploadDialogComponent>,
        private _quantService: QuantificationService,
    )
    {
    }

    ngOnInit(): void
    {
    }

    onCancel(): void
    {
        this.dialogRef.close(null);
        //this._closed = true;
    }

    onUpload(): void
    {
        if(this.quantName.length <= 0)
        {
            alert("Enter a quantification name!");
            return;
        }

        if(this.quantComments.length <= 0)
        {
            alert("Enter a quantification comment!");
            return;
        }

        if(this.droppedFiles.length != 1)
        {
            alert("Please drop one CSV file to upload");
            return;
        }

        this._quantService.uploadQuantificationCSV(this.quantName, this.quantComments, this.droppedFiles[0]).subscribe(
            ()=>
            {
                alert("Upload complete!");
                this.dialogRef.close(null);
            },
            (err)=>
            {
                alert(httpErrorToString(err, "Upload failed"));
                this.dialogRef.close(null);
            }
        );
    }

    get acceptTypes(): string
    {
        return "text/csv";
    }

    onDropFile(event)
    {
        //console.log(event);
        this.droppedFiles.push(...event.addedFiles);
    }

    onRemoveDroppedFile(event)
    {
        //console.log(event);
        this.droppedFiles.splice(this.droppedFiles.indexOf(event), 1);
    }
}
