import Dexie, { Table } from "dexie";
import { SnackbarDataItem } from "./snackbar-data";
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

export type CachedSpectraItem = {
  data: Uint8Array;
  key: string;
  timestamp: number;
  loadedAllPMCs: boolean;
  loadedBulkSum: boolean;
  loadedMaxValue: boolean;
};

export class LocalStorageDB extends Dexie {
  private static readonly targetVersion = 8;

  eventHistory!: Table<SnackbarDataItem, number>;
  memoData!: Table<MemoisedItem, string>;
  images!: Table<CachedImageItem, string>;
  rgbuImages!: Table<CachedRGBUImageItem, string>;
  notifications!: Table<UINotification, string>;
  spectra!: Table<CachedSpectraItem, string>;

  constructor() {
    super("pixlise");
    console.info(`DB version ${LocalStorageDB.targetVersion} initialising`);

    this.version(LocalStorageDB.targetVersion).stores({
      eventHistory: "++id",
      notifications: "id",
      memoData: "key",
      images: "key",
      rgbuImages: "key",
      spectra: "key",
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

  public override open() {
    if (this.isOpen()) {
      console.info(`DB already open`);
      return super.open();
    }

    return Dexie.Promise.resolve()
      .then(() => Dexie.exists(this.name))
      .then(exists => {
        if (!exists) {
          // no need to check database version since it doesn't exist
          console.warn(`DB doesn't exist, will create a blank one`);
          return db.close();
        }

        // Open separate instance of dexie to get current database version
        return new Dexie(this.name).open().then(async db => {
          if (db.verno >= LocalStorageDB.targetVersion) {
            // database up to date (or newer)
            console.info(`DB version is already up to date`);
            return db.close();
          }

          console.warn(`Database schema out of date, resetting all data. (currentVersion: ${db.verno}, expectedVersion: ${LocalStorageDB.targetVersion})`);
          await db.delete();

          // ensure the delete was successful
          const exists = await Dexie.exists(this.name);
          if (exists) {
            throw new Error("Failed to remove outdated database.");
          }
        });
      })
      .then(() => super.open());
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

    await db.transaction("rw", "spectra", () => {
      this.spectra.clear();
    });
  }
}

export const db = new LocalStorageDB();
