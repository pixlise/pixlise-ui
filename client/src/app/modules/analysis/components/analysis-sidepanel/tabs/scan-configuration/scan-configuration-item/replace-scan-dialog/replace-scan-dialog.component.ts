import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { DuplicateDatasetProducts, WorkspaceService } from "../../../../../../services/workspaces.service";
import { AnalysisLayoutService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScreenConfiguration } from "../../../../../../../../generated-protos/screen-configuration";
import { SearchableListItem } from "../../../../../../../pixlisecore/components/atoms/searchable-list/searchable-list.component";
import { ScanImage } from "../../../../../../../../generated-protos/image";
import { APICachedDataService } from "../../../../../../../pixlisecore/services/apicacheddata.service";
import { ScanListReq } from "../../../../../../../../generated-protos/scan-msgs";
import { ScanItem } from "../../../../../../../../generated-protos/scan";

export type ReplaceScanDialogData = {
  scanId: string;
};

@Component({
  standalone: false,
  selector: "replace-scan-dialog",
  templateUrl: "./replace-scan-dialog.component.html",
  styleUrls: ["./replace-scan-dialog.component.scss"],
})
export class ReplaceScanDialogComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  loading: boolean = false;
  private _newWorkspace: ScreenConfiguration | null = null;

  idReplacements: { [id: string]: string } = {};

  allScans: ScanItem[] = [];
  allScanSearchableItems: SearchableListItem[] = [];
  addScanList: SearchableListItem[] = [];

  productsByDataset: { [datasetId: string]: DuplicateDatasetProducts } = {};
  datasetProduct: DuplicateDatasetProducts | null = null;
  searchableImagesForScan: { [scanId: string]: SearchableListItem[] } = {};
  searchableQuantsForScans: { [scanId: string]: SearchableListItem[] } = {};
  searchableRoisForScans: { [scanId: string]: SearchableListItem[] } = {};

  constructor(
    public dialogRef: MatDialogRef<ReplaceScanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReplaceScanDialogData,
    private _workspaceService: WorkspaceService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackbarService: SnackbarService,
    private _cachedDataService: APICachedDataService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._cachedDataService.getScanList(ScanListReq.create()).subscribe(scanList => {
        this.allScans = scanList.scans;
        this.allScanSearchableItems = [
          ...WorkspaceService.DEFAULT_DUPLICATE_OPTIONS,
          ...scanList.scans.map(scan => ({
            icon: "assets/icons/datasets.svg",
            id: scan.id,
            name: this._analysisLayoutService.getScanName(scan),
          })),
        ];
      })
    );

    this.loading = true;
    this._subs.add(
      this._analysisLayoutService.activeScreenConfigurationId$.subscribe(activeId => {
        if (!activeId) {
          this._newWorkspace = ScreenConfiguration.create();
          this.loading = false;
          return;
        }

        this._workspaceService.fetchWorkspaceProducts(activeId).subscribe({
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
                accordionOpen: true,
                scanItem: datasetProducts.scanItem,
                scanName: datasetProducts.scanName,
              };
              this.searchableImagesForScan[datasetId] = datasetProducts.searchableImages;
              this.searchableQuantsForScans[datasetId] = datasetProducts.searchableQuants;
              this.searchableRoisForScans[datasetId] = datasetProducts.searchableROIs;
            });

            this.datasetProduct = this.productsByDataset[this.data.scanId];
          },
          error: err => {
            this.loading = false;
            console.error(err);
            this._snackbarService.openError("Failed to load workspace");
          },
        });
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onSearchAddScanList(text: string) {
    this.addScanList = this.allScanSearchableItems.filter(scan => scan.name.toLowerCase().includes(text.toLowerCase()));
  }

  replaceScan(oldId: string, newId: string): void {
    this._workspaceService
      .replaceScan(
        this.idReplacements,
        this.productsByDataset,
        this.searchableRoisForScans,
        this.searchableQuantsForScans,
        this.searchableImagesForScan,
        oldId,
        newId
      )
      .subscribe(({ idReplacements, duplicateProducts, searchableROIsForScans, searchableQuantsForScans, searchableImagesForScans }) => {
        this.idReplacements = idReplacements;
        this.productsByDataset = duplicateProducts;
        this.searchableRoisForScans = searchableROIsForScans;
        this.searchableQuantsForScans = searchableQuantsForScans;
        this.searchableImagesForScan = searchableImagesForScans;

        this.datasetProduct!.accordionOpen = true;
        this.productsByDataset[this.data.scanId] = this.datasetProduct!;
      });
  }

  getImageName(image: ScanImage) {
    return image.imagePath.split("/").pop() || "";
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    let workspace = this._newWorkspace;
    if (!workspace) {
      return;
    }

    Object.entries(this.idReplacements).forEach(([oldId, newId]) => {
      if (newId === "remove") {
        workspace = this._analysisLayoutService.removeIdFromScreenConfiguration(workspace!, oldId);
      } else if (newId !== "no-replace") {
        workspace = this._analysisLayoutService.replaceIdInScreenConfiguration(workspace!, oldId, newId);
      }
    });

    let scanId = this._analysisLayoutService.defaultScanIdFromRoute || undefined;

    let originalId = workspace.id;
    workspace.id = "";

    // Remove all ids from widgets as we don't want to duplicate them
    workspace.layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        widget.id = "";
      });
    });

    // Create new workspace
    this._analysisLayoutService.writeScreenConfiguration(workspace!, undefined, true, response => {
      if (!response) {
        return;
      }

      let tempId = response.id;

      response.id = originalId;
      // Update existing workspace with new workspace
      this._analysisLayoutService.writeScreenConfiguration(response, scanId, true, originalWorkspace => {
        // Delete the temp workspace
        this._analysisLayoutService.deleteScreenConfiguration(
          tempId,
          () => {
            this._snackbarService.openSuccess(`Scan replaced successfully`);
            this.dialogRef.close({
              workspace: response,
            });
          },
          true
        );
      });
    });
  }
}
