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

import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { periodicTableDB, PeriodicTableItem } from "src/app/periodic-table/periodic-table-db";

export class PeriodicElement {
  constructor(
    public element: PeriodicTableItem,
    public state: ElementTileState,
    public tooltipExtra: string = ""
  ) {}
}

export class ElementTileClickEvent {
  constructor(
    public atomicNumber: number,
    public shiftKey: boolean
  ) {}
}

export enum ElementTileState {
  GRAYED = "GRAYED", // Non-selectable (grayed out text vs background)
  STATIC = "STATIC", // Looks the same as NORMAL but non-selectable
  NORMAL = "NORMAL", // Selectable (lighter)
  NORMAL2 = "NORMAL2", // Selectable (darker)
  SELECTED = "SELECTED", // Shows in purple
  SELECTED2 = "SELECTED2", // Shows in yellow
}

@Component({
  standalone: false,
  selector: "element-tile",
  templateUrl: "./element-tile.component.html",
  styleUrls: ["./element-tile.component.scss"],
})
export class ElementTileComponent implements OnInit {
  // Can either specify tileData
  @Input() tileData: PeriodicElement | null = null; // null indicates it's one of the empty cells in the table, eg gap between Ba and Hf

  // NOTE: Tried to remove these when refactoring to end up with just the above tileData, but element-tile is used in several places
  // as a static display of an element with the only input being an atomic number, so unfortunately these are back, but optional
  @Input() atomicNumber: number = 0;
  @Input() state: ElementTileState = ElementTileState.STATIC;

  // Outputs are mouse events
  @Output() onTileClicked = new EventEmitter();
  @Output() onTileHover = new EventEmitter();

  private _classList: string[] = [];

  ngOnInit() {
    // If we were given atomicNumber form a tileData so the rest of our operation is the same
    if (this.tileData && this.atomicNumber) {
      throw new Error("element-tile requires tileData OR atomicNumber not both");
    }

    if (!this.tileData && this.atomicNumber) {
      const elem = periodicTableDB.getElementByAtomicNumber(this.atomicNumber);
      if (elem) {
        this.tileData = new PeriodicElement(elem, this.state);
      }
    }

    // Build our list of classes that apply
    // Initially start out with nothing
    this._classList = [];
    if (this.tileData) {
      // We know that we're at least one of the element tiles...
      this._classList = ["element-tile"];

      if (this.tileData.state != ElementTileState.GRAYED && this.tileData.state != ElementTileState.STATIC) {
        this._classList.push("selectable");
      }
    }
  }

  get tooltip(): string {
    if (!this.tileData) {
      return "";
    }
    let tip = this.tileData.element.name;
    if (this.tileData.tooltipExtra) {
      tip += " - " + this.tileData.tooltipExtra;
    }
    return tip;
  }

  get classList(): string {
    const classes = Array.from(this._classList);
    if (this.tileData) {
      classes.push("state-" + this.tileData.state);
    }
    return classes.join(" ");
    /*let classes = [ "state-"+this.state ];
        let allClasses = classes.concat(this._classList);
        return allClasses.join(" ");*/
  }

  onClicked(event: MouseEvent): void {
    if (this.tileData) {
      this.onTileClicked.emit(new ElementTileClickEvent(this.tileData.element.Z, event.shiftKey));
    }
  }

  onMouseOver(event: MouseEvent): void {
    // If we're not selectable, send out 0 as atomic number...
    let zToReport = 0;
    //if(this.selectable && this.state != ElementTileState.GRAYED)
    if (this.tileData) {
      zToReport = this.tileData.element.Z;
    }
    this.onTileHover.emit(zToReport);
  }
}
