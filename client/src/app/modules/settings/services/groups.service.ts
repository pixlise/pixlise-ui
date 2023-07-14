import { Injectable } from '@angular/core';
import { APIDataService, SnackbarService } from '../../pixlisecore/pixlisecore.module';
import { AuthService } from '@auth0/auth0-angular';
import { UserGroupListReq } from 'src/app/generated-protos/user-group-msgs';
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
    private _authService: AuthService,
  ) {
    this.fetchGroups();
  }

  fetchGroups() {
    this._dataService.sendUserGroupListRequest(UserGroupListReq.create()).subscribe({
      next: (res) => {
        this.groups = res.groups;
        this.groupsChanged$.next();
      },
      error: (err) => {
        this._snackBar.openError(err);
      }
    });
  }
}
