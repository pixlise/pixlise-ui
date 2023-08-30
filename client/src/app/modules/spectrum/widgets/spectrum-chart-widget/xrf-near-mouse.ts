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

import { MinMax } from "src/app/models/BasicTypes";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { XRFLine } from "src/app/periodic-table/XRFLine";

export class SpectrumXRFLinesNearMouse {
  private _keV: number = 0;
  private _lastCachekeV: number = 0;
  private _lastBrowseCommonElementsXRF: boolean = false;
  private _lines: XRFLine[] = [];
  private _keVDisplayed: MinMax = new MinMax(0, 0);

  constructor() {
    this.clear();
  }

  clear(): void {
    this._keV = 0;
    this._lines = [];
    this._keVDisplayed = new MinMax(0, 0);
  }

  get keV(): number {
    return this._keV;
  }

  get lines(): XRFLine[] {
    return this._lines;
  }

  get keVDisplayed(): MinMax {
    return this._keVDisplayed;
  }

  setEnergy(keV: number, browseCommonElementsXRF: boolean): void {
    //console.warn('setEnergyAtMouse: '+keV);
    let keVTableThreshold = 0.8;
    let keVTableExtraFill = 0.2; // So we don't reach the very end of the table!

    if (browseCommonElementsXRF) {
      // For common elements, we can go a little wider
      keVTableThreshold = 4;
      keVTableExtraFill = 1;
    }

    this._keV = keV;

    // Re-fill the table if required (because last filled value is vastly different to current keV value)
    if (
      this._lastCachekeV == 0 ||
      Math.abs(this._lastCachekeV - keV) > keVTableThreshold ||
      this._lastBrowseCommonElementsXRF != browseCommonElementsXRF
    ) {
      // Yep, refill table
      console.log("Refill table for: " + keV);

      this._keVDisplayed = new MinMax(keV - (keVTableThreshold + keVTableExtraFill), keV + (keVTableThreshold + keVTableExtraFill));
      this._lines = periodicTableDB.findAllXRFLinesForEnergy(
        browseCommonElementsXRF,
        this._keVDisplayed?.min || 0,
        this._keVDisplayed?.max || 0
      );

      this._lastCachekeV = keV;
      this._lastBrowseCommonElementsXRF = browseCommonElementsXRF;
    }
  }
}
