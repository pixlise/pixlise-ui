// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ActivatedRoute, Route, Router } from "@angular/router";
import { Subscription } from "rxjs";

import { AuthService } from "@auth0/auth0-angular";

import { APIDataService, PickerDialogComponent, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanListReq, ScanListResp, ScanListUpd } from "src/app/generated-protos/scan-msgs";
import { ScanDataType, ScanItem } from "src/app/generated-protos/scan";

import { DatasetFilter } from "../../../dataset-filter";
import { AddDatasetDialogComponent } from "../../atoms/add-dataset-dialog/add-dataset-dialog.component";
import { FilterDialogComponent, FilterDialogData } from "../../atoms/filter-dialog/filter-dialog.component";

//import { ViewStateService } from "src/app/services/view-state.service";

//import { PickerDialogComponent, PickerDialogData, PickerDialogItem } from "src/app/UI/atoms/picker-dialog/picker-dialog.component";
import { WidgetSettingsMenuComponent } from "src/app/modules/pixlisecore/pixlisecore.module";
import { HelpMessage } from "src/app/utils/help-message";
import { getMB, httpErrorToString } from "src/app/utils/utils";
import { Permissions } from "src/app/utils/permissions";
import { PickerDialogItem, PickerDialogData } from "src/app/modules/pixlisecore/components/atoms/picker-dialog/picker-dialog.component";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { number } from "mathjs";
import { ImageGetDefaultReq, ImageGetDefaultResp } from "src/app/generated-protos/image-msgs";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { ScanDeleteReq } from "src/app/generated-protos/scan-msgs";
import { ScanDeleteResp } from "src/app/generated-protos/scan-msgs";
import { ScanInstrument } from "src/app/generated-protos/scan";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";

class SummaryItem {
  constructor(
    public label: string,
    public value: string
  ) {}
}

@Component({
  selector: "dataset-tiles-page",
  templateUrl: "./dataset-tiles-page.component.html",
  styleUrls: ["./dataset-tiles-page.component.scss"],
})
export class DatasetTilesPageComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  // Unfortunately we had to include this hack again :(
  @ViewChild("openOptionsButton") openOptionsButton: ElementRef | undefined;

  _searchString: string = "";

  public scans: ScanItem[] = [];
  public filteredScans: ScanItem[] = [];

  scanDefaultImages: Map<string, string> = new Map<string, string>();

  datasetListingAllowed: boolean = true;

  selectedScan: ScanItem | null = null;

  selectedScanSummaryItems: SummaryItem[] = [];
  selectedScanTrackingItems: SummaryItem[] = [];
  selectedMissingData: string = "";
  selectedScanContextImage: string = "";

  errorString: string = "";
  loading = false;

  noselectedScanMsg = HelpMessage.NO_SELECTED_DATASET;

  private _allGroups: string[] = [];
  private _selectedGroups: string[] = [];
  private _userCanEdit: boolean = false;

  private _filter: DatasetFilter = new DatasetFilter(null, null, null, null, null, null, null, null, null, null, null);

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService,
    private _endpointsService: APIEndpointsService,
    //private _viewStateService: ViewStateService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _authService: AuthService,
    public dialog: MatDialog,
    private _snackService: SnackbarService
  ) {}

  ngOnInit() {
    this._subs.add(
      this._authService.idTokenClaims$.subscribe({
        next: claims => {
          if (claims) {
            // This all went unused during public user feature additions
            if (Permissions.permissionCount(claims) <= 0) {
              // User has no permissions at all, admins would've set them this way!
              // this.setDatasetListingNotAllowedError(HelpMessage.AWAITING_ADMIN_APPROVAL);
            } else {
              // If the user is set to have no permissions, we show that error and don't bother requesting
              //if (Permissions.hasPermissionSet(claims, Permissions.permissionNone)) {
              // Show a special error in this case - user has been set to have no permissions
              // this.setDatasetListingNotAllowedError(HelpMessage.NO_PERMISSIONS);
              /*} else*/ {
                // Don't have no-permission set, so see if the user is allowed to access any groups
                // this._allGroups = Permissions.getGroupsPermissionAllows(claims);
                this._selectedGroups = Array.from(this._allGroups);
                // if(this._allGroups.length <= 0)
                // {
                //     this.setDatasetListingNotAllowedError(HelpMessage.NO_DATASET_GROUPS);
                // }
              }

              this._userCanEdit = Permissions.hasPermissionSet(claims, Permissions.permissionEditDataset);
            }
          }
        },
        error: err => {
          this.setDatasetListingNotAllowedError(HelpMessage.GET_CLAIMS_FAILED);
        },
      })
    );

    this._subs.add(
      this._dataService.scanListUpd$.subscribe((upd: ScanListUpd) => {
        this.onSearch();
      })
    );

    this.clearSelection();
    this.onSearch();
  }

  ngOnDestroy() {
    this.closeOpenOptionsMenu();
    this._subs.unsubscribe();
  }

  get showOpenOptions(): boolean {
    return this._userCanEdit; // NOTE: this used to look at wether the user is a "public" user
  }

  get userCanEdit(): boolean {
    return this._userCanEdit;
  }

  get selectedIsIncomplete(): boolean {
    return this.selectedMissingData.length > 0;
  }

  get filterCount(): number {
    return this._filter.itemCount();
  }

  get groupCount(): number {
    if (this._selectedGroups.length == this._allGroups.length) {
      // Nothing special about all groups being turned on!
      return 0;
    }

    return this._selectedGroups.length;
  }

  protected setDatasetListingNotAllowedError(err: string): void {
    this.datasetListingAllowed = false;
    this.errorString = err;

    this._snackService.openError(this.errorString);
  }

  onOpen(resetView: boolean): void {
    this._analysisLayoutService.clearScreenConfigurationCache();
    this.closeOpenOptionsMenu();

    if (resetView) {
      if (
        !confirm(
          "Are you sure you want to reset your view to the default for this dataset?\n\nSaved workspaces are not affected, however your last stored view layout, selected regions/expressions on each view, loaded quantification and PMC/pixel selection will be cleared"
        )
      ) {
        return;
      }
    }

    // TODO: replace this...
    //this._viewStateService.setResetFlag(resetView);

    // Clear any existing dataset
    // TODO: replace this if needed
    // this._datasetService.close();

    // Navigating to the URL will trigger the download. This is neat because these URLs are
    // share-able and will open datasets if users are already logged in
    if (this.selectedScan) {
      // this._router.navigateByUrl("dataset/"+this.selectedScan.id+"/analysis");
      this._router.navigate(["analysis"], { relativeTo: this._route, queryParams: { scan_id: this.selectedScan.id } });
    }
  }

  onEdit(): void {
    this.closeOpenOptionsMenu();

    // Switch to the editing tab
    if (this.selectedScan) {
      this._router.navigate(["edit-scan"], { relativeTo: this._route, queryParams: { scan_id: this.selectedScan.id } });
    }
  }

  onDelete(): void {
    this.closeOpenOptionsMenu();

    if (this.selectedScan) {
      const scanTitle = prompt(`Enter the scan title to verify you're deleting the right one`);
      if (scanTitle) {
        this._dataService.sendScanDeleteRequest(ScanDeleteReq.create({ scanId: this.selectedScan.id, scanNameForVerification: scanTitle })).subscribe({
          next: (resp: ScanDeleteResp) => {
            this._snackService.openSuccess(`Scan "${scanTitle}" deleted successfully`);
            this.clearSelection();
          },
          error: err => {
            this._snackService.openError(err);
          },
        });
      }
    }
  }

  onClickTileArea(): void {
    this.clearSelection();
  }

  get searchString(): string {
    return this._searchString;
  }

  set searchString(value: string) {
    this._searchString = value;

    this.filterScans();
  }

  getSearchFields(scan: ScanItem): string[] {
    return [
      scan?.title || null,
      scan?.description || null,
      scan?.instrumentConfig || null,
      scan?.meta?.["Sol"] ?? null,
      scan?.meta?.["Target"] ?? null,
      scan?.meta?.["Site"] ?? null,
      scan?.meta?.["DriveId"] ?? null,
      scan?.meta?.["RTT"] ?? null,
      scan?.meta?.["SCLK"] ?? null,
    ].filter(field => field !== null);
  }

  filterScans() {
    if (this._searchString.length === 0) {
      this.filteredScans = this.scans;
      return;
    }

    // Filter by title, description
    this.filteredScans = this.scans
      .filter(scan => {
        let searchFields = this.getSearchFields(scan);
        return searchFields.some(field => field.toLowerCase().includes(this._searchString.toLowerCase()));
      })
      .sort((scanA, scanB) => {
        let scanASearchFields = this.getSearchFields(scanA);
        let scanBSearchFields = this.getSearchFields(scanB);

        // Sort by matching order and then alphabetically
        let aMatch = scanASearchFields.findIndex(field => field.toLowerCase().includes(this._searchString.toLowerCase()));
        let bMatch = scanBSearchFields.findIndex(field => field.toLowerCase().includes(this._searchString.toLowerCase()));

        if (aMatch == bMatch) {
          return scanA.title.localeCompare(scanB.title);
        } else {
          return aMatch - bMatch;
        }
      });
  }

  onSearch(): void {
    this.scans = [];
    this.errorString = "Fetching Scans...";

    let searchString = this._filter.toSearchString();

    // Combine groups if we need to
    if (this._allGroups.length != this._selectedGroups.length) {
      const groupStr = this._selectedGroups.join("|");
      searchString = DatasetFilter.appendTerm(searchString, "group_id=" + groupStr);
    }

    // Finally, add the title text search string
    if (this._searchString.length > 0) {
      searchString = DatasetFilter.appendTerm(searchString, "title=" + this._searchString);
    }

    // TODO: we don't actually use the filtering stuff, search string needs to change for API
    // because we have multiple fields we can specify now...
    this.loading = true;
    this._dataService.sendScanListRequest(ScanListReq.create({})).subscribe({
      next: (resp: ScanListResp) => {
        this.loading = false;
        this.errorString = "";

        this.scans = resp.scans;
        this.sortScans(this.scans);
        this.filterScans();
        if (this.scans.length <= 0) {
          this.errorString = HelpMessage.NO_DATASETS_FOUND;
        }

        const scanIds = this.scans.map(item => item.id);
        this.getDefaultImages(scanIds);
      },
      error: err => {
        this.loading = false;
        console.error(err);

        // Display the error text that came back, might be useful
        this.errorString = httpErrorToString(err, "Search Error");
        this._snackService.openError(this.errorString);

        this.scans = [];
      },
    });
  }

  private getDefaultImages(scanIds: string[]) {
    this._cachedDataService.getDefaultImage(ImageGetDefaultReq.create({ scanIds: scanIds })).subscribe((resp: ImageGetDefaultResp) => {
      this.scanDefaultImages.clear();
      for (const id of Object.keys(resp.defaultImagesPerScanId)) {
        this.scanDefaultImages.set(id, resp.defaultImagesPerScanId[id]);
      }
    });
  }

  private getSortValue(a: any, b: any): number {
    if (a < b) {
      return 1;
    } else if (a > b) {
      return -1;
    }
    return 0;
  }

  private sortScans(scans: ScanItem[]) {
    // First, sort datasets by SOL alphabetically, because we have some starting with letters to denote
    // that they are test datasets. Then we sort numerically within the lettered sections
    scans.sort((a: ScanItem, b: ScanItem) => {
      // If there is a sol on both...
      const aSol = a.meta["Sol"] || "",
        bSol = b.meta["Sol"] || "";

      if (aSol === bSol && aSol.length > 0) {
        // Don't let empty strings all fall into here!
        // They're equal, sort by name
        return this.getSortValue(a.title, b.title);
      }

      // If they don't match and one is empty, put empty at the end always
      if (aSol != bSol) {
        if (aSol.length <= 0) {
          // a is empty, goes last
          return 1;
        } else if (bSol.length <= 0) {
          // b is empty, goes last
          return -1;
        }
      }

      // SOLs are strings, and can start with letters. We want the letter part alphabetically sorted, and any numbers
      // after it sorted numerically
      const aLetter = aSol.length > 0 && Number.isNaN(Number.parseInt(aSol[0])) ? aSol[0] : "";
      const bLetter = bSol.length > 0 && Number.isNaN(Number.parseInt(bSol[0])) ? bSol[0] : "";

      const aSolNum = Number.parseInt(aSol.substring(aLetter.length));
      const bSolNum = Number.parseInt(bSol.substring(bLetter.length));

      // If neither or both have the same letter, sort by number
      if (aLetter == bLetter) {
        return this.getSortValue(aSolNum, bSolNum);
      }

      // The one with no letter goes first
      if (aLetter.length <= 0 && bLetter.length > 0) {
        return -1;
      }

      if (aLetter.length > 0 && bLetter.length <= 0) {
        return 1;
      }

      return this.getSortValue(aLetter, bLetter);
    });
  }

  onFilters(event: MouseEvent): void {
    const dialogConfig = new MatDialogConfig();

    const filter = this._filter.copy();
    dialogConfig.data = new FilterDialogData(filter, new ElementRef(event.currentTarget));

    const dialogRef = this.dialog.open(FilterDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: DatasetFilter) => {
      if (result) {
        this._filter = result;
        this.onSearch();
      }
    });
  }

  onGroups(event: MouseEvent): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.backdropClass = "empty-overlay-backdrop";

    const items: PickerDialogItem[] = [];
    items.push(new PickerDialogItem("", "Groups", "", true));

    for (const perm of this._allGroups) {
      items.push(new PickerDialogItem(perm, perm, "", true));
    }

    dialogConfig.data = new PickerDialogData(true, false, false, false, items, this._selectedGroups, "", new ElementRef(event.currentTarget));

    const dialogRef = this.dialog.open(PickerDialogComponent, dialogConfig);
    dialogRef.componentInstance.onSelectedIdsChanged.subscribe((ids: string[]) => {
      if (ids) {
        this._selectedGroups = ids;
        this.onSearch();
      }
    });
  }

  onSelect(event: ScanItem): void {
    this.selectedScan = event;
    this.selectedScanContextImage = "";

    // Fill these so they display
    this.selectedScanSummaryItems = [
      new SummaryItem("Description:", this.selectedScan.description ? this.selectedScan.description : "(empty)"),
      new SummaryItem("Detector:", this.selectedScan.instrumentConfig),
      new SummaryItem("Bulk Sum:", this.spectraCount(this.selectedScan.contentCounts["BulkSpectra"])),
      new SummaryItem("Max Value:", this.spectraCount(this.selectedScan.contentCounts["MaxSpectra"])),
      new SummaryItem("Normal Spectra:", this.spectraCount(this.selectedScan.contentCounts["NormalSpectra"])),
      new SummaryItem("Dwell Spectra:", this.spectraCount(this.selectedScan.contentCounts["DwellSpectra"])),
      new SummaryItem("Pseudo intensities:", this.spectraCount(this.selectedScan.contentCounts["PseudoIntensities"])),
    ];

    for (const sdt of this.selectedScan.dataTypes) {
      if (sdt.dataType == ScanDataType.SD_IMAGE) {
        new SummaryItem("MCC Images:", sdt.count.toString());
      } else if (sdt.dataType == ScanDataType.SD_XRF) {
        new SummaryItem("PMCs:", sdt.count.toString());
      } else if (sdt.dataType == ScanDataType.SD_RGBU) {
        new SummaryItem("RGBU Images:", sdt.count.toString());
      }
    }

    let createTime = "Unknown";
    if (this.selectedScan.timestampUnixSec) {
      const dtFormat = new Intl.DateTimeFormat("en-GB", {
        //'dateStyle': 'medium',
        //'timeStyle': 'medium',
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        //timeZone: 'UTC'
      });

      createTime = dtFormat.format(new Date(this.selectedScan.timestampUnixSec * 1000));
    }

    this.selectedScanSummaryItems.push(new SummaryItem("Updated Time:", createTime));

    this.selectedScanTrackingItems = [
      new SummaryItem("Target Name:", this.selectedScan.meta["Target"] || ""),
      new SummaryItem("Site:", this.selectedScan.meta["Site"] || ""),
      new SummaryItem("Sol:", this.selectedScan.meta["Sol"] || ""),
      new SummaryItem("Drive:", this.selectedScan.meta["DriveId"] || ""),
      new SummaryItem("RTT:", this.selectedScan.meta["RTT"] || ""),
      new SummaryItem("SCLK:", this.selectedScan.meta["SCLK"] || ""),
      new SummaryItem("PIXLISE ID:", this.selectedScan.id),
    ];

    // TODO:
    const missing = ""; //DataSetSummary.listMissingData(this.selectedScan);
    this.selectedMissingData = missing.length > 0 ? "Dataset likely missing: " + Array.from(missing).join(",") : "";

    // Load full-sized context image
    if (this.selectedScan) {
      const img = this.scanDefaultImages.get(this.selectedScan.id);
      if (img) {
        // Load the image
        this.selectedScanContextImage = "?"; // Set to 1 so we show spinner

        this._endpointsService.loadImageForPath(img).subscribe((img: HTMLImageElement) => {
          this.selectedScanContextImage = img.src;
        });
      }
    }
  }

  onAddScan(): void {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    //dialogConfig.autoFocus = true;
    //dialogConfig.width = '1200px';

    //dialogConfig.data = ;
    const dialogRef = this.dialog.open(AddDatasetDialogComponent, dialogConfig);
    /* We used to re-run search, now we rely on ScanListUpd coming through
    dialogRef.afterClosed().subscribe(() => {
      // Refresh scans in the near future, it should have appeared
      setTimeout(() => {
        this.onSearch();
      }, 2000);
    });
    */
  }

  private spectraCount(count: number): string {
    if (count <= 0) {
      return "None";
    }
    return count.toString();
  }

  private clearSelection(): void {
    this.selectedScan = null;

    this.selectedScanSummaryItems = [];
    this.selectedScanTrackingItems = [];
  }

  private closeOpenOptionsMenu(): void {
    if (this.openOptionsButton && this.openOptionsButton instanceof WidgetSettingsMenuComponent) {
      (this.openOptionsButton as WidgetSettingsMenuComponent).close();
    }
  }
}
