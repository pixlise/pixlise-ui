import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { AnalysisModule } from "../analysis/analysis.module";
import { WidgetModule } from "../widget/widget.module";

import { QuantificationTableComponent } from "./widgets/quantification-table/quantification-table.component";

export { QuantificationTableComponent } from "./widgets/quantification-table/quantification-table.component";

@NgModule({
  declarations: [QuantificationTableComponent],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule, WidgetModule],
  exports: [QuantificationTableComponent],
})
export class TableViewsModule {}
