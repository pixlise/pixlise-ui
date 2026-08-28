import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { JobGroupConfig, JobStatus, JobStatus_Status, JobType, jobTypeFromJSON, jobTypeToJSON, ScheduledJob, ScheduledJob_ScheduleType, scheduledJob_ScheduleTypeToJSON } from 'src/app/generated-protos/job';
import { DeleteScheduledJobReq, JobGetReq, JobListReq, ScheduledJobListReq, SetScheduledJobReq } from 'src/app/generated-protos/job-msgs';
import { ExpressionPickerResponse } from 'src/app/modules/expressions/components/expression-picker/expression-picker.component';
import { AnalysisLayoutService, APICachedDataService, APIDataService, SnackbarService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { httpErrorToString } from 'src/app/utils/utils';
import { SetScheduledJobComponent, SetScheduledJobData, SetScheduledJobResult } from './set-scheduled-job/set-scheduled-job.component';
import { QuantGetReq, QuantGetResp } from 'src/app/generated-protos/quantification-retrieval-msgs';
import { QuantificationSummary } from 'src/app/generated-protos/quantification-meta';
import { ManageRepositoriesComponent, ManageRepositoriesData, ManageRepositoriesResult } from './manage-repositories/manage-repositories.component';

@Component({
  selector: 'app-jobs',
  standalone: false,
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  activeJobs: JobStatus[] = [];
  jobs: JobStatus[] = [];
  scheduledJobs: ScheduledJob[] = [];
  totalJobCount = 0;

  selectedJob?: JobStatus;
  selectedJobConfig?: JobGroupConfig;
  selectedJobConfigError = "";
  selectedScheduledJob?: ScheduledJob;
  selectedJobQuantSummary?: QuantificationSummary;
  selectedJobQuantSummaryError = "";

  private _filteredJobTypes: string[] = ["RUN_FIT", "RUN_QUANT", "RUN_EXPRESSION"];
  jobTypes: string[] = [];

  errorString = "";
  showScheduledJobs: boolean = false;

  waitForScheduledJobs = false;
  waitForJobs: boolean = false;

  private _jobPage: number = 0; // 0 being the most recent jobs
  private _jobPageSize = 100;

  private _updSubscribed = false;

  constructor(
    //private _cachedDataService: APICachedDataService,
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
      },
      complete: () => {
        this.waitForScheduledJobs = false;
      }
    });
  }

  private refreshJobList() {
    this.waitForJobs = true;

    const types: JobType[] = [];
    for (let t of this._filteredJobTypes) {
      const jt = fromPrintableJobType(t);
      types.push(jt);
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
        this.waitForJobs = false;
      }
    });
  }

  private listenForJobUpdates() {
    if (this._updSubscribed) {
      return;
    }

    this._updSubscribed = true;

    this._subs.add(
      this._dataService.jobListUpd$.subscribe(upd => {
        if (upd.job) {
          // Check if we've got this one selected, and update if so
          if (this.selectedJob?.jobId == upd.job.jobId) {
            this.selectedJob = upd.job;

            this.refreshSelectedJobConfig();
          }

          for (let c = 0; c < this.activeJobs.length; c++) {
            const job = this.activeJobs[c];
            if (job.jobId == upd.job.jobId) {
              // At this point, we've found it, but if it's no longer active, we need to put it on our
              // completed list. We'd expect a page refresh to put it in that list too...
              if (this.isActiveJob(upd.job)) {
                this.activeJobs[c] = upd.job;
              } else {
                // Remove it from the active list, add to the top of the inactive one
                this.activeJobs.splice(c, 1);
                this.jobs.unshift(upd.job);
              }

              // We've handled, nothing more to do here!
              return;
            }
          }

          // If we find it in the inactive list, overwrite
          for (let c = 0; c < this.jobs.length; c++) {
            const job = this.jobs[c];
            if (job.jobId == upd.job.jobId) {
              this.jobs[c] = upd.job;

              // Stop here, nothing more to do
              return;
            }
          }

          // If we're still running, this job isn't in either list, so add it to the appropriate one now
          if (this.isActiveJob(upd.job)) {
            this.activeJobs.push(upd.job);
          } else {
            this.jobs.push(upd.job);
          }

          // setTimeout(() => {
          //   this.viewport.checkViewportSize();
          // }, 0);
        }
      })
    );
  }

  private isActiveJob(job: JobStatus): boolean {
    return job.status != JobStatus_Status.COMPLETE && job.status != JobStatus_Status.ERROR;
  }

  onClickJob(job: JobStatus) {
    this.selectedJob = job;
    this.selectedScheduledJob = undefined;

    this.refreshSelectedJobConfig();
  }

  onClickScheduledJob(job: ScheduledJob) {
    this.selectedScheduledJob = job;
    this.selectedJob = undefined;
    this.selectedJobConfig = undefined;
    this.selectedJobQuantSummary = undefined;
    this.selectedJobConfigError = "";
    this.selectedJobQuantSummaryError = "";
  }

  private refreshSelectedJobConfig() {
    this.selectedJobConfig = undefined;
    this.selectedJobQuantSummary = undefined;
    this.selectedJobConfigError = "";
    this.selectedJobQuantSummaryError = "";
    if (!this.selectedJob) {
      return;
    }
    
    this._subs.add(
      this._dataService.sendJobGetRequest(JobGetReq.create({jobId: this.selectedJob.jobId})).subscribe({
        next: resp => {
          if (resp.config) {
            this.selectedJobConfig = resp.config;
          }
        },
        error: err => {
          if (err["status"] == 2) {
            this.selectedJobConfigError = "Failed to load job config - perhaps this job was run before the PIXLISE job manager was created"
          } else {
            this.selectedJobConfigError = err;
          }
        }
      })
    );

    // If the job is a quant, we can get the quant details too
    if (this.selectedJob.jobType == JobType.JT_RUN_QUANT && this.selectedJob.status == JobStatus_Status.COMPLETE) {
      this._subs.add(
        this._dataService.sendQuantGetRequest(QuantGetReq.create({ quantId: this.selectedJob.jobItemId, summaryOnly: true })).subscribe({
          next: (resp: QuantGetResp) => {
            if (resp.summary) {
              this.selectedJobQuantSummary = resp.summary;
            }
          },
          error: err => {
            if (err["status"] == 4) {
              this.selectedJobQuantSummaryError = "You don't have permission to view the quantification details";
            } else {
              this.selectedJobQuantSummaryError = err;
            }
          }
        })
      );
    }
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

  onDeleteScheduledJob(job: ScheduledJob) {
    if (!confirm(`Are you sure you want to delete scheduled job: "${job.name}" (id: ${job.id})"?`)) {
      return;
    }

    const id = job.id;
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

  onManageRepos() {
    const dialogConfig = new MatDialogConfig<ManageRepositoriesData|undefined>();
    dialogConfig.hasBackdrop = true;
    //dialogConfig.disableClose = true;
    dialogConfig.data = new ManageRepositoriesData();

    const dlg = this.dialog.open(ManageRepositoriesComponent, dialogConfig);

    dlg.afterClosed().subscribe((resp?: ManageRepositoriesResult) => {});
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