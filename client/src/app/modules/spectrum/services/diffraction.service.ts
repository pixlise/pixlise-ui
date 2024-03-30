import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { BehaviorSubject, map, Observable, tap } from "rxjs";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import {
  DiffractionPeakManualDeleteReq,
  DiffractionPeakManualInsertReq,
  DiffractionPeakManualListReq,
  DiffractionPeakManualListResp,
} from "src/app/generated-protos/diffraction-manual-msgs";
import {
  DetectedDiffractionPeakStatuses,
  DetectedDiffractionPeakStatuses_PeakStatus,
  DetectedDiffractionPerLocation,
  ManualDiffractionPeak,
} from "src/app/generated-protos/diffraction-data";
import { DetectedDiffractionPeaksReq } from "src/app/generated-protos/diffraction-detected-peak-msgs";
import { ScanEntry } from "src/app/generated-protos/scan-entry";
import { ScanEntryRange } from "src/app/generated-protos/scan";
import { DiffractionPeakStatusDeleteReq, DiffractionPeakStatusListReq, DiffractionPeakStatusWriteReq } from "src/app/generated-protos/diffraction-status-msgs";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";

const peakWidth = 15; // TODO: set this right!

export type DiffractionPeakMapPerLocation = Map<string, DetectedDiffractionPerLocation>;

@Injectable({
  providedIn: "root",
})
export class DiffractionService {
  detectedPeaksPerScan$ = new BehaviorSubject<Map<string, DiffractionPeakMapPerLocation>>(new Map());
  manualPeaksPerScan$ = new BehaviorSubject<Map<string, ManualDiffractionPeak[]>>(new Map());
  diffractionPeaksStatuses$ = new BehaviorSubject<Map<string, DetectedDiffractionPeakStatuses>>(new Map());

  constructor(
    private _snackbarService: SnackbarService,
    private _dataService: APIDataService,
    private _apiCacheService: APICachedDataService
  ) {}

  fetchPeakStatusesForScanAsync(scanId: string): Observable<Map<string, DetectedDiffractionPeakStatuses>> {
    return this._dataService.sendDiffractionPeakStatusListRequest(DiffractionPeakStatusListReq.create({ scanId })).pipe(
      map(response => {
        let peaksPerScan = this.diffractionPeaksStatuses$.value;
        if (response.peakStatuses) {
          peaksPerScan.set(scanId, response.peakStatuses);
        }
        this.diffractionPeaksStatuses$.next(peaksPerScan);

        return peaksPerScan;
      })
    );
  }

  fetchPeakStatusesForScan(scanId: string) {
    this._dataService.sendDiffractionPeakStatusListRequest(DiffractionPeakStatusListReq.create({ scanId })).subscribe(response => {
      let peaksPerScan = this.diffractionPeaksStatuses$.value;
      if (response.peakStatuses) {
        peaksPerScan.set(scanId, response.peakStatuses);
      }
      this.diffractionPeaksStatuses$.next(peaksPerScan);
    });
  }

  deletePeakStatus(scanId: string, diffractionPeakId: string) {
    this._dataService.sendDiffractionPeakStatusDeleteRequest(DiffractionPeakStatusDeleteReq.create({ scanId, diffractionPeakId })).subscribe({
      next: () => {
        let peaksPerScan = this.diffractionPeaksStatuses$.value;
        let peakStatuses = peaksPerScan.get(scanId);
        if (peakStatuses) {
          delete peakStatuses.statuses[diffractionPeakId];
          peaksPerScan.set(scanId, peakStatuses);
          this.diffractionPeaksStatuses$.next(peaksPerScan);
        }
      },
      error: err => {
        this._snackbarService.openError(`Failed to delete peak status for peak ${diffractionPeakId}:` + err);
        console.error(`Failed to delete peak status for peak ${diffractionPeakId}:`, err);
      },
    });
  }

  addPeakStatus(scanId: string, diffractionPeakId: string, status: string) {
    this._dataService.sendDiffractionPeakStatusWriteRequest(DiffractionPeakStatusWriteReq.create({ scanId, diffractionPeakId, status })).subscribe({
      next: response => {
        let peaksPerScan = this.diffractionPeaksStatuses$.value;
        let peakStatuses = peaksPerScan.get(scanId);
        if (peakStatuses) {
          peakStatuses.statuses[diffractionPeakId] = DetectedDiffractionPeakStatuses_PeakStatus.create({ status });
          peaksPerScan.set(scanId, peakStatuses);
          this.diffractionPeaksStatuses$.next(peaksPerScan);
          this._apiCacheService.detectedDiffractionStatusReqMapCacheInvalid = true;
        }
      },
      error: err => {
        this._snackbarService.openError(`Failed to add peak status for peak ${diffractionPeakId}:` + err);
        console.error(`Failed to add peak status for peak ${diffractionPeakId}:`, err);
      },
    });
  }

  fetchManualPeaksForScanAsync(scanId: string): Observable<Map<string, ManualDiffractionPeak[]>> {
    return this._dataService.sendDiffractionPeakManualListRequest(DiffractionPeakManualListReq.create({ scanId })).pipe(
      map(response => {
        let scanPeaks: ManualDiffractionPeak[] = [];
        Object.entries(response.peaks).forEach(([peakId, peak]) => {
          peak.id = peakId;
          peak.scanId = scanId;
          scanPeaks.push(peak);
        });

        let peaksPerScan = this.manualPeaksPerScan$.value;
        peaksPerScan.set(scanId, scanPeaks);
        this.manualPeaksPerScan$.next(peaksPerScan);

        return peaksPerScan;
      })
    );
  }

  fetchManualPeaksForScan(scanId: string) {
    this._dataService.sendDiffractionPeakManualListRequest(DiffractionPeakManualListReq.create({ scanId })).subscribe(response => {
      let scanPeaks: ManualDiffractionPeak[] = [];
      Object.entries(response.peaks).forEach(([peakId, peak]) => {
        peak.id = peakId;
        peak.scanId = scanId;
        scanPeaks.push(peak);
      });

      let peaksPerScan = this.manualPeaksPerScan$.value;
      peaksPerScan.set(scanId, scanPeaks);
      this.manualPeaksPerScan$.next(peaksPerScan);
    });
  }

  addManualPeak(scanId: string, energykeV: number, pmc: number) {
    this._dataService.sendDiffractionPeakManualInsertRequest(DiffractionPeakManualInsertReq.create({ scanId, energykeV, pmc })).subscribe({
      next: response => {
        let peak = ManualDiffractionPeak.create({ id: response.createdId, energykeV, pmc, scanId });

        let peaksPerScan = this.manualPeaksPerScan$.value;
        let peaks = peaksPerScan.get(scanId) || [];
        peaks.push(peak);
        peaksPerScan.set(scanId, peaks);

        this.manualPeaksPerScan$.next(peaksPerScan);
      },
      error: err => {
        this._snackbarService.openError(`Failed to add peak for PMC ${pmc}:` + err);
        console.error(`Failed to add peak for PMC ${pmc}:`, err);
      },
    });
  }

  deleteManualPeak(scanId: string, id: string) {
    this._dataService.sendDiffractionPeakManualDeleteRequest(DiffractionPeakManualDeleteReq.create({ id })).subscribe({
      next: () => {
        let peaksPerScan = this.manualPeaksPerScan$.value;
        let manualPeaks = peaksPerScan.get(scanId);
        if (manualPeaks) {
          peaksPerScan.set(
            scanId,
            manualPeaks.filter(peak => peak.id !== id)
          );
        }

        this.manualPeaksPerScan$.next(peaksPerScan);
      },
      error: err => {
        this._snackbarService.openError(`Failed to delete peak ${id}:` + err);
        console.error(`Failed to delete peak ${id}:`, err);
      },
    });
  }

  fetchDetectedPeaksForScanEntryRange(scanId: string, entries: ScanEntryRange) {
    this._dataService.sendDetectedDiffractionPeaksRequest(DetectedDiffractionPeaksReq.create({ scanId, entries })).subscribe(response => {
      let peaksPerScan = this.detectedPeaksPerScan$.value;
      let peaks = peaksPerScan.get(scanId) || new Map<string, DetectedDiffractionPerLocation>();
      response.peaksPerLocation.forEach(diffraction => {
        peaks.set(diffraction.id, diffraction);
      });

      peaksPerScan.set(scanId, peaks);
      this.detectedPeaksPerScan$.next(peaksPerScan);
    });
  }
}
