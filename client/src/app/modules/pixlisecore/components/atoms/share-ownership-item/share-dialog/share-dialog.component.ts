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
import { MatOptionSelectionChange } from "@angular/material/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatSelectChange } from "@angular/material/select";
import { Subscription } from "rxjs";
import { OwnershipItem, UserGroupList } from "src/app/generated-protos/ownership-access";
import { UserDetails, UserInfo } from "src/app/generated-protos/user";
import { UserGroupInfo } from "src/app/generated-protos/user-group";
import { GroupsService } from "src/app/modules/settings/services/groups.service";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { UsersService } from "src/app/modules/settings/services/users.service";

export type ShareDialogData = {
  ownershipItem: OwnershipItem;
  typeName: string;
};

export type ShareDialogResponse = {
  addEditors: UserGroupList;
  deleteEditors: UserGroupList;
  addViewers: UserGroupList;
  deleteViewers: UserGroupList;
};

type MembershipItem = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isGroup: boolean;
  isEditor: boolean;
};

@Component({
  selector: "share-dialog",
  templateUrl: "./share-dialog.component.html",
  styleUrls: ["./share-dialog.component.scss"],
})
export class ShareDialogComponent implements OnInit {
  private _subs: Subscription = new Subscription();

  private _isSearchingGroups: boolean = true;
  private _searchField: string = "";

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

  filteredGroups: UserGroupInfo[] = [];
  filteredUsers: UserInfo[] = [];

  isChanged: boolean = false;
  members: MembershipItem[] = [];
  memberIds: Set<string> = new Set();

  currentUser: UserDetails = UserDetails.create();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ShareDialogData,
    public dialogRef: MatDialogRef<ShareDialogComponent, ShareDialogResponse>,
    private _groupsService: GroupsService,
    private _usersService: UsersService,
    private _userOptionsSerivce: UserOptionsService
  ) {}

  ngOnInit(): void {
    this._groupsService.fetchGroups();
    this._usersService.searchUsers("");

    this._subs.add(
      this._userOptionsSerivce.userOptionsChanged$.subscribe(() => {
        this.currentUser = this._userOptionsSerivce.userDetails;
      })
    );

    this._subs.add(
      this._groupsService.groupsChanged$.subscribe(() => {
        this.groups = this._groupsService.groups;

        if (!this.isChanged) {
          this.resetMembers();
        }

        this.filterSearch();
      })
    );

    this._subs.add(
      this._usersService.searchedUsers$.subscribe(searchedUsers => {
        this.users = searchedUsers;

        if (!this.isChanged) {
          this.resetMembers();
        }

        this.filterSearch();
      })
    );

    if (!this.isChanged) {
      this.resetMembers();
    }
  }

  get isSearchingGroups(): boolean {
    return this._isSearchingGroups;
  }

  set isSearchingGroups(value: boolean) {
    this._isSearchingGroups = value;
    this.filterSearch();
  }

  get searchField(): string {
    return this._searchField;
  }

  set searchField(value: string) {
    this._searchField = value;
    this.filterSearch();
  }

  filterSearch() {
    if (this.isSearchingGroups) {
      this.filteredGroups = this.groups.filter(group => group.name.toLowerCase().includes(this.searchField.toLowerCase()));
    } else {
      this.filteredUsers = this.users.filter(user => user.name.toLowerCase().includes(this.searchField.toLowerCase()));
    }
  }

  onSelectUser(user: UserInfo, evt: MatOptionSelectionChange) {
    if (evt.isUserInput && !this.memberIds.has(user.id)) {
      this.members = [{ id: user.id, name: user.name, icon: user.iconURL, isGroup: false, isEditor: false }, ...this.members];
      this.memberIds.add(user.id);
      this.isChanged = true;
      this.calculateChanges();
      this.searchField = "";
      setTimeout(() => {
        this.searchField = "";
      }, 0);
    }
    return false;
  }

  onSelectGroup(group: UserGroupInfo, evt: MatOptionSelectionChange) {
    if (evt.isUserInput && !this.memberIds.has(group.id)) {
      this.members = [{ id: group.id, name: group.name, description: group.description, isGroup: true, isEditor: false }, ...this.members];
      this.memberIds.add(group.id);
      this.isChanged = true;
      this.calculateChanges();
      this.searchField = "";
      setTimeout(() => {
        this.searchField = "";
      }, 0);
    }
    return false;
  }

  trackByMemberId(index: number, member: MembershipItem) {
    return member.id;
  }

  resetMembers() {
    this.groupEditors = this.data?.ownershipItem?.editors?.groupIds || [];
    this.userEditors = this.data?.ownershipItem?.editors?.userIds || [];

    this.groupViewers = this.data?.ownershipItem?.viewers?.groupIds || [];
    this.userViewers = this.data?.ownershipItem?.viewers?.userIds || [];

    this.members = [];
    this.groupEditors.forEach(id => {
      let group = this.groups.find(group => group.id === id);

      // TODO: Fix edge case - What if the user isn't a member of the group
      // someone else added this item to, but they are an editor?
      // We wouldn't have a relationship to the group in that case and would just get the id...
      this.members.push({ id, name: group?.name || id, description: group?.description, isGroup: true, isEditor: true });
    });

    this.groupViewers.forEach(id => {
      if (this.members.find(member => member.id === id)) {
        // This shouldn't happen, but just in case we don't want to add a duplicate
        return;
      }

      let group = this.groups.find(group => group.id === id);
      this.members.push({ id, name: group?.name || id, description: group?.description, isGroup: true, isEditor: false });
    });

    this.userEditors.forEach(id => {
      let user = this.users.find(user => user.id === id);
      this.members.push({ id, name: user?.name || id, icon: user?.iconURL, isGroup: false, isEditor: true });
    });

    this.userViewers.forEach(id => {
      if (this.members.find(member => member.id === id)) {
        // This shouldn't happen, but just in case we don't want to add a duplicate
        return;
      }
      let user = this.users.find(user => user.id === id);
      this.members.push({ id, name: user?.name || id, icon: user?.iconURL, isGroup: false, isEditor: false });
    });

    this.memberIds = new Set(this.members.map(member => member.id));
    this.calculateChanges();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get currentUserId(): string {
    return this.currentUser.info?.id || "";
  }

  onAccessChange(id: string, evt: MatSelectChange) {
    let member = this.members.find(member => member.id === id);
    if (member) {
      member.isEditor = evt.value;
      this.isChanged = true;
    }
    this.calculateChanges();
  }

  onRemoveMember(id: string) {
    this.members = this.members.filter(member => member.id !== id);
    this.memberIds.delete(id);
    this.isChanged = true;
    this.calculateChanges();
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

  calculateChanges() {
    this.newUserEditors.clear();
    this.removedUserEditors.clear();
    this.newUserViewers.clear();
    this.removedUserViewers.clear();
    this.newGroupEditors.clear();
    this.removedGroupEditors.clear();
    this.newGroupViewers.clear();
    this.removedGroupViewers.clear();

    // Determine new editors/viewers
    this.members.forEach(member => {
      if (member.isEditor) {
        if (member.isGroup) {
          if (this.groupEditors.includes(member.id)) {
            return;
          }
          this.newGroupEditors.add(member.id);
        } else {
          if (this.userEditors.includes(member.id)) {
            return;
          }
          this.newUserEditors.add(member.id);
        }
      } else {
        if (member.isGroup) {
          if (this.groupViewers.includes(member.id)) {
            return;
          }
          this.newGroupViewers.add(member.id);
        } else {
          if (this.userViewers.includes(member.id)) {
            return;
          }
          this.newUserViewers.add(member.id);
        }
      }
    });

    // Determine removed editors/viewers
    this.groupEditors.forEach(editor => {
      if (!this.memberIds.has(editor)) {
        this.removedGroupEditors.add(editor);
      } else {
        let member = this.members.find(member => member.id === editor);
        if (member && !member.isEditor) {
          this.removedGroupEditors.add(editor);
        }
      }
    });

    this.userEditors.forEach(editor => {
      if (!this.memberIds.has(editor)) {
        this.removedUserEditors.add(editor);
      } else {
        let member = this.members.find(member => member.id === editor);
        if (member && !member.isEditor) {
          this.removedUserEditors.add(editor);
        }
      }
    });

    this.groupViewers.forEach(viewer => {
      if (!this.memberIds.has(viewer)) {
        this.removedGroupViewers.add(viewer);
      } else {
        let member = this.members.find(member => member.id === viewer);
        if (member && member.isEditor) {
          this.removedGroupViewers.add(viewer);
        }
      }
    });

    this.userViewers.forEach(viewer => {
      if (!this.memberIds.has(viewer)) {
        this.removedUserViewers.add(viewer);
      } else {
        let member = this.members.find(member => member.id === viewer);
        if (member && member.isEditor) {
          this.removedUserViewers.add(viewer);
        }
      }
    });

    this.formConfirmButtonTooltip();
  }

  onConfirm(): void {
    this.calculateChanges();

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
