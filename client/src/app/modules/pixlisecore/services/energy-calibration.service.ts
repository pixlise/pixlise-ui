import { Injectable } from "@angular/core";
import { Observable, combineLatest, map, of, shareReplay } from "rxjs";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { APICachedDataService } from "./apicacheddata.service";
import { SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { ScanMetaLabelsAndTypesReq, ScanMetaLabelsAndTypesResp } from "src/app/generated-protos/scan-msgs";
import { QuantGetReq } from "src/app/generated-protos/quantification-retrieval-msgs";
import { ExpressionDataSource } from "../models/expression-data-source";
import { ScanCalibrationConfiguration, ScanConfiguration, ScreenConfiguration } from "src/app/generated-protos/screen-configuration";
import { AnalysisLayoutService } from "../../analysis/analysis.module";
import { SpectrumDataService } from "./spectrum-data.service";
import { SentryHelper } from "src/app/utils/utils";

@Injectable({
  providedIn: "root",
})
export class EnergyCalibrationService {
  // The currently applied calibration
  private _currentCalibration: Map<string, SpectrumEnergyCalibration[]> = new Map<string, SpectrumEnergyCalibration[]>();

  // For rate limiting messages about this...
  private _scanIdsComplainedAbout = new Set<string>();

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _cachedDataService: APICachedDataService,
    private _spectrumDataService: SpectrumDataService
  ) {
    if (this._currentCalibration.size === 0) {
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(config => {
        this.loadCalibrationFromScreenConfiguration(config);
      });
    }
  }

  private loadCalibrationFromScreenConfiguration(config: ScreenConfiguration) {
    if (config.scanConfigurations) {
      Object.entries(config.scanConfigurations).forEach(([scanId, scanConfig]) => {
        let calibrations = scanConfig.calibrations.map(
          calibration => new SpectrumEnergyCalibration(calibration.eVstart, calibration.eVperChannel, calibration.detector)
        );
        this._currentCalibration.set(scanId, calibrations);
      });
    }
  }

  setCurrentCalibration(scanId: string, values: SpectrumEnergyCalibration[]) {
    this._currentCalibration.set(scanId, values);
    const currentConfig = this._analysisLayoutService.activeScreenConfiguration$.value;
    if (currentConfig && currentConfig.id) {
      if (!currentConfig.scanConfigurations) {
        currentConfig.scanConfigurations = {};
      }

      if (!currentConfig.scanConfigurations[scanId]) {
        currentConfig.scanConfigurations[scanId] = ScanConfiguration.create({ id: scanId });
      }

      let isNewCalibration = false;

      const existingCalibrations = currentConfig.scanConfigurations[scanId].calibrations;
      const calibrations: ScanCalibrationConfiguration[] = [];
      values.forEach(({ eVstart, eVperChannel, detector }, i) => {
        if (
          i >= existingCalibrations.length ||
          existingCalibrations[i].eVstart !== eVstart ||
          existingCalibrations[i].eVperChannel !== eVperChannel ||
          existingCalibrations[i].detector !== detector
        ) {
          isNewCalibration = true;
        }

        calibrations.push(ScanCalibrationConfiguration.create({ eVstart, eVperChannel, detector }));
      });

      if (isNewCalibration) {
        currentConfig.scanConfigurations[scanId].calibrations = calibrations;
        this._analysisLayoutService.writeScreenConfiguration(currentConfig);
      }
    }
  }

  getCurrentCalibration(scanId: string): Observable<SpectrumEnergyCalibration[]> {
    const calibration = this._currentCalibration.get(scanId);
    if (!calibration) {
      return of([]);
    }

    return of(calibration);
  }

  getScanCalibration(scanId: string): Observable<SpectrumEnergyCalibration[]> {
    return combineLatest([
      this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({ scanId: scanId })),
      this._spectrumDataService.getSpectra(scanId, [], true, false),
    ]).pipe(
      map(values => {
        const metaResp = values[0] as ScanMetaLabelsAndTypesResp;
        const spectrumResp = values[1] as SpectrumResp;

        const calibration: SpectrumEnergyCalibration[] = [];

        const eVStartMetaIdx = metaResp.metaLabels.indexOf("OFFSET");
        const eVperChannelMetaIdx = metaResp.metaLabels.indexOf("XPERCHAN");

        if (eVStartMetaIdx > -1 && eVperChannelMetaIdx > -1) {
          for (const spectrum of spectrumResp.bulkSpectra) {
            let eVstart = 0;
            let eVperChannel = 1;

            const eVstartMeta = spectrum.meta[eVStartMetaIdx];
            if (eVstartMeta.fvalue !== undefined) {
              eVstart = eVstartMeta.fvalue;
            } else if (eVstartMeta.ivalue !== undefined) {
              eVstart = eVstartMeta.ivalue;
            }

            const eVperChannelMeta = spectrum.meta[eVperChannelMetaIdx];
            if (eVperChannelMeta.fvalue !== undefined) {
              eVperChannel = eVperChannelMeta.fvalue;
            } else if (eVperChannelMeta.ivalue !== undefined) {
              eVperChannel = eVperChannelMeta.ivalue;
            }

            calibration.push(new SpectrumEnergyCalibration(eVstart, eVperChannel, spectrum.detector));
          }
        } else {
          if (!this._scanIdsComplainedAbout.has(scanId)) {
            SentryHelper.logMsg(true, `Scan: ${scanId} did not have OFFSET or XPERCHAN defined`);
            this._scanIdsComplainedAbout.add(scanId);
          }
        }

        return calibration;
      }),
      shareReplay(1)
    );
  }

  getQuantCalibration(scanId: string, quantId: string): Observable<SpectrumEnergyCalibration[]> {
    return this._cachedDataService.getQuant(QuantGetReq.create({ quantId: quantId, summaryOnly: false })).pipe(
      map(resp => {
        if (!resp.data) {
          throw new Error(`Query for quantification ${quantId} didn't return data`);
        }

        const eVstartIdx = resp.data.labels.indexOf("eVstart");
        const eVperChannelIdx = resp.data.labels.indexOf("eV/ch");
        if (eVstartIdx < 0 || eVperChannelIdx < 0) {
          return [];
        }

        // Average all of them, per detector
        const detectors = [];
        for (const quantLocSet of resp.data.locationSet) {
          detectors.push(quantLocSet.detector);
        }

        // If we have Combined and A/B, pick A/B
        for (let c = 0; c < detectors.length; c++) {
          if (detectors[c] == "Combined" && detectors.length > 1) {
            detectors.splice(c, 1);
            break;
          }
        }

        const columns = [];
        for (const detector of detectors) {
          columns.push(ExpressionDataSource.getQuantifiedDataValues(scanId, resp.data, detector, eVstartIdx, null, false));
          columns.push(ExpressionDataSource.getQuantifiedDataValues(scanId, resp.data, detector, eVperChannelIdx, null, false));
        }

        const result: SpectrumEnergyCalibration[] = [];

        let c = 0;
        for (const detector of detectors) {
          const eVStartValues = columns[c++];
          const eVPerChannelValues = columns[c++];

          let eVStartSum = 0;
          let eVPerChannelSum = 0;

          for (const evStartItem of eVStartValues.values) {
            eVStartSum += evStartItem.value;
          }

          for (const evPerChannelItem of eVPerChannelValues.values) {
            eVPerChannelSum += evPerChannelItem.value;
          }

          // Save these (we may need them later for "reset to defaults" features)
          result.push(
            new SpectrumEnergyCalibration(
              eVStartValues.length > 0 ? eVStartSum / eVStartValues.length : 0,
              eVPerChannelValues.length > 0 ? eVPerChannelSum / eVPerChannelValues.length : 1,
              detector
            )
          );
        }

        // If we only had one detector (it's a combined quant), copy it to both
        if (detectors.length == 1 && result.length == 1) {
          result[0].detector = "A";
          result.push(new SpectrumEnergyCalibration(result[0].eVstart, result[0].eVperChannel, "B"));
        }

        return result;
      }),
      shareReplay(1)
    );
  }
}
