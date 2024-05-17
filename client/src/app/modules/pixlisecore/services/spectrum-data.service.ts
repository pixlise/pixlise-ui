import { Injectable } from "@angular/core";
import { Observable, toArray, map, shareReplay } from "rxjs";
import { SpectrumReq, SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { decompressZeroRunLengthEncoding } from "src/app/utils/utils";
import { APIDataService } from "./apidata.service";
import { NotificationType } from "src/app/generated-protos/notification";
import { NotificationUpd } from "src/app/generated-protos/notification-msgs";
import { ScanEntryRange } from "src/app/generated-protos/scan";

@Injectable({
  providedIn: "root",
})
export class SpectrumDataService {
  private _scanIdCacheKeys = new Map<string, string[]>();
  private _spectrumReqMap = new Map<string, Observable<SpectrumResp>>();

  constructor(private _dataService: APIDataService) {
    this._dataService.notificationUpd$.subscribe((upd: NotificationUpd) => {
      // When we get a data change notification we clear caches relevant to that
      if (upd.notification?.notificationType == NotificationType.NT_SYS_DATA_CHANGED) {
        // Clear all our caches for this notification
        if (upd.notification.scanIds) {
          for (const scanId of upd.notification.scanIds) {
            this.clearCacheForScanId(scanId);
          }
        }
      }
    });
  }

  private clearCacheForScanId(scanId: string) {
    // Clear all item caches relevant to this scan id
    const ids = this._scanIdCacheKeys.get(scanId);
    if (ids != undefined) {
      for (const id of ids) {
        this._spectrumReqMap.delete(id);
      }
    }

    // We've cleared it!
    this._scanIdCacheKeys.delete(scanId);
  }

  // If called with indexes==null, we won't receive per-PMC spectra. If indexes==[] or an array with numbers, the spectra for those PMCs will be returned
  getSpectrum(scanId: string, indexes: number[] | null, bulkSum: boolean, maxValue: boolean): Observable<SpectrumResp> {
    const req = SpectrumReq.create({
      scanId: scanId,
      bulkSum: bulkSum,
      maxValue: maxValue,
    });

    if (indexes !== null) {
      req.entries = ScanEntryRange.create({ indexes: indexes });
    }

    const cacheId = JSON.stringify(SpectrumReq.toJSON(req));
    let result = this._spectrumReqMap.get(cacheId);
    if (result === undefined) {
      // Have to request it!
      result = this._dataService.sendSpectrumRequest(req).pipe(
        toArray(),
        map((resps: SpectrumResp[]) => {
          for (const resp of resps) {
            this.decompressSpectra(resp);
          }

          // Assemble a final response containing all spectra in it
          for (let c = 1; c < resps.length; c++) {
            resps[0].spectraPerLocation.push(...resps[c].spectraPerLocation);
          }

          return resps[0];
        }),
        shareReplay(1)
      );

      // Add it to the map too so a subsequent request will get this
      this._spectrumReqMap.set(cacheId, result);
      this.addIdCacheItem(req.scanId, cacheId, this._scanIdCacheKeys);
    }

    return result;
  }

  // Expects to be passed an id, and one of: _scanIdCacheKeys, _quantIdCacheKeys, _imageCacheKeys
  private addIdCacheItem(id: string, item: string, toMap: Map<string, string[]>) {
    const vals = toMap.get(id);
    if (vals === undefined) {
      toMap.set(id, [item]);
    } else {
      vals.push(item);
    }
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
