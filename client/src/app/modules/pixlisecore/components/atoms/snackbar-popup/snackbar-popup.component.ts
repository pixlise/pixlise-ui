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

import { Component, ElementRef, Inject, ViewChild } from "@angular/core";
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from "@angular/material/snack-bar";
import { PushButtonComponent } from "../buttons/push-button/push-button.component";

interface SnackBarPopupData {
  message: string;
  details?: string;
  action: string;
  type: "warning" | "error" | "success";
}

@Component({
  selector: "snackbar-popup",
  templateUrl: "./snackbar-popup.component.html",
  styleUrls: ["./snackbar-popup.component.scss"],
})
export class SnackBarPopupComponent {
  @ViewChild("detailsModal") detailsModal!: ElementRef;

  constructor(
    public snackBarRef: MatSnackBarRef<SnackBarPopupComponent>,
    @Inject(MAT_SNACK_BAR_DATA) public data: SnackBarPopupData
  ) {}

  public close(): void {
    this.closeDetailsModal();
    this.snackBarRef.dismiss();
  }

  get icon() {
    switch (this.data.type) {
      case "warning":
        return "warning";
      case "error":
        return "error";
      case "success":
        return "check_circle";
    }
  }

  private closeDetailsModal(): void {
    if (this.detailsModal && this.detailsModal instanceof PushButtonComponent) {
      (this.detailsModal as PushButtonComponent).closeDialog();
    }
  }
}
