import { NgModule } from '@angular/core';
import { Routes, RouterModule } from "@angular/router";
import { CommonModule } from '@angular/common';
import { AuthResultPageComponent } from './components/pages/auth-result-page/auth-result-page.component';
import { AuthGuardService } from "./services/auth-guard.service";


const APP_ROUTES: Routes = [
    { path: "", component: AuthResultPageComponent },
];

@NgModule({
        declarations: [
        AuthResultPageComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(APP_ROUTES)
    ],
    providers: [
        AuthGuardService
    ]
})
export class AuthenticatorModule
{
}
