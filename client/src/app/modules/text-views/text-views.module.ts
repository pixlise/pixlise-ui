import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MarkdownModule } from "ngx-markdown";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { FormsModule } from "@angular/forms";

import { MarkdownTextViewComponent } from "./widgets/markdown-text-view/markdown-text-view.component";

export { MarkdownTextViewComponent } from "./widgets/markdown-text-view/markdown-text-view.component";

@NgModule({
  declarations: [MarkdownTextViewComponent],
  imports: [CommonModule, FormsModule, PIXLISECoreModule, MarkdownModule],
  exports: [MarkdownTextViewComponent],
})
export class TextViewsModule {}
