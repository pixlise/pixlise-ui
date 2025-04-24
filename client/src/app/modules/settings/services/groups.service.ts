import { Injectable } from "@angular/core";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import {
  UserGroupAddMemberReq,
  UserGroupAddViewerReq,
  UserGroupDeleteMemberReq,
  UserGroupDeleteViewerReq,
} from "src/app/generated-protos/user-group-membership-msgs";
import { UserGroupCreateReq, UserGroupCreateResp, UserGroupDeleteReq, UserGroupEditDetailsReq } from "src/app/generated-protos/user-group-management-msgs";
import { UserGroupAddAdminReq, UserGroupDeleteAdminReq } from "src/app/generated-protos/user-group-admins-msgs";
import { UserGroupListJoinableReq, UserGroupListReq } from "src/app/generated-protos/user-group-retrieval-msgs";
import { UserGroup, UserGroupInfo, UserGroupJoinRequestDB, UserGroupJoinSummaryInfo, UserGroupRelationship } from "src/app/generated-protos/user-group";
import { map, Observable, of, ReplaySubject, BehaviorSubject, filter, switchMap } from "rxjs";
import { UserGroupReq } from "src/app/generated-protos/user-group-retrieval-msgs";
import { UserGroupIgnoreJoinReq, UserGroupJoinListReq, UserGroupJoinReq } from "src/app/generated-protos/user-group-joining-msgs";
import { UserOptionsService } from "./user-options.service";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";

@Injectable({
  providedIn: "root",
})
export class GroupsService {
  detailedGroups: UserGroup[] = [];
  groups: UserGroupInfo[] = [];
  fetchingAllGroups$ = new BehaviorSubject<boolean>(false);

  groupsChanged$ = new ReplaySubject<void>(1);

  joinableGroups: UserGroupJoinSummaryInfo[] = [];
  joinableGroupsChanged$ = new ReplaySubject<void>(1);

  groupAccessRequests: Record<string, UserGroupJoinRequestDB[]> = {};
  groupAccessRequestsChanged$ = new ReplaySubject<void>(1);

  constructor(
    private _apiCacheService: APICachedDataService,
    private _dataService: APIDataService,
    private _snackBar: SnackbarService,
    private _userOptionsService: UserOptionsService
  ) {
    if (this.groups.length === 0) {
      this.fetchGroups();
    }
  }

  createGroup(name: string, description: string, joinable: boolean) {
    this._dataService.sendUserGroupCreateRequest(UserGroupCreateReq.create({ name, description, joinable })).subscribe({
      next: (res: UserGroupCreateResp) => {
        if (res.group) {
          this.detailedGroups.push(res.group);
          this.groups.push({
            id: res.group.info?.id || "",
            name: res.group.info?.name || "",
            description: res.group.info?.description || "",
            createdUnixSec: res.group.info?.createdUnixSec || 0,
            relationshipToUser: UserGroupRelationship.UGR_ADMIN,
            lastUserJoinedUnixSec: res.group.info?.lastUserJoinedUnixSec || 0,
            joinable: res.group.info?.joinable || false,
          });
          this.groupsChanged$.next();
        }
      },
      error: err => {
        this._snackBar.openError(err);
      },
    });
  }

  editGroupMetadata(groupId: string, name: string, description: string, joinable: boolean) {
    this._dataService.sendUserGroupEditDetailsRequest(UserGroupEditDetailsReq.create({ groupId, name, description, joinable })).subscribe({
      next: res => {
        if (!res.group) {
          this._snackBar.openError(`Group (${name || groupId}) not found`);
          return;
        }

        const detailedGroupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (detailedGroupIndex >= 0) {
          this.detailedGroups[detailedGroupIndex] = res.group;
        }

        const groupIndex = this.groups.findIndex(group => group.id === groupId);
        if (groupIndex >= 0) {
          this.groups[groupIndex] = {
            ...this.groups[groupIndex],
            name,
            description,
            joinable,
          };
        }

        this.groupsChanged$.next();
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  deleteGroup(groupId: string) {
    this._dataService.sendUserGroupDeleteRequest(UserGroupDeleteReq.create({ groupId })).subscribe({
      next: res => {
        const groupName = this.groups.find(group => group.id === groupId)?.name || groupId;
        this.groups = this.groups.filter(group => group.id !== groupId);
        this.detailedGroups = this.detailedGroups.filter(group => group.info?.id !== groupId);
        this.groupsChanged$.next();

        this.joinableGroups = this.joinableGroups.filter(group => group.id !== groupId);
        this.joinableGroupsChanged$.next();

        this._snackBar.openSuccess(`Group "${groupName}" deleted`);
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  addSubGroupMemberToGroup(groupId: string, groupMemberId: string) {
    this._dataService.sendUserGroupAddMemberRequest(UserGroupAddMemberReq.create({ groupId, groupMemberId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`Group added as editor to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  addMemberToGroup(groupId: string, userMemberId: string, dismissRequestId: string | null = null) {
    this._dataService.sendUserGroupAddMemberRequest(UserGroupAddMemberReq.create({ groupId, userMemberId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`User added as editor to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
          if (dismissRequestId) {
            this.groupAccessRequests[groupId] = this.groupAccessRequests[groupId].filter(req => req.id !== dismissRequestId);
            this.groupAccessRequestsChanged$.next();
          }
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  removeMemberFromGroup(groupId: string, userMemberId: string) {
    this._dataService.sendUserGroupDeleteMemberRequest(UserGroupDeleteMemberReq.create({ groupId, userMemberId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`User removed as editor to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
        } else {
          this._snackBar.openError(`Group (${groupId}) not found`);
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  removeSubGroupMemberFromGroup(groupId: string, groupMemberId: string) {
    this._dataService.sendUserGroupDeleteMemberRequest(UserGroupDeleteMemberReq.create({ groupId, groupMemberId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`Group removed as editor to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
        } else {
          this._snackBar.openError(`Group (${groupId}) not found`);
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  addViewerToGroup(groupId: string, userViewerId: string, dismissRequestId: string | null = null) {
    this._dataService.sendUserGroupAddViewerRequest(UserGroupAddViewerReq.create({ groupId, userViewerId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`User added as viewer to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
          if (dismissRequestId) {
            this.groupAccessRequests[groupId] = this.groupAccessRequests[groupId].filter(req => req.id !== dismissRequestId);
            this.groupAccessRequestsChanged$.next();
          }
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  addSubGroupViewerToGroup(groupId: string, groupViewerId: string) {
    this._dataService.sendUserGroupAddViewerRequest(UserGroupAddViewerReq.create({ groupId, groupViewerId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`Group added as viewer to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  removeViewerFromGroup(groupId: string, userViewerId: string) {
    this._dataService.sendUserGroupDeleteViewerRequest(UserGroupDeleteViewerReq.create({ groupId, userViewerId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`User removed as viewer to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
        } else {
          this._snackBar.openError(`Group (${groupId}) not found`);
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  removeSubGroupViewerFromGroup(groupId: string, groupViewerId: string) {
    this._dataService.sendUserGroupDeleteViewerRequest(UserGroupDeleteViewerReq.create({ groupId, groupViewerId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`Group removed as viewer to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
        } else {
          this._snackBar.openError(`Group (${groupId}) not found`);
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  addAdminToGroup(groupId: string, adminUserId: string) {
    this._dataService.sendUserGroupAddAdminRequest(UserGroupAddAdminReq.create({ groupId, adminUserId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`User added as admin to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  removeAdminFromGroup(groupId: string, adminUserId: string) {
    this._dataService.sendUserGroupDeleteAdminRequest(UserGroupDeleteAdminReq.create({ groupId, adminUserId })).subscribe({
      next: res => {
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0 && res.group) {
          this.detailedGroups[groupIndex] = res.group;
          this._snackBar.openSuccess(`User removed as admin to group ${res.group.info?.name}`);
          this.groupsChanged$.next();
        } else {
          this._snackBar.openError(`Group (${groupId}) not found`);
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  removeFromGroup(groupId: string, userId: string) {
    const group = this.groups.find(group => group.id === groupId);
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
      next: res => {
        if (!res.group) {
          this._snackBar.openError(`Group (${groupId}) not found`);
          return;
        }
        const groupIndex = this.detailedGroups.findIndex(group => group.info?.id === groupId);
        if (groupIndex >= 0) {
          this.detailedGroups[groupIndex] = res.group;
          this.groupsChanged$.next();
        } else {
          this.detailedGroups.push(res.group);
          this.groupsChanged$.next();
        }
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  fetchGroups() {
    // If we are already fetching groups, don't fetch them again
    if (this.fetchingAllGroups$.value) {
      return;
    }

    this.fetchingAllGroups$.next(true);
    this._apiCacheService.getUserGroupList(UserGroupListReq.create()).subscribe({
      next: res => {
        this.groups = res.groupInfos;
        this.fetchingAllGroups$.next(false);

        // Fetch group access requests for each group
        res.groupInfos.forEach(group => {
          if (this._userOptionsService.hasFeatureAccess("admin") || group.relationshipToUser === UserGroupRelationship.UGR_ADMIN) {
            this.fetchGroupAccessRequests(group.id);
          }
        });

        this.groupsChanged$.next();
      },
      error: err => {
        console.error("Error fetching groups", err);
        this._snackBar.openError(err);

        this.groups = [];
        this.fetchingAllGroups$.next(false);
      },
    });
  }

  fetchGroupsAsync(): Observable<UserGroupInfo[]> {
    if (!this.fetchingAllGroups$.value) {
      return this._dataService.sendUserGroupListRequest(UserGroupListReq.create()).pipe(map(res => res.groupInfos));
    } else {
      // Wait for the groups to be fetched
      return this.fetchingAllGroups$.pipe(
        filter(fetching => !fetching),
        switchMap(() => this._dataService.sendUserGroupListRequest(UserGroupListReq.create()).pipe(map(res => res.groupInfos)))
      );
    }
  }

  fetchUserGroupInfoAsync(groupId: string): Observable<UserGroupInfo> {
    return this.fetchGroupsAsync().pipe(
      map(groups => groups.find(group => group.id === groupId)),
      filter((group): group is UserGroupInfo => group !== undefined)
    );
  }

  fetchGroupAccessRequests(groupId: string) {
    this._dataService.sendUserGroupJoinListRequest(UserGroupJoinListReq.create({ groupId })).subscribe({
      next: res => {
        this.groupAccessRequests[groupId] = res.requests;
        this.groupAccessRequestsChanged$.next();
      },
      error: err => {
        console.error("Error fetching group access requests", err);
        this._snackBar.openError(err);
      },
    });
  }

  requestAccessToGroup(group: UserGroupInfo | UserGroupJoinSummaryInfo, asMember: boolean) {
    this._dataService.sendUserGroupJoinRequest(UserGroupJoinReq.create({ groupId: group.id, asMember })).subscribe({
      next: res => {
        this._snackBar.openSuccess(`Request to join group (${group.name}) sent.`);

        // If user is not an admin, no need to fetch this, they don't have access anyway and we printed an uneccessary error
        if (this._userOptionsService.hasFeatureAccess("admin")) {
          this.fetchGroupAccessRequests(group.id);
        }
        this.groupAccessRequestsChanged$.next();
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  dismissAccessRequest(groupId: string, requestId: string) {
    this._dataService.sendUserGroupIgnoreJoinRequest(UserGroupIgnoreJoinReq.create({ groupId, requestId })).subscribe({
      next: res => {
        this.groupAccessRequests[groupId] = this.groupAccessRequests[groupId].filter(request => request.id !== requestId);
        this.fetchGroupAccessRequests(groupId);
        this.groupAccessRequestsChanged$.next();
      },
      error: err => {
        console.error(err);
        this._snackBar.openError(err);
      },
    });
  }

  fetchJoinableGroups() {
    this._dataService.sendUserGroupListJoinableRequest(UserGroupListJoinableReq.create()).subscribe({
      next: res => {
        this.joinableGroups = res.groups;
        this.joinableGroupsChanged$.next();
      },
      error: err => {
        console.error("Error fetching joinable groups", err);
        this._snackBar.openError(err);
      },
    });
  }
}
