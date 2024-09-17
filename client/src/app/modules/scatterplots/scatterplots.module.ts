import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";

import { AnalysisModule } from "../analysis/analysis.module";

import { BinaryChartWidgetComponent } from "./widgets/binary-chart-widget/binary-chart-widget.component";
import { TernaryChartWidgetComponent } from "./widgets/ternary-chart-widget/ternary-chart-widget.component";
import { ScatterPlotAxisSwitcherComponent } from "./components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { HistogramWidgetComponent } from "./widgets/histogram-widget/histogram-widget.component";
import { ChordDiagramWidgetComponent } from "./widgets/chord-diagram-widget/chord-diagram-widget.component";
import { RGBUAxisRatioPickerComponent } from "./widgets/rgbu-plot-widget/rgbuaxis-ratio-picker/rgbuaxis-ratio-picker.component";
import { RGBUPlotWidgetComponent } from "./widgets/rgbu-plot-widget/rgbu-plot-widget.component";
import { WidgetModule } from "../widget/widget.module";
import { SingleAxisRGBUComponent } from "src/app/modules/scatterplots/widgets/single-axis-rgbu/single-axis-rgbu.component";
import { ParallelCoordinatesPlotWidgetComponent } from "src/app/modules/scatterplots/widgets/parallel-coordinates-plot-widget/parallel-coordinates-plot-widget.component";
import { VariogramWidgetComponent } from "./widgets/variogram-widget/variogram-widget.component";

export { BinaryChartWidgetComponent } from "./widgets/binary-chart-widget/binary-chart-widget.component";
export { TernaryChartWidgetComponent } from "./widgets/ternary-chart-widget/ternary-chart-widget.component";
export { HistogramWidgetComponent } from "./widgets/histogram-widget/histogram-widget.component";
export { ChordDiagramWidgetComponent } from "./widgets/chord-diagram-widget/chord-diagram-widget.component";
export { RGBUPlotWidgetComponent } from "./widgets/rgbu-plot-widget/rgbu-plot-widget.component";
export { SingleAxisRGBUComponent } from "./widgets/single-axis-rgbu/single-axis-rgbu.component";
export { ParallelCoordinatesPlotWidgetComponent } from "./widgets/parallel-coordinates-plot-widget/parallel-coordinates-plot-widget.component";

@NgModule({
  declarations: [
    BinaryChartWidgetComponent,
    TernaryChartWidgetComponent,
    ScatterPlotAxisSwitcherComponent,
    HistogramWidgetComponent,
    ChordDiagramWidgetComponent,
    RGBUAxisRatioPickerComponent,
    RGBUPlotWidgetComponent,
    SingleAxisRGBUComponent,
    ParallelCoordinatesPlotWidgetComponent,
    VariogramWidgetComponent,
  ],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule, WidgetModule],
  exports: [
    BinaryChartWidgetComponent,
    TernaryChartWidgetComponent,
    HistogramWidgetComponent,
    ChordDiagramWidgetComponent,
    RGBUPlotWidgetComponent,
    SingleAxisRGBUComponent,
    ParallelCoordinatesPlotWidgetComponent,
    VariogramWidgetComponent,
  ],
  providers: [],
})
export class ScatterPlotsModule {}
