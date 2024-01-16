import { Injectable } from "@angular/core";
import { APIDataService, SelectionService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import {
  RegionOfInterestBulkDuplicateReq,
  RegionOfInterestBulkWriteReq,
  RegionOfInterestDeleteReq,
  RegionOfInterestDisplaySettingsGetReq,
  RegionOfInterestDisplaySettingsWriteReq,
  RegionOfInterestGetReq,
  RegionOfInterestGetResp,
  RegionOfInterestListReq,
  RegionOfInterestWriteReq,
} from "src/app/generated-protos/roi-msgs";
import { ROIItem, ROIItemDisplaySettings, ROIItemSummary } from "src/app/generated-protos/roi";
import { SearchParams } from "src/app/generated-protos/search-params";
import { BehaviorSubject, Observable, map, of, shareReplay } from "rxjs";
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
  //createDefaultRemainingPointsRegionSettings,
  createDefaultSelectedPointsItem,
  createDefaultSelectedPointsRegionSettings,
} from "../models/roi-region";
import { Colours, RGBA } from "src/app/utils/colours";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SelectionHistoryItem } from "../../pixlisecore/services/selection.service";
import { ScanEntryReq } from "src/app/generated-protos/scan-entry-msgs";
import { ScanItem } from "src/app/generated-protos/scan";
import { AnalysisLayoutService } from "../../analysis/analysis.module";

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

  private _allScans: ScanItem[] = [];

  constructor(
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService,
    private _cachedDataService: APICachedDataService,
    private _selectionService: SelectionService,
    private _analysisLayoutService: AnalysisLayoutService
  ) {
    this.listROIs();

    this._selectionService.selection$.subscribe(selection => {
      this.generateSelectionROI(selection);
    });

    this._analysisLayoutService.availableScans$.subscribe(scans => {
      this._allScans = scans;

      this._allScans.forEach(scan => {
        let allPointsROI = PredefinedROIID.getAllPointsForScan(scan.id);
        if (this._regionMap.get(allPointsROI) !== undefined) {
          this._regionMap.get(allPointsROI)?.subscribe(regionSettings => {
            this._regionMap.set(allPointsROI, of(createDefaultAllPointsRegionSettings(scan.id, regionSettings.displaySettings.shape, scan.title)));
          });
        }
      });
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
      const selectedPointsROI = createDefaultSelectedPointsItem(scanId);
      selectedPointsROI.scanEntryIndexesEncoded = Array.from(selection.beamSelection.getSelectedScanEntryPMCs(scanId));
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
        const entryIds = res.entries.map(entry => entry.id);
        let scanName = this._allScans.find(scan => scan.id === scanId)?.title;
        const allPointsROI = createDefaultAllPointsItem(scanId, scanName);
        allPointsROI.scanEntryIndexesEncoded = entryIds;

        return allPointsROI;
      })
    );
  }

  getSelectedPointsROI(scanId: string): ROIItem | null {
    const currentSelection = this._selectionService.getCurrentSelection();
    if (!currentSelection || !scanId) {
      return null;
    }

    const selectedPointsROI = createDefaultSelectedPointsItem(scanId);
    selectedPointsROI.scanEntryIndexesEncoded = Array.from(currentSelection.beamSelection.getSelectedScanEntryPMCs(scanId));
    selectedPointsROI.pixelIndexesEncoded = Array.from(currentSelection.pixelSelection.selectedPixels);
    selectedPointsROI.imageName = currentSelection.pixelSelection.imageName;

    return selectedPointsROI;
  }

  searchROIs(searchParams: SearchParams, isMIST: boolean = false) {
    // Check if selection ROI exists for this scan and if not, create an empty one
    if (searchParams.scanId && searchParams.scanId.length > 0) {
      if (!this.roiItems$.value[PredefinedROIID.getSelectedPointsForScan(searchParams.scanId)]) {
        const selectedPointsROI = this.getSelectedPointsROI(searchParams.scanId);
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
    const allPointsROIID = PredefinedROIID.getAllPointsForScan(searchParams.scanId);
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

        let displaySettingsUpdated = false;
        Object.entries(res.regionsOfInterest).forEach(([roiId, roi]) => {
          if (roi.displaySettings) {
            this.displaySettingsMap$.value[roiId] = ROIService.formDisplaySettingsFromStored(roi.displaySettings);
            displaySettingsUpdated = true;
          }
        });
        if (displaySettingsUpdated) {
          this.displaySettingsMap$.next(this.displaySettingsMap$.value);
        }

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

  getRegionSettings(roiId: string): Observable<RegionSettings> {
    // Now we check if we can service locally from our  map
    let result = this._regionMap.get(roiId);
    if (result === undefined) {
      // Check if this is a predefined ROI for a scan Id, in which case we can add the default ROIs
      // here
      const predefScanId = PredefinedROIID.getScanIdIfPredefined(roiId);
      if (predefScanId) {
        // Add the defaults here
        this.createDefaultScanRegionsIfNeeded(predefScanId);

        // Read it again from the map
        result = this._regionMap.get(roiId);

        if (result !== undefined) {
          return result;
        }
      }

      // Nothing stored, so get the ROI because we're combining that with the colour/shape we generate
      result = this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId })).pipe(
        map((roiResp: RegionOfInterestGetResp) => {
          if (roiResp.regionOfInterest === undefined) {
            this._snackBarService.openError(`Region Of Interest data not returned from cachedDataService for ${roiId}`);
            throw new Error("regionOfInterest data not returned for " + roiId);
          }

          // We just got the ROI, maybe it's for a new scan ID, so check if we need to create the default ROIs for it
          const scanId = roiResp.regionOfInterest.scanId;
          this.createDefaultScanRegionsIfNeeded(scanId);

          const roi = new RegionSettings(roiResp.regionOfInterest, undefined, new Set<number>(roiResp.regionOfInterest.pixelIndexesEncoded));

          let displaySettingsUpdated = false;
          if (roiResp.regionOfInterest?.displaySettings) {
            this.displaySettingsMap$.value[roiId] = ROIService.formDisplaySettingsFromStored(roiResp.regionOfInterest?.displaySettings);
            displaySettingsUpdated = true;
          }
          if (displaySettingsUpdated) {
            this.displaySettingsMap$.next(this.displaySettingsMap$.value);
          }

          const displaySettings = this.displaySettingsMap$.value[roiId];

          if (!displaySettings) {
            const roiDisplaySettings = this.nextDisplaySettings(scanId, roiId);
            // Update the ROI with the display settings
            roi.displaySettings = { colour: roiDisplaySettings.colour.rgba, shape: roiDisplaySettings.shape };
          } else {
            // Update the ROI with the display settings
            roi.displaySettings = { colour: displaySettings.colour, shape: displaySettings.shape };
          }
          return roi;
        }),
        shareReplay(1)
      );

      // Add it to the map too so a subsequent request will get this
      this._regionMap.set(roiId, result);
    }

    return result;
  }

  updateRegionDisplaySettings(roiId: string, colour: RGBA, shape: ROIShape) {
    // Delete from region map so we can re-fetch it with the new settings next time
    this._regionMap.delete(roiId);
    this.writeROIDisplaySettings(roiId, { id: roiId, colour: colour.asString(), shape });
  }

  getRegionDisplaySettings(roiId: string): ROIDisplaySettings {
    const cachedSettings = this.displaySettingsMap$.value[roiId];
    if (cachedSettings) {
      return cachedSettings;
    } else {
      const settings = createDefaultROIDisplaySettings();
      this.displaySettingsMap$.value[roiId] = settings;
      this.displaySettingsMap$.next(this.displaySettingsMap$.value);

      return settings;
    }
  }

  private createDefaultScanRegionsIfNeeded(scanId: string) {
    // Add defaults for predefined ROIs
    const allPointsROI = PredefinedROIID.getAllPointsForScan(scanId);
    if (this._regionMap.get(allPointsROI) === undefined) {
      // Must be new, add them
      const scanDisp = this.nextDisplaySettings(scanId);
      let scanName = this._allScans.find(scan => scan.id === scanId)?.title;
      this._regionMap.set(PredefinedROIID.getAllPointsForScan(scanId), of(createDefaultAllPointsRegionSettings(scanId, scanDisp.shape, scanName)));
      this._regionMap.set(PredefinedROIID.getSelectedPointsForScan(scanId), of(createDefaultSelectedPointsRegionSettings(scanId, scanDisp.shape)));
    }

    //this._regionMap.set(`${getBuiltinIDFromScanID(scanId, PredefinedROIID.RemainingPoints)}`, of(createDefaultRemainingPointsRegionSettings(scanId, scanShape)));
  }

  nextDisplaySettings(scanId: string, roiId: string = ""): ROIDisplaySettingOption {
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

    if (roiId && roiId.length > 0) {
      this.writeROIDisplaySettings(roiId, { id: roiId, colour: colour.colour, shape });
    }

    return { colour, shape };
  }

  fetchROI(id: string, checkCacheFirst: boolean = false) {
    if (checkCacheFirst && this.roiItems$.value[id]) {
      return;
    } else if (PredefinedROIID.isAllPointsROI(id)) {
      let scanId = PredefinedROIID.getScanIdIfPredefined(id);
      this.getAllPointsROI(scanId).subscribe({
        next: allPointsROI => {
          if (allPointsROI) {
            this.roiItems$.value[allPointsROI.id] = allPointsROI;
            this.roiSummaries$.value[allPointsROI.id] = ROIService.formSummaryFromROI(allPointsROI);
            this.displaySettingsMap$.value[allPointsROI.id] = { colour: Colours.GRAY_10, shape: DEFAULT_ROI_SHAPE };
            this.roiItems$.next(this.roiItems$.value);
            this.displaySettingsMap$.next(this.displaySettingsMap$.value);
          }
        },
        error: err => {
          console.error(err);
        },
      });
    } else if (PredefinedROIID.isSelectedPointsROI(id)) {
      let selectedPointsROI = this.getSelectedPointsROI(PredefinedROIID.getScanIdIfPredefined(id));
      if (selectedPointsROI) {
        this.roiItems$.value[selectedPointsROI.id] = selectedPointsROI;
        this.roiSummaries$.value[selectedPointsROI.id] = ROIService.formSummaryFromROI(selectedPointsROI);
        this.displaySettingsMap$.value[selectedPointsROI.id] = { colour: Colours.CONTEXT_BLUE, shape: DEFAULT_ROI_SHAPE };
        this.roiItems$.next(this.roiItems$.value);
        this.displaySettingsMap$.next(this.displaySettingsMap$.value);
      }
    } else {
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
  }

  loadROI(id: string): Observable<ROIItem> {
    if (this.roiItems$.value[id]) {
      return of(this.roiItems$.value[id]);
    } else if (PredefinedROIID.isAllPointsROI(id)) {
      return this.getAllPointsROI(PredefinedROIID.getScanIdIfPredefined(id));
    } else if (PredefinedROIID.isSelectedPointsROI(id)) {
      let selectedPointsROI = this.getSelectedPointsROI(PredefinedROIID.getScanIdIfPredefined(id));
      if (selectedPointsROI) {
        return of(selectedPointsROI);
      }
    }

    return this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id })).pipe(
      map((roiResp: RegionOfInterestGetResp) => {
        if (roiResp.regionOfInterest === undefined) {
          this._snackBarService.openError(`Region Of Interest data not returned from cachedDataService for ${id}`);
          throw new Error("regionOfInterest data not returned for " + id);
        }

        roiResp.regionOfInterest.scanEntryIndexesEncoded = decodeIndexList(roiResp.regionOfInterest.scanEntryIndexesEncoded);
        return roiResp.regionOfInterest;
      })
    );
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
      displaySettings: roi.displaySettings,
      owner: roi.owner,
      isMIST: roi.isMIST,
    });
  }

  static formDisplaySettingsFromStored(displaySettings: ROIItemDisplaySettings): ROIDisplaySettings {
    return {
      colour: RGBA.fromString(displaySettings.colour),
      shape: (displaySettings.shape as ROIShape) || DEFAULT_ROI_SHAPE,
    };
  }

  getROIDisplaySettings(id: string) {
    this._dataService.sendRegionOfInterestDisplaySettingsGetRequest(RegionOfInterestDisplaySettingsGetReq.create({ id })).subscribe({
      next: res => {
        if (res.displaySettings) {
          this.displaySettingsMap$.value[id] = ROIService.formDisplaySettingsFromStored(res.displaySettings);
          this.displaySettingsMap$.next(this.displaySettingsMap$.value);
        } else {
          this._snackBarService.openError(`ROI (${id}) not found`);
        }
      },
      error: err => {
        this._snackBarService.openError(err);
      },
    });
  }

  writeROIDisplaySettings(id: string, displaySettings: ROIItemDisplaySettings) {
    this._dataService.sendRegionOfInterestDisplaySettingsWriteRequest(RegionOfInterestDisplaySettingsWriteReq.create({ id, displaySettings })).subscribe({
      next: res => {
        if (res.displaySettings) {
          this.displaySettingsMap$.value[id] = ROIService.formDisplaySettingsFromStored(res.displaySettings);
          this.displaySettingsMap$.next(this.displaySettingsMap$.value);
        } else {
          this._snackBarService.openError(`ROI (${id}) not found`);
        }
      },
      error: err => {
        this._snackBarService.openError(err);
      },
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
