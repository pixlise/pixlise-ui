import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { AnalysisPageComponent } from "./pages/analysis-page/analysis-page.component";
import { RouterModule, Routes } from "@angular/router";
import { WidgetComponent } from "./components/widget/widget.component";
import { AnalysisSidepanelComponent } from "./components/analysis-sidepanel/analysis-sidepanel.component";
import { AnalysisLayoutService } from "./services/analysis-layout.service";
import { ROITabComponent } from "./components/analysis-sidepanel/tabs/roi-tab/roi-tab.component";
import { ROIModule } from "../roi/roi.module";
import { BaseWidgetModel } from "./components/widget/models/base-widget.model";
import { InteractiveCanvasComponent } from "./components/widget/interactive-canvas/interactive-canvas.component";
import { WidgetKeyDisplayComponent } from "./components/widget/widget-key-display/widget-key-display.component";
import { WidgetConfigurationButtonComponent } from "./components/widget/widget-configuration-button/widget-configuration-button.component";
import { MistROIComponent } from "./components/analysis-sidepanel/tabs/mist-roi/mist-roi.component";
import { CdkAccordionModule } from "@angular/cdk/accordion";
import { MistRoiConvertComponent } from "./components/analysis-sidepanel/tabs/mist-roi/mist-roi-convert/mist-roi-convert.component";
import { MistRoiUploadComponent } from "./components/analysis-sidepanel/tabs/mist-roi/mist-roi-upload/mist-roi-upload.component";
import { TagsModule } from "../tags/tags.module";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: AnalysisPageComponent,
  },
];

@NgModule({
  declarations: [
    AnalysisPageComponent,
    WidgetComponent,
    InteractiveCanvasComponent,
    AnalysisSidepanelComponent,
    ROITabComponent,
    MistROIComponent,
    MistRoiConvertComponent,
    MistRoiUploadComponent,
    BaseWidgetModel,
    WidgetKeyDisplayComponent,
    WidgetConfigurationButtonComponent,
  ],
  imports: [CommonModule, PIXLISECoreModule, ROIModule, RouterModule.forChild(APP_ROUTES), CdkAccordionModule, TagsModule],
  exports: [AnalysisPageComponent, WidgetComponent, BaseWidgetModel, InteractiveCanvasComponent],
  providers: [AnalysisLayoutService],
})
export class AnalysisModule {}
