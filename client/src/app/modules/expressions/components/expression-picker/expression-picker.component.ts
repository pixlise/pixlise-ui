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
import { SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { combineLatest, filter, map, of, Subscription, switchMap } from "rxjs";
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
import { getAnomalyExpressions, getPredefinedExpression } from "src/app/expression-language/predefined-expressions";
import { WIDGETS, WidgetConfiguration, WidgetType } from "src/app/modules/widget/models/widgets.model";
import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";
import { WidgetData } from "src/app/generated-protos/widget-data";
import { widgetLayerPositions } from "../../models/expression-widget-layer-configs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ExpressionGroupGetReq } from "src/app/generated-protos/expression-group-msgs";
import { ObjectType } from "src/app/generated-protos/ownership-access";
import { ScanItem } from "src/app/generated-protos/scan";

export type ExpressionPickerResponse = {
  selectedGroup?: ExpressionGroup;
  selectedExpressions: DataExpression[];
  scanId: string;
  quantId: string;
  persistDialog: boolean;
};

export type ExpressionPickerData = {
  selectedIds?: string[];
  expressionTriggerPosition?: number;
  widgetId?: string;
  scanId?: string;
  quantId?: string;
  noActiveScreenConfig?: boolean;
  maxSelection?: number;
  enforceMaxSelectionWhileEditing?: boolean;
  widgetType?: string;
  disableExpressionGroups?: boolean;
  expressionsOnly?: boolean;
  draggable?: boolean;
  liveReload?: boolean;
  singleSelectionOption?: boolean;
  preserveGroupSelection?: boolean; // If user selects a group, don't select its component expressions, but keep the group id selected
  showRGBMixMode?: boolean;
  rgbMixModeActive?: boolean;
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

  private _selectedExpressionIdOrder: string[] = [];
  private _selectedExpressionIds: Set<string> = new Set();
  private _selectedExpressions: (DataExpression | ExpressionGroup)[] = [];

  private _selectedRGBMixExpressionIdOrder: string[] = [];
  private _selectedRGBMixExpressionIds: Set<string> = new Set();
  private _selectedRGBMixExpressions: (DataExpression | ExpressionGroup)[] = [];

  recentExpressions: RecentExpression[] = [];

  private _quantifiedExpressions: Record<string, DataExpression> = {};
  private _anomalyExpressions: Record<string, DataExpression> = {};
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
  overwriteExistingExpressionGroup: boolean = false;

  scanId: string = "";
  quantId: string = "";

  widgetType: WidgetType | "" = "";
  private _activeWidgetId: string = "";
  layoutWidgets: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];

  private _selectedExpressionGroup: ExpressionGroup = ExpressionGroup.create();
  private _selectedRGBMixGroup: ExpressionGroup = ExpressionGroup.create();

  maxSelection: number = 0;
  expressionTriggerPosition: number = -1;

  draggable: boolean = false;

  persistDialog: boolean = false;
  singleSelectionOption: boolean = false;

  rgbMixModeGroupOptions = ["Expressions", "RGB Mix"];
  private _activeRGBMixModeGroup: string = "Expressions";
  private _showRGBMixMode: boolean = false;

  expressionGroupType: ObjectType = ObjectType.OT_EXPRESSION_GROUP;

  configuredScans: ScanItem[] = [];

  selectedScanIdForQuantifiedElements: string = "";
  private _activeQuantifiedElementDetector: "A" | "B" | "A&B" | "" = "";

  constructor(
    private _cachedDataSerivce: APICachedDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackBarService: SnackbarService,
    private _userOptionsService: UserOptionsService,
    private _expressionService: ExpressionsService,
    private _widgetDataService: WidgetDataService,
    @Inject(MAT_DIALOG_DATA) public data: ExpressionPickerData,
    public dialogRef: MatDialogRef<ExpressionPickerComponent, ExpressionPickerResponse>
  ) {}

  ngOnInit(): void {
    this.persistDialog = !!this.data?.liveReload;
    this.singleSelectionOption = !!this.data?.singleSelectionOption;
    this.scanId = this.data.scanId || this._analysisLayoutService.defaultScanId || "";
    this.quantId = this.data.quantId || this._analysisLayoutService.getQuantIdForScan(this.scanId) || "";
    this.draggable = this.data.draggable || false;

    let widgetSpec: WidgetConfiguration = WIDGETS[this.data?.widgetType as keyof typeof WIDGETS];

    if (this.data.showRGBMixMode === undefined) {
      this.showRGBMixMode = widgetSpec?.showRGBMixExpressionPickerMode || false;
    } else if (this.data.showRGBMixMode) {
      this.showRGBMixMode = true;
      this.activeRGBMixModeGroup = this.data.rgbMixModeActive ? "RGB Mix" : "Expressions";
    }

    this._activeWidgetId = this.data.widgetId || "";
    this.expressionTriggerPosition = this.data?.expressionTriggerPosition ?? -1;
    this._analysisLayoutService.highlightedWidgetId$.next(this._activeWidgetId);

    let expressionIds = (this.data.selectedIds || []).filter(id => id && !DataExpressionId.isExpressionGroupId(id));
    this._selectedExpressionIds = new Set(expressionIds);
    this._selectedExpressionIdOrder = Array.from(this._selectedExpressionIds);

    if (this.showRGBMixMode) {
      let groupId = (this.data.selectedIds || []).find(id => id && DataExpressionId.isExpressionGroupId(id));
      if (groupId) {
        this.selectedExpressionGroupId = groupId;
        this.fetchAndLoadGroupAsRGBMix(groupId);
      }
    } else {
      this.updateSelectedExpressions();
    }

    if (this.data.widgetType) {
      this.widgetType = this.data.widgetType as WidgetType;
      this.maxSelection = widgetSpec?.maxExpressions || 0;
    } else if (this.data?.maxSelection) {
      this.maxSelection = this.data.maxSelection;
    }

    if (this.data.disableExpressionGroups) {
      this.browseSections = this.browseSections.filter(section => section.name !== ExpressionBrowseSections.EXPRESSION_GROUPS);
    }

    if (this.data.expressionsOnly) {
      this.browseSections = this.browseSections.filter(section => section.name === ExpressionBrowseSections.EXPRESSIONS);
    }

    this.loadAnomalyExpressions();
    this.loadRecentExpressionsFromCache();

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(config => {
        if (config) {
          const widgetReferences: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
          config.layouts.forEach((layout, i) => {
            const widgetCounts: Record<string, number> = {};
            layout.widgets.forEach((widget, widgetIndex) => {
              if (widgetCounts[widget.type]) {
                widgetCounts[widget.type]++;
              } else {
                widgetCounts[widget.type] = 1;
              }

              const widgetTypeName = WIDGETS[widget.type as keyof typeof WIDGETS].name;
              const widgetName = `${widgetTypeName} ${widgetCounts[widget.type]}${i > 0 ? ` (page ${i + 1})` : ""}`;

              widgetReferences.push({ widget, name: widgetName, type: widget.type });
            });
          });

          // Filter out widgets that don't store expressions
          this.layoutWidgets = widgetReferences.filter(widget => {
            let spec: WidgetConfiguration = WIDGETS?.[widget.type as WidgetType];
            return spec.hasExpressions || false;
          });
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$
        .pipe(
          filter(config => !!config),
          switchMap(config =>
            this._analysisLayoutService.availableScans$.pipe(
              filter(scans => !!scans),
              map(scans => {
                let configuredScans = Object.entries(config.scanConfigurations).map(([scanId]) => {
                  return scans.find(scan => scan.id === scanId);
                });
                return configuredScans.filter(scan => !!scan) as ScanItem[];
              })
            )
          )
        )
        .subscribe(configuredScans => {
          this.configuredScans = configuredScans;
        })
    );

    this._subs.add(
      this._expressionService.expressions$.subscribe(expressions => {
        const notFoundExpressions: string[] = [];
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
          if (!this.isRGBMixModeActive) {
            this.overwriteExistingExpressionGroup = true;
            this.selectedExpressionGroupId = id;
          }
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
    }

    this._subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(availableScanQuants => {
        this.loadQuantifiedExpressions(availableScanQuants);
        if (this._unmatchedExpressions) {
          this.updateSelectedExpressions();
        }
      })
    );

    this._selectedExpressionIds.forEach(id => {
      if (!this._expressionService.expressions$.value[id] && !this.isExpressionBuiltin(id)) {
        this.fetchedAllSelectedExpressions = false;
        this._expressionService.fetchExpression(id);
      }
    });
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onClearRGBMix(): void {
    this._selectedRGBMixGroup = ExpressionGroup.create();
    this._selectedRGBMixExpressions = [];
    this._selectedRGBMixExpressionIds = new Set();
    this._selectedRGBMixExpressionIdOrder = [];
    this.overwriteExistingExpressionGroup = false;
  }

  loadGroupAsRGBMix(group: ExpressionGroup): void {
    this.overwriteExistingExpressionGroup = true;
    this.activeRGBMixModeGroup = "RGB Mix";
    this._selectedRGBMixGroup = ExpressionGroup.create(group);
    this._selectedRGBMixExpressionIds = new Set(group.groupItems.map(groupItem => groupItem.expressionId));
    this._selectedRGBMixExpressionIdOrder = group.groupItems.map(groupItem => groupItem.expressionId);
    this.updateSelectedExpressions();
  }

  fetchAndLoadGroupAsRGBMix(groupId: string): void {
    this._cachedDataSerivce.getExpressionGroup(ExpressionGroupGetReq.create({ id: groupId })).subscribe(group => {
      if (group?.group) {
        this.loadGroupAsRGBMix(group.group);
      }
    });
  }

  get selectedExpressionIdOrder(): string[] {
    return this.isRGBMixModeActive ? this._selectedRGBMixExpressionIdOrder : this._selectedExpressionIdOrder;
  }

  set selectedExpressionIdOrder(order: string[]) {
    if (this.isRGBMixModeActive) {
      this._selectedRGBMixExpressionIdOrder = order;
    } else {
      this._selectedExpressionIdOrder = order;
    }
  }

  get selectedExpressionIds(): Set<string> {
    return this.isRGBMixModeActive ? this._selectedRGBMixExpressionIds : this._selectedExpressionIds;
  }

  set selectedExpressionIds(ids: Set<string>) {
    if (this.isRGBMixModeActive) {
      this._selectedRGBMixExpressionIds = ids;
    } else {
      this._selectedExpressionIds = ids;
    }
  }

  get selectedExpressions(): (DataExpression | ExpressionGroup)[] {
    return this.isRGBMixModeActive ? this._selectedRGBMixExpressions : this._selectedExpressions;
  }

  set selectedExpressions(expressions: (DataExpression | ExpressionGroup)[]) {
    if (this.isRGBMixModeActive) {
      this._selectedRGBMixExpressions = expressions;
    } else {
      this._selectedExpressions = expressions;
    }
  }

  get activeRGBMixModeGroup(): string {
    return this._activeRGBMixModeGroup;
  }

  set activeRGBMixModeGroup(group: string) {
    this._activeRGBMixModeGroup = group;

    this.updateSelectedExpressions();
  }

  get isRGBMixModeActive(): boolean {
    return this.activeRGBMixModeGroup === "RGB Mix";
  }

  get showRGBMixMode(): boolean {
    return this._showRGBMixMode;
  }

  set showRGBMixMode(show: boolean) {
    this._showRGBMixMode = show;
    if (!show) {
      this.activeRGBMixModeGroup = "Expressions";
    }

    this.updateSelectedExpressions();
  }

  onSingleSelectionToggle(): void {
    this.maxSelection = this.maxSelection === 1 ? 0 : 1;
    if (this.maxSelection === 1 && this.selectedExpressionIdOrder.length > 1) {
      if (this.showRGBMixMode && this.isRGBMixModeActive && this.selectedExpressionIdOrder.length >= 3) {
        this.selectedExpressionIds = new Set(this.selectedExpressionIdOrder.slice(0, 3));
        this.selectedExpressionIdOrder = this.selectedExpressionIdOrder.slice(0, 3);
        this.updateSelectedExpressions();
      } else {
        this.selectedExpressionIds = new Set([this.selectedExpressionIdOrder[0]]);
        this.selectedExpressionIdOrder = [this.selectedExpressionIdOrder[0]];
        this.updateSelectedExpressions();
      }
    }
  }

  private _getWidgetData(widgetId: string): { data: any | null; spec: WidgetConfiguration | null; type: WidgetType | null } {
    const widget = this.layoutWidgets.find(widget => widget.widget.id === widgetId);
    if (!widget || !widget.type) {
      return { spec: null, data: null, type: null };
    }

    let type = widget.type as WidgetType;
    let spec = WIDGETS[type];
    let data = (widget?.widget?.data?.[spec?.dataKey as keyof WidgetData] as any) || null;

    return { spec, data, type };
  }

  private _expressionIdsFromWidgetData(widgetData: any): string[] {
    const expressionIds: string[] = [];
    if (widgetData?.expressionIDs) {
      expressionIds.push(...widgetData.expressionIDs);
    } else if (widgetData?.mapLayers && Array.isArray(widgetData.mapLayers)) {
      widgetData.mapLayers.forEach((layer: any) => {
        if (layer?.expressionID) {
          expressionIds.push(layer.expressionID);
        }
      });
    }

    return expressionIds;
  }

  get activeWidgetId(): string {
    return this._activeWidgetId;
  }

  set activeWidgetId(id: string) {
    this._activeWidgetId = id;
    this._analysisLayoutService.highlightedWidgetId$.next(id);
    this.expressionTriggerPosition = -1;

    let { spec, data, type } = this._getWidgetData(id);
    if (spec && data && type) {
      this.widgetType = type;
      let expressionIds = this._expressionIdsFromWidgetData(data);

      // Make sure we only store expression ids and not group ids here
      let expressions = expressionIds.filter(id => !DataExpressionId.isExpressionGroupId(id));
      this._selectedExpressionIds = new Set(expressions);
      this._selectedExpressionIdOrder = Array.from(this.selectedExpressionIds);
      this.maxSelection = spec.maxExpressions || 0;
      this.showRGBMixMode = spec.showRGBMixExpressionPickerMode || false;

      // Only load the group if we are in RGB Mix mode
      if (this.showRGBMixMode) {
        let groupId = (expressionIds || []).find(id => DataExpressionId.isExpressionGroupId(id));
        if (groupId) {
          this.fetchAndLoadGroupAsRGBMix(groupId);
        }
      }

      this.updateSelectedExpressions();
    }
  }

  loadAnomalyExpressions(): void {
    this._anomalyExpressions = {};
    const anomalyExpressions = getAnomalyExpressions();
    anomalyExpressions.forEach(expression => {
      this._anomalyExpressions[expression.id] = expression;
    });
  }

  get activeQuantifiedElementDetector(): "A" | "B" | "A&B" | "" {
    return this._activeQuantifiedElementDetector;
  }

  set activeQuantifiedElementDetector(detector: "A" | "B" | "A&B" | "") {
    this._activeQuantifiedElementDetector = detector;
    this.loadQuantifiedExpressions(this._analysisLayoutService.availableScanQuants$.value);
  }

  loadQuantifiedExpressions(availableScanQuants: Record<string, QuantificationSummary[]>): void {
    this._quantifiedExpressions = {};

    const quants = availableScanQuants[this.scanId];
    if (quants) {
      if (!this.quantId) {
        this.quantId = this._analysisLayoutService.getQuantIdForScan(this.scanId);
      }
      const currentQuant = quants.find(quant => quant.id === this.quantId);
      if (currentQuant) {
        currentQuant.elements.forEach(quantElement => {
          let quantMode = currentQuant?.params?.userParams?.quantMode || "";
          let defaultDetector = quantMode;
          if (defaultDetector.length > 0 && defaultDetector != "Combined") {
            defaultDetector = defaultDetector.substring(0, 1);
          }

          if (!this.activeQuantifiedElementDetector) {
            this.activeQuantifiedElementDetector = defaultDetector.replace("Combined", "A&B") as "A" | "B" | "A&B";
          }

          let detector = this.activeQuantifiedElementDetector.replace("A&B", "Combined");

          const id = DataExpressionId.makePredefinedQuantElementExpression(quantElement, "%", detector);
          const expr = getPredefinedExpression(id);
          if (expr) {
            this._quantifiedExpressions[id] = expr;
          }
        });
      }
    }
  }

  isExpressionBuiltin(id: string): boolean {
    const unsavedExpression = this._widgetDataService.unsavedExpressions.get(id);
    return !!(unsavedExpression || this._pseudoIntensities[id] || this._quantifiedExpressions[id] || this._anomalyExpressions[id]);
  }

  updateSelectedExpressions() {
    this._unmatchedExpressions = false;
    this.selectedExpressions = [];

    const toSelect: (DataExpression | ExpressionGroup)[] = [];

    for (const id of this.selectedExpressionIds) {
      const expression = this._expressionService.expressions$.value[id];
      if (expression) {
        toSelect.push(expression);
      } else {
        const unsavedExpression = this._widgetDataService.unsavedExpressions.get(id);
        if (unsavedExpression) {
          // Check if we have it in unsaved expressions
          toSelect.push(unsavedExpression);
        } else if (this._pseudoIntensities[id]) {
          // Check if we have it in pseudo intensities
          toSelect.push(this._pseudoIntensities[id]);
        } else if (this._quantifiedExpressions[id]) {
          // Check if we have it in quantified expressions
          toSelect.push(this._quantifiedExpressions[id]);
        } else if (this._anomalyExpressions[id]) {
          toSelect.push(this._anomalyExpressions[id]);
        } else if (DataExpressionId.isPredefinedExpression(id)) {
          // Check if it's a predefined expression
          const expr = getPredefinedExpression(id);
          if (expr) {
            toSelect.push(expr);
          } else {
            // If we dont have it, then we are waiting for it to load
            toSelect.push(DataExpression.create({ id, name: `Loading (${id})...` }));
            this._unmatchedExpressions = true;
          }
        } else if (this.filteredExpressions) {
          // Check if we have it in filtered expressions
          const filteredItem = this.filteredExpressions.find(expression => expression.id === id);
          if (filteredItem) {
            if (!DataExpressionId.isExpressionGroupId(id)) {
              // If it's an expression, just add it
              toSelect.push(filteredItem as DataExpression);
            } else {
              // If it's a group, proceed depending on setting
              if (this.data.preserveGroupSelection) {
                // Add the group
                toSelect.push(filteredItem);
              } else {
                // add each sub-item
                const filteredGroup = filteredItem as ExpressionGroup;
                for (const groupItem of filteredGroup.groupItems) {
                  const subExpr = this._expressionService.expressions$.value[groupItem.expressionId];
                  if (subExpr) {
                    toSelect.push(subExpr);
                  }
                }
              }
            }
          } else {
            // If we dont have it in filtered expressions, then we are waiting for it to load
            toSelect.push(DataExpression.create({ id, name: `Loading (${id})...` }));
            this._unmatchedExpressions = true;
          }
        }
      }
    }

    // Add these to what we're building
    if (toSelect.length > 0) {
      this.selectedExpressions = [...toSelect];
    }
  }

  get selectedGroup(): ExpressionGroup {
    return this.isRGBMixModeActive ? this._selectedRGBMixGroup : this._selectedExpressionGroup;
  }

  set selectedGroup(group: ExpressionGroup) {
    if (this.isRGBMixModeActive) {
      this._selectedRGBMixGroup = group;
    } else {
      this._selectedExpressionGroup = group;
    }
  }

  onCloseExpressionGroupDialog() {
    if (this.saveExpressionGroupDialog && this.saveExpressionGroupDialog instanceof PushButtonComponent) {
      (this.saveExpressionGroupDialog as PushButtonComponent).closeDialog();
    }
  }

  onNewExpressionGroupTagSelectionChanged(tags: string[]) {
    this.selectedGroup.tags = tags;
  }

  onSaveNewExpressionGroup() {
    const expressionGroup = ExpressionGroup.create({
      name: this.selectedGroup.name,
      description: this.selectedGroup.description,
      tags: this.selectedGroup.tags,
    });
    expressionGroup.groupItems = this.selectedExpressionIdOrder.map(id => {
      return ExpressionGroupItem.create({ expressionId: id });
    });

    if (this.overwriteExistingExpressionGroup && this.selectedGroup.id) {
      expressionGroup.id = this.selectedGroup.id;
    }

    this._expressionService.writeExpressionGroupAsync(expressionGroup).subscribe({
      next: group => {
        // this.loadGroupAsRGBMix(group);
        this.selectedGroup.id = group.id;

        this._analysisLayoutService.expressionPickerResponse$.next({
          selectedGroup: group,
          selectedExpressions: this._selectedExpressions as DataExpression[],
          scanId: this.scanId,
          quantId: this.quantId,
          persistDialog: this.persistDialog,
        });

        this.onCloseExpressionGroupDialog();
      },
      error: err => {
        this._snackBarService.openError("Error saving RGB Mix group", err);
        this.onCloseExpressionGroupDialog();
      },
    });
  }

  trackById(index: number, item: DataExpression | ExpressionGroup): string {
    return `${index}-${item.id}`;
  }

  checkSelected(id: string): boolean {
    if (this.showRGBMixMode && this.isRGBMixModeActive && this.activeBrowseGroup === "Expression Groups") {
      return this.selectedGroup.id === id;
    } else {
      return this.selectedExpressionIds.has(id);
    }
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

        const expression = this.selectedExpressions.find(expression => expression.id === id);
        if (expression && expression.id) {
          tooltip += `\n${expression?.name || id}`;
        }
      });
    }

    return tooltip;
  }

  get canSelectMore(): boolean {
    return !this.maxSelection || !this.data.enforceMaxSelectionWhileEditing || this.selectedExpressionIds.size < this.maxSelection;
  }

  get selectedExpressionGroupId(): string {
    return this.selectedGroup.id;
  }

  set selectedExpressionGroupId(id: string) {
    const expressionGroup = this.editableExpressionGroups.find(group => group.id === id);
    if (expressionGroup) {
      this.selectedGroup = expressionGroup;
    } else {
      this.selectedGroup = ExpressionGroup.create();
    }
  }

  loadRecentExpressionsFromCache(): void {
    const recentExpressions = localStorage.getItem("recentExpressions");
    if (recentExpressions) {
      const parsedExpressions = JSON.parse(recentExpressions);
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
    if (expression.owner?.creatorUser?.id === DataExpressionId.BuiltInUserId) {
      return;
    }

    const existingRecentExpression = this.recentExpressions.find(recentExpression => recentExpression.expression.id === expression.id);
    if (!existingRecentExpression) {
      this.recentExpressions.push({ expression, type: this.isShowingExpressionGroups ? "group" : "expression", lastSelected: Date.now() });
    } else {
      existingRecentExpression.lastSelected = Date.now();
    }

    this.recentExpressions.sort((a, b) => b.lastSelected - a.lastSelected);
    this.cacheRecentExpressions();
  }

  toggleExpression(expression: DataExpression | ExpressionGroup, saveToRecent: boolean = true): void {
    if (this.maxSelection === 1) {
      this.selectedExpressionIds.clear();
      this.selectedExpressionIds.add(expression.id);
      this.selectedExpressionIdOrder = [expression.id];
      this.updateRecentExpression(expression);
      this.updateSelectedExpressions();

      if (this.persistDialog) {
        this.onConfirm();
      }
      return;
    }

    const strippedExpressionId = expression.id.replace("loading-", "");

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
        this.updateRecentExpression(expression);
      }
    }

    this.updateSelectedExpressions();
  }

  onSelect(expression: DataExpression | ExpressionGroup): void {
    if (this.isShowingExpressionGroups && (expression as ExpressionGroup)?.groupItems) {
      const expressionGroup = expression as ExpressionGroup;

      this.updateRecentExpression(expressionGroup);

      if (this.maxSelection === 1 && this.showRGBMixMode && !this.isRGBMixModeActive) {
        this.onClear();
        this.updateSelectedExpressions();
        this.activeRGBMixModeGroup = "RGB Mix";
      }

      if (this.isRGBMixModeActive) {
        this.loadGroupAsRGBMix(expressionGroup);
      }

      if (!this.data.preserveGroupSelection) {
        const groupItemIds = (expressionGroup?.groupItems || []).map(groupItem => groupItem.expressionId);

        this.selectedExpressionIds = new Set(groupItemIds);
        this.selectedExpressionIdOrder = groupItemIds;

        let expressionRequests = groupItemIds.map(id =>
          id && !DataExpressionId.isPredefinedExpression(id) ? this._expressionService.fetchCachedExpression(id) : of(null)
        );
        combineLatest(expressionRequests).subscribe(() => {
          if (this.maxSelection === 1 && this.showRGBMixMode) {
            this.selectedExpressionIdOrder = groupItemIds.slice(0, 3);
            this.selectedExpressionIds = new Set(this.selectedExpressionIdOrder);
            this.updateSelectedExpressions();

            if (this.persistDialog) {
              this.onConfirm();
            }
          } else {
            this.loadGroupAsRGBMix(expressionGroup);
            // Clear the last written expression because we're now working with a new group
            this._expressionService.lastWrittenExpressionGroupId$.next("");
            this.updateSelectedExpressions();
          }
        });
      } else {
        this.toggleExpression(expressionGroup);
      }
    } else {
      if (this.maxSelection === 1 && this.isRGBMixModeActive) {
        this.activeRGBMixModeGroup = "Expressions";
        this.onClearRGBMix();
      }

      this.toggleExpression(expression as DataExpression);
    }

    if (!this.data.preserveGroupSelection) {
      this.updateSelectedExpressions();
    }
  }

  onFilterAuthor(author: string): void {
    if (author === DataExpressionId.BuiltInUserId) {
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
    const existingOrder = Array.from(this.selectedExpressionIdOrder);
    const idInRequestedPosition = existingOrder[widgetPosition];
    if (idInRequestedPosition) {
      const existingPosition = existingOrder.indexOf(expression.id);
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
    const widgetLayerConfig = widgetLayerPositions[this.widgetType];
    return widgetLayerConfig ? 80 : 45.5;
  }

  get triggerName(): string {
    const defaultName = `${this.expressionTriggerPosition + 1}`;

    const widgetLayerConfig = widgetLayerPositions[this.widgetType];
    if (widgetLayerConfig) {
      return Object.entries(widgetLayerConfig).find(([, option]) => option.position === this.expressionTriggerPosition)?.[0] || defaultName;
    } else {
      return defaultName;
    }
  }

  onClearTriggerPosition(): void {
    this.expressionTriggerPosition = -1;
  }

  onTogglePersistDialog(): void {
    this.persistDialog = !this.persistDialog;
  }

  onApplyAndClose(): void {
    this.persistDialog = false;
    this.onConfirm();
  }

  onConfirm(saveExpressionGroup: boolean = false): void {
    const selectedExpressions: DataExpression[] = Array.from(this._selectedExpressionIdOrder)
      .map(id => this._selectedExpressions.find(expression => expression?.id === id))
      .filter(expression => expression) as DataExpression[];

    const rgbMixExpressions: DataExpression[] = this._selectedRGBMixExpressionIdOrder
      .map(id => this._selectedRGBMixExpressions.find(expression => expression?.id === id))
      .filter(group => group) as DataExpression[];

    let selectedGroup = ExpressionGroup.create(this.selectedGroup);
    if (rgbMixExpressions.length >= 3) {
      selectedGroup.groupItems = rgbMixExpressions.slice(0, 3).map(expression => ExpressionGroupItem.create({ expressionId: expression.id }));

      let activeWidgetRef = this.layoutWidgets.find(widget => widget.widget.id === this._activeWidgetId);
      if (activeWidgetRef) {
        // A group wasn't specifically selected and info wasn't entered to create a new one, so save as auto-generated
        if (!selectedGroup.id && !selectedGroup.name) {
          let scanName = this.scanId;
          let quantName = this.quantId;

          let loadedScan = this._analysisLayoutService.getLoadedScan(this.scanId);
          if (loadedScan) {
            scanName = loadedScan.title;

            let loadedQuant = this._analysisLayoutService.getLoadedQuant(this.scanId, this.quantId);
            if (loadedQuant) {
              quantName = loadedQuant.params?.userParams?.name || this.quantId;
            }
          }

          let autoGroupName = `${scanName} ${activeWidgetRef.name} - RGB Mix (${quantName})`;
          let existingId = this.editableExpressionGroups.find(group => group.name === autoGroupName)?.id;
          if (existingId) {
            selectedGroup.id = existingId;
          }

          selectedGroup.name = autoGroupName;
          selectedGroup.description = `Auto-generated RGB Mix group for ${scanName} on the ${activeWidgetRef.name} plot with quant: ${quantName}\n\nIf you would like to save this group for future use, rename it to prevent it from being overwritten`;
        }

        // Invalidate the cached data for this group since we're updating it
        this._cachedDataSerivce.invalidExpressionGroupIds.add(selectedGroup.id);

        selectedGroup.owner = undefined;
        this._expressionService.writeExpressionGroupAsync(selectedGroup, true).subscribe({
          next: group => {
            this.selectedGroup.id = group.id;
            this.selectedGroup.name = group.name;
            this.selectedGroup.description = group.description;

            this._analysisLayoutService.expressionPickerResponse$.next({
              selectedGroup: group,
              selectedExpressions,
              scanId: this.scanId,
              quantId: this.quantId,
              persistDialog: this.persistDialog,
            });
          },
          error: err => {
            this._snackBarService.openError("Error saving RGB Mix group", err);
          },
        });

        if (!this.persistDialog) {
          this.dialogRef.close();
        }
      }
    } else {
      this._analysisLayoutService.expressionPickerResponse$.next({
        selectedExpressions,
        scanId: this.scanId,
        quantId: this.quantId,
        persistDialog: this.persistDialog,
      });

      if (!this.persistDialog) {
        this.dialogRef.close();
      }
    }
  }

  onClear(): void {
    this._selectedExpressionGroup = ExpressionGroup.create();
    this._selectedRGBMixGroup = ExpressionGroup.create();

    this._selectedExpressions = [];
    this._selectedExpressionIds.clear();
    this._selectedExpressionIdOrder = [];

    this._selectedRGBMixExpressions = [];
    this._selectedRGBMixExpressionIds.clear();
    this._selectedRGBMixExpressionIdOrder = [];

    this.overwriteExistingExpressionGroup = false;
  }
}
