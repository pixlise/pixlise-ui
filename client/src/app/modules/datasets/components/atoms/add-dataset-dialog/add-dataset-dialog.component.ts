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

import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Subscription } from "rxjs";

import { APICachedDataService, APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanCreateUserDefinedReq, ScanImportUpd } from "src/app/generated-protos/scan-msgs";

import { httpErrorToString, isJobStatusActive } from "src/app/utils/utils";
import { JobStatus_Status, jobStatus_StatusToJSON } from "src/app/generated-protos/job";
import { APIEndpointsService, UploadProgress, UploadStatus } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { ScanUploader } from "src/app/utils/uploader/scan-uploader";

@Component({
  standalone: false,
  selector: "app-add-dataset-dialog",
  templateUrl: "./add-dataset-dialog.component.html",
  styleUrls: ["./add-dataset-dialog.component.scss"],
})
export class AddDatasetDialogComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  // switch modes for html
  modeEntry = "entry";
  modeUpload = "upload";
  modeComplete = "done";

  nameHint: string = "";
  droppedFiles: File[] = [];
  private _jobId: string = "";

  logId: string = "";
  private _modeTitle: string = "";
  complete = false;

  mode: string = this.modeEntry;

  detector: string = "";
  detectors: string[] = [];// We now request this from server! "jpl-breadboard", "sbu-breadboard", "pixl-fm", "pixl-em", "user-defined"];

  skipRows = 0;
  skipColumns = 0;
  maxMapPoints = 0;

  uploadButtonLabel = "Upload";

  constructor(
    //@Inject(MAT_DIALOG_DATA) public params: AddDatasetParameters,
    public dialogRef: MatDialogRef<boolean>,
    private _dataService: APIDataService,
    private _cacheDataService: APICachedDataService,
    private _endpointService: APIEndpointsService,
    private _dialog: MatDialog,
    private _snackService: SnackbarService,
  ) {
    this._cacheDataService.getScanUploadFormats().subscribe(
      resp => {
        this.detectors = resp.formats;

        // Select the first detector option presented
        this.onChangeDetector(this.detectors[0]);
      }
    );
  }

  ngOnInit(): void {
    this._subs.add(
      this._dataService.scanImportUpd$.subscribe((upd: ScanImportUpd) => {
        // If we get an update, try open logs, etc
        if (upd.status && upd.status.jobId == this._jobId) {
          // Preserve log id if we have one already and get a blank one
          if (!this.logId || (upd.status.logId && this.logId != upd.status.logId)) {
            this.logId = upd.status.logId;
          }

          this.setStatus(upd.status.status, upd.status.message);
          this.complete = !isJobStatusActive(upd.status.status);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get modeTitle(): string {
    return this._modeTitle;
  }

  get singleZipPrompt(): string {
    if (!this.detector) {
      return "";
    }
/*
    if (this.detector.endsWith("breadboard")) {
      return "Drop spectrum zip file";
    } else if (this.detector.indexOf("bruker") > -1) {
    return "Drop zipped BCF file";

    }

    return "Drop SDF-Peek output zip file";*/
    return "Drop zip file to upload here";
  }

  setStatus(status: JobStatus_Status, statusMessage: string) {
    console.log(`Add Dataset Dialog status: ${status}, message: ${statusMessage}...`);

    if (status == JobStatus_Status.UNKNOWN || statusMessage.length > 0) {
      this._modeTitle = statusMessage;
    } else {
      const statusStr = jobStatus_StatusToJSON(status);
      this._modeTitle = `Import ${statusStr}: ${statusMessage}`;
    }
  }

  onOK() {
    if (this.detector.length <= 0) {
      alert("Please choose an instrument");
      return;
    }

    let uploadId = "upload-" + Date.now();
    if (this.nameHint.length <= 0) {
      alert("Please enter a name");
      return;
    }

    if (this.detector == "user-defined") {
      // We're creating a user-defined scan, just send the message directly. This bypasses any lambdas etc.
      this.setStatus(JobStatus_Status.UNKNOWN, "Creating dataset: " + this.nameHint + "...");

      this._dataService.sendScanCreateUserDefinedRequest(ScanCreateUserDefinedReq.create({id: this.nameHint})).subscribe({
        next: () => {
          this.setStatus(JobStatus_Status.UNKNOWN, "Dataset created: " + this.nameHint + "...");
          this.mode = this.modeComplete;
        },
        error: err => {
          this.setStatus(JobStatus_Status.ERROR, httpErrorToString(err, "Failed to upload dataset"));
          this.mode = this.modeComplete;
        }
      });
      return;
    }

    if (this.droppedFiles.length != 1) {
      alert("Please drop one zip file to upload");
      return;
    }

    uploadId = this.nameHint;

    const zipName = this.droppedFiles[0].name;

    this.mode = this.modeUpload;
    this.setStatus(JobStatus_Status.UNKNOWN, "Uploading dataset: " + zipName + " with job id: " + uploadId + "...");

    const fileUploader = new ScanUploader(
      this._endpointService,
      this._dataService,
    );

    fileUploader.uploadScanZip(uploadId, this.droppedFiles[0], this.detector).subscribe(
      resp => {
        if (resp instanceof UploadProgress) {
          const prog = resp as UploadProgress;

          switch(prog.status) {
          case UploadStatus.US_COMPLETE:
            this.setStatus(JobStatus_Status.COMPLETE, prog.message);
            break;
          case UploadStatus.US_ERROR:
            this.setStatus(JobStatus_Status.ERROR, prog.message);
            break;
          case UploadStatus.US_PROCESSING:
            this.setStatus(JobStatus_Status.RUNNING, prog.message);
            break;
          case UploadStatus.US_UPLOADING:
            this.setStatus(JobStatus_Status.STARTING, prog.message);
            break
          }
        }
      }
    );
/*
    // Here we trigger the dataset creation and monitor logs
    this.droppedFiles[0].arrayBuffer().then(
      (fileBytes: ArrayBuffer) => {
        this.complete = false;

        // First, we upload the file via HTTP
        this.upl._endpointService.uploadScanZip(uploadId, zipName, fileBytes).subscribe({
          next: () => {
            // Now that it's uploaded...
            console.log(`Scan ${zipName} uploaded ${fileBytes} bytes. Starting import...`);

            // Then we send the scan upload message which picks up that file and processes it
            this._dataService
              .sendScanUploadRequest(
                ScanUploadReq.create({
                  id: uploadId,
                  format: this.detector,
                  zipFileName: zipName,
                  skipRows: this.skipRows,
                  skipColumns: this.skipColumns,
                  maxMapPoints: this.maxMapPoints
                })
              )
              .subscribe({
                next: (resp: ScanUploadResp) => {
                  this.setStatus(JobStatus_Status.UNKNOWN, "Importing uploaded dataset: " + zipName + "...");

                  // This should trigger log viewing...
                  this._jobId = resp.jobId;
                  this.mode = this.modeComplete;
                },
                error: err => {
                  this.setStatus(JobStatus_Status.ERROR, httpErrorToString(err, "Failed to import uploaded dataset"));
                  this.mode = this.modeComplete;
                },
              });
          },
          error: err => {
            this.setStatus(JobStatus_Status.ERROR, httpErrorToString(err, "Failed to upload dataset"));
            this.mode = this.modeComplete;
          },
        });
      },
      () => {
        this.setStatus(JobStatus_Status.ERROR, "Failed to read files to upload");
      }
    );*/
  }

  get acceptTypes(): string {
    return "application/zip,application/x-zip-compressed";
  }

  get formatHelp(): string {
    if (this.detector == "user-defined") {
      return "Enter dataset name to create. You can add images, spectra, scan points, etc when opening the scan from the browse page.";
    } else if (this.detector == "pixl-em" || this.detector == "pixl-fm") {
      return "Zip file must contain files generated by SDF Peek - not all are required!\n\nDirectory stucture within the zip file doesn't matter. As long as:\n - sdf_raw.txt\n - *.msa histogram files\n - images (in .jpg format)\n\nare in the zip file, it will be imported.\n\nNOTE: sdf_raw.txt can contain data from multiple scans (with differing RTTs), so importing one zip may produce multiple dataset tiles in PIXLISE. You can delete the ones that are not required.\n\nTo prevent potentially overwriting an FM dataset, if an RTT being imported already exists in PIXLISE, it will be imported with _copy appended to its RTT";
    } else if (this.detector == "bruker-bcf") {
      return "Zip file must contain files one .BCF file generated by a Bruker device. Zipping is recommended because .BCF files compress well and the upload will be faster.";
    } else if (this.detector.indexOf("breadboard") > 0) {
      // Breadboards... msa based!
      return "Zip files added must contain only .msa files, with no other files, and no directories in the zip file.";
    }

    return "";
  }

  get datasetIdFieldName(): string {
    // Comment just for searchability, we're checking if its pixl-em or pixl-fm
    if (this.detector.startsWith("pixl-")) {
      return "RTT to import";
    }
    return "Dataset Name";
  }

  onChangeDetector(detector: string) {
    this.detector = detector;

    if (this.detector == "user-defined") {
      this.uploadButtonLabel = "Create";
    } else {
      this.uploadButtonLabel = "Upload";
    }
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
      this.droppedFiles!.push(event.addedFiles[0]);
    }
  }

  onRemoveDroppedFile(event) {
    //console.log(event);
    this.droppedFiles!.splice(this.droppedFiles!.indexOf(event), 1);
  }
}
