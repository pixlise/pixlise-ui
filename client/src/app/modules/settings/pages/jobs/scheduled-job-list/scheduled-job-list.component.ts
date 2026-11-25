import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { ScheduledJob, ScheduledJob_ScheduleType } from 'src/app/generated-protos/job';
import { ScheduledJobListReq, DeleteScheduledJobReq } from 'src/app/generated-protos/job-msgs';

import { APIDataService, SnackbarService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { ManageRepositoriesData, ManageRepositoriesComponent, ManageRepositoriesResult } from '../manage-repositories/manage-repositories.component';

import { SetScheduledJobData, SetScheduledJobComponent, SetScheduledJobResult } from '../set-scheduled-job/set-scheduled-job.component';
import { getPrintableJobScheduleType } from '../../../models/jobs.model';


@Component({
  selector: 'scheduled-job-list',
  standalone: false,
  templateUrl: './scheduled-job-list.component.html',
  styleUrls: ['./scheduled-job-list.component.scss', '../job-list/job-list.component.scss']
})
export class ScheduledJobListComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  @Input() selectedScheduledJobId: string = "";

  @Output() onDeleteScheduledJob = new EventEmitter();
  @Output() onSelectScheduledJob = new EventEmitter();
  @Output() onUpdateScheduledJob = new EventEmitter();

  waitForScheduledJobs = false;
  scheduledJobs: ScheduledJob[] = [];

  constructor(
    private _dataService: APIDataService,
    private _snackbarService: SnackbarService,
    public dialog: MatDialog
  ) {
  }

  ngOnInit() {
    this.refreshScheduledJobs();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private refreshScheduledJobs() {
    this.waitForScheduledJobs = true;
    this._dataService.sendScheduledJobListRequest(ScheduledJobListReq.create()).subscribe({
      next: resp => {
        if (resp.jobs) {
          this.scheduledJobs = resp.jobs;

          // Order them to be AFTER_IMPORT first, then by the order field
          this.scheduledJobs.sort((a: ScheduledJob, b: ScheduledJob): number => {
            if (a.scheduleType < b.scheduleType) {
              return -1;
            } else if (a.scheduleType > b.scheduleType) {
              return 1;
            }

            // If they're equal, we sort them on their individual fields
            if (a.scheduleType == ScheduledJob_ScheduleType.AFTER_IMPORT) {
              return a.jobOrder - b.jobOrder
            }

            //return b.scheduledFirstTimeUnixSec - a.scheduledFirstTimeUnixSec
            return a.intervalSec - b.intervalSec;
          });

          // Make sure the one we're showing is up to date
          this.onUpdateScheduledJob.emit(this.scheduledJobs);
        }
      },
      error: err => {
        this._snackbarService.openError("Failed to refresh scheduled job list", err)
      },
      complete: () => {
        this.waitForScheduledJobs = false;
      }
    });
  }

  onAddScheduledJob() {
    this.setScheduledJob();
  }

  onClickScheduledJob(job: ScheduledJob) {
    this.onSelectScheduledJob.emit(job);
  }

  onManageRepos() {
    const dialogConfig = new MatDialogConfig<ManageRepositoriesData|undefined>();
    dialogConfig.hasBackdrop = true;
    //dialogConfig.disableClose = true;
    dialogConfig.data = new ManageRepositoriesData();

    const dlg = this.dialog.open(ManageRepositoriesComponent, dialogConfig);

    dlg.afterClosed().subscribe((resp?: ManageRepositoriesResult) => {});
  }


  onEditScheduledJob(job: ScheduledJob) {
    this.setScheduledJob(job);
  }

  private setScheduledJob(job?: ScheduledJob) {
    const dialogConfig = new MatDialogConfig<SetScheduledJobData|undefined>();
    dialogConfig.hasBackdrop = true;
    dialogConfig.disableClose = true;
    dialogConfig.data = job ? new SetScheduledJobData(job) : undefined;

    const dlg = this.dialog.open(SetScheduledJobComponent, dialogConfig);

    dlg.afterClosed().subscribe((resp?: SetScheduledJobResult) => {
      this.refreshScheduledJobs();
    });
  }

  onClickDeleteScheduledJob(job: ScheduledJob) {
    if (!confirm(`Are you sure you want to delete scheduled job: "${job.name}" (id: ${job.id})"?`)) {
      return;
    }

    const id = job.id;
    this._dataService.sendDeleteScheduledJobRequest(DeleteScheduledJobReq.create({id})).subscribe({
      next: resp => {
        this._snackbarService.openSuccess("Deleted scheduled job: " + id);

        // Notify listener(s), maybe they're displaying this exact job!
        this.onDeleteScheduledJob.emit(id);

        this.refreshScheduledJobs();
      },
      error: err => {
        this._snackbarService.openError("Failed to delete scheduled job: "+id, err);
        this.refreshScheduledJobs();
      }
    });
  }

  getPrintableJobScheduleType(t: ScheduledJob_ScheduleType)
  {
    return getPrintableJobScheduleType(t);
  }

  getJobScheduleParam(job: ScheduledJob): string {
    if (job.scheduleType == ScheduledJob_ScheduleType.AFTER_IMPORT) {
      return ` (${job.jobOrder})`;
    }

    return "";
  }
}
