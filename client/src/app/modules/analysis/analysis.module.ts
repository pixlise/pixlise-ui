import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';
import { AnalysisPageComponent } from './pages/analysis-page/analysis-page.component';
import { RouterModule, Routes } from '@angular/router';

const APP_ROUTES: Routes = [
  {
    path: "",
    component: AnalysisPageComponent
  },
];

@NgModule({
  declarations: [
    AnalysisPageComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    AnalysisPageComponent,
  ]
})
export class AnalysisModule { }
