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
import { APIDataService, SnackbarService } from "../../../../pixlisecore/pixlisecore.module";
import { ScreenConfigurationGetReq } from "../../../../../generated-protos/screen-configuration-msgs";
import { QuantGetReq, QuantGetResp } from "../../../../../generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "../../../../../generated-protos/quantification-meta";
import { ROIService } from "../../../../roi/services/roi.service";
import { SearchParams } from "../../../../../generated-protos/search-params";
import { SearchableListItem } from "../../../../pixlisecore/components/atoms/searchable-list/searchable-list.component";
import { levenshteinDistance } from "../../../../../utils/search";
import { ImageGetReq, ImageGetResp, ImageListReq, ImageListResp } from "../../../../../generated-protos/image-msgs";
import { ScanImage } from "../../../../../generated-protos/image";
import { SDSFields } from "../../../../../utils/utils";
import { DuplicateDatasetProducts, WorkspaceService } from "../../../../analysis/services/workspaces.service";

export interface DuplicateWorkspaceDialogData {
  workspace: ScreenConfiguration;
  workspaceId: string;
}

export interface DuplicateWorkspaceDialogResult {
  shouldOpen: boolean;
  workspace: ScreenConfiguration;
}

@Component({
  selector: "duplicate-workspace-dialog",
  templateUrl: "./duplicate-workspace-dialog.component.html",
  styleUrls: ["./duplicate-workspace-dialog.component.scss"],
})
export class DuplicateWorkspaceDialogComponent {
  private _subs = new Subscription();

  workspaceName: string = "";
  workspacePlaceholder: string = "Workspace Name";
  private _newWorkspace: ScreenConfiguration | null = null;

  replaceDataProducts: boolean = false;
  canReplaceDataProducts: boolean = true;

  allScanSearchableItems: SearchableListItem[] = [];
  allScans: ScanItem[] = [];

  searchableImagesForScan: { [scanId: string]: SearchableListItem[] } = {};
  searchableQuantsForScans: { [scanId: string]: SearchableListItem[] } = {};
  searchableRoisForScans: { [scanId: string]: SearchableListItem[] } = {};
  productsByDataset: { [datasetId: string]: DuplicateDatasetProducts } = {};

  idReplacements: { [id: string]: string } = {};

  addScanList: SearchableListItem[] = [];
  private _scanSearchText: string = "";

  public loading: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DuplicateWorkspaceDialogData,
    private _analysisLayoutService: AnalysisLayoutService,
    private _workspaceService: WorkspaceService,
    private _roiService: ROIService,
    private _cachedDataService: APICachedDataService,
    private _apiDataService: APIDataService,
    private _snackbarService: SnackbarService,
    public dialogRef: MatDialogRef<DuplicateWorkspaceDialogComponent, DuplicateWorkspaceDialogResult>
  ) {
    this.workspacePlaceholder = data.workspace.name;
  }

  ngOnInit(): void {
    this.loading = true;

    this._subs.add(
      this._cachedDataService.getScanList(ScanListReq.create()).subscribe(scanList => {
        this.allScans = scanList.scans;
        this.allScanSearchableItems = [
          ...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS,
          ...scanList.scans.map(scan => ({
            icon: "assets/icons/datasets.svg",
            id: scan.id,
            name: this.getScanName(scan),
          })),
        ];
      })
    );

    this._subs.add(
      this._workspaceService.fetchWorkspaceProducts(this.data.workspaceId, this.data.workspace.scanConfigurations).subscribe({
        next: ({ workspace, products }) => {
          if (!workspace) {
            return;
          }

          this.loading = false;
          this._newWorkspace = ScreenConfiguration.create(workspace);

          this.productsByDataset = {};
          Object.entries(products).forEach(([datasetId, datasetProducts]) => {
            this.productsByDataset[datasetId] = {
              rois: datasetProducts.workspaceROIs,
              quants: datasetProducts.workspaceQuants,
              images: datasetProducts.workspaceImages,
              accordionOpen: false,
              scanItem: datasetProducts.scanItem,
              scanName: datasetProducts.scanName,
            };
            this.searchableImagesForScan[datasetId] = datasetProducts.searchableImages;
            this.searchableQuantsForScans[datasetId] = datasetProducts.searchableQuants;
            this.searchableRoisForScans[datasetId] = datasetProducts.searchableROIs;
          });
        },
        error: err => {
          this.loading = false;
          console.error(err);
          this._snackbarService.openError("Failed to load workspace", err);
        },
      })
    );
  }

  getImageName(image: ScanImage) {
    return image.imagePath.split("/").pop() || "";
  }

  replaceScan(scanId: string, newScanId: string): void {
    this._workspaceService
      .replaceScan(
        this.idReplacements,
        this.productsByDataset,
        this.searchableRoisForScans,
        this.searchableQuantsForScans,
        this.searchableImagesForScan,
        scanId,
        newScanId
      )
      .subscribe(({ idReplacements, duplicateProducts, searchableROIsForScans, searchableQuantsForScans, searchableImagesForScans }) => {
        this.idReplacements = idReplacements;
        this.productsByDataset = duplicateProducts;
        this.searchableRoisForScans = searchableROIsForScans;
        this.searchableQuantsForScans = searchableQuantsForScans;
        this.searchableImagesForScan = searchableImagesForScans;
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
    this.addScanList = this.allScanSearchableItems.filter(scan => scan.name.toLowerCase().includes(text.toLowerCase()));
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

  onConfirm(shouldOpen: boolean = false): void {
    if (!this._newWorkspace) {
      return;
    }

    this._newWorkspace.name = this.workspaceName || this.workspacePlaceholder;
    this._newWorkspace.id = "";
    this._newWorkspace.snapshotParentId = "";

    if (this.replaceDataProducts && this.canReplaceDataProducts) {
      Object.entries(this.idReplacements).forEach(([oldId, newId]) => {
        if (newId === "remove") {
          this._newWorkspace = this._analysisLayoutService.removeIdFromScreenConfiguration(this._newWorkspace!, oldId);
        } else if (newId !== "no-replace") {
          this._newWorkspace = this._analysisLayoutService.replaceIdInScreenConfiguration(this._newWorkspace!, oldId, newId);
        }
      });
    }

    // Remove all ids from widgets as we don't want to duplicate them
    this._newWorkspace.layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        widget.id = "";
      });
    });

    this._analysisLayoutService.writeScreenConfiguration(this._newWorkspace, undefined, shouldOpen, response => {
      this._snackbarService.openSuccess(`Workspace ${this._newWorkspace!.name} duplicated successfully`);
      this.dialogRef.close({
        shouldOpen: shouldOpen,
        workspace: response,
      });
    });
  }

  // listen for enter key to confirm
  @HostListener("document:keydown.enter", ["$event"])
  onKeydown(event: any) {
    if (event.key === "Enter") {
      this.onConfirm();
    }
  }
}
