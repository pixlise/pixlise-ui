import { Component } from "@angular/core";
import { GroupsService } from "../../services/groups.service";
import { UserGroup, UserGroupInfo, UserGroupJoinRequestDB, UserGroupRelationship } from "src/app/generated-protos/user-group";
import { UserOptionsService } from "../../services/user-options.service";
import { UsersService } from "../../services/users.service";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { AddUserDialogComponent } from "../../components/add-user-dialog/add-user-dialog.component";

@Component({
  selector: "app-groups-page",
  templateUrl: "./groups-page.component.html",
  styleUrls: ["./groups-page.component.scss"],
})
export class GroupsPageComponent {
  private _selectedGroupId: string | null = null;
  canAccessSelectedGroup: boolean = false;

  newGroupName: string = "";

  constructor(
    private _groupsService: GroupsService,
    private _userOptionsService: UserOptionsService,
    private dialog: MatDialog,
  ) { }

  get canCreateGroup() {
    return this._userOptionsService.hasFeatureAccess("createGroup");
  }

  get canDeleteGroup() {
    return this._userOptionsService.hasFeatureAccess("deleteGroup");
  }

  get groups() {
    return this._groupsService.groups;
  }

  get userId() {
    return this._userOptionsService?.userDetails?.info?.id || "";
  }

  get isSelectedGroupAdmin() {
    return this.selectedGroup?.adminUsers.map(admin => admin.id)?.includes(this.userId) || this._userOptionsService.hasFeatureAccess("admin");
  }

  onSelectGroup(group: UserGroupInfo) {
    this._selectedGroupId = group.id;
    this.canAccessSelectedGroup = group.relationshipToUser > UserGroupRelationship.UGR_UNKNOWN || this._userOptionsService.hasFeatureAccess("admin");

    if (this.isSelectedGroupAdmin) {
      this._groupsService.fetchGroupAccessRequests(group.id);
    }

    // Only fetch the group if we don't already have it and the user has access to it
    if (!this.selectedGroup && this.canAccessSelectedGroup) {
      this._groupsService.fetchDetailedGroup(group.id);
    } else {

    }
  }

  onRequestAccessToGroup(group: UserGroupInfo, asMember: boolean) {
    this._groupsService.requestAccessToGroup(group, asMember);
  }

  onGrantAccessToGroup(request: UserGroupJoinRequestDB) {
    if (request.asMember) {
      this._groupsService.addMemberToGroup(request.joinGroupId, request.userId, request.id);
    } else {
      this._groupsService.addViewerToGroup(request.joinGroupId, request.userId, request.id);
    }
  }

  onDismissAccessRequest(request: UserGroupJoinRequestDB) {
    this._groupsService.dismissAccessRequest(request.joinGroupId, request.id);
  }

  get selectedGroupId() {
    return this._selectedGroupId;
  }

  get selectedGroupInfo() {
    return this.groups.find(group => group.id === this._selectedGroupId) || null;
  }

  get selectedGroup() {
    if (!this._selectedGroupId) {
      return null;
    }

    const selectedGroup = this._groupsService.detailedGroups.find(group => group.info?.id === this._selectedGroupId);
    if (!selectedGroup) {
      return null;
    } else {
      return selectedGroup;
    }
  }

  get selectedGroupSubGroups() {
    return this.selectedGroup?.members?.groups || [];
  }

  get selectedGroupMembers() {
    return this.selectedGroup?.members?.users || [];
  }

  get selectedGroupAccessRequests() {
    if (!this.selectedGroupId) {
      return [];
    }

    return this._groupsService.groupAccessRequests[this.selectedGroupId] || [];
  }

  onCreateGroup() {
    this._groupsService.createGroup(this.newGroupName);
    this.newGroupName = "";
  }

  onDeleteGroup(group: UserGroupInfo) {
    this._groupsService.deleteGroup(group.id || "");
  }

  onClearNewGroupName() {
    this.newGroupName = "";
  }

  onRemoveMemberFromGroup(userId: string) {
    if (!this.selectedGroup?.info?.id) {
      return;
    }

    this._groupsService.removeMemberFromGroup(this.selectedGroup.info.id, userId);
  }

  onAddUserToGroup(groupId: string) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { groupId };
    const dialogRef = this.dialog.open(AddUserDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(
      (userSelection: { userId: string; role: string; }) => {
        if (!userSelection) {
          return;
        }

        if (userSelection.role === "editor") {
          this._groupsService.addMemberToGroup(groupId, userSelection.userId);
        } else if (userSelection.role === "viewer") {
          this._groupsService.addViewerToGroup(groupId, userSelection.userId);
        } else if (userSelection.role === "admin") {
          this._groupsService.addAdminToGroup(groupId, userSelection.userId);
        }
      }
    );
  }

}
