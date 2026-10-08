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
  url?: string | string[];
  hidden?: boolean;
  manual?: boolean;
  steps: WalkthroughStepDefinition[];
};

export class WalkthroughAnchor {
  constructor(
    public stepId: string,
    public element: HTMLElement,
    public title: string,
    public text: string,
    public placement?: WalkthroughPlacement,
    public onNext?: () => void,
    public scope: string = "",
    public onEnter?: () => void,
    public onLeave?: () => void
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
