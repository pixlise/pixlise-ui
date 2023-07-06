import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeEditorPageComponent } from './pages/code-editor-page/code-editor-page.component';
import { RouterModule, Routes } from '@angular/router';
import { PIXLISECoreModule } from '../pixlisecore/pixlisecore.module';



const APP_ROUTES: Routes = [
  {
    path: "",
    component: CodeEditorPageComponent
  },
];

@NgModule({
  declarations: [
    CodeEditorPageComponent
  ],
  imports: [
    CommonModule,
    PIXLISECoreModule,
    RouterModule.forChild(APP_ROUTES),
  ],
  exports: [
    CodeEditorPageComponent,
  ]
})
export class CodeEditorModule { }
