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
  "rgbu-viewer": "assets/chart-placeholders/rgbu-viewer.svg",
  "rgbu-plot": "assets/chart-placeholders/rgbu-plot.svg",
  "single-axis-rgbu": "assets/chart-placeholders/single-axis-rgbu.svg",
  "parallel-coordinates-plot": "assets/chart-placeholders/parallel-coordinates-plot.svg",
  "quant-table": "assets/chart-placeholders/quant-table.svg",
  "text-view": "assets/chart-placeholders/text-view.svg",
  variogram: "assets/chart-placeholders/variogram.svg",
};

const _baseIconUrl = "assets/chart-placeholders/";
export const getWidgetIconUrl = (widgetType: string): string => {
  return WIDGET_ICONS[widgetType] || `${_baseIconUrl}${widgetType}.svg`;
};

@Component({
  standalone: false,
  selector: "layout-preview-box",
  templateUrl: "./layout-preview-box.component.html",
  styleUrls: ["./layout-preview-box.component.scss"],
})
export class LayoutPreviewBoxComponent {
  @Input() template: ScreenTemplate | null = null;

  getWidgetIconUrl(widgetType: string): string {
    return getWidgetIconUrl(widgetType);
  }

  getWidgetNamePlaceholder(widgetType: string): string {
    return this.getWidgetName(widgetType).charAt(0).toUpperCase();
  }

  getWidgetName(widgetType: string): string {
    return WIDGETS[widgetType as WidgetType]?.name || widgetType;
  }
}
