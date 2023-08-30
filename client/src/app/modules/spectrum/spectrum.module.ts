import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { SpectrumChartWidgetComponent } from "./widgets/spectrum-chart-widget/spectrum-chart-widget.component";
import { DiffractionService } from "./services/diffraction.service";
import { SpectrumService } from "./services/spectrum.service";
import { AnalysisModule } from "../analysis/analysis.module";

export { SpectrumChartWidgetComponent } from "./widgets/spectrum-chart-widget/spectrum-chart-widget.component";

@NgModule({
  declarations: [
    SpectrumChartWidgetComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    AnalysisModule
  ],
  exports: [
    SpectrumChartWidgetComponent
  ],
  providers: [
    DiffractionService,
    SpectrumService
  ]
})
export class SpectrumModule { }
