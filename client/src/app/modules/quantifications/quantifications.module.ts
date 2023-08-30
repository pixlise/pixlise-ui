import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { QuantLogsPageComponent } from "./pages/quant-logs-page/quant-logs-page.component";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: QuantLogsPageComponent,
  },
];

@NgModule({
  declarations: [QuantLogsPageComponent],
  imports: [CommonModule, PIXLISECoreModule, RouterModule.forChild(APP_ROUTES)],
  exports: [QuantLogsPageComponent],
})
export class QuantificationsModule {}
