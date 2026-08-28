import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { JobStatus, JobStatus_Status, JobType } from 'src/app/generated-protos/job';
import { JobListReq } from 'src/app/generated-protos/job-msgs';
import { APIDataService, AnalysisLayoutService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { httpErrorToString } from 'src/app/utils/utils';
import { getPrintableJobType, fromPrintableJobType } from '../../../models/jobs.model';
import { ExpressionPickerResponse } from 'src/app/modules/expressions/components/expression-picker/expression-picker.component';

@Component({
  selector: 'job-list',
  standalone: false,
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.scss'
})
export class JobListComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  @Input() selectedJobId: string = "";

  @Output() onSelectJob = new EventEmitter();
  @Output() onUpdateSelectJob = new EventEmitter();
  @Output() onActiveJobCountChanged = new EventEmitter();
  
  waitForJobs: boolean = false;

  activeJobs: JobStatus[] = [];
  jobs: JobStatus[] = [];

  totalJobCount = 0;

  private _filteredJobTypes: string[] = ["RUN_FIT", "RUN_QUANT", "RUN_EXPRESSION"];
  jobTypes: string[] = [];

  private _jobPage: number = 0; // 0 being the most recent jobs
  private _jobPageSize = 100;

  private _updSubscribed = false;

  errorString = "";

  constructor(
    private _dataService: APIDataService,
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

        this.onActiveJobCountChanged.emit(this.activeJobs.length);

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

  onClickJob(job: JobStatus) {
    this.onSelectJob.emit(job);
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

  private isActiveJob(job: JobStatus): boolean {
    return job.status != JobStatus_Status.COMPLETE && job.status != JobStatus_Status.ERROR;
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
          this.onUpdateSelectJob.emit(upd.job);

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

                this.onActiveJobCountChanged.emit(this.activeJobs.length);
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
            this.onActiveJobCountChanged.emit(this.activeJobs.length);
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
}
