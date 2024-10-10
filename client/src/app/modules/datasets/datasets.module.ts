import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MaterialModule } from "../material.module";

import { DatasetTilesPageComponent } from "./components/pages/dataset-tiles-page/dataset-tiles-page.component";
import { DataSetSummaryComponent } from "./components/atoms/data-set-summary/data-set-summary.component";
import { AddDatasetDialogComponent } from "./components/atoms/add-dataset-dialog/add-dataset-dialog.component";
import { FilterDialogComponent } from "./components/atoms/filter-dialog/filter-dialog.component";
import { LogViewerComponent } from "./components/atoms/log-viewer/log-viewer.component";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { NgxDropzoneModule } from "ngx-dropzone";
import { TagsModule } from "../tags/tags.module";
import { MarkdownModule } from "ngx-markdown";
import { MatMenuModule } from "@angular/material/menu";
import { DuplicateWorkspaceDialogComponent } from "./components/atoms/duplicate-workspace-dialog/duplicate-workspace-dialog.component";

const APP_ROUTES: Routes = [
  {
    path: "",
    component: DatasetTilesPageComponent,
  },
  {
    path: "analysis",
    loadChildren: () => import("../analysis/analysis.module").then(m => m.AnalysisModule),
  },
  {
    path: "code-editor",
    loadChildren: () => import("../code-editor/code-editor.module").then(m => m.CodeEditorModule),
  },
  {
    path: "maps",
    loadChildren: () => import("../map-browser/map-browser.module").then(m => m.MapBrowserModule),
  },
  {
    path: "edit-scan",
    loadChildren: () => import("../dataset-customisation/dataset-customisation.module").then(m => m.DatasetCustomisationModule),
  },
];

@NgModule({
  declarations: [
    DatasetTilesPageComponent,
    DataSetSummaryComponent,
    AddDatasetDialogComponent,
    FilterDialogComponent,
    LogViewerComponent,
    DuplicateWorkspaceDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    MatMenuModule,
    PIXLISECoreModule,
    TagsModule,
    NgxDropzoneModule,
    MarkdownModule,
    RouterModule.forChild(APP_ROUTES),
  ],
})
export class DatasetsModule {}
