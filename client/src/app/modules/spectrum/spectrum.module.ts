import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";

import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { SpectrumChartWidgetComponent } from "./widgets/spectrum-chart-widget/spectrum-chart-widget.component";
import { DiffractionService } from "./services/diffraction.service";
import { SpectrumService } from "./services/spectrum.service";
import { AnalysisModule } from "../analysis/analysis.module";
import { FormsModule } from "@angular/forms";
import { MaterialModule } from "../material.module";
import { SpectrumEnergyCalibrationComponent } from "./widgets/spectrum-chart-widget/spectrum-energy-calibration/spectrum-energy-calibration.component";

export { SpectrumChartWidgetComponent } from "./widgets/spectrum-chart-widget/spectrum-chart-widget.component";

@NgModule({
  declarations: [SpectrumChartWidgetComponent, SpectrumEnergyCalibrationComponent],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule, FormsModule, DragDropModule, MaterialModule],
  exports: [SpectrumChartWidgetComponent, SpectrumEnergyCalibrationComponent],
  providers: [DiffractionService, SpectrumService],
})
export class SpectrumModule {}
