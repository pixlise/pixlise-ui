export const WALKTHROUGH_FEATURE = "walkthrough";

export type WalkthroughPlacement = "top" | "bottom" | "left" | "right";

export type WalkthroughAdvanceOn = "next" | "click";

export type WalkthroughStepDefinition = {
  id: string;
  title?: string;
  text?: string;
  placement?: WalkthroughPlacement;
  advanceOn?: WalkthroughAdvanceOn;
};

export type WalkthroughFeature = {
  title?: string;
  steps: WalkthroughStepDefinition[];
};

export class WalkthroughAnchor {
  constructor(
    public stepId: string,
    public element: HTMLElement,
    public title: string,
    public text: string,
    public placement?: WalkthroughPlacement,
    public onNext?: () => void
  ) {}
}

export type ActiveWalkthroughStep = {
  featureTitle: string;
  title: string;
  text: string;
  placement: WalkthroughPlacement;
  anchors: WalkthroughAnchor[];
  position: number;
  total: number;
  isLast: boolean;
};
