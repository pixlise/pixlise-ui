import { Component, Input } from '@angular/core';
import { WidgetToolbarButtonConfiguration } from '../models/widgets.model';

@Component({
  selector: 'widget-configuration-button',
  templateUrl: './widget-configuration-button.component.html',
  styleUrls: ['./widget-configuration-button.component.scss']
})
export class WidgetConfigurationButtonComponent {
  @Input() buttonConfiguration?: WidgetToolbarButtonConfiguration;

  constructor() {
    console.log("WidgetConfigurationButtonComponent constructor", this.buttonConfiguration);
  }
}
