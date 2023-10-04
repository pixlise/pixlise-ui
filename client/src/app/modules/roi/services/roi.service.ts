import { Injectable } from "@angular/core";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import {
  RegionOfInterestBulkDuplicateReq,
  RegionOfInterestBulkWriteReq,
  RegionOfInterestDeleteReq,
  RegionOfInterestGetReq,
  RegionOfInterestGetResp,
  RegionOfInterestListReq,
  RegionOfInterestWriteReq,
} from "src/app/generated-protos/roi-msgs";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { SearchParams } from "src/app/generated-protos/search-params";
import { BehaviorSubject, Observable, ReplaySubject, map, of, scan, shareReplay } from "rxjs";
import { decodeIndexList, encodeIndexList } from "src/app/utils/utils";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { DEFAULT_ROI_SHAPE, ROIShape, ROI_SHAPES } from "../components/roi-shape/roi-shape.component";
import { COLOURS, ColourOption } from "../models/roi-colors";
import {
  ROIDisplaySettings,
  RegionSettings,
  createDefaultAllPointsRegionSettings,
  createDefaultROIDisplaySettings,
  createDefaultRemainingPointsRegionSettings,
  createDefaultSelectedPointsRegionSettings,
} from "../models/roi-region";
import { RGBA } from "src/app/utils/colours";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

export type ROISummaries = Record<string, ROIItemSummary>;

@Injectable({
  providedIn: "root",
})
export class ROIService {
  roiSummaries$ = new BehaviorSubject<ROISummaries>({});
  roiItems$ = new BehaviorSubject<Record<string, ROIItem>>({});
  mistROIsByScanId$ = new BehaviorSubject<Record<string, ROISummaries>>({});

  // displaySettingsMap$ = new BehaviorSubject<Map<string, ROIDisplaySettings>>(new Map<string, ROIDisplaySettings>()); // Map of ROI ID to display settings
  displaySettingsMap$ = new BehaviorSubject<Record<string, ROIDisplaySettings>>({}); // Map of ROI ID to display settings
  private _scanShapeMap = new Map<string, ROIShape>();
  private _nextScanShapeIdx: number = 0;

  private _regionMap = new Map<string, Observable<RegionSettings>>();
  private _nextColourIdx: number = 0;

  private _shapes: ROIShape[] = ROI_SHAPES;
  private _colours: ColourOption[] = COLOURS;

  constructor(
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService,
    private _cachedDataService: APICachedDataService
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

  getRegionSettings(scanId: string, roiId: string): Observable<RegionSettings> {
    // If we have not encountered this scan before, create the default ROIs for it
    let scanShape = this._scanShapeMap.get(scanId);
    if (!scanShape) {
      scanShape = this.nextScanShape();
      this._scanShapeMap.set(scanId, scanShape);
      this.createDefaultROIs(scanId, scanShape);
    }

    // Now we check if we can service locally from our  map
    let result = this._regionMap.get(`${scanId}_${roiId}`);
    if (result === undefined) {
      // Nothing stored, so get the ROI because we're combining that with the colour/shape we generate
      result = this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId })).pipe(
        map((roiResp: RegionOfInterestGetResp) => {
          if (roiResp.regionOfInterest === undefined) {
            this._snackBarService.openError(`Region Of Interest data not returned from cachedDataService for ${roiId}`);
            throw new Error("regionOfInterest data not returned for " + roiId);
          }

          let roi = new RegionSettings(roiResp.regionOfInterest);

          let displaySettings = this.displaySettingsMap$.value[roiId];
          if (!displaySettings) {
            // Work out a colour for this ROI
            let colour = this.nextColour().rgba;

            // Work out the shape (there should be one in our map by now)
            let shape = this._scanShapeMap.get(scanId) || DEFAULT_ROI_SHAPE;

            // Store it in our map so we can use it next time without having to fetch the ROI
            this.displaySettingsMap$.value[roiId] = { colour, shape };
            this.displaySettingsMap$.next(this.displaySettingsMap$.value);

            // Update the ROI with the display settings
            roi.displaySettings = { colour, shape };
          } else {
            // Update the ROI with the display settings
            roi.displaySettings = { colour: displaySettings.colour, shape: displaySettings.shape };
          }
          return roi;
        }),
        shareReplay()
      );

      // Add it to the map too so a subsequent request will get this
      this._regionMap.set(roiId, result);
    }

    return result;
  }

  updateRegionDisplaySettings(roiId: string, colour: RGBA, shape: ROIShape) {
    // Delete from region map so we can re-fetch it with the new settings next time
    this._regionMap.delete(roiId);
    this.displaySettingsMap$.value[roiId] = { colour, shape };
    this.displaySettingsMap$.next(this.displaySettingsMap$.value);
  }

  getRegionDisplaySettings(roiId: string): ROIDisplaySettings {
    let cachedSettings = this.displaySettingsMap$.value[roiId];
    if (cachedSettings) {
      return cachedSettings;
    } else {
      let settings = createDefaultROIDisplaySettings();
      this.displaySettingsMap$.value[roiId] = settings;
      this.displaySettingsMap$.next(this.displaySettingsMap$.value);

      return settings;
    }
  }

  private createDefaultROIs(scanId: string, scanShape: ROIShape) {
    // Add defaults for predefined ROIs
    this._regionMap.set(`${scanId}_${PredefinedROIID.AllPoints}`, of(createDefaultAllPointsRegionSettings(scanId, scanShape)));
    this._regionMap.set(`${scanId}_${PredefinedROIID.SelectedPoints}`, of(createDefaultSelectedPointsRegionSettings(scanId, scanShape)));
    this._regionMap.set(`${scanId}_${PredefinedROIID.RemainingPoints}`, of(createDefaultRemainingPointsRegionSettings(scanId, scanShape)));
  }

  private nextScanShape(): ROIShape {
    const shape = this._shapes[this._nextScanShapeIdx];
    this._nextScanShapeIdx = (this._nextScanShapeIdx + 1) % this._shapes.length;
    return shape;
  }

  private nextColour(): ColourOption {
    const colour = this._colours[this._nextColourIdx];
    this._nextColourIdx = (this._nextColourIdx + 1) % this._colours.length;
    return colour;
  }

  fetchROI(id: string, checkCacheFirst: boolean = false) {
    if (checkCacheFirst && this.roiItems$.value[id]) {
      return;
    }

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
