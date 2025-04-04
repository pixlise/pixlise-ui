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

@Component({
  selector: "two-state-edit-button",
  templateUrl: "./two-state-edit-button.component.html",
  styleUrls: ["./two-state-edit-button.component.scss"],
})
export class TwoStateEditButtonComponent implements OnInit {
  @Input() buttonStyle: string = "normal";
  @Input() disabled: boolean = false;
  @Input() active: boolean = false;

  @Output() onToggle = new EventEmitter();
  @Output() onEdit = new EventEmitter();

  constructor() {}

  ngOnInit() {
    const validStyles = ["normal", "borderless", "yellow", "outline", "gray"];
    if (validStyles.indexOf(this.buttonStyle) == -1) {
      console.warn("Invalid style for edit-button: " + this.buttonStyle);
      this.buttonStyle = validStyles[0];
    }
  }

  get styleCSS(): string {
    return `btn-${this.buttonStyle}${this.disabled ? " disabled" : ""}${this.active ? " active" : ""}`;
  }

  onToggleInternal(): void {
    if (!this.disabled) {
      this.active = !this.active;
      this.onToggle.emit(this.active);
    }
  }
  onEditInternal(event: any): void {
    if (!this.disabled) {
      this.onEdit.emit(event);
    }
  }
}
