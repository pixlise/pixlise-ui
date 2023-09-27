import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { TagPickerComponent } from "./components/tag-picker/tag-picker.component";

@NgModule({
  declarations: [TagPickerComponent],
  imports: [CommonModule, PIXLISECoreModule],
  exports: [TagPickerComponent],
  providers: [],
})
export class TagsModule {}
