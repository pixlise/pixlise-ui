import { Component, OnInit, Input } from "@angular/core";
import { Router } from "@angular/router";

@Component({
    selector: "nav-section-switch",
    templateUrl: "./nav-section-switch.component.html",
    styleUrls: ["./nav-section-switch.component.scss"]
})
export class NavSectionSwitchComponent implements OnInit
{
    @Input() isTop: boolean;
    @Input() leftNavLabel: string;
    @Input() leftNavLink: string;
    @Input() rightNavLabel: string;
    @Input() rightNavLink: string;

    constructor(private _router: Router)
    {
    }

    ngOnInit(): void
    {
    }

    get colourStyle(): string
    {
        return this.isTop ? "light" : "dark";
    }

    onNavLeft()
    {
        if(this.leftNavLink)
        {
            this._router.navigate([this.leftNavLink]);
        }
    }

    onNavRight()
    {
        if(this.rightNavLink)
        {
            this._router.navigate([this.rightNavLink]);
        }
    }
}