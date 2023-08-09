import Dexie, { Table } from 'dexie';
import { SnackbarDataItem } from '../services/snackbar.service';

export class LocalStorageDB extends Dexie {
    eventHistory!: Table<SnackbarDataItem, number>;

    constructor() {
        super('pixlise');
        this.version(3).stores({
            eventHistory: '++id',
        });
    }

    async resetDatabase() {
        await db.transaction('rw', 'eventHistory', () => {
            this.eventHistory.clear();
        });
    }
}

export const db = new LocalStorageDB();
