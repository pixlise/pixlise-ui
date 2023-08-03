import { Injectable } from "@angular/core";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { RegionOfInterestGetReq, RegionOfInterestListReq, RegionOfInterestWriteReq } from "src/app/generated-protos/roi-msgs";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";

@Injectable({
  providedIn: "root"
})
export class ROIService {

  roiSummaries: Record<string, ROIItemSummary> = {};
  roiItems: Record<string, ROIItem> = {};

  constructor(
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService,
  ) {
    this.listROIs();
  }

  listROIs() {
    this._dataService.sendRegionOfInterestListRequest(RegionOfInterestListReq.create({})).subscribe({
      next: (res) => {
        this.roiSummaries = res.regionsOfInterest;
      },
      error: (err) => {
        this._snackBarService.openError(err);
      }
    });
  }

  fetchROI(id: string) {
    this._dataService.sendRegionOfInterestGetRequest(RegionOfInterestGetReq.create({ id })).subscribe({
      next: (res) => {
        if (res.regionOfInterest) {
          this.roiItems[id] = res.regionOfInterest;
          console.log(this.roiItems[id], res)
        } else {
          this._snackBarService.openError(`ROI (${id}) not found`);
        }
      },
      error: (err) => {
        this._snackBarService.openError(err);
      }
    });
  }

  editROI(newROI: ROIItem) {
    if (!newROI) {
      this._snackBarService.openError("ROI not found!");
      return;
    }

    this._dataService.sendRegionOfInterestWriteRequest(RegionOfInterestWriteReq.create({
      regionOfInterest: ROIItem.create(newROI)
    })).subscribe({
      next: (res) => {
        if (res.regionOfInterest) {
          this.roiItems[res.regionOfInterest.id] = res.regionOfInterest;
          this.listROIs();
          this._snackBarService.openSuccess("ROI updated!");
        } else {
          this._snackBarService.openError(`ROI (${newROI.id}) not found`);
        }
      },
      error: (err) => {
        this._snackBarService.openError(err);
      }
    });
  }

  createROI(newROI: ROIItem) {
    if (!newROI) {
      this._snackBarService.openError("Cannot create empty ROI.");
      return;
    }

    this._dataService.sendRegionOfInterestWriteRequest(RegionOfInterestWriteReq.create({
      regionOfInterest: ROIItem.create(newROI)
    })).subscribe({
      next: (res) => {
        if (res.regionOfInterest) {
          this.roiItems[res.regionOfInterest.id] = res.regionOfInterest;
          this.listROIs();
          this._snackBarService.openSuccess("ROI created!");
        } else {
          this._snackBarService.openError("Failed to create ROI.");
        }
      },
      error: (err) => {
        this._snackBarService.openError(err);
      }
    });
  }

}
