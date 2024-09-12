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

import { Component, EventEmitter, OnDestroy, OnInit, Output } from "@angular/core";
import { ActivatedRoute, Route, Router } from "@angular/router";
import { AuthService } from "@auth0/auth0-angular";
import { Subscription } from "rxjs";
import { BackupDBReq, BackupDBResp, DBAdminConfigGetReq, DBAdminConfigGetResp, RestoreDBReq, RestoreDBResp } from "src/app/generated-protos/system";
import { UserDetails } from "src/app/generated-protos/user";
import { UserGroupRelationship } from "src/app/generated-protos/user-group";
import { UserImpersonateGetReq, UserImpersonateGetResp, UserImpersonateReq, UserImpersonateResp } from "src/app/generated-protos/user-management-msgs";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { GroupsService } from "src/app/modules/settings/services/groups.service";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";

@Component({
  selector: "app-user-menu-panel",
  templateUrl: "./user-menu-panel.component.html",
  styleUrls: ["./user-menu-panel.component.scss"],
})
export class UserMenuPanelComponent implements OnInit, OnDestroy {
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
  isPIXLISEAdmin = false;
  impersonateUserEnabled = false;
  impersonatingUserName: string | undefined;
  backupEnabled = false;
  restoreEnabled = false;

  trigger: any;

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _groupsService: GroupsService,
    private _authService: AuthService,
    private _userOptionsService: UserOptionsService,
    private _dataService: APIDataService,
    private _snackService: SnackbarService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this.user = this._userOptionsService.userDetails;
      })
    );

    this._subs.add(
      this._groupsService.groupsChanged$.subscribe(() => {
        this.isPIXLISEAdmin = this._userOptionsService.hasFeatureAccess("admin"); // TODO: is this right??
        this.isAdminOfAnyGroup =
          this._userOptionsService.hasFeatureAccess("admin") ||
          !!this._groupsService.groups.find(group => group.relationshipToUser === UserGroupRelationship.UGR_ADMIN);

        // Now if we're PIXLISE admins, check if we're impersonating anyone
        if (this.isPIXLISEAdmin) {
          this._subs.add(
            this._dataService.sendUserImpersonateGetRequest(UserImpersonateGetReq.create({})).subscribe((resp: UserImpersonateGetResp) => {
              if (resp.sessionUser && resp.sessionUser.id.length > 0) {
                this.impersonatingUserName = resp.sessionUser?.name || resp.sessionUser?.email || resp.sessionUser?.id || "UNKNOWN";
              } else {
                this.impersonatingUserName = "";
              }
            })
          );
        }
      })
    );

    this._subs.add(
      this._dataService.sendDBAdminConfigGetRequest(DBAdminConfigGetReq.create({})).subscribe((resp: DBAdminConfigGetResp) => {
        this.backupEnabled = resp.canBackup;
        this.restoreEnabled = resp.canRestore;
        this.impersonateUserEnabled = resp.impersonateEnabled;
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

  onImpersonate() {
    let userId = "";
    if (this.impersonatingUserName !== undefined && this.impersonatingUserName.length <= 0) {
      // Ask who to impersonate
      userId = prompt("Enter user id to impersonate (or blank to stop impersonating)") || "";
    }

    this._dataService.sendUserImpersonateRequest(UserImpersonateReq.create({ userId })).subscribe({
      next: (resp: UserImpersonateResp) => {
        if (resp.sessionUser && resp.sessionUser.id) {
          this._snackService.openSuccess(
            `Reload PIXLISE tab to impersonate user: ${resp.sessionUser?.name}, email: ${resp.sessionUser?.email}, user id: ${resp.sessionUser?.id}`
          );
        } else {
          this._snackService.openSuccess(`Reload PIXLISE tab to stop impersonation`)
        }
      },
      error: err => {
        this._snackService.openError("Failed to impersonate user", err);
      },
    });
  }

  onBackupData() {
    if (confirm("Are you sure you want to start a PIXLISE backup operation? This will take a while...")) {
      this._dataService.sendBackupDBRequest(BackupDBReq.create({})).subscribe({
        next: (resp: BackupDBResp) => {
          this._snackService.open("Backup started");
        },
        error: err => {
          this._snackService.openError("Backup failed", err);
        }
      });
    }
  }

  onRestoreData() {
    if (confirm("Are you sure you want to restore the PIXLISE backup?")) {
      this._dataService.sendRestoreDBRequest(RestoreDBReq.create({})).subscribe({
        next: (resp: RestoreDBResp) => {
          this._snackService.open("Restore started");
        },
        error: err => {
          this._snackService.openError("Restore failed", err);
        }
      });
    }
  }
}
