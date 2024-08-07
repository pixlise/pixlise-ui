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

import { OverlayRef } from "@angular/cdk/overlay";
import { Component, Inject, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription, timer } from "rxjs";
import { PANEL_CHILD_DATA } from "src/app/modules/pixlisecore/components/atoms/buttons/panel-foldout-button/panel-foldout-button.component";

export class QuantSelection {
  constructor(
    public quantId: string,
    public quantName: string,
    public roiId: string
  ) {}
}

export class QuantSelectorPanelSettings {
  constructor(
    public showBottomButtons: boolean,
    public showControlButtons: boolean,
    public scanId: string,
    public selectedQuantId: string,
    public roiId: string,
    public hideMulti: boolean,
    public showNoneOption: boolean
  ) {}
}

@Component({
  selector: "app-quant-selector-panel",
  templateUrl: "./quant-selector-panel.component.html",
  styleUrls: ["./quant-selector-panel.component.scss"],
})
export class QuantSelectorPanelComponent implements OnDestroy {
  private _subs = new Subscription();

  showBottomButtons: boolean = true;
  showControlButtons: boolean = true;
  selectedQuantId: string = "";
  roiId: string = "";
  hideMulti: boolean = false;
  showNoneOption: boolean = false;

  private isPublicUser = true;

  constructor(
    @Inject(PANEL_CHILD_DATA) public data: QuantSelectorPanelSettings,
    public overlayRef: OverlayRef,
    public dialog: MatDialog
  ) {
    // NOTE: if data is not specified, it's not null or undefined, it's a blank object...
    // so we have to check that one of its fields is undefined too... :(
    if (data && data.showBottomButtons !== undefined) {
      this.showBottomButtons = data.showBottomButtons;
      this.showControlButtons = data.showControlButtons;
      this.selectedQuantId = data.selectedQuantId;
      this.roiId = data.roiId;
      this.hideMulti = data.hideMulti;
      this.showNoneOption = data.showNoneOption;
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get canQuant() {
    return !this.isPublicUser;
  }

  get canUploadQuant() {
    return !this.isPublicUser;
  }

  closePanel(): void {
    if (this.overlayRef) {
      this.overlayRef.detach();
    }
  }

  onCreateQuantification(): void {
    // this._viewStateService.showPeakIdentification = true;
    this.closePanel();

    const source = timer(100);
    const abc = source.subscribe(val => {
      alert("Select elements then click Quantify in the Peak Identification panel");
    });
  }

  onMultiQuantification(): void {
    // this._viewStateService.enableMultiQuantCombineMode();
    this.closePanel();

    const source = timer(100);
    const abc = source.subscribe(val => {
      alert("Add ROIs and configure quantifications on Multi Quant panel");
    });
  }

  onUploadQuantification(): void {
    const dialogConfig = new MatDialogConfig();

    //dialogConfig.disableClose = true;
    //dialogConfig.autoFocus = true;
    //dialogConfig.width = '1200px';
    //dialogConfig.data = ???;

    // const dialogRef = this.dialog.open(QuantificationUploadDialogComponent, dialogConfig);

    // dialogRef.afterClosed().subscribe(
    //     ()=>
    //     {
    //     }
    // );
  }

  onQuantDeleted(quantID: string): void {
    // We simply close...
    this.closePanel();
  }

  onQuantSelected(params: Record<string, string>): void {
    let id = "";
    let name = "";
    if (params != null) {
      id = params["id"];
      name = params["name"];
    }

    if (this.overlayRef) {
      (this.overlayRef as any)["selection"] = [new QuantSelection(id, name, this.roiId)];
    }

    // this._quantSelectionService.notifyQuantificationSelected(this.roiId, id, name);

    // We simply close...
    this.closePanel();
  }
}
