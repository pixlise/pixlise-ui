import Dexie, { Table } from "dexie";
import { SnackbarDataItem } from "../services/snackbar.service";
import { MemoisedItem } from "src/app/generated-protos/memoisation";

export class LocalStorageDB extends Dexie {
  eventHistory!: Table<SnackbarDataItem, number>;
  memoData!: Table<MemoisedItem, string>;

  constructor() {
    super("pixlise");
    this.version(3).stores({
      eventHistory: "++id",
      memoData: "key",
    });
  }

  async resetDatabase() {
    await db.transaction("rw", "eventHistory", () => {
      this.eventHistory.clear();
    });

    await db.transaction("rw", "memoData", () => {
      this.memoData.clear();
    });
  }
}

export const db = new LocalStorageDB();
