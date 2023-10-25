import { Injectable } from "@angular/core";
import { SpectrumChartModel } from "../widgets/spectrum-chart-widget/spectrum-model";
import { XRFDatabaseService } from "src/app/services/xrf-database.service";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable } from "rxjs";
import { QuantCreateParameters, QuantificationStartOptionsComponent, QuantificationStartOptionsParams } from "../widgets/spectrum-chart-widget/quantification-start-options/quantification-start-options.component";

// NOTE: This is scoped to the spectrum widget (and its children) ONLY!

@Injectable()
export class SpectrumService {
  //private _subs = new Subscription();

  mdl: SpectrumChartModel;

  constructor(
    private _xrfDBService: XRFDatabaseService,
    private dialog: MatDialog
  ) {
    this.mdl = new SpectrumChartModel(this._xrfDBService /*, dialog, clipboard*/);
  }

  // ngOnDestroy() {
  //   this._subs.unsubscribe();
  // }

  showQuantificationDialog(defaultCommand: string, atomicNumbers: Set<number>): Observable<QuantCreateParameters> {
    // Show the confirmation dialog
    const dialogConfig = new MatDialogConfig();

    //dialogConfig.disableClose = true;
    //dialogConfig.autoFocus = true;
    //dialogConfig.width = '1200px';

    dialogConfig.data = new QuantificationStartOptionsParams(defaultCommand, atomicNumbers);

    const dialogRef = this.dialog.open(QuantificationStartOptionsComponent, dialogConfig);

    return dialogRef.afterClosed();
  }
}
