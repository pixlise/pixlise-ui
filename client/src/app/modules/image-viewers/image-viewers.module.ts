import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { FormsModule } from "@angular/forms";
import { AnalysisModule } from "../analysis/analysis.module";
import { MaterialModule } from "../material.module";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";

import { ContextImageComponent } from "./widgets/context-image/context-image.component";
import { ContextImagePickerComponent } from "./widgets/context-image/image-options/context-image-picker/context-image-picker.component";
import { ImageOptionsComponent } from "./widgets/context-image/image-options/image-options.component";

import { WidgetModule } from "../widget/widget.module";
import { MultiChannelViewerComponent } from "./widgets/multi-channel-viewer/multi-channel-viewer.component";

export { ContextImageComponent } from "./widgets/context-image/context-image.component";
export { MultiChannelViewerComponent } from "./widgets/multi-channel-viewer/multi-channel-viewer.component";

@NgModule({
  declarations: [ContextImageComponent, ImageOptionsComponent, ContextImagePickerComponent, MultiChannelViewerComponent],
  imports: [CommonModule, PIXLISECoreModule, AnalysisModule, FormsModule, DragDropModule, MaterialModule, WidgetModule],
  exports: [ContextImageComponent],
})
export class ImageViewersModule {}
