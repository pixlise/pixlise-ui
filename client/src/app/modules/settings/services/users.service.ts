import { Injectable } from "@angular/core";

import { APIDataService } from "../../pixlisecore/pixlisecore.module";
import { BehaviorSubject, Observable, of, ReplaySubject, switchMap } from "rxjs";

import * as _m0 from "protobufjs/minimal";
import { UserListReq } from "src/app/generated-protos/user-management-msgs";
import { Auth0UserDetails, UserInfo } from "src/app/generated-protos/user";
import { UserDetailsReq, UserSearchReq } from "src/app/generated-protos/user-msgs";

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

  fetchUserInfo(userId: string): Observable<UserInfo> {
    if (this.cachedUsers[userId]) {
      return of(this.cachedUsers[userId]);
    } else {
      return this._dataService.sendUserSearchRequest(UserSearchReq.create({ searchString: "" })).pipe(
        switchMap(res => {
          res.users.forEach(user => {
            this.cachedUsers[user.id] = user;
          });

          if (this.cachedUsers[userId]) {
            return of(this.cachedUsers[userId]);
          } else {
            return of(UserInfo.create({}));
          }
        })
      );
    }
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
