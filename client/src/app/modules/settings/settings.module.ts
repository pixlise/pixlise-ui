import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { UserOptionsService } from './services/user-options.service';
import { DataCollectionDialogComponent } from './components/data-collection-dialog/data-collection-dialog.component';
import { GroupsPageComponent } from './pages/groups-page/groups-page.component';




const APP_ROUTES: Routes = [
  {
    path: "",
    component: SettingsPageComponent,
  },
  {
    path: "groups",
    component: GroupsPageComponent
  }
];

@NgModule({
  declarations: [
    SettingsPageComponent,
    GroupsPageComponent,
    DataCollectionDialogComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    SettingsPageComponent,
    GroupsPageComponent,
  ],
  providers: [
    UserOptionsService
  ]
})
export class SettingsModule { }
