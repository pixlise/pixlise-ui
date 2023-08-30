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
import { RGBA } from "src/app/utils/colours";

export class KeyItem {
  colour: string;

  constructor(
    public id: string,
    public label: string,
    colourRGB: RGBA | string,
    public dashPattern: number[] = [],
    public shape: string = ""
  ) {
    let colourRGBA: RGBA | null = null;

    if (typeof colourRGB == "string") {
      colourRGBA = RGBA.fromString(colourRGB);
    } else {
      colourRGBA = colourRGB;
    }

    if (colourRGBA === null) {
      this.colour = "";
    } else {
      this.colour = new RGBA(colourRGBA.r, colourRGBA.g, colourRGBA.b, 255).asString();
    }

    if (!this.id) {
      this.id = "";
    }
  }
}

@Component({
  selector: "widget-key-display",
  templateUrl: "./widget-key-display.component.html",
  styleUrls: ["./widget-key-display.component.scss"],
})
export class WidgetKeyDisplayComponent implements OnInit {
  @Input() items: KeyItem[] = [];
  @Output() keyClick = new EventEmitter();
  @Output() onToggleKey = new EventEmitter();

  @Input() public keyShowing: boolean = false;

  constructor() {}

  ngOnInit(): void {}

  onToggleShowKey(): void {
    this.keyShowing = !this.keyShowing;
    this.onToggleKey.emit(this.keyShowing);
  }

  onClickLabel(id: string): void {
    if (id.length > 0) {
      this.keyClick.emit(id);
    }
  }

  getLabel(item: KeyItem): string {
    return item.label.replace("mist__roi.", "");
  }

  getTruncatedLabel(item: KeyItem): string {
    let maxLength = 15;
    let label = this.getLabel(item);
    if (label.length > maxLength) {
      label = label.slice(0, maxLength) + "...";
    }

    return label;
  }
}
