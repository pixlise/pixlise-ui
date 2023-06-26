
import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";

import { LandingPageComponent } from "./components/pages/landing-page/landing-page.component";



const APP_ROUTES: Routes = [
    { path: "", component: LandingPageComponent/*,
        children: [
            { path: "get-started", component: GetPIXLISEComponent }
        ]*/
    },
];

@NgModule({
    declarations: [
        LandingPageComponent,
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES),
    ]
})
export class PublicSiteModule
{
}
