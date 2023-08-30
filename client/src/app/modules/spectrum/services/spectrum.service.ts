import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { ReplaySubject, Subscription } from "rxjs";

import { SpectrumReq } from "src/app/generated-protos/spectrum-msgs";
import { ScanEntryRange } from "src/app/generated-protos/scan";
import { ScanBeamLocationsReq } from "src/app/generated-protos/scan-beam-location-msgs";
import { SpectrumChartModel } from "../widgets/spectrum-chart-widget/model";
import { DiffractionService } from "./diffraction.service";
import { QuantGetReq } from "src/app/generated-protos/quantification-retrieval-msgs";
import { ViewStateService } from "../../viewstate/services/viewstate.service";

@Injectable({
  providedIn: "root",
})
export class SpectrumService {
  private _subs = new Subscription();

  // behaviour subject instead?
  private _mdl: SpectrumChartModel | null = null;
  private _mdl$ = new ReplaySubject<void>(1);

  constructor(
    private _dataService: APIDataService,
    private _snackbarService: SnackbarService,
    private _diffractionService: DiffractionService,
    private _viewStateService: ViewStateService
  ) {
    this.resubscribeQuantLayers();

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

  private resubscribeQuantLayers() {
    // this._subs.add(this._widgetDataService.quantificationLoaded$.subscribe(
    //   (quant: QuantificationLayer) => {
    //     // WARNING: we used to listen to widgetData$ and here we had an ugly stack overflow because
    //     // it triggers a chain reaction where this + diffraction peaks panel fire off change
    //     // events which then triggers widget region data service to rebuild, etc etc.
    //     if (this._mdl) {
    //       this.updateCalibrationFromQuant();
    //     }
    //   },
    //   (err) => {
    //   },
    //   () => {
    //     this.resubscribeQuantLayers();
    //   }
    // ));
  }

  // setModel(mdl: SpectrumChartModel): void {
  //   this._mdl = mdl;

  //   // Spectrum model needs quant for energy calibration "from quant" values
  //   this.updateCalibrationFromQuant();

  //   // Tell the diffraction service there's a new calibration manager
  //   this._diffractionService.setEnergyCalibrationManager(this._mdl.energyCalibrationManager);

  //   this._mdl$.next();
  // }

  private fetchQuantLoaded(): void {}

  private updateCalibrationFromQuant(): void {
    // let quant = this._widgetDataService.quantificationLoaded;
    // if (quant) {
    //   let calib$ = quant.getAverageEnergyCalibration();
    //   calib$.subscribe(
    //     (calib) => {
    //       this._mdl?.setQuantificationeVCalibration(calib);
    //     }
    //   );
    // }
  }

  // get mdl(): SpectrumChartModel | null {
  //   return this._mdl;
  // }

  // get mdl$(): ReplaySubject<void> {
  //   return this._mdl$;
  // }
}
