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

import { Component, EventEmitter, Output } from "@angular/core";
import { ActivatedRoute, Route, Router } from "@angular/router";
import { AuthService } from "@auth0/auth0-angular";
import { Subscription } from "rxjs";
import { UserDetails } from "src/app/generated-protos/user";
import { UserGroupRelationship } from "src/app/generated-protos/user-group";
import { GroupsService } from "src/app/modules/settings/services/groups.service";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";

@Component({
  selector: "app-user-menu-panel",
  templateUrl: "./user-menu-panel.component.html",
  styleUrls: ["./user-menu-panel.component.scss"],
})
export class UserMenuPanelComponent {
  private _subs: Subscription = new Subscription();
  @Output() close = new EventEmitter();

  user: UserDetails = {
    info: {
      id: "",
      name: "",
      email: "",
      iconURL: "",
    },
    dataCollectionVersion: "",
    permissions: [],
  };

  isOpen = false;

  isAdminOfAnyGroup = false;

  trigger: any;

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _groupsService: GroupsService,
    private _authService: AuthService,
    private _userOptionsService: UserOptionsService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this.user = this._userOptionsService.userDetails;
      })
    );

    this._subs.add(
      this._groupsService.groupsChanged$.subscribe(() => {
        this.isAdminOfAnyGroup =
          this._userOptionsService.hasFeatureAccess("admin") ||
          !!this._groupsService.groups.find(group => group.relationshipToUser === UserGroupRelationship.UGR_ADMIN);
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onHidePanel() {
    this.close.emit();
  }

  onLogout(): void {
    const returnTo = location.protocol + "//" + location.host;
    this._authService.logout({ logoutParams: { returnTo: returnTo } });
  }

  onResetHints(): void {}

  onGroups(): void {
    this._router.navigate(["/groups"], { queryParams: this._route.snapshot.queryParams });
  }

  onSettings(): void {
    this._userOptionsService.toggleSidebar();
    this.onHidePanel();
  }

  get userName(): string {
    if (!this.user?.info) {
      return "Loading...";
    }

    return this.user.info.name;
  }

  get userEmail(): string {
    if (!this.user?.info) {
      return "Loading...";
    }
    return this.user.info.email;
  }

  get dataCollectionActive(): boolean {
    return this._userOptionsService.currentDataCollectionAgreementAccepted;
  }
}
