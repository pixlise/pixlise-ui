import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { DataCollectionDialogComponent } from "./components/data-collection-dialog/data-collection-dialog.component";
import { GroupsPageComponent } from "./pages/groups-page/groups-page.component";
import { AddUserDialogComponent } from "./components/add-user-dialog/add-user-dialog.component";
import { ScrollingModule } from "@angular/cdk/scrolling";

import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ReactiveFormsModule } from "@angular/forms";
import { ImageUploaderDialogComponent } from "./components/image-uploader-dialog/image-uploader-dialog.component";
import { NgxDropzoneModule } from "ngx-dropzone";
import { NewGroupDialogComponent } from "./components/new-group-dialog/new-group-dialog.component";
import { RequestGroupDialogComponent } from "./components/request-group-dialog/request-group-dialog.component";
import { MatTableModule } from "@angular/material/table";
import { MatSortModule } from "@angular/material/sort";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { UserGroupMembershipDialogComponent } from "./components/user-group-membership-dialog/user-group-membership-dialog.component";
import { AddSubGroupDialogComponent } from "./components/add-subgroup-dialog/add-subgroup-dialog.component";
import { JobsComponent } from "./pages/jobs/jobs.component";
import { JobItemComponent }from "./pages/jobs/job-item/job-item.component";
import { QuantJobComponent } from './pages/jobs/quant-job/quant-job.component';
import { ExpressionJobComponent } from './pages/jobs/expression-job/expression-job.component';
import { GeneralJobComponent } from './pages/jobs/general-job/general-job.component';
import { SetScheduledJobComponent } from './pages/jobs/set-scheduled-job/set-scheduled-job.component';
import { ScheduledJobViewComponent } from './pages/jobs/scheduled-job-view/scheduled-job-view.component';
import { ManageRepositoriesComponent } from './pages/jobs/manage-repositories/manage-repositories.component';
import { ScheduledJobListComponent } from './pages/jobs/scheduled-job-list/scheduled-job-list.component';
import { JobListComponent } from './pages/jobs/job-list/job-list.component';

export { UserOptionsService } from "./services/user-options.service";
export { GroupsService } from "./services/groups.service";

const APP_ROUTES: Routes = [
  {
    path: "groups",
    component: GroupsPageComponent,
  },
  {
    path: "jobs",
    component: JobsComponent,
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
    JobsComponent,
    JobItemComponent,
    QuantJobComponent,
    ExpressionJobComponent,
    GeneralJobComponent,
    SetScheduledJobComponent,
    ScheduledJobViewComponent,
    ManageRepositoriesComponent,
    ScheduledJobListComponent,
    JobListComponent,
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
    ScrollingModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [GroupsPageComponent],
})
export class SettingsModule {}
