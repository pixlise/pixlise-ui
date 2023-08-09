import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BaseWidgetModel } from 'src/app/modules/analysis/components/widget/models/base-widget.model';
import { PIXLISECoreModule } from 'src/app/modules/pixlisecore/pixlisecore.module';

@Component({
  selector: 'app-spectrum-chart-widget',
  templateUrl: './spectrum-chart-widget.component.html',
  styleUrls: ['./spectrum-chart-widget.component.scss'],
  // standalone: true,
  // imports: [CommonModule, PIXLISECoreModule],
})
export class SpectrumChartWidgetComponent extends BaseWidgetModel {
  activeTool: string = "pan";

  resizeSpectraY = false;
  yAxislogScale = false;
  countsPerMin = false;
  countsPerPMC = true;

  constructor() {
    super();

    this._widgetControlConfiguration = {
      "topToolbar": [
        {
          "id": "pan",
          "type": "selectable-button",
          "icon": "assets/button-icons/tool-pan.svg",
          "tooltip": "Pan Tool (Shift)\nClick and drag to move the context image in the viewport",
          "value": false,
          "onClick": () => this.onToolSelected("pan")
        },
        {
          "id": "zoom",
          "type": "selectable-button",
          "icon": "assets/button-icons/tool-zoom.svg",
          "tooltip": "Zoom Tool (Shift)\nClick and drag to move the context image in the viewport",
          "value": false,
          "onClick": () => this.onToolSelected("zoom")
        },
        {
          "id": "spectrum-range",
          "type": "selectable-button",
          "icon": "assets/button-icons/tool-spectrum-range.svg",
          "tooltip": "Zoom Tool (Shift)\nClick and drag to move the context image in the viewport",
          "value": false,
          "onClick": () => this.onToolSelected("spectrum-range")
        },
        {
          "id": "zoom-in",
          "type": "button",
          "icon": "assets/button-icons/zoom-in.svg",
          "tooltip": "Zoom Tool (Shift)\nClick and drag to move the context image in the viewport",
          "onClick": () => this.onZoomIn()
        },
        {
          "id": "zoom-out",
          "type": "button",
          "icon": "assets/button-icons/zoom-out.svg",
          "tooltip": "Zoom Tool (Shift)\nClick and drag to move the context image in the viewport",
          "onClick": () => this.onZoomOut()
        },
        {
          "id": "zoom-all",
          "type": "button",
          "icon": "assets/button-icons/zoom-all-arrows.svg",
          "tooltip": "Zoom Tool (Shift)\nClick and drag to move the context image in the viewport",
          "onClick": () => this.onResetZoom()
        },
        {
          "id": "xray-tube-element",
          "type": "button",
          "icon": "assets/button-icons/xray-tube-element.svg",
          "tooltip": "Zoom Tool (Shift)\nClick and drag to move the context image in the viewport",
          "onClick": () => this.onShowXRayTubeLines()
        }
      ]
    }
  }

  onToggleResizeSpectraY() {

  }

  onToggleYAxislogScale() {

  }

  onToggleCountsPerMin() {

  }

  onToggleCountsPerPMC() {

  }

  onShowXRayTubeLines() {

  }

  onResetZoom() {

  }

  onZoomIn() {
  }

  onZoomOut() {
  }

  onToolSelected(tool: string) {
    this.activeTool = tool;
    this._widgetControlConfiguration["topToolbar"]!.forEach((button: any) => {
      button.value = button.id === tool;
    });
    console.log("Tool selected: ", this.activeTool)
  }

  // ngOnInit(): void {

  // }
}
