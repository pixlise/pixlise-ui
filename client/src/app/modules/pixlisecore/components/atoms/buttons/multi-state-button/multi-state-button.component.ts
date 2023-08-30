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

class StateInfo {
  constructor(
    public id: string,
    public label: string,
    public icon: string
  ) {}
}

@Component({
  selector: "multi-state-button",
  templateUrl: "./multi-state-button.component.html",
  styleUrls: ["./multi-state-button.component.scss"],
})
export class MultiStateButtonComponent implements OnInit {
  @Input() stateNames: string[] = null;
  @Input() items: string[] = null;
  @Input() activeState: string;

  @Output() onChange = new EventEmitter();

  states: StateInfo[];

  constructor() {}

  ngOnInit() {
    this.states = [];

    if (this.stateNames.length <= 0 || this.stateNames.length != this.items.length) {
      console.error("Invalid stateNames/items defined for MultiStateButtonComponent");
      return;
    }

    //for(let item of this.items)
    for (let c = 0; c < this.stateNames.length; c++) {
      let stateName = this.stateNames[c];
      let item = this.items[c];

      if (item.startsWith("assets/")) {
        this.states.push(new StateInfo(stateName, "", item));
      } else {
        this.states.push(new StateInfo(stateName, item, ""));
      }
    }
    /*
        console.log(this.states);
        console.log(this.stateIdx);
*/
  }

  onClick(state: StateInfo): void {
    this.onChange.emit(state.id);
  }
}
