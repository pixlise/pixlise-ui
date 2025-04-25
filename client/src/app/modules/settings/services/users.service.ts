import { Injectable } from "@angular/core";

import { APIDataService } from "../../pixlisecore/pixlisecore.module";
import { BehaviorSubject, catchError, filter, map, Observable, of, ReplaySubject, switchMap } from "rxjs";

import * as _m0 from "protobufjs/minimal";
import { UserAddRoleReq, UserDeleteRoleReq, UserListReq, UserRoleListReq, UserRolesListReq } from "src/app/generated-protos/user-management-msgs";
import { Auth0UserDetails, Auth0UserRole, UserInfo } from "src/app/generated-protos/user";
import { UserSearchReq } from "src/app/generated-protos/user-msgs";

@Injectable({
  providedIn: "root",
})
export class UsersService {
  users: Auth0UserDetails[] = [];
  usersChanged$ = new ReplaySubject<void>(1);

  cachedUsers: Record<string, UserInfo> = {};
  searchedUsers$ = new BehaviorSubject<UserInfo[]>([]);
  searchingAllUsers$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  allUserRoles$ = new BehaviorSubject<Auth0UserRole[]>([]);

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
    } else if (!this.searchingAllUsers$.value) {
      this.searchingAllUsers$.next(true);
      return this._dataService.sendUserSearchRequest(UserSearchReq.create({ searchString: "" })).pipe(
        switchMap(res => {
          res.users.forEach(user => {
            this.cachedUsers[user.id] = user;
          });

          this.searchingAllUsers$.next(false);

          if (this.cachedUsers[userId]) {
            return of(this.cachedUsers[userId]);
          } else {
            return of(UserInfo.create({}));
          }
        }),
        catchError(err => {
          console.error(err);
          this.searchingAllUsers$.next(false);
          return of(UserInfo.create({}));
        })
      );
    } else {
      // Wait for search to complete, then return the user info from cachedUsers
      return this.searchingAllUsers$.pipe(
        filter(searching => !searching),
        switchMap(() => {
          return of(this.cachedUsers[userId]);
        })
      );
    }
  }

  fetchAllUserRoles(): Observable<Auth0UserRole[]> {
    if (this.allUserRoles$.value.length > 0) {
      return of(this.allUserRoles$.value);
    }

    return this._dataService.sendUserRoleListRequest(UserRoleListReq.create({})).pipe(
      map(res => {
        this.allUserRoles$.next(res.roles);
        return res.roles;
      })
    );
  }

  fetchUserRoles(userId: string): Observable<Auth0UserRole[]> {
    return this._dataService.sendUserRolesListRequest(UserRolesListReq.create({ userId })).pipe(map(res => res.roles));
  }

  addRoleToUser(userId: string, roleId: string) {
    return this._dataService.sendUserAddRoleRequest(UserAddRoleReq.create({ userId, roleId }));
  }

  removeRoleFromUser(userId: string, roleId: string) {
    return this._dataService.sendUserDeleteRoleRequest(UserDeleteRoleReq.create({ userId, roleId }));
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
