import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { BinaryChartWidgetComponent } from "./widgets/binary-chart-widget/binary-chart-widget.component";
import { AnalysisModule } from "../analysis/analysis.module";

export { BinaryChartWidgetComponent } from "./widgets/binary-chart-widget/binary-chart-widget.component";

@NgModule({
  declarations: [BinaryChartWidgetComponent],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule],
  exports: [BinaryChartWidgetComponent],
  providers: [],
})
export class ScatterPlotsModule {}
