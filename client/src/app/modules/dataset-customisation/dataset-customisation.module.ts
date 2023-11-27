import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { DatasetCustomisationPageComponent } from "./pages/dataset-customisation-page/dataset-customisation-page.component";
import { WidgetModule } from "../widget/widget.module";
import { ImageViewersModule } from "../image-viewers/image-viewers.module";
import { AddCustomImageComponent } from "./components/add-custom-image/add-custom-image.component";
import { NgxDropzoneModule } from "ngx-dropzone";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: DatasetCustomisationPageComponent,
  },
];

@NgModule({
  declarations: [DatasetCustomisationPageComponent, AddCustomImageComponent],
  imports: [CommonModule, PIXLISECoreModule, WidgetModule, ImageViewersModule, NgxDropzoneModule, RouterModule.forChild(APP_ROUTES)],
  exports: [DatasetCustomisationPageComponent]
})
export class DatasetCustomisationModule {}
