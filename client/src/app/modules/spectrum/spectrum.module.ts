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
import { SingleScanEnergyCalibrationComponent } from "./widgets/spectrum-chart-widget/spectrum-energy-calibration/single-scan-energy-calibration/single-scan-energy-calibration.component";
import { SpectrumPeakIdentificationComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/spectrum-peak-identification.component";
import { PeriodicTableTabComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/tabs/periodic-table-tab.component";
import { ElementSetsComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/tabs/element-sets.component";
import { BrowseOnChartComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/tabs/browse-on-chart.component";
import { ElementSetRowComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/tabs/element-set-row/element-set-row.component";
import { BrowseOnChartTableComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/tabs/browse-on-chart-table/browse-on-chart-table.component";
import { PickedElementsComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/picked-elements/picked-elements.component";
import { ElementListItemComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/element-list-item/element-list-item.component";
import { QuantificationStartOptionsComponent } from "./widgets/spectrum-chart-widget/quantification-start-options/quantification-start-options.component";
import { WidgetModule } from "../widget/widget.module";

export { SpectrumChartWidgetComponent } from "./widgets/spectrum-chart-widget/spectrum-chart-widget.component";

@NgModule({
  declarations: [
    SpectrumChartWidgetComponent,
    SpectrumEnergyCalibrationComponent,
    SingleScanEnergyCalibrationComponent,
    SpectrumPeakIdentificationComponent,
    PeriodicTableTabComponent,
    ElementSetsComponent,
    BrowseOnChartComponent,
    ElementSetRowComponent,
    BrowseOnChartTableComponent,
    PickedElementsComponent,
    ElementListItemComponent,
    QuantificationStartOptionsComponent,
  ],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule, FormsModule, DragDropModule, MaterialModule, WidgetModule],
  exports: [SpectrumChartWidgetComponent, SpectrumEnergyCalibrationComponent],
  providers: [DiffractionService, SpectrumService],
})
export class SpectrumModule {}
