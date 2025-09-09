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

import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from "@angular/core";
import { Subscription } from "rxjs";
import { setsEqual } from "src/app/utils/utils";
import { ElementTileClickEvent, ElementTileState, PeriodicElement } from "./element-tile/element-tile.component";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { MinMax } from "src/app/models/BasicTypes";

@Component({
  standalone: false,
  selector: "periodic-table",
  templateUrl: "./periodic-table.component.html",
  styleUrls: ["./periodic-table.component.scss"],
})
export class PeriodicTableComponent implements OnInit, OnDestroy, OnChanges {
  private _subs = new Subscription();

  @Input() detectorConfigZRange: MinMax = new MinMax(periodicTableDB.zSodium, periodicTableDB.zUranium);

  @Input() selectedElements: Set<number> = new Set<number>(); // Shown as selected (purple)
  @Input() selectedAltElements: Set<number> = new Set<number>(); // Shown as selected (yellow)
  @Input() onlyAllowSelectableItems: boolean = false; // allow anything
  @Input() grayedElements: number[] = [periodicTableDB.zTechnetium]; // Gray out technetium, not a stable isotope
  @Input() darkerSelectableElements: Set<number> = new Set<number>(); // Work just like normal elements but have a darkened background
  @Input() tooltipExtraForDarkerSelectable: string = ""; // Tooltip to explain why these are darker

  @Output() onElementClicked = new EventEmitter();
  @Output() onElementHover = new EventEmitter();

  mainTable: (PeriodicElement | null)[][] = [];
  lanthanoids: PeriodicElement[] = [];
  actinoids: PeriodicElement[] = [];

  // Remember so we can rebuild less frequently if this hasn't changed
  private _lastSelectedElements: Set<number> = new Set<number>();
  private _lastSelectedAltElements: Set<number> = new Set<number>();
  private _grayedElementLookup: Set<number> = new Set<number>();

  constructor() {}

  ngOnInit() {
    this.rebuild();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Inputs may have changed, but if we just call rebuild things get slow
    // so we really only care about the things that change element tile states
    if (!setsEqual(this._lastSelectedElements, this.selectedElements) || !setsEqual(this._lastSelectedAltElements, this.selectedAltElements)) {
      // Run through all items and set their state
      const tables: (PeriodicElement | null)[][] = [...this.mainTable, this.lanthanoids, this.actinoids];
      for (const table of tables) {
        for (const item of table) {
          if (item && item.element.Z > 0) {
            item.state = this.getState(item.element.Z);
          }
        }
      }

      this._lastSelectedElements = this.selectedElements;
      this._lastSelectedAltElements = this.selectedAltElements;
    }
    // If grayed list changes, rebuild
    else {
      const grayed = changes["grayedElements"];
      if (grayed) {
        this.rebuild();
      }

      const darker = changes["darkerSelectableElements"];
      if (darker) {
        this.rebuild();
      }
    }
  }

  private rebuild(): void {
    const minZ = this.detectorConfigZRange.min || periodicTableDB.zSodium;
    const maxZ = this.detectorConfigZRange.max || periodicTableDB.zUranium;

    this.makeGrayedLookup(minZ, maxZ);
    this.buildTable();
  }

  onTileClicked(event: ElementTileClickEvent): void {
    // If it's selected, we always want to allow unselecting...
    //let state = this.getState(event.atomicNumber);
    //if(state==ElementTileState.PICKED || this.isSelectable(event.atomicNumber))

    // We don't ship mouse events for grayed elements
    if (!this._grayedElementLookup.has(event.atomicNumber)) {
      this.onElementClicked.emit(event);
    }
  }

  onTileHover(atomicNumber: number): void {
    // We don't ship mouse events for grayed elements
    if (!this._grayedElementLookup.has(atomicNumber)) {
      this.onElementHover.emit(atomicNumber);
    }
  }

  onMouseLeave(): void {
    // Switch off hover
    this.onElementHover.emit(0);
  }

  private buildTable(): void {
    this.mainTable = [];
    this.lanthanoids = [];
    this.actinoids = [];

    // Build the structure

    // Just get a list of element atomic numbers
    const element: PeriodicElement[] = [];
    for (let c = 1; c <= periodicTableDB.maxAtomicNumber; c++) {
      const elemItem = periodicTableDB.getElementByAtomicNumber(c);
      if (elemItem) {
        const elem = new PeriodicElement(elemItem, this.getState(c));

        if (elem.state == ElementTileState.NORMAL2) {
          elem.tooltipExtra = this.tooltipExtraForDarkerSelectable;
        }

        element.push(elem);
      }
    }

    // Row 1
    let row: (PeriodicElement | null)[] = [];
    row.push(element[0]);
    for (let c = 0; c < 16; c++) {
      row.push(null); // Large gap at the top of the table
    }
    row.push(element[1]);

    this.mainTable.push(row);

    // Row 2 & 3
    let pos = 2;
    for (let repeat = 0; repeat < 2; repeat++) {
      row = [element[pos++], element[pos++]];
      for (let c = 0; c < 10; c++) {
        row.push(null); // Gap at the top of the table
      }
      for (let c = 0; c < 6; c++) {
        row.push(element[pos++]);
      }

      this.mainTable.push(row);
    }

    // 2 solid rows now
    for (let repeat = 0; repeat < 2; repeat++) {
      row = [];
      for (let c = 0; c < 18; c++) {
        row.push(element[pos++]);
      }

      this.mainTable.push(row);
    }

    // 2 rows where we skip one
    for (let repeat = 0; repeat < 2; repeat++) {
      row = [element[pos++], element[pos++]];
      row.push(null); // Gap where we skip 1

      for (let c = 0; c < 15; c++) {
        if (repeat == 0) {
          this.lanthanoids.push(element[pos++]);
        } else {
          this.actinoids.push(element[pos++]);
        }
      }

      for (let c = 0; c < 15; c++) {
        row.push(element[pos++]);
      }

      this.mainTable.push(row);
    }
  }

  private getState(atomicNumber: number): ElementTileState {
    if (atomicNumber) {
      // Look up what state it's in
      if (this._grayedElementLookup.has(atomicNumber)) {
        return ElementTileState.GRAYED;
      }

      // Check this first in case it exists in both
      if (this.selectedAltElements && this.selectedAltElements.has(atomicNumber)) {
        return ElementTileState.SELECTED2;
      }

      if (this.selectedElements && this.selectedElements.has(atomicNumber)) {
        return ElementTileState.SELECTED;
      }

      if (this.darkerSelectableElements.has(atomicNumber)) {
        return ElementTileState.NORMAL2;
      }
    }

    return ElementTileState.NORMAL;
  }
  /*
    private isSelectable(atomicNumber: number): boolean
    {
        if(!atomicNumber)
        {
            // Can never select a blank placeholder tile!
            return false;
        }

        if(!this.onlyAllowSelectableItems)
        {
            // Not restricted to only "non-grayed", so anything goes
            return true;
        }

        // If it's not grayed, it's selecetable
        return !this._grayedElementLookup.has(atomicNumber);
    }
*/
  private makeGrayedLookup(minElementZ: number, maxElementZ: number): void {
    this._grayedElementLookup.clear();

    // Gray out anything < sodium, because PIXL can't detect it
    for (let c = 1; c < minElementZ; c++) {
      this._grayedElementLookup.add(c);
    }

    // Any grayed elements specified by caller are added here
    for (const elem of this.grayedElements) {
      this._grayedElementLookup.add(elem);
    }

    // Gray out ~93+
    // TODO: make this read from detector config
    for (let c = maxElementZ + 1; c <= periodicTableDB.maxAtomicNumber; c++) {
      this._grayedElementLookup.add(c);
    }
  }
}
