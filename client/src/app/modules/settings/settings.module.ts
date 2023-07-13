import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { UserOptionsService } from './services/user-options.service';
import { DataCollectionDialogComponent } from './components/data-collection-dialog/data-collection-dialog.component';




const APP_ROUTES: Routes = [
  {
    path: "",
    component: SettingsPageComponent
  },
];

@NgModule({
  declarations: [
    SettingsPageComponent,
    DataCollectionDialogComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    SettingsPageComponent,
  ],
  providers: [
    UserOptionsService
  ]
})
export class SettingsModule { }
