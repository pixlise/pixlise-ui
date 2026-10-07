import { Directive, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output } from "@angular/core";
import { WalkthroughAnchor, WalkthroughPlacement } from "../models/walkthrough";
import { WalkthroughService } from "../services/walkthrough.service";

@Directive({
  standalone: true,
  selector: "[walkthroughId]",
})
export class WalkthroughTextDirective implements OnChanges, OnDestroy {
  @Input() walkthroughId: string = "";
  @Input() walkthroughTitle: string = "";
  @Input() walkthroughText: string = "";
  @Input() walkthroughPlacement?: WalkthroughPlacement;
  @Output() walkthroughNext = new EventEmitter<void>();

  private _registeredId = "";

  constructor(
    private _elementRef: ElementRef<HTMLElement>,
    private _walkthroughService: WalkthroughService
  ) {}

  ngOnChanges() {
    this.unregister();

    if (this.walkthroughId) {
      this._registeredId = this.walkthroughId;
      this._walkthroughService.registerAnchor(
        new WalkthroughAnchor(
          this.walkthroughId,
          this._elementRef.nativeElement,
          this.walkthroughTitle,
          this.walkthroughText,
          this.walkthroughPlacement,
          () => this.walkthroughNext.emit()
        )
      );
    }
  }

  ngOnDestroy() {
    this.unregister();
  }

  private unregister() {
    if (this._registeredId) {
      this._walkthroughService.unregisterAnchor(this._registeredId, this._elementRef.nativeElement);
      this._registeredId = "";
    }
  }
}
