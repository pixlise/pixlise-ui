// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Component, OnInit, ViewChildren, ElementRef, QueryList, inject, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { Navigation } from "../../navigation";

import { LoginPrefix, SignupPrefix } from "../number-button/number-button.component";
import { DefaultLoggedInLink } from "../../navigation";
// import { AuthService } from "@auth0/auth0-angular";
import { CustomAuthService as AuthService } from "src/app/services/custom-auth-service.service";
import { Subscription } from "rxjs";

@Component({
  selector: "nav-top-menu",
  templateUrl: "./nav-top-menu.component.html",
  styleUrls: ["./nav-top-menu.component.scss", "./nav-menu/nav-menu.component.scss"],
})
export class NavTopMenuComponent implements OnInit, OnDestroy {
  @ViewChildren("childMenu") childMenuElements: QueryList<ElementRef> = new QueryList<ElementRef>();

  private _subs: Subscription = new Subscription();

  loginLink: string = LoginPrefix + DefaultLoggedInLink;
  signupLink: string = SignupPrefix + DefaultLoggedInLink;
  loggedInPage: string = DefaultLoggedInLink;

  navigation: Navigation = new Navigation();
  private _openMenus: Map<string, boolean> = new Map<string, boolean>();
  private _activeNavGroup: string = "";

  private _authService = inject(AuthService);
  isAuthenticated$ = this._authService.isAuthenticated$;

  constructor(
    private _activeRoute: ActivatedRoute,
    private _router: Router
  ) {}

  ngOnInit(): void {
    for (let c of this.navigation.categories) {
      this._openMenus.set(c, false);
    }

    this._subs.add(
      this._activeRoute.url.subscribe(url => {
        this._activeNavGroup = this.navigation.getCategoryByLink(this._router.url);
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onLogout(): void {
    // Clear reviewer tokens from sesion storage
    sessionStorage.removeItem("reviewer_access_token");
    sessionStorage.removeItem("reviewer_id_token");

    const returnTo = location.protocol + "//" + location.host;
    this._authService.logout({ logoutParams: { returnTo: returnTo } });
  }

  onClickNav(navGroup: string) {
    // If its one of get started or about us, we navigate to the top of that page
    // For feature we don't do this because we don't have a place to go to - the sub-menu points to 3
    // different pages
    let link = this.navigation.getRootLink(navGroup);
    if (link) {
      this._router.navigate([link]);
    }
  }

  onMouseEnter(navGroup: string) {
    this.setMenuVisible(navGroup, true);
  }

  onMouseLeave(navGroup: string) {
    this.setMenuVisible(navGroup, false);
  }

  private setMenuVisible(navGroup: string, show: boolean) {
    for (let cat of this.navigation.categories) {
      this._openMenus.set(cat, false);
    }
    this._openMenus.set(navGroup, show);
  }

  isMenuOpen(navGroup: string): boolean {
    return this._openMenus.get(navGroup) || false;
  }

  isActiveNav(navGroup: string): boolean {
    // Find if we're in one of these categories...
    return this._activeNavGroup == navGroup;
  }
}
