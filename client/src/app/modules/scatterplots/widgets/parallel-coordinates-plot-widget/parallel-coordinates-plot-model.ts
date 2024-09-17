import { ElementRef } from "@angular/core";

export enum SIGMA_LEVEL {
  NONE = "Sigma 0",
  ONE = "Sigma +1",
  TWO = "Sigma +2",
}

export enum AVERAGE_MODE {
  MEAN = "Mean",
  MEDIAN = "Median",
}

export class PCPLine {
  constructor(
    public xStart: number | string = 0,
    public yStart: number | string = 0,
    public xEnd: number | string = 0,
    public yEnd: number | string = 0,
    public widthStart: number = 3,
    public widthEnd: number = 3
  ) {}
}

export class RGBUPoint {
  lines: PCPLine[] = [];
  sigmaLines: PCPLine[] = [];

  _tooltipText: string = "";

  id: string = "";
  visible: boolean = true;

  public rMean: number = 0;
  public gMean: number = 0;
  public bMean: number = 0;
  public uMean: number = 0;

  public rMedian: number = 0;
  public gMedian: number = 0;
  public bMedian: number = 0;
  public uMedian: number = 0;

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
    public name: string = "",
    public scanId: string = "",
    public imageName: string = "",
    public rStdDev: number = 0,
    public gStdDev: number = 0,
    public bStdDev: number = 0,
    public uStdDev: number = 0,
    public rSigma1: number = 0,
    public gSigma1: number = 0,
    public bSigma1: number = 0,
    public uSigma1: number = 0,
    public rSigma2: number = 0,
    public gSigma2: number = 0,
    public bSigma2: number = 0,
    public uSigma2: number = 0
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

  calculateLinesForAxes(axes: PCPAxis[], element: ElementRef, plotID: string, sigmaLevel: SIGMA_LEVEL): boolean {
    let plotContainer: Element = element?.nativeElement?.querySelector(`.${plotID}`);
    let domAxes = plotContainer?.querySelectorAll(".axes .axis-container");
    if (!domAxes || !plotContainer || domAxes.length != axes.length) {
      // Something isn't loaded right, don't continue drawing
      return false;
    }

    let axesXLocations = Array.from(domAxes).map((axis: any) => {
      let clientRect = axis.getBoundingClientRect();
      return clientRect.x + clientRect.width / 2;
    });

    let svgContainer = plotContainer.querySelector("svg");
    if (!svgContainer) {
      return false;
    }

    let relativeX = plotContainer.getBoundingClientRect().x;
    let plotHeight = svgContainer?.getBoundingClientRect().height;

    this.lines = [];
    this.sigmaLines = [];
    let miniMode = false;
    for (let i = 0; i < axes.length - 1; i++) {
      let currentAxis = axes[i];
      let nextAxis = axes[i + 1];

      let currentAxisValue = axes[i].getValueAsPercentage(Number(this[currentAxis.key]));
      let nextAxisValue = nextAxis.getValueAsPercentage(Number(this[nextAxis.key]));

      let xStart = Math.round((axesXLocations[i] - relativeX) * 100) / 100;
      let xEnd = Math.round((axesXLocations[i + 1] - relativeX) * 100) / 100;
      let yStart = Math.round(currentAxisValue * plotHeight);
      let yEnd = Math.round(nextAxisValue * plotHeight);

      if (xEnd - xStart < 75) {
        miniMode = true;
      }

      let line = new PCPLine(xStart, yStart, xEnd, yEnd);
      if (sigmaLevel === SIGMA_LEVEL.ONE && this.rStdDev) {
        let startSigma1 = this[`${currentAxis.key}Sigma1` as keyof this] as number;
        let startWidth = startSigma1 !== undefined ? Math.round((startSigma1 / (currentAxis.max - currentAxis.min)) * 100) : null;

        let endSigma1 = this[`${nextAxis.key}Sigma1` as keyof this] as number;
        let endWidth = endSigma1 !== undefined ? Math.round((endSigma1 / (nextAxis.max - nextAxis.min)) * 100) : null;

        if (startWidth !== null && endWidth !== null) {
          let sigmaLine = new PCPLine(xStart, yStart, xEnd, yEnd, startWidth, endWidth);
          this.sigmaLines.push(sigmaLine);
        }
      } else if (sigmaLevel === SIGMA_LEVEL.TWO && this.rStdDev) {
        let startSigma2 = this[`${currentAxis.key}Sigma2` as keyof this] as number;
        let startWidth = startSigma2 !== undefined ? Math.round((startSigma2 / (currentAxis.max - currentAxis.min)) * 100) : null;

        let endSigma2 = this[`${nextAxis.key}Sigma2` as keyof this] as number;
        let endWidth = endSigma2 !== undefined ? Math.round((endSigma2 / (nextAxis.max - nextAxis.min)) * 100) : null;

        if (startWidth !== null && endWidth !== null) {
          let sigmaLine = new PCPLine(xStart, yStart, xEnd, yEnd, startWidth, endWidth);
          this.sigmaLines.push(sigmaLine);
        }
      }
      this.lines.push(line);
    }

    let tooltipText = `${this.name} Averages:\n`;
    axes.forEach(axis => {
      let sigmaDescription = "";
      if (sigmaLevel !== SIGMA_LEVEL.NONE) {
        let sigmaValue = sigmaLevel === SIGMA_LEVEL.ONE ? (this[`${axis.key}Sigma1` as keyof this] as number) : (this[`${axis.key}Sigma2` as keyof this] as number);
        sigmaDescription = ` (σ${sigmaLevel === SIGMA_LEVEL.ONE ? "1" : "2"}: ${sigmaValue?.toFixed(2) ?? "N/A"})`;
      }
      tooltipText += `${axis.title}: ${Number(this[axis.key]).toFixed(2)}${sigmaDescription}\n`;
    });
    this._tooltipText = tooltipText;

    return miniMode;
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
    public shortName: string = "",
    public wavelength: number = 0,
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
