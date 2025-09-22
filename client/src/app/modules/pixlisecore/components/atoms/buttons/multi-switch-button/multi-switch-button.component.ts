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

import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  standalone: false,
  selector: "multi-switch-button",
  templateUrl: "./multi-switch-button.component.html",
  styleUrls: ["./multi-switch-button.component.scss"],
})
export class MultiSwitchButtonComponent {
  @Input() options: string[] = [];
  @Input() optionIcons?: string[] = [];
  @Input() optionLabels?: string[] = [];
  @Input() value: string = "";
  @Input() disabled: boolean = false;
  @Input() showLabels: boolean = true;
  @Input() darkMode: boolean = false;
  @Input() colorizeActiveIcon: boolean = false;
  @Input() noPadding: boolean = false;

  @Output() onChange = new EventEmitter();

  constructor() {}

  get activeWidth(): number | string {
    return this.options.length > 0 ? `${Math.round((1 / this.options.length) * 1000) / 10}%` : 0;
  }

  get activeLeftOffset(): number | string {
    const index = this.options.findIndex(option => option === this.value);
    return index >= 0 && this.options.length > 0 ? `${Math.round((index / this.options.length) * 1000) / 10}%` : 0;
  }

  onClick(selectedValue: string) {
    if (!this.disabled) {
      this.value = selectedValue;
      this.onChange.emit(selectedValue);
    }
  }
}
