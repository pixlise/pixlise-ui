import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { JobStatus, JobType, jobTypeFromJSON, jobTypeToJSON, ScheduledJob, ScheduledJob_ScheduleType, scheduledJob_ScheduleTypeToJSON } from 'src/app/generated-protos/job';
import { DeleteScheduledJobReq, JobListReq, ScheduledJobListReq, SetScheduledJobReq } from 'src/app/generated-protos/job-msgs';
import { ExpressionPickerResponse } from 'src/app/modules/expressions/components/expression-picker/expression-picker.component';
import { AnalysisLayoutService, APIDataService, SnackbarService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { httpErrorToString } from 'src/app/utils/utils';
import { getScheduledJobParamKeys, SetScheduledJobComponent, SetScheduledJobData, SetScheduledJobResult } from './set-scheduled-job/set-scheduled-job.component';

@Component({
  selector: 'app-jobs',
  standalone: false,
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  @ViewChild("newScheduleDialogBtn") newScheduleDialogBtn!: ElementRef;

  activeJobs: JobStatus[] = [];
  jobs: JobStatus[] = [];
  scheduledJobs: ScheduledJob[] = [];
  totalJobCount = 0;

  selectedJob?: JobStatus;
  selectedScheduledJob?: ScheduledJob;

  private _filteredJobTypes: string[] = ["RUN_FIT", "RUN_QUANT", "RUN_EXPRESSION"];
  jobTypes: string[] = [];

  errorString = "";
  waiting: boolean = false;
  showScheduledJobs: boolean = false;

  private _jobPage: number = 0; // 0 being the most recent jobs
  private _jobPageSize = 100;

  constructor(
    private _dataService: APIDataService, 
    private _snackbarService: SnackbarService,
    private _analysisLayoutService: AnalysisLayoutService,
    public dialog: MatDialog
  ) {
    for (const key in JobType) {
      if (JobType.hasOwnProperty(key) && key.length > 2) {
        this.jobTypes.push(getPrintableJobType(key));
      }
    }
  }

  ngOnInit() {
    this.refreshJobList();

    this._subs.add(
      this._analysisLayoutService.expressionPickerResponse$.subscribe(
        (result: ExpressionPickerResponse | null) => {
        }
      )
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private refreshScheduledJobs() {
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
          if (this.selectedScheduledJob) {
            for (let j of this.scheduledJobs) {
              if (j.id == this.selectedScheduledJob.id) {
                this.selectedScheduledJob = j;
                break;
              }
            }
          }
        }
      },
      error: err => {
        this._snackbarService.openError("Failed to refresh scheduled job list", err)
      }
    });
  }

  private refreshJobList() {
    this.waiting = true;

    const types: JobType[] = [];
    for (let t of this._filteredJobTypes) {
      const jt = fromPrintableJobType(t);
      if (jt) {
        types.push(jt);
      }
    } 

    const req = JobListReq.create({skipJobs: this._jobPage * this._jobPageSize, jobCount: this._jobPageSize});
    if (types.length > 0) {
      req.jobTypes = types;
    }

    this._dataService.sendJobListRequest(req).subscribe({
      next: resp => {
        if (resp.jobs) {
          this.jobs = resp.jobs;
          this.activeJobs = resp.activeJobs;
        } else {
          this.jobs = [];
          this.activeJobs = [];
        }

        this.totalJobCount = resp.totalJobCount;

        // setTimeout(() => {
        //   this.viewport.checkViewportSize();
        // }, 0);

        this.listenForJobUpdates();
      },
      error: err => {
        this.errorString = httpErrorToString(err, "Failed to query jobs");    
      },
      complete: () => {
        this.waiting = false;
      }
    });
  }

  private listenForJobUpdates() {
    this._subs.add(
      this._dataService.jobListUpd$.subscribe(upd => {
        if (upd.job) {
          let found = false;
          for (let c = 0; c < this.activeJobs.length; c++) {
            const job = this.activeJobs[c];
            if (job.jobId == upd.job.jobId) {
              this.activeJobs[c] = upd.job;
              found = true;
              break;
            }
          }

          if (!found) {
            for (let c = 0; c < this.jobs.length; c++) {
              const job = this.jobs[c];
              if (job.jobId == upd.job.jobId) {
                this.jobs[c] = upd.job;
                break;
              }
            }
          }

          // setTimeout(() => {
          //   this.viewport.checkViewportSize();
          // }, 0);
        }
      })
    );
  }

  onClickJob(job: JobStatus) {
    this.selectedJob = job;
    this.selectedScheduledJob = undefined;
  }

  onClickScheduledJob(job: ScheduledJob) {
    this.selectedScheduledJob = job;
    this.selectedJob = undefined;
  }

  onActivePastJobs() {
    this.showScheduledJobs = false;
  }

  onScheduledJobs() {
    this.showScheduledJobs = true;
    this.refreshScheduledJobs();
  }

  onAddScheduledJob() {
    this.setScheduledJob();
  }

  isQuantJob(job: JobStatus): boolean {
    return job && (job.jobType == JobType.JT_RUN_QUANT || job.jobType == JobType.JT_RUN_FIT);
  }

  isExpressionJob(job: JobStatus): boolean {
    return job && job.jobType == JobType.JT_RUN_EXPRESSION;
  }

  get filteredJobTypes(): string[] {
    return this._filteredJobTypes;
  }

  set filteredJobTypes(types: string[]) {
    this._filteredJobTypes = types;
    this.refreshJobList();
  }

  get jobStartIdx(): number {
    return this._jobPage * this._jobPageSize;
  }

  get jobEndIdx(): number {
    let end = this._jobPage * this._jobPageSize + this._jobPageSize;
    if (end > this.totalJobCount) {
      end = this.totalJobCount;
    }
    return end;
  }

  get jobPageSize(): number {
    return this._jobPageSize;
  }

  onPage(move: number) {
    if (Math.abs(move) != 1) {
      return;
    }

    // Next or previous is just +/- 1
    this._jobPage += move;

    const maxPage = Math.round(this.totalJobCount / this.jobPageSize);

    if (this._jobPage < 0) {
      this._jobPage = 0;
    } else if (this._jobPage >= maxPage) {
      this._jobPage = maxPage-1;
    }
    
    if (this._jobPage < 0) {
      this._jobPage = 0;
    }

    this.refreshJobList();
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

  onDeleteScheduledJob(id: string) {
    this._dataService.sendDeleteScheduledJobRequest(DeleteScheduledJobReq.create({id})).subscribe({
      next: resp => {
        this._snackbarService.openSuccess("Deleted scheduled job: " + id);

        if (this.selectedScheduledJob && this.selectedScheduledJob.id == id) {
          this.selectedScheduledJob = undefined;
        }

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

export function getPrintableJobType(jt: JobType|string): string {
  let str = "";
  if (typeof jt == "string") {
    str = jt;
  } else {
    str = jobTypeToJSON(jt);
  }

  if (str.startsWith("JT_")) {
    str = str.slice(3);
  }

  return str;
}

export function fromPrintableJobType(jt: string): JobType {
  return jobTypeFromJSON("JT_"+jt);
}

export function getPrintableJobScheduleType(scheduleType: ScheduledJob_ScheduleType): string {
  return scheduledJob_ScheduleTypeToJSON(scheduleType);
}