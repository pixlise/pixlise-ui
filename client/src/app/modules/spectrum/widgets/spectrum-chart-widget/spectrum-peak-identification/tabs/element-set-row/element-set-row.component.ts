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
import { ElementSetSummary } from "src/app/generated-protos/element-set";

export const SPECIAL_QUANT_ID = "loaded_quantification";

@Component({
  selector: "element-set-row",
  templateUrl: "./element-set-row.component.html",
  styleUrls: ["./element-set-row.component.scss"],
})
export class ElementSetRowComponent implements OnInit {
  @Input() showShareButton: boolean = false;
  @Input() showDeleteButton: boolean = false;
  @Input() item: ElementSetSummary | null = null;

  @Output() onUse = new EventEmitter();
  @Output() onDelete = new EventEmitter();
  @Output() onShare = new EventEmitter();

  constructor() {}

  ngOnInit(): void {}

  onUseElementSet(): void {
    this.onUse.emit(this.item);
  }

  onShareElementSet(): void {
    this.onShare.emit(this.item);
  }

  onDeleteElementSet(): void {
    this.onDelete.emit(this.item);
  }

  get createdTime(): number {
    let t = 0;
    if (this.item?.owner?.createdUnixSec) {
      t = this.item.owner.createdUnixSec * 1000;
    }
    return t;
  }

  get shared(): boolean {
    return this.item?.owner?.sharedWithOthers || false;
  }
}