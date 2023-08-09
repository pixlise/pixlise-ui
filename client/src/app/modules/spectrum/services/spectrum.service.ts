import { Injectable } from '@angular/core';

import { APIDataService, SnackbarService } from '../../pixlisecore/pixlisecore.module';
import { ReplaySubject } from 'rxjs';

import * as _m0 from "protobufjs/minimal";
import { SpectrumReq } from 'src/app/generated-protos/spectrum-msgs';
import { ScanEntryRange } from 'src/app/generated-protos/scan';

@Injectable({
  providedIn: 'root'
})
export class SpectrumService {
  constructor(
    private _dataService: APIDataService,
    private _snackbarService: SnackbarService
  ) {
    this.fetchSpectrum("083624452", { indexes: [10, 100] }, false, false);
  }

  fetchSpectrum(scanId: string = "", entries: ScanEntryRange | undefined = undefined, bulkSum: boolean = false, maxValue: boolean = false) {
    console.log("FETCHING SPECTRUM", scanId, entries, bulkSum, maxValue)
    this._dataService.sendSpectrumRequest(SpectrumReq.create({
      scanId,
      entries,
      bulkSum,
      maxValue,
    })).subscribe((response) => {
      console.log("RESP", response)
    });
  }
}