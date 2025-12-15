import { MatDialogRef } from "@angular/material/dialog";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { Subscription } from "rxjs";
import { WidgetLayoutConfiguration } from "../../../../generated-protos/screen-configuration";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import {
  WidgetConfiguration,
  WIDGETS,
  WidgetType,
} from "../../../widget/models/widgets.model";
import { EXPORT_PREVIEW_ID_PREFIX } from "../../../widget/components/widget-export-dialog/widget-export-model";

@Component({
  standalone: false,
  selector: "widget-selection-dialog",
  templateUrl: "./widget-selection-dialog.component.html",
  styleUrls: ["./widget-selection-dialog.component.scss"],
})
export class WidgetSelectionDialogComponent {
  private _subs: Subscription = new Subscription();
  private _activeWidgetIds: string[] = [];
  currentWidgetTabIndex: number = 0;
  layoutWidgets: {
    widget: WidgetLayoutConfiguration;
    name: string;
    type: string;
    pageIndex?: number; 
    tabName?: string;
  }[] = [];

  @Input() widgetTypes: WidgetType[] = [];
  @Input() widgetId: string = "";
  @Output() onActiveWidgetIdsChanged: EventEmitter<string[]> = new EventEmitter<
    string[]
  >();

  constructor(
    public dialogRef: MatDialogRef<WidgetSelectionDialogComponent>,
    private _analysisLayoutService: AnalysisLayoutService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(
        (config) => {
          if (config) {
            const widgetReferences: {
              widget: WidgetLayoutConfiguration;
              name: string;
              type: string;
              pageIndex?: number;
              tabName?: string;
            }[] = [];
            config.layouts.forEach((layout, i) => {
              const widgetCounts: Record<string, number> = {};
              layout.widgets.forEach((widget) => {
                if (this.widgetTypes.length > 0 && !this.widgetTypes.includes(widget.type as WidgetType)) {
                  return;
                }

                if (widgetCounts[widget.type]) {
                  widgetCounts[widget.type]++;
                } else {
                  widgetCounts[widget.type] = 1;
                }

                const widgetTypeName =
                  WIDGETS[widget.type as keyof typeof WIDGETS].name;
                const widgetName = `${widgetTypeName} ${
                  widgetCounts[widget.type]
                }${i > 0 ? ` (page ${i + 1})` : ""}`;

                if (widget.id === this.widgetId) {
                  this.currentWidgetTabIndex = i;
                }

                widgetReferences.push({
                  widget,
                  name: widgetName,
                  type: widget.type,
                  pageIndex: i,
                  tabName: layout.tabName || undefined,
                });
              });
            });

            // Filter out widgets that don't store expressions and export preview widgets
            this.layoutWidgets = widgetReferences.filter((widget) => {
              let spec: WidgetConfiguration =
                WIDGETS?.[widget.type as WidgetType];
              const isExportPreview = widget.widget.id.startsWith(
                EXPORT_PREVIEW_ID_PREFIX
              );
              return (spec.hasExpressions || false) && !isExportPreview;
            });

            // If the current active widget ID is an export preview widget, reset it to the original widget
            if (
              this._activeWidgetIds.some((id) =>
                id.startsWith(EXPORT_PREVIEW_ID_PREFIX)
              )
            ) {
              const originalWidgetId =
                this._activeWidgetIds
                  .find((id) => id.startsWith(EXPORT_PREVIEW_ID_PREFIX))
                  ?.replace(EXPORT_PREVIEW_ID_PREFIX, "") || "";
              const validWidget = this.layoutWidgets.find(
                (widget) => widget.widget.id === originalWidgetId
              );
              if (validWidget) {
                this._activeWidgetIds = [originalWidgetId];
                // Also update the highlighted widget ID to match
                this._analysisLayoutService.highlightedWidgetIds$.next(
                  this._activeWidgetIds
                );
              }
            }
          }
        }
      )
    );
  }

  get widgetDialogPageCount(): number {
    return (
      this._analysisLayoutService.activeScreenConfiguration$.value?.layouts
        .length || 0
    );
  }

  get activeWidgetNamesTooltip(): string {
    return this.layoutWidgets
      .filter((widget) => this._activeWidgetIds.includes(widget.widget.id))
      .map((widget) => widget.name)
      .join(", ");
  }

  get activeWidgetIds(): string[] {
    return this._activeWidgetIds;
  }

  @Input() set activeWidgetIds(ids: string[]) {
    this._activeWidgetIds = ids;
    this._analysisLayoutService.highlightedWidgetIds$.next(this._activeWidgetIds);
    this.onActiveWidgetIdsChanged.emit(this._activeWidgetIds);
  }

  get currentPageWidgets(): {
    widget: WidgetLayoutConfiguration;
    name: string;
    type: string;
    pageIndex?: number;
    tabName?: string;
  }[] {
    return this.layoutWidgets.filter(
      (widget) => widget.pageIndex === this.currentWidgetTabIndex
    );
  }

  get currentPageLabel(): string {
    const widget = this.currentPageWidgets[0];
    return widget.tabName || `Tab ${(widget.pageIndex || 0) + 1}`;
  }

  canGoToPreviousWidgetPage(): boolean {
    return this.currentWidgetTabIndex > 0;
  }

  canGoToNextWidgetPage(): boolean {
    return this.currentWidgetTabIndex < this.widgetDialogPageCount - 1;
  }

  onPreviousWidgetPage(): void {
    if (this.canGoToPreviousWidgetPage()) {
      this.currentWidgetTabIndex--;
    }
  }

  onNextWidgetPage(): void {
    if (this.canGoToNextWidgetPage()) {
      this.currentWidgetTabIndex++;
    }
  }

  isWidgetSelected(widgetId: string): boolean {
    return this._activeWidgetIds.includes(widgetId);
  }

  onToggleWidget(widgetId: string): void {
    if (this.isWidgetSelected(widgetId)) {
      this._activeWidgetIds = this._activeWidgetIds.filter(
        (id) => id !== widgetId
      );
    } else {
      this._activeWidgetIds.push(widgetId);
    }
    this.activeWidgetIds = this._activeWidgetIds;
  }

  get areAllCurrentPageWidgetsSelected(): boolean {
    const currentPageWidgets = this.currentPageWidgets;
    if (currentPageWidgets.length === 0) {
      return false;
    }
    return currentPageWidgets.every((w) => this.isWidgetSelected(w.widget.id));
  }

  onSelectAllCurrentPageWidgets(): void {
    const currentPageWidgets = this.currentPageWidgets;
    currentPageWidgets.forEach((w) => {
      if (!this.isWidgetSelected(w.widget.id)) {
        this._activeWidgetIds.push(w.widget.id);
      }
    });
    this.activeWidgetIds = this._activeWidgetIds;
  }

  onDeselectAllCurrentPageWidgets(): void {
    const currentPageWidgets = this.currentPageWidgets;
    const currentPageWidgetIds = currentPageWidgets.map((w) => w.widget.id);
    this._activeWidgetIds = this._activeWidgetIds.filter(
      (id) => !currentPageWidgetIds.includes(id)
    );
    this.activeWidgetIds = this._activeWidgetIds;
  }

  onToggleAllCurrentPageWidgets(): void {
    if (this.areAllCurrentPageWidgetsSelected) {
      this.onDeselectAllCurrentPageWidgets();
    } else {
      this.onSelectAllCurrentPageWidgets();
    }
  }
}
