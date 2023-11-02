import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { AnalysisPageComponent } from "./pages/analysis-page/analysis-page.component";
import { RouterModule, Routes } from "@angular/router";
import { AnalysisSidepanelComponent } from "./components/analysis-sidepanel/analysis-sidepanel.component";
import { AnalysisLayoutService } from "./services/analysis-layout.service";
import { ROITabComponent } from "./components/analysis-sidepanel/tabs/roi-tab/roi-tab.component";
import { ROIModule } from "../roi/roi.module";
import { MistROIComponent } from "./components/analysis-sidepanel/tabs/mist-roi/mist-roi.component";
import { CdkAccordionModule } from "@angular/cdk/accordion";
import { MistRoiConvertComponent } from "./components/analysis-sidepanel/tabs/mist-roi/mist-roi-convert/mist-roi-convert.component";
import { MistRoiUploadComponent } from "./components/analysis-sidepanel/tabs/mist-roi/mist-roi-upload/mist-roi-upload.component";
import { TagsModule } from "../tags/tags.module";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { ExpressionModule } from "../expressions/expressions.module";
import { WidgetModule } from "../widget/widget.module";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: AnalysisPageComponent,
  },
];

@NgModule({
  declarations: [AnalysisPageComponent, AnalysisSidepanelComponent, ROITabComponent, MistROIComponent, MistRoiConvertComponent, MistRoiUploadComponent],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    ROIModule,
    ExpressionModule,
    RouterModule.forChild(APP_ROUTES),
    CdkAccordionModule,
    TagsModule,
    ScrollingModule,
    WidgetModule,
  ],
  exports: [AnalysisPageComponent],
  //providers: [AnalysisLayoutService], <-- If registered here, we get duplicate copies of the service!
})
export class AnalysisModule {}
