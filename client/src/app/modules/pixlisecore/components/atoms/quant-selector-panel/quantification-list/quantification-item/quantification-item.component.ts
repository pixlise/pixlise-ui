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
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { QuantModes, getQuantifiedElements } from "src/app/models/Quantification";
import { ObjectType } from "../../../../../../../generated-protos/ownership-access";
import { AnalysisLayoutService } from "../../../../../../analysis/analysis.module";

export class QuantificationItemInfo {
  quantifiedAtomicNumbers: number[] = [];
  notElements: string[] = [];
  stateLabel: string = "oxides";
  detectorType: string = "";

  constructor(
    public quant: QuantificationSummary,
    public selected: boolean
  ) {
    let elemInfo = getQuantifiedElements(quant);

    this.stateLabel = elemInfo.carbonates ? "carbonates" : "oxides";
    this.notElements = elemInfo.nonElementSymbols;
    this.quantifiedAtomicNumbers = elemInfo.elementAtomicNumbers;

    this.detectorType = QuantModes.getShortDescription(quant.params?.userParams?.quantMode || "");
  }
}

@Component({
  selector: "quantification-item",
  templateUrl: "./quantification-item.component.html",
  styleUrls: ["./quantification-item.component.scss"],
})
export class QuantificationItemComponent implements OnInit {
  @Input() quantItem: QuantificationItemInfo | null = null;
  @Input() roiMatched: boolean = false;

  @Output() onQuantSelected = new EventEmitter();
  @Output() onClearSelection = new EventEmitter();

  objectType: ObjectType = ObjectType.OT_QUANTIFICATION;

  constructor(private _analysisLayoutService: AnalysisLayoutService) {}

  ngOnInit(): void {}

  onClickQuant(): void {
    this.onQuantSelected.emit();
  }

  onDeleteQuant(): void {
    if (this.quantItem?.quant?.id) {
      this._analysisLayoutService.deleteQuant(this.quantItem.quant.id);
      if (this.quantItem.selected) {
        this.onClearSelection.emit();
      }
    }
  }
}
