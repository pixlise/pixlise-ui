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

import { Component, Inject, Input, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { UserGroupInfo } from "../../../../generated-protos/user-group";
import { Auth0UserRole } from "../../../../generated-protos/user";
import { Subscription } from "rxjs";
import { UsersService } from "../../services/users.service";
import { SnackbarService } from "../../../pixlisecore/pixlisecore.module";
import { UserOptionsService } from "../../services/user-options.service";

@Component({
  selector: "app-new-group-dialog",
  templateUrl: "./new-group-dialog.component.html",
  styleUrls: ["./new-group-dialog.component.scss"],
})
export class NewGroupDialogComponent implements OnInit {
  private _subs: Subscription = new Subscription();

  groupName: string = "";
  groupDescription: string = "";
  isExistingGroup: boolean = false;
  joinable: boolean = true;
  defaultRoles: string[] = [];

  allAuth0Roles: Auth0UserRole[] = [];

  constructor(
    public dialogRef: MatDialogRef<NewGroupDialogComponent>,
    private _usersService: UsersService,
    private _snackBar: SnackbarService,
    private _userOptionsService: UserOptionsService,
    @Inject(MAT_DIALOG_DATA) public data: { group?: UserGroupInfo }
  ) {
    if (this.data?.group) {
      this.groupName = this.data.group.name;
      this.groupDescription = this.data.group.description;
      this.joinable = this.data.group.joinable;
      this.defaultRoles = this.data.group.defaultRoles;
      this.isExistingGroup = true;
    }
  }

  ngOnInit(): void {
    this._subs.add(
      this._usersService.fetchAllUserRoles().subscribe({
        next: roles => {
          this.allAuth0Roles = roles;
          this.allAuth0Roles = this.allAuth0Roles.filter(role => role.name !== "Admin" && !role.name.startsWith("v3-") && role.name !== "Unassigned New User");
        },
        error: err => {
          this._snackBar.openError("Error fetching user roles");
          console.error(err);
        },
      })
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close({
      groupName: this.groupName,
      groupDescription: this.groupDescription,
      joinable: this.joinable,
      defaultRoles: this.defaultRoles,
    });
  }

  get isAdmin(): boolean {
    return this._userOptionsService.hasFeatureAccess("admin");
  }

  get appDomain(): string {
    return EnvConfigurationInitService.appConfig.appDomain;
  }
}
