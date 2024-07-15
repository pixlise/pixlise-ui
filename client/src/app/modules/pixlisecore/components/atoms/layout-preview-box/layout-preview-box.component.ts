import { Component, Input } from "@angular/core";
import { ScreenTemplate } from "../../../../analysis/models/screen-configuration.model";

@Component({
  selector: "layout-preview-box",
  templateUrl: "./layout-preview-box.component.html",
  styleUrls: ["./layout-preview-box.component.scss"],
})
export class LayoutPreviewBox {
  @Input() template: ScreenTemplate | null = null;

  constructor() {}

  getWidgetIconUrl(widgetType: string): string {
    return `assets/chart-placeholders/${widgetType}.svg` || "";
  }
}
