import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { SourceRepository } from 'src/app/generated-protos/repository';
import { SourceRepositoryDeleteReq, SourceRepositoryListReq, SourceRepositorySetReq } from 'src/app/generated-protos/repository-msgs';
import { PushButtonComponent } from 'src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component';
import { APIDataService, SnackbarService } from 'src/app/modules/pixlisecore/pixlisecore.module';

export class ManageRepositoriesData {
  
}

export class ManageRepositoriesResult {
  
}

@Component({
  selector: 'manage-repositories',
  standalone: false,
  templateUrl: './manage-repositories.component.html',
  styleUrl: './manage-repositories.component.scss'
})
export class ManageRepositoriesComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();
  @ViewChild("addRepositoryBtn") addRepositoryBtn!: ElementRef;

  repositories: SourceRepository[] = [];

  // For adding
  addName = "";
  addURL = "";
  addUser = "";
  addSecret = "";

  constructor(
    public dialogRef: MatDialogRef<ManageRepositoriesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ManageRepositoriesData,
    private _dataService: APIDataService,
    private _snackbarService: SnackbarService,
  ) {}
  
  ngOnInit() {
    this.refreshRepositories();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private refreshRepositories() {
    this._subs.add(
      this._dataService.sendSourceRepositoryListRequest(SourceRepositoryListReq.create({})).subscribe({
        next: resp => {
          if (resp.repositories) {
            this.repositories = resp.repositories;
          } else {
            this._snackbarService.openError("Unexpected response when querying repository list");
          }
        },
        error: err => {
            this._snackbarService.openError("Failed to query repository list", err);
        }
      })
    );
  }

  onCancelAdd() {
    //this.dialogRef.close();
    this.closeAddRepoDialog();
  }

  get isAddValid(): boolean {
    return this.addName.length > 0 && this.addURL.length > 0 && this.addUser.length > 0 && this.addSecret.length > 0;
  }

  onAddRepo() {
    this._subs.add(
      this._dataService.sendSourceRepositorySetRequest(SourceRepositorySetReq.create(
        {repository: SourceRepository.create({
          // Not setting id, it's a new one!
          name: this.addName,
          url: this.addURL,
          user: this.addUser,
          secret: this.addSecret,
        })
      })).subscribe({
        next: resp => {
          if (resp.repository && resp.repository.id.length > 0) {
            this._snackbarService.openSuccess("Added new repository", resp.repository?.id);
            this.closeAddRepoDialog();
          } else {
            this._snackbarService.openError("Unexpected empty response when adding new repository");
          }
        },
        error: err => {
          this._snackbarService.openError("Failed to add new repository", err);
        },
        complete: () => {
          this.refreshRepositories();
        }
      })
    );
  }

  private closeAddRepoDialog(): void {
    if (this.addRepositoryBtn && this.addRepositoryBtn instanceof PushButtonComponent) {
      (this.addRepositoryBtn as PushButtonComponent).closeDialog();
    }
  }

  onDeleteRepo(id: string) {
    this._subs.add(
      this._dataService.sendSourceRepositoryDeleteRequest(
        SourceRepositoryDeleteReq.create({id})
      ).subscribe({
        next: resp => {
            this._snackbarService.openSuccess("Deleted repository");
        },
        error: err => {
          this._snackbarService.openError("Failed to delete repository", err);
        },
        complete: () => {
          this.refreshRepositories();
        }
      })
    );
  }
}
