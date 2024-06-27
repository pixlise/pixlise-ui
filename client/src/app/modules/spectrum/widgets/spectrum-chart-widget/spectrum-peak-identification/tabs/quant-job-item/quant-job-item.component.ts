import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { Subscription, interval } from "rxjs";
import { JobStatus, JobStatus_Status, jobStatus_StatusToJSON } from "src/app/generated-protos/job";

@Component({
  selector: "quant-job-item",
  templateUrl: "./quant-job-item.component.html",
  styleUrls: ["./quant-job-item.component.scss"],
})
export class QuantJobItemComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();
  @Input() job!: JobStatus;
  @Input() selected: boolean = false;

  icon: string = "";
  creatorName: string = "";
  creatorAbbreviation: string = "";
  status: string = "";
  elapsedTimeMs: number = 0;

  ngOnInit() {
    this.status = jobStatus_StatusToJSON(this.job.status);

    if (this.job.status != JobStatus_Status.COMPLETE && this.job.status != JobStatus_Status.ERROR) {
      // start a timer to update the elapsed time
      this._subs.add(
        interval(1000).subscribe(() => {
          this.elapsedTimeMs = (Date.now() / 1000 - this.job.startUnixTimeSec) * 1000;
        })
      );
    } else {
      // Set to 0, we dont want to display unless it's running
      this.elapsedTimeMs = 0; //(this.job.endUnixTimeSec - this.job.startUnixTimeSec) * 1000;
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
}
