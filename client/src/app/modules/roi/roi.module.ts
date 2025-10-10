import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ColorPickerDirective } from "ngx-color-picker";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { ROIItemComponent } from "./components/roi-item/roi-item.component";
import { TagsModule } from "../tags/tags.module";
import { ROISearchControlsComponent } from "./components/roi-search-controls/roi-search-controls.component";
import { ROIPickerComponent } from "./components/roi-picker/roi-picker.component";
import { ROIShapeComponent } from "./components/roi-shape/roi-shape.component";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { NewROIDialogComponent } from "src/app/modules/roi/components/new-roi-dialog/new-roi-dialog.component";
import { ROIItemDetails } from './components/roi-item-details/roi-item-details.component';
import { ROIItemDisplaySettings } from './components/roi-item-display-settings/roi-item-display-settings.component';

@NgModule({
  declarations: [ROIItemComponent, ROISearchControlsComponent, ROIPickerComponent, ROIShapeComponent, NewROIDialogComponent, ROIItemDetails, ROIItemDisplaySettings],
  imports: [CommonModule, PIXLISECoreModule, TagsModule, ScrollingModule, DragDropModule, ColorPickerDirective],
  exports: [ROIItemComponent, ROISearchControlsComponent, ROIPickerComponent, ROIShapeComponent, NewROIDialogComponent, ROIItemDetails, ROIItemDisplaySettings],
  providers: [],
})
export class ROIModule {}
