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
import { Subscription } from "rxjs";
import { SpectrumChartModel } from "../spectrum-model";
// import { AuthService } from "@auth0/auth0-angular";
import { CustomAuthService as AuthService } from "src/app/services/custom-auth-service.service";
import { Permissions } from "src/app/utils/permissions";
import { SpectrumService } from "../../../services/spectrum.service";
import { httpErrorToString } from "src/app/utils/utils";
import { QuantCreateParams } from "src/app/generated-protos/quantification-meta";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { QuantCreateReq, QuantCreateResp, QuantCreateUpd } from "src/app/generated-protos/quantification-create";
import { QuantLastOutputGetReq, QuantLastOutputGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import saveAs from "file-saver";
import { QuantOutputType } from "src/app/generated-protos/quantification-retrieval-msgs";
import { JobStatus_Status, jobStatus_StatusToJSON } from "src/app/generated-protos/job";

export class SpectrumFitData {
  constructor(
    public mdl: SpectrumChartModel,
    public draggable: boolean
  ) {}
}

const NoFitYetMessage = "Please generate a fit first from Run PIQUANT tab via the Spectral Fit mode.";
const GeneratingFitMessage = "Generating fit lines";
const LoadingLastFitMessage = "Loading last fit";

@Component({
  standalone: false,
  selector: "spectrum-fit",
  templateUrl: "./spectrum-fit-container.component.html",
  styleUrls: ["./spectrum-fit-container.component.scss"],
})
export class SpectrumFitContainerComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  message: string = NoFitYetMessage;
  waiting: boolean = false;
  waitMessage: string = "";
  quantificationEnabled: boolean = false;

  constructor(
    private _spectrumService: SpectrumService,
    private _dataService: APIDataService,
    private _authService: AuthService,
    private _snackBarService: SnackbarService,
    public dialogRef: MatDialogRef<SpectrumFitContainerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SpectrumFitData
  ) {}

  ngOnInit(): void {
    // When we're shown, we set the chart to fit mode
    this._subs.add(
      this._authService.idTokenClaims$.subscribe(idToken => {
        if (idToken) {
          this.quantificationEnabled = Permissions.hasPermissionSet(idToken, Permissions.permissionCreateQuantification);
        }
      })
    );

    this._subs.add(
      this._spectrumService.mdl.fitLineSources$.subscribe({
        next: () => {
          if (this._spectrumService.mdl.fitLineSources.length <= 0) {
            this.message = NoFitYetMessage;
          } else {
            this.message = "";
          }

          this._spectrumService.mdl.setFitLineMode(!this.message);
        },
        // error: err => {},
      })
    );

    const scanId = this.getSingleScanId();
    if (scanId.length <= 0) {
      return;
    }

    if (!this._spectrumService.mdl.fitRawCSV) {
      // Try to load the last fit data
      this.waiting = true;
      this.waitMessage = LoadingLastFitMessage;

      this._dataService
        .sendQuantLastOutputGetRequest(
          QuantLastOutputGetReq.create({
            scanId: scanId,
            outputType: QuantOutputType.QO_DATA,
            piquantCommand: "quant",
          })
        )
        .subscribe({
          next: (resp: QuantLastOutputGetResp) => {
            const csv = resp.output;
            this.waiting = false;
            this.waitMessage = "";
            this._spectrumService.mdl.setFitLineData(scanId, csv);
          },
          error: err => {
            this.waiting = false;
            this.waitMessage = "";
            console.log(httpErrorToString(err, "Failed to retrieve last fit CSV, maybe there wasn't one"));
          },
        });
    }

    // Check if we have an id we're waiting for
    if (this._spectrumService.mdl.fitIdWaitingFor.length > 0) {
      // Show the wait state
      this.waiting = true;
      this.waitMessage = GeneratingFitMessage;
      this.message = "";

      // Wait for to update so we know when to get out of wait mode
      this.listenForQuantFitUpdate(scanId, this._spectrumService.mdl.fitIdWaitingFor);
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
    this._spectrumService.mdl.setFitLineMode(false);
  }

  onClose() {
    this.dialogRef.close();
  }

  private getSingleScanId(): string {
    const scanIds = new Set<string>();
    for (const line of this._spectrumService.mdl.spectrumLines) {
      scanIds.add(line.scanId);
    }

    if (scanIds.size <= 0) {
      return "";
    }

    return scanIds.keys().next().value;
  }

  get hasFitData(): boolean {
    // If we have no error msg, we have fit data... so we use this for now
    return this.message.length <= 0;
  }

  onViewLogs(): void {
    const scanId = this.getSingleScanId();
    if (scanId.length <= 0) {
      return;
    }

    this._dataService
      .sendQuantLastOutputGetRequest(
        QuantLastOutputGetReq.create({
          scanId: scanId,
          piquantCommand: "quant",
          outputType: QuantOutputType.QO_LOG,
        })
      )
      .subscribe({
        next: (resp: QuantLastOutputGetResp) => {
          const blob = new Blob([resp.output], {
            type: "text/csv",
          });

          saveAs(blob, "SpectrumFit.log");
        },
        error: err => {
          this._snackBarService.openError("Failed to retrieve log", err);
        },
      });
  }

  onExport(): void {
    if (!this._spectrumService.mdl || !this._spectrumService.mdl.fitRawCSV) {
      this._snackBarService.openError("No data to export", "Please run a quant fit so there is something to be exported");
      return;
    }

    const blob = new Blob([this._spectrumService.mdl.fitRawCSV], {
      type: "text/csv",
    });

    saveAs(blob, "SpectrumFit.csv");
  }

  onReQuantify(): void {
    // Warn if there is an existing fit already
    if (this._spectrumService.mdl.fitLineSources.length > 0) {
      if (!confirm("This will replace the existing fit. Are you sure you want to continue?")) {
        return;
      }
    }

    // Get the list of elements
    const atomicNumbers: Set<number> = new Set<number>(this._spectrumService.mdl.fitSelectedElementZs);

    const scanIds = new Set<string>();
    for (const line of this._spectrumService.mdl.spectrumLines) {
      scanIds.add(line.scanId);
    }

    this._spectrumService.showQuantificationDialog(Array.from(scanIds), "Fit", atomicNumbers).subscribe((createdParams: QuantCreateParams) => {
      if (!createdParams) {
        return;
      }

      // We've got the params, now pass to PIQUANT
      this._snackBarService.openSuccess("Generating fit with PIQUANT quant command... (may take 1-2 minutes)");

      this.waiting = true;
      this.waitMessage = GeneratingFitMessage;
      this.message = "";

      this._dataService.sendQuantCreateRequest(QuantCreateReq.create({ params: createdParams })).subscribe({
        next: (resp: QuantCreateResp) => {
          if (!resp.status) {
            this._snackBarService.openError("Fit start did not return job status");
            this.waiting = false;
          } else {
            // Ensure job was started
            if (resp.status.status == JobStatus_Status.ERROR) {
              this.waiting = false;
              this._snackBarService.openError(`PIQUANT Fit failed to start, error: started with unexpected status: ${resp.status.message}`);
            } else if (resp.status.status == JobStatus_Status.STARTING) {
              this._snackBarService.open("PIQUANT Fit started", "This may take 1-2 minutes, please wait and the result will be displayed");
              this._spectrumService.mdl.fitIdWaitingFor = resp.status.jobId; // Remember the job id in case this dialog is closed/reopened

              // At this point we subscribe to updates to listen for status changes
              this.listenForQuantFitUpdate(createdParams.scanId, resp.status.jobId);
            } else {
              this.waiting = false;
              this._snackBarService.openError(`Fit started with unexpected status: ${jobStatus_StatusToJSON(resp.status.status)}. Message: ${resp.status.message}`);
            }
          }
        },
        error: err => {
          this._snackBarService.openError("Failed to generate fit lines with PIQUANT. See logs", err);
          this.waiting = false;
        },
      });
    });
  }

  private listenForQuantFitUpdate(scanId: string, jobId: string) {
    const s = this._dataService.quantCreateUpd$.subscribe({
      next: (upd: QuantCreateUpd) => {
        if (upd.status && upd.status.jobId === jobId) {
          this.waiting = false;

          if (upd.status.status == JobStatus_Status.COMPLETE) {
            // Should have result data!
            if (upd.resultData && upd.resultData.byteLength > 0) {
              // The returned data is a CSV, so don't print it!
              console.log("PIQUANT returned " + upd.resultData.byteLength + " bytes");

              const csv = new TextDecoder().decode(upd.resultData);
              this._spectrumService.mdl.setFitLineData(scanId, csv);
            } else {
              this._snackBarService.openError("PIQUANT Fit did not return result data");
            }

            s.unsubscribe();
          }
        }
      },
      error: err => {
        this.waiting = false;
        this._snackBarService.openError(`PIQUANT Fit status update encountered an error: ${err}`);
      },
    });
  }
}
