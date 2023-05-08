import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { LandingRouteName } from "../landing-page/landing-page.component";


@Component({
    selector: "app-public-page",
    templateUrl: "./public-page.component.html",
    styleUrls: ["./public-page.component.scss"]
})
export class PublicPageComponent implements OnInit
{
    showBrandingLogos = false;

    constructor(
        private _route: ActivatedRoute,
        )
    {
    }

    ngOnInit(): void
    {
        this._route.url.subscribe(
            (params)=> 
            {
                // TODO: fixme, this is ugly and likely to break if we change our routes!!!
                this.showBrandingLogos = (window.location.href.indexOf("/public/"+LandingRouteName) >= 0);
            }
        );
    }
}
