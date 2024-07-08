import { Component, EventEmitter, OnInit, Output } from "@angular/core";
import { TabSelectors } from "../tab-selectors";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { JobListReq, JobListResp } from "src/app/generated-protos/job-msgs";
import { Observable, Subscription, catchError, combineLatest, concatMap, map, switchMap, tap, throwError } from "rxjs";
import { JobStatus, JobStatus_JobType, JobStatus_Status, jobStatus_StatusToJSON } from "src/app/generated-protos/job";
import {
  QuantGetReq,
  QuantGetResp,
  QuantLogGetReq,
  QuantLogGetResp,
  QuantLogListReq,
  QuantLogListResp,
  QuantRawDataGetReq,
  QuantRawDataGetResp,
} from "src/app/generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { WSError } from "src/app/modules/pixlisecore/services/wsMessageHandler";
import { QuantModes, getQuantifiedElements } from "src/app/models/Quantification";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { QuantCreateUpd } from "src/app/generated-protos/quantification-create";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { WidgetError } from "src/app/modules/pixlisecore/services/widget-data.service";
import { WidgetExportDialogComponent } from "src/app/modules/widget/components/widget-export-dialog/widget-export-dialog.component";
import {
  WidgetExportDialogData,
  WidgetExportData,
  WidgetExportRequest,
  WidgetExportFile,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import {
  TextFileViewingDialogComponent,
  TextFileViewingDialogData,
} from "src/app/modules/pixlisecore/components/atoms/text-file-viewing-dialog/text-file-viewing-dialog.component";
import { UsersService } from "src/app/modules/settings/services/users.service";

const SelectQuantText = "Select a quantification job";

@Component({
  selector: TabSelectors.tabQuantJobs,
  templateUrl: "./quant-jobs.component.html",
  styleUrls: ["./quant-jobs.component.scss"],
})
export class QuantJobsComponent implements OnInit {
  @Output() onClose = new EventEmitter();

  private _subs = new Subscription();
  jobs: JobStatus[] = [];
  selectedQuantId: string = "";
  summary: QuantificationSummary | null = null;
  selectedJob: JobStatus | null = null;
  message: string = SelectQuantText;

  // Selected items parameters:
  hasLogs: boolean = false;
  logMissingReason: string = "";
  elementStateType: string = "";
  ignoreAr: string = "";
  outputElements: string = "";
  displayMsg: string = "";
  quantMode: string = "";
  comments: string = "";
  piquantParameters: string = "";
  elapsedTime: number = 0;
  includeDwells: string = "";
  roisQuantified: string = "";
  roiName: string = "";
  status: string = "";

  icon: string = "";
  creatorName: string = "";
  creatorAbbreviation: string = "";

  constructor(
    private _cachedDataService: APICachedDataService,
    private _dataService: APIDataService,
    private _dialog: MatDialog,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService,
    private _usersService: UsersService
  ) {}

  ngOnInit() {
    this._subs.add(
      this._dataService.sendJobListRequest(JobListReq.create()).subscribe((jobListResp: JobListResp) => {
        // We're only interested in jobs that are quants!
        this.jobs = jobListResp.jobs.filter((job: JobStatus) => {
          return job.jobType == JobStatus_JobType.JT_RUN_QUANT; // || job.jobType == JobStatus_JobType.JT_UNKNOWN;
        });
      })
    );

    this._subs.add(
      this._dataService.quantCreateUpd$.subscribe((upd: QuantCreateUpd) => {
        if (!upd.status) {
          this._snackService.openError("Quantification job update did not include job status");
        } else {
          if (upd.status.jobId.length > 0) {
            for (let c = 0; c < this.jobs.length; c++) {
              const job = this.jobs[c];

              if (job.jobId == upd.status.jobId) {
                this.jobs[c] = upd.status;
                break;
              }
            }
          }
        }
      })
    );
  }

  onSelectQuant(quantId: string) {
    this.selectedQuantId = quantId;
    this.summary = null;
    this.selectedJob = null;
    this.message = "";

    // Find if this is in progress
    for (const job of this.jobs) {
      if (job.jobId == quantId) {
        if (job.status == JobStatus_Status.ERROR) {
          // Show some stuff on the right including the error message
          this.selectedJob = job;
          this.status = jobStatus_StatusToJSON(job.status);
          this.displayMsg = job.message;
          this.elapsedTime = job.endUnixTimeSec - job.startUnixTimeSec;
          this.setCreator(job.requestorUserId);
          return;
        } else if (job.status != JobStatus_Status.COMPLETE) {
          this.message = "Can't display details, quantification is still running...";
          return;
        }
        break;
      }
    }

    // NOTE: NOT using _cachedDataService, we want the latest copy
    this._dataService.sendQuantGetRequest(QuantGetReq.create({ quantId: quantId, summaryOnly: true })).subscribe({
      next: (resp: QuantGetResp) => {
        this.summary = resp.summary || null;

        if (!resp.summary) {
          return;
        }

        const summary = resp.summary;

        const elemInfo = getQuantifiedElements(summary);
        this.elementStateType = elemInfo.carbonates ? "carbonates" : "oxides";
        this.ignoreAr = elemInfo.ignoreAr ? "Yes" : "No";
        const allSymbols = [];
        for (const sym of elemInfo.nonElementSymbols) {
          // Don't add CO3, it's a special parameter that makes PIQUANT generate carbonates
          // Same as Ar_I
          // NOTE: The above 2 would only appear in the list as part of a fallback scenario
          //       when the quants original parameter list is read
          if (sym != "CO3" && sym != "Ar_I") {
            allSymbols.push(sym);
          }
        }

        for (const z of elemInfo.elementAtomicNumbers) {
          const e = periodicTableDB.getElementByAtomicNumber(z);
          if (e) {
            allSymbols.push(e.symbol);
          }
        }

        this.includeDwells = summary?.params?.userParams?.includeDwells ? "Yes" : "No";
        this.roisQuantified = (summary?.params?.userParams?.roiIDs || []).join(",");
        this.outputElements = allSymbols.join(",");
        this.displayMsg = summary.status?.message && summary.status?.message.length ? " (" + summary.status?.message + ")" : "";
        this.comments = summary.params?.comments || "(None)";
        this.quantMode = QuantModes.getShortDescription(summary.params?.userParams?.quantMode || "");
        this.piquantParameters = summary.params?.userParams?.parameters || "(None specified)";
        this.elapsedTime = this.getElapsedTimeSec(summary);

        this.status = summary.status?.status ? jobStatus_StatusToJSON(summary.status?.status) : "";

        this.setCreator(this.summary?.owner?.creatorUser?.id || "");

        // If it's a multi-quant we don't have logs anyway
        if (summary.id.indexOf("multi_") >= 0) {
          this.logMissingReason = "No logs are generated for multi-quantifications";
        }

        // Decide on a few things we're showing/not showing
        if (summary.status?.endUnixTimeSec && summary.status.otherLogFiles && summary.status.otherLogFiles.length > 0) {
          // Looks valid, check them though because older quant logs were signed links to AWS, and we no longer bother showing these
          // Look at the first one and decide
          this.hasLogs = true;
          this.logMissingReason = "";

          const firstLog = summary.status.otherLogFiles[0];

          // Logs used to contain a signed URL, we no longer support viewing those, so this message is here...
          if (firstLog.toUpperCase().indexOf("AMZ-CREDENTIAL") > -1) {
            this.logMissingReason = "Pre-April 2021 quantification detected. Log file viewing not supported.";
          }
        }

        // TODO: this.updateROIName();
      },
      error: (err: WSError) => {
        this.message = err.message;
      },
    });
  }

  private setCreator(userId: string) {
    this.icon = "";
    this.creatorName = "";
    this.creatorAbbreviation = "";

    // Retrieve user icon if we can
    const cachedUsers = this._usersService?.cachedUsers;
    if (cachedUsers && userId) {
      const user = cachedUsers[userId];
      if (user) {
        this.icon = user.iconURL;
        this.creatorName = user.name;
        this.creatorAbbreviation = this.creatorName.length > 0 ? this.creatorName[0] : "N/A";
      }
    }
  }

  onUseQuant(quantId: string) {
    if (!this.summary) {
      this._snackService.openError("No quantification selected");
    }

    const screenConfig = this._analysisLayoutService.activeScreenConfiguration$.value;
    if (!screenConfig) {
      this._snackService.openError("Failed to get current workspace configuration");
      return;
    }

    // We now find the item to set the quant id in, then save it
    const scanConfig = screenConfig.scanConfigurations[this.summary!.scanId];
    if (!scanConfig) {
      this._snackService.openError("Failed to find scan in current workspace configuration");
      return;
    }

    scanConfig.quantId = quantId;
    this._analysisLayoutService.writeScreenConfiguration(screenConfig);
  }

  onExport(quantId: string) {
    const dialogConfig = new MatDialogConfig<WidgetExportDialogData>();
    dialogConfig.data = {
      title: `Export Quant`,
      defaultZipName: `${quantId}`,
      options: [],
      dataProducts: [
        {
          id: "quantMap",
          name: "Quantification Map CSV",
          type: "checkbox",
          description: "Map generated by PIQUANT as CSV",
          selected: true,
        },
        {
          id: "quantLogs",
          name: "PIQUANT Logs",
          type: "checkbox",
          description: "Logs output by PIQUANT",
          selected: true,
        },
      ],
      showPreview: false,
    };

    const dialogRef = this._dialog.open(WidgetExportDialogComponent, dialogConfig);
    this._subs.add(
      dialogRef
        .componentInstance!.requestExportData.pipe(
          switchMap(response => this.onExportQuantData(response, quantId)),
          tap(exportData => dialogRef.componentInstance!.onDownload(exportData as WidgetExportData)),
          catchError(err => {
            if (dialogRef?.componentInstance?.onExportError) {
              dialogRef.componentInstance.onExportError(err);
            }
            return throwError(() => new WidgetError("Failed to export", err));
          })
        )
        .subscribe()
    );

    dialogRef.afterClosed().subscribe(() => {
      //this._exportDialogOpen = false;
    });
  }

  private onExportQuantData(request: WidgetExportRequest, quantId: string): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      const requests = [];
      let mapIdx = -1;
      let logIdx = -1;

      if (request.dataProducts["quantMap"]?.selected) {
        mapIdx = requests.length;
        requests.push(this.getQuantExportData(quantId));
      }

      if (request.dataProducts["quantLogs"]?.selected) {
        logIdx = requests.length;
        requests.push(this.getQuantExportLogs(quantId));
      }

      if (requests.length === 0) {
        this._snackService.openError("No items selected for export", "Please select or configure at least one item to export.");
        observer.complete();
      }
      combineLatest(requests).subscribe({
        next: (responses: WidgetExportFile[][]) => {
          const data: WidgetExportData = {};

          if (mapIdx > -1) {
            data.csvs = responses[mapIdx];
          }

          if (logIdx > -1) {
            data.txts = responses[logIdx];
          }

          observer.next(data);
          observer.complete();
        },
        error: err => {
          observer.error(err);
          this._snackService.openError("Error exporting data", err);
          observer.complete();
        },
      });
    });
  }

  private getQuantExportData(quantId: string): Observable<WidgetExportFile[]> {
    return this._cachedDataService.getQuantRawCSV(QuantRawDataGetReq.create({ quantId: quantId })).pipe(
      map((resp: QuantRawDataGetResp) => {
        if (!resp.data) {
          throw new Error(`QuantGet for ${quantId} returned no data`);
        }

        return [{ fileName: quantId + "-map.csv", data: resp.data }];
      })
    );
  }

  private getQuantExportLogs(quantId: string): Observable<WidgetExportFile[]> {
    return this._dataService.sendQuantLogListRequest(QuantLogListReq.create({ quantId: quantId })).pipe(
      concatMap((logListResp: QuantLogListResp) => {
        if (logListResp.fileNames.length <= 0) {
          return [];
        }

        const logRequests = [];
        for (const fileName of logListResp.fileNames) {
          logRequests.push(
            this._cachedDataService.getQuantLog(QuantLogGetReq.create({ quantId: quantId, logName: fileName })).pipe(
              map((logResp: QuantLogGetResp) => {
                return { subFolder: "logs", fileName: fileName, data: logResp.logData } as WidgetExportFile;
              })
            )
          );
        }

        return combineLatest(logRequests);
      })
    );
  }

  private getElapsedTimeSec(quant: QuantificationSummary): number {
    const started = quant.status?.startUnixTimeSec || 0;
    let end = Math.floor(Date.now() / 1000);

    // If it's completed, show how long it ran for
    if (quant.status?.status == JobStatus_Status.COMPLETE || quant.status?.status == JobStatus_Status.ERROR) {
      end = quant.status.endUnixTimeSec;
    }

    return end - started;
  }

  onClickLog(logName: string): void {
    const content$ = this._cachedDataService.getQuantLog(QuantLogGetReq.create({ quantId: this.selectedQuantId, logName: logName })).pipe(
      map((resp: QuantLogGetResp) => {
        return resp.logData;
      })
    );

    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = new TextFileViewingDialogData(logName, content$, false, 0);

    const dialogRef = this._dialog.open(TextFileViewingDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(
      () => {},
      err => {
        console.error(err);
      }
    );
  }

  onViewQuantCSV(quantId: string) {
    const content$ = this._cachedDataService.getQuantRawCSV(QuantRawDataGetReq.create({ quantId: this.selectedQuantId })).pipe(
      map((resp: QuantRawDataGetResp) => {
        return resp.data;
      })
    );

    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = new TextFileViewingDialogData(this.summary?.params?.userParams?.name || quantId, content$, true, 1);

    const dialogRef = this._dialog.open(TextFileViewingDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(
      () => {},
      err => {
        console.error(err);
      }
    );
  }

  getLogName(link: string): string {
    const justLink = link.split("?")[0];
    const bits = justLink.split("/");
    return bits[bits.length - 1];
  }

  onCloseBtn() {
    this.onClose.emit();
  }
}
