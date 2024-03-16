// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Component, EventEmitter, Output } from "@angular/core";
// import { Notification } from "src/app/generated-protos/notification";
import { UINotification, NotificationsService } from "src/app/modules/settings/services/notifications.service";

@Component({
  selector: "app-notifications-menu-panel",
  templateUrl: "./notifications-menu-panel.component.html",
  styleUrls: ["./notifications-menu-panel.component.scss"],
})
export class NotificationsMenuPanelComponent {
  @Output() close = new EventEmitter();
  @Output() openHotKeysMenuPanel = new EventEmitter();

  constructor(private _notificationService: NotificationsService) {}

  activeNotification: UINotification | null = null;

  get notifications(): UINotification[] {
    return this._notificationService.notifications;
  }

  onNotificationMessageClick(notification: UINotification) {
    this.activeNotification = notification;
  }

  onNotificationAction(notification: UINotification) {
    if (notification.type === "action") {
      if (notification.id === "hotkeys-panel") {
        this.onOpenHotkeysMenuPanel();
      } else if (notification.action?.buttonAction) {
        notification.action.buttonAction();
      }
    }
  }

  onOpenHotkeysMenuPanel() {
    this.close.emit();
    this.openHotKeysMenuPanel.emit();
    this.dismissNotification("hotkeys-panel");
  }

  dismissNotification(notification: UINotification | string) {
    this._notificationService.dismissNotification(notification);
  }

  dismissAllNotifications() {
    this._notificationService.dismissAllNotifications();
  }

  getDateStringFromTimeStamp(timeStamp: number | undefined) {
    if (!timeStamp) {
      return "";
    }

    return new Date(timeStamp).toLocaleString();
  }

  // Useful for testing
  //
  // testNotification() {
  //   let randomId = Math.random().toString(36).substring(7);
  //   this._notificationService.addNotification({
  //     id: "test-notification" + randomId,
  //     title: "Test Notification" + randomId,
  //     type: "message",
  //     systemNotification: Notification.create({
  //       id: "test-notification" + randomId,
  //       contents: "Contents",
  //       subject: "Subject Test Notification" + randomId,
  //       timeStampUnixSec: Date.now(),
  //     }),
  //     action: {
  //       buttonTitle: "Open",
  //     },
  //   });
  // }

  onHidePanel() {
    this.close.emit();
  }
}
