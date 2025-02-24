import { Injectable } from "@angular/core";

import { APIDataService } from "./apidata.service";
import { Observable, firstValueFrom, from, map, of } from "rxjs";
import { MemoiseWriteReq, MemoiseWriteResp } from "src/app/generated-protos/memoisation-msgs";
import { MemoiseGetReq } from "src/app/generated-protos/memoisation-msgs";
import { MemoiseGetResp } from "src/app/generated-protos/memoisation-msgs";
import { MemoisedItem } from "src/app/generated-protos/memoisation";
import { LocalStorageService } from "./local-storage.service";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { SentryHelper } from "src/app/utils/utils";
import { environment } from "src/environments/environment";

@Injectable({
  providedIn: "root",
})
export class MemoisationService {
  // Local cache, if it's not in here, we reach out to API and cache what it says
  private _local = new Map<string, MemoisedItem>();

  constructor(
    private _dataService: APIDataService,
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

  memoise(key: string, data: Uint8Array): Observable<MemoisedItem> {
    if ((environment?.skipMemoizeKeys || []).indexOf(key) > -1) {
      console.warn("Skipping memoisation of: " + key);
      return of(MemoisedItem.create({ key: key, data: data }));
    }

    // Only memoise if it's changed
    const existing = this._local.get(key);
    if (existing) {
      const idx = this.getIndexAtDifference(existing.data, data);
      if (idx < 0) {
        // Stop here, we've already got this memoised
        console.warn("Already memoised: " + key);
        return of(MemoisedItem.create({ key: key, data: data }));
      } else {
        SentryHelper.logMsg(false, `Memoised data ${key} changed at idx ${idx}`);
      }
    }

    console.debug(`Memoising: ${key}...`);

    // Save it in memory (we'll update the time stamp soon)
    const ts = Date.now() / 1000;

    const localMemoData = MemoisedItem.create({ key, data, memoTimeUnixSec: ts });
    this._local.set(key, localMemoData);
    this._localStorageService.storeMemoData(localMemoData);

    // Write it to API
    return this._dataService.sendMemoiseWriteRequest(MemoiseWriteReq.create({ key, data })).pipe(
      map((resp: MemoiseWriteResp) => {
        // Fix up the time stamp
        let memoData = this._local.get(key);
        if (memoData) {
          memoData.memoTimeUnixSec = resp.memoTimeUnixSec;
        } else {
          memoData = MemoisedItem.create({ key: key, data: data, memoTimeUnixSec: resp.memoTimeUnixSec });
        }
        this._local.set(key, memoData);

        // Cache it to local storage
        this._localStorageService.storeMemoData(memoData);
        return memoData;
      })
    );
  }

  getMemoised(key: string): Observable<MemoisedItem> {
    console.debug("Checking for memoised: " + key);

    // If we have it locally, stop here
    const local = this._local.get(key);
    if (local !== undefined) {
      return of(local);
    }

    return from(
      this._localStorageService
        .getMemoData(key)
        .then(async memoData => {
          if (memoData) {
            this._local.set(key, memoData);
            return memoData;
          } else {
            // Get from API
            return firstValueFrom(this.getFromAPI(key));
          }
        })
        .catch(async err => {
          // This should've worked...
          //if (!(err instanceof WSError) || (err as WSError).status != ResponseStatus.WS_NOT_FOUND) {
          // But instanceof says it's not a WSError and the cast also fails, so we just check it textually
          if (err.message && err.message.indexOf(" not found") < 0) {
            SentryHelper.logException(err, "Error in local storage getMemoData");
          }

          // Get from API
          return firstValueFrom(this.getFromAPI(key));
        })
    );
  }

  private getFromAPI(key: string): Observable<MemoisedItem> {
    return this._dataService.sendMemoiseGetRequest(MemoiseGetReq.create({ key })).pipe(
      map((resp: MemoiseGetResp) => {
        if (!resp.item) {
          const err = new Error("MemoiseGetResp returned empty message for key: " + key);
          console.error(err);
          throw err;
        }

        // Store it locally
        this._local.set(key, resp.item);
        this._localStorageService.storeMemoData(resp.item);

        return resp.item;
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
