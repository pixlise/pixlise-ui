import { Injectable } from "@angular/core";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { RegionOfInterestGetReq, RegionOfInterestListReq, RegionOfInterestWriteReq } from "src/app/generated-protos/roi-msgs";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";

@Injectable({
  providedIn: "root",
})
export class ROIService {
  roiSummaries: Record<string, ROIItemSummary> = {};
  roiItems: Record<string, ROIItem> = {};

  constructor(
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService
  ) {
    this.listROIs();
  }

  listROIs() {
    this._dataService.sendRegionOfInterestListRequest(RegionOfInterestListReq.create({})).subscribe({
      next: res => {
        this.roiSummaries = res.regionsOfInterest;
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
          this.roiItems[id] = res.regionOfInterest;
          console.log(this.roiItems[id], res);
        } else {
          this._snackBarService.openError(`ROI (${id}) not found`);
        }
      },
      error: err => {
        this._snackBarService.openError(err);
      },
    });
  }

  writeROI(newROI: ROIItem, isNewROI: boolean) {
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
        })
      )
      .subscribe({
        next: res => {
          if (res.regionOfInterest) {
            this.roiItems[res.regionOfInterest.id] = res.regionOfInterest;

            // Update summaries
            this.listROIs();

            this._snackBarService.openSuccess(isNewROI ? "ROI created!" : "ROI updated!");
          } else {
            this._snackBarService.openError(isNewROI ? "Failed to create ROI." : `ROI (${newROI.id}) not found`);
          }
        },
        error: err => {
          this._snackBarService.openError(err);
          this.listROIs();
        },
      });
  }

  editROI(newROI: ROIItem) {
    this.writeROI(newROI, false);
  }

  createROI(newROI: ROIItem) {
    this.writeROI(newROI, true);
  }

  deleteROI(id: string) {
    this._dataService.sendRegionOfInterestDeleteRequest(RegionOfInterestGetReq.create({ id })).subscribe({
      next: res => {
        // Remove cached versions
        delete this.roiSummaries[id];
        delete this.roiItems[id];
      },
      error: err => {
        this._snackBarService.openError(err);

        // Re-fetch summaries to verify frontend is in sync
        this.listROIs();
      },
    });
  }
}
