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

import { Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from "@angular/core";
import { Subscription } from "rxjs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { QuantSelection, QuantSelectorPanelSettings } from "../quant-selector-panel/quant-selector-panel.component";
import { QuantModes } from "src/app/models/Quantification";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";

@Component({
  selector: "quantification-selector",
  templateUrl: "./quantification-selector.component.html",
  styleUrls: ["./quantification-selector.component.scss"],
})
export class QuantificationSelectorComponent implements OnInit {
  private subs = new Subscription();

  @ViewChild("panelFoldoutButton") panelFoldoutButton!: ElementRef;

  // If no input quant ID is provided, we use the one in the widget region data service
  // otherwise we look up the quant using the ID specified
  @Input() selectedQuantID: string = "";
  @Input() scanId: string = "";
  @Input() roiID: string = "";
  @Input() hideMulti: boolean = false;
  @Input() showNoneOption: boolean = false;

  @Output() selectQuant: EventEmitter<string> = new EventEmitter<string>();

  NoSelectedQuantText: string = "Select a quantification";
  selectedQuant: string = this.NoSelectedQuantText;
  selectedQuantDetectors: string = "";

  dataForPanel: any = null;

  private _allQuants: Record<string, QuantificationSummary[]> = {};
  private _lastQuantList: QuantificationSummary[] = [];

  constructor(private _analysisLayoutService: AnalysisLayoutService) {}

  ngOnInit() {
    this.updateVars();

    this.subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(quants => {
        this._allQuants = quants;
        this._lastQuantList = quants[this.scanId] || [];
        this.updateVars();
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateVars();
    if (changes["scanId"]) {
      this._analysisLayoutService.fetchQuantsForScan(this.scanId);
      this._lastQuantList = this._allQuants[this.scanId] || [];
    }
  }

  onPanelClose(response: any) {
    if (response && Array.isArray(response) && response.length > 0) {
      let selection = response[0] as QuantSelection;
      this.selectQuant.emit(selection.quantId);
    }
  }

  private updateVars(): void {
    // For ROIs we don't show as many options
    let isForROI = this.roiID && this.roiID.length > 0;
    this.dataForPanel = new QuantSelectorPanelSettings(false, false, this.scanId, this.selectedQuantID, this.roiID, this.hideMulti, this.showNoneOption);

    if (!this.selectedQuantID) {
      this.selectedQuant = this.NoSelectedQuantText;
    } else {
      // If we can't find the name, at least we'll be showing the ID!
      this.selectedQuant = this.selectedQuantID;

      for (let quant of this._lastQuantList) {
        if (quant.id == this.selectedQuantID) {
          this.selectedQuant = quant.params?.name || "";
          this.selectedQuantDetectors = QuantModes.getShortDescription(quant.params?.quantMode || "");
          break;
        }
      }
    }
  }
}
