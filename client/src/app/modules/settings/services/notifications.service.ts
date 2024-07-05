import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";

import { NotificationUpd } from "src/app/generated-protos/notification-msgs";

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
    this._dataService.notificationUpd$.subscribe({
      next: (upd: NotificationUpd) => {
        if (!upd.notification) {
          return;
        }

        if (upd.notification.notificationType !== NotificationType.NT_SYS_DATA_CHANGED) {
          // TODO: should we do something useful with upd.notification.actionLink

          this.addNotification({
            id: upd.notification.id || "",
            title: upd.notification.subject || "",
            type: "message",
            systemNotification: upd.notification,
            action: {
              buttonTitle: "Open",
            },
          });

          // FOR NOW we also show a snack because the notification stuff is unfinished
          this._snackService.open(upd.notification.subject, upd.notification.contents);
        }
      },
    });

    this._localStorageService.notifications$.subscribe(notifications => {
      this._savedNotifications = notifications;
      this.updateNotifications();
    });
  }

  get notifications(): UINotification[] {
    return this._allNotifications;
  }

  private updateNotifications() {
    this._allNotifications = [];
    this._allNotifications.push(...this._savedNotifications);
    this._allNotifications.push(...this._nonPersistantNotifications);
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
    // this.notifications = this.notifications.filter(existingNotification => existingNotification.id !== id);
    this._localStorageService.dismissNotification(id);
  }

  dismissAllNotifications() {
    // this.notifications = [];
    this._localStorageService.clearNotifications();
  }
}
