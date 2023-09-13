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
import { Component, Inject, OnInit, ViewChild } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatSort, Sort } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";
import { GroupsService } from "../../services/groups.service";
import { UserGroup, UserGroupJoinSummaryInfo } from "src/app/generated-protos/user-group";
import { UserInfo } from "src/app/generated-protos/user";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";

@Component({
  selector: "app-user-group-membership-dialog",
  templateUrl: "./user-group-membership-dialog.component.html",
  styleUrls: ["./user-group-membership-dialog.component.scss"],
})
export class UserGroupMembershipDialogComponent {
  selectedRole: "viewer" | "editor" | "admin" = "viewer";

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { user: UserInfo; role: "viewer" | "editor" | "admin"; group: UserGroup; requestId: string },
    public _groupsService: GroupsService,
    public dialogRef: MatDialogRef<UserGroupMembershipDialogComponent>,
    private _snackBar: SnackbarService
  ) {
    this.selectedRole = data.role;
  }

  onRemoveFromGroup(userId: string) {
    if (!this.data.group.info?.id) {
      return;
    }

    if (this.data.group.adminUsers.map(admin => admin.id)?.includes(userId)) {
      this._groupsService.removeAdminFromGroup(this.data.group.info.id, userId);
    }

    if (this.data.group.members?.users.map(member => member.id)?.includes(userId)) {
      this._groupsService.removeMemberFromGroup(this.data.group.info.id, userId);
    }

    if (this.data.group.viewers?.users.map(viewer => viewer.id)?.includes(userId)) {
      this._groupsService.removeViewerFromGroup(this.data.group.info.id, userId);
    }
  }

  onRemoveMemberFromGroup(userId: string) {
    if (!this.data.group.info?.id) {
      return;
    }

    this._groupsService.removeMemberFromGroup(this.data.group.info?.id, userId);
  }

  addToGroup(groupId: string, userId: string, role: "viewer" | "editor" | "admin") {
    if (role === "editor") {
      this._groupsService.addMemberToGroup(groupId, userId);
    } else if (role === "viewer") {
      this._groupsService.addViewerToGroup(groupId, userId);
    } else if (role === "admin") {
      this._groupsService.addAdminToGroup(groupId, userId);
    } else {
      this._snackBar.openError("Invalid role");
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.data?.group.info?.id && this.data?.user?.id) {
      if (!this.data.requestId) {
        this.onRemoveFromGroup(this.data.user.id);
      } else {
        this._groupsService.dismissAccessRequest(this.data.group.info.id, this.data.requestId);
      }
      this.addToGroup(this.data.group.info.id, this.data.user.id, this.selectedRole);
    }
    this.dialogRef.close();
  }
}
