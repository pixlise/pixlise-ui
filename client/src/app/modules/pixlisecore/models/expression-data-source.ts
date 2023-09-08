import { Observable, combineLatest, concatMap, map, tap } from "rxjs";
import {
  DiffractionPeakQuerierSource,
  HousekeepingDataQuerierSource,
  PseudoIntensityDataQuerierSource,
  QuantifiedDataQuerierSource,
  SpectrumDataQuerierSource,
} from "src/app/expression-language/data-sources";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { APIDataService } from "../services/apidata.service";
import { QuantGetReq, QuantGetResp } from "src/app/generated-protos/quantification-retrieval-msgs";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "src/app/generated-protos/scan-beam-location-msgs";
import { ScanEntryReq, ScanEntryResp } from "src/app/generated-protos/scan-entry-msgs";
import { ScanEntryMetadataReq, ScanEntryMetadataResp } from "src/app/generated-protos/scan-entry-metadata-msgs";
import { SpectrumReq, SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { ScanEntryRange, ScanMetaDataType } from "src/app/generated-protos/scan";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { decodeIndexList, encodeIndexList, decompressZeroRunLengthEncoding } from "src/app/utils/utils";
import { DetectedDiffractionPeaksReq, DetectedDiffractionPeaksResp } from "src/app/generated-protos/diffraction-detected-peak-msgs";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";
import { Quantification, Quantification_QuantDataType } from "src/app/generated-protos/quantification";
import { ScanMetaLabelsAndTypesReq, ScanMetaLabelsAndTypesResp } from "src/app/generated-protos/scan-msgs";
import { SpectrumType } from "src/app/generated-protos/spectrum";
import { DiffractionPeak, RoughnessItem, diffractionPeakWidth } from "./diffraction";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { DiffractionPeakManualListReq, DiffractionPeakManualListResp } from "src/app/generated-protos/diffraction-manual-msgs";

export class ExpressionDataSource
  implements
    DiffractionPeakQuerierSource,
    HousekeepingDataQuerierSource,
    PseudoIntensityDataQuerierSource,
    QuantifiedDataQuerierSource,
    SpectrumDataQuerierSource
{
  private _scanEntryIndexesRequested: number[] = [];

  private _scanEntries: ScanEntryResp | null = null;
  private _quantData: QuantGetResp | null = null;
  private _scanBeamLocationData: ScanBeamLocationsResp | null = null;
  private _scanMetaData: ScanEntryMetadataResp | null = null;
  private _spectrumData: SpectrumResp | null = null;
  private _pseudoIntensityData: PseudoIntensityResp | null = null;
  private _diffractionData: DetectedDiffractionPeaksResp | null = null;
  private _scanMetaLabelsAndTypes: ScanMetaLabelsAndTypesResp | null = null;
  private _userDiffractionPeakData: DiffractionPeakManualListResp | null = null;

  // Further-processed quant data for faster lookup later
  private _elementColumns = new Map<string, string[]>();
  //private _dataColumns: string[] = [];
  private _detectors: string[] = [];

  // A map to allow us to find what pure elements can be calculated from what else. So if quant had
  // data for SiO2_%, here we'd store have Si_%->SiO2_%. This helps getQuantifiedDataForDetector()
  // determine what to do if a column isn't found outright in _elementColumns
  private _pureElementColumnLookup = new Map<string, string>();

  // Derived from diffraction data coming in
  private _allPeaks: DiffractionPeak[] = [];
  private _roughnessItems: RoughnessItem[] = [];

  // What we consider to be a "roughness" item for the purposes of diffraction:
  private _roughnessItemThreshold = 0.16;

  // Needed by DiffractionPeakQuerierSource
  private _spectrumEnergyCalibration: SpectrumEnergyCalibration[] = [];

  // TODO: Which detectors calibration do we adopt?
  private _eVCalibrationDetector = "A";

  // Here we get the data required to honor the interfaces we implement, based on the above
  prepare(
    dataService: APIDataService,
    scanId: string,
    quantId: string,
    roiId: string,
    spectrumEnergyCalibration: SpectrumEnergyCalibration[]
  ): Observable<void> {
    if (roiId == PredefinedROIID.SelectedPoints || roiId == PredefinedROIID.RemainingPoints) {
      throw new Error("Cannot ExpressionDataSource with roiId: " + roiId);
    }

    this._spectrumEnergyCalibration = spectrumEnergyCalibration;

    // Firstly, request the ROI if there is one
    let indexes: Observable<number[]>;

    if (roiId.length > 0 && roiId != PredefinedROIID.AllPoints) {
      // We're looking up the ROI specified to find the list of location indexes to process BUT we still need
      // the full list of scan entries!
      indexes = dataService.sendRegionOfInterestGetRequest(RegionOfInterestGetReq.create({ id: roiId })).pipe(
        concatMap((resp: RegionOfInterestGetResp) => {
          if (resp.regionOfInterest === undefined) {
            throw new Error("regionOfInterest indexes not returned for " + roiId);
          }

          const roiIdxs = decodeIndexList(resp.regionOfInterest?.scanEntryIndexesEncoded);

          return this.getScanEntries(dataService, scanId).pipe(
            map((scanEntryResp: ScanEntryResp) => {
              // We just got the above as a side-effect, we are actually returning the index list from ROI
              return roiIdxs;
            })
          );
        })
      );
    } else {
      // No ROIs, so request all scan entries, and we can just work off "all" points
      indexes = this.getScanEntries(dataService, scanId).pipe(
        map((resp: ScanEntryResp) => {
          if (resp.entries === undefined) {
            throw new Error("ScanEntryResp indexes not returned for " + scanId);
          }

          const idxs = [];
          for (let c = 0; c < resp.entries.length; c++) {
            const entry = resp.entries[c];
            if (entry.spectra) {
              idxs.push(c);
            }
          }
          return idxs;
        })
      );
    }

    // Once we obtained the indexes, we can retrieve everything else required
    return indexes.pipe(
      concatMap((scanEntryIndexes: number[]) => {
        this._scanEntryIndexesRequested = scanEntryIndexes;

        const encodedIndexes = encodeIndexList(scanEntryIndexes);

        // We have the indexes, request all the other data we need
        return combineLatest([
          dataService.sendQuantGetRequest(QuantGetReq.create({ quantId: quantId, summaryOnly: false })),
          dataService.sendScanBeamLocationsRequest(
            ScanBeamLocationsReq.create({ scanId: scanId, entries: ScanEntryRange.create({ indexes: encodedIndexes }) })
          ),
          dataService.sendScanEntryMetadataRequest(
            ScanEntryMetadataReq.create({ scanId: scanId, entries: ScanEntryRange.create({ indexes: encodedIndexes }) })
          ),
          // NOTE: We need ALL spectra because the functions that access this sum across all spectra
          dataService.sendSpectrumRequest(
            SpectrumReq.create({ scanId: scanId /*, entries: ScanEntryRange.create({ indexes: encodedIndexes })*/ })
          ),
          dataService.sendPseudoIntensityRequest(
            PseudoIntensityReq.create({ scanId: scanId, entries: ScanEntryRange.create({ indexes: encodedIndexes }) })
          ),
          dataService.sendDetectedDiffractionPeaksRequest(
            DetectedDiffractionPeaksReq.create({ scanId: scanId, entries: ScanEntryRange.create({ indexes: encodedIndexes }) })
          ),
          dataService.sendScanMetaLabelsAndTypesRequest(ScanMetaLabelsAndTypesReq.create({ scanId: scanId })),
          dataService.sendDiffractionPeakManualListRequest(DiffractionPeakManualListReq.create({ scanId: scanId })),
        ]).pipe(
          map(
            (
              values: [
                QuantGetResp,
                ScanBeamLocationsResp,
                ScanEntryMetadataResp,
                SpectrumResp,
                PseudoIntensityResp,
                DetectedDiffractionPeaksResp,
                ScanMetaLabelsAndTypesResp,
                DiffractionPeakManualListResp,
              ]
            ) => {
              // Here we store all the info we need
              this._quantData = values[0];
              this._scanBeamLocationData = values[1];
              this._scanMetaData = values[2];
              this._spectrumData = values[3];
              this._pseudoIntensityData = values[4];
              this._diffractionData = values[5];
              this._scanMetaLabelsAndTypes = values[6];
              this._userDiffractionPeakData = values[7];

              this.cacheElementInfo(this._quantData);
              this.decompressSpectra(this._spectrumData);

              this.readDiffractionData(this._diffractionData, scanId);

              // We are returning void!
              return;
            }
          )
        );
      })
    );
  }

  private getScanEntries(dataService: APIDataService, scanId: string): Observable<ScanEntryResp> {
    return dataService.sendScanEntryRequest(ScanEntryReq.create({ scanId: scanId })).pipe(
      tap((resp: ScanEntryResp) => {
        if (resp.entries === undefined) {
          throw new Error("ScanEntryResp indexes not returned for " + scanId);
        }

        this._scanEntries = resp;
      })
    );
  }
  /*
  private getPMCsForEntryIndexes(entryIdxs: number[]): number[] {
    if (!this._scanEntries || !this._scanEntries.entries) {
      throw new Error("getPMC: ScanEntryResp indexes not available");
    }

    const result = [];
    for (const entryIdx of entryIdxs) {
      result.push(this._scanEntries.entries[entryIdx].id);
    }
    return result;
  }
*/
  private cacheElementInfo(quantData: QuantGetResp) {
    if (!quantData || !quantData.data || !quantData.data.labels) {
      throw new Error("cacheElementInfo: no quant data available");
    }

    // Loop through all column names that may contain element information and store these names so we
    // can easily find them at runtime
    const columnTypesFound = new Set<string>();
    const elements = new Set<string>();
    //this._dataColumns = [];
    this._elementColumns.clear();
    this._pureElementColumnLookup.clear();

    for (const label of quantData.data.labels) {
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
      this._elementColumns.set(elem, colTypes);
      //console.log('elem: '+elem);
      //console.log(colTypes);
      if (colTypes.indexOf("%") > -1) {
        // If we have a weight % column, and it's not an element, but a carbonate/oxide, we need to add
        // just weight % for the element
        const elemState = periodicTableDB.getElementOxidationState(elem);
        //console.log(elemState);
        if (elemState && !elemState.isElement) {
          this._elementColumns.set(elemState.element, ["%"]);

          // Also remember that this can be calculated
          this._pureElementColumnLookup.set(elemState.element + "_%", elem + "_%");
        }
      }
    }

    // Also get a list of all detectors we have data for
    this._detectors = [];

    for (const quantLocSet of quantData.data.locationSet) {
      this._detectors.push(quantLocSet.detector);
    }
  }

  private decompressSpectra(spectrumData: SpectrumResp) {
    // We get spectra with runs of 0's run-length encoded. Here we decode them to have the full spectrum channel list in memory
    // and this way we also don't double up on storage in memory
    for (const loc of spectrumData.spectraPerLocation) {
      for (const spectrum of loc.spectra) {
        spectrum.counts = Array.from(decompressZeroRunLengthEncoding(spectrum.counts, spectrumData.channelCount));
      }
    }
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
              this._roughnessItems.push(
                new RoughnessItem(
                  pmc,
                  peak.globalDifference,
                  false // at tihs point we don't know yet
                )
              );
              roughnessPMCs.add(pmc);
            }
          } else if (peak.peakHeight > 0.64) {
            // It's diffraction!
            const startChannel = peak.peakChannel - diffractionPeakWidth / 2;
            const endChannel = peak.peakChannel + diffractionPeakWidth / 2;

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

                // keV values will be calculated later
                this.channelTokeV(peak.peakChannel, this._eVCalibrationDetector),
                this.channelTokeV(startChannel, this._eVCalibrationDetector),
                this.channelTokeV(endChannel, this._eVCalibrationDetector),

                DiffractionPeak.statusUnspecified
              )
            );
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

  private channelTokeV(channel: number, detector: string) {
    let calibrated = 0;

    for (const calibration of this._spectrumEnergyCalibration) {
      if (calibration.detector == detector) {
        calibrated = calibration.eVstart + channel * calibration.eVperChannel;
        break;
      }
    }

    return calibrated * 0.001; // keV conversion
  }

  private keVToChannel(keV: number, detector: string): number | null {
    const eV = keV * 1000;

    for (const calibration of this._spectrumEnergyCalibration) {
      if (calibration.detector == detector) {
        return Math.floor((eV - calibration.eVstart) / calibration.eVperChannel);
      }
    }

    return null;
  }

  // QuantifiedDataQuerierSource
  getQuantifiedDataForDetector(detectorId: string, dataLabel: string): PMCDataValues {
    if (!this._quantData || !this._quantData.data) {
      throw new Error("getQuantifiedDataForDetector: no quant data available");
    }

    let idx = this._quantData.data.labels.indexOf(dataLabel);

    let toElemConvert = null;
    if (idx < 0) {
      // Since PIQUANT supporting carbonate/oxides, we may need to calculate this from an existing column
      // (we do this for carbonate->element or oxide->element)
      // Check what's being requested, to see if we can convert it
      const calcFrom = this._pureElementColumnLookup.get(dataLabel);
      if (calcFrom != undefined) {
        // we've found a column to look up from (eg dataLabel=Si_% and this found calcFrom=SiO2_%)
        // Get the index of that column
        idx = this._quantData.data.labels.indexOf(calcFrom);

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

    if (idx < 0) {
      throw new Error(
        `The currently loaded quantification does not contain column: "${dataLabel}". Please select (or create) a quantification with the relevant element.`
      );
    }

    //console.log('getQuantifiedDataForDetector detector='+detectorId+', dataLabel='+dataLabel+', idx='+idx+', factor='+toElemConvert);
    const data = this.getQuantifiedDataValues(this._quantData.data, detectorId, idx, toElemConvert, dataLabel.endsWith("_%"));
    return PMCDataValues.makeWithValues(data);
  }

  private getQuantifiedDataValues(
    quantData: Quantification,
    detectorId: string,
    colIdx: number,
    mult: number | null,
    isPctColumn: boolean
  ): PMCDataValue[] {
    const resultData: PMCDataValue[] = [];
    let detectorFound = false;
    const detectors: Set<string> = new Set<string>(this.getDetectors());

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

          resultData.push(new PMCDataValue(quantLoc.pmc, value, undef));
        }

        detectorFound = true;
      }
    }

    if (!detectorFound) {
      throw new Error(
        'The currently loaded quantification does not contain data for detector: "' +
          detectorId +
          '". It only contains detector(s): "' +
          Array.from(detectors).join(",") +
          '"'
      );
    }

    return resultData;
  }

  getElementList(): string[] {
    if (!this._quantData || !this._quantData.data) {
      throw new Error("getElementList: no quant data available");
    }

    return Array.from(this._elementColumns.keys());
  }

  getPMCList(): number[] {
    if (!this._quantData || !this._quantData.data) {
      throw new Error("getPMCList: no quant data available");
    }

    // Loop through all our locations and extract PMCs we have values for
    // NOTE: we don't care which detector...
    const result: number[] = [];

    for (const quantLocSet of this._quantData.data.locationSet) {
      for (const quantLoc of quantLocSet.location) {
        result.push(quantLoc.pmc);
      }
      break;
    }

    return result;
  }

  getDetectors(): string[] {
    if (!this._quantData || !this._quantData.data) {
      throw new Error("getDetectors: no quant data available");
    }

    return this._detectors;
  }

  columnExists(col: string): boolean {
    if (!this._quantData || !this._quantData.data) {
      throw new Error("columnExists: no quant data available");
    }

    return this._quantData.data.labels.indexOf(col) > -1;
  }

  // PseudoIntensityDataQuerierSource
  getPseudoIntensityData(name: string): PMCDataValues {
    if (!this._pseudoIntensityData || !this._scanEntries || !this._scanEntries.entries) {
      throw new Error("getPseudoIntensityElementsList: No intensity data");
    }
    if (this._scanEntryIndexesRequested.length <= 0) {
      throw new Error("getPseudoIntensityElementsList: No indexes to return");
    }
    const elemIdx = this._pseudoIntensityData.intensityLabels.indexOf(name);
    if (elemIdx == -1) {
      throw new Error(`The currently loaded dataset does not include pseudo-intensity data with column name: "${name}"`);
    }

    // Run through all locations & build it
    const values: PMCDataValue[] = [];
    for (const idx of this._scanEntryIndexesRequested) {
      const pmc = this._scanEntries.entries[idx].id;
      const value = this._pseudoIntensityData.data[idx].intensities[elemIdx];

      values.push(new PMCDataValue(pmc, value));
    }
    return PMCDataValues.makeWithValues(values);
  }

  getPseudoIntensityElementsList(): string[] {
    if (!this._pseudoIntensityData) {
      throw new Error("getPseudoIntensityElementsList: No intensity data");
    }
    return this._pseudoIntensityData.intensityLabels;
  }

  // SpectrumDataQuerierSource
  getSpectrumRangeMapData(channelStart: number, channelEnd: number, detectorExpr: string): PMCDataValues {
    if (!this._scanMetaLabelsAndTypes || !this._scanMetaData || !this._spectrumData || !this._scanEntries || !this._scanEntries.entries) {
      throw new Error("getSpectrumRangeMapData: No scan meta data");
    }

    // For now, only supporting A & B for now
    if (detectorExpr != "A" && detectorExpr != "B") {
      throw new Error(`getSpectrumData: Invalid detectorExpr: ${detectorExpr}, must be A or B`);
    }

    if (channelStart < 0 || channelEnd < channelStart) {
      throw new Error("getSpectrumData: Invalid start/end channel specified");
    }

    let foundRange = false;
    const values: PMCDataValue[] = [];

    // Loop through & sum all values within the channel range
    for (let c = 0; c < this._spectrumData.spectraPerLocation.length; c++) {
      const loc = this._spectrumData.spectraPerLocation[c];
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
          values.push(new PMCDataValue(pmc, sum));
          foundRange = true;
        }
      }
    }

    if (!foundRange) {
      throw new Error("getSpectrumData: Failed to find spectrum ${detectorExpr} range between ${channelStart} and ${channelEnd}");
    }

    return PMCDataValues.makeWithValues(values);
  }

  // If sumOrMax==true, returns sum of differences between A and B otherwise max difference seen between A and B
  getSpectrumDifferences(channelStart: number, channelEnd: number, sumOrMax: boolean): PMCDataValues {
    if (!this._scanMetaLabelsAndTypes || !this._scanMetaData || !this._spectrumData || !this._scanEntries || !this._scanEntries.entries) {
      throw new Error("getSpectrumRangeMapData: No scan meta data");
    }

    const values: PMCDataValue[] = [];

    for (let c = 0; c < this._spectrumData.spectraPerLocation.length; c++) {
      const loc = this._spectrumData.spectraPerLocation[c];

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
        values.push(new PMCDataValue(pmc, value));
      }
    }

    return PMCDataValues.makeWithValues(values);
  }

  // DiffractionPeakQuerierSource
  getDiffractionPeakEffectData(channelStart: number, channelEnd: number): PMCDataValues {
    if (!this._diffractionData || !this._scanEntries) {
      throw new Error("getDiffractionPeakEffectData: No diffraction data");
    }

    // Run through all our diffraction peak data and return the sum of all peaks within the given channel range

    // First, add them up per PMC
    const pmcDiffractionCount = new Map<number, number>();

    // Fill the PMCs first
    for (const entry of this._scanEntries.entries) {
      if (entry.location && entry.spectra) {
        pmcDiffractionCount.set(entry.id, 0);
      }
    }

    for (const peak of this._allPeaks) {
      if (peak.status != DiffractionPeak.statusNotAnomaly && peak.channel >= channelStart && peak.channel < channelEnd) {
        let prev = pmcDiffractionCount.get(peak.pmc);
        if (!prev) {
          prev = 0;
        }
        pmcDiffractionCount.set(peak.pmc, prev + 1);
      }
    }

    // Also loop through user-defined peaks
    // If we can convert the user peak keV to a channel, do it and compare
    if (this._spectrumEnergyCalibration.length > 0 && this._userDiffractionPeakData?.peaks) {
      for (const id of Object.keys(this._userDiffractionPeakData.peaks)) {
        const peak = this._userDiffractionPeakData.peaks[id];

        // ONLY look at positive energies, negative means it's a user-entered roughness item!
        if (peak.energykeV > 0) {
          const channel = this.keVToChannel(peak.energykeV, this._eVCalibrationDetector);
          if (channel !== null && channel >= channelStart && channel < channelEnd) {
            let prev = pmcDiffractionCount.get(peak.pmc);
            if (!prev) {
              prev = 0;
            }
            pmcDiffractionCount.set(peak.pmc, prev + 1);
          }
        }
      }
    }

    // Now turn these into data values
    const result: PMCDataValue[] = [];
    for (const [pmc, sum] of pmcDiffractionCount.entries()) {
      result.push(new PMCDataValue(pmc, sum));
    }

    return PMCDataValues.makeWithValues(result);
  }

  getRoughnessData(): PMCDataValues {
    if (!this._diffractionData) {
      throw new Error("getRoughnessData: No diffraction data");
    }

    // Loop through all roughness items and form a map from their globalDifference value
    const result: PMCDataValue[] = [];

    for (const item of this._roughnessItems) {
      result.push(new PMCDataValue(item.pmc, item.globalDifference));
    }

    // Also run through user-defined roughness items
    if (this._userDiffractionPeakData?.peaks) {
      for (const id of Object.keys(this._userDiffractionPeakData.peaks)) {
        const peak = this._userDiffractionPeakData.peaks[id];

        // ONLY negative means it's a user-entered roughness item!
        if (peak.energykeV < 0) {
          result.push(new PMCDataValue(peak.pmc, this._roughnessItemThreshold));
        }
      }
    }

    return PMCDataValues.makeWithValues(result);
  }

  // HousekeepingDataQuerierSource
  getHousekeepingData(name: string): PMCDataValues {
    if (!this._scanMetaLabelsAndTypes || !this._scanMetaData || !this._scanEntries || !this._scanEntries.entries) {
      throw new Error("getHousekeepingData: No scan meta data");
    }

    // If it exists as a metaLabel and has a type we can return, do it
    const metaIdx = this._scanMetaLabelsAndTypes.metaLabels.indexOf(name);
    if (metaIdx < 0) {
      throw new Error('The currently loaded dataset does not include housekeeping data with column name: "' + name + '"');
    }

    const metaType = this._scanMetaLabelsAndTypes.metaTypes[metaIdx];
    if (metaType != ScanMetaDataType.MT_FLOAT && metaType != ScanMetaDataType.MT_INT) {
      throw new Error("Non-numeric data type for housekeeping data column: " + name);
    }

    // Run through all locations & build it
    const values: PMCDataValue[] = [];

    for (const idx of this._scanEntryIndexesRequested) {
      const entry = this._scanMetaData.entries[idx];
      if (entry) {
        const item = entry.meta[metaIdx];
        let value = metaType == ScanMetaDataType.MT_FLOAT ? item.fvalue : item.ivalue;

        // Shut up compiler...
        if (value === undefined) {
          value = 0;
        }

        const pmc = this._scanEntries.entries[idx].id;
        values.push(new PMCDataValue(pmc, value));
      }
    }

    return PMCDataValues.makeWithValues(values);
  }

  getPositionData(axis: string): PMCDataValues {
    if (!this._scanBeamLocationData || !this._scanEntries || !this._scanEntries.entries) {
      throw new Error("getPositionData: No scan meta data");
    }

    if (axis != "x" && axis != "y" && axis != "z") {
      throw new Error("Cannot find position for axis: " + axis);
    }

    const values: PMCDataValue[] = [];

    for (const idx of this._scanEntryIndexesRequested) {
      const loc = this._scanBeamLocationData.beamLocations[idx];
      if (loc) {
        const pmc = this._scanEntries.entries[idx].id;
        values.push(new PMCDataValue(pmc, axis == "x" ? loc.x : axis == "y" ? loc.y : loc.z));
      }
    }

    return PMCDataValues.makeWithValues(values);
  }

  hasHousekeepingData(name: string): boolean {
    if (!this._scanMetaLabelsAndTypes) {
      throw new Error("hasHousekeepingData: No scan meta data");
    }

    const metaIdx = this._scanMetaLabelsAndTypes.metaLabels.indexOf(name);
    if (metaIdx < 0) {
      // Name not found
      return false;
    }

    const metaType = this._scanMetaLabelsAndTypes.metaTypes[metaIdx];
    if (metaType != ScanMetaDataType.MT_FLOAT && metaType != ScanMetaDataType.MT_INT) {
      // We can only return floats & ints so say no
      return false;
    }

    return true;
  }
}
