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

import { Component, Inject, OnInit } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { RGBUAxisUnit } from "../rgbu-plot-data";
import { MinMax } from "src/app/models/BasicTypes";

export type RatioPickerData = {
  axis: RGBUAxisUnit;
  range: MinMax;
};

@Component({
  selector: "app-rgbuaxis-ratio-picker",
  templateUrl: "./rgbuaxis-ratio-picker.component.html",
  styleUrls: ["./rgbuaxis-ratio-picker.component.scss"],
})
export class RGBUAxisRatioPickerComponent implements OnInit {
  numeratorChannel: string = "";
  denominatorChannel: string = "";

  channels: string[] = ["Near-IR", "Green", "Blue", "UV"];
  channelsWithNone: string[] = ["Near-IR", "Green", "Blue", "UV", "None"];

  valueRange: MinMax = new MinMax(0, 1);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RatioPickerData,
    public dialogRef: MatDialogRef<RGBUAxisRatioPickerComponent>
  ) {}

  ngOnInit(): void {
    if (this.data) {
      if (this.data.axis) {
        if (this.data.axis.numeratorChannelIdx >= 0) {
          this.numeratorChannel = this.channels[this.data.axis.numeratorChannelIdx];
        }
        if (this.data.axis.denominatorChannelIdx >= 0) {
          this.denominatorChannel = this.channelsWithNone[this.data.axis.denominatorChannelIdx];
        }
      }

      if (this.data.range) {
        this.valueRange = this.data.range;
      }
    }
  }

  get minValue(): number {
    return this.valueRange.min!;
  }
  set minValue(value: number) {
    this.valueRange = new MinMax(value, this.valueRange.max);
  }

  get maxValue(): number {
    return this.valueRange.max!;
  }
  set maxValue(value: number) {
    this.valueRange = new MinMax(this.valueRange.min, value);
  }

  onOK(): void {
    if (this.numeratorChannel == "" || this.denominatorChannel == "") {
      alert("Please configure both channel selectors");
      return;
    }

    // Form a new axis
    const axis = new RGBUAxisUnit(this.channelNameToIdx(this.numeratorChannel), this.channelNameToIdx(this.denominatorChannel));
    this.dialogRef.close({ axis, range: this.valueRange });
  }

  private channelNameToIdx(name: string): number {
    for (let c = 0; c < this.channels.length; c++) {
      if (name == this.channels[c]) {
        return c;
      }
    }

    return -1;
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }
}
