import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { ROIItemComponent } from "./components/roi-item/roi-item.component";
import { TagsModule } from "../tags/tags.module";
import { ROISearchControlsComponent } from "./components/roi-search-controls/roi-search-controls.component";
import { ROIPickerComponent } from "./components/roi-picker/roi-picker.component";
import { ROIShapeComponent } from "./components/roi-shape/roi-shape.component";
import { DragDropModule } from "@angular/cdk/drag-drop";

@NgModule({
  declarations: [ROIItemComponent, ROISearchControlsComponent, ROIPickerComponent, ROIShapeComponent],
  imports: [CommonModule, PIXLISECoreModule, TagsModule, ScrollingModule, DragDropModule],
  exports: [ROIItemComponent, ROISearchControlsComponent, ROIPickerComponent, ROIShapeComponent],
  providers: [],
})
export class ROIModule {}
