import { Component, Input } from "@angular/core";
import { UserOptionsService } from "../../settings.module";

@Component({
  selector: "user-icon",
  templateUrl: "./user-icon.component.html",
  styleUrls: ["./user-icon.component.scss"],
})
export class UserIconComponent {
  iconURL: string = "assets/button-icons/user.svg";

  @Input() size: string = "76px";

  constructor(private _userOptionsService: UserOptionsService) {
    this._userOptionsService.userOptionsChanged$.subscribe(() => {
      let iconURL = this._userOptionsService?.userDetails?.info?.iconURL;
      if (iconURL) {
        this.iconURL = iconURL;
      }
    });
  }
}
