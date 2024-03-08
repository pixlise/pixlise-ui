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
  selector: "closable-list",
  templateUrl: "./closable-list.component.html",
  styleUrls: ["./closable-list.component.scss"],
})
export class ClosableListComponent implements OnInit {
  @Input() label: string = "";
  @Input() listNameForStateSave: string = "";

  @Input() visibleOverride: boolean = false;
  @Output() onToggleVisible = new EventEmitter();

  private _visible: boolean = false;

  constructor() {}

  ngOnInit() {
    if (this.listNameForStateSave.length > 0) {
      // Load initial state from service
      // this._visible = this.viewStateService.isClosableListOpen(this.listNameForStateSave);
    }
  }

  onToggleVisibleClicked(vis: boolean): void {
    // Tell anyone listening
    this.onToggleVisible.emit(vis);

    // Also set our internal variable, this may or may not be used depending on if we have a visibleOverride set
    this._visible = vis;

    // Save in service too
    if (this.listNameForStateSave.length > 0) {
      //   this.viewStateService.setClosableListOpen(this.listNameForStateSave, vis);
    }
  }

  get visible(): boolean {
    if (this.visibleOverride !== null) {
      return this.visibleOverride;
    }

    return this._visible;
  }
}
