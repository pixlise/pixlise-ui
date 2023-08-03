import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WaitSpinnerComponent } from "./components/atoms/wait-spinner/wait-spinner.component";



@NgModule({
    declarations: [
        WaitSpinnerComponent
    ],
    imports: [
        CommonModule
    ],
    exports: [
        WaitSpinnerComponent
    ]
})
export class PIXLISECoreModule { }
