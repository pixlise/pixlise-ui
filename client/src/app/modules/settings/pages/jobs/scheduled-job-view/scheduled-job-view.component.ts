import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ScheduledJob, ScheduledJob_ScheduleType } from 'src/app/generated-protos/job';
import { getPrintableJobScheduleType, getPrintableJobType } from '../jobs.component';
import { scanInstrumentToJSON } from 'src/app/generated-protos/scan';
import { getPrintableScheduledJobInstrument } from '../set-scheduled-job/set-scheduled-job.component';
import { APIDataService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { ScanTriggerJobReq } from 'src/app/generated-protos/scan-msgs';
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
  runJobScanId = "";

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

  isAfterImport(): boolean {
    return this.job.scheduleType == ScheduledJob_ScheduleType.AFTER_IMPORT;
  }

  onBtnEdit() {
    this.onEdit.emit(this.job);
  }

  onBtnDelete() {
    this.onDelete.emit(this.job);
  }

  onBtnRunJob() {
    if (!confirm(`Are you sure you want to run job: "${this.job.name}" (id: ${this.job.id})" now?`)) {
      return;
    }

    // They're running it - we need to simulate the situation when this job would run by itself, so we have to ask for some user parameters
    let scanId: string|null = this.job.jobParameters["scanId"]
    if (scanId == "imported") {
      // Ask for scan id
      scanId = prompt("Enter scan id");
      if (!scanId) {
        this.message = "No scan entered, job not run.";
        return;
      }
    }

    
    //this._dataService.sendScanTriggerJobRequest(ScanTriggerJobReq.create())
  }

  get requiresScanIdToRun(): boolean {
    const scanId = this.job.jobParameters["scanId"];
    return !!scanId && scanId == "imported";
  }

  onCloseRun(runJob: boolean) {
    if (runJob) {
      const params = {};
      if (this.runJobScanId) {
        params["scanId"] = this.runJobScanId;
      }
      this._dataService.sendTriggerScheduledJobRequest(TriggerScheduledJobReq.create({
        scheduledJobId: this.job.id,
        jobParameters: params
      }));

      this.runJobScanId = "";
    }

    if (this.runJobModal && this.runJobModal instanceof PushButtonComponent) {
      (this.runJobModal as PushButtonComponent).closeDialog();
    }
  }

  isRunValid() {
    return this.runJobScanId.length > 0;
  }
}
