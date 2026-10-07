import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";
import { load } from "js-yaml";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { ActiveWalkthroughStep, WALKTHROUGH_FEATURE, WalkthroughAnchor, WalkthroughFeature } from "../models/walkthrough";

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
  private _stepIdx = 0;
  private _clearPending: (() => void) | null = null;

  constructor(
    private _http: HttpClient,
    private _userOptionsService: UserOptionsService
  ) {
    this.loadDefinitions();
    this._userOptionsService.userOptionsChanged$.subscribe(() => this.refresh());
  }

  registerAnchor(anchor: WalkthroughAnchor) {
    const others = (this._anchors.get(anchor.stepId) || []).filter(item => item.element !== anchor.element);
    this._anchors.set(anchor.stepId, [...others, anchor]);
    this.refresh();
  }

  unregisterAnchor(stepId: string, element: HTMLElement) {
    const others = (this._anchors.get(stepId) || []).filter(item => item.element !== element);
    if (others.length > 0) {
      this._anchors.set(stepId, others);
    } else {
      this._anchors.delete(stepId);
    }
    this.refresh();
  }

  registerTrigger(feature: string) {
    this._triggers.set(feature, (this._triggers.get(feature) || 0) + 1);
    this.refresh();
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
    this.refresh();
  }

  open(feature: string) {
    if (this._features[feature]) {
      this._feature = feature;
      this._forced = true;
      this._stepIdx = 0;
      this.refresh();
    }
  }

  next() {
    this.activeStep$.value?.anchors.forEach(anchor => anchor.onNext?.());
    this.advance();
  }

  back() {
    const steps = this._features[this._feature]?.steps || [];
    for (let idx = this._stepIdx - 1; idx >= 0; idx--) {
      if (this._anchors.has(steps[idx].id)) {
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

    if (feature === WALKTHROUGH_FEATURE) {
      if (guidance.showWalkthrough) {
        this._userOptionsService.updateGuidance({ showWalkthrough: false });
      }
    } else if (feature && !guidance.seenFeatureIds.includes(feature)) {
      this._userOptionsService.updateGuidance({ seenFeatureIds: [...guidance.seenFeatureIds, feature] });
    }
    this.refresh();
  }

  private get userLoaded(): boolean {
    return !!this._userOptionsService.userDetails.info?.id;
  }

  private isEligible(feature: string): boolean {
    const guidance = this._userOptionsService.guidance;
    if (feature === WALKTHROUGH_FEATURE) {
      return guidance.showWalkthrough;
    }
    return !guidance.showWalkthrough && !guidance.tipsDisabled && !guidance.seenFeatureIds.includes(feature);
  }

  private advance() {
    this._stepIdx++;
    this.refresh();
  }

  private refresh() {
    this._clearPending?.();
    this._clearPending = null;

    if (this._feature && !this._forced && !(this.userLoaded && this.isEligible(this._feature))) {
      this._feature = "";
    }

    if (!this._feature && this.userLoaded) {
      const feature = Array.from(this._triggers.keys()).find(item => this._features[item] && this.isEligible(item));
      if (feature) {
        this._feature = feature;
        this._forced = false;
        this._stepIdx = 0;
      }
    }

    if (this._feature && this._stepIdx >= this._features[this._feature].steps.length) {
      this.dismiss();
      return;
    }

    this.activeStep$.next(this._feature ? this.getStep(this._features[this._feature]) : null);
  }

  private getStep(feature: WalkthroughFeature): ActiveWalkthroughStep | null {
    const step = feature.steps[this._stepIdx];
    const anchors = this._anchors.get(step.id) || [];

    if (anchors.length <= 0) {
      if (this._stepIdx > 0 || this._forced) {
        const timer = setTimeout(() => this.advance(), 1000);
        this._clearPending = () => clearTimeout(timer);
      }
      return null;
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
        this.refresh();
      },
      error: err => console.error("Failed to load walkthrough definitions", err),
    });
  }
}
