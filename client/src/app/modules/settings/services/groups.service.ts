import { Injectable } from '@angular/core';
import { APIDataService, SnackbarService } from '../../pixlisecore/pixlisecore.module';
import { UserGroupAddAdminReq, UserGroupAddMemberReq, UserGroupAddViewerReq, UserGroupCreateReq, UserGroupCreateResp, UserGroupDeleteAdminReq, UserGroupDeleteMemberReq, UserGroupDeleteReq, UserGroupDeleteViewerReq, UserGroupListReq } from 'src/app/generated-protos/user-group-msgs';
import { UserGroup, UserGroupInfo, UserGroupJoinRequestDB, UserGroupRelationship } from 'src/app/generated-protos/user-group';
import { ReplaySubject } from 'rxjs';
import { UserGroupReq } from 'src/app/generated-protos/user-group-retrieval-msgs';
import { UserGroupIgnoreJoinReq, UserGroupJoinListReq, UserGroupJoinReq } from 'src/app/generated-protos/user-group-joining-msgs';

@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  detailedGroups: UserGroup[] = [];
  groups: UserGroupInfo[] = [];
  groupsChanged$ = new ReplaySubject<void>(1);

  groupAccessRequests: Record<string, UserGroupJoinRequestDB[]> = {};
  groupAccessRequestsChanged$ = new ReplaySubject<void>(1);

  constructor(
    private _dataService: APIDataService,
    private _snackBar: SnackbarService,
  ) {
    this.fetchGroups();
  }

  createGroup(name: string) {
    this._dataService.sendUserGroupCreateRequest(UserGroupCreateReq.create({ name })).subscribe({
      next: (res: UserGroupCreateResp) => {
        if (res.group) {
          this.detailedGroups.push(res.group);
          this.groupsChanged$.next();
        }
      },
      error: (err) => {
        this._snackBar.openError(err);
      }
    });
  }

  deleteGroup(groupId: string) {
    this._dataService.sendUserGroupDeleteRequest(UserGroupDeleteReq.create({ groupId })).subscribe({
      next: (res) => {
        this.fetchGroups();
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  addMemberToGroup(groupId: string, userMemberId: string, dismissRequestId: string | null = null) {
    this._dataService.sendUserGroupAddMemberRequest(UserGroupAddMemberReq.create({ groupId, userMemberId })).subscribe({
      next: (res) => {
        let groupIndex = this.detailedGroups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this.groupsChanged$.next();
          if (dismissRequestId) {
            this.groupAccessRequests[groupId] = this.groupAccessRequests[groupId].filter((req) => req.id !== dismissRequestId);
            this.groupAccessRequestsChanged$.next();
          }
        }
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  removeMemberFromGroup(groupId: string, userMemberId: string) {
    this._dataService.sendUserGroupDeleteMemberRequest(UserGroupDeleteMemberReq.create({ groupId, userMemberId })).subscribe({
      next: (res) => {
        let groupIndex = this.detailedGroups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this.groupsChanged$.next();
        } else {
          this._snackBar.openError(`Group (${groupId}) not found`);
        }
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  addViewerToGroup(groupId: string, userViewerId: string, dismissRequestId: string | null = null) {
    this._dataService.sendUserGroupAddViewerRequest(UserGroupAddViewerReq.create({ groupId, userViewerId })).subscribe({
      next: (res) => {
        let groupIndex = this.detailedGroups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this.groupsChanged$.next();
          if (dismissRequestId) {
            this.groupAccessRequests[groupId] = this.groupAccessRequests[groupId].filter((req) => req.id !== dismissRequestId);
            this.groupAccessRequestsChanged$.next();
          }
        }
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  removeViewerFromGroup(groupId: string, userViewerId: string) {
    this._dataService.sendUserGroupDeleteViewerRequest(UserGroupDeleteViewerReq.create({ groupId, userViewerId })).subscribe({
      next: (res) => {
        let groupIndex = this.detailedGroups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this.groupsChanged$.next();
        } else {
          this._snackBar.openError(`Group (${groupId}) not found`);
        }
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  addAdminToGroup(groupId: string, adminUserId: string) {
    this._dataService.sendUserGroupAddAdminRequest(UserGroupAddAdminReq.create({ groupId, adminUserId })).subscribe({
      next: (res) => {
        let groupIndex = this.detailedGroups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this.groupsChanged$.next();
        }
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  removeAdminFromGroup(groupId: string, adminUserId: string) {
    this._dataService.sendUserGroupDeleteAdminRequest(UserGroupDeleteAdminReq.create({ groupId, adminUserId })).subscribe({
      next: (res) => {
        let groupIndex = this.detailedGroups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this.groupsChanged$.next();
        } else {
          this._snackBar.openError(`Group (${groupId}) not found`);
        }
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  removeFromGroup(groupId: string, userId: string) {
    let group = this.groups.find((group) => group.id === groupId);
    if (!group) {
      this._snackBar.openError(`Group (${groupId}) not found`);
      return;
    }

    if (group.relationshipToUser === UserGroupRelationship.UGR_ADMIN) {
      this.removeAdminFromGroup(groupId, userId);
    } else if (group.relationshipToUser === UserGroupRelationship.UGR_MEMBER) {
      this.removeMemberFromGroup(groupId, userId);
    } else if (group.relationshipToUser === UserGroupRelationship.UGR_VIEWER) {
      this.removeViewerFromGroup(groupId, userId);
    } else {
      this._snackBar.openError(`User (${userId}) is not a member of this group (${group.name}).`);
    }
  }

  fetchDetailedGroup(groupId: string) {
    this._dataService.sendUserGroupRequest(UserGroupReq.create({ groupId })).subscribe({
      next: (res) => {
        if (!res.group) {
          this._snackBar.openError(`Group (${groupId}) not found`);
          return;
        }

        let groupIndex = this.detailedGroups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0) {
          this.detailedGroups[groupIndex] = res.group;
          this.groupsChanged$.next();
        } else {
          this.detailedGroups.push(res.group);
          this.groupsChanged$.next();
        }
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  fetchGroups() {
    this._dataService.sendUserGroupListRequest(UserGroupListReq.create()).subscribe({
      next: (res) => {
        this.groups = res.groupInfos;
        this.groupsChanged$.next();
      },
      error: (err) => {
        console.error("Error fetching groups", err);
        this._snackBar.openError(err);
      }
    });
  }

  fetchGroupAccessRequests(groupId: string) {
    this._dataService.sendUserGroupJoinListRequest(UserGroupJoinListReq.create({ groupId })).subscribe({
      next: (res) => {
        this.groupAccessRequests[groupId] = res.requests;
        this.groupAccessRequestsChanged$.next();
      },
      error: (err) => {
        console.error("Error fetching group access requests", err);
        this._snackBar.openError(err);
      }
    });
  }

  requestAccessToGroup(group: UserGroupInfo, asMember: boolean) {
    this._dataService.sendUserGroupJoinRequest(UserGroupJoinReq.create({ groupId: group.id, asMember })).subscribe({
      next: (res) => {
        this._snackBar.openSuccess(`Request to join group (${group.name}) sent.`);
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }

  dismissAccessRequest(groupId: string, requestId: string) {
    this._dataService.sendUserGroupIgnoreJoinRequest(UserGroupIgnoreJoinReq.create({ groupId, requestId })).subscribe({
      next: (res) => {
        this.groupAccessRequests[groupId] = this.groupAccessRequests[groupId].filter((request) => request.id !== requestId);
        this.groupAccessRequestsChanged$.next();
      },
      error: (err) => {
        console.error(err);
        this._snackBar.openError(err);
      }
    });
  }
}
