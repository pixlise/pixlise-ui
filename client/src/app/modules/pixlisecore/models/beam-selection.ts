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

  // Given a map of scan IDs to sets of selected PMCs, make a beam selection to hold them
  static makeSelectionFromScanEntryPMCSets(idxs: Map<string, Set<number>>): BeamSelection {
    return new BeamSelection(idxs);
  }

  private _scanEntryIndexes: Map<string, Set<number>> = new Map<string, Set<number>>();
  constructor(private _scanEntryPMCs: Map<string, Set<number>>) {}

  isEqualTo(other: BeamSelection): boolean {
    if (!arraysEqual<string>(Array.from(this._scanEntryPMCs.keys()), Array.from(other._scanEntryPMCs.keys()))) {
      return false;
    }
    for (const [id, items] of this._scanEntryPMCs) {
      const otherItems = other._scanEntryPMCs.get(id);
      if (otherItems === undefined) {
        return false;
      }
      if (!setsEqual(items, otherItems)) {
        return false;
      }
    }
    return true;
  }

  getSelectedScanEntryPMCs(scanId: string): Set<number> {
    const idxs = this._scanEntryPMCs.get(scanId);
    if (idxs === undefined) {
      // None selected...
      return new Set<number>();
    }
    return idxs;
  }

  getScanIds(): string[] {
    return Array.from(this._scanEntryPMCs.keys());
  }

  getSelectedEntryCount(): number {
    let count = 0;
    for (const items of this._scanEntryPMCs.values()) {
      count += items.size;
    }
    return count;
  }

  getSelectedScanEntryIndexes(scanId: string): Set<number> {
    const idxs = this._scanEntryIndexes.get(scanId);
    if (idxs === undefined) {
      // None selected...
      return new Set<number>();
    }
    return idxs;
  }

  setSelectedScanEntryIndexes(scanId: string, idxs: Iterable<number>) {
    this._scanEntryIndexes.set(scanId, new Set<number>(idxs));
  }

  has(scanId: string, pmc: number): boolean {
    const entries = this._scanEntryPMCs.get(scanId);
    if (!entries) {
      return false;
    }
    return entries.has(pmc);
  }
}
