import { Component, OnInit, Input } from "@angular/core";

import { NavigationItem } from "../../../navigation";


@Component({
    selector: "nav-menu",
    templateUrl: "./nav-menu.component.html",
    styleUrls: ["./nav-menu.component.scss"]
})
export class NavMenuComponent implements OnInit
{
    @Input() items: NavigationItem[];

    constructor()
    {
    }

    ngOnInit(): void
    {
    }
}
