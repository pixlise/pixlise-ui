import { Component, Input } from "@angular/core";
import { UserInfo } from "../../../../../generated-protos/user";
import { UsersService } from "../../../../settings/services/users.service";
import { UserOptionsService } from "../../../../settings/settings.module";

@Component({
  selector: "user-icon",
  templateUrl: "./user-icon.component.html",
  styleUrls: ["./user-icon.component.scss"],
})
export class UserIconComponent {
  defaultIconURL: string = "assets/button-icons/user.svg";
  iconURL: string = "";
  iconAbbreviation: string = "";

  @Input() size: string = "76px";

  @Input() defaultToCurrentUser: boolean = true;

  private _userId: string = "";

  userInfo: UserInfo | null = null;
  isReviewer: boolean = false;

  constructor(
    private _userOptionsService: UserOptionsService,
    private _usersService: UsersService
  ) {
    this._userOptionsService.userOptionsChanged$.subscribe(() => {
      this.updateUser();
    });
  }

  @Input() set userId(userId: string) {
    this._userId = userId;
    this.updateUser();
  }

  generateAbbreviation(name: string) {
    let firstLast = name.split(" ");
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

  updateUser() {
    let cachedUsers = this._usersService?.cachedUsers;
    let userId = this._userId || "";

    if (!userId && this.defaultToCurrentUser) {
      this.userInfo = this._userOptionsService?.userDetails?.info || null;
      let iconURL = this.userInfo?.iconURL;
      if (iconURL) {
        this.iconURL = iconURL;
      } else {
        this.iconURL = "";
        this.iconAbbreviation = this.generateAbbreviation(this.userInfo?.name || "");
      }
    } else {
      if (cachedUsers && userId && cachedUsers[userId]) {
        this.userInfo = cachedUsers[userId];
        let iconURL = this.userInfo?.iconURL;
        if (iconURL) {
          this.iconURL = iconURL;
        } else {
          this.iconURL = "";
          this.iconAbbreviation = this.generateAbbreviation(this.userInfo?.name || "");
        }
      } else {
        if (userId) {
          this._usersService.fetchUserInfo(userId).subscribe(userInfo => {
            if (userInfo) {
              this.updateUser();
            }
          });
        }
        this.userInfo = null;
        this.iconURL = "";
        this.iconAbbreviation = this.generateAbbreviation("");
      }
    }

    this.isReviewer = (this.userInfo && !this.userInfo.iconURL && this.userInfo.email.startsWith("reviewer-")) || false;
  }

  ngOnInit() {}
}
