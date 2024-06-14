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
import { SpectrumFitContainerComponent } from "./widgets/spectrum-chart-widget/spectrum-fit-container/spectrum-fit-container.component";
import { FitLineConfigComponent } from "./widgets/spectrum-chart-widget/spectrum-fit-container/fit-line-config/fit-line-config.component";
import { FitElementsComponent } from "./widgets/spectrum-chart-widget/spectrum-fit-container/fit-elements/fit-elements.component";
import { FitElementSelectionComponent } from "./widgets/spectrum-chart-widget/spectrum-fit-container/fit-element-selection/fit-element-selection.component";
import { QuantJobsComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/tabs/quant-jobs.component";
import { QuantJobItemComponent } from "./widgets/spectrum-chart-widget/spectrum-peak-identification/tabs/quant-job-item/quant-job-item.component";
import { ScrollingModule } from "@angular/cdk/scrolling";

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
    SpectrumFitContainerComponent,
    FitLineConfigComponent,
    FitElementsComponent,
    FitElementSelectionComponent,
    QuantJobsComponent,
    QuantJobItemComponent,
  ],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule, FormsModule, DragDropModule, MaterialModule, WidgetModule, ScrollingModule],
  exports: [SpectrumChartWidgetComponent, SpectrumEnergyCalibrationComponent],
  providers: [DiffractionService, SpectrumService],
})
export class SpectrumModule {}
