import { Component, EventEmitter, Inject, Output } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { MinMax } from "../../../../../models/BasicTypes";
import { AnalysisLayoutService } from "../../../../pixlisecore/pixlisecore.module";
import { WIDGETS, WidgetType } from "../../../../widget/models/widgets.model";

export type RangeSelectData = {
  bounds: MinMax;
  min: number;
  max: number;
};

@Component({
  standalone: false,
  selector: "range-select-dialog",
  templateUrl: "./range-select-dialog.component.html",
  styleUrls: ["./range-select-dialog.component.scss"],
})
export class RangeSelectDialogComponent {
  private _subs: Subscription = new Subscription();

  @Output() onRangeUpdate = new EventEmitter<MinMax>();
  @Output() onRangeCopy = new EventEmitter();
  @Output() onShowOnChart = new EventEmitter<string>();

  private _minRange: number = 0;
  private _maxRange: number = 0;

  public selectedWidgetId: string = "";
  public currentTabWidgets: { id: string; type: WidgetType; name: string }[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: RangeSelectData,
    public dialogRef: MatDialogRef<RangeSelectDialogComponent, void>,
    private _analysisLayoutService: AnalysisLayoutService
  ) {
    this.minRange = Math.round(data.min * 100) / 100;
    this.maxRange = Math.round(data.max * 100) / 100;
  }

  ngOnInit() {
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfig => {
        if (screenConfig) {
          let tabIndex = this._analysisLayoutService.getCurrentTabId();
          let layout = screenConfig.layouts[tabIndex];

          let widgetCounts: Partial<Record<WidgetType, number>> = {};

          let viewableWidgetTypes: Partial<WidgetType>[] = ["context-image", "binary-plot", "ternary-plot"];

          this.currentTabWidgets = layout.widgets
            .filter(widget => viewableWidgetTypes.includes(widget.type as WidgetType))
            .map(widget => {
              let widgetType = widget.type as WidgetType;
              widgetCounts[widgetType] = (widgetCounts[widgetType] ?? 0) + 1;
              return {
                id: widget.id,
                type: widgetType,
                name: WIDGETS[widgetType].name + (widgetCounts[widgetType] > 1 ? ` ${widgetCounts[widgetType]}` : ""),
              };
            });

          if (!this.selectedWidgetId && this.currentTabWidgets.length > 0) {
            // Select first context image, else first widget
            let contextImage = this.currentTabWidgets.find(widget => widget.type === "context-image");
            if (contextImage) {
              this.selectedWidgetId = contextImage.id;
            } else {
              this.selectedWidgetId = this.currentTabWidgets[0].id;
            }
          }
        }
      })
    );
  }

  get minRange() {
    return this._minRange;
  }

  set minRange(value: number) {
    this._minRange = value;
    if (value && this.maxRange) {
      let valueRange = new MinMax(this._minRange, this.maxRange);
      this.onRangeUpdate.emit(valueRange);
    }
  }

  set dragMinRange(value: number) {
    this._minRange = value;
  }

  get maxRange() {
    return this._maxRange;
  }

  set maxRange(value: number) {
    this._maxRange = value;

    if (value && this.minRange) {
      this.onRangeUpdate.emit(new MinMax(this._minRange, this._maxRange));
    }
  }

  set dragMaxRange(value: number) {
    this._maxRange = value;
  }

  get minBound() {
    return this.data.bounds?.min ?? 0;
  }

  get maxBound() {
    return this.data.bounds?.max ?? 0;
  }

  onClose() {
    this.dialogRef.close();
  }

  onCopy() {
    this.onRangeCopy.emit();
  }

  showOnChart() {
    this.onShowOnChart.emit(this.selectedWidgetId);
  }
}
