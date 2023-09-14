import { Injectable } from "@angular/core";

import { APIDataService } from "../../pixlisecore/pixlisecore.module";

import * as _m0 from "protobufjs/minimal";

export type ActionNotification = {
  buttonTitle: string;
  buttonAction?: () => void;
};

export type Notification = {
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
  notifications: Notification[] = [
    {
      id: "hotkeys-panel",
      title: "Try Hotkeys Panel:",
      type: "action",
      action: {
        buttonTitle: "Open",
      },
    },
  ];

  constructor(private _dataService: APIDataService) {}

  dismissNotification(notification: Notification | string) {
    let id = typeof notification === "string" ? notification : notification.id;
    this.notifications = this.notifications.filter(existingNotification => existingNotification.id !== id);
  }

  dismissAllNotifications() {
    this.notifications = [];
  }
}
