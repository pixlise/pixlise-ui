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
import { AuthService } from "@auth0/auth0-angular";
import { Permissions } from "src/app/utils/permissions";
import { SpectrumService } from "../../../services/spectrum.service";
import { httpErrorToString } from "src/app/utils/utils";
import { QuantCreateParams } from "src/app/generated-protos/quantification-meta";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { QuantCreateReq, QuantCreateResp } from "src/app/generated-protos/quantification-create";
import { QuantLastOutputGetReq, QuantLastOutputGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import saveAs from "file-saver";
import { QuantOutputType } from "src/app/generated-protos/quantification-retrieval-msgs";

export class SpectrumFitData {
  constructor(
    public mdl: SpectrumChartModel,
    public draggable: boolean
  ) {}
}

const NoFitYetMessage = "Please generate a fit first from Run PIQUANT tab via the Spectral Fit mode.";

@Component({
  selector: "spectrum-fit",
  templateUrl: "./spectrum-fit-container.component.html",
  styleUrls: ["./spectrum-fit-container.component.scss"],
})
export class SpectrumFitContainerComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();
  message: string = NoFitYetMessage;
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

    if (!this._spectrumService.mdl.fitRawCSV) {
      const scanId = this.getSingleScanId();
      if (scanId.length <= 0) {
        return;
      }

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
            this._spectrumService.mdl.setFitLineData(scanId, csv);
            this._spectrumService.mdl.recalcSpectrumLines();
          },
          error: err => {
            console.log(httpErrorToString(err, "Failed to retrieve last fit CSV, maybe there wasn't one"));
          },
        });
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

      this._dataService.sendQuantCreateRequest(QuantCreateReq.create({ params: createdParams })).subscribe({
        next: (resp: QuantCreateResp) => {
          if (!resp.status) {
            this._snackBarService.openError("Fit start did not return job status");
          } else {
            if (!resp.resultData || resp.resultData.byteLength <= 0) {
              this._snackBarService.openError("Fit did not return result data");
            } else {
              // The returned data is a CSV, so don't print it!
              console.log("PIQUANT returned " + resp.resultData.byteLength + " bytes");

              const csv = new TextDecoder().decode(resp.resultData);
              this._spectrumService.mdl.setFitLineData(createdParams.scanId, csv);
              this._spectrumService.mdl.recalcSpectrumLines();
            }
          }
        },
        error: err => {
          this._snackBarService.openError("Failed to generate fit lines with PIQUANT. See logs", err);
        },
      });
    });
  }
}
