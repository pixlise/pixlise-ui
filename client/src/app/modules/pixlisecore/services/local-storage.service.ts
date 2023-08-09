import { Injectable } from '@angular/core';
import { db } from '../models/local-storage-db';
import { liveQuery } from 'dexie';
import { SnackbarDataItem } from './snackbar.service';


@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {
    eventHistory$ = liveQuery(() => db.eventHistory.toArray().then((items) => items.reverse()));
    static EVENT_HISTORY_LIMIT = 100;

    constructor() { }

    async addEventHistoryItem(item: SnackbarDataItem) {
        db.eventHistory.count((count) => {
            if (count >= LocalStorageService.EVENT_HISTORY_LIMIT - 1) {
                db.eventHistory.limit(count - LocalStorageService.EVENT_HISTORY_LIMIT + 1).delete();
            }
        });
        await db.eventHistory.add(item);
    }

    async clearEventHistory() {
        await db.eventHistory.clear();
    }
};