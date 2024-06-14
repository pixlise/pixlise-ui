import { Component, OnInit } from "@angular/core";
import { TabSelectors } from "../tab-selectors";
import { APIDataService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { JobListReq, JobListResp } from "src/app/generated-protos/job-msgs";
import { Subscription } from "rxjs";
import { JobStatus, JobStatus_JobType, JobStatus_Status, jobStatus_StatusToJSON } from "src/app/generated-protos/job";
import { QuantGetReq, QuantGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { WSError } from "src/app/modules/pixlisecore/services/wsMessageHandler";
import { QuantModes, getQuantifiedElements } from "src/app/models/Quantification";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { ActivatedRoute, Router } from "@angular/router";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { QuantCreateUpd } from "src/app/generated-protos/quantification-create";

const SelectQuantText = "Select a quantification job";

@Component({
  selector: TabSelectors.tabQuantJobs,
  templateUrl: "./quant-jobs.component.html",
  styleUrls: ["./quant-jobs.component.scss"],
})
export class QuantJobsComponent implements OnInit {
  private _subs = new Subscription();
  jobs: JobStatus[] = [];
  selectedQuantId: string = "";
  summary: QuantificationSummary | null = null;
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

  constructor(
    //private _roiService: ROIService,
    private _cachedDataService: APICachedDataService,
    private _dataService: APIDataService,
    private _router: Router,
    private _route: ActivatedRoute,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService
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
    this.message = "";

    // Find if this is in progress
    for (const job of this.jobs) {
      if (job.jobId == quantId) {
        if (job.status != JobStatus_Status.COMPLETE && job.status != JobStatus_Status.ERROR) {
          this.message = "Can't display details, quantification is still running...";
          return;
        }
        break;
      }
    }
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

  private updateROIName(): void {
    this.roiName = "";

    if (this.summary?.params?.userParams?.roiIDs.length || 0 > 0) {
      this._cachedDataService
        .getRegionOfInterest(RegionOfInterestGetReq.create({ id: this.summary!.params!.userParams!.roiIDs[0] }))
        .subscribe((resp: RegionOfInterestGetResp) => {
          this.roiName = resp.regionOfInterest?.name || "";
        });
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

  onExportQuant(quantId: string) {}

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
    this._router.navigate(["log", logName], { relativeTo: this._route });
  }

  getLogName(link: string): string {
    const justLink = link.split("?")[0];
    const bits = justLink.split("/");
    return bits[bits.length - 1];
  }
}
