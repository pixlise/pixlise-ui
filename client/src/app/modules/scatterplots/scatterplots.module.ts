import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";

import { AnalysisModule } from "../analysis/analysis.module";

import { BinaryChartWidgetComponent } from "./widgets/binary-chart-widget/binary-chart-widget.component";
import { TernaryChartWidgetComponent } from "./widgets/ternary-chart-widget/ternary-chart-widget.component";
import { ScatterPlotAxisSwitcherComponent } from "./components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { HistogramWidgetComponent } from "./widgets/histogram-widget/histogram-widget.component";
import { ChordDiagramWidgetComponent } from "./widgets/chord-diagram-widget/chord-diagram-widget.component";
import { WidgetModule } from "../widget/widget.module";

export { BinaryChartWidgetComponent } from "./widgets/binary-chart-widget/binary-chart-widget.component";
export { TernaryChartWidgetComponent } from "./widgets/ternary-chart-widget/ternary-chart-widget.component";
export { HistogramWidgetComponent } from "./widgets/histogram-widget/histogram-widget.component";
export { ChordDiagramWidgetComponent } from "./widgets/chord-diagram-widget/chord-diagram-widget.component";

@NgModule({
  declarations: [BinaryChartWidgetComponent, TernaryChartWidgetComponent, ScatterPlotAxisSwitcherComponent, HistogramWidgetComponent, ChordDiagramWidgetComponent],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule, WidgetModule],
  exports: [BinaryChartWidgetComponent, TernaryChartWidgetComponent, HistogramWidgetComponent],
  providers: [],
})
export class ScatterPlotsModule {}
