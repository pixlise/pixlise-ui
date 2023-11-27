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

import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

export class DatasetCustomImageInfo {
  constructor(
    public downloadLink: string,
    public matchedImage: string,
    public xOffset: number,
    public yOffset: number,
    public xScale: number,
    public yScale: number,
    public alignedImageLink: string
  ) {}
}

export class AddCustomImageParameters {
  constructor(
    public acceptTypes: string = "*",
    public allowMatchedParams: boolean = false,
    public title: string = "Add Images"
  ) {}
}

export class AddCustomImageResult {
  constructor(
    public meta: DatasetCustomImageInfo,
    public imageToUpload: File
  ) {}
}

@Component({
  selector: "app-add-custom-image",
  templateUrl: "./add-custom-image.component.html",
  styleUrls: ["./add-custom-image.component.scss"],
})
export class AddCustomImageComponent {
  data: DatasetCustomImageInfo = new DatasetCustomImageInfo("", "", 0, 0, 1, 1, "");

  droppedFiles: File[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public params: AddCustomImageParameters,
    public dialogRef: MatDialogRef<AddCustomImageComponent>
  ) {}

  onOK() {
    if (this.droppedFiles.length != 1) {
      alert("Please drop one image to upload");
      return;
    }

    if (this.params.allowMatchedParams) {
      // Validate that fields were entered
      if (this.data.xOffset == null || this.data.yScale == null || this.data.xScale == null || this.data.yScale == null /*|| this.data.alignedBeamPMC == null*/) {
        alert("Please enter all fields");
        return;
      }
    }

    this.dialogRef.close(new AddCustomImageResult(this.data, this.droppedFiles[0]));
  }

  get title(): string {
    return this.params.title;
  }

  get acceptTypes(): string {
    return this.params.acceptTypes;
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onDropFile(event) {
    if (this.droppedFiles.length >= 1) {
      return;
    }

    // Complain if any were rejected!
    const rejectedFiles = [];
    for (const reject of event.rejectedFiles) {
      //console.log(reject);
      rejectedFiles.push(reject.name);
    }

    if (rejectedFiles.length > 0) {
      alert("Rejected files for upload: " + rejectedFiles.join(",") + ". Were they of an acceptible format?");
    } else if (event.addedFiles.length <= 0) {
      alert("No files added for uploading");
    } else {
      //console.log(event);
      this.droppedFiles.push(event.addedFiles[0]);
    }
  }

  onRemoveDroppedFile(event) {
    //console.log(event);
    this.droppedFiles.splice(this.droppedFiles.indexOf(event), 1);
  }
}
