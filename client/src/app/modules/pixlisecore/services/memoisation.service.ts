import { Injectable } from "@angular/core";

import { Observable, catchError, firstValueFrom, from, map, of, switchMap } from "rxjs";
import { MemoisedItem } from "src/app/generated-protos/memoisation";
import { LocalStorageService } from "./local-storage.service";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { httpErrorToString, SentryHelper } from "src/app/utils/utils";
import { environment } from "src/environments/environment";
import { APIPaths } from "src/app/utils/api-helpers";
import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";

@Injectable({
  providedIn: "root",
})
export class MemoisationService {
  // Local cache, if it's not in here, we reach out to API and cache what it says
  private _local = new Map<string, MemoisedItem>();

  constructor(
    private _httpClient: HttpClient,
    //private _dataService: APIDataService,
    private _localStorageService: LocalStorageService
  ) {}

  delete(key: string): Observable<void> {
    this._local.delete(key);
    return from(this._localStorageService.deleteMemoKey(key));
  }

  deleteByRegex(pattern: string): Observable<void> {
    this._local.forEach((value, key) => {
      if (key.match(pattern)) {
        this._local.delete(key);
      }
    });

    return from(this._localStorageService.deleteMemoKeysByRegex(pattern));
  }

  clearUnsavedMemoData(): Observable<void> {
    this._local.forEach((value, key) => {
      if (key.startsWith(DataExpressionId.UnsavedExpressionPrefix)) {
        this._local.delete(key);
      }
    });
    return from(this._localStorageService.clearUnsavedMemoData());
  }

  memoise(key: string, data: Uint8Array, scanId: string, quantId: string, expressionId: string): Observable<MemoisedItem> {
    if ((environment?.skipMemoizeKeys || []).indexOf(key) > -1) {
      console.warn("Skipping memoisation of: " + key);
      return of(MemoisedItem.create({ key: key, data: data, scanId: scanId, quantId: quantId, exprId: expressionId }));
    }

    // Only memoise if it's changed
    const existing = this._local.get(key);
    if (existing) {
      const idx = this.getIndexAtDifference(existing.data, data);
      if (idx < 0) {
        // Stop here, we've already got this memoised
        console.warn("Already memoised: " + key);
        return of(MemoisedItem.create({ key: key, data: data, scanId: scanId, quantId: quantId, exprId: expressionId }));
      } else {
        SentryHelper.logMsg(false, `Memoised data ${key} changed at idx ${idx}`);
      }
    }

    console.debug(`Memoising: ${key}, size: ${data.length} bytes, scanId: ${scanId}, quantId: ${quantId}, exprId: ${expressionId}...`);

    // Save it in memory (we'll update the time stamp soon)
    const ts = Date.now() / 1000;

    const localMemoData = MemoisedItem.create({ key, data, memoTimeUnixSec: ts, scanId: scanId, quantId: quantId, exprId: expressionId });
    this._local.set(key, localMemoData);
    this._localStorageService.storeMemoData(localMemoData);

    const updateLocalCache = (key: string, data: Uint8Array, timestampUnixSec: number, scanId: string, quantId: string, expressionId: string) => {
      // Fix up the time stamp
      let memoData = this._local.get(key);
      if (memoData) {
        memoData.memoTimeUnixSec = timestampUnixSec;
      } else {
        memoData = MemoisedItem.create({ key: key, data: data, memoTimeUnixSec: timestampUnixSec, scanId: scanId, quantId: quantId, exprId: expressionId });
      }
      this._local.set(key, memoData);

      // Cache it to local storage
      this._localStorageService.storeMemoData(memoData);

      return memoData;
    };

    // Write it to API
    const req = MemoisedItem.create({ key: key, data: data, scanId: scanId, quantId: quantId, exprId: expressionId });
    const apiUrl = APIPaths.getWithHost(APIPaths.api_memoise);

    const writer = MemoisedItem.encode(req);
    const bytes = writer.finish();
    const sendbuf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/octet-stream",
      }),
      responseType: "arraybuffer" as "json",
      params: new HttpParams().set("key", key),
    };

    return this._httpClient.put<ArrayBuffer>(apiUrl, sendbuf, httpOptions).pipe(
      map((respData: ArrayBuffer) => {
        const respStr = new TextDecoder().decode(respData);
        const resp = JSON.parse(respStr);
        const memoTimeUnixSec = resp["timestamp"];
        if (memoTimeUnixSec === undefined) {
          throw new Error("Failed to decode Memoisation response timestamp");
        }

        return updateLocalCache(key, data, memoTimeUnixSec, scanId, quantId, expressionId);
      }),
      catchError(err => {
        SentryHelper.logMsg(false, `Failed to memoise ${key} containing ${data.length} bytes`);
        return of(updateLocalCache(key, data, ts, scanId, quantId, expressionId));
      })
    );
  }

  getMemoised(key: string): Observable<MemoisedItem> {
    console.debug("Checking for memoised: " + key);

    // If we have it locally, stop here
    const local = this._local.get(key);
    if (local !== undefined) {
      const ageTooOldSec = this.memoItemAgePastMax(local);
      if (ageTooOldSec < 0) {
        console.debug(`Found memoised (in memory): ${key}, size: ${local.data.length}...`);
        return of(local);
      } else {
        console.info(`Found local memoised item that is ${ageTooOldSec} sec too old, retrieving from API...`);

        // Delete this cache entry from local storage and get from API
        return this.delete(key).pipe(
          switchMap(() => {
            return this.getFromAPI(key);
          })
        );
      }
    }

    // Not in memory, so check index DB first, then API
    return from(
      this._localStorageService
        .getMemoData(key)
        .then(async memoData => {
          if (memoData) {
            const ageTooOldSec = this.memoItemAgePastMax(memoData);
            if (ageTooOldSec > 0) {
              console.info(`Found memoised item in indexDB that is ${ageTooOldSec} sec too old, retrieving from API...`);
              return this._localStorageService.deleteMemoKey(key).then(() => {
                return firstValueFrom(this.getFromAPI(key));
              });
            } else {
              console.debug(`Found memoised: ${key}, size: ${memoData.data.length}...`);
              this._local.set(key, memoData); // Ensure it's in memory
              return memoData;
            }
          }
          // Get from API
          return firstValueFrom(this.getFromAPI(key));
        })
        .catch(async err => {
          console.error(httpErrorToString(err, `Error checking memoised: ${key}`));

          // This should've worked...
          //if (!(err instanceof WSError) || (err as WSError).status != ResponseStatus.WS_NOT_FOUND) {
          // But instanceof says it's not a WSError and the cast also fails, so we just check it textually
          if (err.message && err.message.indexOf(" Not Found") < 0) {
            SentryHelper.logException(err, "Error in local storage getMemoData");
          }

          // Get from API
          return firstValueFrom(this.getFromAPI(key));
        })
    );
  }

  private memoItemAgePastMax(item: MemoisedItem): number {
    const nowUnixSec = Math.round(Date.now() / 1000);
    const maxAgeUnixSec = nowUnixSec - environment.localMemoiseCacheTimeOutSec;

    // Get whichever is "newer"
    // LastReadTime was introduced later, so it's optional
    const itemUnixSec = Math.max(item.memoTimeUnixSec, item?.lastReadTimeUnixSec || 0);

    const ageTooOldSec = maxAgeUnixSec - itemUnixSec;
    return ageTooOldSec;
  }

  private getFromAPI(key: string): Observable<MemoisedItem> {
    console.debug(`Checking API for memoised: ${key}...`);
    const apiUrl = APIPaths.getWithHost(APIPaths.api_memoise);

    const httpOptions = {
      /*headers: new HttpHeaders({
        "Content-Type": "application/octet-stream",
      }),*/
      params: new HttpParams().set("key", key),
      responseType: "arraybuffer" as "json",
    };

    return this._httpClient.get<ArrayBuffer>(apiUrl, httpOptions).pipe(
      map((respData: ArrayBuffer) => {
        const arr = new Uint8Array(respData);
        const item = MemoisedItem.decode(arr);

        if (!item) {
          const err = new Error("MemoiseGetResp returned empty message for key: " + key);
          console.error(err);
          throw err;
        }

        // Store it locally
        this._local.set(key, item);
        this._localStorageService.storeMemoData(item);

        console.debug(`API returned memoised: ${key}, size: ${item.data.length}...`);
        return item;
      }) /*,
      catchError(err => {
        console.log("Not memoised: " + key);
        throw new Error(err);
      })*/
    );
  }

  // We should use hashes stored in the API or something...
  // Also currently no faster way than this it seems
  // https://stackoverflow.com/questions/76127214/compare-equality-of-two-uint8array
  private getIndexAtDifference(a: Uint8Array, b: Uint8Array): number {
    if (a.length != b.length) {
      return 0;
    }

    for (let c = 0; c < a.length; c++) {
      if (a[c] != b[c]) {
        return c;
      }
    }
    return -1;
  }
}
