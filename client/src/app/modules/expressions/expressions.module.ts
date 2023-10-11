import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { CdkAccordionModule } from "@angular/cdk/accordion";
import { TagsModule } from "../tags/tags.module";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { ExpressionLayerComponent } from "./expression-layer/expression-layer.component";
import { ExpressionPickerComponent } from "./components/expression-picker/expression-picker.component";
import { ExpressionSearchControlsComponent } from "./components/expression-search-controls/expression-search-controls.component";

@NgModule({
  declarations: [ExpressionLayerComponent, ExpressionPickerComponent, ExpressionSearchControlsComponent],
  imports: [CommonModule, PIXLISECoreModule, CdkAccordionModule, TagsModule, ScrollingModule],
  exports: [ExpressionLayerComponent, ExpressionPickerComponent, ExpressionSearchControlsComponent],
  providers: [],
})
export class ExpressionModule {}
