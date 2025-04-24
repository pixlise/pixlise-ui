import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { UserGroupInfo } from "../../../../../generated-protos/user-group";
import { UsersService } from "../../../../settings/services/users.service";
import { UserOptionsService } from "../../../../settings/settings.module";
import { Subscription } from "rxjs";
import { GroupsService } from "../../../../settings/services/groups.service";
@Component({
  selector: "group-icon",
  templateUrl: "./group-icon.component.html",
  styleUrls: ["./group-icon.component.scss"],
})
export class GroupIconComponent implements OnDestroy {
  defaultIconURL: string = "assets/button-icons/group.svg";
  iconURL: string = "";
  iconAbbreviation: string = "";

  private _subs: Subscription = new Subscription();

  @Input() size: string = "76px";

  @Input() defaultToCurrentUser: boolean = true;

  private _groupId: string = "";

  groupInfo: UserGroupInfo | null = null;

  constructor(private _groupsService: GroupsService) {}

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  @Input() set groupId(groupId: string) {
    this._groupId = groupId;

    // OPTIONAL: Can configure icons for groups
    // if (this._groupId) {
    //   this._subs.add(
    //     this._groupsService.fetchUserGroupInfoAsync(this._groupId).subscribe(group => {
    //       this.groupInfo = group;
    //       // this.iconURL = group.iconURL;
    //       // this.iconAbbreviation = this.generateAbbreviation(group.name);
    //     })
    //   );
    // }
  }

  generateAbbreviation(name: string) {
    const firstLast = name.split(" ");
    if (firstLast.length === 1) {
      return firstLast[0]?.[0] || "N/A";
    } else if (firstLast.length >= 2) {
      return firstLast[0][0] + firstLast[firstLast.length - 1][0];
    } else if (name.length > 0) {
      return name[0];
    } else {
      return "N/A";
    }
  }
}
