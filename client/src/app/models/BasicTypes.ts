// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.
/*
export type DataId = string;
export type SCLK = number;
export type ScanType = string;
*/
export class MinMax {
  private _min: number | null = null;
  private _max: number | null = null;

  constructor(min: number | null = null, max: number | null = null) {
    if (min !== null) {
      this.setMin(min);
    }
    if (max !== null) {
      this.setMax(max);
    }
  }

  get min(): number | null {
    return this._min;
  }

  get max(): number | null {
    return this._max;
  }

  setMin(val: number): void {
    if (!Number.isFinite(val)) {
      this._min = 0;
    } else {
      this._min = val;
    }
  }

  setMax(val: number): void {
    if (!Number.isFinite(val)) {
      this._max = 0;
    } else {
      this._max = val;
    }
  }

  scale(by: number): void {
    if (!Number.isFinite(by) || this._max === null || this._min === null) {
      return;
    }

    this._min *= by;
    this._max *= by;
  }

  expandByMinMax(range: MinMax): void {
    if (range.min !== null) {
      this.expand(range.min);
    }
    if (range.max !== null) {
      this.expand(range.max);
    }
  }

  expand(value: number): void {
    this.expandMin(value);
    this.expandMax(value);
  }

  expandMin(value: number): boolean {
    if (Number.isFinite(value) && (this._min === null || value < this._min)) {
      this._min = value;
      return true;
    }
    return false;
  }

  expandMax(value: number): boolean {
    if (Number.isFinite(value) && (this._max === null || value > this._max)) {
      this._max = value;
      return true;
    }
    return false;
  }

  getAsPercentageOfRange(value: number, clampIfOutside: boolean): number {
    if (!Number.isFinite(value)) {
      // Silently act as if it was a 0
      return 0;
    }

    const range = this.getRange();

    // Prevent div by 0 and unbounded values
    if (range === 0) {
      return 0;
    }

    let pct = (value - (this._min || 0)) / range;

    // If we need to, clamp it:
    if (clampIfOutside) {
      if (pct < 0) {
        pct = 0;
      }
      if (pct > 1) {
        pct = 1;
      }
    }

    return pct;
  }

  // clamp: ensures resultant value is within the range, even if percentage input was not
  getValueForPercentageOfRange(pct: number, clamp: boolean = true): number {
    if (!Number.isFinite(pct)) {
      // Silently act as if it was 0%
      return this._min || 0;
    }

    const range = this.getRange();

    let value = pct * range + (this._min || 0);

    if (clamp) {
      if (value > (this._max || 0)) {
        value = this._max as number;
      }

      if (value < (this._min || 0)) {
        value = this._min as number;
      }
    }

    return value;
  }

  getRange(): number {
    if (this._max === null || this._min === null) {
      return 0;
    }
    return this._max - this._min;
  }

  getTightestRange(otherRange: MinMax): MinMax {
    const otherRangeMin = typeof otherRange.min === "number" ? otherRange.min : this._min;
    const otherRangeMax = typeof otherRange.max === "number" ? otherRange.max : this._max;

    return new MinMax(
      this._min !== null ? Math.max(otherRangeMin || 0, this._min) : otherRange.min || 0,
      this._max !== null ? Math.min(otherRangeMax || 0, this._max) : otherRange.max || 0
    );
  }

  isWithin(val: number): boolean {
    if (!Number.isFinite(val)) {
      return false;
    }

    if (this._min === null || this._max === null) {
      return false;
    }

    return val >= this._min && val <= this._max;
  }

  isValid(): boolean {
    return typeof this._min === "number" && typeof this._max === "number" && isFinite(this._min) && isFinite(this._max) && this._max >= this._min;
  }

  equals(other: MinMax): boolean {
    return this._min === other._min && this._max === other._max;
  }
}

export class LoadProgress {
  constructor(
    public fileName: string,
    public totalSizeBytes: number,
    public loadedSizeBytes: number
  ) {}
}

export class ObjectCreator {
  constructor(
    public name: string,
    public user_id: string,
    public email?: string
  ) {}
}

export class SpectrumEnergyCalibration {
  constructor(
    public eVstart: number,
    public eVperChannel: number,
    public detector: string
  ) {}

  isEmpty(): boolean {
    // We consider us not set if start=0 and /chan=1
    return this.eVstart == 0 && this.eVperChannel == 1;
  }

  toString(): string {
    return "eVstart=" + this.eVstart + ", eVperChannel=" + this.eVperChannel;
  }

  equals(another: SpectrumEnergyCalibration): boolean {
    // Check when formatted as text, as we do rounding when displaying the values
    return (
      this.eVstart.toFixed(3) == another.eVstart.toFixed(3) && this.eVperChannel.toFixed(3) == another.eVperChannel.toFixed(3) /*&&
            this.detector == another.detector*/
    );
  }

  channelsTokeV(channels: number[]): number[] {
    const result: number[] = [];
    for (const ch of channels) {
      result.push((this.eVstart + ch * this.eVperChannel) * 0.001 /*eV->keV conversion*/);
    }
    return result;
  }

  keVsToChannel(keVs: number[]): number[] {
    const result: number[] = [];
    for (const keV of keVs) {
      result.push(Math.floor((keV * 1000 /*keV->eV conversion*/ - this.eVstart) / this.eVperChannel));
    }
    return result;
  }
}
