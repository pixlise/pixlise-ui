import { Injectable } from "@angular/core";
import { db } from "../models/local-storage-db";
import { liveQuery } from "dexie";
import { SnackbarDataItem } from "./snackbar.service";
import { MemoisedItem } from "src/app/generated-protos/memoisation";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  static EVENT_HISTORY_LIMIT = 100;

  eventHistory$ = liveQuery(() => db.eventHistory.toArray().then(items => items.reverse()));
  memoData$ = liveQuery(() => db.memoData);

  constructor() {}

  async addEventHistoryItem(item: SnackbarDataItem) {
    db.eventHistory.count(count => {
      if (count >= LocalStorageService.EVENT_HISTORY_LIMIT - 1) {
        db.eventHistory.limit(count - LocalStorageService.EVENT_HISTORY_LIMIT + 1).delete();
      }
    });
    await db.eventHistory.add(item);
  }

  async clearEventHistory() {
    await db.eventHistory.clear();
  }

  async storeMemoData(memoData: MemoisedItem) {
    await db.memoData.put(memoData, memoData.key);
  }

  async getMemoData(key: string): Promise<MemoisedItem | undefined> {
    return await db.memoData.get(key);
  }

  async clearMemoData() {
    await db.memoData.clear();
  }
}
