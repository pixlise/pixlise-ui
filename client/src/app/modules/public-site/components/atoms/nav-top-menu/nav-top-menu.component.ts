import { Component, OnInit, ViewChildren, ElementRef, QueryList } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { Navigation } from "../../navigation";

import { LoginPrefix, SignupPrefix, DefaultLoggedInLink } from "../../atoms/number-button/number-button.component";


@Component({
    selector: "nav-top-menu",
    templateUrl: "./nav-top-menu.component.html",
    styleUrls: ["./nav-top-menu.component.scss", "./nav-menu/nav-menu.component.scss"]
})
export class NavTopMenuComponent implements OnInit
{
    @ViewChildren("childMenu") childMenuElements: QueryList<ElementRef>;

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
        // If its one of get started or about us, we navigate to the top of that page
        // For feature we don't do this because we don't have a place to go to - the sub-menu points to 3
        // different pages
        let link = this.navigation.getRootLink(navGroup);
        if(link)
        {
            this._router.navigate([link]);
        }
    }

    onMouseEnter(navGroup: string)
    {
        this.setMenuVisible(navGroup, true);
    }

    onMouseLeave(navGroup: string)
    {
        this.setMenuVisible(navGroup, false);
    }

    private setMenuVisible(navGroup: string, show: boolean)
    {
        for(let cat of this.navigation.categories)
        {
            this._openMenus.set(cat, false);
        }
        this._openMenus.set(navGroup, show);
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
