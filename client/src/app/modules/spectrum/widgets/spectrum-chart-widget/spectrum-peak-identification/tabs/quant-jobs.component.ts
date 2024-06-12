import { Component, OnInit } from "@angular/core";
import { TabSelectors } from "../tab-selectors";
import { APIDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { JobListReq, JobListResp } from "src/app/generated-protos/job-msgs";
import { Subscription } from "rxjs";
import { JobStatus } from "src/app/generated-protos/job";

@Component({
  selector: TabSelectors.tabQuantJobs,
  templateUrl: "./quant-jobs.component.html",
  styleUrls: ["./quant-jobs.component.scss"],
})
export class QuantJobsComponent implements OnInit {
  private _subs = new Subscription();
  jobs: JobStatus[] = [];

  constructor(private _dataService: APIDataService) {}

  ngOnInit() {
    this._subs.add(
      this._dataService.sendJobListRequest(JobListReq.create()).subscribe((jobListResp: JobListResp) => {
        this.jobs = jobListResp.jobs;
      })
    );
  }
}
