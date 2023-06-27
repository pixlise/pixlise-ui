import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WaitSpinnerComponent } from "./components/atoms/wait-spinner/wait-spinner.component";
import { PushButtonComponent } from "./components/atoms/buttons/push-button/push-button.component";
import { WidgetDisplayMessageComponent } from "./components/widget-display-message/widget-display-message.component";
import { MaterialModule } from "../material.module";
import { BadgeComponent } from "./components/atoms/badge/badge.component";
import { AuthenticateComponent } from "./components/pages/authenticate/authenticate.component";

import { RouteNotFoundComponent } from './components/pages/route-not-found/route-not-found.component';
import { APICommService } from "./services/apicomm.service";
import { APIDataService } from "./services/apidata.service";
import { HttpInterceptorService } from "./services/http-interceptor.service";

export { RouteNotFoundComponent } from "./components/pages/route-not-found/route-not-found.component";
export { APICommService } from "./services/apicomm.service";
export { APIDataService } from "./services/apidata.service";
export { HttpInterceptorService } from "./services/http-interceptor.service";


@NgModule({
    declarations: [
        WaitSpinnerComponent,
        BadgeComponent,
        PushButtonComponent,
        WidgetDisplayMessageComponent,
        AuthenticateComponent,
        RouteNotFoundComponent
    ],
    imports: [
        CommonModule,
        MaterialModule
    ],
    exports: [
        WaitSpinnerComponent,
        BadgeComponent,
        PushButtonComponent,
        WidgetDisplayMessageComponent,
        AuthenticateComponent,
        RouteNotFoundComponent
    ],
    providers: [
        APICommService,
        APIDataService,
        HttpInterceptorService
    ]
})
export class PIXLISECoreModule { }
