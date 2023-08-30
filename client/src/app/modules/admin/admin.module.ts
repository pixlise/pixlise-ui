import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { UsersComponent } from "./pages/users/users.component";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { RolesComponent } from "./pages/roles/roles.component";
import { TestUtilitiesComponent } from "./pages/test-utilities/test-utilities.component";
import { GlobalNotificationsComponent } from "./pages/global-notifications/global-notifications.component";
import { QuantLogViewComponent } from "./pages/quant-log-view/quant-log-view.component";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: UsersComponent,
    children: [
      { path: "", redirectTo: "users", pathMatch: "full" },
      { path: "users", component: UsersComponent },
      { path: "roles", component: RolesComponent },
      { path: "test-utils", component: TestUtilitiesComponent },
      { path: "global-notifications", component: GlobalNotificationsComponent },
      { path: "quant-jobs", component: QuantLogViewComponent },
    ],
  },
];

@NgModule({
  declarations: [UsersComponent],
  imports: [CommonModule, PIXLISECoreModule, RouterModule.forChild(APP_ROUTES)],
  exports: [UsersComponent],
})
export class AdminModule {}
