import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { JobGroupConfig, JobStatus } from 'src/app/generated-protos/job';
import { QuantificationSummary } from 'src/app/generated-protos/quantification-meta';
import { ScanListReq } from 'src/app/generated-protos/scan-msgs';
import { getQuantifiedElements, QuantModes } from 'src/app/models/Quantification';
import { APICachedDataService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { periodicTableDB } from 'src/app/periodic-table/periodic-table-db';

@Component({
  selector: 'quant-job-view',
  standalone: false,
  templateUrl: './quant-job.component.html',
  styleUrls: ['./quant-job.component.scss', '../general-job/general-job.component.scss']
})
export class QuantJobComponent implements OnInit, OnDestroy, OnChanges {
  private _subs = new Subscription();
  @Input() job!: JobStatus;
  @Input() config?: JobGroupConfig;
  @Input() quantSummary?: QuantificationSummary;

  elementStateType = "";
  ignoreAr = "";
  quantMode = "";
  extraParams = "";
  includeDwells = "";
  regionsQuantified = "";
  scanForJob = "";
  requestedElements = "";
  quantifiedElements = "";
  outputElements = "";

  constructor(private _cachedDataService: APICachedDataService) {}

  ngOnInit() {
    this.getQuantValues();
  }

  ngOnChanges(changes: any) {
    this.getQuantValues();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private getQuantValues() {
    this.requestedElements = this.job.elements.join(", ");

    if (this.config) {
      this.scanForJob = this.config.associatedScanId;

      // Find the scan and get some more printable niceness
      if (this.config.associatedScanId) {
        this._subs.add(
          this._cachedDataService.getScanList(ScanListReq.create({
            searchFilters: { scanId: this.config.associatedScanId },
          })
        ).subscribe(resp => {
          if (resp.scans && resp.scans.length == 1) {
            if (resp.scans[0].title) {
              this.scanForJob = `${resp.scans[0].title}`;
            }
          }
        }));
      }
    }

    if (!this.quantSummary) {
      return;
    }

    this.quantifiedElements = this.quantSummary.elements.join(", ");

    this.regionsQuantified = (this.quantSummary?.params?.userParams?.roiIDs || []).join(", ");
    this.includeDwells = this.quantSummary?.params?.userParams?.includeDwells ? "Yes" : "No";

    const elemInfo = getQuantifiedElements(this.quantSummary);
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
    
    this.outputElements = allSymbols.join(", ");
    
    this.quantMode = QuantModes.getShortDescription(this.quantSummary.params?.userParams?.quantMode || "");

    this.extraParams = this.quantSummary.params?.userParams?.parameters || "(None specified)";
  }

  // TODO: Show piquant log file links???
}