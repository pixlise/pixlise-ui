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

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { fromEvent, Subscription } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
import { Colours } from "src/app/utils/colours";

export class SliderValue {
  constructor(
    public value: number,
    public finish: boolean
  ) {}
}

const ThumbRadius = 6;

class SliderHistogramBar {
  constructor(
    public x: number,
    public h: number
  ) {}
}

@Component({
  selector: "slider",
  templateUrl: "./slider.component.html",
  styleUrls: ["./slider.component.scss"],
})
export class SliderComponent implements OnInit {
  private _subs = new Subscription();

  @Input() value: number = 0;
  @Input() minValue: number = 0;
  @Input() maxValue: number = 100;

  @Input() pxLength: number = 86;

  @Input() histogramPctValues: number[] = [];

  // Ugly doing visual config through code here, but works for now
  // TODO: figure out a better way!
  @Input() trackColourBelowValue: string = Colours.YELLOW.asString(); //Colours.GRAY_50.asString();
  @Input() trackColourAboveValue: string = Colours.GRAY_50.asString(); //Colours.GRAY_30.asString();
  @Input() histogramBarBelowValue: string = Colours.GRAY_60.asString();

  @Output() onChange = new EventEmitter();

  private _mouseDownX: number = null;
  private _mouseSliderX: number = null;
  private _lastPublished: number = null;
  private _minMaxValue: MinMax = null;

  barWidth: number = 0;
  histogram: SliderHistogramBar[] = [];
  baselineY: number = 15;

  constructor() {}

  ngOnInit() {
    this._minMaxValue = new MinMax(this.minValue, this.maxValue);

    if (this.histogramPctValues.length > 0) {
      // We move the rest of the slider down a bit
      this.baselineY = 22;

      const endPadding = 6; // radius of slider thingy
      const lastPos = this.pxLength - endPadding;

      let barHeight = 20;
      this.barWidth = Math.floor((lastPos - endPadding) / this.histogramPctValues.length);

      let x = endPadding;
      for (let histVal of this.histogramPctValues) {
        if (histVal > 0) {
          this.histogram.push(new SliderHistogramBar(x, Math.ceil(histVal * barHeight)));
        }
        x += this.barWidth;
      }
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get sliderXPos(): number {
    return ThumbRadius + (this.pxLength - 2 * ThumbRadius) * this._minMaxValue.getAsPercentageOfRange(this.value, false);
  }

  get sliderRightTrackWidth(): number {
    let w = this.pxLength - 12 - this.sliderXPos + 2;
    if (w < 0) {
      w = 0;
    }
    return w;
  }

  onMouseDown(event): void {
    //console.log('onMouseDown');
    event.preventDefault();

    this._mouseDownX = event.clientX;
    this._mouseSliderX = this.sliderXPos;

    // Start listening
    this._subs.add(
      fromEvent(window, "mousemove")
        //.throttleTime(30) // throttle time in ms, optional
        .subscribe(res => {
          this.onMouseMove(res);
        })
    );

    this._subs.add(
      fromEvent(window, "mouseup")
        //.throttleTime(30) // throttle time in ms, optional
        .subscribe(res => {
          this.onMouseUp(res);
        })
    );
  }

  //@HostListener('window:mousemove', ['$event'])
  onMouseMove(event): void {
    //console.log('onMouseMove');
    if (this._mouseDownX !== null) {
      event.preventDefault();

      this.adjust(event.clientX, false);
    }
  }

  //@HostListener('window:mouseup', ['$event'])
  onMouseUp(event): void {
    //console.log('onMouseUp');
    if (this._mouseDownX !== null) {
      event.preventDefault();

      this.adjust(event.clientX, true);

      // Stop listening
      this._mouseDownX = null;
      this._mouseSliderX = null;

      this._subs.unsubscribe();
      this._subs = new Subscription();
    }
  }

  private adjust(clientX: number, finish: boolean): void {
    let currX = this._mouseSliderX;
    let offsetX = clientX - this._mouseDownX;
    let newX = currX + offsetX;

    // Work it out in terms of the value min/max
    let newValue = this._minMaxValue.getValueForPercentageOfRange(newX / this.pxLength, true);

    if (this._lastPublished === newValue && !finish) {
      // Don't publish same values due to mouse move jitter
      return;
    }

    this.onChange.next(new SliderValue(newValue, finish));
    this._lastPublished = newValue;
  }
}
