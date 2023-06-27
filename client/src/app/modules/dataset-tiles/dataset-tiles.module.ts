import { NgModule } from '@angular/core';
import { Routes, RouterModule } from "@angular/router";
import { CommonModule } from '@angular/common';
import { DatasetTilesPageComponent } from './components/pages/dataset-tiles-page/dataset-tiles-page.component';


const APP_ROUTES: Routes = [
  { path: "", component: DatasetTilesPageComponent },
];

@NgModule({
    declarations: [
        DatasetTilesPageComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
    ]
})
export class DatasetsModule
{
}
