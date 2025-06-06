import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { DataQueryResult } from "src/app/expression-language/data-values";
import { NotificationType } from "src/app/generated-protos/notification";
import { NotificationUpd } from "src/app/generated-protos/notification-msgs";
import { APIDataService } from "./apidata.service";

export class ObjectChange {
  constructor(
    public mapName: string,
    public roiId: string
  ) {}

  toString(): string {
    return `roi: ${this.roiId}, mapName: ${this.mapName}`;
  }
}

@Injectable({
  providedIn: "root",
})
export class ObjectChangeMonitorService {
  objectChanged$: Subject<ObjectChange> = new Subject<ObjectChange>();

  /* NOTE: this seemed to make sense, to make it subscribe for notifications on its own, but because memoised items need to be
         deleted before we get to notifying listeners for changes, we are now notified by the memo service 
  constructor(private _dataService: APIDataService) {}
    this._dataService.notificationUpd$.subscribe((upd: NotificationUpd) => {*/

  handleNotification(upd: NotificationUpd) {
    if (!upd.notification || upd.notification.notificationType != NotificationType.NT_SYS_DATA_CHANGED) {
      return; // Not interested in this!
    }

    // Notify if we can
    const change = new ObjectChange("", "");

    if (upd.notification.mapId) {
      const mapName = DataQueryResult.getClientMapNameFromMemoId(upd.notification.mapId);
      if (mapName.length > 0) {
        change.mapName = mapName;
      }
    }

    if (upd.notification.roiId) {
      change.roiId = upd.notification.roiId;
    }

    if (change.mapName || change.roiId) {
      this.objectChanged$.next(change);
    }
  }
}
