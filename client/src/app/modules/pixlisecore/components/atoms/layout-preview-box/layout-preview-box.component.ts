import { Component, Input } from "@angular/core";
import { ScreenTemplate } from "../../../../analysis/models/screen-configuration.model";
import { WIDGETS, WidgetType } from "../../../../widget/models/widgets.model";

export const WIDGET_ICONS: Record<string, string> = {
  "binary-plot": "assets/chart-placeholders/binary-plot.svg",
  "ternary-plot": "assets/chart-placeholders/ternary-plot.svg",
  "chord-diagram": "assets/chart-placeholders/chord-diagram.svg",
  "context-image": "assets/chart-placeholders/context-image.svg",
  histogram: "assets/chart-placeholders/histogram.svg",
  "spectrum-chart": "assets/chart-placeholders/spectrum-chart.svg",
};

export const WIDGET_NAME_PLACEHOLDERS: Record<string, string> = {};

@Component({
  selector: "layout-preview-box",
  templateUrl: "./layout-preview-box.component.html",
  styleUrls: ["./layout-preview-box.component.scss"],
})
export class LayoutPreviewBox {
  @Input() template: ScreenTemplate | null = null;

  constructor() {}

  ngOnInit(): void {}

  getWidgetIconUrl(widgetType: string): string {
    return WIDGET_ICONS[widgetType] || "";
  }

  getWidgetNamePlaceholder(widgetType: string): string {
    return this.getWidgetName(widgetType).charAt(0).toUpperCase();
  }

  getWidgetName(widgetType: string): string {
    return WIDGETS[widgetType as WidgetType]?.name || widgetType;
  }
}
