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
import { ScanConfigurationDialog } from "./components/scan-configuration-dialog/scan-configuration-dialog.component";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ReactiveFormsModule } from "@angular/forms";
import { MatTableModule } from "@angular/material/table";
import { MatSortModule } from "@angular/material/sort";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatButtonModule } from "@angular/material/button";
import { MatMenuModule } from "@angular/material/menu";
import { ScanConfigurationTabComponent } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/scan-configuration/scan-configuration.component";
import { ScanConfigurationItemComponent } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/scan-configuration/scan-configuration-item/scan-configuration-item.component";
import { DiffractionTabComponent } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/diffraction.component";
import { MultiQuantComponent } from "./components/analysis-sidepanel/tabs/multi-quant/multi-quant.component";
import { SelectionComponent } from "./components/analysis-sidepanel/tabs/selection/selection.component";
import { RoughnessComponent } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/roughness/roughness.component";
import { ExportTabComponent } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/export/export.component";

// export { ContextImageDataService } from "./services/context-image-data.service";
export { DataExporterService } from "./services/exporter.service";
export { AnalysisLayoutService } from "./services/analysis-layout.service";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: AnalysisPageComponent,
  },
];

@NgModule({
  declarations: [
    AnalysisPageComponent,
    AnalysisSidepanelComponent,
    ROITabComponent,
    MistROIComponent,
    MistRoiConvertComponent,
    MistRoiUploadComponent,
    ScanConfigurationDialog,
    ScanConfigurationTabComponent,
    ScanConfigurationItemComponent,
    DiffractionTabComponent,
    RoughnessComponent,
    MultiQuantComponent,
    SelectionComponent,
    ExportTabComponent,
  ],
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
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatButtonModule,
    MatMenuModule,
  ],
  exports: [AnalysisPageComponent, ScanConfigurationDialog, AnalysisSidepanelComponent],
  //providers: [AnalysisLayoutService], <-- If registered here, we get duplicate copies of the service!
})
export class AnalysisModule {}
