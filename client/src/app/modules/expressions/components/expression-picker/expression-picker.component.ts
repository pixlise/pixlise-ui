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

import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Subscription } from "rxjs";
import { DataExpression } from "src/app/generated-protos/expressions";
import { ExpressionSearchFilter, RecentExpression } from "../../models/expression-search";
import { ExpressionsService } from "../../services/expressions.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { ScanConfiguration, WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { ExpressionGroup, ExpressionGroupItem } from "src/app/generated-protos/expression-group";
import { ExpressionBrowseSections } from "../../models/expression-browse-sections";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { getPredefinedExpression } from "src/app/expression-language/predefined-expressions";
import { WIDGETS, WidgetConfiguration, WidgetType } from "src/app/modules/widget/models/widgets.model";
import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";
import { WidgetData } from "src/app/generated-protos/widget-data";
import { widgetLayerPositions } from "../../models/expression-widget-layer-configs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";

export type ExpressionPickerResponse = {
  selectedExpressions: (DataExpression | ExpressionGroup)[];
  scanId: string;
  quantId: string;
};

export type ExpressionPickerData = {
  selectedIds?: string[];
  expressionTriggerPosition?: number;
  widgetId?: string;
  scanId?: string;
  quantId?: string;
  noActiveScreenConfig?: boolean;
  maxSelection?: number;
  widgetType?: string;
  disableExpressionGroups?: boolean;
};

@Component({
  selector: "expression-picker",
  templateUrl: "./expression-picker.component.html",
  styleUrls: ["./expression-picker.component.scss"],
})
export class ExpressionPickerComponent implements OnInit, OnDestroy {
  @ViewChild("saveExpressionGroupDialogBtn") saveExpressionGroupDialog!: ElementRef;

  private _subs = new Subscription();

  filteredExpressions: (DataExpression | ExpressionGroup)[] = [];

  selectedExpressionIdOrder: string[] = [];
  selectedExpressionIds: Set<string> = new Set();
  selectedExpressions: (DataExpression | ExpressionGroup)[] = [];

  recentExpressions: RecentExpression[] = [];

  private _quantifiedExpressions: Record<string, DataExpression> = {};
  private _pseudoIntensities: Record<string, DataExpression> = {};

  private _unmatchedExpressions: boolean = false;

  manualFilters: Partial<ExpressionSearchFilter> | null = null;

  showSearchControls: boolean = true;

  waitingForExpressions: string[] = [];
  fetchedAllSelectedExpressions: boolean = true;

  private _currentUserId: string = "";

  activeBrowseGroup: string = "Expressions";
  activeBrowseSection: string = "All";
  browseSections = ExpressionBrowseSections.SECTIONS;

  editableExpressionGroups: ExpressionGroup[] = [];
  private _selectedExpressionGroupId: string = "";
  overwriteExistingExpressionGroup: boolean = false;

  scanId: string = "";
  quantId: string = "";

  widgetType: WidgetType | "" = "";
  private _activeWidgetId: string = "";
  layoutWidgets: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];

  newExpressionGroupName: string = "";
  newExpressionGroupDescription: string = "";
  newExpressionGroupTags: string[] = [];

  maxSelection: number = 0;
  expressionTriggerPosition: number = -1;

  constructor(
    private _cachedDataSerivce: APICachedDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackBarService: SnackbarService,
    private _userOptionsService: UserOptionsService,
    private _expressionService: ExpressionsService,
    @Inject(MAT_DIALOG_DATA) public data: ExpressionPickerData,
    public dialogRef: MatDialogRef<ExpressionPickerComponent, ExpressionPickerResponse>
  ) {}

  ngOnInit(): void {
    this.scanId = this.data.scanId || this._analysisLayoutService.defaultScanId || "";
    this.quantId = this.data.quantId || this._analysisLayoutService.getQuantIdForScan(this.scanId) || "";

    this._activeWidgetId = this.data.widgetId || "";
    this.expressionTriggerPosition = this.data?.expressionTriggerPosition ?? -1;
    this._analysisLayoutService.highlightedWidgetId$.next(this._activeWidgetId);

    this.selectedExpressionIds = new Set(this.data.selectedIds || []);
    this.selectedExpressionIdOrder = Array.from(this.selectedExpressionIds);
    if (this.data.widgetType) {
      this.widgetType = this.data.widgetType as WidgetType;
      this.maxSelection = (WIDGETS[this.widgetType as keyof typeof WIDGETS] as WidgetConfiguration)?.maxExpressions || 0;
    } else if (this.data?.maxSelection) {
      this.maxSelection = this.data.maxSelection;
    }

    if (this.data.disableExpressionGroups) {
      this.browseSections = this.browseSections.filter(section => section.name !== ExpressionBrowseSections.EXPRESSION_GROUPS);
    }

    this.updateSelectedExpressions();
    this.loadRecentExpressionsFromCache();

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(config => {
        if (config) {
          let widgetReferences: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
          config.layouts.forEach((layout, i) => {
            let widgetCounts: Record<string, number> = {};
            layout.widgets.forEach((widget, widgetIndex) => {
              if (widgetCounts[widget.type]) {
                widgetCounts[widget.type]++;
              } else {
                widgetCounts[widget.type] = 1;
              }

              let widgetTypeName = WIDGETS[widget.type as keyof typeof WIDGETS].name;
              let widgetName = `${widgetTypeName} ${widgetCounts[widget.type]}${i > 0 ? ` (page ${i + 1})` : ""}`;

              widgetReferences.push({ widget, name: widgetName, type: widget.type });
            });
          });

          this.layoutWidgets = widgetReferences;
        }
      })
    );

    this._subs.add(
      this._expressionService.expressions$.subscribe(expressions => {
        let notFoundExpressions: string[] = [];
        this.waitingForExpressions.forEach((id, i) => {
          if (!expressions[id]) {
            notFoundExpressions.push(id);
          }
        });

        if (!this.fetchedAllSelectedExpressions && this.selectedExpressionIds) {
          let fetchedAll = true;
          this.selectedExpressionIds?.forEach(id => {
            if (!this._expressionService.expressions$.value[id]) {
              fetchedAll = false;
            }
          });

          if (fetchedAll) {
            this.fetchedAllSelectedExpressions = true;
          }
        }

        this.waitingForExpressions = notFoundExpressions;
        this.updateSelectedExpressions();
      })
    );

    this._subs.add(
      this._expressionService.lastWrittenExpressionGroupId$.subscribe(id => {
        if (id) {
          this.overwriteExistingExpressionGroup = true;
          this.selectedExpressionGroupId = id;
        }
      })
    );

    this._subs.add(
      this._expressionService.expressionGroups$.subscribe(expressionGroups => {
        this.editableExpressionGroups = expressionGroups.filter(group => group.owner?.canEdit);
      })
    );

    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this._currentUserId = this._userOptionsService.userDetails.info?.id || "";
      })
    );

    if (this.scanId) {
      this._subs.add(
        this._cachedDataSerivce.getPseudoIntensity(PseudoIntensityReq.create({ scanId: this.scanId })).subscribe((resp: PseudoIntensityResp) => {
          this._pseudoIntensities = {};
          if (resp.intensityLabels) {
            resp.intensityLabels.forEach(label => {
              const id = DataExpressionId.makePredefinedPseudoIntensityExpression(label);
              const expression = getPredefinedExpression(id);
              if (expression) {
                this._pseudoIntensities[id] = expression;
              }
            });
          }

          this.updateSelectedExpressions();
        })
      );

      this._subs.add(
        this._analysisLayoutService.availableScanQuants$.subscribe(availableScanQuants => {
          this.loadQuantifiedExpressions(availableScanQuants);
          if (this._unmatchedExpressions) {
            this.updateSelectedExpressions();
          }
        })
      );
    }

    this.selectedExpressionIds.forEach(id => {
      if (!this._expressionService.expressions$.value[id]) {
        this.fetchedAllSelectedExpressions = false;
        this._expressionService.fetchExpression(id);
      }
    });
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get activeWidgetId(): string {
    return this._activeWidgetId;
  }

  set activeWidgetId(id: string) {
    this._activeWidgetId = id;
    this._analysisLayoutService.highlightedWidgetId$.next(id);
    this.expressionTriggerPosition = -1;

    let widget = this.layoutWidgets.find(widget => widget.widget.id === id);
    if (widget) {
      if (widget.type) {
        this.widgetType = widget.type as WidgetType;
        let widgetSpec = WIDGETS[widget.type as keyof typeof WIDGETS];
        if (widgetSpec) {
          this.selectedExpressionIds = new Set((widget.widget.data?.[widgetSpec.dataKey as keyof WidgetData] as any)?.expressionIDs || []);
          this.selectedExpressionIdOrder = Array.from(this.selectedExpressionIds);

          this.maxSelection = (widgetSpec as WidgetConfiguration)?.maxExpressions || 0;
        }
      }
      this.updateSelectedExpressions();
    }
  }

  loadQuantifiedExpressions(availableScanQuants: Record<string, QuantificationSummary[]>): void {
    this._quantifiedExpressions = {};

    let quants = availableScanQuants[this.scanId];
    if (quants) {
      if (!this.quantId) {
        this.quantId = this._analysisLayoutService.getQuantIdForScan(this.scanId);
      }
      let currentQuant = quants.find(quant => quant.id === this.quantId);
      if (currentQuant) {
        currentQuant.elements.forEach(quantElement => {
          let det = currentQuant?.params?.userParams?.quantMode || "";
          if (det.length > 0 && det != "Combined") {
            det = det.substring(0, 1);
          }

          const id = DataExpressionId.makePredefinedQuantElementExpression(quantElement, "%", det);
          const expr = getPredefinedExpression(id);
          if (expr) {
            this._quantifiedExpressions[id] = expr;
          }
        });
      }
    }
  }

  updateSelectedExpressions() {
    this._unmatchedExpressions = false;
    this.selectedExpressions = [];

    for (const id of this.selectedExpressionIds) {
      const toSelect: DataExpression[] = [];

      const expression = this._expressionService.expressions$.value[id];
      if (expression) {
        toSelect.push(expression);
      } else {
        if (this._pseudoIntensities[id]) {
          // Check if we have it in pseudo intensities
          toSelect.push(this._pseudoIntensities[id]);
        } else if (this._quantifiedExpressions[id]) {
          // Check if we have it in quantified expressions
          toSelect.push(this._quantifiedExpressions[id]);
        } else if (this.filteredExpressions) {
          // Check if we have it in filtered expressions
          const filteredItem = this.filteredExpressions.find(expression => expression.id === id);
          if (filteredItem) {
            if (!DataExpressionId.isExpressionGroupId(id)) {
              // If it's an expression, just add it
              toSelect.push(filteredItem as DataExpression);
            } else {
              // If it's a group, add each sub-item
              const filteredGroup = filteredItem as ExpressionGroup;
              for (const groupItem of filteredGroup.groupItems) {
                const subExpr = this._expressionService.expressions$.value[groupItem.expressionId];
                if (subExpr) {
                  toSelect.push(subExpr);
                }
              }
            }
          } else {
            // If we dont have it in filtered expressions, then we are waiting for it to load
            toSelect.push(DataExpression.create({ id: `loading-${id}`, name: `Loading (${id})...` }));
            this._unmatchedExpressions = true;
          }
        }
      }

      // Add these to what we're building
      if (toSelect.length > 0) {
        this.selectedExpressions.push(...toSelect);
      }
    }
  }

  onCloseExpressionGroupDialog() {
    this.newExpressionGroupName = "";
    this.newExpressionGroupDescription = "";
    this.newExpressionGroupTags = [];

    if (this.saveExpressionGroupDialog && this.saveExpressionGroupDialog instanceof PushButtonComponent) {
      (this.saveExpressionGroupDialog as PushButtonComponent).closeDialog();
    }
  }

  onNewExpressionGroupTagSelectionChanged(tags: string[]) {
    this.newExpressionGroupTags = tags;
  }

  onSaveNewExpressionGroup() {
    let expressionGroup = ExpressionGroup.create({
      name: this.newExpressionGroupName,
      description: this.newExpressionGroupDescription,
      tags: this.newExpressionGroupTags,
    });
    expressionGroup.groupItems = this.selectedExpressionIdOrder.map(id => {
      return ExpressionGroupItem.create({ expressionId: id });
    });

    if (this.overwriteExistingExpressionGroup && this.selectedExpressionGroupId) {
      expressionGroup.id = this.selectedExpressionGroupId;
    }

    this._expressionService.writeExpressionGroup(expressionGroup);
    this.onCloseExpressionGroupDialog();
  }

  trackById(index: number, item: DataExpression | ExpressionGroup): string {
    return `${index}-${item.id}`;
  }

  checkSelected(id: string): boolean {
    return this.selectedExpressionIds.has(id);
  }

  onSubSectionSelect(section: string, subSection: string) {
    if (section === "Elements") {
      this.manualFilters = { authors: [], searchString: "", tagIDs: [], expressionType: subSection };
    } else if (section !== this.activeBrowseGroup) {
      this.manualFilters = { authors: [], searchString: "", tagIDs: [], expressionType: section };
    }

    if ([ExpressionBrowseSections.MY_EXPRESSIONS, ExpressionBrowseSections.MY_EXPRESSION_GROUPS].includes(subSection)) {
      this.manualFilters = { searchString: "", tagIDs: [], expressionType: section, authors: [this._currentUserId] };
    } else if (subSection === ExpressionBrowseSections.ALL) {
      this.manualFilters = {
        authors: [],
        searchString: "",
        tagIDs: [],
        expressionType: this.manualFilters?.expressionType || ExpressionBrowseSections.EXPRESSIONS,
      };
    }

    if (subSection === ExpressionBrowseSections.RECENT) {
      this.manualFilters = { authors: [], searchString: "", tagIDs: [], expressionType: section, onlyShowRecent: true };
    }

    this.activeBrowseGroup = section;
    this.activeBrowseSection = subSection;
  }

  get isShowingExpressionGroups(): boolean {
    return this.manualFilters?.expressionType === ExpressionBrowseSections.EXPRESSION_GROUPS;
  }

  get applyTooltip(): string {
    let tooltip = "";
    if (this.waitingForExpressions.length > 0) {
      tooltip = `Waiting for (${this.waitingForExpressions.length}) expressions to finish downloading...`;
    } else {
      tooltip = `Apply Selected Expressions:`;
      this.selectedExpressionIdOrder.forEach((id, i) => {
        if (this.maxSelection && i >= this.maxSelection) {
          return;
        }

        let expression = this.selectedExpressions.find(expression => expression.id === id);
        if (expression && expression.id) {
          tooltip += `\n${expression?.name || id}`;
        }
      });
    }

    return tooltip;
  }

  get canSelectMore(): boolean {
    return !this.data.maxSelection || this.selectedExpressionIds.size < this.data.maxSelection;
  }

  get selectedExpressionGroupId(): string {
    return this._selectedExpressionGroupId;
  }

  set selectedExpressionGroupId(id: string) {
    this._selectedExpressionGroupId = id;

    let expressionGroup = this.editableExpressionGroups.find(group => group.id === id);
    this.newExpressionGroupName = expressionGroup?.name || "";
    this.newExpressionGroupDescription = expressionGroup?.description || "";
    this.newExpressionGroupTags = expressionGroup?.tags || [];
  }

  loadRecentExpressionsFromCache(): void {
    let recentExpressions = localStorage.getItem("recentExpressions");
    if (recentExpressions) {
      let parsedExpressions = JSON.parse(recentExpressions);
      if (Array.isArray(parsedExpressions)) {
        this.recentExpressions = parsedExpressions.map((recentExpression: RecentExpression) => {
          return {
            expression:
              recentExpression.type === "expression" ? DataExpression.create(recentExpression.expression) : ExpressionGroup.create(recentExpression.expression),
            lastSelected: recentExpression.lastSelected,
            type: recentExpression.type,
          };
        });
      }
    }
  }

  cacheRecentExpressions(): void {
    localStorage.setItem(
      "recentExpressions",
      JSON.stringify(this.recentExpressions.filter(expression => !expression.expression.id.startsWith("loading-")).slice(0, 10))
    );
  }

  updateRecentExpression(expression: DataExpression | ExpressionGroup): void {
    let existingRecentExpression = this.recentExpressions.find(recentExpression => recentExpression.expression.id === expression.id);
    if (!existingRecentExpression) {
      this.recentExpressions.push({ expression, type: this.isShowingExpressionGroups ? "group" : "expression", lastSelected: Date.now() });
    } else {
      existingRecentExpression.lastSelected = Date.now();
    }

    this.recentExpressions.sort((a, b) => b.lastSelected - a.lastSelected);
    this.cacheRecentExpressions();
  }

  toggleExpression(expression: DataExpression, saveToRecent: boolean = true): void {
    if (this.data.maxSelection === 1) {
      this.selectedExpressionIds.clear();
      this.selectedExpressionIds.add(expression.id);
      this.selectedExpressionIdOrder = [expression.id];
      this.updateRecentExpression(expression as DataExpression);
      return;
    }

    let strippedExpressionId = expression.id.replace("loading-", "");

    if (this.selectedExpressionIds.has(strippedExpressionId)) {
      this.selectedExpressionIds.delete(strippedExpressionId);
      this.selectedExpressionIdOrder = this.selectedExpressionIdOrder.filter(id => id !== strippedExpressionId);
    } else if (!this.canSelectMore) {
      return;
    } else {
      this.selectedExpressionIds.add(strippedExpressionId);
      this.selectedExpressionIdOrder.push(strippedExpressionId);
      if (this.expressionTriggerPosition > -1) {
        // Move the expression to the trigger position
        this.selectedExpressionIdOrder[this.selectedExpressionIdOrder.length - 1] = this.selectedExpressionIdOrder[this.expressionTriggerPosition];
        this.selectedExpressionIdOrder[this.expressionTriggerPosition] = strippedExpressionId;
      }

      if (saveToRecent) {
        this.updateRecentExpression(expression as DataExpression);
      }
    }
  }

  onSelect(expression: DataExpression | ExpressionGroup): void {
    if (this.isShowingExpressionGroups && (expression as ExpressionGroup)?.groupItems) {
      let expressionGroup = expression as ExpressionGroup;

      this.updateRecentExpression(expressionGroup);

      let groupItemIds = (expressionGroup?.groupItems || []).map(groupItem => groupItem.expressionId);

      this.selectedExpressionIds = new Set(groupItemIds);
      this.selectedExpressionIdOrder = groupItemIds;

      groupItemIds.forEach(expressionId => {
        this._expressionService.fetchExpression(expressionId);
      });

      this.overwriteExistingExpressionGroup = true;
      this.selectedExpressionGroupId = expressionGroup.id;

      // Clear the last written expression because we're now working with a new group
      this._expressionService.lastWrittenExpressionGroupId$.next("");
    } else {
      this.toggleExpression(expression as DataExpression);
    }

    this.updateSelectedExpressions();
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
    this.updateSelectedExpressions();
    if (!this.fetchedAllSelectedExpressions) {
      return;
    }

    this.scanId = scanId;
    this.loadQuantifiedExpressions(this._analysisLayoutService.availableScanQuants$.value);
    if (this._unmatchedExpressions) {
      this.updateSelectedExpressions();
    }

    if (quantId && !this.quantId) {
      this.quantId = quantId;
    }
  }

  onChangeWidgetPosition(expression: DataExpression, widgetPosition: number): void {
    let existingOrder = Array.from(this.selectedExpressionIdOrder);
    let idInRequestedPosition = existingOrder[widgetPosition];
    if (idInRequestedPosition) {
      let existingPosition = existingOrder.indexOf(expression.id);
      if (existingPosition > -1) {
        // Both ids exist, so swap them
        existingOrder[existingPosition] = idInRequestedPosition;
        existingOrder[widgetPosition] = expression.id;
      } else {
        // There's an id in the requested position, but not the current position, so insert the current id
        existingOrder[widgetPosition] = expression.id;
        existingOrder.push(idInRequestedPosition);
      }
    } else if (widgetPosition === existingOrder.length) {
      // There's no id in the requested position and it's the next element, so just add it
      existingOrder.push(expression.id);
    } else {
      // There's no id in the requested position, but there's a gap, so add, then fill the gap
      existingOrder[widgetPosition] = expression.id;
      for (let i = 0; i <= widgetPosition; i++) {
        if (!existingOrder[i]) {
          existingOrder[i] = "";
        }
      }
    }
    this.selectedExpressionIdOrder = [...existingOrder];
    this.updateSelectedExpressions();
  }

  onRemoveExpressionFromActive(expression: DataExpression): void {
    if (this.data.widgetType) {
      this._snackBarService.openSuccess(`Removed ${expression.name} from ${this.data.widgetType}`);
    }
  }

  onToggleSearch(): void {
    this.showSearchControls = !this.showSearchControls;
  }

  onClearRecent(sectionName: string) {
    this.recentExpressions = this.recentExpressions.filter(recentExpression => {
      if (recentExpression.type === "expression" && sectionName === ExpressionBrowseSections.EXPRESSIONS) {
        return false;
      } else if (recentExpression.type === "group" && sectionName === ExpressionBrowseSections.EXPRESSION_GROUPS) {
        return false;
      } else {
        return true;
      }
    });

    this.cacheRecentExpressions();
    this.updateSelectedExpressions();

    if (this.activeBrowseSection === ExpressionBrowseSections.RECENT) {
      this.manualFilters = { authors: [], searchString: "", tagIDs: [], expressionType: this.activeBrowseGroup, onlyShowRecent: true };
    }
  }

  onCancel(): void {
    this._analysisLayoutService.highlightedWidgetId$.next("");
    this.dialogRef.close();
  }

  get activeLayerHeight(): number {
    let widgetLayerConfig = widgetLayerPositions[this.widgetType];
    return widgetLayerConfig ? 80 : 45.5;
  }

  get triggerName(): string {
    let defaultName = `${this.expressionTriggerPosition + 1}`;

    let widgetLayerConfig = widgetLayerPositions[this.widgetType];
    if (widgetLayerConfig) {
      return Object.entries(widgetLayerConfig).find(([, option]) => option.position === this.expressionTriggerPosition)?.[0] || defaultName;
    } else {
      return defaultName;
    }
  }

  onClearTriggerPosition(): void {
    this.expressionTriggerPosition = -1;
  }

  onConfirm(): void {
    const selectedExpressions: (DataExpression | ExpressionGroup)[] = Array.from(this.selectedExpressionIdOrder)
      .map(id => this.selectedExpressions.find(expression => expression?.id === id))
      .filter(expression => expression) as (DataExpression | ExpressionGroup)[];

    this._analysisLayoutService.expressionPickerResponse$.next({
      selectedExpressions,
      scanId: this.scanId,
      quantId: this.quantId,
    });

    this.dialogRef.close();
  }

  onClear(): void {
    this.selectedExpressionIds.clear();
    this.selectedExpressionIdOrder = [];
  }
}
