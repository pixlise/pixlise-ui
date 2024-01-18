import { Injectable } from "@angular/core";

import { APIDataService } from "./apidata.service";
import { Observable, catchError, firstValueFrom, from, map, of } from "rxjs";
import { MemoiseWriteReq, MemoiseWriteResp } from "src/app/generated-protos/memoisation-msgs";
import { MemoiseGetReq } from "src/app/generated-protos/memoisation-msgs";
import { MemoiseGetResp } from "src/app/generated-protos/memoisation-msgs";
import { MemoisedItem } from "src/app/generated-protos/memoisation";
import { LocalStorageService } from "./local-storage.service";

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

  memoise(key: string, data: Uint8Array): Observable<void> {
    // Only memoise if it's changed
    const existing = this._local.get(key);
    if (existing && this.equals(existing.data, data)) {
      // Stop here, we've already got this memoised
      console.warn("Already memoised: " + key);
      return of();
    }

    // Save it in memory (we'll update the time stamp soon)
    const ts = Date.now() / 1000;
    this._local.set(key, MemoisedItem.create({ key, data, memoTimeUnixSec: ts }));

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

        return;
      })
    );
  }

  get(key: string): Observable<MemoisedItem> {
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
            return await this.getFromAPI(key);
          }
        })
        .catch(async err => {
          console.error(err);

          // Get from API
          return await this.getFromAPI(key);
        })
    );
  }

  private async getFromAPI(key: string): Promise<MemoisedItem> {
    // Get from API
    let apiResponse = await firstValueFrom(
      this._dataService.sendMemoiseGetRequest(MemoiseGetReq.create({ key })).pipe(
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
        }),
        catchError(err => {
          console.log("Not memoised: " + key);
          throw new Error(err);
        })
      )
    );

    return apiResponse;
  }

  // We should use hashes stored in the API or something...
  // Also currently no faster way than this it seems
  // https://stackoverflow.com/questions/76127214/compare-equality-of-two-uint8array
  private equals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length != b.length) {
      return false;
    }

    for (let c = 0; c < a.length; c++) {
      if (a[c] != b[c]) {
        console.log("Memoisation equality failed at idx: " + c);
        return false;
      }
    }
    return true;
  }
}
