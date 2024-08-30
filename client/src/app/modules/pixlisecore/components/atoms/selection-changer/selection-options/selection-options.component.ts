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

import { AfterViewInit, Component, ElementRef, Inject, ViewContainerRef } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Rect } from "src/app/models/Geometry";

export enum SelectionOption {
  SEL_ALL,
  SEL_ENTER_PMCS,
  SEL_DWELL,
  NEW_ROI,
  SEL_SUBDATASET,
  SEL_INVERT,
  SEL_NEARBY_PIXELS,
}

export class SelectionOptionsDialogData {
  constructor(
    public showDwell: boolean,
    public showNewROI: boolean,
    public showSelectNearbyPixels: boolean,
    public subDataSetIDs: string[],
    public triggerElementRef: ElementRef
  ) {}
}
export class SelectionOptionsDialogResult {
  constructor(
    public result: SelectionOption,
    public value: string
  ) {}
}

@Component({
  selector: "selection-options",
  templateUrl: "./selection-options.component.html",
  styleUrls: ["./selection-options.component.scss"],
})
export class SelectionOptionsComponent implements AfterViewInit {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: SelectionOptionsDialogData,
    public dialogRef: MatDialogRef<SelectionOptionsComponent>,
    private _ViewContainerRef: ViewContainerRef
  ) {}

  ngAfterViewInit() {
    // Move to be near the element that opened us
    if (this.data.triggerElementRef) {
      if (this.data.triggerElementRef.nativeElement) {
        const openerRect = this.data.triggerElementRef.nativeElement.getBoundingClientRect();
        const ourWindowRect = this._ViewContainerRef.element.nativeElement.parentNode.getBoundingClientRect();
        //console.log('window: '+window.innerWidth+'x'+window.innerHeight+', rect height: '+ourWindowRect.height);

        const windowPos = new Rect(openerRect.left, openerRect.bottom, ourWindowRect.width, ourWindowRect.height);

        // Adjust so it's always on screen still...

        const pos = { left: windowPos.x + "px", top: windowPos.y + "px" };
        this.dialogRef.updatePosition(pos);
      }
    }
  }

  onSelectAll(): void {
    this.dialogRef.close(new SelectionOptionsDialogResult(SelectionOption.SEL_ALL, ""));
  }

  onSelectEntered(): void {
    this.dialogRef.close(new SelectionOptionsDialogResult(SelectionOption.SEL_ENTER_PMCS, ""));
  }

  onSelectDwell(): void {
    this.dialogRef.close(new SelectionOptionsDialogResult(SelectionOption.SEL_DWELL, ""));
  }

  onNewROI(): void {
    this.dialogRef.close(new SelectionOptionsDialogResult(SelectionOption.NEW_ROI, ""));
  }

  onSelectForSubDataset(id: string): void {
    this.dialogRef.close(new SelectionOptionsDialogResult(SelectionOption.SEL_SUBDATASET, id));
  }

  onInvertSelection(): void {
    this.dialogRef.close(new SelectionOptionsDialogResult(SelectionOption.SEL_INVERT, ""));
  }

  onSelectNearbyPixels(): void {
    this.dialogRef.close(new SelectionOptionsDialogResult(SelectionOption.SEL_NEARBY_PIXELS, ""));
  }
}
