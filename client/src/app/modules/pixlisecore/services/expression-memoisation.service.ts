import { Injectable } from "@angular/core";
import { MemoisationService } from "./memoisation.service";
import { catchError, map, Observable, Observer, tap } from "rxjs";
import { MemoisedItem } from "src/app/generated-protos/memoisation";

class ReadRequest {
  waiting: Observer<MemoisedItem>[] = [];

  constructor(public endTimeUnixSec: number) {}
}

@Injectable({
  providedIn: "root",
})
export class ExpressionMemoisationService {
  private _waitingRequests: Map<string, ReadRequest> = new Map<string, ReadRequest>();

  constructor(private _memoisationService: MemoisationService) {}

  /*
  What this must do:
    Check if anything has requested this cache item
    If not, remember that this is "being processed", and try retrieve from cache. If that fails, returns nil.
    Meanwhile any subsequent requests for that cache item see that it's "in progress" and will wait for that progress to finish.
    If one was retrieved from cache, it notifies the original requestor AND the subsequent waiting ones.
    If nothing was in the cache, it notifies the original requestor, and now has to trust it to calculate that value and put it in the cache.
    When writeCache is called for this same key, it will save first, then notify all the subsequent waiting ones.

    When the last requestor is notified, the entry is deleted from the "being processed" storage, so it can all run as above again next time.

    Also, the list of requestors is only kept in memory so a tab refresh will start the whole thing from scratch. I think to cover the case of the first one crashing, I can add a timestamp so any subsequent requests will ignore this "being processed" item if its over a minute old or something, but tab refresh will clear it anyway.
*/

  getExprMemoised(key: string, waitFlag: boolean): Observable<MemoisedItem> {
    // If not waiting, we just blindly get, nothing exciting here
    if (!waitFlag) {
      return this._memoisationService.getMemoised(key);
    }

    // Wait flag is set, so here we make sure we manage requests and wait on existing ones
    // NOTE: We're initially called, and we start reading from memoisation service, another call may come in while the first caller is waiting.
    //       This waiting mechanism is here to prevent subsequent callers from also reading the cache and potentially calculating the value themselves!
    //       So here we check if there's a get in progress for this key already:
    const waiters = this._waitingRequests.get(key);
    if (!waiters) {
      // There is nothing in progress, so save an entry:
      this._waitingRequests.set(key, new ReadRequest(Date.now() / 1000));

      // Do the actual request to memoisation:
      return this._memoisationService.getMemoised(key).pipe(
        tap((value: MemoisedItem) => {
          // We got an actual value back. This will go back to the initial caller, and we also have to distribute it to any subsequent callers
          const waitersPostResp = this._waitingRequests.get(key);
          if (waitersPostResp) {
            for (const waiter of waitersPostResp.waiting) {
              waiter.next(value);
              waiter.complete();
            }

            // Clear this item, we're not waiting for it any more
            this._waitingRequests.delete(key);
            console.info(`getExprMemoised: Deleted waiters for key: ${key} after servicing ${waitersPostResp.waiting.length} calls`);
          } else {
            // We should at least find it once!
            console.error(`getExprMemoised: Failed to find waiters for key: ${key}`);
          }
        }),
        catchError(err => {
          // If we don't have any subsequent callers, delete here, so we don't get stranded in memory
          const waitersPostResp = this._waitingRequests.get(key);
          if (waitersPostResp && waitersPostResp.waiting.length <= 0) {
            console.info(`getExprMemoised: Deleted waiters for key: ${key} after no memoised item returned (${err}) ${waitersPostResp.waiting.length} calls`);
            this._waitingRequests.delete(key);
          }

          // If it's a "not found" error, this is normal operation, but really if we get ANY error we have to forward that to the initial caller
          // NOTE: we're NOT forwarding this to subsequent callers, because they can wait around for the initial caller to call memoise()
          throw err;
        })
      );
    }

    // This is in-progress, so we just add ourselves to the list of things waiting on it
    return new Observable<MemoisedItem>(observer => {
      waiters.waiting.push(observer);
      console.info(`getExprMemoised(${key}) now has ${waiters.waiting.length} waiters`);
    });
  }

  memoise(key: string, data: Uint8Array): Observable<void> {
    // Save it
    return this._memoisationService.memoise(key, data).pipe(
      map((memoItem: MemoisedItem) => {
        // Check if it's a key we've got marked as in progress
        const waiters = this._waitingRequests.get(key);
        if (waiters) {
          // It's in progress! This means we've got things waiting for this, and something just calculated it, so send it to all waiters
          for (const waiter of waiters.waiting) {
            waiter.next(memoItem);
            waiter.complete();
          }
          console.info(`memoise(${key}) notified ${waiters.waiting.length} waiters`);
        }

        // Delete it as it's now fulfilled
        this._waitingRequests.delete(key);
        console.info(`memoise(${key}) deleted waiters`);
      })
    );
  }
}
