import { Component, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs";
import { ImportMarsViewerImageReq, ImportMarsViewerImageResp, ImportMarsViewerImageUpd } from "src/app/generated-protos/image-coreg-msgs";
import { JobStatus_Status, jobStatus_StatusToJSON } from "src/app/generated-protos/job";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { httpErrorToString } from "src/app/utils/utils";

@Component({
  selector: "mvimport-status",
  templateUrl: "./mvimport-status.component.html",
  styleUrls: ["./mvimport-status.component.scss"]
})
export class MVImportStatusComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();

  status = "Nothing to import!";
  waiting = false;
  private _jobId = "";

  constructor(
    private _dataService: APIDataService,
    private _snackService: SnackbarService,
    private _route: ActivatedRoute
  ) {}

  ngOnInit() {
    this._subs.add(
      this._route.queryParams.subscribe(params => {
        const mvJsonLink = params["definition"];
        if (mvJsonLink) {
          // We have a definition! This should be a URL pointing to the json description of the image(s) exported from MarsViewer
          // Here we just take this and pass it to our API to start the import job. We show errors/status changes while we wait
          this.waiting = true;
          this.setStatus(JobStatus_Status.UNKNOWN, "Starting import");

          this._dataService.sendImportMarsViewerImageRequest(ImportMarsViewerImageReq.create({ triggerUrl: mvJsonLink })).subscribe({
            next: (resp: ImportMarsViewerImageResp) => {
              this._jobId = resp.jobId;
              this.setStatus(JobStatus_Status.UNKNOWN, "Import running...");
              this._snackService.openSuccess(`Import from MarsViewer started...`, `Job id is ${resp.jobId}`);
            },
            error: err => {
              this.waiting = false;
              this.setStatus(JobStatus_Status.ERROR, httpErrorToString(err, "Import failed"));
              this._snackService.openError(err);
            },
          });
        }
      })
    );

    this._subs.add(
      this._dataService.importMarsViewerImageUpd$.subscribe((upd: ImportMarsViewerImageUpd) => {
        if (upd.status && upd.status.jobId == this._jobId) {
          this.setStatus(upd.status.status, upd.status.message);
          this.waiting = upd.status.status != JobStatus_Status.COMPLETE && upd.status.status != JobStatus_Status.ERROR;
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  setStatus(status: JobStatus_Status, statusMessage: string) {
    if (status == JobStatus_Status.UNKNOWN || statusMessage.length > 0) {
      this.status = statusMessage;
    } else {
      const statusStr = jobStatus_StatusToJSON(status);
      this.status = `Import ${statusStr}: ${statusMessage}`;
    }
  }
}
