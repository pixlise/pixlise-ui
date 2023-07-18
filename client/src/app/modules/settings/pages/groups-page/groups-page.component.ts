import { Component } from "@angular/core";
import { GroupsService } from "../../services/groups.service";
import { UserGroup } from "src/app/generated-protos/user-group";
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
  private _selectedGroup: UserGroup | null = null;

  newGroupName: string = "";

  constructor(
    private _groupsService: GroupsService,
    private _userOptionsService: UserOptionsService,
    private dialog: MatDialog,
  ) {
    this._groupsService.groupsChanged$.subscribe(() => {
      if (!this._selectedGroup) {
        return;
      }

      const selectedGroup = this._groupsService.groups.find(group => group.info?.id === this._selectedGroup?.info?.id);
      if (!selectedGroup) {
        this._selectedGroup = null;
      } else {
        this._selectedGroup = selectedGroup;
      }
    });
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

  onSelectGroup(group: UserGroup) {
    this._selectedGroup = group;
  }

  get selectedGroup() {
    return this._selectedGroup;
  }

  get selectedGroupSubGroups() {
    if (!this._selectedGroup?.members?.groups) {
      return [];
    }

    return this._selectedGroup.members.groups || [];
  }

  get selectedGroupMembers() {
    if (!this._selectedGroup?.members?.users) {
      return [];
    }

    return this._selectedGroup.members?.users || [];
  }

  onCreateGroup() {
    this._groupsService.createGroup(this.newGroupName);
    this.newGroupName = "";
  }

  onDeleteGroup(group: UserGroup) {
    this._groupsService.deleteGroup(group.info?.id || "");
  }

  onClearNewGroupName() {
    this.newGroupName = "";
  }

  onRemoveMemberFromGroup(userId: string) {
    if (!this._selectedGroup?.info?.id) {
      return;
    }

    this._groupsService.removeMemberFromGroup(this._selectedGroup.info.id, userId);
  }

  onAddUserToGroup(groupId: string) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { groupId };
    const dialogRef = this.dialog.open(AddUserDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(
      (userId: string) => {
        // console.log("The dialog was closed", userId);
      }
    );
  }

}
