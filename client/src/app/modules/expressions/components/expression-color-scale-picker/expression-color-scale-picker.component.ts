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

import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { ExpressionDisplaySettings } from "src/app/generated-protos/expressions";
import { ExpressionsService } from "src/app/modules/expressions/services/expressions.service";
import { ColourRamp, Colours } from "src/app/utils/colours";

export type ColourRampSelection = {
  colorScale: ColourRamp;
  startColor: string;
  endColor: string;
  background: string;
  steps: string[];
};

@Component({
  selector: "expression-color-scale-picker",
  templateUrl: "./expression-color-scale-picker.component.html",
  styleUrls: ["./expression-color-scale-picker.component.scss"],
})
export class ExpressionColorScalePickerComponent implements OnInit, OnDestroy {
  private _id: string = "";

  private _subs = new Subscription();

  selectedColorScale: ColourRampSelection = this._getColorRampSelection(ColourRamp.SHADE_MAGMA);
  static MONO_COLOR_SCALES = [
    ColourRamp.SHADE_MONO_GRAY,
    ColourRamp.SHADE_MONO_RED,
    ColourRamp.SHADE_MONO_GREEN,
    ColourRamp.SHADE_MONO_PURPLE,
    ColourRamp.SHADE_MONO_FULL_BLUE,
  ];

  static VIRIDIS_COLOR_SCALE = [ColourRamp.SHADE_VIRIDIS, ColourRamp.SHADE_MAGMA, ColourRamp.SHADE_INFERNO];

  public monoColorScales = ExpressionColorScalePickerComponent.MONO_COLOR_SCALES.map(colorScale => this._getColorRampSelection(colorScale));
  public viridisColorScales = ExpressionColorScalePickerComponent.VIRIDIS_COLOR_SCALE.map(colorScale => this._getColorRampSelection(colorScale));

  constructor(public expressionsSerivce: ExpressionsService) {}

  ngOnInit(): void {
    this._subs.add(
      this.expressionsSerivce.getUserExpressionDisplaySettings(this.id).subscribe(settings => {
        if (settings) {
          this.selectedColorScale = this._getColorRampSelection(settings.colourRamp as ColourRamp);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get id(): string {
    return this._id;
  }

  @Input() set id(id: string) {
    this._id = id;
    this._subs.add(
      this.expressionsSerivce.getUserExpressionDisplaySettings(id).subscribe(settings => {
        if (settings) {
          this.selectedColorScale = this._getColorRampSelection(settings.colourRamp as ColourRamp);
        }
      })
    );
  }

  private _getColorRampSelection(colorScale: ColourRamp): ColourRampSelection {
    const startColor = Colours.sampleColourRamp(colorScale, 0).asString();
    const midColor = Colours.sampleColourRamp(colorScale, 0.5).asString();
    const endColor = Colours.sampleColourRamp(colorScale, 1).asString();

    let background = `linear-gradient(90deg, ${startColor}, ${midColor}, ${endColor})`;

    let steps: string[] = [];

    let totalSteps = 15;
    for (let i = 0; i <= totalSteps; i++) {
      const color = Colours.sampleColourRamp(colorScale, i / totalSteps).asString();
      steps.push(color);
    }

    return { colorScale, startColor, endColor, background, steps };
  }

  onSelectColorScale(colourRampSelection: ColourRampSelection): void {
    this.expressionsSerivce.writeUserExpressionDisplaySettings(
      ExpressionDisplaySettings.create({
        id: this.id,
        colourRamp: colourRampSelection.colorScale,
      })
    );

    this.selectedColorScale = colourRampSelection;
  }
}
