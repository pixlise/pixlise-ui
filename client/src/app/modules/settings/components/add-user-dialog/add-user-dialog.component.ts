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

import { Component, Inject, ViewChild } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { UsersService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { UserInfo } from "src/app/generated-protos/user";
import { MatSort } from "@angular/material/sort";
import { SelectionModel } from "@angular/cdk/collections";
import { MatTableDataSource } from "@angular/material/table";

export interface AddUserDialogData {
  groupId: string;
}

export type Role = "viewer" | "editor" | "admin";

@Component({
  selector: "app-add-user-dialog",
  templateUrl: "./add-user-dialog.component.html",
  styleUrls: ["./add-user-dialog.component.scss"],
})
export class AddUserDialogComponent {
  @ViewChild(MatSort) sort: MatSort = new MatSort();

  roles = ["viewer", "editor", "admin"];
  selectedRole: Role = "viewer";

  selection = new SelectionModel<UserInfo>(true, []);

  users = new MatTableDataSource([] as UserInfo[]);

  _userSearchString: string = "";
  columnIDs: string[] = ["select", "name", "email"];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AddUserDialogData,
    public dialogRef: MatDialogRef<AddUserDialogComponent>,
    private _usersService: UsersService
  ) {
    this._usersService.searchUsers(this._userSearchString);

    this._usersService.searchedUsers$.subscribe(searchedUsers => {
      this.users.data = searchedUsers;
    });
  }

  ngAfterViewInit() {
    this.users.sort = this.sort;
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.users.data.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.users.data);
  }

  checkboxLabel(row?: UserInfo): string {
    if (!row) {
      return `${this.isAllSelected() ? "deselect" : "select"} all`;
    }
    return `${this.selection.isSelected(row) ? "deselect" : "select"} user ${row.name}`;
  }

  get userSearchString(): string {
    return this._userSearchString;
  }

  set userSearchString(value: string) {
    this._userSearchString = value;
    this.users.filter = value.trim().toLowerCase();
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onAccept(): void {
    this.dialogRef.close({
      userIds: this.selection.selected.map(user => user.id),
      role: this.selectedRole,
    });
  }
}
