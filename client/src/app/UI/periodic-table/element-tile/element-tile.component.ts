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



export class ElementTileClickEvent
{
    constructor(public atomicNumber: number, public shiftKey: boolean)
    {
    }
}

export enum ElementTileState
{
    NONE="NONE",
    HOVER="HOVER",
    SELECTED="SELECTED",
    GRAYED="GRAYED"
}

@Component({
    selector: "element-tile",
    templateUrl: "./element-tile.component.html",
    styleUrls: ["./element-tile.component.scss"]
})
export class ElementTileComponent implements OnInit
{
    @Input() atomicNumber: number = 0;
    @Input() state: ElementTileState = ElementTileState.NONE;
    @Input() selectable: boolean = false;

    @Output() onTileClicked = new EventEmitter();
    @Output() onTileHover = new EventEmitter();

    element: PeriodicTableItem = null;

    private _classList: string[] = [];

    constructor()
    {
    }

    ngOnInit()
    {
        this._classList = [];
        if(this.atomicNumber)
        {
            this.element = periodicTableDB.getElementByAtomicNumber(this.atomicNumber);
            this._classList = ["element-tile"];
        }

        if(this.selectable && this.state != ElementTileState.GRAYED)
        {
            this._classList.push("selectable");
        }
    }

    get name(): string
    {
        if(!this.element)
        {
            return "";
        }
        return this.element.name;
    }

    get classList(): string
    {
        let classes = [ "state-"+this.state ];
        let allClasses = classes.concat(this._classList);
        return allClasses.join(" ");
    }

    onClicked(event: MouseEvent): void
    {
        this.onTileClicked.emit(new ElementTileClickEvent(this.atomicNumber, event.shiftKey));
    }

    onMouseOver(event): void
    {
        // If we're not selectable, send out 0 as atomic number...
        let zToReport = 0;
        if(this.selectable && this.state != ElementTileState.GRAYED)
        {
            zToReport = this.atomicNumber;
        }
        this.onTileHover.emit(zToReport);
    }
}
