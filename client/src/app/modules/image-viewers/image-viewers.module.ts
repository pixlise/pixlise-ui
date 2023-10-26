import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { FormsModule } from "@angular/forms";
import { AnalysisModule } from "../analysis/analysis.module";
import { MaterialModule } from "../material.module";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";

import { ContextImageComponent } from "./widgets/context-image/context-image.component";
import { WidgetModule } from "../widget/widget.module";

export { ContextImageComponent } from "./widgets/context-image/context-image.component";

@NgModule({
  declarations: [ContextImageComponent],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule, FormsModule, DragDropModule, MaterialModule, WidgetModule],
  exports: [ContextImageComponent],
})
export class ImageViewersModule {}
