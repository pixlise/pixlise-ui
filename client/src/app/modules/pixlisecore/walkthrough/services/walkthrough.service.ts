import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router, NavigationEnd } from "@angular/router";
import { BehaviorSubject, filter } from "rxjs";
import { load } from "js-yaml";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { ActiveWalkthroughStep, WalkthroughAnchor, WalkthroughFeature } from "../models/walkthrough";

@Injectable({
  providedIn: "root",
})
export class WalkthroughService {
  private static readonly WALKTHROUGH_YAML = "assets/walkthrough.yaml";

  activeStep$ = new BehaviorSubject<ActiveWalkthroughStep | null>(null);

  private _features: Record<string, WalkthroughFeature> = {};
  private _anchors = new Map<string, WalkthroughAnchor[]>();
  private _triggers = new Map<string, number>();
  private _feature = "";
  private _forced = false;
  private _scope = "";
  private _pendingLaunch = "";
  private _stepIdx = 0;
  private _clearPending: (() => void) | null = null;
  private _skipTimer: ReturnType<typeof setTimeout> | null = null;
  private _stepKey = "";
  private _enteredAnchors: WalkthroughAnchor[] = [];
  private _refreshQueued = false;

  constructor(
    private _http: HttpClient,
    private _router: Router,
    private _userOptionsService: UserOptionsService
  ) {
    this.loadDefinitions();
    this._userOptionsService.userOptionsChanged$.subscribe(() => this.scheduleRefresh());
    this._router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => this.onNavigated());
  }

  registerAnchor(anchor: WalkthroughAnchor) {
    const others = (this._anchors.get(anchor.stepId) || []).filter(item => item.element !== anchor.element);
    this._anchors.set(anchor.stepId, [...others, anchor]);
    this.scheduleRefresh();
  }

  unregisterAnchor(stepId: string, element: HTMLElement) {
    const others = (this._anchors.get(stepId) || []).filter(item => item.element !== element);
    if (others.length > 0) {
      this._anchors.set(stepId, others);
    } else {
      this._anchors.delete(stepId);
    }
    this.scheduleRefresh();
  }

  registerTrigger(feature: string) {
    this._triggers.set(feature, (this._triggers.get(feature) || 0) + 1);
    this.scheduleRefresh();
  }

  unregisterTrigger(feature: string) {
    const count = (this._triggers.get(feature) || 0) - 1;
    if (count > 0) {
      this._triggers.set(feature, count);
      return;
    }

    this._triggers.delete(feature);
    if (this._feature === feature && !this._forced) {
      this._feature = "";
    }
    this.scheduleRefresh();
  }

  hasFeature(feature: string): boolean {
    return !!this._features[feature];
  }

  open(feature: string, scope = "") {
    if (this._features[feature]) {
      this._feature = feature;
      this._forced = true;
      this._scope = scope;
      this._stepIdx = 0;
      this.refresh();
    }
  }

  get listedFeatures(): { id: string; title: string }[] {
    return Object.entries(this._features)
      .filter(([, feature]) => !feature.hidden && !feature.manual)
      .map(([id, feature]) => ({ id, title: feature.title || id }));
  }

  isFeatureEnabled(feature: string): boolean {
    return !this._userOptionsService.guidance.seenFeatureIds.includes(feature);
  }

  setFeatureEnabled(feature: string, enabled: boolean) {
    const others = this._userOptionsService.guidance.seenFeatureIds.filter(id => id !== feature);
    this._userOptionsService.updateGuidance({ seenFeatureIds: enabled ? others : [...others, feature] });
  }

  launch(feature: string) {
    if (this.isOnPage(feature)) {
      this.open(feature);
      return;
    }

    this._pendingLaunch = feature;
    this._router.navigate([this.getUrls(feature)[0]], { queryParamsHandling: "preserve" });
  }

  next() {
    this.activeStep$.value?.anchors.forEach(anchor => anchor.onNext?.());
    this.advance();
  }

  back() {
    const steps = this._features[this._feature]?.steps || [];
    for (let idx = this._stepIdx - 1; idx >= 0; idx--) {
      if (this.getAnchors(steps[idx].id).length > 0) {
        this._stepIdx = idx;
        break;
      }
    }
    this.refresh();
  }

  dismiss() {
    const feature = this._feature;
    const guidance = this._userOptionsService.guidance;
    this._feature = "";
    this._forced = false;
    this._scope = "";

    if (feature && !this._features[feature]?.manual && !guidance.seenFeatureIds.includes(feature)) {
      this._userOptionsService.updateGuidance({ seenFeatureIds: [...guidance.seenFeatureIds, feature] });
    }
    this.refresh();
  }

  private get userLoaded(): boolean {
    return !!this._userOptionsService.userDetails.info?.id;
  }

  private getUrls(feature: string): string[] {
    const url = this._features[feature]?.url || [];
    return typeof url === "string" ? [url] : url;
  }

  private isOnPage(feature: string): boolean {
    const urls = this.getUrls(feature);
    const path = this._router.url.split(/[?#]/)[0].replace(/\/$/, "");
    return urls.length === 0 || urls.some(url => url.replace(/\/$/, "") === path);
  }

  private onNavigated() {
    const feature = this._pendingLaunch;
    this._pendingLaunch = "";
    if (feature && this.isOnPage(feature)) {
      this.open(feature);
    }
    this.refresh();
  }

  private isEligible(feature: string): boolean {
    if (!this.isOnPage(feature)) {
      return false;
    }

    const guidance = this._userOptionsService.guidance;
    return !guidance.tipsDisabled && !guidance.seenFeatureIds.includes(feature);
  }

  private advance() {
    this._stepIdx++;
    this.refresh();
  }

  private scheduleRefresh() {
    if (!this._refreshQueued) {
      this._refreshQueued = true;
      Promise.resolve().then(() => {
        this._refreshQueued = false;
        this.refresh();
      });
    }
  }

  private clearSkipTimer() {
    if (this._skipTimer) {
      clearTimeout(this._skipTimer);
      this._skipTimer = null;
    }
  }

  private leaveStep() {
    this._enteredAnchors.forEach(anchor => anchor.onLeave?.());
    this._enteredAnchors = [];
    this.clearSkipTimer();
  }

  private refresh() {
    this._clearPending?.();
    this._clearPending = null;

    if (this._feature && (!this.isOnPage(this._feature) || (!this._forced && !(this.userLoaded && this.isEligible(this._feature))))) {
      this._feature = "";
      this._forced = false;
      this._scope = "";
    }

    if (!this._feature && this.userLoaded) {
      const feature = Array.from(this._triggers.keys()).find(item => this._features[item] && this.isEligible(item));
      if (feature) {
        this._feature = feature;
        this._forced = false;
        this._scope = "";
        this._stepIdx = 0;
      }
    }

    if (this._feature && this._stepIdx >= this._features[this._feature].steps.length) {
      this.dismiss();
      return;
    }

    const stepKey = this._feature ? `${this._feature}:${this._scope}:${this._stepIdx}` : "";
    if (stepKey !== this._stepKey) {
      this.leaveStep();
      this._stepKey = stepKey;
    }

    this.activeStep$.next(this._feature ? this.getStep(this._features[this._feature]) : null);
  }

  private getAnchors(stepId: string): WalkthroughAnchor[] {
    const anchors = (this._anchors.get(stepId) || []).filter(anchor => anchor.element.isConnected && anchor.element.getClientRects().length > 0);
    return this._scope ? anchors.filter(anchor => anchor.scope === this._scope) : anchors;
  }

  private getStep(feature: WalkthroughFeature): ActiveWalkthroughStep | null {
    const step = feature.steps[this._stepIdx];
    const anchors = this.getAnchors(step.id);

    if (anchors.length <= 0) {
      if (this._stepIdx > 0 && !this._skipTimer) {
        this._skipTimer = setTimeout(() => {
          this._skipTimer = null;
          this.advance();
        }, 1000);
      }
      return null;
    }

    this.clearSkipTimer();
    if (this._enteredAnchors.length === 0) {
      this._enteredAnchors = anchors;
      anchors.forEach(anchor => anchor.onEnter?.());
    }

    if (step.advanceOn === "click") {
      const onClick = () => this.advance();
      anchors.forEach(anchor => anchor.element.addEventListener("click", onClick, { once: true }));
      this._clearPending = () => anchors.forEach(anchor => anchor.element.removeEventListener("click", onClick));
    }

    return {
      featureTitle: feature.title || "",
      title: anchors.find(anchor => anchor.title)?.title || step.title || "",
      text: anchors.find(anchor => anchor.text)?.text || step.text || "",
      placement: anchors.find(anchor => anchor.placement)?.placement || step.placement || "bottom",
      anchors,
      position: this._stepIdx,
      total: feature.steps.length,
      isLast: this._stepIdx === feature.steps.length - 1,
    };
  }

  private loadDefinitions() {
    this._http.get(WalkthroughService.WALKTHROUGH_YAML, { responseType: "text" }).subscribe({
      next: yaml => {
        this._features = (load(yaml) as Record<string, WalkthroughFeature>) || {};
        this.scheduleRefresh();
      },
      error: err => console.error("Failed to load walkthrough definitions", err),
    });
  }
}
