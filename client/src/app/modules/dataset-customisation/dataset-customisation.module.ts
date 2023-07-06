import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';
import { DatasetCustomisationPageComponent } from './pages/dataset-customisation-page/dataset-customisation-page.component';



const APP_ROUTES: Routes = [
  {
    path: "",
    component: DatasetCustomisationPageComponent
  },
];

@NgModule({
  declarations: [
    DatasetCustomisationPageComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    DatasetCustomisationPageComponent,
  ]
})
export class DatasetCustomisationModule { }
