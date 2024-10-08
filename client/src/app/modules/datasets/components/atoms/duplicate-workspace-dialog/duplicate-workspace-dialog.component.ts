import { Component, HostListener, Inject } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { ScreenConfiguration } from "../../../../../generated-protos/screen-configuration";
import { ROIItem, ROIItemSummary } from "../../../../../generated-protos/roi";
import { AnalysisLayoutService } from "../../../../analysis/analysis.module";
import { combineLatest, Observable, of, scan, Subscription } from "rxjs";
import { APICachedDataService } from "../../../../pixlisecore/services/apicacheddata.service";
import { ScanListReq } from "../../../../../generated-protos/scan-msgs";
import { ScanItem } from "../../../../../generated-protos/scan";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "../../../../../generated-protos/roi-msgs";
import { APIDataService } from "../../../../pixlisecore/pixlisecore.module";
import { ScreenConfigurationGetReq } from "../../../../../generated-protos/screen-configuration-msgs";
import { QuantGetReq, QuantGetResp } from "../../../../../generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "../../../../../generated-protos/quantification-meta";
import { ROIService } from "../../../../roi/services/roi.service";
import { SearchParams } from "../../../../../generated-protos/search-params";

export interface DuplicateWorkspaceDialogData {
  workspace: ScreenConfiguration;
  workspaceId: string;
}

export interface DuplicateWorkspaceDialogResult {}

@Component({
  selector: "duplicate-workspace-dialog",
  templateUrl: "./duplicate-workspace-dialog.component.html",
  styleUrls: ["./duplicate-workspace-dialog.component.scss"],
})
export class DuplicateWorkspaceDialogComponent {
  private _subs = new Subscription();

  workspaceName: string = "";
  workspacePlaceholder: string = "Workspace Name";

  replaceDataProducts: boolean = true;
  canReplaceDataProducts: boolean = true;

  allScans: ScanItem[] = [];
  quantsForScans: { [scanId: string]: QuantificationSummary[] } = {};
  roisForScans: { [scanId: string]: ROIItemSummary[] } = {};
  productsByDataset: { [datasetId: string]: { rois: ROIItem[]; quants: QuantificationSummary[]; accordionOpen: boolean; scanItem: ScanItem } } = {};

  idReplacements: { [id: string]: string } = {};

  addScanList: ScanItem[] = [];
  private _scanSearchText: string = "";

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DuplicateWorkspaceDialogData,
    private _analysisLayoutService: AnalysisLayoutService,
    private _roiService: ROIService,
    private _cachedDataService: APICachedDataService,
    private _apiDataService: APIDataService,
    public dialogRef: MatDialogRef<DuplicateWorkspaceDialogComponent, DuplicateWorkspaceDialogResult>
  ) {
    this.workspacePlaceholder = data.workspace.name;
  }

  ngOnInit(): void {
    this._apiDataService.sendScreenConfigurationGetRequest(ScreenConfigurationGetReq.create({ id: this.data.workspaceId })).subscribe(response => {
      let workspace = response?.screenConfiguration;
      if (!workspace) {
        return;
      }

      let workspaceRoiIds = this._analysisLayoutService.getROIIDsFromScreenConfiguration(workspace);

      let roiRequests: Observable<RegionOfInterestGetResp | null>[] = workspaceRoiIds.map(roiId =>
        this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId }))
      );
      if (roiRequests.length === 0) {
        roiRequests.push(of(null));
      }

      let quantRequests: Observable<QuantGetResp | null>[] = [];
      let quantsForScansRequests: Observable<QuantificationSummary[]>[] = [];
      let roisForScansRequests: Observable<Record<string, ROIItemSummary>>[] = [];
      Object.entries(this.data.workspace.scanConfigurations).forEach(([datasetId, scanConfig]) => {
        if (scanConfig.quantId) {
          quantRequests.push(this._cachedDataService.getQuant(QuantGetReq.create({ quantId: scanConfig.quantId })));
        }

        if (datasetId) {
          quantsForScansRequests.push(this._analysisLayoutService.fetchQuantsForScanAsync(datasetId));
          roisForScansRequests.push(this._roiService.searchROIsAsync(SearchParams.create({ scanId: datasetId }), true));
        }
      });

      if (quantRequests.length === 0) {
        quantRequests.push(of(null));
      }

      this._subs.add(
        this._cachedDataService.getScanList(ScanListReq.create()).subscribe(scanList => {
          let scanItems = scanList.scans;
          this.allScans = scanItems;
          this.onSearchAddScanList(this._scanSearchText);

          combineLatest([...roiRequests, ...quantRequests, ...quantsForScansRequests, ...roisForScansRequests]).subscribe(response => {
            let rois = response
              .slice(0, roiRequests.length)
              .map(roi => (roi as RegionOfInterestGetResp)?.regionOfInterest)
              .filter(roi => roi) as ROIItem[];
            let quants = response
              .slice(roiRequests.length, roiRequests.length + quantRequests.length)
              .map(quant => (quant as QuantGetResp)?.summary)
              .filter(quant => quant) as QuantificationSummary[];

            let quantsForScans = response
              .slice(roiRequests.length + quantRequests.length, roiRequests.length + quantRequests.length + quantsForScansRequests.length)
              .map(quants => quants as QuantificationSummary[])
              .filter(quants => quants);

            let roisForScans = response
              .slice(roiRequests.length + quantRequests.length + quantsForScansRequests.length)
              .map(rois => rois as Record<string, ROIItemSummary>);

            roisForScans.forEach((rois, i) => {
              Object.values(rois).forEach(roi => {
                this.roisForScans[roi.scanId] = this.roisForScans[roi.scanId] || [];
                this.roisForScans[roi.scanId].push(roi);
              });
            });

            quantsForScans.forEach((quants, i) => {
              let scanId = quants[0].scanId;
              this.quantsForScans[scanId] = quants;
            });

            Object.entries(this.data.workspace.scanConfigurations).forEach(([datasetId, scanConfig]) => {
              let scanItem = scanItems.find(scan => scan.id === scanConfig.id);
              if (!scanItem) {
                return;
              }

              let roisForDataset = rois.filter(roi => roi.scanId === datasetId);
              let quantsForDataset = quants.filter(quant => quant.scanId === datasetId);

              this.productsByDataset[datasetId] = {
                rois: roisForDataset,
                quants: quantsForDataset,
                accordionOpen: roisForDataset.length > 0 || quants.length > 0,
                scanItem: scanItem,
              };
            });
          });
        })
      );
    });
  }

  get scanSearchText() {
    return this._scanSearchText;
  }

  set scanSearchText(value: string) {
    this._scanSearchText = value;
    this.onSearchAddScanList(value);
  }

  onSearchAddScanList(text: string) {
    this.addScanList = this.allScans.filter(scan => scan.title.toLowerCase().includes(text.toLowerCase()));
  }

  onAddScanSearchClick(evt: any) {
    evt.stopPropagation();
  }

  onScanSearchMenu() {
    const searchBox = document.getElementsByClassName("scan-search");
    if (searchBox.length > 0) {
      (searchBox[0] as any).focus();
    }
  }

  getScanName(scan: ScanItem): string {
    return scan?.meta && scan?.title ? `Sol ${scan.meta["Sol"]}: ${scan.title}` : scan?.title;
  }

  get datasetProducts() {
    return Object.values(this.productsByDataset);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    this.dialogRef.close();
  }

  // listen for enter key to confirm
  @HostListener("document:keydown.enter", ["$event"])
  onKeydown(event: any) {
    if (event.key === "Enter") {
      this.onConfirm();
    }
  }
}
