import { Component, HostBinding, Input } from "@angular/core";
import { WalkthroughService } from "../../services/walkthrough.service";

@Component({
  standalone: false,
  selector: "walkthrough-info-button",
  templateUrl: "./walkthrough-info-button.component.html",
})
export class WalkthroughInfoButtonComponent {
  @Input() feature: string = "";
  @Input() scope: string = "";
  @Input() alignRight: boolean = false;

  @HostBinding("style.display") display = "flex";

  @HostBinding("style.margin-left") get marginLeft(): string | null {
    return this.alignRight ? "auto" : null;
  }

  @HostBinding("style.margin-right") get marginRight(): string | null {
    return this.alignRight ? "8px" : null;
  }

  constructor(private _walkthroughService: WalkthroughService) {}

  get hasFeature(): boolean {
    return this._walkthroughService.hasFeature(this.feature);
  }
}
