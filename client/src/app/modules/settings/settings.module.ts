import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';



const APP_ROUTES: Routes = [
  {
    path: "",
    component: SettingsPageComponent
  },
];

@NgModule({
  declarations: [
    SettingsPageComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    SettingsPageComponent,
  ]
})
export class SettingsModule { }
