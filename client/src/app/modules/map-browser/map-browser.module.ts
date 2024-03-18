import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { MapBrowserPageComponent } from "./pages/map-browser-page/map-browser-page.component";
import { WidgetModule } from "src/app/modules/widget/widget.module";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: MapBrowserPageComponent,
  },
];

@NgModule({
  declarations: [MapBrowserPageComponent],
  imports: [CommonModule, PIXLISECoreModule, WidgetModule, RouterModule.forChild(APP_ROUTES)],
  exports: [MapBrowserPageComponent],
})
export class MapBrowserModule {}
