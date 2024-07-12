import { Injectable } from "@angular/core";
import { Observable, Subject, combineLatest, from, map, of, shareReplay, switchMap } from "rxjs";
import { SpectrumReq, SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { decompressZeroRunLengthEncoding, encodeIndexList } from "src/app/utils/utils";
import { APIDataService } from "./apidata.service";
import { NotificationType } from "src/app/generated-protos/notification";
import { NotificationUpd } from "src/app/generated-protos/notification-msgs";
import { Spectra, Spectrum } from "src/app/generated-protos/spectrum";
import { APICachedDataService } from "./apicacheddata.service";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { ScanEntryRange } from "src/app/generated-protos/scan";
import { LocalStorageService } from "./local-storage.service";
import { CachedSpectraItem } from "../models/local-storage-db";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";

export class ScanSpectrumData {
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
    private _cachedDataService: APICachedDataService,
    private _localStorageService: LocalStorageService
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

        // Now that we have the number of PMCs, we can work out what we're doing
        return this.serviceFromCache(scanId, scanListResp.scans[0].timestampUnixSec, indexes, bulkSum, maxValue).pipe(
          switchMap((cachedValue: SpectrumResp | null) => {
            if (cachedValue !== null) {
              return of(cachedValue);
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

            // Don't have it cached, so request it
            if (indexes === null || indexes.length > 0) {
              // Request scan entries first, so we have a list of all indexes that we need spectra for. This allows us to batch-request
              // spectra from API
              return this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })).pipe(
                switchMap((entriesResp: ScanEntryResp) => {
                  const reqIndexes: number[] = [];
                  for (let c = 0; c < entriesResp.entries.length; c++) {
                    const entry = entriesResp.entries[c];
                    if (entry.normalSpectra) {
                      reqIndexes.push(c);
                    }
                  }

                  return this.requestSpectra(scanId, scanListResp.scans[0].timestampUnixSec, reqIndexes, bulkSum, maxValue);
                })
              );
            }
            return this.requestSpectra(scanId, scanListResp.scans[0].timestampUnixSec, indexes, bulkSum, maxValue);
          })
        );
      })
    );
  }

  private requestSpectra(scanId: string, scanTimeStampUnixSec: number, indexes: number[] | null, bulkSum: boolean, maxValue: boolean): Observable<SpectrumResp> {
    const cached = this._spectrumCache.get(scanId);

    // Back up what we ACTUALLY require (we don't necessarily load what's requested because we may have it cached)
    const origBulkSum = bulkSum;
    const origMaxValue = maxValue;

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
    const requests: SpectrumReq[] = [
      SpectrumReq.create({
        scanId: scanId,
        bulkSum: bulkSum,
        maxValue: maxValue,
      }),
    ];

    if (indexes !== null) {
      // Request batches of spectra, if we request the whole lot in one go, the load balancer or something ends up disconnecting us and even restarting the API
      // Never really got to the bottom of what's going on there
      if (indexes.length <= 0) {
        requests[0].entries = ScanEntryRange.create({ indexes: [] });
      } else {
        const batchSize = 200;
        for (let c = 0; c < indexes.length; c += batchSize) {
          const reqIdxs = encodeIndexList(indexes.slice(c, c + batchSize));

          if (c == 0) {
            // Tack onto that first request
            requests[c].entries = ScanEntryRange.create({ indexes: reqIdxs });
          } else {
            requests.push(
              SpectrumReq.create({
                scanId: scanId,
                entries: ScanEntryRange.create({ indexes: reqIdxs }),
              })
            );
          }
        }
      }
    }

    const req$: Subject<SpectrumResp>[] = [];
    for (const req of requests) {
      req$.push(this._dataService.sendSpectrumRequest(req));
    }

    this._outstandingReq = combineLatest(req$).pipe(
      map((resps: SpectrumResp[]) => {
        const resp = resps[0];

        // Copy all other spectra into first message, so we can process it as one
        for (let c = 1; c < resps.length; c++) {
          resp.spectraPerLocation.push(...resps[c].spectraPerLocation);
        }

        // Read all responses and process in one go
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

        // Also save in index DB
        this._localStorageService.storeSpectra(scanId, updatedCachedData);

        // No longer outstanding!
        this._outstandingReq = null;

        const constructedResp = this.processCachedSpectra(updatedCachedData, scanId, scanTimeStampUnixSec, indexes, origBulkSum, origMaxValue);
        if (!constructedResp) {
          // Unlikely scenario - our cached item is somehow now too old... in this case at least return something!
          return resp;
        }
        return constructedResp;
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
  ): Observable<SpectrumResp | null> {
    // Try read it from memory cache
    const memCached = this._spectrumCache.get(scanId);

    if (memCached) {
      // Read this item
      return of(this.processCachedSpectra(memCached, scanId, scanTimeStampUnixSec, indexes, bulkSum, maxValue));
    }

    // Wasn't in memory, try read it from index DB
    return from(this._localStorageService.getSpectraForKey(scanId)).pipe(
      map((storedCachedItem: CachedSpectraItem | undefined) => {
        if (!storedCachedItem) {
          // Wasn't in index DB either
          return null;
        }

        // Found it in index DB, store it in memory cache
        const cachedResp = SpectrumResp.decode(storedCachedItem.data);

        const pmcSpectra: Spectrum[][] = [];
        for (const item of cachedResp.spectraPerLocation) {
          pmcSpectra.push(item.spectra);
        }

        const cachedItem = new ScanSpectrumData(
          storedCachedItem.timestamp,
          cachedResp.bulkSpectra,
          cachedResp.maxSpectra,
          pmcSpectra,
          cachedResp.channelCount,
          cachedResp.normalSpectraForScan,
          cachedResp.dwellSpectraForScan,
          cachedResp.liveTimeMetaIndex,
          storedCachedItem.loadedAllPMCs,
          storedCachedItem.loadedBulkSum,
          storedCachedItem.loadedMaxValue
        );
        this._spectrumCache.set(scanId, cachedItem);
        return this.processCachedSpectra(cachedItem, scanId, scanTimeStampUnixSec, indexes, bulkSum, maxValue);
      })
    );
  }

  private processCachedSpectra(
    cached: ScanSpectrumData,
    scanId: string,
    scanTimeStampUnixSec: number,
    indexes: number[] | null,
    bulkSum: boolean,
    maxValue: boolean
  ): SpectrumResp | null {
    // If we have a cached value AND it's too old, clear it
    if (cached && scanTimeStampUnixSec > cached.scanTimeStampUnixSec) {
      this._spectrumCache.delete(scanId);
      this._localStorageService.deleteSpectraForKey(scanId);
      return null;
    }

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

    return resp;
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
