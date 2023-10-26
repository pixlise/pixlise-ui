import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { WidgetComponent } from "../widget/components/widget/widget.component";
import { BaseWidgetModel } from "../widget/models/base-widget.model";
import { InteractiveCanvasComponent } from "../widget/components/interactive-canvas/interactive-canvas.component";
import { WidgetKeyDisplayComponent } from "../widget/components/widget-key-display/widget-key-display.component";
import { WidgetConfigurationButtonComponent } from "../widget/components/widget-configuration-button/widget-configuration-button.component";
import { CdkAccordionModule } from "@angular/cdk/accordion";
import { ScrollingModule } from "@angular/cdk/scrolling";

@NgModule({
  declarations: [WidgetComponent, BaseWidgetModel, WidgetKeyDisplayComponent, WidgetConfigurationButtonComponent, InteractiveCanvasComponent],
  imports: [CommonModule, PIXLISECoreModule, CdkAccordionModule, ScrollingModule],
  exports: [WidgetComponent, BaseWidgetModel, WidgetConfigurationButtonComponent, InteractiveCanvasComponent],
  providers: [],
})
export class WidgetModule {}
