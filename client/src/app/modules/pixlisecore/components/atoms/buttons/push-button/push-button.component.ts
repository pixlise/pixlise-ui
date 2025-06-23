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

import { Component, EventEmitter, Input, OnInit, Output, TemplateRef } from "@angular/core";
import { BadgeStyle } from "../../badge/badge.component";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "../action-button/confirm-dialog/confirm-dialog.component";
import { ConfirmInputDialogComponent, ConfirmInputDialogData, ConfirmInputDialogResult } from "../action-button/confirm-input-dialog/confirm-input-dialog.component";

export type PushButtonStyle =
  | "normal"
  | "white-outline"
  | "borderless"
  | "yellow"
  | "outline"
  | "outline-small"
  | "gray"
  | "gray-title"
  | "light-right-outline"
  | "orange"
  | "dark-outline"
  | "hover-yellow"
  | "changelog-new"
  | "changelog-viewed";

@Component({
  selector: "push-button",
  templateUrl: "./push-button.component.html",
  styleUrls: ["./push-button.component.scss"],
})
export class PushButtonComponent implements OnInit {
  @Input() buttonStyle: PushButtonStyle = "normal";
  @Input() customStyle: Record<string, string> = {};
  @Input() badgeBorderColor: string = "";
  @Input() active: boolean = false;
  @Input() disabled: boolean = false;
  @Input() notificationCount: number = 0;
  @Input() badgeStyle: BadgeStyle = "notification";
  @Input() tooltipTitle: string = "";
  @Input() flexBtn: boolean = false;

  @Input() confirmText: string = "";

  @Input() confirmInputText: string = "";
  @Input() confirmInputTitle: string = "";
  @Input() confirmInputButtonText: string = "";
  @Input() confirmInputMiddleButtonText: string = "";
  @Input() confirmInputPlaceholder: string = "";

  @Input() customDialog: TemplateRef<any> | null = null;

  @Output() onClick = new EventEmitter();

  constructor(
    private dialog: MatDialog,
    private _dialogRef: MatDialogRef<any>
  ) {}

  ngOnInit() {
    const validStyles: PushButtonStyle[] = [
      "normal",
      "white-outline",
      "borderless",
      "yellow",
      "outline",
      "outline-small",
      "gray",
      "gray-title",
      "light-right-outline",
      "orange",
      "dark-outline",
      "hover-yellow",
      "changelog-new",
      "changelog-viewed",
    ];
    if (validStyles.indexOf(this.buttonStyle) == -1) {
      console.warn("Invalid style for push-button: " + this.buttonStyle);
      this.buttonStyle = validStyles[0];
    }
  }

  get styleCSS(): string {
    return `btn-${this.buttonStyle}${this.disabled ? " disabled" : ""}${this.active ? " active" : ""}`;
  }

  onClickInternal(event?: MouseEvent): void {
    if (!this.disabled) {
      if (this.confirmInputText) {
        const dialogConfig = new MatDialogConfig<ConfirmInputDialogData>();
        dialogConfig.data = {
          confirmInputText: this.confirmInputText,
          inputPlaceholder: this.confirmInputPlaceholder,
          title: this.confirmInputTitle,
          confirmButtonText: this.confirmInputButtonText,
          middleButtonText: this.confirmInputMiddleButtonText,
        };
        this._dialogRef = this.dialog.open(ConfirmInputDialogComponent, dialogConfig);

        this._dialogRef.afterClosed().subscribe(({ confirmed, value, middleButtonClicked }: ConfirmInputDialogResult) => {
          if (confirmed) {
            this.onClick.emit({ value, middleButtonClicked });
          }
        });
      } else if (this.confirmText) {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = { confirmText: this.confirmText };
        this._dialogRef = this.dialog.open(ConfirmDialogComponent, dialogConfig);

        this._dialogRef.afterClosed().subscribe((confirmed: boolean) => {
          if (confirmed) {
            this.onClick.emit(event);
          }
        });
      } else if (this.customDialog) {
        this._dialogRef = this.dialog.open(this.customDialog, {});
        if (this.onClick) {
          // Still emit the onClick event if it's also registered
          this.onClick.emit(event);
        }
      } else {
        this.onClick.emit(event);
      }
    }
  }

  closeDialog() {
    if (this._dialogRef.close) {
      this._dialogRef.close();
    }
  }
}
