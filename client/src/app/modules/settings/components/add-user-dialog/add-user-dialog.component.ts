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

import { Component, Inject, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Observable, map, startWith } from "rxjs";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { UsersService } from "../../services/users.service";
import { Auth0UserDetails, UserInfo } from "src/app/generated-protos/user";

export interface AddUserDialogData {
  groupId: string;
}

export type Role = "viewer" | "editor" | "admin";

@Component({
  selector: "app-add-user-dialog",
  templateUrl: "./add-user-dialog.component.html",
  styleUrls: ["./add-user-dialog.component.scss"],
})
export class AddUserDialogComponent implements OnInit {
  selectedUserControl = new FormControl<string | UserInfo>("");
  filteredOptions: Observable<UserInfo[]>;
  options: UserInfo[] = [];

  roles = ["viewer", "editor", "admin"];
  selectedRole: Role = "viewer";

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AddUserDialogData,
    public dialogRef: MatDialogRef<AddUserDialogComponent>,
    private _usersService: UsersService
  ) {
    this.filteredOptions = this.selectedUserControl.valueChanges.pipe(
      startWith(""),
      map(value => {
        const name: string = typeof value === "string" ? value : value?.name || "";
        if (name.length > 0) {
          this._usersService.searchUsers(name);
        }
        return name ? this._filter(name) : this.options.slice();
      })
    );

    this._usersService.searchedUsers$.subscribe(searchedUsers => {
      this.options = Object.values(this._usersService.cachedUsers);
    });
  }

  displayFn(user: UserInfo): string {
    return user && user.name ? user.name : "";
  }

  private _filter(name: string): UserInfo[] {
    const filterValue = name.toLowerCase();

    return this.options.filter(option => option?.name.toLowerCase().includes(filterValue));
  }

  ngOnInit(): void {}

  onDeny(): void {
    this.dialogRef.close(false);
  }

  onAccept(): void {
    let userId = this.selectedUserControl.value;
    if (typeof userId !== "string" && userId?.id) {
      userId = userId.id;
    }

    this.dialogRef.close({
      userId,
      role: this.selectedRole,
    });
  }

  get appDomain(): string {
    return EnvConfigurationInitService.appConfig.appDomain;
  }
}
