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

import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Subscription } from "rxjs";
import { DataExpression } from "src/app/generated-protos/expressions";
import { ExpressionSearchFilter } from "../../models/expression-search";
import { ExpressionsService } from "../../services/expressions.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { ExpressionGroup } from "src/app/generated-protos/expression-group";

export type ExpressionPickerResponse = {
  selectedExpressions: (DataExpression | ExpressionGroup)[];
  scanId: string;
  quantId: string;
};

export type ExpressionPickerData = {
  selectedIds?: string[];
  scanId?: string;
  quantId?: string;
  noActiveScreenConfig?: boolean;
  maxSelection?: number;
};

@Component({
  selector: "expression-picker",
  templateUrl: "./expression-picker.component.html",
  styleUrls: ["./expression-picker.component.scss"],
})
export class ExpressionPickerComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  filteredExpressions: (DataExpression | ExpressionGroup)[] = [];
  selectedExpressions: Set<string> = new Set();

  manualFilters: Partial<ExpressionSearchFilter> | null = null;

  showSearchControls: boolean = true;

  waitingForExpressions: string[] = [];
  fetchedAllSelectedExpressions: boolean = true;

  scanId: string = "";
  quantId: string = "";

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackBarService: SnackbarService,
    private _expressionService: ExpressionsService,
    @Inject(MAT_DIALOG_DATA) public data: ExpressionPickerData,
    public dialogRef: MatDialogRef<ExpressionPickerComponent, ExpressionPickerResponse>
  ) {}

  ngOnInit(): void {
    this.scanId = this.data.scanId || "";
    this.quantId = this.data.quantId || "";
    this.selectedExpressions = new Set(this.data.selectedIds || []);

    this._expressionService.expressions$.subscribe(expressions => {
      let notFoundExpressions: string[] = [];
      this.waitingForExpressions.forEach((id, i) => {
        if (!expressions[id]) {
          notFoundExpressions.push(id);
        }
      });

      if (!this.fetchedAllSelectedExpressions && this.data?.selectedIds) {
        let fetchedAll = true;
        this.data.selectedIds?.forEach(id => {
          if (!this._expressionService.expressions$.value[id]) {
            fetchedAll = false;
          }
        });

        if (fetchedAll) {
          this.fetchedAllSelectedExpressions = true;
        }
      }

      this.waitingForExpressions = notFoundExpressions;
    });

    if (this.data?.selectedIds) {
      this.data.selectedIds.forEach(id => {
        if (!this._expressionService.expressions$.value[id]) {
          this.fetchedAllSelectedExpressions = false;
          this._expressionService.fetchExpression(id);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  trackById(index: number, item: DataExpression | ExpressionGroup): string {
    return item.id;
  }

  checkSelected(id: string): boolean {
    return this.selectedExpressions.has(id);
  }

  get applyTooltip(): string {
    let tooltip = "";
    if (this.waitingForExpressions.length > 0) {
      tooltip = `Waiting for (${this.waitingForExpressions.length}) expressions to finish downloading...`;
    } else {
      tooltip = `Apply Selected Expressions:`;
      this.selectedExpressions.forEach(id => {
        let expression = this._expressionService.expressions$.value[id];
        tooltip += `\n${expression?.name || id}`;
      });
    }

    return tooltip;
  }

  get canSelectMore(): boolean {
    return !this.data.maxSelection || this.selectedExpressions.size < this.data.maxSelection;
  }

  onSelect(expression: DataExpression): void {
    if (this.data.maxSelection === 1) {
      this.selectedExpressions.clear();
      this.selectedExpressions.add(expression.id);
      return;
    }

    if (this.selectedExpressions.has(expression.id)) {
      this.selectedExpressions.delete(expression.id);
    } else if (!this.canSelectMore) {
      return;
    } else {
      this.selectedExpressions.add(expression.id);
    }
  }

  onFilterAuthor(author: string): void {
    if (author === "builtin") {
      this.manualFilters = {};
    } else {
      this.manualFilters = { authors: [author] };
    }
  }

  onFilterChanged({ filteredExpressions, scanId, quantId, valueChanged }: ExpressionSearchFilter) {
    this.filteredExpressions = filteredExpressions;
    if (!this.fetchedAllSelectedExpressions) {
      return;
    }

    if (!this.data.noActiveScreenConfig && (this.scanId !== scanId || this.quantId !== quantId)) {
      let config = this._analysisLayoutService.activeScreenConfiguration$.value;
      if (config) {
        if (config.scanConfigurations[scanId]) {
          config.scanConfigurations[scanId].quantId = quantId;
        } else {
          config.scanConfigurations[scanId] = ScanConfiguration.create({ quantId });
        }

        // TODO: Figure out a way for this not to blow away the view multiple times when an expression picker dialog is shown
        //this._analysisLayoutService.writeScreenConfiguration(config);
      }
    }

    this.scanId = scanId;
    if (quantId && !this.quantId) {
      this.quantId = quantId;
    }
  }

  onToggleSearch(): void {
    this.showSearchControls = !this.showSearchControls;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    const selectedExpressions = Array.from(this.selectedExpressions)
      .map(id => this._expressionService.expressions$.value[id])
      .filter(expression => expression);

    this.dialogRef.close({
      selectedExpressions,
      scanId: this.scanId,
      quantId: this.quantId,
    });
  }

  onClear(): void {
    this.selectedExpressions.clear();
  }
}
