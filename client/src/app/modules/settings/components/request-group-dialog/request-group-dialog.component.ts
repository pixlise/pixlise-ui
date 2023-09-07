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

import { SelectionModel } from "@angular/cdk/collections";
import { Component, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { GroupsService } from "../../services/groups.service";
import { UserGroupJoinSummaryInfo } from "src/app/generated-protos/user-group";

@Component({
  selector: "app-request-group-dialog",
  templateUrl: "./request-group-dialog.component.html",
  styleUrls: ["./request-group-dialog.component.scss"],
})
export class RequestGroupDialogComponent implements OnInit {
  _groupSearchString: string = "";

  @ViewChild(MatSort) sort: MatSort = new MatSort();

  selection = new SelectionModel<UserGroupJoinSummaryInfo>(true, []);

  availableGroups = new MatTableDataSource([] as UserGroupJoinSummaryInfo[]);

  columns: { displayName: string; id: string }[] = [
    { displayName: "Name", id: "name" },
    { displayName: "Description", id: "description" },
    { displayName: "Datasets", id: "datasets" },
  ];
  columnIDs: string[] = ["select", "asMember", "name", "description", "administrators", "datasets", "lastUserJoinedUnixSec"];

  groupAdminTooltips: Record<string, string> = {};
  groupRequestAsMember: Record<string, boolean> = {};

  constructor(
    public _groupsService: GroupsService,
    public dialogRef: MatDialogRef<RequestGroupDialogComponent>
  ) {
    this._groupsService.joinableGroupsChanged$.subscribe(() => {
      this.availableGroups.data = this._groupsService.joinableGroups;

      this._groupsService.joinableGroups.forEach(group => {
        this.groupRequestAsMember[group.id] = false;

        this.groupAdminTooltips[group.id] = group.administrators
          .slice(1)
          .map(admin => `${admin.name}`)
          .join("\n\n");
      });
    });
  }

  ngAfterViewInit() {
    this.availableGroups.sort = this.sort;
  }

  ngOnInit(): void {
    this._groupsService.fetchJoinableGroups();
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.availableGroups.data.length;
    return numSelected === numRows;
  }

  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.availableGroups.data);
  }

  toggleAsMember(groupId: string) {
    this.groupRequestAsMember[groupId] = !this.groupRequestAsMember[groupId];
  }

  checkboxLabel(row?: UserGroupJoinSummaryInfo): string {
    if (!row) {
      return `${this.isAllSelected() ? "deselect" : "select"} all`;
    }
    return `${this.selection.isSelected(row) ? "deselect" : "select"} group ${row.name}`;
  }

  get groupSearchString(): string {
    return this._groupSearchString;
  }

  set groupSearchString(value: string) {
    this._groupSearchString = value;
    this.availableGroups.filter = value.trim().toLowerCase();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.selection.selected.forEach(group => {
      this._groupsService.requestAccessToGroup(group, this.groupRequestAsMember[group.id]);
    });

    this.dialogRef.close();
  }
}
