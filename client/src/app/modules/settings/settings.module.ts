import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { DataCollectionDialogComponent } from "./components/data-collection-dialog/data-collection-dialog.component";
import { GroupsPageComponent } from "./pages/groups-page/groups-page.component";
import { AddUserDialogComponent } from "./components/add-user-dialog/add-user-dialog.component";

import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ReactiveFormsModule } from "@angular/forms";
import { ImageUploaderDialogComponent } from "./components/image-uploader-dialog/image-uploader-dialog.component";
import { NgxDropzoneModule } from "ngx-dropzone";
import { UserIconComponent } from "./components/user-icon/user-icon.component";
import { NewGroupDialogComponent } from "./components/new-group-dialog/new-group-dialog.component";
import { RequestGroupDialogComponent } from "./components/request-group-dialog/request-group-dialog.component";
import { MatTableModule } from "@angular/material/table";
import { MatSortModule } from "@angular/material/sort";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { UserGroupMembershipDialogComponent } from "./components/user-group-membership-dialog/user-group-membership-dialog.component";
import { AddSubGroupDialogComponent } from "./components/add-subgroup-dialog/add-subgroup-dialog.component";

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
    AddSubGroupDialogComponent,
    NewGroupDialogComponent,
    RequestGroupDialogComponent,
    UserGroupMembershipDialogComponent,
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
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [GroupsPageComponent, UserIconComponent],
})
export class SettingsModule {}
