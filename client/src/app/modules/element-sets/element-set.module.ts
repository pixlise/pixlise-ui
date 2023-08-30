import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { PIXLISECoreModule } from "../pixlisecore/pixlisecore.module";
import { ElementSetService } from "./services/element-set.service";

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        PIXLISECoreModule
    ],
    exports: [],
    providers: [
        ElementSetService
    ]
})
export class ElementSetModule { }
