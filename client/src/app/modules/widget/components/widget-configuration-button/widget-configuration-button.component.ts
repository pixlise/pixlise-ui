import { Component, Input } from "@angular/core";
import { WidgetToolbarButtonConfiguration } from "../../models/widgets.model";

@Component({
  selector: "widget-configuration-button",
  templateUrl: "./widget-configuration-button.component.html",
  styleUrls: ["./widget-configuration-button.component.scss"],
})
export class WidgetConfigurationButtonComponent {
  @Input() buttonConfiguration?: WidgetToolbarButtonConfiguration;

  constructor() {}

  buttonClick(buttonTrigger: Element) {
    if (this.buttonConfiguration && this.buttonConfiguration.onClick && !this.buttonConfiguration.disabled) {
      this.buttonConfiguration.onClick(this.buttonConfiguration.value, buttonTrigger);
    }
  }
}
