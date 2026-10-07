import { Directive, HostListener, Input } from "@angular/core";
import { WalkthroughService } from "../services/walkthrough.service";

@Directive({
  standalone: true,
  selector: "[walkthroughOpen]",
})
export class WalkthroughOpenDirective {
  @Input() walkthroughOpen: string = "";

  constructor(private _walkthroughService: WalkthroughService) {}

  @HostListener("click")
  onClick() {
    this._walkthroughService.open(this.walkthroughOpen);
  }
}
