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

import { Component } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";

import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanUploadReq, ScanUploadResp } from "src/app/generated-protos/scan-msgs";

import { httpErrorToString } from "src/app/utils/utils";

@Component({
  selector: "app-add-dataset-dialog",
  templateUrl: "./add-dataset-dialog.component.html",
  styleUrls: ["./add-dataset-dialog.component.scss"],
})
export class AddDatasetDialogComponent {
  // switch modes for html
  modeEntry = "entry";
  modeCreate = "create";
  modeComplete = "done";

  nameHint: string = "";
  droppedFiles: File[] = [];
  logId: string = "";
  mode: string = this.modeEntry;
  modeTitle: string = "";

  detector: string = "";
  detectors = ["jpl-breadboard", "sbu-breadboard", "pixl-em"];

  constructor(
    //@Inject(MAT_DIALOG_DATA) public params: AddDatasetParameters,
    public dialogRef: MatDialogRef<boolean>,
    private _dataService: APIDataService
  ) {}

  //ngOnInit(): void {}

  onOK() {
    if (this.droppedFiles.length != 1) {
      alert("Please drop one zip file to upload");
      return;
    }

    if (this.detector.length <= 0) {
      alert("Please choose an instrument");
      return;
    }

    if (this.nameHint.length <= 0) {
      alert("Please enter a name");
      return;
    }

    // Here we trigger the dataset creation and monitor logs
    this.droppedFiles[0].arrayBuffer().then(
      (fileBytes: ArrayBuffer) => {
        this.mode = this.modeCreate;
        this.modeTitle = "Creating dataset: " + this.nameHint + "...";

        this._dataService
          .sendScanUploadRequest(
            ScanUploadReq.create({
              id: this.nameHint,
              format: this.detector,
              zippedData: new Uint8Array(fileBytes),
            })
          )
          .subscribe({
            next: (resp: ScanUploadResp) => {
              this.modeTitle = "Dataset: " + this.nameHint + " created";

              // This should trigger log viewing...
              //this.logId = resp.logId;
              this.mode = this.modeComplete;
            },
            error: err => {
              this.modeTitle = httpErrorToString(err, "Failed to create dataset");
              this.mode = this.modeComplete;
            },
          });
      },
      () => {
        alert("Error: Failed to read files to upload");
      }
    );
  }

  get acceptTypes(): string {
    return "application/zip,application/x-zip-compressed";
  }

  get formatHelp(): string {
    if (this.detector == "pixl-em") {
      return "Zip file must contain files organised in sub-directories named by the 3-character product type, the same way as how FM datasets are generated. Also note that DATASET NAME must match the RTT encoded into the file names of the EM dataset being uploaded, otherwise the import will fail.";
    } else if (this.detector.endsWith("breadboard")) {
      return "Zip files added must contain only .msa files, with no other files, and no directories in the zip file.";
    }

    return "";
  }

  onChangeDetector(detector: string) {
    this.detector = detector;
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
