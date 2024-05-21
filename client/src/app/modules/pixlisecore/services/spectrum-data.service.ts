import { Injectable } from "@angular/core";
import { Observable, map, of, shareReplay, switchMap, toArray } from "rxjs";
import { SpectrumReq, SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { decompressZeroRunLengthEncoding } from "src/app/utils/utils";
import { APIDataService } from "./apidata.service";
import { NotificationType } from "src/app/generated-protos/notification";
import { NotificationUpd } from "src/app/generated-protos/notification-msgs";
import { Spectra, Spectrum } from "src/app/generated-protos/spectrum";
import { APICachedDataService } from "./apicacheddata.service";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { ScanEntryRange } from "src/app/generated-protos/scan";
import { index } from "mathjs";

class ScanSpectrumData {
  constructor(
    public scanTimeStampUnixSec: number,
    public bulkSum: Spectrum[],
    public maxValue: Spectrum[],
    public pmcSpectra: Spectrum[][],
    public channelCount: number,
    public normalSpectraForScan: number,
    public dwellSpectraForScan: number,
    public liveTimeMetaIndex: number,
    public loadedAllPMCs: boolean,
    public loadedBulkSum: boolean, // Flag needed because dataset may not have any bulk spectra, but we've requested it already
    public loadedMaxValue: boolean // Flag needed because dataset may not have any bulk spectra, but we've requested it already
  ) {}
}

@Injectable({
  providedIn: "root",
})
export class SpectrumDataService {
  private _spectrumCache = new Map<string, ScanSpectrumData>();
  private _outstandingReq: Observable<SpectrumResp> | null = null;

  constructor(
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService
  ) {
    this._dataService.notificationUpd$.subscribe((upd: NotificationUpd) => {
      // When we get a data change notification we clear caches relevant to that
      if (upd.notification?.notificationType == NotificationType.NT_SYS_DATA_CHANGED) {
        // Clear all our caches for this notification
        if (upd.notification.scanIds) {
          for (const scanId of upd.notification.scanIds) {
            this._spectrumCache.delete(scanId);
          }
        }
      }
    });
  }

  // If called with indexes==null, we won't receive per-PMC spectra. If indexes==[] or an array with numbers, the spectra for those PMCs will be returned
  getSpectrum(scanId: string, indexes: number[] | null, bulkSum: boolean, maxValue: boolean): Observable<SpectrumResp> {
    // Get the scans meta data so we know what indexes exist
    return this._cachedDataService.getScanList(ScanListReq.create({ searchFilters: { scanId } })).pipe(
      switchMap((scanListResp: ScanListResp) => {
        if (!scanListResp.scans || scanListResp.scans.length <= 0) {
          throw new Error(`Failed to retrieve scan: ${scanId}`);
        }

        // If we've already got a request we're waiting for, wait for that and then do our
        // lookup, it might already answer what we're requesting
        if (this._outstandingReq !== null) {
          return this._outstandingReq.pipe(
            switchMap(result => {
              return this.getSpectrum(scanId, indexes, bulkSum, maxValue);
            })
          );
        }
        // else: Process it from what we have

        // Now that we have the number of PMCs, we can work out what we're doing
        const cachedValue = this.serviceFromCache(scanId, scanListResp.scans[0].timestampUnixSec, indexes, bulkSum, maxValue);
        if (cachedValue !== null) {
          return cachedValue;
        }

        // Don't have it cached, so request it
        return this.requestSpectra(scanId, scanListResp.scans[0].timestampUnixSec, 0, indexes, bulkSum, maxValue);
      })
    );
  }

  private requestSpectra(
    scanId: string,
    scanTimeStampUnixSec: number,
    indexCount: number,
    indexes: number[] | null,
    bulkSum: boolean,
    maxValue: boolean
  ): Observable<SpectrumResp> {
    const cached = this._spectrumCache.get(scanId);

    if (cached) {
      // Don't request stuff we already have
      if (bulkSum && cached.loadedBulkSum) {
        bulkSum = false;
      }
      if (maxValue && cached.loadedMaxValue) {
        maxValue = false;
      }
      if ((indexes === null || indexes.length > 0) && cached.loadedAllPMCs) {
        indexes = null;
      }
    }

    // If we've got some spectra already, only request what's newly needed
    const req = SpectrumReq.create({
      scanId: scanId,
      bulkSum: bulkSum,
      maxValue: maxValue,
    });

    if (indexes !== null) {
      req.entries = ScanEntryRange.create({ indexes: indexes });
    }

    this._outstandingReq = this._dataService.sendSpectrumRequest(req).pipe(
      map((resp: SpectrumResp) => {
        this.decompressSpectra(resp);

        // Update our cache
        const spectra: Spectrum[][] = cached?.pmcSpectra || [];
        if (spectra.length <= 0) {
          for (const spectraForLoc of resp.spectraPerLocation) {
            spectra.push(spectraForLoc.spectra);
          }
        }

        const updatedCachedData = new ScanSpectrumData(
          scanTimeStampUnixSec,
          cached?.loadedBulkSum ? cached.bulkSum : resp.bulkSpectra,
          cached?.loadedMaxValue ? cached.maxValue : resp.maxSpectra,
          spectra,
          resp.channelCount,
          resp.normalSpectraForScan,
          resp.dwellSpectraForScan,
          resp.liveTimeMetaIndex,
          (indexes === null || indexes.length > 0) && resp.spectraPerLocation.length > 0,
          cached?.loadedBulkSum || bulkSum,
          cached?.loadedMaxValue || maxValue
        );

        this._spectrumCache.set(scanId, updatedCachedData);

        // No longer outstanding!
        this._outstandingReq = null;

        return resp;
      }),
      shareReplay(1)
    );

    return this._outstandingReq;
  }

  private serviceFromCache(
    scanId: string,
    scanTimeStampUnixSec: number,
    indexes: number[] | null,
    bulkSum: boolean,
    maxValue: boolean
  ): Observable<SpectrumResp> | null {
    let cached = this._spectrumCache.get(scanId);

    // If we have a cached value AND it's too old, clear it
    if (cached && scanTimeStampUnixSec > cached.scanTimeStampUnixSec) {
      this._spectrumCache.delete(scanId);
      cached = undefined;
    }

    // If we have a usable cached value, try to read everything from it!
    if (cached) {
      const resp = SpectrumResp.create({
        bulkSpectra: [],
        maxSpectra: [],
        spectraPerLocation: [],
        channelCount: cached.channelCount,
        normalSpectraForScan: cached.normalSpectraForScan,
        dwellSpectraForScan: cached.dwellSpectraForScan,
        liveTimeMetaIndex: cached.liveTimeMetaIndex,
      });

      // Fill in what's required
      if (bulkSum) {
        if (cached.loadedBulkSum) {
          resp.bulkSpectra = cached.bulkSum;
        } else {
          // We need bulk but don't have it, so stop here
          return null;
        }
      }

      if (maxValue) {
        if (cached.loadedMaxValue) {
          resp.maxSpectra = cached.maxValue;
        } else {
          // We need max but don't have it, so stop here
          return null;
        }
      }

      if (indexes === null || indexes.length > 0) {
        if (cached.loadedAllPMCs) {
          for (const spectra of cached.pmcSpectra) {
            resp.spectraPerLocation.push(Spectra.create({ spectra: spectra }));
          }
        } else {
          // We needed spectra for some PMCs, but haven't loaded them, stop here
          return null;
        }
      }

      return of(resp);
    }

    return null;
  }

  private decompressSpectra(spectrumData: SpectrumResp) {
    // We get spectra with runs of 0's run-length encoded. Here we decode them to have the full spectrum channel list in memory
    // and this way we also don't double up on storage in memory
    for (const loc of spectrumData.spectraPerLocation) {
      for (const spectrum of loc.spectra) {
        spectrum.counts = Array.from(decompressZeroRunLengthEncoding(spectrum.counts, spectrumData.channelCount));
      }
    }

    if (spectrumData.bulkSpectra) {
      for (const spectrum of spectrumData.bulkSpectra) {
        spectrum.counts = Array.from(decompressZeroRunLengthEncoding(spectrum.counts, spectrumData.channelCount));
      }
    }

    if (spectrumData.maxSpectra) {
      for (const spectrum of spectrumData.maxSpectra) {
        spectrum.counts = Array.from(decompressZeroRunLengthEncoding(spectrum.counts, spectrumData.channelCount));
      }
    }
  }
}
