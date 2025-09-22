import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from "@angular/core";
import { WidgetConfiguration, WidgetType } from "../../../models/widgets.model";
import { getWidgetIconUrl } from "../../../../pixlisecore/components/atoms/layout-preview-box/layout-preview-box.component";
import { AnalysisLayoutService } from "../../../../pixlisecore/pixlisecore.module";
import { WidgetData } from "../../../../../generated-protos/widget-data";
import { Subscription } from "rxjs";
import { SnackbarService } from "../../../../pixlisecore/services/snackbar.service";

@Component({
  standalone: false,
  selector: "widget-switcher-overlay",
  templateUrl: "./widget-switcher-overlay.component.html",
  styleUrls: ["./widget-switcher-overlay.component.scss"],
})
export class WidgetSwitcherOverlayComponent implements OnInit, OnDestroy {
  @Input() widgetId: string = "";
  @Input() widgetOptions: WidgetConfiguration[] = [];
  @Input() activeWidgetType: WidgetType = "ternary-plot";
  @Input() activeWidget: WidgetConfiguration | null = null;
  @Output() widgetSelected = new EventEmitter<WidgetType>();

  private _subs = new Subscription();

  mode: "edit" | "view" | "new" = "new";

  chartTitle = "";
  chartDescription = "";
  selectedWidgetType: WidgetType = "ternary-plot";

  private _activeWidgetData: WidgetData | undefined = undefined;

  sections: { title: string; widgets: WidgetConfiguration[] }[] = [];

  constructor(
    private analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService
  ) {}

  ngOnInit(): void {
    if (this.activeWidget) {
      this.selectedWidgetType = this.activeWidgetType;
    }

    // Get the full widget data
    this._subs.add(
      this.analysisLayoutService.fetchWidgetDataAsync(this.widgetId).subscribe((widgetData: WidgetData | undefined) => {
        if (widgetData) {
          this.chartTitle = widgetData.widgetName || "";
          this.chartDescription = widgetData.widgetDescription || "";
          this._activeWidgetData = widgetData;
        }

        this.mode = this.getDefaultMode();
      })
    );

    // If something else updates the widget data, update the widget name and description
    this._subs.add(
      this.analysisLayoutService.widgetData$.subscribe((widgetData: Map<string, WidgetData>) => {
        if (widgetData) {
          this._activeWidgetData = widgetData.get(this.widgetId);
          this.chartTitle = this._activeWidgetData?.widgetName || "";
          this.chartDescription = this._activeWidgetData?.widgetDescription || "";
        }

        this.mode = this.getDefaultMode();
      })
    );

    const XRF_WIDGET_IDS: WidgetType[] = [
      "spectrum-chart",
      "binary-plot",
      "ternary-plot",
      "histogram",
      "chord-diagram",
      "context-image",
      "parallel-coordinates-plot",
      "variogram",
    ];
    const RGBU_WIDGET_IDS: WidgetType[] = ["rgbu-plot", "multi-channel-image", "single-axis-rgbu-plot"];

    this.sections = [
      {
        title: "XRF",
        widgets: this.widgetOptions.filter(widget => XRF_WIDGET_IDS.includes(widget.id as WidgetType)),
      },
      {
        title: "RGBU",
        widgets: this.widgetOptions.filter(widget => RGBU_WIDGET_IDS.includes(widget.id as WidgetType)),
      },
      {
        title: "Extras",
        widgets: this.widgetOptions.filter(widget => !XRF_WIDGET_IDS.includes(widget.id as WidgetType) && !RGBU_WIDGET_IDS.includes(widget.id as WidgetType)),
      },
    ];

    // Remove empty sections
    this.sections = this.sections.filter(section => section.widgets.length > 0);
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get activeWidgetData(): WidgetData | undefined {
    return this._activeWidgetData;
  }

  getWidgetIconUrl(widgetType: string): string {
    return getWidgetIconUrl(widgetType);
  }

  selectWidget(widget: WidgetType | undefined) {
    if (widget) {
      this.widgetSelected.emit(widget);
    }
  }

  onOpenEditMode() {
    this.mode = "edit";
  }

  getDefaultMode(): "edit" | "view" | "new" {
    if (this.activeWidget && (this.activeWidgetData?.widgetName || this.activeWidgetData?.widgetDescription)) {
      return "view";
    }

    return "new";
  }

  onCancelEdit() {
    this.mode = this.getDefaultMode();
    this.chartTitle = this.activeWidget?.name || "";
    this.chartDescription = this.activeWidget?.description || "";
    this.selectedWidgetType = this.activeWidgetType;
  }

  onSaveEdit() {
    this.mode = this.getDefaultMode();
    if (this._activeWidgetData) {
      this.analysisLayoutService.writeWidgetMetadata(this.widgetId, this.chartTitle, this.chartDescription);
      this._snackService.openSuccess("Widget details updated");
    } else {
      this._snackService.openError("Failed to update widget details; no active widget found. Please refresh the page.");
    }
  }
}
