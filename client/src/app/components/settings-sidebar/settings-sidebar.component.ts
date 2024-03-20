import { Component } from "@angular/core";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { UserInfo } from "src/app/generated-protos/user";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { DataCollectionDialogComponent } from "src/app/modules/settings/components/data-collection-dialog/data-collection-dialog.component";
import { NotificationSetting, NotificationSubscriptions, NotificationTopic } from "src/app/modules/settings/models/notification.model";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ImageUploaderDialogComponent } from "src/app/modules/settings/components/image-uploader-dialog/image-uploader-dialog.component";
import { GroupsService } from "src/app/modules/settings/services/groups.service";
import { UserGroupInfo, UserGroupRelationship } from "src/app/generated-protos/user-group";
import { SettingsModule } from "src/app/modules/settings/settings.module";
import { SnackbarDataItem } from "src/app/modules/pixlisecore/services/snackbar.service";
import { RequestGroupDialogComponent } from "src/app/modules/settings/components/request-group-dialog/request-group-dialog.component";
import { Subscription } from "rxjs";

@Component({
  selector: "app-settings-sidebar",
  templateUrl: "./settings-sidebar.component.html",
  styleUrls: ["./settings-sidebar.component.scss"],
  standalone: true,
  imports: [CommonModule, PIXLISECoreModule, SettingsModule],
})
export class SettingsSidebarComponent {
  private _subs: Subscription = new Subscription();

  notifications: NotificationSetting[] = [];
  user!: UserInfo;
  groupsWithAccess: UserGroupInfo[] = [];

  public eventIcons = {
    warning: "warning",
    error: "error",
    success: "check_circle",
  };

  constructor(
    private _userOptionsService: UserOptionsService,
    private _groupsService: GroupsService,
    private _snackBar: SnackbarService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Create blank notification settings for all notifications
    this.notifications = NotificationSubscriptions.allNotifications.map(notification => new NotificationSetting(notification));

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

    this._subs.add(
      this._groupsService.groupsChanged$.subscribe(() => {
        this.groupsWithAccess = this._groupsService.groups.filter(group => group.relationshipToUser > UserGroupRelationship.UGR_UNKNOWN);
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  getGroupRelationship(group: UserGroupInfo): string {
    switch (group.relationshipToUser) {
      case UserGroupRelationship.UGR_ADMIN:
        return "Admin";
      case UserGroupRelationship.UGR_MEMBER:
        return "Member";
      case UserGroupRelationship.UGR_VIEWER:
        return "Viewer";
      default:
        return "Unknown";
    }
  }

  getGroupIcon(group: UserGroupInfo): string {
    switch (group.relationshipToUser) {
      case UserGroupRelationship.UGR_ADMIN:
        return "assets/icons/admin-badge.svg";
      case UserGroupRelationship.UGR_MEMBER:
        return "assets/icons/member-badge.svg";
      case UserGroupRelationship.UGR_VIEWER:
        return "assets/icons/viewer-badge.svg";
      default:
        return "";
    }
  }

  onClearEventHistory(): void {
    this._snackBar.clearHistory();
  }

  getEventIcon(type: string): string {
    return this.eventIcons[type as keyof typeof this.eventIcons];
  }

  get eventHistory(): SnackbarDataItem[] {
    return this._snackBar.history;
  }

  get isOpen(): boolean {
    return this._userOptionsService.isSidebarOpen;
  }

  get hintAssistanceActive(): boolean {
    return true; //this._userOptionsService.hints.enabled;
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

  get iconURL(): string {
    if (!this.user?.iconURL) {
      return "";
    } else {
      return this.user.iconURL;
    }
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

    dialogRef.afterClosed().subscribe((accepted: boolean) => {
      if (accepted !== this.dataCollectionActive) {
        this._userOptionsService.acceptDataCollectionAgreement(accepted);
      }
    });
  }

  onOpenRequestGroupDialog(): void {
    const dialogConfig = new MatDialogConfig();
    this.dialog.open(RequestGroupDialogComponent, dialogConfig);
  }

  onCloseSidebar(): void {
    this._userOptionsService.toggleSidebar();
  }

  onEditIcon(): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    this.dialog.open(ImageUploaderDialogComponent, dialogConfig);
  }

  onLeaveGroup(group: UserGroupInfo): void {
    this._groupsService.removeFromGroup(group.id, this._userOptionsService.userDetails.info!.id);
  }
}
