import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ScheduledJob, ScheduledJob_ScheduleType } from 'src/app/generated-protos/job';
import { getPrintableJobScheduleType, getPrintableJobType } from '../jobs.component';
import { getPrintableScheduledJobInstrument } from '../set-scheduled-job/set-scheduled-job.component';
import { APIDataService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { TriggerScheduledJobReq } from 'src/app/generated-protos/job-msgs';
import { PushButtonComponent } from 'src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component';

@Component({
  selector: 'scheduled-job-view',
  standalone: false,
  templateUrl: './scheduled-job-view.component.html',
  styleUrls: ['./scheduled-job-view.component.scss', '../general-job/general-job.component.scss']
})
export class ScheduledJobViewComponent {
  @ViewChild("runJobModal") runJobModal!: ElementRef;

  private _subs = new Subscription();
  @Input() job!: ScheduledJob;

  @Output() onDelete = new EventEmitter();
  @Output() onEdit = new EventEmitter();
  @Output() onRunJob = new EventEmitter();

  message = "";
  runParams = new Map<string, string>();

  constructor(private _dataService: APIDataService) {}

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

  get paramKeysForRun(): string[] {
    // Run through and only allow editing ones that allow editing
    if (this.runParams.size <= 0) {
      // If it's the first time, construct the list of options!
      const keys = Object.keys(this.job.jobParameters).sort();
      let hasQuant = false;
      for (let key of keys) {
        if (key == "quant") {
          hasQuant = true;
        } else {
          const val = this.job.jobParameters[key];
          if (val == "none" || val == "imported") {
            this.runParams.set(key, val);
            //result.push(key);
          }
        }
      }

      // If we have a user-definable scan, and quant, make sure quant is in the list
      if (this.runParams.has("scanId") && hasQuant && !this.runParams.has("quant")) {
        this.runParams.set("quant", "");
      }
    }
    
    return Array.from(this.runParams.keys()).sort();
  }

  isAfterImport(): boolean {
    return this.job.scheduleType == ScheduledJob_ScheduleType.AFTER_IMPORT;
  }

  onBtnEdit() {
    this.onEdit.emit(this.job);
  }

  onBtnDelete() {
    this.onDelete.emit(this.job);
  }

  onCloseRun(runJob: boolean) {
    if (runJob) {
      const params = {};
      for (let [k, v] of this.runParams.entries()) {
        params[k] = v;
      }

      this._dataService.sendTriggerScheduledJobRequest(TriggerScheduledJobReq.create({
        scheduledJobId: this.job.id,
        jobParameters: params
      }));

      this.runParams.clear();
    }

    if (this.runJobModal && this.runJobModal instanceof PushButtonComponent) {
      (this.runJobModal as PushButtonComponent).closeDialog();
    }
  }

  isRunValid() {
    for (let [k, v] of this.runParams.entries()) {
      if (!v) {
        return false;
      }
    }
    return true;
  }
}
