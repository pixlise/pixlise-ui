import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { CdkAccordionModule } from "@angular/cdk/accordion";
import { TagsModule } from "../tags/tags.module";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { ExpressionLayerComponent } from "./expression-layer/expression-layer.component";
import { ExpressionPickerComponent } from "./components/expression-picker/expression-picker.component";
import { ExpressionSearchControlsComponent } from "./components/expression-search-controls/expression-search-controls.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { ExpressionColorScalePickerComponent } from "src/app/modules/expressions/components/expression-color-scale-picker/expression-color-scale-picker.component";

@NgModule({
  declarations: [ExpressionLayerComponent, ExpressionPickerComponent, ExpressionSearchControlsComponent, ExpressionColorScalePickerComponent],
  imports: [CommonModule, PIXLISECoreModule, CdkAccordionModule, TagsModule, ScrollingModule, MatTooltipModule, DragDropModule],
  exports: [ExpressionLayerComponent, ExpressionPickerComponent, ExpressionSearchControlsComponent, ExpressionColorScalePickerComponent],
  providers: [],
})
export class ExpressionModule {}
