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

import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import { MatOptionSelectionChange } from "@angular/material/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { MatSelectChange } from "@angular/material/select";

import { combineLatest, Observable, of, Subscription } from "rxjs";

import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { GroupsService } from "src/app/modules/settings/services/groups.service";
import { APIDataService } from "src/app/modules/pixlisecore/services/apidata.service";
import { SnackbarService } from "src/app/modules/pixlisecore/services/snackbar.service";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { UsersService } from "src/app/modules/pixlisecore/pixlisecore.module";

import { ObjectEditAccessReq, ObjectEditAccessResp } from "src/app/generated-protos/ownership-access-msgs";
import { ReviewerMagicLinkCreateReq } from "src/app/generated-protos/user-management-msgs";
import { ObjectType, OwnershipItem, OwnershipSummary, UserGroupList } from "src/app/generated-protos/ownership-access";
import { UserDetails, UserInfo } from "src/app/generated-protos/user";
import { UserGroupInfo } from "src/app/generated-protos/user-group";

export type SharingSubItem = {
  id: string;
  type: ObjectType;
  typeName: string;
  name: string;
  ownershipSummary: OwnershipSummary;
  ownershipItem?: OwnershipItem;
};

export type ShareDialogData = {
  title?: string;
  description?: string;
  ownershipSummary: OwnershipSummary | null;
  ownershipItem: OwnershipItem;
  typeName: string;
  subItems?: SharingSubItem[];
  preventSelfAssignment?: boolean;
  restrictSubItemSharingToViewer?: boolean;
  excludeSubIds?: string[];
  isReviewerSnapshot?: boolean;
};

export type ShareDialogResponse = {
  addEditors: UserGroupList;
  deleteEditors: UserGroupList;
  addViewers: UserGroupList;
  deleteViewers: UserGroupList;
  reviewerId?: string;
  reviewerAccessTime?: number;
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
  standalone: false,
  selector: "share-dialog",
  templateUrl: "./share-dialog.component.html",
  styleUrls: ["./share-dialog.component.scss"],
})
export class ShareDialogComponent implements OnInit, OnDestroy {
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

  shareWithSubItems: boolean = true;
  preventSelfAssignment: boolean = false;

  subItems: SharingSubItem[] = [];
  subItemViewershipChangeMap: Map<string, Set<string>> = new Map();
  memberSharingErrorChangeMap: Map<string, Set<string>> = new Map();
  subItemSharingErrorMap: Map<string, boolean> = new Map();
  validShareCount: number = 0;

  selectedSubItemId: string = "";

  reviewTimeOptions: { value: number; label: string }[] = [
    { value: 0, label: "Forever" },
    { value: 1 * 60 * 60 * 24, label: "1 Day" },
    { value: 7 * 60 * 60 * 24, label: "7 Days" },
    { value: 30 * 60 * 60 * 24, label: "30 Days" },
    { value: 90 * 60 * 60 * 24, label: "90 Days" },
    { value: 365 * 60 * 60 * 24, label: "1 Year" },
  ];
  reviewerAccessTime: { value: number; label: string } = this.reviewTimeOptions[0];
  reviewerSnapshotLink: string = "";
  copiedReviewerSnapshotLink: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ShareDialogData,
    public dialogRef: MatDialogRef<ShareDialogComponent, ShareDialogResponse>,
    private _groupsService: GroupsService,
    private _usersService: UsersService,
    private _userOptionsSerivce: UserOptionsService,
    private _apiDataService: APIDataService,
    private _snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this._groupsService.fetchGroups();
    this._usersService.searchUsers("");

    this.preventSelfAssignment = this.data?.preventSelfAssignment || false;

    if (this.data?.subItems && this.data.subItems.length > 0) {
      this.subItems = this.data.subItems;
    }

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

        if (this.subItems.length > 0) {
          this.subItems.forEach(subItem => {
            if (subItem.ownershipSummary.creatorUser) {
              let user = this._usersService.cachedUsers[subItem.ownershipSummary.creatorUser.id];
              if (user) {
                subItem.ownershipSummary.creatorUser = user;
              }
            }
          });
        }

        if (!this.isChanged) {
          this.resetMembers();
        }

        this.filterSearch();
      })
    );

    if (!this.isChanged) {
      this.resetMembers();
    }

    this.calculateSubItemViewershipChanges();

    // Set reviewerSnapshotLink to current URL
    if (this.data.isReviewerSnapshot) {
      this.reviewerSnapshotLink = window.location.href;
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  calculateSubItemViewershipChanges() {
    this.subItemViewershipChangeMap.clear();
    this.subItemSharingErrorMap.clear();
    this.memberSharingErrorChangeMap.clear();
    this.validShareCount = 0;

    this.subItems.forEach(subItem => {
      const idsToAddAsViewers = new Set<string>();
      this.newUserViewers.forEach(id => idsToAddAsViewers.add(id));
      this.newGroupViewers.forEach(id => idsToAddAsViewers.add(id));
      this.newUserEditors.forEach(id => idsToAddAsViewers.add(id));
      this.newGroupEditors.forEach(id => idsToAddAsViewers.add(id));

      // Also include all existing editors and viewers, so we can see past errors
      this.groupViewers.forEach(id => idsToAddAsViewers.add(id));
      this.groupEditors.forEach(id => idsToAddAsViewers.add(id));
      this.userViewers.forEach(id => idsToAddAsViewers.add(id));
      this.userEditors.forEach(id => idsToAddAsViewers.add(id));

      // Remove editors/viewers that were removed
      this.removedUserEditors.forEach(id => idsToAddAsViewers.delete(id));
      this.removedGroupEditors.forEach(id => idsToAddAsViewers.delete(id));
      this.removedUserViewers.forEach(id => idsToAddAsViewers.delete(id));
      this.removedGroupViewers.forEach(id => idsToAddAsViewers.delete(id));

      // Exclude current user
      idsToAddAsViewers.delete(this.currentUser.info?.id || "");

      if (subItem?.ownershipItem) {
        const ownershipItem = subItem.ownershipItem;

        if (ownershipItem.editors) {
          ownershipItem.editors.userIds.forEach(id => {
            if (idsToAddAsViewers.has(id)) {
              idsToAddAsViewers.delete(id);
            }
          });

          ownershipItem.editors.groupIds.forEach(id => {
            if (idsToAddAsViewers.has(id)) {
              idsToAddAsViewers.delete(id);
            }
          });
        }

        if (ownershipItem.viewers) {
          ownershipItem.viewers.userIds.forEach(id => {
            if (idsToAddAsViewers.has(id)) {
              idsToAddAsViewers.delete(id);
            }
          });

          ownershipItem.viewers.groupIds.forEach(id => {
            if (idsToAddAsViewers.has(id)) {
              idsToAddAsViewers.delete(id);
            }
          });
        }
      }

      this.subItemViewershipChangeMap.set(subItem.id, idsToAddAsViewers);
      if (!subItem.ownershipSummary.canEdit && idsToAddAsViewers.size > 0) {
        this.subItemSharingErrorMap.set(subItem.id, true);
        idsToAddAsViewers.forEach(id => {
          if (!this.memberSharingErrorChangeMap.has(id)) {
            this.memberSharingErrorChangeMap.set(id, new Set<string>());
          }

          this.memberSharingErrorChangeMap.get(id)?.add(subItem.id);
        });
      } else if (subItem.ownershipSummary.canEdit && idsToAddAsViewers.size > 0) {
        this.validShareCount++;
      }
    });
  }

  get dialogTitle(): string {
    const title = this.data.title ? this.data.title : `Share ${this.data.typeName}`;
    return `${title}${!this.canEdit ? " (Viewer)" : ""}`;
  }

  get canEdit(): boolean {
    return this.data?.ownershipSummary?.canEdit || false;
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
      // If user doesn't have edit access, only allow adding as viewer
      const isEditor = this.canEdit;
      this.members = [{ id: user.id, name: user.name, icon: user.iconURL, isGroup: false, isEditor }, ...this.members];
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
      // If user doesn't have edit access, only allow adding as viewer
      const isEditor = this.canEdit;
      this.members = [{ id: group.id, name: group.name, description: group.description, isGroup: true, isEditor }, ...this.members];
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
      const group = this.groups.find(group => group.id === id);

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

      const group = this.groups.find(group => group.id === id);
      this.members.push({ id, name: group?.name || id, description: group?.description, isGroup: true, isEditor: false });
    });

    this.userEditors.forEach(id => {
      const user = this.users.find(user => user.id === id);
      this.members.push({ id, name: user?.name || id, icon: user?.iconURL, isGroup: false, isEditor: true });
    });

    this.userViewers.forEach(id => {
      if (this.members.find(member => member.id === id)) {
        // This shouldn't happen, but just in case we don't want to add a duplicate
        return;
      }
      const user = this.users.find(user => user.id === id);
      this.members.push({ id, name: user?.name || id, icon: user?.iconURL, isGroup: false, isEditor: false });
    });

    this.memberIds = new Set(this.members.map(member => member.id));
    this.calculateChanges();
  }

  get currentUserId(): string {
    return this.currentUser.info?.id || "";
  }

  onAccessChange(id: string, evt: MatSelectChange) {
    const member = this.members.find(member => member.id === id);
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
      const newUserEditorNames = Array.from(this.newUserEditors).map(editor => this.users.find(user => user.id === editor)?.name || editor);
      tooltip += `Add ${this.newUserEditors.size} new user editor(s):\n${newUserEditorNames.join("\n")}\n\n`;
    }

    if (this.removedUserEditors.size > 0) {
      const removedUserEditorNames = Array.from(this.removedUserEditors).map(editor => this.users.find(user => user.id === editor)?.name || editor);
      tooltip += `Remove ${this.removedUserEditors.size} user editor(s):\n${removedUserEditorNames.join("\n")}\n\n`;
    }

    if (this.newUserViewers.size > 0) {
      const newUserViewerNames = Array.from(this.newUserViewers).map(viewer => this.users.find(user => user.id === viewer)?.name || viewer);
      tooltip += `Add ${this.newUserViewers.size} new user viewer(s):\n${newUserViewerNames.join("\n")}\n\n`;
    }

    if (this.removedUserViewers.size > 0) {
      const removedUserViewerNames = Array.from(this.removedUserViewers).map(viewer => this.users.find(user => user.id === viewer)?.name || viewer);
      tooltip += `Remove ${this.removedUserViewers.size} user viewer(s):\n${removedUserViewerNames.join("\n")}\n\n`;
    }

    if (this.newGroupEditors.size > 0) {
      const newGroupEditorNames = Array.from(this.newGroupEditors).map(editor => this.groups.find(group => group.id === editor)?.name || editor);
      tooltip += `Add ${this.newGroupEditors.size} new group editor(s):\n${newGroupEditorNames.join("\n")}\n\n`;
    }

    if (this.removedGroupEditors.size > 0) {
      const removedGroupEditorNames = Array.from(this.removedGroupEditors).map(editor => this.groups.find(group => group.id === editor)?.name || editor);
      tooltip += `Remove ${this.removedGroupEditors.size} group editor(s):\n${removedGroupEditorNames.join("\n")}\n\n`;
    }

    if (this.newGroupViewers.size > 0) {
      const newGroupViewerNames = Array.from(this.newGroupViewers).map(viewer => this.groups.find(group => group.id === viewer)?.name || viewer);
      tooltip += `Add ${this.newGroupViewers.size} new group viewer(s):\n${newGroupViewerNames.join("\n")}\n\n`;
    }

    if (this.removedGroupViewers.size > 0) {
      const removedGroupViewerNames = Array.from(this.removedGroupViewers).map(viewer => this.groups.find(group => group.id === viewer)?.name || viewer);
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
      // Skip existing members if user doesn't have edit access
      if (!this.canEdit && this.memberIds.has(member.id)) {
        return;
      }

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

    // Only calculate removals if user has edit access
    if (this.canEdit) {
      // Determine removed editors/viewers
      this.groupEditors.forEach(editor => {
        if (!this.memberIds.has(editor)) {
          this.removedGroupEditors.add(editor);
        } else {
          const member = this.members.find(member => member.id === editor);
          if (member && !member.isEditor) {
            this.removedGroupEditors.add(editor);
          }
        }
      });

      this.userEditors.forEach(editor => {
        if (!this.memberIds.has(editor)) {
          this.removedUserEditors.add(editor);
        } else {
          const member = this.members.find(member => member.id === editor);
          if (member && !member.isEditor) {
            this.removedUserEditors.add(editor);
          }
        }
      });

      this.groupViewers.forEach(viewer => {
        if (!this.memberIds.has(viewer)) {
          this.removedGroupViewers.add(viewer);
        } else {
          const member = this.members.find(member => member.id === viewer);
          if (member && member.isEditor) {
            this.removedGroupViewers.add(viewer);
          }
        }
      });

      this.userViewers.forEach(viewer => {
        if (!this.memberIds.has(viewer)) {
          this.removedUserViewers.add(viewer);
        } else {
          const member = this.members.find(member => member.id === viewer);
          if (member && member.isEditor) {
            this.removedUserViewers.add(viewer);
          }
        }
      });
    }

    this.formConfirmButtonTooltip();
    this.calculateSubItemViewershipChanges();
  }

  updateSubExpressions(): Observable<ObjectEditAccessResp[]> {
    if (this.subItems.length === 0 || !this.shareWithSubItems) {
      return of([]);
    }

    const editAccessUpdateRequests: Observable<ObjectEditAccessResp>[] = [];
    this.subItems.forEach(subItem => {
      let userEditorIds: string[] = [];
      let groupEditorIds: string[] = [];
      let userViewerIds: string[] = [];
      let groupViewerIds: string[] = [];

      // If user does not have edit access, only allow adding as viewer
      if (!subItem.ownershipSummary.canEdit) {
        // Merge unique editors and viewers into viewers
        userViewerIds = Array.from(new Set([...this.newUserEditors, ...this.newUserViewers]));
        groupViewerIds = Array.from(new Set([...this.newGroupEditors, ...this.newGroupViewers]));
      } else {
        // Allow editors to be added
        userEditorIds = Array.from(this.newUserEditors);
        groupEditorIds = Array.from(this.newGroupEditors);
        userViewerIds = Array.from(this.newUserViewers);
        groupViewerIds = Array.from(this.newGroupViewers);
      }

      // Skip excluded sub-items (used for excluding sub-items that are already being shared, but we still want to show)
      if (this.data.excludeSubIds && this.data.excludeSubIds.includes(subItem.id)) {
        return;
      }

      editAccessUpdateRequests.push(
        this._apiDataService.sendObjectEditAccessRequest(
          ObjectEditAccessReq.create({
            objectId: subItem.id,
            objectType: subItem.type,
            addEditors: UserGroupList.create({
              userIds: userEditorIds,
              groupIds: groupEditorIds,
            }),
            addViewers: UserGroupList.create({
              userIds: userViewerIds,
              groupIds: groupViewerIds,
            }),
          })
        )
      );
    });

    if (editAccessUpdateRequests.length === 0) {
      return of([]);
    }

    return combineLatest(editAccessUpdateRequests);
  }

  closeWithResult() {
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
      reviewerId: this.reviewerSnapshotLink || "",
      reviewerAccessTime: this.reviewerAccessTime.value,
    });
  }

  onReviewerAccessTimeChange(evt: MatSelectChange) {
    this.reviewerAccessTime = evt.value;
  }

  copyReviewLinkToClipboard() {
    navigator.clipboard.writeText(this.reviewerSnapshotLink).then(() => {
      this._snackbarService.openSuccess("Link copied to clipboard");
      this.copiedReviewerSnapshotLink = true;
      setTimeout(() => {
        this.copiedReviewerSnapshotLink = false;
      }, 1000);
    });
  }

  onConfirm(): void {
    this.calculateChanges();

    const appConfig = EnvConfigurationInitService.getConfig$.value;

    if (this.data.isReviewerSnapshot) {
      this._apiDataService
        .sendReviewerMagicLinkCreateRequest(
          ReviewerMagicLinkCreateReq.create({
            accessLength: this.reviewerAccessTime.value,
            workspaceId: this.data.ownershipItem.id,
            clientId: appConfig!.auth0_client,
            audience: appConfig!.auth0_audience,
          })
        )
        .subscribe({
          next: res => {
            this.reviewerSnapshotLink = res.magicLink;

            // res.magicLink is new user id for the reviewer, add it to the list of viewers
            this.newUserViewers.add(res.magicLink);

            this.updateSubExpressions().subscribe({
              next: res => {
                if (this.shareWithSubItems && this.subItems.length !== res?.length) {
                  console.warn(`Could not update all sub-expressions. ${res?.length} out of ${this.subItems.length} were updated.`);
                }

                this.closeWithResult();
              },
              error: err => {
                console.error(err);
                this._snackbarService.openError("Could not update sub-expressions", err);
              },
            });
          },
          error: err => {
            this._snackbarService.openError("Failed to create reviewer snapshot link", err);
          },
        });
    } else {
      this.updateSubExpressions().subscribe({
        next: res => {
          if (this.shareWithSubItems && this.subItems.length !== res?.length) {
            console.warn(`Could not update all sub-expressions. ${res?.length} out of ${this.subItems.length} were updated.`);
          }

          this.closeWithResult();
        },
        error: err => {
          console.error(err);
          this._snackbarService.openError("Could not update sub-expressions", err);
        },
      });
    }
  }
}
