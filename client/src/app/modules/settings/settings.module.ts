import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { UserOptionsService } from './services/user-options.service';
import { DataCollectionDialogComponent } from './components/data-collection-dialog/data-collection-dialog.component';
import { GroupsPageComponent } from './pages/groups-page/groups-page.component';
import { GroupsService } from './services/groups.service';
import { UsersService } from './services/users.service';
import { AddUserDialogComponent } from './components/add-user-dialog/add-user-dialog.component';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldControl, MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule } from '@angular/forms';

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
    DataCollectionDialogComponent,
    AddUserDialogComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    SettingsPageComponent,
    GroupsPageComponent,
  ],
  providers: [
    UserOptionsService,
    GroupsService,
    UsersService
  ]
})
export class SettingsModule { }
