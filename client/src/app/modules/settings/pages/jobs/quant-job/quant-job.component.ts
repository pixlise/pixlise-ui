import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { map, Subscription } from 'rxjs';
import { JobConfig, JobFilePath, JobGroupConfig, JobStatus } from 'src/app/generated-protos/job';
import { QuantificationSummary } from 'src/app/generated-protos/quantification-meta';
import { ScanListReq } from 'src/app/generated-protos/scan-msgs';
import { getQuantifiedElements, QuantModes } from 'src/app/models/Quantification';
import { APICachedDataService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { periodicTableDB } from 'src/app/periodic-table/periodic-table-db';
import { flattenJobConfig } from '../../../models/jobs.model';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { QuantLogGetReq, QuantLogGetResp } from 'src/app/generated-protos/quantification-retrieval-msgs';
import { TextFileViewingDialogData, TextFileViewingDialogComponent } from 'src/app/modules/pixlisecore/components/atoms/text-file-viewing-dialog/text-file-viewing-dialog.component';
import { JobOutputGetReq, JobOutputGetResp } from 'src/app/generated-protos/job-msgs';

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

  nodeConfigs: JobConfig[] = [];

  constructor(
    private _cachedDataService: APICachedDataService,
    private _dialog: MatDialog
  ) {}

  ngOnInit() {
    this.getQuantValues();
    this.showLogFiles();
  }

  ngOnChanges(changes: any) {
    this.getQuantValues();
    this.showLogFiles();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  printableFileName(name: string): string {
    const pos = name.indexOf(this.job.jobId);
    if (pos > -1) {
      return name.substring(pos+this.job.jobId.length+1);
    }
    return name;
  }

  onViewFile(nodeIndex: number, file: JobFilePath) {
    // View the file...
    const content$ = this._cachedDataService.getJobOutputFile(
      JobOutputGetReq.create({ jobId: this.job.jobId, nodeIndex: nodeIndex, filePath: file.remotePath })
    ).pipe(
      map((resp: JobOutputGetResp) => {
        return new TextDecoder().decode(resp.content);
      })
    );

    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = new TextFileViewingDialogData(
      `Node: ${nodeIndex}, File: ${this.printableFileName(file.remotePath)}`,
      content$,
      file.remotePath.toLocaleLowerCase().endsWith("csv"),
      0
    );

    const dialogRef = this._dialog.open(TextFileViewingDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe({
      next: () => {},
      error: err => {
        console.error(err);
      }
    });
  }

  private showLogFiles() {
    // If the job config has uploaded files that we could display, put them in the list
    if(this.config?.nodeConfig) {
      for (let c = 0; c < this.config.nodeCount; c++) {
        for (let out of this.config.nodeConfig.outputFiles) {
          const nodeCfg = flattenJobConfig(this.config.nodeConfig, c);
          this.nodeConfigs.push(nodeCfg);
        }
      }
    }
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
}