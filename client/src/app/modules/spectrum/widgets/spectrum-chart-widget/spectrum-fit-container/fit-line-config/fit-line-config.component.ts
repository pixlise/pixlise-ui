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

import { Component, OnDestroy, OnInit } from "@angular/core";
import { Subscription } from "rxjs";
import { SpectrumService } from "src/app/modules/spectrum/services/spectrum.service";
import { SpectrumChartModel, SpectrumLineChoice, SpectrumSource } from "../../spectrum-model";

@Component({
  selector: "fit-line-config",
  templateUrl: "./fit-line-config.component.html",
  styleUrls: ["./fit-line-config.component.scss", "../spectrum-fit-container.component.scss"],
})
export class FitLineConfigComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();
  sources: SpectrumSource[] = [];

  constructor(private _spectrumService: SpectrumService) {}

  ngOnInit(): void {
    // Listen to what layers exist...
    this._subs.add(
      this.mdl.fitLineSources$.subscribe(
        () => {
          const interestingSources = [
            SpectrumChartModel.fitMeasuredSpectrum,
            SpectrumChartModel.fitCaclulatedTotalSpectrum,
            SpectrumChartModel.fitResiduals,
            SpectrumChartModel.fitBackground,
            SpectrumChartModel.fitPileupPeaks,
          ]; // In this order, too!!!

          this.sources = [];

          const srcs = new Map<string, SpectrumSource>();
          for (const src of this._spectrumService.mdl.fitLineSources) {
            // We are only interested in some of them...
            if (interestingSources.indexOf(src.roiName) > -1) {
              srcs.set(src.roiName, src);
            }
          }

          // Add them in order
          for (const name of interestingSources) {
            const src = srcs.get(name);
            if (src) {
              this.sources.push(src);
            }
          }
        },
        err => {}
      )
    );
  }

  private get mdl(): SpectrumChartModel {
    return this._spectrumService.mdl;
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get measuredName(): string {
    return SpectrumChartModel.fitMeasuredSpectrum;
  }

  onHoverSpectrum(src: SpectrumSource): void {
    // If there is only one line, it's easy... otherwise we only hover if user points to the actual line
    if (src.lineChoices.length != 1) {
      // Do nothing here, it may be handled by an individual line checkbox hover in onHoverSpectrumLine()
      //this._spectrumService.mdl.setSpectrumLineDarken([]);
      return;
    }

    this.onHoverSpectrumLine(src, src.lineChoices[0]);
  }

  onHoverSpectrumLine(theSrc: SpectrumSource | null, line: SpectrumLineChoice): void {
    if (!line.enabled) {
      this._spectrumService.mdl.setSpectrumLineDarken([]);
      return;
    }

    // Run through all lines we have, darken them all except this one
    let lineExprs = [];
    let exprFound = false;
    for (const src of this.sources) {
      for (const srcLines of src.lineChoices) {
        if (srcLines.enabled) {
          if (srcLines.lineExpression != line.lineExpression) {
            lineExprs.push(srcLines.lineExpression);
          } else {
            exprFound = true;
          }
        }
      }
    }

    // If the line we're hovering over is not found to be a visible line, we don't darken anything
    if (!exprFound) {
      lineExprs = [];
    }

    this._spectrumService.mdl.setSpectrumLineDarken(lineExprs);
  }

  onToggleLine(line: SpectrumLineChoice): void {
    line.enabled = !line.enabled;

    // Force a refresh
    if (this._spectrumService.mdl) {
      // NOTE: We just toggled it so are hovering by definition... check the hover situation and this will force a refresh anyway
      this.onHoverSpectrumLine(null, line);
    }
  }

  getMeasuredOpacity(src: SpectrumSource): number {
    // It's the first line in this source...
    if (src.lineChoices.length == 1) {
      return src.lineChoices[0].opacity;
    }
    return 0.0;
  }

  onChangeMeasuredOpacity(src: SpectrumSource, event: any): void {
    // It's the first line in this source...
    if (src.lineChoices.length == 1) {
      src.lineChoices[0].opacity = event.value;
    }

    // Force a refresh
    if (event.finish && this._spectrumService.mdl) {
      this._spectrumService.mdl.recalcSpectrumLines();
    }
  }

  onHoverFinish(): void {
    this._spectrumService.mdl.setSpectrumLineDarken([]);
  }

  getColourClass(src: SpectrumSource): string[] {
    // Hard-coded colours per line
    switch (src.roiName) {
      case SpectrumChartModel.fitBackground:
        return ["colour-purple"];
      case SpectrumChartModel.fitPileupPeaks:
        return ["colour-pink"];
      case SpectrumChartModel.fitResiduals:
        return ["colour-blue"];
      case SpectrumChartModel.fitCaclulatedTotalSpectrum:
        return ["colour-orange"];
    }
    return [];
  }

  getLineLabel(label: string): string {
    // We strip out "Background " from the start, this still appears on the
    // spectrum line name (in the chart key) but is redundant for the checkbox
    const bg = "Background ";
    if (label.startsWith(bg)) {
      return label.substring(bg.length);
    }
    return label;
  }
}
