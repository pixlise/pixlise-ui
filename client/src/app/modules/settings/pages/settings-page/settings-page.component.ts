import { Component } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { UserOptionsService } from '../../services/user-options.service';
import { UserInfo } from 'src/app/generated-protos/user';
import { EnvConfigurationService } from 'src/app/services/env-configuration.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { DataCollectionDialogComponent } from '../../components/data-collection-dialog/data-collection-dialog.component';

export class NotificationMethod {
  constructor(public ui: boolean, public email: boolean) {
  }
}

export class NotificationConfig {
  constructor(public method: NotificationMethod) {
  }
}

export class UserConfig {
  constructor(
    public name: string,
    public email: string,
    public data_collection: string
  ) {
  }
}

export class NotificationTopic {
  constructor(public name: string, public config: NotificationConfig) {
  }
}

export class NotificationSubscriptions {
  public static readonly notificationTypeUIOnly = "ui-only";
  public static readonly notificationTypeSMS = "sms";
  public static readonly notificationTypeEmail = "email";

  public static readonly notificationUserQuantComplete = "user-quant-complete";
  public static readonly notificationQuantShared = "quant-shared";
  public static readonly notificationNewDatasetAvailable = "new-dataset-available";
  public static readonly notificationDatasetSpectraUpdated = "dataset-spectra-updated";
  public static readonly notificationDatasetImageUpdated = "dataset-image-updated";
  public static readonly notificationDatasetHousekeepingUpdated = "dataset-housekeeping-updated";
  public static readonly notificationElementSetShared = "element-set-shared";
  public static readonly notificationMajorModuleRelease = "major-module-release";
  public static readonly notificationMinorModuleRelease = "minor-module-release";

  constructor(public topics: NotificationTopic[]) {
  }
}

export class NotificationSetting {
  constructor(public label: string, public id: string, public method: NotificationMethod) {
  }
}

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent {
  notifications: NotificationSetting[] = [];
  user!: UserInfo;

  constructor(
    private _authService: AuthService,
    private _userOptionsService: UserOptionsService,
    private dialog: MatDialog,
  ) {
    this.user = this._userOptionsService.userDetails.info!;

    let { id, name, email, iconURL } = this._userOptionsService.userDetails.info!;
    this.user = { id, name, email, iconURL };

    this.notifications = [
      new NotificationSetting("Your Quantification Complete", NotificationSubscriptions.notificationUserQuantComplete, new NotificationMethod(false, false)),
      new NotificationSetting("Quantification Shared", NotificationSubscriptions.notificationQuantShared, new NotificationMethod(false, false)),
      new NotificationSetting("New Dataset Available", NotificationSubscriptions.notificationNewDatasetAvailable, new NotificationMethod(false, false)),
      new NotificationSetting("Dataset Spectra Updated", NotificationSubscriptions.notificationDatasetSpectraUpdated, new NotificationMethod(false, false)),
      new NotificationSetting("Dataset Image Updated", NotificationSubscriptions.notificationDatasetImageUpdated, new NotificationMethod(false, false)),
      new NotificationSetting("Dataset Housekeeping Updated", NotificationSubscriptions.notificationDatasetHousekeepingUpdated, new NotificationMethod(false, false)),
      new NotificationSetting("Element Set Shared", NotificationSubscriptions.notificationElementSetShared, new NotificationMethod(false, false)),
      new NotificationSetting("Major Module Release", NotificationSubscriptions.notificationMajorModuleRelease, new NotificationMethod(false, false)),
      new NotificationSetting("Minor Module Release", NotificationSubscriptions.notificationMinorModuleRelease, new NotificationMethod(false, false)),
    ];

    this._userOptionsService.userOptionsChanged$.subscribe(() => {
      let { id, name, email, iconURL } = this._userOptionsService.userDetails.info!;
      this.user = { id, name, email, iconURL };

      this._userOptionsService.notificationSubscriptions.topics.forEach((topic) => {
        let existing = this.notifications.find(existingNotification => existingNotification.id === topic.name);

        if (existing) {
          existing.method = topic.config.method;
        }
      });

      this._authService.user$.subscribe((user) => {
        if (!this.user.iconURL) {
          this.user.iconURL = user?.picture || "";
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
