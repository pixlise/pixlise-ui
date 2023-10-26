export class Histogram {
  private _values: number[] = [];
  private _max: number = 0;

  constructor() {
    this.clear(0);
  }

  clear(numValues: number): void {
    this._values = Array(numValues).fill(0);
    this._max = 0;
  }

  increment(idx: number): void {
    this._values[idx]++;
    if (this._values[idx] > this._max) {
      this._max = this._values[idx];
    }
  }

  get values(): number[] {
    return this._values;
  }
  max(): number {
    return this._max;
  }
}
