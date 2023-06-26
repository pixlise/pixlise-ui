import { NgModule } from '@angular/core';
import { Routes, RouterModule } from "@angular/router";
import { CommonModule } from '@angular/common';
import { DatasetsPageComponent } from './components/pages/datasets-page/datasets-page.component';


const APP_ROUTES: Routes = [
  { path: "", component: DatasetsPageComponent },
];

@NgModule({
    declarations: [
        DatasetsPageComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
    ]
})
export class DatasetsModule
{
}
