import { Injectable, OnDestroy } from "@angular/core";
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
import { BehaviorSubject, EMPTY, Observable, Subscription, combineLatest, map, mergeMap, of, shareReplay, switchMap } from "rxjs";
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
  createDefaultSelectedPointsItem,
  createDefaultSelectedPointsRegionSettings,
} from "../models/roi-region";
import { Colours, RGBA } from "src/app/utils/colours";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SelectionHistoryItem } from "../../pixlisecore/services/selection.service";
import { ScanEntryReq } from "src/app/generated-protos/scan-entry-msgs";
import { ScanItem } from "src/app/generated-protos/scan";
import { AnalysisLayoutService } from "../../analysis/analysis.module";
import { UserGroupList } from "../../../generated-protos/ownership-access";
import { NotificationUpd } from "src/app/generated-protos/notification-msgs";
import { NotificationType } from "src/app/generated-protos/notification";

export type ROISummaries = Record<string, ROIItemSummary>;

@Injectable({
  providedIn: "root",
})
export class ROIService implements OnDestroy {
  private _subs = new Subscription();

  roiSummaries$ = new BehaviorSubject<ROISummaries>({});
  roiItems$ = new BehaviorSubject<Record<string, ROIItem>>({});
  mistROIsByScanId$ = new BehaviorSubject<Record<string, ROISummaries>>({});

  displaySettingsMap$ = new BehaviorSubject<Record<string, ROIDisplaySettings>>({}); // Map of ROI ID to display settings
  private _regionMap = new Map<string, Observable<RegionSettings>>(); // Cached region observables

  private _nextScanShapeIndices: Record<string, number> = {};
  private _nextColourIndices: Record<string, number> = {};

  private _selectionIds: string[] = [];

  private _shapes: ROIShape[] = ROI_SHAPES;
  private _colours: ColourOption[] = COLOURS;

  private _allScans: ScanItem[] = [];

  private _selectedPointsColour = Colours.CONTEXT_BLUE;

  constructor(
    private _dataService: APIDataService,
    private _snackBarService: SnackbarService,
    private _cachedDataService: APICachedDataService,
    private _selectionService: SelectionService,
    private _analysisLayoutService: AnalysisLayoutService
  ) {
    this.listROIs();

    this._subs.add(
      combineLatest([this._analysisLayoutService.activeScreenConfiguration$, this._analysisLayoutService.availableScans$])
        .pipe(
          mergeMap(([screenConfig, scans]) => {
            this._allScans = scans;

            const regionUpdates$ = this._allScans.map(scan => {
              const allPointsROI = PredefinedROIID.getAllPointsForScan(scan.id);
              const existingRegion$ = this._regionMap.get(allPointsROI);

              if (!existingRegion$) {
                return EMPTY;
              }

              return existingRegion$.pipe(
                map(regionSettings => {
                  const settings = createDefaultAllPointsRegionSettings(scan.id, regionSettings.displaySettings.shape, scan.title);
                  const scanColour = screenConfig?.scanConfigurations?.[scan.id]?.colour;
                  const scanRGBA = scanColour ? RGBA.fromString(scanColour) : Colours.GRAY_10;
                  settings.displaySettings.colour = scanRGBA;

                  this._regionMap.set(allPointsROI, of(settings));
                })
              );
            });

            return combineLatest(regionUpdates$);
          })
        )
        .subscribe()
    );

    this._dataService.notificationUpd$.subscribe((upd: NotificationUpd) => {
      // When we get a data change notification we clear caches relevant to that
      if (upd.notification?.notificationType == NotificationType.NT_SYS_DATA_CHANGED) {
        if (upd.notification?.roiId) {
          this.clearCachedROI(upd.notification.roiId);
        }

        // Finally, send to cache API data service which can delete other things...
        this._cachedDataService.handleSysDataChangedNotification(upd);
      }
    });
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  clearCachedROI(roiId: string): void {
    let refreshItems = false;
    // Delete from anywhere it may exist
    if (roiId in this.roiItems$.value) {
      delete this.roiItems$.value[roiId];
      refreshItems = true;
    }

    // let refreshDisplay = false;
    // if (roiId in this.displaySettingsMap$.value) {
    //   delete this.displaySettingsMap$.value[roiId];
    //   refreshDisplay = true;
    // }

    let refreshSummaries = false;
    if (roiId in this.roiSummaries$.value) {
      delete this.roiSummaries$.value[roiId];
      refreshSummaries = true;
    }

    this._regionMap.delete(roiId);

    // Fire off new values for those that need it
    if (refreshItems) {
      this.roiItems$.next(this.roiItems$.value);
    }
    // if (refreshDisplay) {
    //   this.displaySettingsMap$.next(this.displaySettingsMap$.value);
    // }
    if (refreshSummaries) {
      this.roiSummaries$.next(this.roiSummaries$.value);
    }
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
    this.searchROIs(SearchParams.create({}), true);
  }

  listMistROIs(scanId: string) {
    this.searchROIs(SearchParams.create({ scanId }), true);
  }

  getAllPointsROI(scanId: string): Observable<ROIItem> {
    return this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId })).pipe(
      map(res => {
        const entryIds = res.entries.map(entry => entry.id);
        const scanName = this._allScans.find(scan => scan.id === scanId)?.title;
        const allPointsROI = createDefaultAllPointsItem(scanId, scanName);
        allPointsROI.scanEntryIndexesEncoded = entryIds;

        return allPointsROI;
      })
    );
  }

  getSelectedPointsROI(scanId: string): ROIItem | null {
    const currentSelection = this._selectionService.getCurrentSelection();
    if (!currentSelection || !scanId) {
      return ROIItem.create({});
    }

    const selectedPointsROI = createDefaultSelectedPointsItem(scanId);
    selectedPointsROI.scanEntryIndexesEncoded = Array.from(currentSelection.beamSelection.getSelectedScanEntryPMCs(scanId));
    selectedPointsROI.pixelIndexesEncoded = Array.from(currentSelection.pixelSelection.selectedPixels);
    selectedPointsROI.imageName = currentSelection.pixelSelection.imageName;

    selectedPointsROI.displaySettings = ROIItemDisplaySettings.create({ shape: DEFAULT_ROI_SHAPE, colour: this._selectedPointsColour.asString() });

    return selectedPointsROI;
  }

  searchROIs(searchParams: SearchParams, isMIST: boolean = false) {
    this.createScanAllPointsROI(searchParams.scanId)
      .pipe(
        switchMap(allPointsROI => {
          return this.searchROIsAsync(searchParams, isMIST);
        })
      )
      .subscribe();
  }

  createScanAllPointsROI(scanId: string): Observable<ROIItem | null> {
    if (scanId && scanId.length > 0) {
      // Check if all points ROI exists for this scan and if not, fetch it
      const allPointsROIID = PredefinedROIID.getAllPointsForScan(scanId);
      if (this.roiItems$.value[allPointsROIID]) {
        const allPointsROI = this.roiItems$.value[allPointsROIID];
        if (allPointsROI) {
          // Make sure the display settings are up to date
          const scanColour = this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations?.[scanId]?.colour;
          const scanRGBA = scanColour ? RGBA.fromString(scanColour) : Colours.GRAY_10;
          if (!allPointsROI.displaySettings || allPointsROI.displaySettings.colour !== scanRGBA.asString()) {
            const existingDisplaySettings = allPointsROI.displaySettings || { id: allPointsROI.id, colour: scanRGBA.asString(), shape: DEFAULT_ROI_SHAPE };
            allPointsROI.displaySettings = { id: existingDisplaySettings.id, colour: scanRGBA.asString(), shape: existingDisplaySettings.shape };
            this.displaySettingsMap$.value[allPointsROI.id] = { colour: scanRGBA, shape: DEFAULT_ROI_SHAPE };
            this.displaySettingsMap$.next(this.displaySettingsMap$.value);
          }
        }

        return of(allPointsROI);
      } else {
        return this.getAllPointsROI(scanId).pipe(
          map(allPointsROI => {
            if (allPointsROI) {
              this.roiItems$.value[allPointsROI.id] = allPointsROI;
              this.roiSummaries$.value[allPointsROI.id] = ROIService.formSummaryFromROI(allPointsROI);
              const scanColour = this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations?.[scanId]?.colour;
              const scanRGBA = scanColour ? RGBA.fromString(scanColour) : Colours.GRAY_10;
              this.displaySettingsMap$.value[allPointsROI.id] = { colour: scanRGBA, shape: DEFAULT_ROI_SHAPE };
              this.roiItems$.next(this.roiItems$.value);
              this.displaySettingsMap$.next(this.displaySettingsMap$.value);

              return allPointsROI;
            } else {
              return null;
            }
          })
        );
      }
    } else {
      return of(null);
    }
  }

  searchROIsAsync(searchParams: SearchParams, isMIST: boolean = false): Observable<Record<string, ROIItemSummary>> {
    return this._dataService.sendRegionOfInterestListRequest(RegionOfInterestListReq.create({ searchParams, isMIST })).pipe(
      map(res => {
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

        return res.regionsOfInterest;
      })
    );
  }

  getSelectedPointsRegionSettings(scanId: string): Observable<RegionSettings> {
    const currentSelection = this._selectionService.getCurrentSelection();
    if (currentSelection) {
      const selectedPointsROI = createDefaultSelectedPointsItem(scanId);
      selectedPointsROI.scanEntryIndexesEncoded = Array.from(currentSelection.beamSelection.getSelectedScanEntryPMCs(scanId));
      selectedPointsROI.pixelIndexesEncoded = Array.from(currentSelection.pixelSelection.selectedPixels);
      selectedPointsROI.imageName = currentSelection.pixelSelection.imageName;

      this.roiItems$.value[selectedPointsROI.id] = selectedPointsROI;
      this.roiSummaries$.value[selectedPointsROI.id] = ROIService.formSummaryFromROI(selectedPointsROI);

      // Keep any in-memory display settings
      if (!this.displaySettingsMap$.value[selectedPointsROI.id]) {
        this.displaySettingsMap$.value[selectedPointsROI.id] = { colour: this._selectedPointsColour, shape: DEFAULT_ROI_SHAPE };
        this.displaySettingsMap$.next(this.displaySettingsMap$.value);
      }
      this.roiItems$.next(this.roiItems$.value);

      const selectionRegion = new RegionSettings(
        selectedPointsROI,
        this.displaySettingsMap$.value[selectedPointsROI.id],
        new Set<number>(selectedPointsROI.pixelIndexesEncoded)
      );

      this._regionMap.set(selectedPointsROI.id, of(selectionRegion));

      return of(selectionRegion);
    } else {
      this._regionMap.delete(PredefinedROIID.getSelectedPointsForScan(scanId));
    }

    return of(createDefaultSelectedPointsRegionSettings(scanId, DEFAULT_ROI_SHAPE));
  }

  getScanIdsFromROIs(roiIds: string[]): Observable<string[]> {
    const roiRequests = roiIds.map(roiId => {
      if (PredefinedROIID.isPredefined(roiId)) {
        return of(PredefinedROIID.getScanIdIfPredefined(roiId));
      }

      return this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId }));
    });
    return combineLatest(roiRequests).pipe(
      map(roiResponses => {
        return roiResponses.map(roiResp => (typeof roiResp === "string" ? roiResp : roiResp.regionOfInterest?.scanId || ""));
      })
    );
  }

  getRegionSettings(roiId: string): Observable<RegionSettings> {
    // Now we check if we can service locally from our  map
    let result = this._regionMap.get(roiId);
    if (PredefinedROIID.isAllPointsROI(roiId)) {
      const scanId = PredefinedROIID.getScanIdIfPredefined(roiId);
      const scanConfiguration = this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations?.[scanId];
      const scanRGBA = scanConfiguration ? RGBA.fromString(scanConfiguration.colour) : Colours.GRAY_10;
      const allPointsRegion = createDefaultAllPointsRegionSettings(scanId, DEFAULT_ROI_SHAPE, this._allScans.find(scan => scan.id === scanId)?.title);
      allPointsRegion.displaySettings.colour = scanRGBA;
      return of(allPointsRegion);
    }
    if (result === undefined) {
      // Check if this is a predefined ROI for a scan Id, in which case we can add the default ROIs
      // here
      if (PredefinedROIID.isPredefined(roiId)) {
        if (PredefinedROIID.isSelectedPointsROI(roiId)) {
          const scanId = PredefinedROIID.getScanIdIfPredefined(roiId);
          return this.getSelectedPointsRegionSettings(scanId);
        } else {
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
    // if is all points, update the scan colour
    if (PredefinedROIID.isAllPointsROI(roiId)) {
      const scanId = PredefinedROIID.getScanIdIfPredefined(roiId);

      const scanConfiguration = this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations?.[scanId];
      if (!scanConfiguration) {
        this._snackBarService.openError(`Scan configuration not found for scan ID: ${scanId}`);
        return;
      }
      scanConfiguration.colour = colour.asString();
      this.displaySettingsMap$.value[roiId] = { colour, shape };
      this.displaySettingsMap$.next(this.displaySettingsMap$.value);
      this._analysisLayoutService.writeScreenConfiguration(this._analysisLayoutService.activeScreenConfiguration$.value);
    } else {
      // Delete from region map so we can re-fetch it with the new settings next time
      this._regionMap.delete(roiId);
      this.writeROIDisplaySettings(roiId, { id: roiId, colour: colour.asString(), shape });
    }
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
    const scanColour = this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations?.[scanId]?.colour;
    const scanRGBA = scanColour ? RGBA.fromString(scanColour) : Colours.GRAY_10;

    if (this._regionMap.get(allPointsROI) === undefined) {
      // Must be new, add them
      const scanDisp = this.nextDisplaySettings(scanId);
      const scanName = this._allScans.find(scan => scan.id === scanId)?.title;
      const regionSettings = createDefaultAllPointsRegionSettings(scanId, scanDisp.shape, scanName);
      regionSettings.displaySettings.colour = scanRGBA;

      this._regionMap.set(PredefinedROIID.getAllPointsForScan(scanId), of(regionSettings));
    }

    // Make sure the colour is up to date
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$
        .pipe(
          map(screenConfig => {
            if (screenConfig?.scanConfigurations?.[scanId]?.colour !== scanRGBA.asString()) {
              const scanColour = screenConfig?.scanConfigurations?.[scanId]?.colour;
              const scanRGBA = scanColour ? RGBA.fromString(scanColour) : Colours.GRAY_10;

              const regionSettings$ = this._regionMap.get(allPointsROI);
              if (regionSettings$) {
                return regionSettings$.pipe(
                  map(settings => {
                    settings.displaySettings.colour = scanRGBA;
                    this._regionMap.set(allPointsROI, of(settings));
                    return settings;
                  })
                );
              }
            }
            return EMPTY;
          }),
          switchMap(settings$ => settings$ || EMPTY)
        )
        .subscribe()
    );

    const selectedPointsROI = PredefinedROIID.getSelectedPointsForScan(scanId);
    if (this._regionMap.get(selectedPointsROI) === undefined) {
      // Must be new, add them
      const scanDisp = this.nextDisplaySettings(scanId);
      this._regionMap.set(selectedPointsROI, of(createDefaultSelectedPointsRegionSettings(scanId, scanDisp.shape)));
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
      const scanId = PredefinedROIID.getScanIdIfPredefined(id);
      this.getAllPointsROI(scanId).subscribe({
        next: allPointsROI => {
          if (allPointsROI) {
            this.roiItems$.value[allPointsROI.id] = allPointsROI;
            this.roiSummaries$.value[allPointsROI.id] = ROIService.formSummaryFromROI(allPointsROI);
            const scanColour = this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations?.[scanId]?.colour;
            const scanRGBA = scanColour ? RGBA.fromString(scanColour) : Colours.GRAY_10;
            this.displaySettingsMap$.value[allPointsROI.id] = { colour: scanRGBA, shape: DEFAULT_ROI_SHAPE };
            this.roiItems$.next(this.roiItems$.value);
            this.displaySettingsMap$.next(this.displaySettingsMap$.value);
          }
        },
        error: err => {
          console.error(err);
        },
      });
    } else if (PredefinedROIID.isSelectedPointsROI(id)) {
      const selectedPointsROI = this.getSelectedPointsROI(PredefinedROIID.getScanIdIfPredefined(id));
      if (selectedPointsROI) {
        this.roiItems$.value[selectedPointsROI.id] = selectedPointsROI;
        this.roiSummaries$.value[selectedPointsROI.id] = ROIService.formSummaryFromROI(selectedPointsROI);
        this.displaySettingsMap$.value[selectedPointsROI.id] = { colour: this._selectedPointsColour, shape: DEFAULT_ROI_SHAPE };
        this.roiItems$.next(this.roiItems$.value);
        this.displaySettingsMap$.next(this.displaySettingsMap$.value);
      }
    } else {
      this._dataService.sendRegionOfInterestGetRequest(RegionOfInterestGetReq.create({ id, isMIST: true })).subscribe({
        next: res => {
          if (res.regionOfInterest) {
            res.regionOfInterest.scanEntryIndexesEncoded = decodeIndexList(res.regionOfInterest.scanEntryIndexesEncoded);
            res.regionOfInterest.pixelIndexesEncoded = decodeIndexList(res.regionOfInterest.pixelIndexesEncoded);
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

  loadROI(id: string, includeMISTIfExists: boolean = false): Observable<ROIItem> {
    if (this.roiItems$.value[id]) {
      return of(this.roiItems$.value[id]);
    } else if (PredefinedROIID.isAllPointsROI(id)) {
      return this.getAllPointsROI(PredefinedROIID.getScanIdIfPredefined(id));
    } else if (PredefinedROIID.isSelectedPointsROI(id)) {
      const selectedPointsROI = this.getSelectedPointsROI(PredefinedROIID.getScanIdIfPredefined(id));
      if (selectedPointsROI) {
        return of(selectedPointsROI);
      }
    }

    return this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id, isMIST: includeMISTIfExists })).pipe(
      map((roiResp: RegionOfInterestGetResp) => {
        if (roiResp.regionOfInterest === undefined) {
          this._snackBarService.openError(`Region Of Interest data not returned from cachedDataService for ${id}`);
          throw new Error("regionOfInterest data not returned for " + id);
        }

        roiResp.regionOfInterest.scanEntryIndexesEncoded = decodeIndexList(roiResp.regionOfInterest.scanEntryIndexesEncoded);
        roiResp.regionOfInterest.pixelIndexesEncoded = decodeIndexList(roiResp.regionOfInterest.pixelIndexesEncoded);
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

    const roiToWrite = ROIItem.create(newROI);
    const isMIST = roiToWrite.mistROIItem ? true : false;

    // Have to remove owner field to write
    roiToWrite.owner = undefined;
    if (roiToWrite.scanEntryIndexesEncoded && roiToWrite.scanEntryIndexesEncoded.length > 0) {
      roiToWrite.scanEntryIndexesEncoded = encodeIndexList(roiToWrite.scanEntryIndexesEncoded);
    }

    if (roiToWrite.pixelIndexesEncoded && roiToWrite.pixelIndexesEncoded.length > 0) {
      roiToWrite.pixelIndexesEncoded = encodeIndexList(roiToWrite.pixelIndexesEncoded);
    } else {
      // No pixels selected, so no need to send an image name
      roiToWrite.imageName = "";
    }

    this._dataService
      .sendRegionOfInterestWriteRequest(
        RegionOfInterestWriteReq.create({
          regionOfInterest: roiToWrite,
          isMIST,
        })
      )
      .subscribe({
        next: res => {
          if (res.regionOfInterest) {
            if (isMIST) {
              res.regionOfInterest.mistROIItem = roiToWrite.mistROIItem;
            }
            res.regionOfInterest.scanEntryIndexesEncoded = decodeIndexList(res.regionOfInterest.scanEntryIndexesEncoded);
            res.regionOfInterest.pixelIndexesEncoded = decodeIndexList(res.regionOfInterest.pixelIndexesEncoded);

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

  bulkWriteROIs(
    regionsOfInterest: ROIItem[],
    overwrite: boolean,
    skipDuplicates: boolean,
    isMIST: boolean,
    mistROIScanIdsToDelete: string[] = [],
    editors: UserGroupList | undefined = undefined,
    viewers: UserGroupList | undefined = undefined
  ) {
    const writableROIs = regionsOfInterest.map(roi => {
      const newROI = ROIItem.create(roi);
      newROI.owner = undefined;
      if (newROI.scanEntryIndexesEncoded && newROI.scanEntryIndexesEncoded.length > 0) {
        newROI.scanEntryIndexesEncoded = encodeIndexList(newROI.scanEntryIndexesEncoded);
      }

      return newROI;
    });

    this._dataService
      .sendRegionOfInterestBulkWriteRequest(
        RegionOfInterestBulkWriteReq.create({ regionsOfInterest: writableROIs, overwrite, skipDuplicates, isMIST, mistROIScanIdsToDelete, editors, viewers })
      )
      .subscribe({
        next: res => {
          if (res.regionsOfInterest) {
            // Remove MIST scans that were deleted
            mistROIScanIdsToDelete.forEach(scanId => {
              if (this.mistROIsByScanId$.value[scanId]) {
                this.mistROIsByScanId$.value[scanId] = {};
                // Delete all mist ROIs for this scan
                Object.entries(this.roiSummaries$.value).forEach(([roiId, roi]) => {
                  if (roi && roi.scanId === scanId && roi.isMIST) {
                    delete this.roiItems$.value[roiId];
                    delete this.roiSummaries$.value[roiId];
                    delete this.displaySettingsMap$.value[roiId];
                  }
                });
              }
            });

            res.regionsOfInterest.forEach((roi, i) => {
              if (isMIST) {
                const matchingROI = writableROIs[i];

                // Extra verification check to make sure order didnt change
                if (matchingROI && matchingROI.mistROIItem?.classificationTrail === roi.description) {
                  roi.mistROIItem = matchingROI.mistROIItem;
                } else {
                  // Order changed, so lets try to find it by classification trail (this shouldn't happen)
                  const trailMatchedROI = writableROIs.find(writableROI => writableROI.mistROIItem?.classificationTrail === roi.description);
                  if (trailMatchedROI) {
                    roi.mistROIItem = trailMatchedROI.mistROIItem;
                  }
                }
              }

              this.roiItems$.value[roi.id] = roi;

              if (isMIST) {
                const scanId = roi.scanId;
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

              this.roiSummaries$.value[roi.id] = ROIService.formSummaryFromROI(roi);
            });

            this.roiItems$.next(this.roiItems$.value);
            this.mistROIsByScanId$.next(this.mistROIsByScanId$.value);
            this.roiSummaries$.next(this.roiSummaries$.value);

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
    this.loadROI(newROISummary.id, true)
      .pipe(
        map(roi => {
          roi.name = newROISummary.name;
          roi.description = newROISummary.description;
          roi.tags = newROISummary.tags;
          roi.isMIST = newROISummary.isMIST;
          if (roi.isMIST) {
            roi.mistROIItem = newROISummary.mistROIItem;
          }
          this.writeROI(roi, false, true);
        })
      )
      .subscribe({
        error: err => {
          this._snackBarService.openError(err);
        },
      });
  }

  createROI(newROI: ROIItem) {
    this.writeROI(newROI, true);
  }

  deleteROI(id: string, isMIST: boolean = false) {
    this._dataService.sendRegionOfInterestDeleteRequest(RegionOfInterestDeleteReq.create({ id, isMIST })).subscribe({
      next: res => {
        // Keep scan id so we can remove from mistROIsByScanId
        const scanId = this.roiSummaries$.value[id]?.scanId || this.roiItems$.value[id]?.scanId || "";

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
              const scanId = roiSummary.scanId;
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
