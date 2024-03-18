import Dexie, { Table } from "dexie";
import { SnackbarDataItem } from "../services/snackbar.service";
import { MemoisedItem } from "src/app/generated-protos/memoisation";
import { UINotification } from "src/app/modules/settings/services/notifications.service";

export type CachedImageItem = {
  data: string;
  key: string;
  url: string;
  height: number;
  width: number;
  size: number;
  timestamp: number;
};

export type CachedRGBUImageItem = {
  data: ArrayBuffer;
  key: string;
  url: string;
  timestamp: number;
};

export class LocalStorageDB extends Dexie {
  eventHistory!: Table<SnackbarDataItem, number>;
  memoData!: Table<MemoisedItem, string>;
  images!: Table<CachedImageItem, string>;
  rgbuImages!: Table<CachedRGBUImageItem, string>;
  notifications!: Table<UINotification, string>;

  constructor() {
    super("pixlise");
    this.version(6).stores({
      eventHistory: "++id",
      notifications: "id",
      memoData: "key",
      images: "key",
      rgbuImages: "key",
    });

    this.on("populate", transaction => {
      transaction.table("notifications").add({
        id: "hotkeys-panel",
        title: "Try Hotkeys Panel:",
        type: "action",
        action: {
          buttonTitle: "Open",
        },
      });
    });
  }

  async resetDatabase() {
    await db.transaction("rw", "eventHistory", () => {
      this.eventHistory.clear();
    });

    await db.transaction("rw", "notifications", () => {
      this.eventHistory.clear();
    });

    await db.transaction("rw", "memoData", () => {
      this.memoData.clear();
    });

    await db.transaction("rw", "images", () => {
      this.images.clear();
    });

    await db.transaction("rw", "rgbuImages", () => {
      this.rgbuImages.clear();
    });
  }
}

export const db = new LocalStorageDB();
