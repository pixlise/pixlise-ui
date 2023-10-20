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
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { XRFLineGroup } from "src/app/periodic-table/XRFLineGroup";
import { TabSelectors } from "../tab-selectors";
import { ElementTileClickEvent } from "src/app/modules/pixlisecore/components/atoms/periodic-table/element-tile/element-tile.component";
import { ISpectrumChartModel } from "../../spectrum-model-interface";
import { SpectrumService } from "src/app/modules/spectrum/services/spectrum.service";
import { XRFDatabaseService } from "src/app/services/xrf-database.service";
import { MinMax } from "src/app/models/BasicTypes";

@Component({
  selector: TabSelectors.tabPeriodicTable,
  templateUrl: "./periodic-table-tab.component.html",
  styleUrls: ["./periodic-table-tab.component.scss"],
})
export class PeriodicTableTabComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  selectedElements = new Set<number>();
  lineGroups: XRFLineGroup[] = [];
  detectorConfigZRange: MinMax = new MinMax(periodicTableDB.zSodium, periodicTableDB.zUranium);

  // Removed when trying to fix #1182. The comment about ExpressionChangedAfterItHasBeenCheckedError seems no longer relevant
  // but can't determine why randomly and rarely periodic table doesn't show up at all. If loading==true is left on, that's
  // one reason for it. Otherwise all subscriptions involved seem to be ReplaySubjects so should always do something!
  //loading: boolean = false;

  constructor(
    private _spectrumService: SpectrumService,
    private _xrfDBService: XRFDatabaseService
  ) {}

  ngOnInit() {
    //this.loading = true; // This is a workaround for ExpressionChangedAfterItHasBeenCheckedError on pickedElements

    if (!this.mdl) {
      return;
    }

    this._subs.add(
      this.mdl.xrfLinesChanged$.subscribe(() => {
        //this.loading = false;

        // Specifically creating a new Set here to trigger change detection, so periodic table knows to update
        this.selectedElements = new Set<number>();
        for (const line of this.mdl.xrfLinesPicked) {
          this.selectedElements.add(line.atomicNumber);
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private get mdl(): ISpectrumChartModel {
    return this._spectrumService.mdl;
  }

  onElementClicked(event: ElementTileClickEvent): void {
    if (!this.mdl) {
      return;
    }

    if (event.atomicNumber < 1) {
      // It's a spacer tile in a gap between actual elements on table... ignore
      return;
    }

    const element = periodicTableDB.getElementByAtomicNumber(event.atomicNumber);
    if (!element) {
      console.error("Invalid element: " + event.atomicNumber);
      return;
    }

    // If picked already, delete
    // Otherwise add to picked list
    if (this.mdl.isPickedXRFLine(event.atomicNumber)) {
      this.mdl.unpickXRFLine(event.atomicNumber);
    } else {
      this.mdl.pickXRFLine(event.atomicNumber);
    }
  }

  onElementHover(atomicNumber: number): void {
    if (!this.mdl) {
      return;
    }

    // Save its lines to chart hover state for drawing (these are drawn in a different colour, every other
    // line gets dimmed)
    let group: XRFLineGroup | null = null;

    if (atomicNumber > 0 && this.mdl.activeXRFDB) {
      group = XRFLineGroup.makeFromAtomicNumber(atomicNumber, this.mdl.activeXRFDB);
    }

    this.mdl.xrfLinesHighlighted = group;
  }

  onClear() {
    if (this.mdl) {
      this.mdl.xrfLinesPicked = [];
    }
  }
}
