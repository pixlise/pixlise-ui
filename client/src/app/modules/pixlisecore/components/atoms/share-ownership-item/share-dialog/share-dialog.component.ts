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
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { OwnershipItem, UserGroupList } from "src/app/generated-protos/ownership-access";
import { UserInfo } from "src/app/generated-protos/user";
import { UserGroupInfo } from "src/app/generated-protos/user-group";
import { GroupsService } from "src/app/modules/settings/services/groups.service";
import { UsersService } from "src/app/modules/settings/services/users.service";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";

export type ShareDialogData = {
  ownershipItem: OwnershipItem;
};

export type ShareDialogResponse = {
  addEditors: UserGroupList;
  deleteEditors: UserGroupList;
  addViewers: UserGroupList;
  deleteViewers: UserGroupList;
};

@Component({
  selector: "share-dialog",
  templateUrl: "./share-dialog.component.html",
  styleUrls: ["./share-dialog.component.scss"],
})
export class ShareDialogComponent implements OnInit {
  groupEditors: string[] = [];
  newGroupEditors: Set<string> = new Set();
  removedGroupEditors: Set<string> = new Set();
  groupEditorsTooltip: string = "";

  userEditors: string[] = [];
  newUserEditors: Set<string> = new Set();
  removedUserEditors: Set<string> = new Set();
  userEditorsTooltip: string = "";

  groupViewers: string[] = [];
  newGroupViewers: Set<string> = new Set();
  removedGroupViewers: Set<string> = new Set();
  groupViewersTooltip: string = "";

  userViewers: string[] = [];
  newUserViewers: Set<string> = new Set();
  removedUserViewers: Set<string> = new Set();
  userViewersTooltip: string = "";

  confirmButtonTooltip: string = "";

  groups: UserGroupInfo[] = [];
  users: UserInfo[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ShareDialogData,
    public dialogRef: MatDialogRef<ShareDialogComponent, ShareDialogResponse>,
    private _groupsService: GroupsService,
    private _usersService: UsersService
  ) {
    this._groupsService.fetchGroups();
    this._usersService.searchUsers("");
  }

  ngOnInit(): void {
    this._groupsService.groupsChanged$.subscribe(() => {
      this.groups = this._groupsService.groups;
      this.formGroupViewersTooltip();
      this.formGroupEditorsTooltip();
    });

    this._usersService.searchedUsers$.subscribe(searchedUsers => {
      this.users = searchedUsers;
      this.formUserViewersTooltip();
      this.formUserEditorsTooltip();
    });

    this.groupEditors = this.data?.ownershipItem?.editors?.groupIds || [];
    this.userEditors = this.data?.ownershipItem?.editors?.userIds || [];

    this.groupViewers = this.data?.ownershipItem?.viewers?.groupIds || [];
    this.userViewers = this.data?.ownershipItem?.viewers?.userIds || [];
  }

  get maxUsersPerOwnershipItem(): number {
    return EnvConfigurationInitService.appConfig.maxUsersPerOwnershipItem;
  }

  formUserViewersTooltip() {
    let viewerNames = this.userViewers.map(editor => {
      let user = this.users.find(user => user.id === editor);
      return user?.name || editor;
    });

    this.userViewersTooltip = viewerNames.join("\n");
  }

  formUserEditorsTooltip() {
    let editorNames = this.userEditors.map(editor => {
      let user = this.users.find(user => user.id === editor);
      return user?.name || editor;
    });

    this.userEditorsTooltip = editorNames.join("\n");
  }

  formGroupViewersTooltip() {
    let groupNames = this.groupViewers.map(editor => {
      let group = this.groups.find(group => group.id === editor);
      return group?.name || editor;
    });

    this.groupViewersTooltip = groupNames.join("\n");
  }

  formGroupEditorsTooltip() {
    let editorNames = this.groupEditors.map(editor => {
      let group = this.groups.find(group => group.id === editor);
      return group?.name || editor;
    });

    this.groupEditorsTooltip = editorNames.join("\n");
  }

  onEditorUserChange(event: any) {
    let existingEditors = new Set(this.data?.ownershipItem?.editors?.userIds || []);
    let newEditorsList = new Set(event.value as string[]);

    this.newUserEditors.clear();
    this.removedUserEditors.clear();

    existingEditors.forEach(editor => {
      if (!newEditorsList.has(editor)) {
        this.removedUserEditors.add(editor);
      }
    });

    newEditorsList.forEach(editor => {
      if (!existingEditors.has(editor)) {
        this.newUserEditors.add(editor);
      }
    });

    this.formUserEditorsTooltip();
    this.formConfirmButtonTooltip();
  }

  onViewerUserChange(event: any) {
    let existingViewers = new Set(this.data?.ownershipItem?.viewers?.userIds || []);
    let newViewersList = new Set(event.value as string[]);

    this.newUserViewers.clear();
    this.removedUserViewers.clear();

    existingViewers.forEach(viewer => {
      if (!newViewersList.has(viewer)) {
        this.removedUserViewers.add(viewer);
      }
    });

    newViewersList.forEach(viewer => {
      if (!existingViewers.has(viewer)) {
        this.newUserViewers.add(viewer);
      }
    });

    this.formUserViewersTooltip();
    this.formConfirmButtonTooltip();
  }

  onEditorGroupChange(event: any) {
    let existingEditors = new Set(this.data?.ownershipItem?.editors?.groupIds || []);
    let newEditorsList = new Set(event.value as string[]);

    this.newGroupEditors.clear();
    this.removedGroupEditors.clear();

    existingEditors.forEach(editor => {
      if (!newEditorsList.has(editor)) {
        this.removedGroupEditors.add(editor);
      }
    });

    newEditorsList.forEach(editor => {
      if (!existingEditors.has(editor)) {
        this.newGroupEditors.add(editor);
      }
    });

    this.formGroupEditorsTooltip();
    this.formConfirmButtonTooltip();
  }

  onViewerGroupChange(event: any) {
    let existingViewers = new Set(this.data?.ownershipItem?.viewers?.groupIds || []);
    let newViewersList = new Set(event.value as string[]);

    this.newGroupViewers.clear();
    this.removedGroupViewers.clear();

    existingViewers.forEach(viewer => {
      if (!newViewersList.has(viewer)) {
        this.removedGroupViewers.add(viewer);
      }
    });

    newViewersList.forEach(viewer => {
      if (!existingViewers.has(viewer)) {
        this.newGroupViewers.add(viewer);
      }
    });

    this.formGroupViewersTooltip();
    this.formConfirmButtonTooltip();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  formConfirmButtonTooltip() {
    let tooltip = "";

    if (this.newUserEditors.size > 0) {
      let newUserEditorNames = Array.from(this.newUserEditors).map(editor => this.users.find(user => user.id === editor)?.name || editor);
      tooltip += `Add ${this.newUserEditors.size} new user editor(s):\n${newUserEditorNames.join("\n")}\n\n`;
    }

    if (this.removedUserEditors.size > 0) {
      let removedUserEditorNames = Array.from(this.removedUserEditors).map(editor => this.users.find(user => user.id === editor)?.name || editor);
      tooltip += `Remove ${this.removedUserEditors.size} user editor(s):\n${removedUserEditorNames.join("\n")}\n\n`;
    }

    if (this.newUserViewers.size > 0) {
      let newUserViewerNames = Array.from(this.newUserViewers).map(viewer => this.users.find(user => user.id === viewer)?.name || viewer);
      tooltip += `Add ${this.newUserViewers.size} new user viewer(s):\n${newUserViewerNames.join("\n")}\n\n`;
    }

    if (this.removedUserViewers.size > 0) {
      let removedUserViewerNames = Array.from(this.removedUserViewers).map(viewer => this.users.find(user => user.id === viewer)?.name || viewer);
      tooltip += `Remove ${this.removedUserViewers.size} user viewer(s):\n${removedUserViewerNames.join("\n")}\n\n`;
    }

    if (this.newGroupEditors.size > 0) {
      let newGroupEditorNames = Array.from(this.newGroupEditors).map(editor => this.groups.find(group => group.id === editor)?.name || editor);
      tooltip += `Add ${this.newGroupEditors.size} new group editor(s):\n${newGroupEditorNames.join("\n")}\n\n`;
    }

    if (this.removedGroupEditors.size > 0) {
      let removedGroupEditorNames = Array.from(this.removedGroupEditors).map(editor => this.groups.find(group => group.id === editor)?.name || editor);
      tooltip += `Remove ${this.removedGroupEditors.size} group editor(s):\n${removedGroupEditorNames.join("\n")}\n\n`;
    }

    if (this.newGroupViewers.size > 0) {
      let newGroupViewerNames = Array.from(this.newGroupViewers).map(viewer => this.groups.find(group => group.id === viewer)?.name || viewer);
      tooltip += `Add ${this.newGroupViewers.size} new group viewer(s):\n${newGroupViewerNames.join("\n")}\n\n`;
    }

    if (this.removedGroupViewers.size > 0) {
      let removedGroupViewerNames = Array.from(this.removedGroupViewers).map(viewer => this.groups.find(group => group.id === viewer)?.name || viewer);
      tooltip += `Remove ${this.removedGroupViewers.size} group viewer(s):\n${removedGroupViewerNames.join("\n")}\n\n`;
    }

    this.confirmButtonTooltip = tooltip;
  }

  onConfirm(): void {
    this.dialogRef.close({
      addEditors: UserGroupList.create({
        userIds: Array.from(this.newUserEditors),
        groupIds: Array.from(this.newGroupEditors),
      }),
      deleteEditors: UserGroupList.create({
        userIds: Array.from(this.removedUserEditors),
        groupIds: Array.from(this.removedGroupEditors),
      }),
      addViewers: UserGroupList.create({
        userIds: Array.from(this.newUserViewers),
        groupIds: Array.from(this.newGroupViewers),
      }),
      deleteViewers: UserGroupList.create({
        userIds: Array.from(this.removedUserViewers),
        groupIds: Array.from(this.removedGroupViewers),
      }),
    });
  }
}
