import { Injectable } from "@angular/core";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import {
  RegionOfInterestBulkDuplicateReq,
  RegionOfInterestBulkWriteReq,
  RegionOfInterestDeleteReq,
  RegionOfInterestGetReq,
  RegionOfInterestListReq,
  RegionOfInterestWriteReq,
} from "src/app/generated-protos/roi-msgs";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { SearchParams } from "src/app/generated-protos/search-params";
import { BehaviorSubject } from "rxjs";
import { decodeIndexList, encodeIndexList } from "src/app/utils/utils";

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
          res.regionOfInterest.scanEntryIndexesEncoded = decodeIndexList(res.regionOfInterest.scanEntryIndexesEncoded);
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

    let roiToWrite = ROIItem.create(newROI);

    // Have to remove owner field to write
    roiToWrite.owner = undefined;
    if (roiToWrite.scanEntryIndexesEncoded && roiToWrite.scanEntryIndexesEncoded.length > 0) {
      roiToWrite.scanEntryIndexesEncoded = encodeIndexList(roiToWrite.scanEntryIndexesEncoded);
    }

    this._dataService
      .sendRegionOfInterestWriteRequest(
        RegionOfInterestWriteReq.create({
          regionOfInterest: roiToWrite,
          isMIST: roiToWrite.mistROIItem ? true : false,
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

              if (res.regionOfInterest.isMIST) {
                if (!this.mistROIsByScanId$.value[res.regionOfInterest.scanId]) {
                  this.mistROIsByScanId$.value[res.regionOfInterest.scanId] = {};
                }

                this.mistROIsByScanId$.value[res.regionOfInterest.scanId][res.regionOfInterest.id] = this.formSummaryFromROI(res.regionOfInterest);
                this.mistROIsByScanId$.next(this.mistROIsByScanId$.value);
              }
            }

            this._snackBarService.openSuccess(isNewROI ? "ROI created!" : "ROI updated!");
          } else {
            this._snackBarService.openError(isNewROI ? "Failed to create ROI." : `ROI (${roiToWrite.id}) not found`);
          }
        },
        error: err => {
          this._snackBarService.openError(err);

          if (roiToWrite.isMIST) {
            this.listMistROIs(roiToWrite.scanId);
          } else {
            this.listROIs();
          }
        },
      });
  }

  bulkWriteROIs(regionsOfInterest: ROIItem[], overwrite: boolean, skipDuplicates: boolean, isMIST: boolean, mistROIScanIdsToDelete: string[] = []) {
    let writableROIs = regionsOfInterest.map(roi => {
      let newROI = ROIItem.create(roi);
      newROI.owner = undefined;
      if (newROI.scanEntryIndexesEncoded && newROI.scanEntryIndexesEncoded.length > 0) {
        newROI.scanEntryIndexesEncoded = encodeIndexList(newROI.scanEntryIndexesEncoded);
      }

      return newROI;
    });

    this._dataService
      .sendRegionOfInterestBulkWriteRequest(
        RegionOfInterestBulkWriteReq.create({ regionsOfInterest: writableROIs, overwrite, skipDuplicates, isMIST, mistROIScanIdsToDelete })
      )
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

            this._snackBarService.openSuccess(`Successfully bulk created ${res.regionsOfInterest.length} ROIs!`);
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

  deleteROI(id: string, isMIST: boolean = false) {
    this._dataService.sendRegionOfInterestDeleteRequest(RegionOfInterestDeleteReq.create({ id, isMIST })).subscribe({
      next: res => {
        // Keep scan id so we can remove from mistROIsByScanId
        let scanId = this.roiSummaries$.value[id]?.scanId || this.roiItems$.value[id]?.scanId || "";

        // Remove cached full version
        if (this.roiItems$.value[id]) {
          delete this.roiItems$.value[id];
          this.roiItems$.next(this.roiItems$.value);
        }

        // Remove cached summary
        if (this.roiSummaries$.value[id]) {
          delete this.roiSummaries$.value[id];
          this.roiSummaries$.next(this.roiSummaries$.value);
        }

        // If this is a mist roi, remove cached mist roi summary
        if (isMIST && this.mistROIsByScanId$.value[scanId] && this.mistROIsByScanId$.value[scanId][id]) {
          delete this.mistROIsByScanId$.value[scanId][id];
          this.mistROIsByScanId$.next(this.mistROIsByScanId$.value);
        }

        this._snackBarService.openSuccess("ROI deleted!");
      },
      error: err => {
        this._snackBarService.openError(err);

        // Re-fetch summaries to verify frontend is in sync
        this.listROIs();
      },
    });
  }

  duplicateROIs(ids: string[], isMIST: boolean = false) {
    this._dataService.sendRegionOfInterestBulkDuplicateRequest(RegionOfInterestBulkDuplicateReq.create({ ids, isMIST })).subscribe({
      next: res => {
        if (res.regionsOfInterest) {
          Object.entries(res.regionsOfInterest).forEach(([id, roiSummary]) => {
            this.roiSummaries$.value[id] = roiSummary;
            if (isMIST) {
              let scanId = roiSummary.scanId;
              if (!scanId) {
                this._snackBarService.openWarning(`ROI (${roiSummary.name}) does not have a scanId! Skipping...`);
                return;
              }

              if (!this.mistROIsByScanId$.value[scanId]) {
                this.mistROIsByScanId$.value[scanId] = {};
              }

              roiSummary.isMIST = isMIST;
              this.mistROIsByScanId$.value[scanId][id] = roiSummary;
            }
          });

          this.roiSummaries$.next(this.roiSummaries$.value);
          this.mistROIsByScanId$.next(this.mistROIsByScanId$.value);
          this._snackBarService.openSuccess(`Successfully created ${Object.keys(res.regionsOfInterest).length} ROIs!`);
        } else {
          this._snackBarService.openError(`Failed to duplicate ROIs.`);
        }
      },
      error: err => {
        this._snackBarService.openError(err);
      },
    });
  }
}
