import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { FormsModule } from "@angular/forms";
//import { AnalysisModule } from "../analysis/analysis.module";
import { MaterialModule } from "../material.module";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";

import { ContextImageComponent } from "./widgets/context-image/context-image.component";
import { ContextImagePickerComponent } from "./components/context-image-picker/context-image-picker.component";
import { ImageOptionsComponent } from "./widgets/context-image/image-options/image-options.component";

import { WidgetModule } from "../widget/widget.module";
import { MultiChannelViewerComponent } from "./widgets/multi-channel-viewer/multi-channel-viewer.component";
import { InteractiveCanvas3DComponent } from "./widgets/scan-3d-view/interactive-canvas-3d.component";
import { Scan3DViewComponent } from "./widgets/scan-3d-view/scan-3d-view.component";

export { ContextImageComponent } from "./widgets/context-image/context-image.component";
export { ContextImagePickerComponent, ContextImageItem } from "./components/context-image-picker/context-image-picker.component";
export { MultiChannelViewerComponent } from "./widgets/multi-channel-viewer/multi-channel-viewer.component";
export { ContextImageScanModel, ContextImageModelLoadedData } from "./widgets/context-image/context-image-model-internals";
export { ContextImageModel } from "./widgets/context-image/context-image-model";
export { ContextImageDrawer } from "./widgets/context-image/context-image-drawer";
export { ToolHostCreateSettings, ContextImageToolHost } from "./widgets/context-image/tools/tool-host";
export { ContextImagePan } from "./widgets/context-image/tools/pan";
export { ContextImageItemTransform } from "./models/image-transform";

@NgModule({
  declarations: [ContextImageComponent, ImageOptionsComponent, ContextImagePickerComponent, MultiChannelViewerComponent, InteractiveCanvas3DComponent, Scan3DViewComponent],
  imports: [CommonModule, PIXLISECoreModule, /*AnalysisModule,*/ FormsModule, DragDropModule, MaterialModule, WidgetModule],
  exports: [ContextImageComponent, ContextImagePickerComponent],
})
export class ImageViewersModule {}
