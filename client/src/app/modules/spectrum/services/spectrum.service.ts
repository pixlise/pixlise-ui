import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { ReplaySubject, Subscription } from "rxjs";

import { SpectrumReq } from "src/app/generated-protos/spectrum-msgs";
import { ScanEntryRange } from "src/app/generated-protos/scan";
import { ScanBeamLocationsReq } from "src/app/generated-protos/scan-beam-location-msgs";
import { DiffractionService } from "./diffraction.service";
//import { ViewStateService } from "../../viewstate/services/viewstate.service";

@Injectable({
  providedIn: "root",
})
export class SpectrumService {
  private _subs = new Subscription();

  constructor(
    private _dataService: APIDataService,
    private _snackbarService: SnackbarService,
    private _diffractionService: DiffractionService //private _viewStateService: ViewStateService
  ) {
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
