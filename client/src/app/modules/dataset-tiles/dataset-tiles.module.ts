import { NgModule } from '@angular/core';
import { Routes, RouterModule } from "@angular/router";
import { CommonModule } from '@angular/common';
import { FormsModule } from "@angular/forms";
import { MaterialModule } from "../material.module";

import { DatasetTilesPageComponent } from "./components/pages/dataset-tiles-page/dataset-tiles-page.component";
import { DataSetSummaryComponent } from "./components/atoms/data-set-summary/data-set-summary.component";
import { AddDatasetDialogComponent } from "./components/atoms/add-dataset-dialog/add-dataset-dialog.component";
import { FilterDialogComponent } from "./components/atoms/filter-dialog/filter-dialog.component";
import { LogViewerComponent } from "./components/atoms/log-viewer/log-viewer.component";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";


const APP_ROUTES: Routes = [
    { path: "", component: DatasetTilesPageComponent },
];

@NgModule({
    declarations: [
        DatasetTilesPageComponent,
        DataSetSummaryComponent,
        AddDatasetDialogComponent,
        FilterDialogComponent,
        LogViewerComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MaterialModule,
        PIXLISECoreModule,
        RouterModule.forChild(APP_ROUTES),
    ]
})
export class DatasetTilesModule
{
}
