import { Injectable } from "@angular/core";
import { APIDataService, SelectionService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
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
import { BehaviorSubject, Observable, Subscription, firstValueFrom, map, of, shareReplay } from "rxjs";
import { decodeIndexList, encodeIndexList } from "src/app/utils/utils";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { DEFAULT_ROI_SHAPE, ROIShape, ROI_SHAPES } from "../components/roi-shape/roi-shape.component";
import { COLOURS, ColourOption } from "../models/roi-colors";
import {
  ROIDisplaySettingOption,
  ROIDisplaySettings,
  RegionSettings,
  createDefaultAllPointsItem,
  createDefaultAllPointsRegionSettings,
  createDefaultROIDisplaySettings,
  createDefaultRemainingPointsRegionSettings,
  createDefaultSelectedPointsItem,
  createDefaultSelectedPointsRegionSettings,
  getBuiltinIDFromScanID,
} from "../models/roi-region";
import { Colours, RGBA } from "src/app/utils/colours";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SelectionHistoryItem } from "../../pixlisecore/services/selection.service";
import { BeamSelection } from "../../pixlisecore/models/beam-selection";
import { PixelSelection } from "../../pixlisecore/models/pixel-selection";
import { ScanEntryReq } from "src/app/generated-protos/scan-entry-msgs";

export type ROISummaries = Record<string, ROIItemSummary>;

@Injectable({
  providedIn: "root",
})
export class ROIService {
  roiSummaries$ = new BehaviorSubject<ROISummaries>({});
  roiItems$ = new BehaviorSubject<Record<string, ROIItem>>({});
  mistROIsByScanId$ = new BehaviorSubject<Record<string, ROISummaries>>({});

  displaySettingsMap$ = new BehaviorSubject<Record<string, ROIDisplaySettings>>({}); // Map of ROI ID to display settings
  private _regionMap = new Map<string, Observable<RegionSettings>>(); // Cached region observables

  private _scanShapeMap = new Map<string, ROIShape>();

  private _nextScanShapeIndices: Record<string, number> = {};
  private _nextColourIndices: Record<string, number> = {};

  private _selectionIds: string[] = [];

  private _shapes: ROIShape[] = ROI_SHAPES;
  private _colours: ColourOption[] = COLOURS;

  constructor(
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService,
    private _cachedDataService: APICachedDataService,
    private _selectionService: SelectionService
  ) {
    this.listROIs();

    this._selectionService.selection$.subscribe(selection => {
      this.generateSelectionROI(selection);
    });
  }

  generateSelectionROI(selection: SelectionHistoryItem) {
    if (!selection) {
      return;
    }

    let selectionChanged = false;

    // Remove all previous selected points ROIs so that we don't get dangling ROIs if no points in a dataset are selected next
    this._selectionIds.forEach(id => {
      delete this.roiItems$.value[id];
      delete this.roiSummaries$.value[id];
      delete this.displaySettingsMap$.value[id];

      selectionChanged = true;
    });

    this._selectionIds = [];

    // Everytime selection changes, update all selected points ROIs
    selection.beamSelection.getScanIds().forEach(scanId => {
      let selectedPointsROI = createDefaultSelectedPointsItem(scanId);
      selectedPointsROI.scanEntryIndexesEncoded = Array.from(selection.beamSelection.getSelectedScanEntryIndexes(scanId));
      selectedPointsROI.pixelIndexesEncoded = Array.from(selection.pixelSelection.selectedPixels);
      selectedPointsROI.imageName = selection.pixelSelection.imageName;

      if (selectedPointsROI) {
        this.roiItems$.value[selectedPointsROI.id] = selectedPointsROI;
        this.roiSummaries$.value[selectedPointsROI.id] = ROIService.formSummaryFromROI(selectedPointsROI);
        this.displaySettingsMap$.value[selectedPointsROI.id] = { colour: Colours.CONTEXT_BLUE, shape: DEFAULT_ROI_SHAPE };

        this._selectionIds.push(selectedPointsROI.id);
        selectionChanged = true;
      }
    });

    // If we added or deleted any ROIs, update the observables
    if (selectionChanged) {
      this.roiItems$.next(this.roiItems$.value);
      this.displaySettingsMap$.next(this.displaySettingsMap$.value);
      this.roiSummaries$.next(this.roiSummaries$.value);
    }
  }

  listROIs() {
    this.searchROIs(SearchParams.create({}), false);
  }

  listMistROIs(scanId: string) {
    this.searchROIs(SearchParams.create({ scanId }), true);
  }

  getAllPointsROI(scanId: string): Observable<ROIItem> {
    return this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId })).pipe(
      map(res => {
        let entryIds = res.entries.map(entry => entry.id);
        let allPointsROI = createDefaultAllPointsItem(scanId);
        allPointsROI.scanEntryIndexesEncoded = entryIds;

        return allPointsROI;
      })
    );
  }

  getSelectedPointsROI(scanId: string): ROIItem | null {
    let currentSelection = this._selectionService.getCurrentSelection();
    if (!currentSelection || !scanId) {
      return null;
    }

    let selectedPointsROI = createDefaultSelectedPointsItem(scanId);
    selectedPointsROI.scanEntryIndexesEncoded = Array.from(currentSelection.beamSelection.getSelectedScanEntryIndexes(scanId));
    selectedPointsROI.pixelIndexesEncoded = Array.from(currentSelection.pixelSelection.selectedPixels);
    selectedPointsROI.imageName = currentSelection.pixelSelection.imageName;

    return selectedPointsROI;
  }

  searchROIs(searchParams: SearchParams, isMIST: boolean = false) {
    // Check if selection ROI exists for this scan and if not, create an empty one
    if (searchParams.scanId && searchParams.scanId.length > 0) {
      if (!this.roiItems$.value[getBuiltinIDFromScanID(searchParams.scanId, PredefinedROIID.SelectedPoints)]) {
        let selectedPointsROI = this.getSelectedPointsROI(searchParams.scanId);
        if (selectedPointsROI) {
          this.roiItems$.value[selectedPointsROI.id] = selectedPointsROI;
          this.roiSummaries$.value[selectedPointsROI.id] = ROIService.formSummaryFromROI(selectedPointsROI);
          this.displaySettingsMap$.value[selectedPointsROI.id] = { colour: Colours.CONTEXT_BLUE, shape: DEFAULT_ROI_SHAPE };
          this.roiItems$.next(this.roiItems$.value);
          this.displaySettingsMap$.next(this.displaySettingsMap$.value);
        }
      }
    }

    // Check if all points ROI exists for this scan and if not, fetch it
    let allPointsROIID = getBuiltinIDFromScanID(searchParams.scanId, PredefinedROIID.AllPoints);
    if (searchParams.scanId && searchParams.scanId.length > 0 && !this.roiSummaries$.value[allPointsROIID]) {
      this.getAllPointsROI(searchParams.scanId).subscribe(allPointsROI => {
        if (allPointsROI) {
          this.roiItems$.value[allPointsROI.id] = allPointsROI;
          this.roiSummaries$.value[allPointsROI.id] = ROIService.formSummaryFromROI(allPointsROI);
          this.displaySettingsMap$.value[allPointsROI.id] = { colour: Colours.GRAY_10, shape: DEFAULT_ROI_SHAPE };
          this.roiItems$.next(this.roiItems$.value);
          this.displaySettingsMap$.next(this.displaySettingsMap$.value);
        }
      });
    }

    this._dataService.sendRegionOfInterestListRequest(RegionOfInterestListReq.create({ searchParams, isMIST })).subscribe({
      next: async res => {
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
      scanShape = this.nextScanShape(scanId);
      this._scanShapeMap.set(scanId, scanShape);
      this.createDefaultScanRegions(scanId, scanShape);
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
            let colour = this.nextScanColour(scanId).rgba;

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

  private createDefaultScanRegions(scanId: string, scanShape: ROIShape) {
    // Add defaults for predefined ROIs
    this._regionMap.set(`${scanId}_${PredefinedROIID.AllPoints}`, of(createDefaultAllPointsRegionSettings(scanId, scanShape)));
    this._regionMap.set(`${scanId}_${PredefinedROIID.SelectedPoints}`, of(createDefaultSelectedPointsRegionSettings(scanId, scanShape)));
    this._regionMap.set(`${scanId}_${PredefinedROIID.RemainingPoints}`, of(createDefaultRemainingPointsRegionSettings(scanId, scanShape)));
  }

  nextDisplaySettings(scanId: string): ROIDisplaySettingOption {
    let colourIdx = this._nextColourIndices[scanId] || 0;
    let shapeIdx = this._nextScanShapeIndices[scanId] || 0;

    const colour = this._colours[colourIdx];
    const shape = this._shapes[shapeIdx];

    if (colourIdx + 1 >= this._colours.length) {
      shapeIdx = (shapeIdx + 1) % this._shapes.length;
    }

    colourIdx = (colourIdx + 1) % this._colours.length;

    this._nextColourIndices[scanId] = colourIdx;
    this._nextScanShapeIndices[scanId] = shapeIdx;

    return { colour, shape };
  }

  private nextScanShape(scanId: string): ROIShape {
    let shapeIdx = this._nextScanShapeIndices[scanId] || 0;

    const shape = this._shapes[shapeIdx];
    shapeIdx = (shapeIdx + 1) % this._shapes.length;
    this._nextScanShapeIndices[scanId] = shapeIdx;

    return shape;
  }

  private nextScanColour(scanId: string = ""): ColourOption {
    let colourIdx = this._nextColourIndices[scanId] || 0;

    const colour = this._colours[colourIdx];
    colourIdx = (colourIdx + 1) % this._colours.length;
    this._nextColourIndices[scanId] = colourIdx;

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

  static formSummaryFromROI(roi: ROIItem): ROIItemSummary {
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
              this.roiSummaries$.value[res.regionOfInterest.id] = ROIService.formSummaryFromROI(res.regionOfInterest);
              this.roiSummaries$.next(this.roiSummaries$.value);

              if (res.regionOfInterest.isMIST) {
                if (!this.mistROIsByScanId$.value[res.regionOfInterest.scanId]) {
                  this.mistROIsByScanId$.value[res.regionOfInterest.scanId] = {};
                }

                this.mistROIsByScanId$.value[res.regionOfInterest.scanId][res.regionOfInterest.id] = ROIService.formSummaryFromROI(res.regionOfInterest);
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
                this.mistROIsByScanId$.value[scanId][roi.id] = ROIService.formSummaryFromROI(roi);
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
