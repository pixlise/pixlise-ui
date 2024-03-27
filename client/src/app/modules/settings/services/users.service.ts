import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { BehaviorSubject, ReplaySubject, Subject } from "rxjs";

import * as _m0 from "protobufjs/minimal";
import { UserListReq } from "src/app/generated-protos/user-management-msgs";
import { Auth0UserDetails, UserInfo } from "src/app/generated-protos/user";
import { UserSearchReq } from "src/app/generated-protos/user-msgs";

@Injectable({
  providedIn: "root",
})
export class UsersService {
  users: Auth0UserDetails[] = [];
  usersChanged$ = new ReplaySubject<void>(1);

  cachedUsers: Record<string, UserInfo> = {};
  searchedUsers$ = new BehaviorSubject<UserInfo[]>([]);

  constructor(private _dataService: APIDataService) {}

  listAllUsers() {
    this._dataService.sendUserListRequest(UserListReq.create({})).subscribe({
      next: res => {
        this.users = res.details;
        this.usersChanged$.next();
      },
      error: err => {
        console.error(err);
      },
    });
  }

  searchUsers(searchString: string) {
    this._dataService.sendUserSearchRequest(UserSearchReq.create({ searchString })).subscribe({
      next: res => {
        res.users.forEach(user => {
          this.cachedUsers[user.id] = user;
        });

        this.searchedUsers$.next(res.users);
      },
      error: err => {
        console.error(err);
      },
    });
  }
}
