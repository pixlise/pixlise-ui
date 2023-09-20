import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { ROIService } from "./services/roi.service";
import { ROIItemComponent } from "./components/roi-item/roi-item.component";
import { TagsModule } from "../tags/tags.module";

@NgModule({
  declarations: [ROIItemComponent],
  imports: [CommonModule, PIXLISECoreModule, TagsModule],
  exports: [ROIItemComponent],
  providers: [],
})
export class ROIModule {}
