import { Component, Input } from "@angular/core";
import { WidgetToolbarButtonConfiguration } from "../../models/widgets.model";
import { WidgetKeyItem } from "../../../pixlisecore/pixlisecore.module";

@Component({
  selector: "widget-configuration-button",
  templateUrl: "./widget-configuration-button.component.html",
  styleUrls: ["./widget-configuration-button.component.scss"],
})
export class WidgetConfigurationButtonComponent {
  @Input() buttonConfiguration?: WidgetToolbarButtonConfiguration;

  constructor() {}

  onMultiSwitchChange(value: string) {
    if (!this.buttonConfiguration) {
      return;
    }

    this.buttonConfiguration.value = value;
  }

  buttonClick(buttonTrigger: Element) {
    if (this.buttonConfiguration && this.buttonConfiguration.onClick && !this.buttonConfiguration.disabled) {
      this.buttonConfiguration.onClick(this.buttonConfiguration.value, buttonTrigger);
    }
  }

  onUpdateKeyItems(keyItems: WidgetKeyItem[]) {
    if (this.buttonConfiguration?.type !== "widget-key") {
      return;
    }

    if (this.buttonConfiguration && this.buttonConfiguration.onUpdateKeyItems) {
      this.buttonConfiguration.onUpdateKeyItems(keyItems);
    }
  }
}
