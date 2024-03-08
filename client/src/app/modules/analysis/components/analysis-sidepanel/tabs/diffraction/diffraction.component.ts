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

import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { MinMax } from "src/app/models/BasicTypes";
// import { HistogramInteraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction-tab-old/interaction";
// import { HistogramInteraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction-tab-old/interaction";
import { DiffractionHistogramDrawer } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/drawer";
import { HistogramInteraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/interaction";
import { DiffractionHistogramModel, HistogramSelectionOwner } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/model";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { HistogramDrawer } from "src/app/modules/scatterplots/widgets/histogram-widget/histogram-drawer";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";

@Component({
  selector: "diffraction",
  templateUrl: "./diffraction.component.html",
  styleUrls: ["./diffraction.component.scss"],
})
export class DiffractionTabComponent implements OnInit, HistogramSelectionOwner {
  public static readonly tableRowLimit = 100;

  private _subs = new Subscription();

  drawer: CanvasDrawer;
  private _histogramMdl: DiffractionHistogramModel;
  transform: PanZoom = new PanZoom();
  interaction: HistogramInteraction;

  isMapShown: boolean = false;

  canSaveExpression: boolean = false;

  peaks: DiffractionPeak[] = [];
  private _pagablePeaks: DiffractionPeak[] = [];

  userPeaks: DiffractionPeak[] = [];
  userPeaksListOpen: boolean = false;
  userPeakEditing: boolean = false;

  visiblePeakId: string = "";
  private _barSelected: boolean[] = [];
  private _barSelectedCount: number = 0;

  detectPeaksListOpen: boolean = false;

  sortModeEffectSize = "Effect Size";
  sortModekeV = "Energy keV";
  sortModePMC = "PMC";

  private _sortCriteria: string = this.sortModeEffectSize;
  private _sortAscending: boolean = false;

  private _tablePage: number = 0;
  hasMultiPages: boolean = false;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    public dialog: MatDialog
  ) {
    this._histogramMdl = new DiffractionHistogramModel(this);
    this.drawer = new DiffractionHistogramDrawer(this._histogramMdl);
    this.interaction = new HistogramInteraction(this._histogramMdl);
  }

  ngOnInit(): void {}

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onResetBarSelection() {}

  onShowMap() {
    this.isMapShown = true;
  }

  onSelectPMCsWithDiffraction() {}

  onSaveAsExpressionMap() {}

  onToggleUserPeaksListOpen() {
    this.userPeaksListOpen = !this.userPeaksListOpen;
  }

  onAddPeak() {}

  onClickPeakItem(peak: DiffractionPeak) {}

  onTogglePeakVisible(peak: DiffractionPeak) {}

  onDeleteUserPeak(peak: DiffractionPeak) {}

  onDeleteDetectedPeak(peak: DiffractionPeak) {}

  onToggleDetectPeaksListOpen() {}

  get mdl(): DiffractionHistogramModel {
    return this._histogramMdl;
  }

  get sort(): string {
    return this._sortCriteria;
  }

  set sort(criteria: string) {
    if (criteria == this._sortCriteria) {
      // Same column, user is just changing sort order
      this._sortAscending = !this._sortAscending;
    } else {
      this._sortCriteria = criteria;
      this._sortAscending = true;
    }
    // this.updateDisplayList();
  }

  get cursorShown(): string {
    if (!this._histogramMdl) {
      return CursorId.defaultPointer;
    }
    return this._histogramMdl.cursorShown;
  }

  get tableRowLimit(): number {
    return DiffractionTabComponent.tableRowLimit;
  }

  get numPages(): number {
    let maxPage = Math.ceil(this._pagablePeaks.length / this.tableRowLimit);
    return maxPage;
  }

  get tablePageLabel(): string {
    return this._tablePage + 1 + "/" + this.numPages;
  }

  onTablePage(next: boolean) {}

  setkeVRangeSelected(keVRange: MinMax, selected: boolean, complete: boolean) {
    // // If they're ALL selected, unselect them first because the user is doing something specific here
    // if (this._barSelectedCount == this._barSelected.length) {
    //   for (let c = 0; c < this._barSelected.length; c++) {
    //     this._barSelected[c] = false;
    //   }
    //   this._barSelectedCount = 0;
    //   selected = true; // we're forcing it to select this one!
    // }
    // // If we've just unselected the last bar...
    // if (this._barSelectedCount <= 1) {
    //   selected = true; // Force this one to select
    // }
    // let keVMin = keVRange.min || 0;
    // let keVMax = keVRange.max || 0;
    // let mid = (keVMin + keVMax) / 2;
    // let idx = this.getBarIdx(mid);
    // if (idx <= this._barSelected.length) {
    //   this._barSelected[idx] = selected;
    // }
    // // Don't force it to rebuild everything as the user is interacting/dragging, only do this when we are told it's complete!
    // if (complete) {
    //   // Count how many are selected (controls if we have svae as expression map button enabled)
    //   this._barSelectedCount = 0;
    //   for (let sel of this._barSelected) {
    //     if (sel) {
    //       this._barSelectedCount++;
    //     }
    //   }
    //   this.updateDisplayList();
    //   // Also tell the expression service so diffraction count map is up to date with user selection
    //   let exprData = this.formExpressionForSelection();
    //   if (exprData.length == 3) {
    //     // TODO:
    //     // this._exprService.setDiffractionCountExpression(exprData[1], exprData[0]);
    //   }
    // }
    // if (selected) {
    //   // Something was selected, show the list
    //   this.detectPeaksListOpen = true;
    // }
  }

  iskeVRangeSelected(keVMidpoint: number): boolean {
    // // check flags
    // let idx = this.getBarIdx(keVMidpoint);
    // if (idx < this._barSelected.length) {
    //   return this._barSelected[idx];
    // }
    return false;
  }

  selectedRangeCount(): number {
    return this._barSelectedCount;
  }
}
