import { Component, Input } from '@angular/core';
import { Subscription } from 'rxjs';
import { ScheduledJob, ScheduledJob_ScheduleType } from 'src/app/generated-protos/job';
import { getPrintableJobScheduleType, getPrintableJobType } from '../jobs.component';
import { scanInstrumentToJSON } from 'src/app/generated-protos/scan';
import { getPrintableScheduledJobInstrument } from '../set-scheduled-job/set-scheduled-job.component';

@Component({
  selector: 'scheduled-job-view',
  standalone: false,
  templateUrl: './scheduled-job-view.component.html',
  styleUrls: ['./scheduled-job-view.component.scss', '../general-job/general-job.component.scss']
})
export class ScheduledJobViewComponent {
  private _subs = new Subscription();
  @Input() job!: ScheduledJob;

  constructor() {}

  ngOnInit() {
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get scheduleType(): string {
    return getPrintableJobScheduleType(this.job.scheduleType);
  }

  get jobType(): string {
    return getPrintableJobType(this.job.jobType);
  }

  get instrument(): string {
      return getPrintableScheduledJobInstrument(this.job.instrument);
  }

  get paramKeys(): string[] {
    return Object.keys(this.job.jobParameters).sort();
  }

  isAfterImport(): boolean {
    return this.job.scheduleType == ScheduledJob_ScheduleType.AFTER_IMPORT;
  }
}
