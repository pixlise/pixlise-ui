import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { JobGroupConfig, JobStatus, JobStatus_Status, JobType, ScheduledJob } from 'src/app/generated-protos/job';
import { JobGetReq } from 'src/app/generated-protos/job-msgs';
import { QuantGetReq, QuantGetResp } from 'src/app/generated-protos/quantification-retrieval-msgs';
import { QuantificationSummary } from 'src/app/generated-protos/quantification-meta';

import { ExpressionPickerResponse } from 'src/app/modules/expressions/components/expression-picker/expression-picker.component';
import { AnalysisLayoutService, APIDataService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { isJobStatusActive } from 'src/app/utils/utils';


@Component({
  selector: 'app-jobs',
  standalone: false,
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  selectedJob?: JobStatus;
  selectedJobConfig?: JobGroupConfig;
  selectedJobConfigError = "";

  selectedScheduledJob?: ScheduledJob;
  selectedJobQuantSummary?: QuantificationSummary;
  selectedJobQuantSummaryError = "";

  showScheduledJobs: boolean = false;

  activeJobCount: number = 0;
  activeJobs: boolean = false;

  private _activeJobsSeen: Set<string> = new Set<string>();

  constructor(
    private _dataService: APIDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    public dialog: MatDialog
  ) {
  }

  ngOnInit() {
    this._subs.add(
      this._analysisLayoutService.expressionPickerResponse$.subscribe(
        (result: ExpressionPickerResponse | null) => {
        }
      )
    );

    this._subs.add(
      this._dataService.jobListUpd$.subscribe(upd => {
        if (upd.job) {
          //const had = this._activeJobsSeen.has(upd.job.jobId);
          const isActive = isJobStatusActive(upd.job.status);

          // Add to our list of active jobs if it's active
          if (isActive) {
            this._activeJobsSeen.add(upd.job.jobId);
          } else {
            // Make sure it's not in our active list
            this._activeJobsSeen.delete(upd.job.jobId);
          }

          this.activeJobs = this._activeJobsSeen.size > 0;
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onActiveJobs(activeJobs: JobStatus[]) {
    for (let j of activeJobs) {
      this._activeJobsSeen.add(j.jobId);
    }
    this.activeJobs = this._activeJobsSeen.size > 0;
  }

  onUpdateSelectJob(job: JobStatus) {
    if (this.selectedJob?.jobId == job.jobId) {
      this.selectedJob = job;

      this.refreshSelectedJobConfig();
    }
  }

  onDeleteScheduledJob(id: string) {
    if (this.selectedScheduledJob && this.selectedScheduledJob.id == id) {
      this.selectedScheduledJob = undefined;
    }
  }

  onUpdateScheduledJob(scheduledJobs: ScheduledJob[]) {
    if (!this.selectedScheduledJob) {
      return;
    }

    // Find if the selected job is one of the ones in the list...
    for (let j of scheduledJobs) {
      if (j.id == this.selectedScheduledJob.id) {
        // Yes, update our reference to the new one!
        this.selectedScheduledJob = j;
        break;
      }
    }
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

  onTabActivePastJobs() {
    this.showScheduledJobs = false;
  }

  onTabScheduledJobs() {
    this.showScheduledJobs = true;
  }

  onSelectScheduledJob(job: ScheduledJob) {
    this.selectedScheduledJob = job;
    this.selectedJob = undefined;
    this.selectedJobConfig = undefined;
    this.selectedJobQuantSummary = undefined;
    this.selectedJobConfigError = "";
    this.selectedJobQuantSummaryError = "";
  }

  onSelectJob(job: JobStatus) {
    this.selectedJob = job;
    this.selectedScheduledJob = undefined;

    this.refreshSelectedJobConfig();
  }

  isQuantJob(job: JobStatus): boolean {
    return job && (job.jobType == JobType.JT_RUN_QUANT || job.jobType == JobType.JT_RUN_FIT);
  }

  isExpressionJob(job: JobStatus): boolean {
    return job && job.jobType == JobType.JT_RUN_EXPRESSION;
  }
}
