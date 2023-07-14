import { Component } from '@angular/core';
import { UserOptionsService } from '../../services/user-options.service';
import { UserInfo } from 'src/app/generated-protos/user';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DataCollectionDialogComponent } from '../../components/data-collection-dialog/data-collection-dialog.component';
import { NotificationSetting, NotificationSubscriptions, NotificationTopic } from '../../models/notification.model';


@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent {
  notifications: NotificationSetting[] = [];
  user!: UserInfo;

  constructor(
    private _userOptionsService: UserOptionsService,
    private dialog: MatDialog,
  ) {

    // Create blank notification settings for all notifications
    this.notifications = NotificationSubscriptions.allNotifications.map((notification) => new NotificationSetting(notification));

    // Do a deep copy of user info
    let { id, name, email, iconURL } = this._userOptionsService.userDetails.info!;
    this.user = { id, name, email, iconURL };

    this._userOptionsService.userOptionsChanged$.subscribe(() => {
      let { id, name, email, iconURL } = this._userOptionsService.userDetails.info!;
      this.user = { id, name, email, iconURL };

      this._userOptionsService.notificationSubscriptions.topics.forEach((topic: NotificationTopic) => {
        let existing = this.notifications.find(existingNotification => existingNotification.id === topic.name);

        if (existing) {
          existing.method = topic.config.method;
        }
      });
    });
  }

  get hintAssistanceActive(): boolean {
    return this._userOptionsService.hints.enabled;
  }

  get dataCollectionActive(): boolean {
    return this._userOptionsService.currentDataCollectionAgreementAccepted;
  }

  get userName(): string {
    if (!this.user) {
      return "Loading...";
    }

    return this.user.name;
  }

  get userNameChanged(): boolean {
    if (this._userOptionsService?.userDetails?.info && this.user) {
      return this.user.name !== this._userOptionsService.userDetails.info.name;
    }

    return false;
  }

  set userName(name: string) {
    if (!this.user) {
      return;
    }

    this.user.name = name;
  }

  onResetUserName(): void {
    if (!this._userOptionsService.userDetails.info || !this.userNameChanged) {
      return;
    }

    this.userName = this._userOptionsService.userDetails.info.name;
  }

  onConfirmUserName(): void {
    if (!this.user || !this.userNameChanged) {
      return;
    }

    this._userOptionsService.updateUserInfo(this.user);
  }

  get userEmail(): string {
    if (!this.user) {
      return "Loading...";
    }
    return this.user.email;
  }

  get userEmailChanged(): boolean {
    if (this._userOptionsService?.userDetails?.info && this.user) {
      return this.user.email !== this._userOptionsService.userDetails.info.email;
    }

    return false;
  }

  set userEmail(email: string) {
    if (!this.user) {
      return;
    }

    this.user.email = email;
  }

  onResetUserEmail(): void {
    if (!this._userOptionsService.userDetails.info || !this.userEmailChanged) {
      return;
    }

    this.userEmail = this._userOptionsService.userDetails.info.email;
  }

  onConfirmUserEmail(): void {
    if (!this.user || !this.userEmailChanged) {
      return;
    }

    this._userOptionsService.updateUserInfo(this.user);
  }

  onToggleNotification(notification: NotificationSetting, methodName: "ui" | "email"): void {
    let existing = this.notifications.find(existingNotification => existingNotification.id === notification.id);
    if (existing) {
      existing.method[methodName] = !existing.method[methodName];
    }

    this._userOptionsService.updateNotifications(this.notifications);
  }

  onToggleDataCollection(): void {
    this._userOptionsService.acceptDataCollectionAgreement(!this.dataCollectionActive);
  }

  openDataCollectionDialog(event: Event): void {
    event.stopPropagation();

    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    const dialogRef = this.dialog.open(DataCollectionDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(
      (accepted: boolean) => {
        if (accepted !== this.dataCollectionActive) {
          this._userOptionsService.acceptDataCollectionAgreement(accepted);
        }
      }
    );
  }

  onToggleHintAssistance(): void {
    this._userOptionsService.toggleUserHints();
  }
}
