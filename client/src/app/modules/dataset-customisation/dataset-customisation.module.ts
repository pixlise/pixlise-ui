import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";

import { PIXLISECoreModule } from "src/app/modules/pixlisecore/pixlisecore.module";
import { WidgetModule } from "src/app/modules/widget/widget.module";
import { ImageViewersModule } from "src/app/modules/image-viewers/image-viewers.module";
import { TagsModule } from "src/app/modules/tags/tags.module";

import { DatasetCustomisationPageComponent } from "./pages/dataset-customisation-page/dataset-customisation-page.component";


const APP_ROUTES: Routes = [
  {
    path: "",
    component: DatasetCustomisationPageComponent,
  },
];

@NgModule({
  declarations: [DatasetCustomisationPageComponent],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    TagsModule,
    WidgetModule,
    ImageViewersModule,
    RouterModule.forChild(APP_ROUTES)
  ],
  exports: [DatasetCustomisationPageComponent]
})
export class DatasetCustomisationModule {}
