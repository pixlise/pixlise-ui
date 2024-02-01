import Dexie, { Table } from "dexie";
import { SnackbarDataItem } from "../services/snackbar.service";
import { MemoisedItem } from "src/app/generated-protos/memoisation";

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

  constructor() {
    super("pixlise");
    this.version(5).stores({
      eventHistory: "++id",
      memoData: "key",
      images: "key",
      rgbuImages: "key",
    });
  }

  async resetDatabase() {
    await db.transaction("rw", "eventHistory", () => {
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
