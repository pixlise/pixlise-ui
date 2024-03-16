import { Injectable } from "@angular/core";
import { CachedImageItem, CachedRGBUImageItem, db } from "../models/local-storage-db";
import { liveQuery } from "dexie";
import { SnackbarDataItem } from "./snackbar.service";
import { MemoisedItem } from "src/app/generated-protos/memoisation";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { UINotification } from "src/app/modules/settings/services/notifications.service";

@Injectable({
  providedIn: "root",
})
export class LocalStorageService {
  static EVENT_HISTORY_LIMIT = 100;

  eventHistory$ = liveQuery(() => db.eventHistory.toArray().then(items => items.reverse()));
  memoData$ = liveQuery(() => db.memoData);
  images$ = liveQuery(() => db.images);
  rgbuImages$ = liveQuery(() => db.rgbuImages);
  notifications$ = liveQuery(() =>
    db.notifications.toArray().then(items =>
      items.sort((a, b) => {
        if (a.systemNotification?.timeStampUnixSec && b.systemNotification?.timeStampUnixSec) {
          return b.systemNotification.timeStampUnixSec - a.systemNotification.timeStampUnixSec;
        } else if (a.systemNotification?.timeStampUnixSec) {
          return 1;
        } else if (b.systemNotification?.timeStampUnixSec) {
          return -1;
        } else {
          return a.title.localeCompare(b.title);
        }
      })
    )
  );

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

  async addNotification(notification: UINotification) {
    await db.notifications.add(notification);
  }

  async dismissNotification(id: string) {
    await db.notifications.delete(id);
  }

  async clearNotifications() {
    await db.notifications.clear();
  }

  async deleteMemoKey(key: string) {
    await db.memoData.delete(key);
  }

  async clearUnsavedMemoData() {
    await db.memoData.filter(item => item.key.startsWith(DataExpressionId.UnsavedExpressionPrefix)).delete();
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

  async storeImage(data: string, key: string, url: string, height: number, width: number, size: number) {
    let item: CachedImageItem = { data, key, url, height, width, size, timestamp: Date.now() };
    await db.images.put(item, url);
  }

  async getImage(url: string): Promise<CachedImageItem | undefined> {
    return await db.images.get(url);
  }

  async clearImages() {
    await db.images.clear();
  }

  async storeRGBUImage(data: ArrayBuffer, key: string, url: string) {
    let item: CachedRGBUImageItem = { data, key, url, timestamp: Date.now() };
    await db.rgbuImages.put(item, url);
  }

  async getRGBUImage(url: string): Promise<CachedRGBUImageItem | undefined> {
    return await db.rgbuImages.get(url);
  }

  async clearRGBUImages() {
    await db.rgbuImages.clear();
  }

  async clearImagesBySubstring(substring: string) {
    await db.images.filter(item => item.url.includes(substring)).delete();
    await db.rgbuImages.filter(item => item.url.includes(substring)).delete();
  }
}
