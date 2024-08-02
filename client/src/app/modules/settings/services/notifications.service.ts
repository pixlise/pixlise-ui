import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";

import { NotificationDismissReq, NotificationDismissResp, NotificationReq, NotificationResp, NotificationUpd } from "src/app/generated-protos/notification-msgs";

import * as _m0 from "protobufjs/minimal";
import { Notification, NotificationType } from "src/app/generated-protos/notification";
import { LocalStorageService } from "src/app/modules/pixlisecore/services/local-storage.service";

export type ActionNotification = {
  buttonTitle: string;
  buttonAction?: () => void;
};

export type UINotification = {
  id: string;
  title: string;
  timestampUTCSeconds?: number;
  type: "action" | "message";
  action?: ActionNotification;
  systemNotification?: Notification;
};

@Injectable({
  providedIn: "root",
})
export class NotificationsService {
  private _allNotifications: UINotification[] = [];
  private _savedNotifications: UINotification[] = [];
  private _nonPersistantNotifications: UINotification[] = [];

  constructor(
    private _localStorageService: LocalStorageService,
    private _dataService: APIDataService,
    private _snackService: SnackbarService
  ) {
    this._dataService.sendNotificationRequest(NotificationReq.create()).subscribe({
      next: (notificationResp: NotificationResp) => {
        // At this point we have all server-side stored notifications. Now we request locally
        // stored notifications, and we can de-duplicate them when they arrive against what we
        // received from the server.
        // ALSO: If we now subscribe for updates, we can treat them as fresh incoming notifications

        console.log(`Loaded ${notificationResp?.notification?.length || 0} notifications from PIXLISE API...`);
        this._savedNotifications = [];
        this._nonPersistantNotifications = [];
        const respLoadedNotificationIds = new Set<string>();
        if (notificationResp && notificationResp.notification) {
          for (const n of notificationResp.notification) {
            this._nonPersistantNotifications.push(this.makeUINotificationFromServerNotification(n));
            respLoadedNotificationIds.add(n.id);
          }
        }
        // Show them all
        this.updateNotifications();

        this._localStorageService.notifications$.subscribe(locallySavedNotifications => {
          console.log(`Loaded ${locallySavedNotifications.length} notifications from browser local storage...`);

          // Vet incoming ones, they might be duplicates of what we've received from API resp
          this._savedNotifications = [];
          let dupCount = 0;
          for (const n of locallySavedNotifications) {
            if (respLoadedNotificationIds.has(n.id)) {
              // Don't want this in local storage now...
              this._localStorageService.dismissNotification(n.id);
              dupCount++;
            } else {
              this._savedNotifications.push(n);
            }
          }

          console.log(`Removed ${dupCount} duplicate notifications from browser local storage`);

          // Show them all again
          this.updateNotifications();
        });

        this._dataService.notificationUpd$.subscribe({
          next: (upd: NotificationUpd) => {
            if (!upd.notification || upd.notification.notificationType === NotificationType.NT_SYS_DATA_CHANGED) {
              return;
            }

            // TODO: should we do something useful with upd.notification.actionLink

            // Add the notification but don't persist server ones, they come back in the Resp anyway!
            this.addNotification(this.makeUINotificationFromServerNotification(upd.notification), false);

            console.log(`Received notification from PIXLISE API: ${upd.notification.id}-${upd.notification.subject}`);

            // FOR NOW we also show a snack because the notification stuff is unfinished
            this._snackService.open(upd.notification.subject, upd.notification.contents);
          },
        });
      },
    });
  }

  private makeUINotificationFromServerNotification(n: Notification): UINotification {
    return {
      id: n.id || "",
      title: n.subject || "",
      type: "message",
      systemNotification: n,
      timestampUTCSeconds: n.timeStampUnixSec,
      action: {
        buttonTitle: "Open",
      },
    };
  }

  get notifications(): UINotification[] {
    return this._allNotifications;
  }

  private updateNotifications() {
    this._allNotifications = [];
    this._allNotifications.push(...this._savedNotifications);
    this._allNotifications.push(...this._nonPersistantNotifications);

    // Lets sort them somehow
    this._allNotifications.sort((a: UINotification, b: UINotification) => {
      return (a?.timestampUTCSeconds || 0) - (b?.timestampUTCSeconds || 0);
    });

    console.log(`Currently displaying ${this._allNotifications.length} notifications...`);
  }

  addNotification(notification: UINotification, persist: boolean = true) {
    if (persist) {
      this._localStorageService.addNotification(notification);
    } else {
      this._nonPersistantNotifications.push(notification);
      this.updateNotifications();
    }
  }

  dismissNotification(notification: UINotification | string) {
    const id = typeof notification === "string" ? notification : notification.id;

    const foundNotification = this._allNotifications.find((n: UINotification) => n.id == id);
    if (foundNotification && foundNotification.systemNotification) {
      // Server one, dismiss it there
      this._dataService.sendNotificationDismissRequest(NotificationDismissReq.create({ id })).subscribe({
        next: resp => {
          // If it's deleted fine, delete from local list
          const idx = this._nonPersistantNotifications.findIndex((n: UINotification) => n.id == id);
          if (idx > -1) {
            this._nonPersistantNotifications.splice(idx, 1);
          }
        },
        error: err => {
          this._snackService.openError("Failed to dismiss notification", err);
        },
      });
    }

    // Also always delete from local just in case
    this._localStorageService.dismissNotification(id);
  }

  dismissAllNotifications() {
    for (const n of this._allNotifications) {
      if (n.systemNotification) {
        this._dataService.sendNotificationDismissRequest(NotificationDismissReq.create({ id: n.id })).subscribe({
          next: resp => {
            // If it's deleted fine, delete from local list
            const idx = this._nonPersistantNotifications.findIndex((npNotif: UINotification) => npNotif.id == n.id);
            if (idx > -1) {
              this._nonPersistantNotifications.splice(idx, 1);
            }
          },
          error: err => {
            this._snackService.openError("Failed to dismiss notification", err);
          },
        });
      }
    }
    this._localStorageService.clearNotifications();
  }
}
