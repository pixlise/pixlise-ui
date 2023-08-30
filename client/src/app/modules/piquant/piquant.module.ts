import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { PiquantConfigComponent } from "./pages/piquant-config/piquant-config.component";
import { PiquantVersionComponent } from "./pages/piquant-version/piquant-version.component";
import { PiquantDownloadsComponent } from "./pages/piquant-downloads/piquant-downloads.component";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: PiquantConfigComponent,
    children: [
      { path: "", redirectTo: "config", pathMatch: "full" },
      { path: "config", component: PiquantConfigComponent },
      { path: "version", component: PiquantVersionComponent },
      { path: "downloads", component: PiquantDownloadsComponent },
    ],
  },
];

@NgModule({
  declarations: [PiquantConfigComponent],
  imports: [CommonModule, PIXLISECoreModule, RouterModule.forChild(APP_ROUTES)],
  exports: [PiquantConfigComponent],
})
export class PiquantModule {}
