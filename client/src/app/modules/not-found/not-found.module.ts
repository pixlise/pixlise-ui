import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotFoundPageComponent } from './not-found-page/not-found-page.component';
import { RouterModule, Routes } from '@angular/router';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';

const APP_ROUTES: Routes = [
  {
    path: "",
    component: NotFoundPageComponent
  },
];


@NgModule({
  declarations: [NotFoundPageComponent],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    NotFoundPageComponent
  ]
})
export class NotFoundModule { }
