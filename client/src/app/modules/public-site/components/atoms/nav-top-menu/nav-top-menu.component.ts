import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { Navigation } from "../../navigation";

import { LoginPrefix, SignupPrefix, DefaultLoggedInLink } from "../../atoms/number-button/number-button.component";


@Component({
    selector: "nav-top-menu",
    templateUrl: "./nav-top-menu.component.html",
    styleUrls: ["./nav-top-menu.component.scss"]
})
export class NavTopMenuComponent implements OnInit
{
    loginLink: string = LoginPrefix+DefaultLoggedInLink;
    signupLink: string = SignupPrefix+DefaultLoggedInLink;
    navigation: Navigation = new Navigation();
    private _openMenus: Map<string, boolean> = new Map<string, boolean>();
    private _activeNavGroup: string = "";

    constructor(
        private _activeRoute: ActivatedRoute,
        private _router: Router
        )
    {
    }

    ngOnInit(): void
    {
        for(let c of this.navigation.categories)
        {
            this._openMenus.set(c, false);
        }

        this._activeRoute.url.subscribe(
            (url)=>
            {
                this._activeNavGroup = this.navigation.getCategoryByLink(this._router.url);
            }
        )
    }

    onClickNav(navGroup: string)
    {
        // Set them all to closed
        for(let c of this.navigation.categories)
        {
            if(c != navGroup)
            {
                this._openMenus.set(c, false);
            }
        }

        this._openMenus.set(navGroup, !this.isMenuOpen(navGroup));
    }

    isMenuOpen(navGroup: string): boolean
    {
        return this._openMenus.get(navGroup);
    }

    isActiveNav(navGroup: string): boolean
    {
        // Find if we're in one of these categories...
        return this._activeNavGroup == navGroup;
    }
}
