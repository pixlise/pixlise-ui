import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { CommonModule } from "@angular/common";

import { DatasetsPageComponent } from "./components/datasets-page/datasets-page.component";

import { AddDatasetDialogComponent } from "./components/add-dataset-dialog/add-dataset-dialog.component";
import { FilterDialogComponent } from "./components/filter-dialog/filter-dialog.component";
import { DataSetSummaryComponent } from "./components/data-set-summary/data-set-summary.component";


const APP_ROUTES: Routes = [
    { path: "", component: DatasetsPageComponent }
];

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        DatasetsPageComponent,
        DataSetSummaryComponent,
        FilterDialogComponent,
        AddDatasetDialogComponent,
        RouterModule.forChild(APP_ROUTES)
    ]
})
export class DatasetTilesModule { }
