import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CodeEditorPageComponent } from "./pages/code-editor-page/code-editor-page.component";
import { RouterModule, Routes } from "@angular/router";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { DOIPublishDialog } from "./components/doi-publish-dialog/doi-publish-dialog.component";
import { ExpressionEditorComponent } from "./components/expression-editor/expression-editor.component";
import { ExpressionMetadataEditorComponent } from "./components/expression-metadata-editor/expression-metadata-editor.component";
import { ExpressionTextEditorComponent } from "./components/expression-text-editor/expression-text-editor.component";
import { TagsModule } from "../tags/tags.module";
import { WidgetModule } from "../widget/widget.module";
import { ExpressionConsoleComponent } from "./components/expression-console/expression-console.component";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: CodeEditorPageComponent,
  },
];

@NgModule({
  declarations: [
    CodeEditorPageComponent,
    DOIPublishDialog,
    ExpressionEditorComponent,
    ExpressionMetadataEditorComponent,
    ExpressionTextEditorComponent,
    ExpressionConsoleComponent,
  ],
  imports: [CommonModule, PIXLISECoreModule, RouterModule.forChild(APP_ROUTES), TagsModule, WidgetModule],
  exports: [
    CodeEditorPageComponent,
    DOIPublishDialog,
    ExpressionEditorComponent,
    ExpressionMetadataEditorComponent,
    ExpressionTextEditorComponent,
    ExpressionConsoleComponent,
  ],
})
export class CodeEditorModule {}
