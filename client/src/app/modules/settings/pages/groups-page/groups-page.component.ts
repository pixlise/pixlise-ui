import { Component } from "@angular/core";
import { GroupsService } from "../../services/groups.service";
import { UserGroup } from "src/app/generated-protos/user-group";

@Component({
  selector: "app-groups-page",
  templateUrl: "./groups-page.component.html",
  styleUrls: ["./groups-page.component.scss"]
})
export class GroupsPageComponent {
  private _selectedGroup: UserGroup | null = null;

  constructor(
    private _groupsService: GroupsService,
  ) {
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
    if (!this._selectedGroup?.members?.groupIds) {
      return [];
    }

    return this._selectedGroup.members.groupIds;
  }

  get selectedGroupMembers() {
    if (!this._selectedGroup?.members?.userIds) {
      return [];
    }

    return this._selectedGroup.members.userIds;
  }
}
