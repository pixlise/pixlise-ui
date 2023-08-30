import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { UserOptionsService } from "./services/user-options.service";
import { DataCollectionDialogComponent } from "./components/data-collection-dialog/data-collection-dialog.component";
import { GroupsPageComponent } from "./pages/groups-page/groups-page.component";
import { GroupsService } from "./services/groups.service";
import { UsersService } from "./services/users.service";
import { AddUserDialogComponent } from "./components/add-user-dialog/add-user-dialog.component";

import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ReactiveFormsModule } from "@angular/forms";
import { ImageUploaderDialogComponent } from "./components/image-uploader-dialog/image-uploader-dialog.component";
import { NgxDropzoneModule } from "ngx-dropzone";
import { UserIconComponent } from "./components/user-icon/user-icon.component";
import { NewGroupDialogComponent } from "./components/new-group-dialog/new-group-dialog.component";

const APP_ROUTES: Routes = [
  {
    path: "groups",
    component: GroupsPageComponent,
  },
];

@NgModule({
  declarations: [
    GroupsPageComponent,
    DataCollectionDialogComponent,
    AddUserDialogComponent,
    NewGroupDialogComponent,
    ImageUploaderDialogComponent,
    UserIconComponent,
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    MatAutocompleteModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    NgxDropzoneModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [GroupsPageComponent, UserIconComponent],
  providers: [UserOptionsService, GroupsService, UsersService],
})
export class SettingsModule {}
