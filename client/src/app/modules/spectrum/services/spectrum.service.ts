import { Injectable } from "@angular/core";
import { SpectrumChartModel } from "../widgets/spectrum-chart-widget/spectrum-model";
import { XRFDatabaseService } from "src/app/services/xrf-database.service";

// NOTE: This is scoped to the spectrum widget (and its children) ONLY!

@Injectable()
export class SpectrumService {
  //private _subs = new Subscription();

  mdl: SpectrumChartModel;

  constructor(private _xrfDBService: XRFDatabaseService) {
    this.mdl = new SpectrumChartModel(this._xrfDBService /*, dialog, clipboard*/);
  }

  // ngOnDestroy() {
  //   this._subs.unsubscribe();
  // }
}
