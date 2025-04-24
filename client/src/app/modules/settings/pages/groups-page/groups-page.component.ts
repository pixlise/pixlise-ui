import { Component } from "@angular/core";
import { GroupsService } from "../../services/groups.service";
import { UserGroupInfo, UserGroupJoinRequestDB, UserGroupRelationship } from "src/app/generated-protos/user-group";
import { UserOptionsService } from "../../services/user-options.service";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { AddUserDialogComponent } from "../../components/add-user-dialog/add-user-dialog.component";
import { FormControl } from "@angular/forms";
import { Observable, map, startWith } from "rxjs";
import { NewGroupDialogComponent } from "../../components/new-group-dialog/new-group-dialog.component";
import { UserDetails, UserInfo } from "src/app/generated-protos/user";
import { RequestGroupDialogComponent } from "../../components/request-group-dialog/request-group-dialog.component";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { UserGroupMembershipDialogComponent } from "../../components/user-group-membership-dialog/user-group-membership-dialog.component";
import { AddSubGroupDialogComponent } from "../../components/add-subgroup-dialog/add-subgroup-dialog.component";

@Component({
  selector: "app-groups-page",
  templateUrl: "./groups-page.component.html",
  styleUrls: ["./groups-page.component.scss"],
})
export class GroupsPageComponent {
  private _selectedGroupId: string | null = null;
  private _selectedGroupUserRoles: Record<string, "viewer" | "editor" | "admin"> = {};
  private _selectedGroupSubGroupRoles: Record<string, "viewer" | "editor"> = {};
  canAccessSelectedGroup: boolean = false;

  private _selectedUser: UserInfo | null = null;

  requestGroupControl = new FormControl<string | UserGroupInfo>("");
  filteredGroups: Observable<UserGroupInfo[]> = new Observable<UserGroupInfo[]>();

  _userSearchString: string = "";

  _selectedUserRole: "viewer" | "editor" | "admin" = "viewer";
  _userDetails: UserDetails | null = null;

  constructor(
    private _snackBar: SnackbarService,
    private _groupsService: GroupsService,
    private _userOptionsService: UserOptionsService,
    private dialog: MatDialog
  ) {
    this.filteredGroups = this.requestGroupControl.valueChanges.pipe(
      startWith(""),
      map(value => {
        const name = typeof value === "string" ? value : value?.name;
        return name ? this._filterGroupNames(name as string) : this.groups.slice();
      })
    );

    this._userOptionsService.userOptionsChanged$.subscribe(() => {
      this._userDetails = this._userOptionsService.userDetails;
    });

    this._groupsService.groupsChanged$.subscribe(() => {
      this.updateSelectedGroupUserRoles();
    });
  }

  updateSelectedGroupUserRoles() {
    if (this._selectedGroupId) {
      const detailedGroup = this._groupsService.detailedGroups.find(group => group.info?.id === this._selectedGroupId);
      if (detailedGroup) {
        this._selectedGroupUserRoles = {};
        this._selectedGroupSubGroupRoles = {};
        detailedGroup.adminUsers.forEach(admin => (this._selectedGroupUserRoles[admin.id] = "admin"));
        detailedGroup.members?.users.forEach(member => {
          if (!this._selectedGroupUserRoles[member.id]) {
            this._selectedGroupUserRoles[member.id] = "editor";
          }
        });
        detailedGroup.viewers?.users.forEach(viewer => {
          if (!this._selectedGroupUserRoles[viewer.id]) {
            this._selectedGroupUserRoles[viewer.id] = "viewer";
          }
        });

        detailedGroup.members?.groups.forEach(member => {
          if (!this._selectedGroupSubGroupRoles[member.id]) {
            this._selectedGroupSubGroupRoles[member.id] = "editor";
          }
        });

        detailedGroup.viewers?.groups.forEach(viewer => {
          if (!this._selectedGroupSubGroupRoles[viewer.id]) {
            this._selectedGroupSubGroupRoles[viewer.id] = "viewer";
          }
        });
      }
    }
  }

  requestGroupDisplayName(group: UserGroupInfo): string {
    return group && group?.name ? group.name : "";
  }

  private _filterGroupNames(name: string): UserGroupInfo[] {
    const filterValue = name.toLowerCase();
    return this.groups.filter(option => option.name.toLowerCase().includes(filterValue));
  }

  get canCreateGroup() {
    return this._userOptionsService.hasFeatureAccess("createGroup");
  }

  get canDeleteGroup() {
    return this._userOptionsService.hasFeatureAccess("deleteGroup");
  }

  get groups() {
    return this._groupsService.groups;
  }

  get groupsWithAdminAccess() {
    return this._groupsService.groups
      .filter(group => group.relationshipToUser === UserGroupRelationship.UGR_ADMIN || this._userOptionsService.hasFeatureAccess("admin"))
      .sort((a: UserGroupInfo, b: UserGroupInfo) => {
        return a.name.localeCompare(b.name);
      });
  }

  get groupsWithMemberAccess() {
    return this._groupsService.groups.filter(group => group.relationshipToUser === UserGroupRelationship.UGR_MEMBER);
  }

  get groupsWithViewerAccess() {
    return this._groupsService.groups.filter(group => group.relationshipToUser === UserGroupRelationship.UGR_VIEWER);
  }

  get userId() {
    return this._userDetails?.info?.id || "";
  }

  get name() {
    return this._userDetails?.info?.name || "";
  }

  get isSelectedGroupAdmin() {
    return this.selectedGroup?.adminUsers.map(admin => admin.id)?.includes(this.userId) || this._userOptionsService.hasFeatureAccess("admin");
  }

  get selectedGroupToJoin(): string | UserGroupInfo | null {
    return this.requestGroupControl.value;
  }

  get userSearchString() {
    return this._userSearchString;
  }

  set userSearchString(value: string) {
    this._userSearchString = value;
  }

  onRequestGroupAccess() {
    this.onRequestAccessToGroup(this.selectedGroupToJoin as UserGroupInfo, false);
    this.requestGroupControl.setValue("");
  }

  onOpenCreateNewGroupDialog() {
    const dialogConfig = new MatDialogConfig();
    const dialogRef = this.dialog.open(NewGroupDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((data: { groupName: string; groupDescription: string }) => {
      if (!data?.groupName) {
        return;
      }
      this.onCreateGroup(data.groupName, data.groupDescription || "");
    });
  }

  onEditGroup(group: UserGroupInfo | null) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { group };
    const dialogRef = this.dialog.open(NewGroupDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((data: { groupName: string; groupDescription: string; joinable: boolean }) => {
      if (!data?.groupName) {
        return;
      }

      if (group) {
        console.log("Editing group", group.id, data.groupName, data.groupDescription);
        this._groupsService.editGroupMetadata(group.id, data.groupName, data.groupDescription, data.joinable);
      } else {
        this.onCreateGroup(data.groupName, data.groupDescription);
      }
    });
  }

  onSelectGroup(group: UserGroupInfo) {
    this._selectedGroupId = group.id;
    this._selectedUser = null;
    this._selectedGroupUserRoles = {};
    this.updateSelectedGroupUserRoles();
    this.canAccessSelectedGroup = group.relationshipToUser > UserGroupRelationship.UGR_UNKNOWN || this._userOptionsService.hasFeatureAccess("admin");

    if (this.isSelectedGroupAdmin) {
      this._groupsService.fetchGroupAccessRequests(group.id);
    }

    // Only fetch the group if we don't already have it and the user has access to it
    if (!this.selectedGroup && this.canAccessSelectedGroup) {
      this._groupsService.fetchDetailedGroup(group.id);
    }
  }

  onChangeGroupMembership(user: UserInfo, role: "viewer" | "editor" | "admin") {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { user, role, group: this.selectedGroup };
    const dialogRef = this.dialog.open(UserGroupMembershipDialogComponent, dialogConfig);
  }

  onOpenGroupRequestDialog() {
    const dialogConfig = new MatDialogConfig();
    const dialogRef = this.dialog.open(RequestGroupDialogComponent, dialogConfig);
  }

  onRequestAccessToGroup(group: UserGroupInfo, asMember: boolean) {
    this._groupsService.requestAccessToGroup(group, asMember);
  }

  onGrantAccessToGroup(request: UserGroupJoinRequestDB) {
    let role = request.asMember ? "editor" : "viewer";
    const dialogConfig = new MatDialogConfig();

    dialogConfig.data = { user: request.details, role, group: this.selectedGroup, requestId: request.id };
    const dialogRef = this.dialog.open(UserGroupMembershipDialogComponent, dialogConfig);
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

  get selectedGroupMemberSubGroups() {
    return this.selectedGroup?.members?.groups || [];
  }

  get selectedGroupMembers() {
    return this.selectedGroup?.members?.users || [];
  }

  get selectedGroupViewerSubGroups() {
    return this.selectedGroup?.viewers?.groups || [];
  }

  get selectedGroupViewers() {
    return this.selectedGroup?.viewers?.users || [];
  }

  get selectedGroupUsers() {
    let users = [...this.selectedGroupMembers, ...this.selectedGroupViewers];
    if (this.userSearchString) {
      users = users.filter(user => user.name.toLowerCase().includes(this.userSearchString.toLowerCase()));
    }

    return users;
  }

  get selectedGroupSubGroups() {
    let subGroups = [...this.selectedGroupMemberSubGroups, ...this.selectedGroupViewerSubGroups];
    if (this.userSearchString) {
      subGroups = subGroups.filter(group => group.name.toLowerCase().includes(this.userSearchString.toLowerCase()));
    }

    return subGroups;
  }

  get groupAccessRequests() {
    return this._groupsService.groupAccessRequests;
  }

  get selectedGroupAccessRequestsCount() {
    if (!this.selectedGroupId) {
      return 0;
    }

    return this._groupsService.groupAccessRequests[this.selectedGroupId]?.length || 0;
  }

  get selectedGroupAccessRequests() {
    if (!this.selectedGroupId) {
      return [];
    }

    let requests = this._groupsService.groupAccessRequests[this.selectedGroupId] || [];
    if (this.userSearchString) {
      requests = requests.filter(request => request.details?.name.toLowerCase().includes(this.userSearchString.toLowerCase()));
    }

    return requests;
  }

  onSelectUser(user: UserInfo) {
    this._selectedUser = user;
    if (this.selectedGroup?.adminUsers.map(admin => admin.id)?.includes(user.id)) {
      this._selectedUserRole = "admin";
    } else if (this.selectedGroup?.members?.users.map(member => member.id)?.includes(user.id)) {
      this._selectedUserRole = "editor";
    } else if (this.selectedGroup?.viewers?.users.map(viewer => viewer.id)?.includes(user.id)) {
      this._selectedUserRole = "viewer";
    }
  }

  get selectedUser() {
    return this._selectedUser;
  }

  get selectedGroupUserRoles() {
    return this._selectedGroupUserRoles;
  }

  get selectedGroupSubGroupRoles() {
    return this._selectedGroupSubGroupRoles;
  }

  get selectedUserRole() {
    return this._selectedUserRole;
  }

  set selectedUserRole(role: "viewer" | "editor" | "admin") {
    if (this.selectedGroup?.info?.id && this.selectedUser?.id) {
      this.onRemoveFromGroup(this.selectedUser.id);
      this._selectedUserRole = role;
      this.addToGroup(this.selectedGroup?.info?.id || "", this.selectedUser?.id || "", this._selectedUserRole);
    }
  }

  onCreateGroup(groupName: string, groupDescription: string) {
    this._groupsService.createGroup(groupName, groupDescription, true);
  }

  onDeleteGroup(group: UserGroupInfo) {
    this._groupsService.deleteGroup(group.id || "");
  }

  onRemoveFromGroup(userId: string) {
    if (!this.selectedGroup?.info?.id) {
      return;
    }

    if (this.selectedGroup.adminUsers.map(admin => admin.id)?.includes(userId)) {
      this._groupsService.removeAdminFromGroup(this.selectedGroup.info.id, userId);
    }

    if (this.selectedGroup.members?.users.map(member => member.id)?.includes(userId)) {
      this._groupsService.removeMemberFromGroup(this.selectedGroup.info.id, userId);
    }

    if (this.selectedGroup.viewers?.users.map(viewer => viewer.id)?.includes(userId)) {
      this._groupsService.removeViewerFromGroup(this.selectedGroup.info.id, userId);
    }
  }

  onRemoveSubGroupFromGroup(groupId: string) {
    if (!this.selectedGroup?.info?.id) {
      return;
    }

    if (this.selectedGroup.members?.groups.map(group => group.id)?.includes(groupId)) {
      this._groupsService.removeSubGroupMemberFromGroup(this.selectedGroup.info.id, groupId);
    }

    if (this.selectedGroup.viewers?.groups.map(group => group.id)?.includes(groupId)) {
      this._groupsService.removeSubGroupViewerFromGroup(this.selectedGroup.info.id, groupId);
    }
  }

  onRemoveMemberFromGroup(userId: string) {
    if (!this.selectedGroup?.info?.id) {
      return;
    }

    this._groupsService.removeMemberFromGroup(this.selectedGroup.info.id, userId);
  }

  addToGroup(groupId: string, userId: string, role: "viewer" | "editor" | "admin") {
    if (role === "editor") {
      this._groupsService.addMemberToGroup(groupId, userId);
    } else if (role === "viewer") {
      this._groupsService.addViewerToGroup(groupId, userId);
    } else if (role === "admin") {
      this._groupsService.addAdminToGroup(groupId, userId);
    } else {
      this._snackBar.openError("Invalid role");
    }
  }

  addSubGroupToGroup(groupId: string, subGroupId: string, role: "viewer" | "editor") {
    if (role === "editor") {
      this._groupsService.addSubGroupMemberToGroup(groupId, subGroupId);
    } else if (role === "viewer") {
      this._groupsService.addSubGroupViewerToGroup(groupId, subGroupId);
    } else {
      this._snackBar.openError("Invalid role");
    }
  }

  onAddUserToGroup(groupId: string) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { groupId };
    const dialogRef = this.dialog.open(AddUserDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((userSelection: { userIds: string[]; role: string }) => {
      if (!userSelection) {
        return;
      }

      userSelection.userIds.forEach(userId => {
        this.onRemoveFromGroup(userId);
        this.addToGroup(groupId, userId, userSelection.role as "viewer" | "editor" | "admin");
      });
    });
  }

  onAddSubGroupToGroup(groupId: string) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { groupId };
    const dialogRef = this.dialog.open(AddSubGroupDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((groupSelection: { groupIds: string[]; role: string }) => {
      if (!groupSelection) {
        return;
      }

      groupSelection.groupIds.forEach(subGroupId => {
        this.onRemoveSubGroupFromGroup(subGroupId);
        this.addSubGroupToGroup(groupId, subGroupId, groupSelection.role as "viewer" | "editor");
      });
    });
  }
}
