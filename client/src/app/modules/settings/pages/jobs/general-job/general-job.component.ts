import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { JobStatus, JobStatus_Status, jobStatus_StatusToJSON, JobType, jobTypeToJSON } from 'src/app/generated-protos/job';
import { makeJobName } from '../job-item/job-item.component';
import { getPrintableJobType } from '../jobs.component';

@Component({
  selector: 'general-job-view',
  standalone: false,
  templateUrl: './general-job.component.html',
  styleUrl: './general-job.component.scss'
})
export class GeneralJobComponent {
  private _subs = new Subscription();
  @Input() job!: JobStatus;

  constructor() {}

  ngOnInit() {
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get name(): string {
      return makeJobName(this.job);
  }

  get status(): string {
    return jobStatus_StatusToJSON(this.job.status);
  }

  get jobType(): string {
    return getPrintableJobType(this.job.jobType);
  }
}
