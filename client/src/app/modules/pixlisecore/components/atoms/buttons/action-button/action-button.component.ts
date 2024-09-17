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

import { Component, EventEmitter, Input, Output, TemplateRef } from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "./confirm-dialog/confirm-dialog.component";

// This is used to alias map our actions to mat icons and allow for automatic type inference
export const matActionIcons = {
  close: "close",
  check: "check",
  add: "add",
  edit: "edit",
  image: "image",
  duplicate: "content_copy",
};

const customActionIcons = {
  "edit-clipboard": "assets/button-icons/edit.svg",
  delete: "assets/button-icons/delete.svg",
  confirm: "assets/button-icons/radio-tick-on.svg",
  deny: "assets/button-icons/grey-circle-x.svg",
  openAccordion: "assets/button-icons/arrow-right.svg",
  closeAccordion: "assets/button-icons/arrow-down.svg",
  ellipsis: "assets/button-icons/ellipsis.svg",
  verticalEllipsis: "assets/button-icons/vertical-ellipsis.svg",
  visibleOn: "assets/button-icons/visible-on.svg",
  visibleOff: "assets/button-icons/visible-off.svg",
  openEye: "assets/button-icons/eye-open.svg",
  closedEye: "assets/button-icons/eye-closed.svg",
  checkOn: "assets/button-icons/check-on.svg",
  checkOff: "assets/button-icons/check-off.svg",
  radioOn: "assets/button-icons/radio-on.svg",
  radioOff: "assets/button-icons/radio-off.svg",
  rgbMix: "assets/button-icons/rgbmix.svg",
  colorPicker: "assets/button-icons/colours.svg",
  export: "assets/button-icons/export.svg",
  sendToTop: "assets/button-icons/send-to-top.svg",
  zoomIn: "assets/button-icons/zoom-in.svg",
  zoomOut: "assets/button-icons/zoom-out.svg",
  share: "assets/button-icons/share.svg",
};

export type ACTION_TYPE = keyof typeof customActionIcons | keyof typeof matActionIcons;

@Component({
  selector: "action-button",
  templateUrl: "./action-button.component.html",
  styleUrls: ["./action-button.component.scss"],
})
export class ActionButtonComponent {
  @Input() disabled: boolean = false;
  @Input() tooltipTitle: string = "";
  @Input() color: string = "";
  @Input() buttonBackground: boolean = false;
  @Input() confirmText: string = "";
  @Input() customDialog: TemplateRef<any> | null = null;
  @Input() customMenuOptions: string[] | null = null;

  @Input() customSize: string = "";

  @Output() onCustomMenuItemClick = new EventEmitter<string>();
  @Output() onClick = new EventEmitter<MouseEvent>();

  private _actionSource: keyof typeof matActionIcons | string = "close";
  isMatIcon = false;

  constructor(
    private dialog: MatDialog,
    private _dialogRef: MatDialogRef<any>
  ) {}

  @Input() set action(actionName: ACTION_TYPE) {
    this.isMatIcon = Object.keys(matActionIcons).includes(actionName);
    if (this.isMatIcon) {
      this._actionSource = matActionIcons[actionName as keyof typeof matActionIcons];
    } else if (Object.keys(customActionIcons).includes(actionName)) {
      this._actionSource = customActionIcons[actionName as keyof typeof customActionIcons];
    }
  }

  get action(): keyof typeof matActionIcons | string {
    return this._actionSource;
  }

  onClickInternal(evt: any) {
    evt.preventDefault();
    if (!this.disabled) {
      if (this.confirmText) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = { confirmText: this.confirmText };
        this._dialogRef = this.dialog.open(ConfirmDialogComponent, dialogConfig);

        this._dialogRef.afterClosed().subscribe((confirmed: boolean) => {
          if (confirmed) {
            this.onClick.emit(evt);
          }
        });
      } else if (this.customDialog) {
        const dialogConfig = new MatDialogConfig();
        this._dialogRef = this.dialog.open(this.customDialog, dialogConfig);

        this._dialogRef.afterClosed().subscribe(() => {
          this.onClick.emit(evt);
        });
      } else {
        this.onClick.emit(evt);
      }
    }
  }

  closeDialog() {
    this._dialogRef.close();
  }
}
