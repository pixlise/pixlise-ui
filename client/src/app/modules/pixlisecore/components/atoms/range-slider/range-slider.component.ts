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

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { fromEvent, Subscription } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { ColourRamp } from "src/app/utils/colours";
import { Colours } from "src/app/utils/colours";

export class RangeSliderValue {
  constructor(
    public minValue: number,
    public maxValue: number,
    public finish: boolean
  ) {}
}

const ThumbRadius = 6;

@Component({
  selector: "range-slider",
  templateUrl: "./range-slider.component.html",
  styleUrls: ["./range-slider.component.scss"],
})
export class RangeSliderComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  // The values that the sliders are at:
  @Input() selectedMinValue: number = 0;
  @Input() selectedMaxValue: number = 0;

  // The range of the entire slider control:
  @Input() minValue: number = 0;
  @Input() maxValue: number = 100;

  @Input() pxLength: number = 86;

  public hoverMinValue: boolean = false;
  public hoverMaxValue: boolean = false;

  // Ugly doing visual config through code here, but works for now
  // TODO: figure out a better way!
  @Input() trackColour: string = Colours.GRAY_50.asString();
  @Input() selectedTrackColour: string = Colours.YELLOW.asString();

  @Input() orientVertical: boolean = false;

  @Output() onChange = new EventEmitter();

  rampColours: string[] = [];

  private _mouseDownX: number | null = null;

  // Which range thumb adjuster the user started dragging, and what it's initial value was
  private _mouseDownAdjusterX: number = 0;
  private _mouseDownAdjustingMin: boolean = false;

  private _minMouseDown: boolean = false;
  private _maxMouseDown: boolean = false;

  private _lastPublishedMin: number | null = null;
  private _lastPublishedMax: number | null = null;
  //private _minMaxValue: MinMax = new MinMax();

  constructor() {
    for (let c = 0; c < 100; c += 5) {
      this.rampColours.push(Colours.sampleColourRamp(ColourRamp.SHADE_MAGMA, c / 100).asString());
    }
  }

  ngOnInit() {
    //this._minMaxValue = new MinMax(this.minValue, this.maxValue);

    if (this.selectedMinValue === 0 && this.selectedMaxValue === 0) {
      this.selectedMinValue = this.minValue + (this.maxValue - this.minValue) * 0.2;
      this.selectedMaxValue = this.maxValue - (this.maxValue - this.minValue) * 0.2;
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private get _minMaxValue(): MinMax {
    return new MinMax(this.minValue, this.maxValue);
  }

  get pxDisplayLength(): number {
    let len = this.pxLength;
    if (this.trackColour == "viridis") {
      len += 12; // we're drawing wider
    }
    return len;
  }

  get rangeMinXDrawPos(): number {
    const val = this._lastPublishedMin === null ? this.selectedMinValue : this._lastPublishedMin;
    return ThumbRadius + (this.pxLength - 2 * ThumbRadius) * this._minMaxValue.getAsPercentageOfRange(val, true);
  }

  get rangeMaxXDrawPos(): number {
    const val = this._lastPublishedMax === null ? this.selectedMaxValue : this._lastPublishedMax;
    return ThumbRadius + (this.pxLength - 2 * ThumbRadius) * this._minMaxValue.getAsPercentageOfRange(val, true);
  }

  onMouseDown(event: MouseEvent, isMin: boolean): void {
    event.preventDefault();

    this._mouseDownX = this.orientVertical ? -event.clientY : event.clientX;
    this._mouseDownAdjusterX = isMin ? this.rangeMinXDrawPos : this.rangeMaxXDrawPos;
    this._mouseDownAdjustingMin = isMin;

    if (isMin) {
      this.hoverMinValue = true;
      this._minMouseDown = true;
    } else {
      this.hoverMaxValue = true;
      this._maxMouseDown = true;
    }

    // Start listening
    this._subs.add(
      fromEvent(window, "mousemove").subscribe(res => {
        this.onMouseMove(res as MouseEvent);
      })
    );

    this._subs.add(
      fromEvent(window, "mouseup").subscribe(res => {
        this.onMouseUp(res as MouseEvent);
        if (isMin) {
          this.hoverMinValue = false;
          this._minMouseDown = false;
        } else {
          this.hoverMaxValue = false;
          this._maxMouseDown = true;
        }
      })
    );
  }

  onMouseMove(event: MouseEvent): void {
    if (this._mouseDownX !== null) {
      event.preventDefault();

      this.adjust(this.orientVertical ? -event.clientY : event.clientX, false);
    }
  }

  onMouseUp(event: MouseEvent): void {
    if (this._mouseDownX !== null) {
      event.preventDefault();
      this.adjust(this.orientVertical ? -event.clientY : event.clientX, true);

      // Stop listening
      this._mouseDownX = null;
      this._mouseDownAdjusterX = 0;

      this._lastPublishedMin = null;
      this._lastPublishedMax = null;

      this._subs.unsubscribe();
      this._subs = new Subscription();
    }
  }

  onMouseEnter(isMin = true): void {
    if (isMin) {
      this.hoverMinValue = true;
    } else {
      this.hoverMaxValue = true;
    }
  }
  onMouseLeave(isMin = true): void {
    if (isMin && !this._minMouseDown) {
      this.hoverMinValue = false;
    } else if (!isMin && !this._maxMouseDown) {
      this.hoverMaxValue = false;
    }
  }

  private adjust(clientX: number, finish: boolean): void {
    const currX = this._mouseDownAdjusterX;
    const offsetX = clientX - this._mouseDownX!;
    const newX = currX + offsetX;

    // Work it out in terms of the value min/max
    const newValue = this._minMaxValue.getValueForPercentageOfRange(newX / this.pxLength, true);
    let newMin = this._mouseDownAdjustingMin ? newValue : this.selectedMinValue;
    newMin = Math.round(newMin * 100) / 100;
    let newMax = !this._mouseDownAdjustingMin ? newValue : this.selectedMaxValue;
    newMax = Math.round(newMax * 100) / 100;

    if (newMin > newMax) {
      // They've become swapped, don't allow this!
      const tmp = newMin;
      newMin = newMax;
      newMax = tmp;
    }

    if (this._lastPublishedMin === newMin && this._lastPublishedMax === newMax && !finish) {
      // Don't publish same values due to mouse move jitter
      return;
    }

    this.onChange.next(new RangeSliderValue(newMin, newMax, finish));

    this._lastPublishedMin = newMin;
    this._lastPublishedMax = newMax;
  }

  get colourRatioWidthPctPixels(): number {
    const width = this.rangeMaxXDrawPos - this.rangeMinXDrawPos;
    const maxWidth = 100;
    return width > maxWidth ? maxWidth : width;
  }

  get colourRampBoxWidth(): number {
    const width = this.colourRatioWidthPctPixels / this.rampColours.length;
    const maxWidth = 100 / this.rampColours.length;
    return width > maxWidth ? maxWidth : width;
  }
}
