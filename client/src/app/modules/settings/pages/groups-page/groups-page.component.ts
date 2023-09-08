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

@Component({
  selector: "app-groups-page",
  templateUrl: "./groups-page.component.html",
  styleUrls: ["./groups-page.component.scss"],
})
export class GroupsPageComponent {
  private _selectedGroupId: string | null = null;
  private _selectedGroupUserRoles: Record<string, "viewer" | "editor" | "admin"> = {};
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
      let detailedGroup = this._groupsService.detailedGroups.find(group => group.info?.id === this._selectedGroupId);
      if (detailedGroup) {
        this._selectedGroupUserRoles = {};
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
    return this._groupsService.groups.filter(
      group => group.relationshipToUser === UserGroupRelationship.UGR_ADMIN || this._userOptionsService.hasFeatureAccess("admin")
    );
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

  onSelectGroup(group: UserGroupInfo) {
    this._selectedGroupId = group.id;
    this._selectedUser = null;
    this._selectedGroupUserRoles = {};
    this.updateSelectedGroupUserRoles();
    this.canAccessSelectedGroup =
      group.relationshipToUser > UserGroupRelationship.UGR_UNKNOWN || this._userOptionsService.hasFeatureAccess("admin");

    if (this.isSelectedGroupAdmin) {
      this._groupsService.fetchGroupAccessRequests(group.id);
    }

    // Only fetch the group if we don't already have it and the user has access to it
    if (!this.selectedGroup && this.canAccessSelectedGroup) {
      this._groupsService.fetchDetailedGroup(group.id);
    }
  }

  onOpenGroupRequestDialog() {
    const dialogConfig = new MatDialogConfig();
    const dialogRef = this.dialog.open(RequestGroupDialogComponent, dialogConfig);
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
    this._groupsService.createGroup(groupName, groupDescription);
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

  onAddUserToGroup(groupId: string) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { groupId };
    const dialogRef = this.dialog.open(AddUserDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((userSelection: { userId: string; role: string }) => {
      if (!userSelection) {
        return;
      }

      this.addToGroup(groupId, userSelection.userId, userSelection.role as "viewer" | "editor" | "admin");
    });
  }
}
