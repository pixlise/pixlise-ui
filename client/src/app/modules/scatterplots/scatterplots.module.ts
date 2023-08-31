import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";

import { AnalysisModule } from "../analysis/analysis.module";

import { BinaryChartWidgetComponent } from "./widgets/binary-chart-widget/binary-chart-widget.component";
import { TernaryChartWidgetComponent } from "./widgets/ternary-chart-widget/ternary-chart-widget.component";

export { BinaryChartWidgetComponent } from "./widgets/binary-chart-widget/binary-chart-widget.component";
export { TernaryChartWidgetComponent } from "./widgets/ternary-chart-widget/ternary-chart-widget.component";

@NgModule({
  declarations: [BinaryChartWidgetComponent, TernaryChartWidgetComponent],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule],
  exports: [BinaryChartWidgetComponent, TernaryChartWidgetComponent],
  providers: [],
})
export class ScatterPlotsModule {}
