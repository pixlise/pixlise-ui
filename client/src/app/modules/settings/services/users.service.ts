import { Injectable } from "@angular/core";

import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { ReplaySubject } from "rxjs";

import * as _m0 from "protobufjs/minimal";
import { UserListReq } from "src/app/generated-protos/user-management-msgs";
import { Auth0UserDetails } from "src/app/generated-protos/user";

@Injectable({
  providedIn: "root",
})
export class UsersService {
  users: Auth0UserDetails[] = [];
  usersChanged$ = new ReplaySubject<void>(1);

  constructor(private _dataService: APIDataService) {
    this.searchUsers();
  }

  searchUsers() {
    this._dataService.sendUserListRequest(UserListReq.create({})).subscribe({
      next: res => {
        console.log(res);
        this.users = res.details;
        this.usersChanged$.next();
      },
      error: err => {
        console.error(err);
      },
    });
  }
}
