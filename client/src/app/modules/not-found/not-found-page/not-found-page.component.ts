import { Component } from "@angular/core";
import { HelpMessage } from "src/app/utils/help-message";

@Component({
  selector: "app-not-found-page",
  templateUrl: "./not-found-page.component.html",
  styleUrls: ["./not-found-page.component.scss"]
})
export class NotFoundPageComponent {
  message: string = HelpMessage.PAGE_NOT_FOUND;

}
