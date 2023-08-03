import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';
import { AnalysisPageComponent } from './pages/analysis-page/analysis-page.component';
import { RouterModule, Routes } from '@angular/router';
import { WidgetComponent } from './components/widget/widget.component';
import { AnalysisSidepanelComponent } from './components/analysis-sidepanel/analysis-sidepanel.component';
import { AnalysisLayoutService } from './services/analysis-layout.service';
import { ROITabComponent } from './components/analysis-sidepanel/tabs/roi-tab/roi-tab.component';
import { ROIModule } from '../roi/roi.module';

const APP_ROUTES: Routes = [
  {
    path: "",
    component: AnalysisPageComponent
  },
];

@NgModule({
  declarations: [
    AnalysisPageComponent,
    WidgetComponent,
    AnalysisSidepanelComponent,
    ROITabComponent,
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    ROIModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    AnalysisPageComponent,
  ],
  providers: [
    AnalysisLayoutService
  ]
})
export class AnalysisModule { }
