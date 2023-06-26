import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from "@angular/router";
import { RouteNotFoundComponent } from './components/pages/route-not-found/route-not-found.component';
import { APICommService } from "./services/apicomm.service";
import { APIDataService } from "./services/apidata.service";
import { HttpInterceptorService } from "./services/http-interceptor.service";

export { RouteNotFoundComponent } from './components/pages/route-not-found/route-not-found.component';
export { APICommService } from "./services/apicomm.service";
export { APIDataService/*, mapArrayBufferToProto*/ } from "./services/apidata.service";
export { HttpInterceptorService } from "./services/http-interceptor.service";

/*
const APP_ROUTES: Routes = [
  { path: "", component: RouteNotFoundComponent },
];
*/

@NgModule({
    declarations: [
      RouteNotFoundComponent,
    ],
    imports: [
        CommonModule,
        //RouterModule.forChild(APP_ROUTES)
    ],
    providers: [
        APICommService,
        APIDataService,
        HttpInterceptorService
    ],
    exports: [
      RouteNotFoundComponent
    ]
})
export class CoreModule
{
}
