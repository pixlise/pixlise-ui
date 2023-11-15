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

import { setsEqual, arraysEqual } from "src/app/utils/utils";

// Selection of entry indexes in one or more scans

export class BeamSelection {
  // NOTE: no scan IDs in there!
  static makeEmptySelection(): BeamSelection {
    return new BeamSelection(new Map<string, Set<number>>());
  }

  static makeSelectionFromScanEntryIndexSets(idxs: Map<string, Set<number>>): BeamSelection {
    return new BeamSelection(idxs);
  }

  static makeSelectionFromScanEntryIndexes(idxs: Map<string, number[]>): BeamSelection {
    const data = new Map<string, Set<number>>();
    for (const [id, items] of idxs) {
      data.set(id, new Set<number>(items));
    }
    return new BeamSelection(data);
  }

  static makeSelectionFromSingleScanEntryIndexes(scanId: string, idxs: Set<number>): BeamSelection {
    return new BeamSelection(new Map<string, Set<number>>([[scanId, idxs]]));
  }

  private _scanEntryPMCs = new Map<string, Set<number>>();
  constructor(private _scanEntryIndexes: Map<string, Set<number>>) {}

  isEqualTo(other: BeamSelection): boolean {
    if (!arraysEqual<string>(Array.from(this._scanEntryIndexes.keys()), Array.from(other._scanEntryIndexes.keys()))) {
      return false;
    }
    for (const [id, items] of this._scanEntryIndexes) {
      const otherItems = other._scanEntryIndexes.get(id);
      if (otherItems === undefined) {
        return false;
      }
      if (!setsEqual(items, otherItems)) {
        return false;
      }
    }
    return true;
  }

  getSelectedScanEntryIndexes(scanId: string): Set<number> {
    const idxs = this._scanEntryIndexes.get(scanId);
    if (idxs === undefined) {
      // None selected...
      return new Set<number>();
    }
    return idxs;
  }

  getScanIds(): string[] {
    return Array.from(this._scanEntryIndexes.keys());
  }

  getSelectedEntryCount(): number {
    let count = 0;
    for (const items of this._scanEntryIndexes.values()) {
      count += items.size;
    }
    return count;
  }

  setScanSelectedPMCs(scanId: string, pmcs: number[]) {
    this._scanEntryPMCs.set(scanId, new Set<number>(pmcs));
  }

  getSelectedScanEntryPMCs(scanId: string): Set<number> {
    const idxs = this._scanEntryPMCs.get(scanId);
    if (idxs === undefined) {
      // None selected...
      return new Set<number>();
    }
    return idxs;
  }
}
