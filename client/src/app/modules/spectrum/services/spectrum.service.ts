import { Injectable, OnDestroy } from "@angular/core";
import { SpectrumChartModel } from "../widgets/spectrum-chart-widget/spectrum-model";
import { XRFDatabaseService } from "src/app/services/xrf-database.service";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, Subscription } from "rxjs";
import { QuantificationStartOptionsComponent, QuantificationStartOptionsParams } from "../widgets/spectrum-chart-widget/quantification-start-options/quantification-start-options.component";
import { QuantCreateParams } from "src/app/generated-protos/quantification-meta";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { QuantCreateUpd } from "src/app/generated-protos/quantification-create";
import { JobStatus_Status, jobStatus_StatusToJSON } from "src/app/generated-protos/job";

// NOTE: This is scoped to the spectrum widget (and its children) ONLY!

@Injectable()
export class SpectrumService implements OnDestroy {
  private _subs = new Subscription();

  mdl: SpectrumChartModel;

  constructor(
    private _xrfDBService: XRFDatabaseService,
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService,
    private dialog: MatDialog
  ) {
    this.mdl = new SpectrumChartModel(this._xrfDBService /*, dialog, clipboard*/);

    // If we're around, we show updates to quant creations...
    this._dataService.quantCreateUpd$.subscribe((upd: QuantCreateUpd) => {
      if (!upd.status) {
        this._snackBarService.openError("Quantification job update did not include job status");
      } else {
        const msg = `Quantification ${jobStatus_StatusToJSON(upd.status.status)}: ${upd.status.message}`;
        const detail = `Job Id is: ${upd.status.jobId}`;

        if (upd.status.status == JobStatus_Status.COMPLETE) {
          this._snackBarService.openSuccess(msg, detail);
        } else if (upd.status.status == JobStatus_Status.ERROR) {
          this._snackBarService.openError(msg, detail);
        } else {
          this._snackBarService.open(msg, detail);
        }
      }
    });
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  showQuantificationDialog(scanIds: string[], defaultCommand: string, atomicNumbers: Set<number>): Observable<QuantCreateParams> {
    // Show the confirmation dialog
    const dialogConfig = new MatDialogConfig();

    //dialogConfig.disableClose = true;
    //dialogConfig.autoFocus = true;
    //dialogConfig.width = '1200px';

    dialogConfig.data = new QuantificationStartOptionsParams(scanIds, defaultCommand, atomicNumbers);

    const dialogRef = this.dialog.open(QuantificationStartOptionsComponent, dialogConfig);

    return dialogRef.afterClosed();
  }
}
