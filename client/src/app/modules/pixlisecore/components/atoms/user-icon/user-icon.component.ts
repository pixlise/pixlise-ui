import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { UserInfo } from "../../../../../generated-protos/user";
import { UserOptionsService } from "../../../../settings/settings.module";
import { UsersService } from "../../../pixlisecore.module";

@Component({
  selector: "user-icon",
  templateUrl: "./user-icon.component.html",
  styleUrls: ["./user-icon.component.scss"],
})
export class UserIconComponent implements OnInit, OnDestroy {
  defaultIconURL: string = "assets/button-icons/user.svg";
  iconURL: string = "";
  iconAbbreviation: string = "";

  private _subs: Subscription = new Subscription();

  @Input() size: string = "76px";

  @Input() defaultToCurrentUser: boolean = true;

  private _userId: string = "";

  userInfo: UserInfo | null = null;
  isReviewer: boolean = false;

  constructor(
    private _userOptionsService: UserOptionsService,
    private _usersService: UsersService
  ) {}

  ngOnInit() {
    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this.updateUser();
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  @Input() set userId(userId: string) {
    this._userId = userId;
    this.updateUser();
  }

  get fontSize() {
    if (this.size.endsWith("px")) {
      return (Math.floor(Number(this.size.replace("px", "")) * 0.5) - 2).toString() + "px";
    } else {
      return "14px";
    }
  }

  generateAbbreviation(name: string) {
    if (!name) {
      return "N/A";
    }

    const firstLast = name.trim().toUpperCase().split(" ");
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
    const cachedUsers = this._usersService?.cachedUsers;
    const userId = this._userId || "";

    if (!userId && this.defaultToCurrentUser) {
      this.userInfo = this._userOptionsService?.userDetails?.info || null;
      const iconURL = this.userInfo?.iconURL;
      if (iconURL) {
        this.iconURL = iconURL;
      } else {
        this.iconURL = "";
        this.iconAbbreviation = this.generateAbbreviation(this.userInfo?.name || "");
      }
    } else {
      if (cachedUsers && userId && cachedUsers[userId]) {
        this.userInfo = cachedUsers[userId];
        const iconURL = this.userInfo?.iconURL;
        if (iconURL) {
          this.iconURL = iconURL;
        } else {
          this.iconURL = "";
          this.iconAbbreviation = this.generateAbbreviation(this.userInfo?.name || "");
        }
      } else {
        if (userId) {
          this._subs.add(
            this._usersService.fetchUserInfo(userId).subscribe(userInfo => {
              if (userInfo) {
                this.updateUser();
              }
            })
          );
        }
        this.userInfo = null;
        this.iconURL = "";
        this.iconAbbreviation = this.generateAbbreviation("");
      }
    }

    this.isReviewer = (this.userInfo && !this.userInfo.iconURL && this.userInfo.email.startsWith("reviewer-")) || false;
  }
}
