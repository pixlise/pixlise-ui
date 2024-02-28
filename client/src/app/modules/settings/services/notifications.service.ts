import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";

import { NotificationUpd } from "src/app/generated-protos/notification-msgs";

import * as _m0 from "protobufjs/minimal";
import { Notification, NotificationType } from "src/app/generated-protos/notification";

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
};

@Injectable({
  providedIn: "root",
})
export class NotificationsService {
  notifications: UINotification[] = [
    {
      id: "hotkeys-panel",
      title: "Try Hotkeys Panel:",
      type: "action",
      action: {
        buttonTitle: "Open",
      },
    },
  ];

  constructor(
    private _dataService: APIDataService,
    private _snackService: SnackbarService
  ) {
    this._dataService.notificationUpd$.subscribe({
      next: (upd: NotificationUpd) => {
        if (!upd.notification) {
          return;
        }

        if (upd.notification.notificationType != NotificationType.NT_SYS_DATA_CHANGED) {
          this.notifications.push({
            id: "hotkeys-panel",
            title: upd.notification.subject || "???",
            type: "action",
            action: {
              buttonTitle: "Open",
            },
          });

          // FOR NOW we also show a snack because the notification stuff is unfinished
          this._snackService.open(upd.notification.subject, upd.notification.contents);
        }
      },
    });
  }

  dismissNotification(notification: UINotification | string) {
    const id = typeof notification === "string" ? notification : notification.id;
    this.notifications = this.notifications.filter(existingNotification => existingNotification.id !== id);
  }

  dismissAllNotifications() {
    this.notifications = [];
  }
}
