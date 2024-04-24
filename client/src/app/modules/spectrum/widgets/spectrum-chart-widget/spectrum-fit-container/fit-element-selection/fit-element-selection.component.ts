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
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { ElementTileClickEvent } from "src/app/modules/pixlisecore/components/atoms/periodic-table/element-tile/element-tile.component";
import { SpectrumChartModel } from "../../spectrum-model";

@Component({
  selector: "fit-element-selection",
  templateUrl: "./fit-element-selection.component.html",
  styleUrls: ["./fit-element-selection.component.scss", "../spectrum-fit-container.component.scss"],
})
export class FitElementSelectionComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  selectedElements = new Set<number>();
  selectedAltElements = new Set<number>();
  darkerSelectableElements = new Set<number>();
  unselectableElements: number[] = [periodicTableDB.zTechnetium];

  lineGroups: XRFLineGroup[] = [];

  // Removed when trying to fix #1182. The comment about ExpressionChangedAfterItHasBeenCheckedError seems no longer relevant
  // but can't determine why randomly and rarely periodic table doesn't show up at all. If loading==true is left on, that's
  // one reason for it. Otherwise all subscriptions involved seem to be ReplaySubjects so should always do something!
  //loading: boolean = false;

  constructor(private _spectrumService: SpectrumService) {}

  ngOnInit(): void {
    // Run rebuild for now anyway (we may not have fit stuff at all)
    this.rebuildPeriodicTable();

    // Listen to what layers exist...
    this._subs.add(
      this.mdl.fitLineSources$.subscribe(
        () => {
          this.rebuildPeriodicTable();
        },
        err => {}
      )
    );

    this._subs.add(
      this.mdl.fitSelectedElementZs$.subscribe(
        () => {
          this.rebuildPeriodicTable();
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

  private rebuildPeriodicTable(): void {
    if (!this._spectrumService.mdl) {
      return;
    }

    const fittedZs = new Set<number>();
    const selectedFittedZs = new Set<number>();
    const selectedNonFittedZs = new Set<number>();
    const nonfittedZs = new Set<number>();

    // Fill the above sets
    for (const src of this._spectrumService.mdl.fitLineSources) {
      // If the label is an element, we know to NOT gray this item
      if (src.fitElementZ > 0) {
        fittedZs.add(src.fitElementZ);
      }
    }

    for (const z of this._spectrumService.mdl.fitSelectedElementZs) {
      // Check if it's one of the fitted lines, add to the right set
      if (fittedZs.has(z)) {
        selectedFittedZs.add(z);
      } else {
        selectedNonFittedZs.add(z);
      }
    }

    // Get the rest (non-fitted, non-selected) and mark these with the darker background
    for (let c = periodicTableDB.zSodium; c <= periodicTableDB.zUranium; c++) {
      if (c != periodicTableDB.zTechnetium && !fittedZs.has(c) && !selectedNonFittedZs.has(c)) {
        nonfittedZs.add(c);
      }
    }

    // Now set these in the periodic table data so they get the right shading
    this.selectedElements = selectedNonFittedZs; // NON-fitted selected elements are purple
    this.selectedAltElements = selectedFittedZs; // Fitted selected elements are yellow
    this.darkerSelectableElements = nonfittedZs; // Fitted elements (if not selected and yellow) are drawn in darker form

    // Set this last because it will trigger a periodic table rebuild... or will it?
    this.unselectableElements = [periodicTableDB.zTechnetium]; // Totally grayed out unselectable (only technetium!)
  }

  onElementClicked(event: ElementTileClickEvent): void {
    if (!this._spectrumService.mdl) {
      return;
    }

    if (event.atomicNumber < 1) {
      // It's a spacer tile in a gap between actual elements on table... ignore
      return;
    }

    let needsRecalc = false;

    // Toggle this atomic number existing in the list of fit selected elements
    const selectedZs = Array.from(this._spectrumService.mdl.fitSelectedElementZs);
    const idx = selectedZs.indexOf(event.atomicNumber);
    if (idx < 0) {
      // It's not in there, so add it
      selectedZs.push(event.atomicNumber);

      // We just added one to the list, if it's got fit lines already, show them all
      for (const src of this._spectrumService.mdl.fitLineSources) {
        if (src.fitElementZ == event.atomicNumber) {
          for (const line of src.lineChoices) {
            line.enabled = true;
            needsRecalc = true;
          }
          break;
        }
      }
    } else {
      // Was already selected, remove it
      selectedZs.splice(idx, 1);

      // If we had this as a source, recalc
      for (const src of this._spectrumService.mdl.fitLineSources) {
        if (src.fitElementZ == event.atomicNumber) {
          // Disable all its sub-lines
          needsRecalc = true;
          for (const line of src.lineChoices) {
            line.enabled = false;
          }
          break;
        }
      }
    }

    this._spectrumService.mdl.setFitSelectedElementZs(selectedZs);
    if (needsRecalc) {
      this._spectrumService.mdl.recalcSpectrumLines();
    }
  }

  onElementHover(atomicNumber: number): void {
    if (!this.mdl.activeXRFDB) {
      return;
    }
    // Save its lines to chart hover state for drawing (these are drawn in a different colour, every other
    // line gets dimmed)
    let group: XRFLineGroup | null = null;

    if (atomicNumber > 0) {
      group = XRFLineGroup.makeFromAtomicNumber(atomicNumber, this.mdl.activeXRFDB);
    }

    this._spectrumService.mdl.xrfLinesHighlighted = group;
  }

  onClear() {
    this._spectrumService.mdl.xrfLinesPicked = [];
  }
}
