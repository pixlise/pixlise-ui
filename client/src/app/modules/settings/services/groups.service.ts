import { Injectable } from '@angular/core';
import { APIDataService, SnackbarService } from '../../pixlisecore/pixlisecore.module';
import { UserGroupAddAdminReq, UserGroupAddMemberReq, UserGroupAddViewerReq, UserGroupCreateReq, UserGroupCreateResp, UserGroupDeleteAdminReq, UserGroupDeleteMemberReq, UserGroupDeleteReq, UserGroupDeleteViewerReq, UserGroupListReq } from 'src/app/generated-protos/user-group-msgs';
import { UserGroup } from 'src/app/generated-protos/user-group';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  groups: UserGroup[] = [];
  groupsChanged$ = new ReplaySubject<void>(1);

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
          this.groups.push(res.group);
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

  addMemberToGroup(groupId: string, userMemberId: string) {
    this._dataService.sendUserGroupAddMemberRequest(UserGroupAddMemberReq.create({ groupId, userMemberId })).subscribe({
      next: (res) => {
        let groupIndex = this.groups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.groups[groupIndex] = res.group;
          this.groupsChanged$.next();
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
        let groupIndex = this.groups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.groups[groupIndex] = res.group;
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

  removeViewerFromGroup(groupId: string, userViewerId: string) {
    this._dataService.sendUserGroupDeleteViewerRequest(UserGroupDeleteViewerReq.create({ groupId, userViewerId })).subscribe({
      next: (res) => {
        let groupIndex = this.groups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.groups[groupIndex] = res.group;
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

  removeAdminFromGroup(groupId: string, adminUserId: string) {
    this._dataService.sendUserGroupDeleteAdminRequest(UserGroupDeleteAdminReq.create({ groupId, adminUserId })).subscribe({
      next: (res) => {
        let groupIndex = this.groups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.groups[groupIndex] = res.group;
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

  addViewerToGroup(groupId: string, userViewerId: string) {
    this._dataService.sendUserGroupAddViewerRequest(UserGroupAddViewerReq.create({ groupId, userViewerId })).subscribe({
      next: (res) => {
        let groupIndex = this.groups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.groups[groupIndex] = res.group;
          this.groupsChanged$.next();
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
        let groupIndex = this.groups.findIndex((group) => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.groups[groupIndex] = res.group;
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
        this.groups = res.groups;
        this.groupsChanged$.next();
      },
      error: (err) => {
        console.error("Error fetching groups", err);
        this._snackBar.openError(err);
      }
    });
  }
}
