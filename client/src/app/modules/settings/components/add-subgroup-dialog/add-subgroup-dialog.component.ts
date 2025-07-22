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
import { MatSort } from "@angular/material/sort";
import { SelectionModel } from "@angular/cdk/collections";
import { MatTableDataSource } from "@angular/material/table";
import { GroupsService } from "../../services/groups.service";
import { UserGroupJoinSummaryInfo } from "src/app/generated-protos/user-group";

export interface AddUserDialogData {
  groupId: string;
}

export type Role = "viewer" | "editor";

@Component({
  standalone: false,
  selector: "app-add-subgroup-dialog",
  templateUrl: "./add-subgroup-dialog.component.html",
  styleUrls: ["./add-subgroup-dialog.component.scss"],
})
export class AddSubGroupDialogComponent {
  @ViewChild(MatSort) sort: MatSort = new MatSort();

  roles = ["viewer", "editor"];
  selectedRole: Role = "viewer";

  selection = new SelectionModel<UserGroupJoinSummaryInfo>(true, []);

  groups = new MatTableDataSource([] as UserGroupJoinSummaryInfo[]);

  _groupSearchString: string = "";
  columnIDs: string[] = ["select", "name", "description"];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AddUserDialogData,
    public dialogRef: MatDialogRef<AddSubGroupDialogComponent>,
    private _groupsService: GroupsService
  ) {
    this._groupsService.fetchJoinableGroups();

    this._groupsService.joinableGroupsChanged$.subscribe(changedGroups => {
      this.groups.data = this._groupsService.joinableGroups;
    });
  }

  ngAfterViewInit() {
    this.groups.sort = this.sort;
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.groups.data.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.groups.data);
  }

  checkboxLabel(row?: UserGroupJoinSummaryInfo): string {
    if (!row) {
      return `${this.isAllSelected() ? "deselect" : "select"} all`;
    }
    return `${this.selection.isSelected(row) ? "deselect" : "select"} user ${row.name}`;
  }

  get groupSearchString(): string {
    return this._groupSearchString;
  }

  set groupSearchString(value: string) {
    this._groupSearchString = value;
    this.groups.filter = value.trim().toLowerCase();
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onAccept(): void {
    this.dialogRef.close({
      groupIds: this.selection.selected.map(user => user.id),
      role: this.selectedRole,
    });
  }
}
