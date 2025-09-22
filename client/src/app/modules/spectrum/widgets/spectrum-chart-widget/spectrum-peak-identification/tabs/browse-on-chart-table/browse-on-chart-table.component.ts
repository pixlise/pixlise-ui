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

import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from "@angular/core";
import { Subscription } from "rxjs";
import { ElementTileState } from "src/app/modules/pixlisecore/components/atoms/periodic-table/element-tile/element-tile.component";
import { SpectrumService } from "src/app/modules/spectrum/services/spectrum.service";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { XRFLine } from "src/app/periodic-table/XRFLine";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { ISpectrumChartModel } from "../../../spectrum-model-interface";

@Component({
  standalone: false,
  selector: "browse-on-chart-table",
  templateUrl: "./browse-on-chart-table.component.html",
  styleUrls: ["./browse-on-chart-table.component.scss"],
})
export class BrowseOnChartTableComponent implements OnInit, OnDestroy {
  private subs = new Subscription();

  @ViewChildren("foundLineRow") foundLineElements: QueryList<ElementRef> = new QueryList<ElementRef>();

  scrolledToeV: number = -1; // was null
  highlightElementLookup = new Set<number>();
  private _lineGroups: XRFLineGroup[] = [];
  foundLines: XRFLine[] = [];

  constructor(private _spectrumService: SpectrumService) {}

  ngOnInit() {
    this.subs.add(
      this.mdl.xrfLinesChanged$.subscribe(() => {
        this._lineGroups = Array.from(this.mdl.xrfLinesPicked);
        this.highlightElementLookup.clear();
        for (const line of this._lineGroups) {
          this.highlightElementLookup.add(line.atomicNumber);
        }
      })
    );
    this.subs.add(
      this.mdl.xrfNearMouseChanged$.subscribe(() => {
        const linesNearMouse = this.mdl.xrfNearMouse;
        if (!linesNearMouse) {
          return;
        }
        // Only update lines if they've actualy changed, otherwise this is quite slow
        if (
          this.foundLines.length <= 0 ||
          linesNearMouse.lines.length <= 0 ||
          this.foundLines.length != linesNearMouse.lines.length ||
          this.foundLines[0].eV != linesNearMouse.lines[0].eV
        ) {
          this.foundLines = linesNearMouse.lines;
        }
        // Set our table scroll position
        this.setMouseEnergy(linesNearMouse.keV);
      })
    );
  }

  ngOnDestroy() {
    // Ensure we get deleted
    this.subs.unsubscribe();
  }

  get mdl(): ISpectrumChartModel {
    return this._spectrumService.mdl;
  }

  private setMouseEnergy(keV: number): void {
    // We're pointing at some keV value and want that to be visible in the foundLines table. Firstly, find the nearest foundLine
    // entry for this keV
    if (this.foundLineElements) {
      const elems = this.foundLineElements.toArray();
      if (elems && elems.length > 0 && this.foundLines.length > 0) {
        //console.log('keV pointed to changed: '+keV+', elems length: '+elems.length+', foundLines length: '+this.foundLines.length);
        let lowestkeVDiff = Math.abs(keV - this.foundLines[0].eV / 1000);

        let lowestkeVDiffIdx = 0;
        for (let c = 1; c < this.foundLines.length; c++) {
          const line = this.foundLines[c];

          const diff = Math.abs(keV - line.eV / 1000);

          if (diff < lowestkeVDiff) {
            lowestkeVDiffIdx = c;
            lowestkeVDiff = diff;

            // TODO: this should be in keV order, so we can terminate if the diff starts growing!
          }
        }

        // Scroll to this item in the table (centered)
        this.scrolledToeV = this.foundLines[lowestkeVDiffIdx].eV;

        // Guard against race condition where nativeElement not created yet
        if (elems[lowestkeVDiffIdx]) {
          elems[lowestkeVDiffIdx].nativeElement.scrollIntoView({
            behavior: "auto",
            block: "center",
            inline: "center",
          });
        }
      }
    }
  }

  onAddFoundLine(symbol: string, siegbahn: string): void {
    //let lineToAdd = siegbahn.startsWith("Esc-") ? "Esc" : siegbahn[0];

    // Find the element by symbol
    const elem = periodicTableDB.getElementBySymbol(symbol);
    if (!elem) {
      console.error("Failed to find element info for symbol: " + symbol);
      return;
    }

    this.mdl.pickXRFLine(elem.Z);
  }

  getElementState(line: XRFLine): ElementTileState {
    if (this.highlightElementLookup.has(line.atomicNumber)) {
      // For highlighting elements in "Browse on chart" tab, we return true if it's in the list of chosen elements in XRF Line Groups list
      return ElementTileState.SELECTED;
    }

    if (line.intensity < 0.05) {
      return ElementTileState.GRAYED;
    }

    return ElementTileState.STATIC;
  }

  // Determines if line background should be highlighted in the "Browse on chart" tab, currently done if it's the most intense K/L/M line of that element
  isHighlightLine(line: XRFLine): boolean {
    return line.tags.length > 0;
  }

  isScrolledToRow(line: XRFLine): boolean {
    return this.scrolledToeV == line.eV;
  }
}
