import { ElementRef } from "@angular/core";

export class PCPLine {
  constructor(
    public xStart: number | string = 0,
    public yStart: number | string = 0,
    public xEnd: number | string = 0,
    public yEnd: number | string = 0
  ) {}
}

export class RGBUPoint {
  lines: PCPLine[] = [];

  _tooltipText: string = "";

  constructor(
    public r: number = 0,
    public g: number = 0,
    public b: number = 0,
    public u: number = 0,
    public rg: number = 0,
    public rb: number = 0,
    public ru: number = 0,
    public gb: number = 0,
    public gu: number = 0,
    public bu: number = 0,
    public color: string = "255,255,255",
    public name: string = ""
  ) {}

  getValue(key: keyof RGBUPoint | string): number {
    let pointKey = key as keyof RGBUPoint;
    if (this[pointKey] === undefined) {
      return 0;
    } else {
      return Number(this[pointKey]);
    }
  }

  get tooltipText(): string {
    return this._tooltipText;
  }

  calculateLinesForAxes(axes: PCPAxis[], element: ElementRef, plotID: string): void {
    let plotContainer = element?.nativeElement?.querySelector(`.${plotID}`);
    let domAxes = plotContainer?.querySelectorAll(".axes .axis-container");
    if (!domAxes || !plotContainer || domAxes.length != axes.length) {
      // Something isn't loaded right, don't continue drawing
      return;
    }

    let axesXLocations = Array.from(domAxes).map((axis: any) => {
      let clientRect = axis.getBoundingClientRect();
      return clientRect.x + clientRect.width / 2;
    });

    let relativeX = plotContainer.getBoundingClientRect().x;

    this.lines = [];
    for (let i = 0; i < axes.length - 1; i++) {
      let currentAxisValue = axes[i].getValueAsPercentage(Number(this[axes[i].key]));
      let nextAxisValue = axes[i + 1].getValueAsPercentage(Number(this[axes[i + 1].key]));

      let xStart = `${Math.round((axesXLocations[i] - relativeX) * 100) / 100}`;
      let xEnd = `${Math.round((axesXLocations[i + 1] - relativeX) * 100) / 100}`;
      let yStart = `${currentAxisValue * 100}%`;
      let yEnd = `${nextAxisValue * 100}%`;

      let line = new PCPLine(xStart, yStart, xEnd, yEnd);
      this.lines.push(line);
    }

    let tooltipText = `${this.name} Averages:\n`;
    axes.forEach(axis => {
      tooltipText += `${axis.title}: ${Number(this[axis.key]).toFixed(2)}\n`;
    });
    this._tooltipText = tooltipText;
  }
}

export type Dimension = {
  title: string;
  type?: string;
  color?: string;
  visible?: boolean;
};

export class PCPAxis {
  minSelection: number = 0;
  maxSelection: number = 0;
  activeSelection: boolean = false;

  constructor(
    public key: keyof RGBUPoint = "r",
    public title: string = "",
    public visible: boolean = true,
    public min: number = 0,
    public max: number = 0
  ) {}

  public getSelectionRange(): number[] {
    return [this.minSelection, this.maxSelection];
  }

  public setSelectionRange(min: number, max: number): void {
    this.minSelection = min;
    this.maxSelection = max;
    this.activeSelection = true;
  }

  public clearSelection(): void {
    this.activeSelection = false;
  }

  public getValueAsPercentage(value: number): number {
    if (this.min === this.max) {
      return 0.5;
    } else {
      return 1 - (value - this.min) / (this.max - this.min);
    }
  }
}
