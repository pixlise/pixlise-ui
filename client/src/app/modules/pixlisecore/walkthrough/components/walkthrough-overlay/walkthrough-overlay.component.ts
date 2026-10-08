import { ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { Subscription } from "rxjs";
import { ActiveWalkthroughStep } from "../../models/walkthrough";
import { WalkthroughService } from "../../services/walkthrough.service";
import { Arrow, Box, easeInOut, getArrow, getBackdropPath, getCardBox, lerpBox, padBox, toBox } from "../../utils/walkthrough-layout";

type Layout = { holes: Box[]; card: Box };

@Component({
  standalone: false,
  selector: "walkthrough-overlay",
  templateUrl: "./walkthrough-overlay.component.html",
  styleUrls: ["./walkthrough-overlay.component.scss"],
})
export class WalkthroughOverlayComponent implements OnInit, OnDestroy {
  private static readonly SPOTLIGHT_PADDING = 6;
  private static readonly CARD_GAP = 12;
  private static readonly VIEWPORT_MARGIN = 8;
  private static readonly TRANSITION_MS = 350;

  @ViewChild("card") card?: ElementRef<HTMLElement>;

  step: ActiveWalkthroughStep | null = null;
  visible = false;
  holes: Box[] = [];
  arrows: Arrow[] = [];
  backdropPath = "";
  cardStyle: Record<string, string> = {};

  private _subs = new Subscription();
  private _frameId = 0;
  private _layout: Layout | null = null;
  private _transitionFrom: Layout | null = null;
  private _transitionStart = 0;
  private _lastRendered = "";

  constructor(
    private _walkthroughService: WalkthroughService,
    private _changeDetector: ChangeDetectorRef,
    private _ngZone: NgZone
  ) {}

  ngOnInit() {
    this._subs.add(
      this._walkthroughService.activeStep$.subscribe(step => {
        this.visible = !!step;
        if (step) {
          if (!this.isSameStep(step)) {
            this._transitionFrom = this._layout;
            this._transitionStart = performance.now();
          }
          this.step = step;
        }

        this._lastRendered = "";
        this._changeDetector.detectChanges();
        this.updateLayout();
      })
    );

    this._ngZone.runOutsideAngular(() => this.trackAnchors());
  }

  ngOnDestroy() {
    cancelAnimationFrame(this._frameId);
    this._subs.unsubscribe();
  }

  onNext() {
    this._walkthroughService.next();
  }

  onBack() {
    this._walkthroughService.back();
  }

  onDismiss() {
    this._walkthroughService.dismiss();
  }

  private isSameStep(step: ActiveWalkthroughStep): boolean {
    return (
      !!this.step &&
      this.step.position === step.position &&
      this.step.title === step.title &&
      this.step.anchors.length === step.anchors.length &&
      this.step.anchors.every((anchor, idx) => anchor.element === step.anchors[idx].element)
    );
  }

  private trackAnchors() {
    if (this.visible && this.updateLayout()) {
      this._ngZone.run(() => this._changeDetector.detectChanges());
    }
    this._frameId = requestAnimationFrame(() => this.trackAnchors());
  }

  private measure(step: ActiveWalkthroughStep): Layout {
    const boxes = step.anchors.map(anchor => toBox(anchor.element.getBoundingClientRect()));
    const shown = boxes.filter(box => box.width > 0 || box.height > 0);
    const holes = (shown.length > 0 ? shown : boxes).map(box => padBox(box, WalkthroughOverlayComponent.SPOTLIGHT_PADDING));
    const cardElement = this.card?.nativeElement;
    const cardSize = { width: cardElement?.offsetWidth || 0, height: cardElement?.offsetHeight || 0 };
    const card = getCardBox(holes, cardSize, step.placement, WalkthroughOverlayComponent.CARD_GAP, WalkthroughOverlayComponent.VIEWPORT_MARGIN);
    return { holes, card };
  }

  private getDisplayLayout(target: Layout): Layout {
    const progress = Math.min(1, (performance.now() - this._transitionStart) / WalkthroughOverlayComponent.TRANSITION_MS);
    const from = this._transitionFrom;
    if (!from || progress >= 1) {
      this._transitionFrom = null;
      return target;
    }

    const eased = easeInOut(progress);
    return {
      holes: target.holes.map((hole, idx) => lerpBox(from.holes[idx] || from.holes[0] || hole, hole, eased)),
      card: lerpBox(from.card, target.card, eased),
    };
  }

  private updateLayout(): boolean {
    if (!this.step || !this.visible) {
      return false;
    }

    this._layout = this.getDisplayLayout(this.measure(this.step));

    const rendered = JSON.stringify(this._layout);
    if (rendered === this._lastRendered) {
      return false;
    }
    this._lastRendered = rendered;

    const { holes, card } = this._layout;
    this.holes = holes;
    this.backdropPath = getBackdropPath(holes);
    this.cardStyle = { top: `${card.top}px`, left: `${card.left}px` };

    this.arrows = holes.length > 1 ? holes.map(hole => getArrow(card, hole)).filter((arrow): arrow is Arrow => !!arrow) : [];
    return true;
  }
}
