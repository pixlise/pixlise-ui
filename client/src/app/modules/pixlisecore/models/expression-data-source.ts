import { Observable, combineLatest, concatMap, map, tap, lastValueFrom, throwError } from "rxjs";
import {
  DiffractionPeakQuerierSource,
  HousekeepingDataQuerierSource,
  PseudoIntensityDataQuerierSource,
  QuantifiedDataQuerierSource,
  SpectrumDataQuerierSource,
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { QuantGetReq, QuantGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ScanEntryMetadataReq, ScanEntryMetadataResp } from "src/app/generated-protos/scan-entry-metadata-msgs";
import { SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { ScanEntryRange, ScanMetaDataType } from "src/app/generated-protos/scan";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { Quantification, Quantification_QuantDataType } from "src/app/generated-protos/quantification";
import { ScanMetaLabelsAndTypesReq, ScanMetaLabelsAndTypesResp } from "src/app/generated-protos/scan-msgs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { encodeIndexList } from "src/app/utils/utils";
import { DetectedDiffractionPeaksReq, DetectedDiffractionPeaksResp } from "src/app/generated-protos/diffraction-detected-peak-msgs";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { SpectrumType } from "src/app/generated-protos/spectrum";
import { DiffractionPeak, RoughnessItem, diffractionPeakWidth } from "./diffraction";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { DiffractionPeakManualListReq, DiffractionPeakManualListResp } from "src/app/generated-protos/diffraction-manual-msgs";
import { APICachedDataService } from "../services/apicacheddata.service";
import { DefaultDetectorId } from "src/app/expression-language/predefined-expressions";
import { DiffractionPeakStatusListReq, DiffractionPeakStatusListResp } from "src/app/generated-protos/diffraction-status-msgs";
import { DetectedDiffractionPeakStatuses_PeakStatus } from "src/app/generated-protos/diffraction-data";
import { SpectrumDataService } from "../services/spectrum-data.service";

export class ExpressionDataSource
  implements DiffractionPeakQuerierSource, HousekeepingDataQuerierSource, PseudoIntensityDataQuerierSource, QuantifiedDataQuerierSource, SpectrumDataQuerierSource
{
  private _scanEntryIndexesRequested: number[] = [];

  private _scanEntries: ScanEntryResp | null = null;

  // Further-processed quant data for faster lookup later
  private _elementColumns = new Map<string, string[]>();
  //private _dataColumns: string[] = [];
  private _detectors: string[] = [];

  // A map to allow us to find what pure elements can be calculated from what else. So if quant had
  // data for SiO2_%, here we'd store have Si_%->SiO2_%. This helps getQuantifiedDataForDetector()
  // determine what to do if a column isn't found outright in _elementColumns
  private _pureElementColumnLookup = new Map<string, string>();
  private _quantRead = false;

  // Derived from diffraction data coming in
  private _allPeaks: DiffractionPeak[] = [];
  private _roughnessItems: RoughnessItem[] = [];
  private _diffractionRead = false;

  private _diffractionStatuses: Record<string, DetectedDiffractionPeakStatuses_PeakStatus> = {};
  private _diffractionStatusRead = false;

  // What we consider to be a "roughness" item for the purposes of diffraction:
  private _roughnessItemThreshold = 0.16;

  // Needed by DiffractionPeakQuerierSource
  private _spectrumEnergyCalibration: SpectrumEnergyCalibration[] = [];

  // TODO: Which detectors calibration do we adopt?
  private _eVCalibrationDetector = "A";

  // The things we're supposed to request on demand
  private _scanId: string = "";
  private _quantId: string = "";
  private _encodedIndexes: number[] = [];

  // And where to turn to get it:
  private _cachedDataService: APICachedDataService | null = null;
  private _spectrumDataService: SpectrumDataService | null = null;

  private _debug = false;
  private _prepTime = performance.now();
  private _lastTime = performance.now();

  // Here we get the data required to honor the interfaces we implement, based on the above
  prepare(
    cachedDataService: APICachedDataService,
    spectrumService: SpectrumDataService,
    scanId: string,
    quantId: string,
    roiId: string,
    spectrumEnergyCalibration: SpectrumEnergyCalibration[]
  ): Observable<void> {
    this._scanId = scanId;
    this._quantId = quantId;

    this._cachedDataService = cachedDataService;
    this._spectrumDataService = spectrumService;

    this._spectrumEnergyCalibration = spectrumEnergyCalibration;

    // Firstly, request the ROI if there is one
    let indexes: Observable<number[]>;

    if (roiId.length > 0 && !PredefinedROIID.isAllPointsROI(roiId) && !PredefinedROIID.isSelectedPointsROI(roiId)) {
      // We're looking up the ROI specified to find the list of location indexes to process BUT we still need
      // the full list of scan entries!
      indexes = cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId })).pipe(
        concatMap((resp: RegionOfInterestGetResp) => {
          if (resp.regionOfInterest === undefined) {
            throw new Error("regionOfInterest indexes not returned for " + roiId);
          }

          return this.getScanEntries(cachedDataService, scanId).pipe(
            map((scanEntryResp: ScanEntryResp) => {
              // We just got the above as a side-effect, we are actually returning the index list from ROI
              return resp.regionOfInterest!.scanEntryIndexesEncoded;
            })
          );
        })
      );
    } else {
      // No ROIs, so request all scan entries, and we can just work off "all" points
      indexes = this.getScanEntries(cachedDataService, scanId).pipe(
        map((resp: ScanEntryResp) => {
          if (resp.entries === undefined) {
            throw new Error("ScanEntryResp indexes not returned for " + scanId);
          }

          const idxs = [];
          for (let c = 0; c < resp.entries.length; c++) {
            const entry = resp.entries[c];
            if (entry.normalSpectra || entry.dwellSpectra || entry.bulkSpectra || entry.maxSpectra) {
              idxs.push(c);
            }
          }
          return idxs;
        })
      );
    }

    // Once we obtained the indexes, we can retrieve everything else required
    return indexes.pipe(
      map((scanEntryIndexes: number[]) => {
        this._scanEntryIndexesRequested = scanEntryIndexes;

        this._encodedIndexes = encodeIndexList(scanEntryIndexes);
      })
    );
  }

  private getScanEntries(cachedDataService: APICachedDataService, scanId: string): Observable<ScanEntryResp> {
    return cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })).pipe(
      tap((resp: ScanEntryResp) => {
        if (resp.entries === undefined) {
          throw new Error("ScanEntryResp indexes not returned for " + scanId);
        }

        this._scanEntries = resp;
      })
    );
  }

  private getQuantData(): Observable<QuantGetResp> {
    if (!this._cachedDataService) {
      return throwError(() => new Error("getQuantData: no data available"));
    }
    if (!this._quantId) {
      return throwError(() => new Error("getQuantData: no quantification id specified"));
    }

    return this._cachedDataService.getQuant(QuantGetReq.create({ quantId: this._quantId, summaryOnly: false })).pipe(
      tap(quantData => {
        if (!this._quantRead) {
          this.cacheElementInfo(quantData);
          this._quantRead = true;
        }
      })
    );
  }

  private getPseudoIntensity(): Observable<PseudoIntensityResp> {
    if (!this._cachedDataService) {
      return throwError(() => new Error("getPseudoIntensity: no data available"));
    }

    return this._cachedDataService.getPseudoIntensity(
      PseudoIntensityReq.create({ scanId: this._scanId, entries: ScanEntryRange.create({ indexes: this._encodedIndexes }) })
    );
  }

  private getDetectedDiffraction(): Observable<DetectedDiffractionPeaksResp> {
    if (!this._cachedDataService) {
      return throwError(() => new Error("getDetectedDiffraction: no data available"));
    }

    return this._cachedDataService
      .getDetectedDiffractionPeaks(DetectedDiffractionPeaksReq.create({ scanId: this._scanId, entries: ScanEntryRange.create({ indexes: this._encodedIndexes }) }))
      .pipe(
        tap(diffractionData => {
          if (!this._diffractionRead) {
            this.readDiffractionData(diffractionData, this._scanId);
            this._diffractionRead = true;
          }
        })
      );
  }

  private getDetectedDiffractionStatus(): Observable<DiffractionPeakStatusListResp> {
    if (!this._cachedDataService) {
      return throwError(() => new Error("getDetectedDiffractionStatus: no data available"));
    }
    return this._cachedDataService.getDetectedDiffractionPeakStatuses(DiffractionPeakStatusListReq.create({ scanId: this._scanId })).pipe(
      tap(statusData => {
        if (!this._diffractionStatusRead) {
          this._diffractionStatuses = statusData.peakStatuses?.statuses || {};
          this._diffractionStatusRead = true;
        }
      })
    );
  }

  private getScanMetaLabelsAndTypes(): Observable<ScanMetaLabelsAndTypesResp> {
    if (!this._cachedDataService) {
      return throwError(() => new Error("getScanMetaLabelsAndTypes: no data available"));
    }
    return this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({ scanId: this._scanId }));
  }

  private getScanBeamLocations(): Observable<ScanBeamLocationsResp> {
    if (!this._cachedDataService) {
      return throwError(() => new Error("getScanBeamLocations: no data available"));
    }
    return this._cachedDataService.getScanBeamLocations(
      ScanBeamLocationsReq.create({ scanId: this._scanId, entries: ScanEntryRange.create({ indexes: this._encodedIndexes }) })
    );
  }

  private getScanEntryMetadata(): Observable<ScanEntryMetadataResp> {
    if (!this._cachedDataService) {
      return throwError(() => new Error("getScanEntryMetadata: no data available"));
    }
    return this._cachedDataService.getScanEntryMetadata(
      ScanEntryMetadataReq.create({ scanId: this._scanId, entries: ScanEntryRange.create({ indexes: this._encodedIndexes }) })
    );
  }

  private getSpectrum(): Observable<SpectrumResp> {
    if (!this._spectrumDataService) {
      return throwError(() => new Error("getSpectrum: no data available"));
    }

    // NOTE: We need ALL spectra because the functions that access this sum across all spectra
    return this._spectrumDataService.getSpectra(this._scanId, null, false, false);
  }

  private getDiffractionPeakManualList(): Observable<DiffractionPeakManualListResp> {
    if (!this._cachedDataService) {
      return throwError(() => new Error("getDiffractionPeakManualList: no data available"));
    }

    // NOTE: We need ALL spectra because the functions that access this sum across all spectra
    return this._cachedDataService.getDiffractionPeakManualList(DiffractionPeakManualListReq.create({ scanId: this._scanId }));
  }

  private cacheElementInfo(quantData: QuantGetResp) {
    if (!quantData || !quantData.data || !quantData.data.labels) {
      throw new Error("cacheElementInfo: no quant data available");
    }

    const lookup = ExpressionDataSource.buildPureElementLookup(quantData.data.labels);
    this._pureElementColumnLookup = lookup.pureElementColumnLookup;
    this._elementColumns = lookup.elementColumns;

    // Also get a list of all detectors we have data for
    this._detectors = [];

    for (const quantLocSet of quantData.data.locationSet) {
      this._detectors.push(quantLocSet.detector);
    }
  }

  public static buildPureElementLookup(quantLabels: string[]): { pureElementColumnLookup: Map<string, string>; elementColumns: Map<string, string[]> } {
    const pureElementColumnLookup = new Map<string, string>();
    const elementColumns = new Map<string, string[]>();

    // Loop through all column names that may contain element information and store these names so we
    // can easily find them at runtime
    const columnTypesFound = new Set<string>();
    const elements = new Set<string>();
    //this._dataColumns = [];

    for (const label of quantLabels) {
      const labelBits = label.split("_");
      if (labelBits.length == 2) {
        if (labelBits[1] == "%" || labelBits[1] == "err" || labelBits[1] == "int") {
          // Remember it as a column type
          columnTypesFound.add(labelBits[1]);

          // Remember the element we found
          elements.add(labelBits[0]);
        }
      } /* else {
        this._dataColumns.push(label);
      }*/
    }

    for (const elem of elements.values()) {
      const colTypes = Array.from(columnTypesFound.values());
      elementColumns.set(elem, colTypes);
      //console.log('elem: '+elem);
      //console.log(colTypes);
      if (colTypes.indexOf("%") > -1) {
        // If we have a weight % column, and it's not an element, but a carbonate/oxide, we need to add
        // just weight % for the element
        const elemState = periodicTableDB.getElementOxidationState(elem);
        //console.log(elemState);
        if (elemState && !elemState.isElement) {
          elementColumns.set(elemState.element, ["%"]);

          // Also remember that this can be calculated
          pureElementColumnLookup.set(elemState.element + "_%", elem + "_%");
        }
      }
    }

    return { pureElementColumnLookup, elementColumns };
  }

  private readDiffractionData(diffractionData: DetectedDiffractionPeaksResp, scanId: string) {
    this._allPeaks = [];
    this._roughnessItems = [];
    const roughnessPMCs: Set<number> = new Set<number>();

    for (const item of diffractionData.peaksPerLocation) {
      const pmc: number = Number.parseInt(item.id);
      if (pmc === undefined) {
        console.warn("Diffraction file contained invalid location id: " + item.id);
        continue;
      }

      for (const peak of item.peaks) {
        if (peak.effectSize > 6.0) {
          if (peak.globalDifference > this._roughnessItemThreshold) {
            // It's roughness, can repeat so ensure we only save once
            if (!roughnessPMCs.has(pmc)) {
              let status = DiffractionPeak.roughnessPeak;
              if (this._diffractionStatuses[`${pmc}-${peak.peakChannel}`]) {
                status = this._diffractionStatuses[`${pmc}-${peak.peakChannel}`].status;
              }

              this._roughnessItems.push(
                new RoughnessItem(
                  pmc,
                  peak.globalDifference,
                  status !== DiffractionPeak.roughnessPeak // If it's not roughness, it's been deleted
                )
              );
              roughnessPMCs.add(pmc);
            }
          } else if (peak.peakHeight > 0.64) {
            // It's diffraction!
            const startChannel = peak.peakChannel - diffractionPeakWidth / 2;
            const endChannel = peak.peakChannel + diffractionPeakWidth / 2;

            // keV values will be calculated later
            const channels = [peak.peakChannel, startChannel, endChannel];
            let keVs: number[] = [];
            for (const calibration of this._spectrumEnergyCalibration) {
              if (calibration.detector == this._eVCalibrationDetector) {
                keVs = calibration.channelsTokeV(channels);
              }
            }

            if (keVs.length == 3) {
              let status = DiffractionPeak.diffractionPeak;
              if (this._diffractionStatuses[`${pmc}-${peak.peakChannel}`]) {
                status = this._diffractionStatuses[`${pmc}-${peak.peakChannel}`].status;
              }

              this._allPeaks.push(
                new DiffractionPeak(
                  pmc,

                  Math.min(100, peak.effectSize), // Found in SOL139 some spectra were corrupt and effect size was bazillions, so now capping at 100
                  peak.baselineVariation,
                  peak.globalDifference,
                  peak.differenceSigma,
                  peak.peakHeight,
                  peak.detector,
                  peak.peakChannel,
                  keVs[0],
                  keVs[1],
                  keVs[2],
                  status
                )
              );
            }
          }
          // else ignore
        }
        // else ignore
      }
    }

    const msg = `Diffraction for scan ${scanId} contained ${this._allPeaks.length} usable diffraction peaks, ${this._roughnessItems.length} roughness items`;
    if (this._allPeaks.length <= 0 || this._roughnessItems.length <= 0) {
      console.warn(msg);
    } else {
      console.log(msg);
    }

    this._allPeaks.sort((a: DiffractionPeak, b: DiffractionPeak) => {
      return a.pmc == b.pmc ? 0 : a.pmc < b.pmc ? -1 : 1;
    });
    this._roughnessItems.sort((a: RoughnessItem, b: RoughnessItem) => {
      return a.pmc == b.pmc ? 0 : a.pmc < b.pmc ? -1 : 1;
    });
  }

  // QuantifiedDataQuerierSource
  async getQuantifiedDataForDetector(detectorId: string, dataLabel: string): Promise<PMCDataValues> {
    if (this._debug) {
      this.logFunc(`getQuantifiedDataForDetector(${detectorId}, ${dataLabel})`);
    }

    return await lastValueFrom(
      this.getQuantData().pipe(
        map((quantData: QuantGetResp) => {
          if (!quantData || !quantData.data || !quantData.data.labels) {
            throw new Error("getQuantifiedDataForDetector: no quant data available");
          }

          const quantCol = ExpressionDataSource.getQuantColIndex(dataLabel, quantData.data.labels, this._pureElementColumnLookup);

          if (quantCol.idx < 0) {
            throw new Error(
              `Scan ${this._scanId} quantification does not contain column: "${dataLabel}". Please select (or create) a quantification with the relevant element.`
            );
          }

          //console.log('getQuantifiedDataForDetector detector='+detectorId+', dataLabel='+dataLabel+', idx='+idx+', factor='+toElemConvert);

          return ExpressionDataSource.getQuantifiedDataValues(
            this._scanId,
            quantData.data,
            detectorId,
            quantCol.idx,
            quantCol.toElemConvert,
            dataLabel.endsWith("_%")
          );
        })
      )
    );
  }

  public static getQuantColIndex(
    dataLabel: string,
    quantLabels: string[],
    pureElementColumnLookup: Map<string, string>
  ): { idx: number; toElemConvert: number | null } {
    let idx = quantLabels.indexOf(dataLabel);

    let toElemConvert = null;
    if (idx < 0) {
      // Since PIQUANT supporting carbonate/oxides, we may need to calculate this from an existing column
      // (we do this for carbonate->element or oxide->element)
      // Check what's being requested, to see if we can convert it
      const calcFrom = pureElementColumnLookup.get(dataLabel);
      if (calcFrom != undefined) {
        // we've found a column to look up from (eg dataLabel=Si_% and this found calcFrom=SiO2_%)
        // Get the index of that column
        idx = quantLabels.indexOf(calcFrom);

        if (idx >= 0) {
          // Also get the conversion factor we'll have to use
          const sepIdx = calcFrom.indexOf("_");
          if (sepIdx > -1) {
            // Following the above examples, this should become SiO2
            const oxideOrCarbonate = calcFrom.substring(0, sepIdx);

            const elemState = periodicTableDB.getElementOxidationState(oxideOrCarbonate);
            if (elemState && !elemState.isElement) {
              toElemConvert = elemState.conversionToElementWeightPct;
            }
          }
        }
      }
    }

    return { idx, toElemConvert };
  }

  public static getQuantifiedDataValues(
    scanId: string,
    quantData: Quantification,
    detectorId: string,
    colIdx: number,
    mult: number | null,
    isPctColumn: boolean
  ): PMCDataValues {
    const result = new PMCDataValues();
    result.isBinary = true; // pre-set for detection in addValue
    let detectorFound = false;

    // NOTE: if requesting "default" detector, just pick the first one
    if (detectorId === DefaultDetectorId && quantData.locationSet.length > 0) {
      detectorId = quantData.locationSet[0].detector;
    }

    // Loop through all our locations by PMC, find the quant value, store
    for (const quantLocSet of quantData.locationSet) {
      if (quantLocSet.detector == detectorId) {
        for (const quantLoc of quantLocSet.location) {
          const valueItem = quantLoc.values[colIdx];
          let value = valueItem.fvalue;
          let undef = false;

          if (quantData.types[colIdx] == Quantification_QuantDataType.QT_INT) {
            value = valueItem.ivalue;
          }

          // If we're a _% column, and the value is -1, ignore it. This is due to
          // multi-quantifications where we decided to use -1 to signify a missing
          // value (due to combining 2 quants with different element lists, therefore
          // ending up with some PMCs that have no value for a given element in the
          // quantification).
          if (isPctColumn && value == -1) {
            value = 0;
            undef = true;
          } else if (mult !== null) {
            value *= mult;
          }

          result.addValue(new PMCDataValue(quantLoc.pmc, value, undef));
        }

        detectorFound = true;
      }
    }

    if (!detectorFound) {
      const detectors: Set<string> = new Set<string>();
      for (const quantLocSet of quantData.locationSet) {
        detectors.add(quantLocSet.detector);
      }

      throw new Error(
        `Scan ${scanId} quantification does not contain data for detector: "${detectorId}". It only contains detector(s): "${Array.from(detectors).join(",")}"`
      );
    }

    return result;
  }

  async getElementList(): Promise<string[]> {
    if (this._debug) {
      this.logFunc(`getElementList()`);
    }

    return await lastValueFrom(
      this.getQuantData().pipe(
        map((quantData: QuantGetResp) => {
          return Array.from(this._elementColumns.keys());
        })
      )
    );
  }

  async getPMCList(): Promise<number[]> {
    if (this._debug) {
      this.logFunc(`getPMCList()`);
    }
    return await lastValueFrom(
      this.getQuantData().pipe(
        map((quantData: QuantGetResp) => {
          if (!quantData || !quantData.data) {
            throw new Error("getPMCList: no quant data available");
          }

          // Loop through all our locations and extract PMCs we have values for
          // NOTE: we don't care which detector...
          const result: number[] = [];

          for (const quantLocSet of quantData.data.locationSet) {
            for (const quantLoc of quantLocSet.location) {
              result.push(quantLoc.pmc);
            }
            break;
          }

          return result;
        })
      )
    );
  }

  async getDetectors(): Promise<string[]> {
    if (this._debug) {
      this.logFunc(`getDetectors()`);
    }
    return await lastValueFrom(
      this.getQuantData().pipe(
        map((quantData: QuantGetResp) => {
          return this._detectors;
        })
      )
    );
  }

  async columnExists(col: string): Promise<boolean> {
    if (this._debug) {
      this.logFunc(`columnExists(${col})`);
    }
    return await lastValueFrom(
      this.getQuantData().pipe(
        map((quantData: QuantGetResp) => {
          if (!quantData || !quantData.data) {
            throw new Error("columnExists: no quant data available");
          }

          return quantData.data.labels.indexOf(col) > -1;
        })
      )
    );
  }

  // PseudoIntensityDataQuerierSource
  async getPseudoIntensityData(name: string): Promise<PMCDataValues> {
    if (this._debug) {
      this.logFunc(`getPseudoIntensityData(${name})`);
    }
    return await lastValueFrom(
      this.getPseudoIntensity().pipe(
        map((pseudoData: PseudoIntensityResp) => {
          if (!pseudoData || !this._scanEntries || !this._scanEntries.entries) {
            throw new Error("getPseudoIntensityData: No data available");
          }
          if (this._scanEntryIndexesRequested.length <= 0) {
            throw new Error("getPseudoIntensityData: No indexes to return");
          }
          const elemIdx = pseudoData.intensityLabels.indexOf(name);
          if (elemIdx == -1) {
            throw new Error(`Scan ${this._scanId} does not include pseudo-intensity data with column name: "${name}"`);
          }

          // Run through all locations & build it
          const result = new PMCDataValues();
          result.isBinary = true; // pre-set for detection in addValue

          // TODO: filter by scan entry ids requested...
          // for (const idx of this._scanEntryIndexesRequested) {
          for (const item of pseudoData.data) {
            const pmc = item.id;
            const value = item.intensities[elemIdx];

            result.addValue(new PMCDataValue(pmc, value));
          }
          return result;
        })
      )
    );
  }

  async getPseudoIntensityElementsList(): Promise<string[]> {
    if (this._debug) {
      this.logFunc(`getPseudoIntensityElementsList()`);
    }
    return await lastValueFrom(
      this.getPseudoIntensity().pipe(
        map((pseudoIntensity: PseudoIntensityResp) => {
          if (!pseudoIntensity) {
            throw new Error("getPseudoIntensityElementsList: No intensity data");
          }
          return pseudoIntensity.intensityLabels;
        })
      )
    );
  }

  // SpectrumDataQuerierSource
  async getSpectrumRangeMapData(channelStart: number, channelEnd: number, detectorExpr: string): Promise<PMCDataValues> {
    if (this._debug) {
      this.logFunc(`getSpectrumRangeMapData(${channelStart}, ${channelEnd}, ${detectorExpr})`);
    }
    return await lastValueFrom(
      combineLatest([this.getScanMetaLabelsAndTypes(), this.getSpectrum() /*, this.getScanEntryMetadata()*/]).pipe(
        map((dataItems: [ScanMetaLabelsAndTypesResp, SpectrumResp /*, ScanEntryMetadataResp*/]) => {
          const scanMetaLabelsAndTypes = dataItems[0];
          const spectrumData = dataItems[1];
          //const scanMetaData = dataItems[2];

          if (!scanMetaLabelsAndTypes || /*!scanMetaData ||*/ !spectrumData || !this._scanEntries || !this._scanEntries.entries) {
            throw new Error("getSpectrumRangeMapData: No data available");
          }

          // For now, only supporting A & B for now
          if (detectorExpr != "A" && detectorExpr != "B") {
            throw new Error(`getSpectrumData: Invalid detectorExpr: ${detectorExpr}, must be A or B`);
          }

          if (channelStart < 0 || channelEnd < channelStart) {
            throw new Error("getSpectrumData: Invalid start/end channel specified");
          }

          let foundRange = false;
          const result = new PMCDataValues();
          result.isBinary = true; // pre-set for detection in addValue

          // Loop through & sum all values within the channel range
          for (let c = 0; c < spectrumData.spectraPerLocation.length; c++) {
            const loc = spectrumData.spectraPerLocation[c];
            for (const spectrum of loc.spectra) {
              // At this point, we want to read from the detectors in this location. We are reading spectra for each PMC
              // so we need to read for the detector specified (A vs B), and within there, we may have normal or dwell
              // spectra. We can't actually combine normal vs dwell because the counts in dwell would be higher so
              // we just hard-code here to read from normal!
              if (detectorExpr == spectrum.detector && spectrum.type == SpectrumType.SPECTRUM_NORMAL) {
                let channelEndToReadTo = channelEnd;
                if (channelEndToReadTo > spectrum.counts.length) {
                  channelEndToReadTo = spectrum.counts.length;
                }

                // Loop through & add it
                let sum = 0;
                for (let ch = channelStart; ch < channelEndToReadTo; ch++) {
                  sum += spectrum.counts[ch];
                }

                const pmc = this._scanEntries.entries[c].id;
                result.addValue(new PMCDataValue(pmc, sum));
                foundRange = true;
              }
            }
          }

          if (!foundRange) {
            throw new Error("getSpectrumData: Failed to find spectrum ${detectorExpr} range between ${channelStart} and ${channelEnd}");
          }

          return result;
        })
      )
    );
  }

  // If sumOrMax==true, returns sum of differences between A and B otherwise max difference seen between A and B
  async getSpectrumDifferences(channelStart: number, channelEnd: number, sumOrMax: boolean): Promise<PMCDataValues> {
    if (this._debug) {
      this.logFunc(`getSpectrumDifferences(${channelStart}, ${channelEnd}, ${sumOrMax})`);
    }
    return await lastValueFrom(
      this.getSpectrum().pipe(
        map((spectrumData: SpectrumResp) => {
          if (!spectrumData || !this._scanEntries || !this._scanEntries.entries) {
            throw new Error("getSpectrumDifferences: No data available");
          }

          const result = new PMCDataValues();
          result.isBinary = true; // pre-set for detection in addValue

          for (let c = 0; c < spectrumData.spectraPerLocation.length; c++) {
            const loc = spectrumData.spectraPerLocation[c];

            let spectrumA: number[] | null = null;
            let spectrumB: number[] | null = null;

            for (const spectrum of loc.spectra) {
              if (spectrum.type == SpectrumType.SPECTRUM_NORMAL) {
                if (spectrum.detector == "A") {
                  spectrumA = spectrum.counts;
                } else {
                  spectrumB = spectrum.counts;
                }
              }
            }
            // We've now got in theory an A and B, check this, and if so, do the operation requested
            if (spectrumA && spectrumB && spectrumA.length == spectrumB.length) {
              let value = 0;

              for (let c = channelStart; c < channelEnd; c++) {
                const channelAbsDiff = Math.abs(spectrumA[c] - spectrumB[c]);
                if (sumOrMax) {
                  value += channelAbsDiff;
                } else {
                  if (channelAbsDiff > value) {
                    value = channelAbsDiff;
                  }
                }
              }

              const pmc = this._scanEntries.entries[c].id;
              result.addValue(new PMCDataValue(pmc, value));
            }
          }

          return result;
        })
      )
    );
  }

  get allPeaks(): DiffractionPeak[] {
    return this._allPeaks;
  }

  get roughnessItems(): RoughnessItem[] {
    return this._roughnessItems;
  }

  // DiffractionPeakQuerierSource
  async getDiffractionPeakEffectData(channelStart: number, channelEnd: number): Promise<PMCDataValues> {
    if (this._debug) {
      this.logFunc(`getDiffractionPeakEffectData(${channelStart}, ${channelEnd})`);
    }
    return await lastValueFrom(
      combineLatest([this.getDetectedDiffractionStatus(), this.getDetectedDiffraction(), this.getDiffractionPeakManualList()]).pipe(
        map(([diffractionStatusData, diffractionData, userDiffractionPeakData]) => {
          // Detected Diffraction data is fetched for the Roughness and Diffraction tabs
          // We can continue here on fail, but without this data those tabs won't load
          if (!diffractionStatusData || /*!diffractionData ||*/ !this._scanEntries) {
            throw new Error("getDiffractionPeakEffectData: No data available");
          }

          // Run through all our diffraction peak data and return the sum of all peaks within the given channel range

          // First, add them up per PMC
          const pmcDiffractionCount = new Map<number, number>();

          // Fill the PMCs first
          for (const entry of this._scanEntries.entries) {
            if (entry.location && (entry.normalSpectra || entry.dwellSpectra || entry.bulkSpectra || entry.maxSpectra)) {
              pmcDiffractionCount.set(entry.id, 0);
            }
          }

          for (const peak of this._allPeaks) {
            const withinChannelRange = (channelStart === -1 || peak.channel >= channelStart) && (channelEnd === -1 || peak.channel < channelEnd);
            if (peak.status != DiffractionPeak.statusNotAnomaly && withinChannelRange) {
              let prev = pmcDiffractionCount.get(peak.pmc);
              if (!prev) {
                prev = 0;
              }
              pmcDiffractionCount.set(peak.pmc, prev + 1);
            }
          }

          // Also loop through user-defined peaks
          // If we can convert the user peak keV to a channel, do it and compare
          if (this._spectrumEnergyCalibration.length > 0 && userDiffractionPeakData?.peaks) {
            for (const cal of this._spectrumEnergyCalibration) {
              if (cal.detector == this._eVCalibrationDetector) {
                for (const id of Object.keys(userDiffractionPeakData.peaks)) {
                  const peak = userDiffractionPeakData.peaks[id];

                  // ONLY look at positive energies, negative means it's a user-entered roughness item!
                  if (peak.energykeV > 0) {
                    const ch = cal.keVsToChannel([peak.energykeV]);
                    if (ch.length == 1 && ch[0] >= channelStart && ch[0] < channelEnd) {
                      let prev = pmcDiffractionCount.get(peak.pmc);
                      if (!prev) {
                        prev = 0;
                      }
                      pmcDiffractionCount.set(peak.pmc, prev + 1);
                    }
                  }
                }

                break;
              }
            }
          }

          // Now turn these into data values
          const result = new PMCDataValues();
          result.isBinary = true; // pre-set for detection in addValue

          for (const [pmc, sum] of pmcDiffractionCount.entries()) {
            result.addValue(new PMCDataValue(pmc, sum));
          }

          return result;
        })
      )
    );
  }

  async getRoughnessData(): Promise<PMCDataValues> {
    if (this._debug) {
      this.logFunc(`getRoughnessData()`);
    }
    return await lastValueFrom(
      combineLatest([this.getDetectedDiffraction(), this.getDiffractionPeakManualList()]).pipe(
        map((dataItems: [DetectedDiffractionPeaksResp, DiffractionPeakManualListResp]) => {
          const diffractionData = dataItems[0];
          const userDiffractionPeakData = dataItems[1];
          if (!diffractionData) {
            throw new Error("getRoughnessData: No diffraction data");
          }

          // Loop through all roughness items and form a map from their globalDifference value
          const result = new PMCDataValues();
          result.isBinary = true; // pre-set for detection in addValue

          for (const item of this._roughnessItems) {
            result.addValue(new PMCDataValue(item.pmc, item.globalDifference));
          }

          // Also run through user-defined roughness items
          if (userDiffractionPeakData?.peaks) {
            for (const id of Object.keys(userDiffractionPeakData.peaks)) {
              const peak = userDiffractionPeakData.peaks[id];

              // ONLY negative means it's a user-entered roughness item!
              if (peak.energykeV < 0) {
                result.addValue(new PMCDataValue(peak.pmc, this._roughnessItemThreshold));
              }
            }
          }

          return result;
        })
      )
    );
  }

  // HousekeepingDataQuerierSource
  async getHousekeepingData(name: string): Promise<PMCDataValues> {
    if (this._debug) {
      this.logFunc(`getHousekeepingData(${name})`);
    }
    return await lastValueFrom(
      combineLatest([this.getScanMetaLabelsAndTypes(), this.getScanEntryMetadata()]).pipe(
        map((dataItems: [ScanMetaLabelsAndTypesResp, ScanEntryMetadataResp]) => {
          const scanMetaLabelsAndTypes = dataItems[0];
          const scanMetaData = dataItems[1];

          if (!scanMetaLabelsAndTypes || !scanMetaData || !this._scanEntries || !this._scanEntries.entries) {
            throw new Error("getHousekeepingData: No data available");
          }

          if (scanMetaData.entries.length != this._scanEntryIndexesRequested.length) {
            throw new Error(
              `getHousekeepingData: Requested ${this._scanEntryIndexesRequested.length} scan meta entries, but received ${scanMetaData.entries.length}`
            );
          }

          // If it exists as a metaLabel and has a type we can return, do it
          const metaIdx = scanMetaLabelsAndTypes.metaLabels.indexOf(name);
          if (metaIdx < 0) {
            throw new Error(`Scan ${this._scanId} does not include housekeeping data with column name: "${name}"`);
          }

          const metaType = scanMetaLabelsAndTypes.metaTypes[metaIdx];
          if (metaType != ScanMetaDataType.MT_FLOAT && metaType != ScanMetaDataType.MT_INT) {
            throw new Error("Non-numeric data type for housekeeping data column: " + name);
          }

          // Run through all locations & build it
          const result = new PMCDataValues();
          result.isBinary = true; // pre-set for detection in addValue

          for (let c = 0; c < scanMetaData.entries.length; c++) {
            const entry = scanMetaData.entries[c];
            if (entry) {
              const item = entry.meta[metaIdx];
              if (item === undefined) {
                throw new Error(`Scan entry ${c} does not contain housekeeping data labelled: "${name}"`);
              }

              const value = (metaType == ScanMetaDataType.MT_FLOAT ? item.fvalue : item.ivalue) || 0; // Shut up compiler...

              const locIdx = this._scanEntryIndexesRequested[c];
              const pmc = this._scanEntries.entries[locIdx].id;
              result.addValue(new PMCDataValue(pmc, value));
            }
          }

          return result;
        })
      )
    );
  }

  async getPositionData(axis: string): Promise<PMCDataValues> {
    if (this._debug) {
      this.logFunc(`getPositionData(${axis})`);
    }
    return await lastValueFrom(
      this.getScanBeamLocations().pipe(
        map((beamLocationData: ScanBeamLocationsResp) => {
          if (!beamLocationData || !this._scanEntries || !this._scanEntries.entries) {
            throw new Error("getPositionData: No data available");
          }

          if (beamLocationData.beamLocations.length != this._scanEntryIndexesRequested.length) {
            throw new Error(`getPositionData: Requested ${this._scanEntryIndexesRequested.length} locations, but received ${beamLocationData.beamLocations.length}`);
          }

          if (axis != "x" && axis != "y" && axis != "z") {
            throw new Error("Cannot find position for axis: " + axis);
          }

          const result = new PMCDataValues();
          result.isBinary = true; // pre-set for detection in addValue

          // We've requested the items indexed by _scanEntryIndexesRequested, so here we loop through them
          // but have to read the corresponding item in the response. Previously we had a bug here where
          // we iterated through the returned values using the _scanEntryIndexesRequested indexes!
          for (let c = 0; c < beamLocationData.beamLocations.length; c++) {
            const loc = beamLocationData.beamLocations[c];
            const locIdx = this._scanEntryIndexesRequested[c];

            if (loc) {
              const pmc = this._scanEntries.entries[locIdx].id;
              // TODO: We should fix this another way, but for now, we request "only" the indexes needed - but that's defined
              //       by what has spectra (see prepare())!
              // The bulk/max PMC will have spectra, but likely an invalid location so here we check for that. Because protobuf
              // doesn't encode "null" values, it actually puts 0,0,0 there. That's not a likely valid coordinate anyway, so we
              // can check for it here
              if (loc.x !== 0 || loc.y !== 0 || loc.z !== 0) {
                result.addValue(new PMCDataValue(pmc, axis == "x" ? loc.x : axis == "y" ? loc.y : loc.z));
              }
            }
          }

          return result;
        })
      )
    );
  }

  async hasHousekeepingData(name: string): Promise<boolean> {
    if (this._debug) {
      this.logFunc(`hasHousekeepingData(${name})`);
    }
    return await lastValueFrom(
      this.getScanMetaLabelsAndTypes().pipe(
        map((scanMetaLabelsAndTypes: ScanMetaLabelsAndTypesResp) => {
          if (!scanMetaLabelsAndTypes) {
            throw new Error("hasHousekeepingData: No scan meta data");
          }

          const metaIdx = scanMetaLabelsAndTypes.metaLabels.indexOf(name);
          if (metaIdx < 0) {
            // Name not found
            return false;
          }

          const metaType = scanMetaLabelsAndTypes.metaTypes[metaIdx];
          if (metaType != ScanMetaDataType.MT_FLOAT && metaType != ScanMetaDataType.MT_INT) {
            // We can only return floats & ints so say no
            return false;
          }

          return true;
        })
      )
    );
  }

  private logFunc(call: string): void {
    if (this._debug) {
      const now = performance.now();
      const tm = now - this._prepTime;
      const tmInterval = now - this._lastTime;
      console.log(`${call}, elapsed total: ${tm.toLocaleString()}ms, elapsed since last: ${tmInterval.toLocaleString()}ms`);
      this._lastTime = now;
    }
  }
}
