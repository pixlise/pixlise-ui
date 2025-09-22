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
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { SpectrumChartModel, SpectrumLineChoice, SpectrumSource } from "../../spectrum-model";
import { Colours } from "src/app/utils/colours";

@Component({
  standalone: false,
  selector: "fit-elements",
  templateUrl: "./fit-elements.component.html",
  styleUrls: ["./fit-elements.component.scss", "../spectrum-fit-container.component.scss"],
})
export class FitElementsComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();
  sources: SpectrumSource[] = [];

  constructor(private _spectrumService: SpectrumService) {}

  ngOnInit(): void {
    // Listen to what layers exist...
    this._subs.add(
      this.mdl.fitLineSources$.subscribe({
        next: () => {
          this.refresh();
        },
        //err => {}
      })
    );

    this._subs.add(
      this.mdl.fitSelectedElementZs$.subscribe(
        () => {
          this.refresh();
        },
        err => {}
      )
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private get mdl(): SpectrumChartModel {
    return this._spectrumService.mdl;
  }

  private refresh(): void {
    this.sources = [];
    const selectedElems = Array.from(this._spectrumService.mdl.fitSelectedElementZs);

    for (const src of this._spectrumService.mdl.fitLineSources) {
      const idx = selectedElems.indexOf(src.fitElementZ);
      if (idx >= 0) {
        this.sources.push(src);

        // Also remove it from selectedElems so we end up with a list of purely selected ones
        selectedElems.splice(idx, 1);
      }
    }

    // These were selected by users but NOT in the fit list, so we show them differently
    for (const Z of selectedElems) {
      const elem = periodicTableDB.getElementByAtomicNumber(Z);
      if (elem !== null) {
        this.sources.push(new SpectrumSource("", "", elem.symbol, false, null, [], false, Colours.WHITE, [], [], Z));
      }
    }

    this.sources.sort((a: SpectrumSource, b: SpectrumSource) => {
      if (a.fitElementZ < b.fitElementZ) return -1;
      if (a.fitElementZ > b.fitElementZ) return 1;
      return 0;
    });

    this.refreshShowAllKLMFlags();
  }

  private refreshShowAllKLMFlags(): void {
    // Assume true initially
    this.showAllK = true;
    this.showAllL = true;
    this.showAllM = true;

    let kCount = 0;
    let lCount = 0;
    let mCount = 0;

    for (const src of this._spectrumService.mdl.fitLineSources) {
      if (this._spectrumService.mdl.fitSelectedElementZs.indexOf(src.fitElementZ) > -1) {
        // Check if we find a K, L or M line that's not enabled
        for (const line of src.lineChoices) {
          if (line.label.endsWith("_K")) {
            kCount++;
            if (!line.enabled) {
              this.showAllK = false;
            }
          }

          if (line.label.endsWith("_L")) {
            lCount++;
            if (!line.enabled) {
              this.showAllL = false;
            }
          }

          if (line.label.endsWith("_M")) {
            mCount++;
            if (!line.enabled) {
              this.showAllM = false;
            }
          }
        }
      }
    }

    // If we didn't actually see any K, L or M, set the show all flag to false
    if (kCount <= 0) {
      this.showAllK = false;
    }
    if (lCount <= 0) {
      this.showAllL = false;
    }
    if (mCount <= 0) {
      this.showAllM = false;
    }
  }

  showAllK: boolean = false;
  showAllL: boolean = false;
  showAllM: boolean = false;

  onToggleShowAllK(): void {
    this.toggleShowAll("K");
  }

  onToggleShowAllL(): void {
    this.toggleShowAll("L");
  }

  onToggleShowAllM(): void {
    this.toggleShowAll("M");
  }

  private toggleShowAll(line: string): void {
    // Run through all and do the inverse of what our tickbox is
    let toSet = false;
    if ((line == "K" && !this.showAllK) || (line == "L" && !this.showAllL) || (line == "M" && !this.showAllM)) {
      toSet = true;
    }

    const endsWithLine = "_" + line;

    for (const src of this._spectrumService.mdl.fitLineSources) {
      // Check if we find a K, L or M line that's not enabled
      for (const line of src.lineChoices) {
        if (line.label.endsWith(endsWithLine)) {
          // NOTE: we only enable lines on line sources that are "added"!
          if (!toSet || (toSet && this._spectrumService.mdl.fitSelectedElementZs.indexOf(src.fitElementZ) > -1)) {
            line.enabled = toSet;
          }
        }
      }
    }

    if (this._spectrumService.mdl) {
      this._spectrumService.mdl.recalcFitLines();
      this.refreshShowAllKLMFlags();
    }
  }

  onToggleLine(src: SpectrumSource, line: SpectrumLineChoice): void {
    line.enabled = !line.enabled;

    if (this._spectrumService.mdl) {
      this._spectrumService.mdl.recalcFitLines();
      this.refreshShowAllKLMFlags();
    }
  }

  onDeleteSource(src: SpectrumSource): void {
    if (!this._spectrumService.mdl) {
      return;
    }

    const info = periodicTableDB.getElementOxidationState(src.roiName);
    if (!info || (!info.isElement && info.Z <= 0)) {
      return;
    }

    // Delete this element from the list of selected elements
    const selectedZs = [];
    for (const z of this._spectrumService.mdl.fitSelectedElementZs) {
      if (z != info.Z) {
        selectedZs.push(z);
      }
    }

    // Make sure the line is not enabled in sources too
    let needsRecalc = false;
    for (const src of this._spectrumService.mdl.fitLineSources) {
      if (src.fitElementZ == info.Z) {
        for (const line of src.lineChoices) {
          line.enabled = false;
          needsRecalc = true;
        }
        break;
      }
    }

    this._spectrumService.mdl.setFitSelectedElementZs(selectedZs);
    if (needsRecalc) {
      this._spectrumService.mdl.recalcFitLines();
    }
  }

  makeDisplayLabel(label: string): string {
    const pos = label.indexOf("_");
    if (pos <= 0) {
      return label;
    }
    return label.substring(pos + 1);
  }

  getPadding(src: SpectrumSource, before: boolean): number[] {
    // If it's not one we have a fit for, we don't set the colour in it
    // so this is a quick way to tell
    if (src.colourRGBA == null || src.lineChoices.length <= 0) {
      return []; // Don't force gaps here!
    }

    // Check what the lines start with - some may not have K lines, or M lines, so we have
    // to provide padding before AND after
    let gaps = 0;

    if (before) {
      const line = this.makeDisplayLabel(src.lineChoices[0].label);
      if (line == "L") {
        gaps = 1;
      } else if (line == "M") {
        gaps = 2;
      }
    } else {
      const line = this.makeDisplayLabel(src.lineChoices[src.lineChoices.length - 1].label);
      if (line == "K") {
        gaps = 2;
      } else if (line == "L") {
        gaps = 1;
      }
    }

    return Array(gaps).fill(0);
  }

  onHover(lineExpr: string) {
    if (this._spectrumService.mdl) {
      this._spectrumService.mdl.darkenOtherLines(lineExpr);
    }
  }

  onHoverFinish() {
    if (this._spectrumService.mdl) {
      this._spectrumService.mdl.darkenOtherLines("");
    }
  }
}
