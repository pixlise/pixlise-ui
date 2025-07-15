import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { ReplaySubject } from "rxjs";

import * as _m0 from "protobufjs/minimal";

import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";

import {
  UserNotificationSettingsReq,
  UserNotificationSettingsResp,
  UserNotificationSettingsWriteReq,
  UserNotificationSettingsWriteResp,
} from "src/app/generated-protos/user-notification-setting-msgs";
import { UserDetailsReq, UserDetailsResp, UserDetailsWriteReq, UserDetailsWriteResp } from "src/app/generated-protos/user-msgs";
import { UserDetails, UserInfo } from "src/app/generated-protos/user";

import { FeatureRequest, PermissionsModel } from "src/app/modules/settings/models/permissions.model";
import {
  NotificationConfig,
  NotificationMethod,
  NotificationSetting,
  NotificationSubscriptions,
  NotificationTopic,
} from "src/app/modules/settings/models/notification.model";

import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { makeHeaders } from "src/app/utils/api-helpers";
import { CustomAuthService as AuthService } from "src/app/services/custom-auth-service.service";


@Injectable({
  providedIn: "root",
})
export class UserOptionsService {
  private _currentDataCollectionVersion: string = "";
  private _notificationSubscriptions: NotificationSubscriptions = new NotificationSubscriptions([]);
  private _userDetails: UserDetails = {
    info: {
      id: "",
      name: "",
      email: "",
      iconURL: "",
      reviewerWorkspaceId: "",
      expirationDateUnixSec: 0,
      nonSecretPassword: "",
    },
    dataCollectionVersion: "",
    permissions: [],
  };
  private _userOptionsChanged$ = new ReplaySubject<void>(1);

  public isSidebarOpen: boolean = false;

  constructor(
    private _dataService: APIDataService,
    private _snackBar: SnackbarService,
    private _authService: AuthService,
    private http: HttpClient
  ) {
    this.fetchCurrentDataCollectionVersion();
    this.fetchNotifications();
    this.fetchUserDetails();
  }

  get userOptionsChanged$(): ReplaySubject<void> {
    return this._userOptionsChanged$;
  }

  get notificationSubscriptions(): NotificationSubscriptions {
    return this._notificationSubscriptions;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  hasFeatureAccess(featureRequest: FeatureRequest): boolean {
    return PermissionsModel.hasPermission(this._userDetails.permissions, featureRequest);
  }

  get userDetails(): UserDetails {
    return this._userDetails;
  }

  get currentDataCollectionAgreementAccepted(): boolean {
    return this._userDetails.dataCollectionVersion === this._currentDataCollectionVersion;
  }

  get outdatedDataCollectionAgreementAccepted(): boolean {
    return this._userDetails.dataCollectionVersion !== this._currentDataCollectionVersion && !this._userDetails.dataCollectionVersion.endsWith("-false");
  }

  get currentDataCollectionVersion(): string {
    return this._currentDataCollectionVersion;
  }

  fetchCurrentDataCollectionVersion(): void {
    this.http
      .get<{ version: string }>(EnvConfigurationInitService.appConfig.dataCollectionAgreementVersionUrl, makeHeaders())
      .subscribe((version: { version: string }) => {
        this._currentDataCollectionVersion = version.version;
      });
  }

  fetchUserDetails(): void {
    this._dataService.sendUserDetailsRequest(UserDetailsReq.create({})).subscribe({
      next: (resp: UserDetailsResp) => {
        this._userDetails = resp.details || this._userDetails;

        // If we don't have an icon for the user in mongo, get one from auth0
        if (!this._userDetails.info?.iconURL) {
          this._authService.user$.subscribe(user => {
            if (this._userDetails.info) {
              this._userDetails.info.iconURL = user?.picture || "";
            }
          });
        }
        this._userOptionsChanged$.next();
      },
      error: err => {
        console.error("Error sendUserDetailsRequest Notifications", err);
        this._snackBar.openError("Error fetching user details");
      },
    });
  }

  updateUserInfo(userInfo: UserInfo): void {
    this.updateUserDetails(userInfo.name, userInfo.email, userInfo.iconURL, this._userDetails.dataCollectionVersion);
  }

  acceptDataCollectionAgreement(accept: boolean): void {
    if (!this._currentDataCollectionVersion) {
      this._snackBar.openError("Invalid data collection version! Please try again.");
      this.fetchCurrentDataCollectionVersion();
    }

    const dataCollectionVersion = accept ? this._currentDataCollectionVersion : `${this._currentDataCollectionVersion}-false`;
    this.updateDataCollectionVersion(dataCollectionVersion);
  }

  private updateDataCollectionVersion(dataCollectionVersion: string): void {
    this.updateUserDetails(this._userDetails.info?.name || "", this._userDetails.info?.email || "", this._userDetails.info?.iconURL || "", dataCollectionVersion);
  }

  updateUserDetails(name: string, email: string, iconURL: string, dataCollectionVersion: string): void {
    const userDetailsWriteReq = UserDetailsWriteReq.create({});
    userDetailsWriteReq.name = name;
    userDetailsWriteReq.email = email;
    userDetailsWriteReq.iconURL = iconURL;
    userDetailsWriteReq.dataCollectionVersion = dataCollectionVersion;

    this._dataService.sendUserDetailsWriteRequest(userDetailsWriteReq).subscribe({
      next: (resp: UserDetailsWriteResp) => {
        if (this._userDetails.info) {
          this._userDetails.info.name = name;
          this._userDetails.info.email = email;
          this._userDetails.info.iconURL = iconURL;
        }
        this._userDetails.dataCollectionVersion = dataCollectionVersion;

        this._snackBar.openSuccess("User details updated");

        this.fetchUserDetails();
        this._userOptionsChanged$.next();
      },
      error: err => {
        this._snackBar.openError("Error updating user details");
        console.error("Error sendUserDetailsWriteRequest Notifications", err);
      },
    });
  }

  fetchNotifications(): void {
    this._dataService.sendUserNotificationSettingsRequest(UserNotificationSettingsReq.create({})).subscribe({
      next: (resp: UserNotificationSettingsResp) => {
        const topics: NotificationTopic[] = [];

        Object.entries(resp.notifications?.topicSettings || {}).forEach(([topicName, notificationEnum]) => {
          // NOTIF_NONE = 0;
          // NOTIF_EMAIL = 1;
          // NOTIF_UI = 2;
          // NOTIF_BOTH = 3;
          const uiVisible = Number(notificationEnum) === 2 || Number(notificationEnum) === 3;
          const emailVisible = Number(notificationEnum) === 1 || Number(notificationEnum) === 3;

          topics.push(new NotificationTopic(topicName, new NotificationConfig(new NotificationMethod(uiVisible, emailVisible))));
        });
        this._notificationSubscriptions = new NotificationSubscriptions(topics);
        this._userOptionsChanged$.next();
      },
      error: err => {
        this._snackBar.openError("Error fetching notifications");
        console.error("Error fetching notifications", err);
      },
    });
  }

  updateNotifications(notificationSettings: NotificationSetting[]): void {
    const notificationSettingsUpdateRequest: UserNotificationSettingsWriteReq = {
      notifications: {
        topicSettings: {},
      },
    };

    notificationSettings.forEach((notificationSetting: NotificationSetting) => {
      const uiEnum = notificationSetting.method.ui ? 2 : 0;
      const emailEnum = notificationSetting.method.email ? 1 : 0;

      const enumValue = uiEnum + emailEnum;
      if (notificationSettingsUpdateRequest.notifications) {
        notificationSettingsUpdateRequest.notifications.topicSettings[notificationSetting.id] = enumValue;
      }
    });

    this._dataService.sendUserNotificationSettingsWriteRequest(notificationSettingsUpdateRequest).subscribe({
      next: (resp: UserNotificationSettingsWriteResp) => {
        this._snackBar.openSuccess("User notification settings updated");
      },
      error: err => {
        this._snackBar.openError(`Error writing user notification settings`);
        console.error("ERROR Writing User Notification Settings", err);
      },
    });
  }
}
