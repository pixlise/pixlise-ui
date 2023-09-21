import { Injectable } from "@angular/core";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { RegionOfInterestBulkWriteReq, RegionOfInterestGetReq, RegionOfInterestListReq, RegionOfInterestWriteReq } from "src/app/generated-protos/roi-msgs";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { SearchParams } from "src/app/generated-protos/search-params";
import { BehaviorSubject } from "rxjs";

export type ROISummaries = Record<string, ROIItemSummary>;

@Injectable({
  providedIn: "root",
})
export class ROIService {
  roiSummaries$ = new BehaviorSubject<ROISummaries>({});
  roiItems$ = new BehaviorSubject<Record<string, ROIItem>>({});
  mistROIsByScanId$ = new BehaviorSubject<Record<string, ROISummaries>>({});

  constructor(
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService
  ) {
    this.listROIs();
  }

  listROIs() {
    this.searchROIs(SearchParams.create({}), false);
  }

  listMistROIs(scanId: string) {
    this.searchROIs(SearchParams.create({ scanId }), true);
  }

  searchROIs(searchParams: SearchParams, isMIST: boolean = false) {
    this._dataService.sendRegionOfInterestListRequest(RegionOfInterestListReq.create({ searchParams, isMIST })).subscribe({
      next: res => {
        this.roiSummaries$.next({ ...this.roiSummaries$.value, ...res.regionsOfInterest });

        if (isMIST && searchParams.scanId) {
          this.mistROIsByScanId$.value[searchParams.scanId] = res.regionsOfInterest;
          this.mistROIsByScanId$.next(this.mistROIsByScanId$.value);
        }
      },
      error: err => {
        this._snackBarService.openError(err);
      },
    });
  }

  fetchROI(id: string) {
    this._dataService.sendRegionOfInterestGetRequest(RegionOfInterestGetReq.create({ id })).subscribe({
      next: res => {
        if (res.regionOfInterest) {
          this.roiItems$.value[id] = res.regionOfInterest;
          this.roiItems$.next(this.roiItems$.value);
        } else {
          this._snackBarService.openError(`ROI (${id}) not found`);
        }
      },
      error: err => {
        this._snackBarService.openError(err);
      },
    });
  }

  formSummaryFromROI(roi: ROIItem): ROIItemSummary {
    return ROIItemSummary.create({
      id: roi.id,
      scanId: roi.scanId,
      name: roi.name,
      description: roi.description,
      imageName: roi.imageName,
      tags: roi.tags,
      modifiedUnixSec: roi.modifiedUnixSec,
      mistROIItem: roi.mistROIItem,
      owner: roi.owner,
      isMIST: roi.isMIST,
    });
  }

  writeROI(newROI: ROIItem, isNewROI: boolean, updateSummary: boolean = true) {
    if (!newROI) {
      this._snackBarService.openError(isNewROI ? "Cannot create empty ROI." : "ROI not found!");
      return;
    }

    // Have to remove owner field to write
    newROI.owner = undefined;

    this._dataService
      .sendRegionOfInterestWriteRequest(
        RegionOfInterestWriteReq.create({
          regionOfInterest: ROIItem.create(newROI),
          isMIST: newROI.mistROIItem ? true : false,
        })
      )
      .subscribe({
        next: res => {
          if (res.regionOfInterest) {
            this.roiItems$.value[res.regionOfInterest.id] = res.regionOfInterest;
            this.roiItems$.next(this.roiItems$.value);

            if (updateSummary) {
              this.roiSummaries$.value[res.regionOfInterest.id] = this.formSummaryFromROI(res.regionOfInterest);
              this.roiSummaries$.next(this.roiSummaries$.value);

              this.mistROIsByScanId$.value[res.regionOfInterest.scanId][res.regionOfInterest.id] = this.formSummaryFromROI(res.regionOfInterest);
              this.mistROIsByScanId$.next(this.mistROIsByScanId$.value);
            }

            this._snackBarService.openSuccess(isNewROI ? "ROI created!" : "ROI updated!");
          } else {
            this._snackBarService.openError(isNewROI ? "Failed to create ROI." : `ROI (${newROI.id}) not found`);
          }
        },
        error: err => {
          this._snackBarService.openError(err);

          if (newROI.isMIST) {
            this.listMistROIs(newROI.scanId);
          } else {
            this.listROIs();
          }
        },
      });
  }

  bulkWriteROIs(regionsOfInterest: ROIItem[], overwrite: boolean, isMIST: boolean, mistROIScanIdsToDelete: string[] = []) {
    this._dataService
      .sendRegionOfInterestBulkWriteRequest(RegionOfInterestBulkWriteReq.create({ regionsOfInterest, overwrite, isMIST, mistROIScanIdsToDelete }))
      .subscribe({
        next: res => {
          if (res.regionsOfInterest) {
            res.regionsOfInterest.forEach(roi => {
              this.roiItems$.value[roi.id] = roi;

              if (isMIST) {
                let scanId = roi.scanId;
                if (!scanId) {
                  this._snackBarService.openWarning(`ROI (${roi.name}) does not have a scanId! Skipping...`);
                  return;
                }

                if (!this.mistROIsByScanId$.value[scanId]) {
                  this.mistROIsByScanId$.value[scanId] = {};
                }

                roi.isMIST = isMIST;
                this.mistROIsByScanId$.value[scanId][roi.id] = this.formSummaryFromROI(roi);
              }
            });

            this.roiItems$.next(this.roiItems$.value);
            this.mistROIsByScanId$.next(this.mistROIsByScanId$.value);
          } else {
            this._snackBarService.openError(`Failed to bulk write ROIs.`);
          }
        },
        error: err => {
          this._snackBarService.openError(err);
        },
      });
  }

  editROI(newROI: ROIItem, updateSummary: boolean = true) {
    this.writeROI(newROI, false, updateSummary);
  }

  editROISummary(newROISummary: ROIItemSummary) {
    this.writeROI(ROIItem.create(newROISummary), false, true);
  }

  createROI(newROI: ROIItem) {
    this.writeROI(newROI, true);
  }

  deleteROI(id: string) {
    this._dataService.sendRegionOfInterestDeleteRequest(RegionOfInterestGetReq.create({ id })).subscribe({
      next: res => {
        // Remove cached versions
        delete this.roiItems$.value[id];
        this.roiItems$.next(this.roiItems$.value);

        delete this.roiSummaries$.value[id];
        this.roiSummaries$.next(this.roiSummaries$.value);
      },
      error: err => {
        this._snackBarService.openError(err);

        // Re-fetch summaries to verify frontend is in sync
        this.listROIs();
      },
    });
  }
}
