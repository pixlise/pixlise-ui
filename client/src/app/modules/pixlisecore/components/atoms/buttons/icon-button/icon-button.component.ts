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

export enum IconButtonState {
  OFF,
  ACTIVE,
  DIM,
  DISABLED,
}

export const ICONS = {
  notification: "assets/button-icons/notification.svg",
  hotkeys: "assets/button-icons/hotkeys.svg",
  filter: "assets/button-icons/filter-white.svg",
};

@Component({
  selector: "icon-button",
  templateUrl: "./icon-button.component.html",
  styleUrls: ["./icon-button.component.scss"],
})
export class IconButtonComponent implements OnInit {
  // @Input() icon: string = "";
  // @Input() type: keyof typeof ICONS = "notification";

  iconURL: string = "";

  @Input() state: IconButtonState = IconButtonState.OFF;
  @Input() hasBackground: boolean = true;
  @Input() loading: boolean = false;
  @Input() notificationCount: number = 0;
  @Input() size: number = 24;
  @Input() badgeText: string = "items picked";

  @Input() hoverYellow: boolean = false;

  @Output() onClick = new EventEmitter();

  @Input() get icon() {
    return this.iconURL;
  }

  set icon(value: string) {
    this.iconURL = value;
  }

  @Input() get type(): string {
    return this.iconURL;
  }

  set type(value: keyof typeof ICONS) {
    this.iconURL = ICONS[value];
  }

  constructor() {}

  ngOnInit() {}

  onClickInternal(event: Event): void {
    if (!this.loading && this.state !== IconButtonState.DISABLED) {
      this.onClick.emit(event);
    }
  }

  get sizeStr(): string {
    return `${this.size}px`;
  }
}
