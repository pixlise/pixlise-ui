import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { MVImportComponent } from "./components/pages/mvimport/mvimport.component";
import { MVImportStatusComponent } from "./components/components/mvimport-status/mvimport-status.component";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: MVImportComponent,
  },
];

@NgModule({
  declarations: [MVImportComponent, MVImportStatusComponent],
  imports: [CommonModule, PIXLISECoreModule, RouterModule.forChild(APP_ROUTES)],
})
export class ImportModule {}
