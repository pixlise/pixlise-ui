export class ContextImageItemTransform {
  constructor(
    public xOffset: number,
    public yOffset: number,
    public xScale: number,
    public yScale: number
  ) {}

  calcXPos(): number {
    return this.xOffset / this.xScale;
  }

  calcYPos(): number {
    return this.yOffset / this.yScale;
  }

  calcWidth(imageWidth: number): number {
    return imageWidth / this.xScale;
  }

  calcHeight(imageHeight: number): number {
    return imageHeight / this.yScale;
  }
}
