import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { SpectrumChartWidgetComponent } from "./widgets/spectrum-chart-widget/spectrum-chart-widget.component";

export { SpectrumChartWidgetComponent } from "./widgets/spectrum-chart-widget/spectrum-chart-widget.component";

@NgModule({
  declarations: [
    SpectrumChartWidgetComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule
  ],
  exports: [
    SpectrumChartWidgetComponent
  ]
})
export class SpectrumModule { }
