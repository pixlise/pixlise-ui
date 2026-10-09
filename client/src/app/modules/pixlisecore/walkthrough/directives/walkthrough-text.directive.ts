import { Directive, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output } from "@angular/core";
import { WalkthroughAnchor, WalkthroughPlacement } from "../models/walkthrough";
import { WalkthroughService } from "../services/walkthrough.service";

@Directive({
  standalone: true,
  selector: "[walkthroughId]",
})
export class WalkthroughTextDirective implements OnChanges, OnDestroy {
  @Input() walkthroughId: string | string[] = "";
  @Input() walkthroughScope: string = "";
  @Input() walkthroughTitle: string = "";
  @Input() walkthroughText: string = "";
  @Input() walkthroughPlacement?: WalkthroughPlacement;
  @Output() walkthroughNext = new EventEmitter<void>();
  @Output() walkthroughEnter = new EventEmitter<void>();
  @Output() walkthroughLeave = new EventEmitter<void>();

  private _registeredIds: string[] = [];

  constructor(
    private _elementRef: ElementRef<HTMLElement>,
    private _walkthroughService: WalkthroughService
  ) {}

  ngOnChanges() {
    this.unregister();

    this._registeredIds = [this.walkthroughId].flat().filter(id => !!id);
    this._registeredIds.forEach(id =>
      this._walkthroughService.registerAnchor(
        new WalkthroughAnchor(
          id,
          this._elementRef.nativeElement,
          this.walkthroughTitle,
          this.walkthroughText,
          this.walkthroughPlacement,
          () => this.walkthroughNext.emit(),
          this.walkthroughScope,
          () => this.walkthroughEnter.emit(),
          () => this.walkthroughLeave.emit()
        )
      )
    );
  }

  ngOnDestroy() {
    this.unregister();
  }

  private unregister() {
    this._registeredIds.forEach(id => this._walkthroughService.unregisterAnchor(id, this._elementRef.nativeElement));
    this._registeredIds = [];
  }
}
