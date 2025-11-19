import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Subscription } from "rxjs";
import { AnalysisLayoutService } from "src/app/modules/pixlisecore/services/analysis-layout.service";
import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";

@Component({
  standalone: false,
  selector: "widget-selection-button",
  templateUrl: "./widget-selection-button.component.html",
  styleUrls: ["./widget-selection-button.component.scss"],
})
export class WidgetSelectionButtonComponent {
  private _subs: Subscription = new Subscription();

  private _activeWidgetIds: string[] = [];

  @Input() widgetId: string = "";
  @Output() onActiveWidgetIdsChanged: EventEmitter<string[]> = new EventEmitter<
    string[]
  >();

  layoutWidgets: {
    widget: WidgetLayoutConfiguration;
    name: string;
    type: string;
    pageIndex?: number;
    tabName?: string;
  }[] = [];

  constructor(private _analysisLayoutService: AnalysisLayoutService) {}

  @Input() set activeWidgetIds(ids: string[]) {
    this._activeWidgetIds = ids;
  }

  get activeWidgetIds(): string[] {
    return this._activeWidgetIds;
  }

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.activeScreenConfigWidgetReferences$.subscribe(
        (references) => {
          this.layoutWidgets = references;
        }
      )
    );
  }

  get activeWidgetNamesTooltip(): string {
    return this.layoutWidgets
      .filter((widget) => this._activeWidgetIds.includes(widget.widget.id))
      .map((widget) => widget.name)
      .join(", ");
  }

  onClose(): void {
    this.onActiveWidgetIdsChanged.emit(this._activeWidgetIds);
    this._analysisLayoutService.highlightedWidgetIds$.next([]);
  }
}
