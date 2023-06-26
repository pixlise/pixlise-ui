import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WaitSpinnerComponent } from "./components/atoms/wait-spinner/wait-spinner.component";
import { PushButtonComponent } from "./components/atoms/buttons/push-button/push-button.component";
import { WidgetDisplayMessageComponent } from "./components/widget-display-message/widget-display-message.component";
import { MaterialModule } from "../material.module";
import { BadgeComponent } from "./components/atoms/badge/badge.component";
import { AuthenticateComponent } from "./components/pages/authenticate/authenticate.component";


@NgModule({
    declarations: [
        WaitSpinnerComponent,
        BadgeComponent,
        PushButtonComponent,
        WidgetDisplayMessageComponent,
        AuthenticateComponent
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
        AuthenticateComponent
    ]
})
export class PIXLISECoreModule { }
