import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { ReplaySubject, Subscription } from "rxjs";

import { SpectrumReq } from "src/app/generated-protos/spectrum-msgs";
import { ScanEntryRange } from "src/app/generated-protos/scan";
import { ScanBeamLocationsReq } from "src/app/generated-protos/scan-beam-location-msgs";
import { DiffractionService } from "./diffraction.service";
import { QuantGetReq } from "src/app/generated-protos/quantification-retrieval-msgs";
import { ViewStateService } from "../../viewstate/services/viewstate.service";

@Injectable({
  providedIn: "root",
})
export class SpectrumService {
  private _subs = new Subscription();

  constructor(
    private _dataService: APIDataService,
    private _snackbarService: SnackbarService,
    private _diffractionService: DiffractionService,
    private _viewStateService: ViewStateService
  ) {
    this.fetchSpectrum("012521_83_pressed_powder", { indexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, false, false);
    this.fetchScanBeamLocations("012521_83_pressed_powder");
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  fetchScanBeamLocations(scanId: string = "") {
    this._dataService.sendScanBeamLocationsRequest(ScanBeamLocationsReq.create({})).subscribe(response => {
      console.log("RESP", response);
    });
  }

  fetchSpectrum(scanId: string = "", entries: ScanEntryRange | undefined = undefined, bulkSum: boolean = false, maxValue: boolean = false) {
    console.log("FETCHING SPECTRUM", scanId, entries, bulkSum, maxValue);
    this._dataService
      .sendSpectrumRequest(
        SpectrumReq.create({
          scanId,
          entries,
          bulkSum,
          maxValue,
        })
      )
      .subscribe(response => {
        console.log("RESP", response);
      });
  }
}