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

import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { XRFLine, XRFLineType } from "src/app/periodic-table/XRFLine";
import { ElementSetItemLines } from "src/app/services/element-set.service";


export class XRFLineGroup {
    private _lines: XRFLine[];
    private _escapeLines: XRFLine[];

    private _hasK = false;
    private _hasL = false;
    private _hasM = false;
    private _hasEsc = false;

    public k: boolean = false;
    public l: boolean = false;
    public m: boolean = false;
    public esc: boolean = false;

    public visible: boolean = true;

    constructor(public atomicNumber: number, lines: XRFLine[], escapeLines: XRFLine[]) {
        // Check if we have K, L or M lines at all

        let elemItem = periodicTableDB.getElementByAtomicNumber(this.atomicNumber);

        if (!elemItem) {
            console.error("XRFLineGroup failed to get element info for Z=" + atomicNumber);
            return;
        }

        for (let c = 0; c < elemItem.lines.length; c++) {
            let line = elemItem.lines[c].Siegbahn[0];
            if (line == "K") {
                this._hasK = true;
            }
            if (line == "L") {
                this._hasL = true;
            }
            if (line == "M") {
                this._hasM = true;
            }
        }

        this._hasEsc = elemItem.escapeLines.length > 0;

        this._lines = lines;
        this._escapeLines = escapeLines;
        this.updateLineFlags();
    }

    static makeFromElementSetItem(item: ElementSetItemLines): XRFLineGroup {
        let group = new XRFLineGroup(item.Z, [], []);

        let lines = ["K", "L", "M", "Esc"];
        for (let line of lines) {
            if (item[line]) {
                group.addLine(line);
            }
        }

        return group;
    }

    static makeFromAtomicNumber(atomicNumber: number): XRFLineGroup {
        let group = new XRFLineGroup(atomicNumber, [], []);

        group.addLine("K");
        group.addLine("L");
        group.addLine("M");

        group.addLine("Esc");
        return group;
    }
    /*
    static getAllVisibleLines(lineGroups: XRFLineGroup[]): XRFLine[]
    {
        let resultLines: XRFLine[] = [];
        for(let lineGroup of lineGroups)
        {
            if(lineGroup.visible)
            {
                for(let line of lineGroup.lines)
                {
                    resultLines.push(line);
                }
                for(let line of lineGroup.escapeLines)
                {
                    resultLines.push(line);
                }
            }
        }
        return resultLines;
    }
*/
    get hasK(): boolean {
        return this._hasK;
    }

    get hasL(): boolean {
        return this._hasL;
    }

    get hasM(): boolean {
        return this._hasM;
    }

    get hasEsc(): boolean {
        return this._hasEsc;
    }

    get lines(): XRFLine[] {
        return this._lines;
    }

    get escapeLines(): XRFLine[] {
        return this._escapeLines;
    }

    get allLines(): XRFLine[] {
        return this._lines.concat(this._escapeLines);
    }

    addXRFLine(line: XRFLine) {
        if (line.lineType == XRFLineType.ESCAPE) {
            this._escapeLines.push(line);
        }
        else {
            this._lines.push(line);
        }
        this.updateLineFlags();
    }

    addLine(line: string): void {
        if (line == "Esc") {
            this.addEscapeLines();
        }
        else {
            let elemItem = periodicTableDB.getElementByAtomicNumber(this.atomicNumber);

            for (let c = 0; c < elemItem.lines.length; c++) {
                let elemLine = elemItem.lines[c];
                if (elemLine.Siegbahn[0] == line) {
                    this._lines.push(XRFLine.makeXRFLineFromPeriodicTableItem(elemItem.symbol, this.atomicNumber, elemLine));
                }
            }
        }

        this.updateLineFlags();
    }

    delLine(line: string): void {
        if (line == "Esc") {
            this._escapeLines = [];
        }
        else {
            let linesToKeep: XRFLine[] = [];

            for (let c = 0; c < this._lines.length; c++) {
                if (this._lines[c].siegbahn[0] != line) {
                    linesToKeep.push(this.lines[c]);
                }
            }

            this._lines = linesToKeep;
        }

        this.updateLineFlags();
    }

    //////////////////////////////////////////////////////////////////////////////
    // Private stuff
    private addEscapeLines(): void {
        this._escapeLines = [];

        // Read the escape lines from the DB
        let elem = periodicTableDB.getElementByAtomicNumber(this.atomicNumber);
        if (elem) {
            for (let line of elem.escapeLines) {
                this._escapeLines.push(
                    XRFLine.makeXRFLineFromEscapeLine(
                        elem.symbol, elem.Z, line
                    )
                );
            }
        }

        this.updateLineFlags();
    }

    private updateLineFlags(): void {
        let k = false;
        let l = false;
        let m = false;

        for (let c = 0; c < this._lines.length; c++) {
            if (this._lines[c].siegbahn[0] == "K") {
                k = true;
            }
            if (this._lines[c].siegbahn[0] == "L") {
                l = true;
            }
            if (this._lines[c].siegbahn[0] == "M") {
                m = true;
            }
        }

        this.k = k;
        this.l = l;
        this.m = m;
        this.esc = this._escapeLines.length > 0;
    }
}
