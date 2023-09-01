import { Component } from "@angular/core";
import { GroupsService } from "../../services/groups.service";
import { UserGroup, UserGroupInfo, UserGroupJoinRequestDB, UserGroupRelationship } from "src/app/generated-protos/user-group";
import { UserOptionsService } from "../../services/user-options.service";
import { UsersService } from "../../services/users.service";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { AddUserDialogComponent } from "../../components/add-user-dialog/add-user-dialog.component";
import { FormControl } from "@angular/forms";
import { Observable, map, startWith } from "rxjs";
import { NewGroupDialogComponent } from "../../components/new-group-dialog/new-group-dialog.component";

@Component({
  selector: "app-groups-page",
  templateUrl: "./groups-page.component.html",
  styleUrls: ["./groups-page.component.scss"],
})
export class GroupsPageComponent {
  private _selectedGroupId: string | null = null;
  canAccessSelectedGroup: boolean = false;

  newGroupName: string = "";

  requestGroupControl = new FormControl<string | UserGroupInfo>("");
  filteredGroups: Observable<UserGroupInfo[]> = new Observable<UserGroupInfo[]>();

  constructor(
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
    return this._userOptionsService?.userDetails?.info?.id || "";
  }

  get name() {
    return this._userOptionsService?.userDetails?.info?.name || "";
  }

  get isSelectedGroupAdmin() {
    return this.selectedGroup?.adminUsers.map(admin => admin.id)?.includes(this.userId) || this._userOptionsService.hasFeatureAccess("admin");
  }

  get selectedGroupToJoin(): string | UserGroupInfo | null {
    return this.requestGroupControl.value;
  }

  onRequestGroupAccess() {
    this.onRequestAccessToGroup(this.selectedGroupToJoin as UserGroupInfo, false);
    this.requestGroupControl.setValue("");
  }

  onOpenCreateNewGroupDialog() {
    const dialogConfig = new MatDialogConfig();
    const dialogRef = this.dialog.open(NewGroupDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((data: { groupName: string }) => {
      if (!data?.groupName) {
        return;
      }

      this.newGroupName = data.groupName;
      this.onCreateGroup();
    });
  }

  onSelectGroup(group: UserGroupInfo) {
    this._selectedGroupId = group.id;
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
    return [...this.selectedGroupMembers, ...this.selectedGroupViewers];
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

    dialogRef.afterClosed().subscribe((userSelection: { userId: string; role: string }) => {
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
    });
  }
}
