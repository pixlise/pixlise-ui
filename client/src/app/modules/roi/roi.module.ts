import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { ROIService } from "./services/roi.service";
import { ROIItemComponent } from "./components/roi-item/roi-item.component";

@NgModule({
  declarations: [ROIItemComponent],
  imports: [CommonModule, PIXLISECoreModule],
  exports: [ROIItemComponent],
  providers: [ROIService],
})
export class ROIModule {}
