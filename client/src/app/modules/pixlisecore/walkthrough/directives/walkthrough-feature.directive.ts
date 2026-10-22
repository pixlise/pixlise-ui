import { Directive, Input, OnChanges, OnDestroy } from "@angular/core";
import { WalkthroughService } from "../services/walkthrough.service";

@Directive({
  standalone: true,
  selector: "[walkthroughFeature]",
})
export class WalkthroughFeatureDirective implements OnChanges, OnDestroy {
  @Input() walkthroughFeature: string = "";

  private _registeredFeature = "";

  constructor(private _walkthroughService: WalkthroughService) {}

  ngOnChanges() {
    this.unregister();

    if (this.walkthroughFeature) {
      this._registeredFeature = this.walkthroughFeature;
      this._walkthroughService.registerTrigger(this.walkthroughFeature);
    }
  }

  ngOnDestroy() {
    this.unregister();
  }

  private unregister() {
    if (this._registeredFeature) {
      this._walkthroughService.unregisterTrigger(this._registeredFeature);
      this._registeredFeature = "";
    }
  }
}
