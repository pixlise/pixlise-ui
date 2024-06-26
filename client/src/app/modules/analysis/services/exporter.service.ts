import { Injectable } from "@angular/core";
import { catchError, combineLatest, forkJoin, map, mergeMap, Observable, of, switchMap } from "rxjs";
import { ExportDataType, ExportFilesReq } from "src/app/generated-protos/export-msgs";
import { APIDataService, SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { WidgetExportData, WidgetExportFile } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "../../../generated-protos/scan-beam-location-msgs";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanEntryReq, ScanEntryResp } from "../../../generated-protos/scan-entry-msgs";
import { ImageGetReq, ImageListReq } from "../../../generated-protos/image-msgs";
import { Coordinate2D } from "../../../generated-protos/image-beam-location";
import { ImageBeamLocationsReq } from "../../../generated-protos/image-beam-location-msgs";
import { SpectrumResp } from "../../../generated-protos/spectrum-msgs";
import { Spectrum, spectrumTypeToJSON } from "../../../generated-protos/spectrum";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "../../../generated-protos/roi-msgs";
import { decodeIndexList } from "../../../utils/utils";
import { DiffractionExporter } from "../components/analysis-sidepanel/tabs/diffraction/diffraction-exporter";
import { DiffractionService } from "../../spectrum/services/diffraction.service";
import { EnergyCalibrationService } from "../../pixlisecore/services/energy-calibration.service";
import { PredefinedROIID } from "../../../models/RegionOfInterest";
import { ExpressionDataSource } from "../../pixlisecore/models/expression-data-source";
import { SpectrumEnergyCalibration } from "../../../models/BasicTypes";
import { ManualDiffractionPeak } from "../../../generated-protos/diffraction-data";
import { ScanMetaLabelsAndTypesReq, ScanMetaLabelsAndTypesResp } from "../../../generated-protos/scan-msgs";
import { ExpressionGetReq, ExpressionGetResp } from "../../../generated-protos/expression-msgs";
import { QuantGetReq } from "../../../generated-protos/quantification-retrieval-msgs";
import { DataExpressionId } from "../../../expression-language/expression-id";
import { PMCDataValues } from "../../../expression-language/data-values";
import { APIEndpointsService } from "../../pixlisecore/services/apiendpoints.service";
import { SpectrumDataService } from "../../pixlisecore/services/spectrum-data.service";
import { Quantification } from "src/app/generated-protos/quantification";

@Injectable({
  providedIn: "root",
})
export class DataExporterService {
  constructor(
    private _snackService: SnackbarService,
    private _apiService: APIDataService,
    private _cachedDataService: APICachedDataService,
    private _spectrumDataService: SpectrumDataService,
    private _endpointsService: APIEndpointsService,
    private _widgetDataService: WidgetDataService,
    private _diffractionService: DiffractionService,
    private _energyCalibrationService: EnergyCalibrationService
  ) {}

  getPiquantMapForScan(scanId: string, quantId: string, quantName: string): Observable<WidgetExportData> {
    const exportTypes: ExportDataType[] = [ExportDataType.EDT_QUANT_CSV];
    return this._apiService
      .sendExportFilesRequest(
        ExportFilesReq.create({
          exportTypes,
          scanId,
          quantId,
          roiIds: [],
          imageFileNames: [],
        })
      )
      .pipe(
        map(response => {
          const csvs: WidgetExportFile[] = [];
          if (response.files) {
            response.files.forEach((file, i) => {
              if (file.extension === "csv") {
                const decoder = new TextDecoder();
                const data = decoder.decode(file.content);

                let fileName = file.name;
                if (exportTypes[i] === ExportDataType.EDT_QUANT_CSV) {
                  fileName = `${scanId}-${quantName}-map-by-piquant.csv`;
                }

                csvs.push({ fileName, data });
              }
            });
          }

          return { csvs };
        })
      );
  }

  private getSpectrumPMCMetadata(spectrum: Spectrum, scanMeta: ScanMetaLabelsAndTypesResp, metaLabels: string[]) {
    const meta: Record<string, any> = {};
    metaLabels.forEach(label => {
      const metaIdx = scanMeta.metaLabels.findIndex(metaLabel => metaLabel === label);
      if (metaIdx >= 0 && spectrum.meta[metaIdx] !== undefined) {
        const value = spectrum.meta[metaIdx].fvalue ?? spectrum.meta[metaIdx].ivalue ?? "";
        meta[label] = value;
      }
    });

    return meta;
  }

  private makeExportForRawSpectraPerPMC(
    scanId: string,
    scanEntries: ScanEntryResp,
    beamLocations: ScanBeamLocationsResp,
    spectrumResp: SpectrumResp,
    scanMeta: ScanMetaLabelsAndTypesResp,
    roiName: string,
    roiPMCs: Set<number> = new Set()
  ): WidgetExportFile | null {
    const metaLabels = ["SCLK", "REALTIME", "LIVETIME", "XPERCHAN", "OFFSET"];
    let data = `PMC,X,Y,Z,Detector,Type,${metaLabels.join(",")},Max Count`;
    for (let i = 0; i < spectrumResp.channelCount; i++) {
      data += `,Ch. ${i + 1}`;
    }
    if (!beamLocations.beamLocations || !scanEntries.entries) {
      console.error("Missing data for spectra export");
      this._snackService.openError("Error exporting data", "Missing data for spectra export");
      return null;
    }

    if (scanEntries.entries.length !== beamLocations.beamLocations.length) {
      console.error("Beam locations and scan entries do not match");
      this._snackService.openError("Error exporting data", "Beam locations and scan entries do not match");
      return null;
    }

    for (let i = 0; i < beamLocations.beamLocations.length; i++) {
      const entry = scanEntries.entries[i];
      if (!entry.location) {
        continue;
      }

      // If we have a list of PMCs to include from an ROI, skip if the PMC isn't in the list
      if (roiPMCs.size > 0 && !roiPMCs.has(entry.id)) {
        continue;
      }

      // Round to 5 decimal places
      const location = beamLocations.beamLocations[i];
      const [x, y, z] = [location.x, location.y, location.z].map(coord => Math.round(coord * 1e5) / 1e5);
      const spectraPerLocation = spectrumResp.spectraPerLocation[i];

      spectraPerLocation.spectra.forEach(spectra => {
        let typeName = spectrumTypeToJSON(spectra.type).replace("SPECTRUM_", "").toLowerCase();
        if (typeName && typeName.length > 0) {
          typeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
        }

        const meta = this.getSpectrumPMCMetadata(spectra, scanMeta, metaLabels);
        const metaValues = metaLabels.map(label => meta[label] ?? "").join(",");

        let dataLine = `\n${entry.id},${x},${y},${z},${spectra.detector},${typeName},${metaValues},${spectra.maxCount}`;
        spectra.counts.forEach(count => {
          dataLine += `,${count ?? ""}`;
        });

        data += dataLine;
      });
    }
    return { fileName: `${scanId} Normal ROI ${roiName}.csv`, data };
  }

  getRawSpectralDataPerPMC(scanId: string, roiIds: string[]): Observable<WidgetExportData> {
    const requests: [Observable<ScanBeamLocationsResp>, Observable<ScanEntryResp>, Observable<SpectrumResp>, Observable<ScanMetaLabelsAndTypesResp>] = [
      this._cachedDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId: scanId })),
      this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })),
      this._spectrumDataService.getSpectrum(scanId, null, true, true),
      this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({ scanId })),
    ];

    return combineLatest(requests).pipe(
      switchMap(([beamLocations, scanEntries, spectrumResp, scanMeta]) => {
        const csvs: WidgetExportFile[] = [];

        const rawSpectraPerPMC = this.makeExportForRawSpectraPerPMC(scanId, scanEntries, beamLocations, spectrumResp, scanMeta, "All Points");
        if (rawSpectraPerPMC) {
          csvs.push(rawSpectraPerPMC);
        }

        let roiRequests: Observable<RegionOfInterestGetResp | null>[] = roiIds.map(id =>
          PredefinedROIID.isPredefined(id) ? of(null) : this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id }))
        );

        if (roiRequests.length === 0) {
          roiRequests = [of(null)];
        }
        return combineLatest(roiRequests).pipe(
          switchMap(rois => {
            rois.forEach((roi, i) => {
              if (!roi) {
                return;
              }

              const pmcPoints = new Set(decodeIndexList(roi.regionOfInterest?.scanEntryIndexesEncoded || []));
              const roiData = this.makeExportForRawSpectraPerPMC(
                scanId,
                scanEntries,
                beamLocations,
                spectrumResp,
                scanMeta,
                roi.regionOfInterest?.name || roiIds[i],
                pmcPoints
              );
              if (roiData) {
                csvs.push(roiData);
              }
            });

            return of({ csvs });
          })
        );
      })
    );
  }

  private makeExportForRawSpectraBulkSpectra(scanId: string, roiName: string, spectrumResp: SpectrumResp): WidgetExportFile | null {
    if (spectrumResp) {
      let spectraData = "ROI,Channel,Detector,Bulk Sum,Max Spectra";
      for (let i = 0; i < spectrumResp.channelCount; i++) {
        spectrumResp.bulkSpectra.forEach((bulkSpectra, j) => {
          const bulkSum = bulkSpectra.counts[i] ?? "";
          let maxSpectra = spectrumResp.maxSpectra[j];
          if (maxSpectra?.detector !== bulkSpectra.detector) {
            const matchingMaxSpectra = spectrumResp.maxSpectra.find(spectra => spectra.detector === bulkSpectra.detector);
            if (matchingMaxSpectra) {
              maxSpectra = matchingMaxSpectra;
            } else {
              this._snackService.openError("Error exporting spectra data per ROI", `Could not find matching detector (${bulkSpectra.detector}) for bulk spectra`);
              throw new Error(`Could not find matching detector (${bulkSpectra.detector}) for bulk spectra`);
            }
          }
          const maxSpectraCount = maxSpectra.counts[i] ?? "";

          spectraData += `\n${roiName},${i + 1},${bulkSpectra.detector},${bulkSum},${maxSpectraCount}`;
        });
      }

      return { fileName: `${scanId} Normal-BulkSum ROI ${roiName}.csv`, data: spectraData };
    } else {
      console.error("Missing data for spectra export");
      this._snackService.openError("Error exporting data", "Missing data for spectra export");
      return null;
    }
  }

  getBulkSumMaxSpectra(scanId: string): Observable<WidgetExportData> {
    const spectrumRequests: Observable<SpectrumResp>[] = [
      this._spectrumDataService.getSpectrum(scanId, null, true, true), // All Points
    ];

    return combineLatest(spectrumRequests).pipe(
      map(spectrumResp => {
        const csvs: WidgetExportFile[] = [];

        const allPointsData = this.makeExportForRawSpectraBulkSpectra(scanId, "All Points", spectrumResp[0]);
        if (allPointsData) {
          csvs.push(allPointsData);
        }

        return { csvs };
      })
    );
  }

  /** Get metadata for each detector in the format {detector: {label: value}} */
  getBulkSpectraMetadataPerDetector(
    spectrumResp: SpectrumResp,
    scanMeta: ScanMetaLabelsAndTypesResp,
    metaLabels: string[] = ["SCLK", "PMC", "REALTIME", "LIVETIME", "XPERCHAN", "OFFSET"]
  ): Record<string, Record<string, string | number>> {
    const metadataPerDetector: Record<string, Record<string, string | number>> = {};

    for (const spectrum of spectrumResp.bulkSpectra) {
      metaLabels.forEach(label => {
        const metaIdx = scanMeta.metaLabels.findIndex(metaLabel => metaLabel === label);
        if (metaIdx >= 0 && spectrum.meta[metaIdx]) {
          const meta = spectrum.meta[metaIdx];

          const value = meta.fvalue ?? meta.ivalue ?? "";

          if (!metadataPerDetector[spectrum.detector]) {
            metadataPerDetector[spectrum.detector] = {};
          }
          metadataPerDetector[spectrum.detector][label] = value;
        }
      });
    }

    return metadataPerDetector;
  }

  /** Get current date and time in UTC in the format MM-DD-YYYY and HH:MM:SS. */
  private _getMSADateTime(): [string, string] {
    const currentTime = new Date();
    const dateNow = ("0" + (currentTime.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + currentTime.getUTCDate()).slice(-2) + "-" + currentTime.getUTCFullYear();
    const timeNow =
      ("0" + currentTime.getUTCHours()).slice(-2) + ":" + ("0" + currentTime.getUTCMinutes()).slice(-2) + ":" + ("0" + currentTime.getUTCSeconds()).slice(-2);

    return [dateNow, timeNow];
  }

  /** Create an MSA file from the spectra data.
   * We receive spectra in MSA format but don't store it, instead using a binary file that's quicker to download/use in the browser.
   * At this point though we convert back to MSA format with the fields that we have (we don't store everything from the MSA header)
   */
  makeMSAFile(scanId: string, roiName: string, spectra: SpectrumResp, metadataPerDetector: Record<string, Record<string, string | number>>): WidgetExportFile | null {
    if (spectra && spectra.bulkSpectra.length > 0) {
      const combinedMetadata: Record<string, (string | number)[]> = {};
      const labels = ["XPERCHAN", "OFFSET", "LIVETIME", "REALTIME"];
      labels.forEach(label => {
        combinedMetadata[label] = [];
        spectra.bulkSpectra.forEach(spectra => {
          const meta = metadataPerDetector[spectra.detector];
          if (meta && meta[label]) {
            let value = meta[label];
            // If number, round to 7 decimal places
            if (!isNaN(Number(value))) {
              value = Math.round(Number(value) * 1e7) / 1e7;
            }

            combinedMetadata[label].push(value);
          }
        });
      });

      const detectors = Object.keys(metadataPerDetector);

      let columns = "Y";
      if (detectors.length > 1) {
        columns = "YY";
      }

      const [dateNow, timeNow] = this._getMSADateTime();
      let msa = `#FORMAT      : EMSA/MAS spectral data file
#VERSION     : TC202v2.0 PIXL
#TITLE       : Control Program v7
#OWNER       : JPL BREADBOARD vx
#DATE        : ${dateNow}
#TIME        : ${timeNow}
#NPOINTS     : ${spectra.bulkSpectra[0].counts.length}
#NCOLUMNS    : ${columns.length}
#XUNITS      : eV
#YUNITS      : COUNTS
#DATATYPE    : ${columns}
#XPERCHAN    : ${combinedMetadata["XPERCHAN"].join(", ")}    eV per channel
#OFFSET      : ${combinedMetadata["OFFSET"].join(", ")}    eV of first channel
#SIGNALTYPE  : XRF
#COMMENT     : Exported bulk sum MSA from PIXLISE
#XPOSITION   : 0.000
#YPOSITION   : 0.000
#ZPOSITION   : 0.000
#LIVETIME    : ${combinedMetadata["LIVETIME"].join(", ")}
#REALTIME    : ${combinedMetadata["REALTIME"].join(", ")}
#SPECTRUM    :`;

      spectra.bulkSpectra[0].counts.forEach((count, i) => {
        msa += `\n${count}`;
        if (spectra.bulkSpectra.length > 1 && spectra.bulkSpectra[1]?.counts?.[i] !== undefined) {
          msa += `, ${spectra.bulkSpectra[1].counts[i]}`;
        }
      });

      return { fileName: `${scanId}-bulk-sum-${roiName}.msa`, data: msa };
    } else {
      console.error("Missing data for spectra export");
      this._snackService.openError("Error exporting data", "Missing data for spectra export");
      return null;
    }
  }

  getSpectraMetadata(scanId: string): Observable<WidgetExportData> {
    const requests: [Observable<ScanMetaLabelsAndTypesResp>, Observable<SpectrumResp>] = [
      this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({ scanId })),
      this._spectrumDataService.getSpectrum(scanId, [], true, false),
    ];

    return combineLatest(requests).pipe(
      map(([scanMeta, spectrumResp]) => {
        const csvs: WidgetExportFile[] = [];
        const msas: WidgetExportFile[] = [];
        if (scanMeta && spectrumResp) {
          const metaLabels = ["SCLK", "PMC", "REALTIME", "LIVETIME", "XPERCHAN", "OFFSET"];
          let data = "Detector," + metaLabels.join(",");

          const metadataPerDetector: Record<string, Record<string, string | number>> = this.getBulkSpectraMetadataPerDetector(spectrumResp, scanMeta, metaLabels);
          const detectors = Object.keys(metadataPerDetector);
          detectors.forEach(detector => {
            let dataLine = `\n${detector}`;
            metaLabels.forEach(label => {
              const value = metadataPerDetector[detector][label] ?? "";
              dataLine += `,${value}`;
            });

            data += dataLine;
          });

          csvs.push({ fileName: `${scanId}-spectra-metadata.csv`, data });

          const msaFile = this.makeMSAFile(scanId, "All Points", spectrumResp, metadataPerDetector);
          if (msaFile) {
            msas.push(msaFile);
          }
        } else {
          console.error("Missing data for spectra metadata export");
          this._snackService.openError("Error exporting spectra metadata", "Failed to get metadata for the scan");
        }

        return { csvs, msas };
      })
    );
  }

  getBeamLocationsForScan(scanId: string): Observable<WidgetExportData> {
    const requests: [Observable<ScanBeamLocationsResp>, Observable<ScanEntryResp>, Observable<Map<string, Coordinate2D[]>>] = [
      this._cachedDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId })),
      this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId })),
      this.getAllImagesIJ(scanId),
    ];
    return combineLatest(requests).pipe(
      map(([beamLocations, scanEntries, imageIJs]) => {
        const csvs: WidgetExportFile[] = [];
        if (beamLocations.beamLocations && scanEntries.entries && imageIJs.size > 0) {
          const imageKeyOrder = [...imageIJs.keys()];
          let data = "PMC,X,Y,Z";
          imageKeyOrder.forEach(imageKey => {
            const imageName = imageKey.split("/").pop();
            data += `,${imageName}_i,${imageName}_j`;
          });

          if (scanEntries.entries.length !== beamLocations.beamLocations.length) {
            console.error("Beam locations and scan entries do not match");
            this._snackService.openError("Error exporting data", "Beam locations and scan entries do not match");
            return { csvs };
          }

          for (let i = 0; i < beamLocations.beamLocations.length; i++) {
            const entry = scanEntries.entries[i];
            if (!entry.location) {
              continue;
            }

            // Round to 5 decimal places
            const location = beamLocations.beamLocations[i];
            const [x, y, z] = [location.x, location.y, location.z].map(coord => Math.round(coord * 1e5) / 1e5);
            data += `\n${entry.id},${x},${y},${z}`;

            // Add image coordinate headers
            imageKeyOrder.forEach(imageKey => {
              const coords = imageIJs.get(imageKey);
              if (coords) {
                const [roundedI, roundedJ] = [coords[i].i, coords[i].j].map(coord => Math.round(coord * 1e5) / 1e5);
                data += `,${roundedI},${roundedJ}`;
              } else {
                data += ",,";
              }
            });
          }

          csvs.push({ fileName: `${scanId}-beam-locations.csv`, data });
        } else {
          console.error("Missing data for beam locations export");
          this._snackService.openError("Error exporting data", "Missing data for beam locations export");
        }

        return { csvs };
      })
    );
  }

  getAllImagesIJ(scanId: string): Observable<Map<string, Coordinate2D[]>> {
    return this._cachedDataService.getImageList(ImageListReq.create({ scanIds: [scanId] })).pipe(
      switchMap(images => {
        const imagesIJ: Map<string, Coordinate2D[]> = new Map();
        if (images.images) {
          // Filter out all matched images because these don't have beam locations
          const imagePaths = images.images.map(image => image.imagePath);

          const metaRequests = imagePaths.map(imagePath => this._cachedDataService.getImageMeta(ImageGetReq.create({ imageName: imagePath })));
          return forkJoin(metaRequests).pipe(
            switchMap(imageMetadataResponses => {
              const beamRequests = imageMetadataResponses.map((imageMeta, i) => {
                const beamFileName = imageMeta.image?.matchInfo?.beamImageFileName || imagePaths[i];

                return this._cachedDataService.getImageBeamLocations(ImageBeamLocationsReq.create({ imageName: beamFileName })).pipe(
                  catchError(err => {
                    console.error("Failed to get beam locations for image", beamFileName, err);
                    return of(null);
                  })
                );
              });

              return forkJoin(beamRequests).pipe(
                map(beamResponses => {
                  beamResponses.forEach((beamResponse, i) => {
                    if (beamResponse) {
                      // Find the beam locations for the requested scan
                      const locations = beamResponse.locations?.locationPerScan.find(loc => loc.scanId === scanId);
                      if (locations) {
                        const imageName = imagePaths[i];
                        imagesIJ.set(imageName, locations.locations);
                      }
                    }
                  });

                  return imagesIJ;
                }),
                catchError(() => {
                  return of(imagesIJ);
                })
              );
            })
          );
        }

        return of(imagesIJ);
      })
    );
  }

  private fetchDiffractionData(
    scanId: string,
    quantId: string
  ): Observable<{ manualPeaks: Map<string, ManualDiffractionPeak[]>; currentCalibrations: SpectrumEnergyCalibration[]; dataSource: ExpressionDataSource }> {
    const fetchManualPeaks$ = this._diffractionService.fetchManualPeaksForScanAsync(scanId);
    const fetchPeakStatuses$ = this._diffractionService.fetchPeakStatusesForScanAsync(scanId);
    const getCurrentCalibration$ = this._energyCalibrationService.getScanCalibration(scanId);
    return forkJoin({
      manualPeaks: fetchManualPeaks$,
      peakStatuses: fetchPeakStatuses$,
      currentCalibrations: getCurrentCalibration$,
    }).pipe(
      mergeMap(({ manualPeaks, currentCalibrations }) => {
        const dataSource = new ExpressionDataSource();
        return dataSource
          .prepare(this._cachedDataService, this._spectrumDataService, scanId, quantId, PredefinedROIID.getAllPointsForScan(scanId), currentCalibrations)
          .pipe(
            switchMap(() => dataSource.getDiffractionPeakEffectData(-1, -1)),
            map(() => ({ manualPeaks, currentCalibrations, dataSource }))
          );
      })
    );
  }

  getDiffractionAndRoughness(scanId: string, quantId: string): Observable<WidgetExportData> {
    const csvs: WidgetExportFile[] = [];
    const diffractionExporter = new DiffractionExporter(this._snackService);

    return this.fetchDiffractionData(scanId, quantId).pipe(
      switchMap(({ manualPeaks, dataSource }) => {
        const requestedManualPeaks = manualPeaks.get(scanId) || [];
        return diffractionExporter.exportPeaks(dataSource.allPeaks, requestedManualPeaks, true, dataSource.roughnessItems).pipe(
          switchMap(peaks => {
            if (peaks.combined) {
              csvs.push({
                fileName: `${scanId} - Diffraction Peaks and Roughness`,
                data: peaks.combined,
              });
            }

            return of({ csvs });
          })
        );
      })
    );
  }

  getUnquantifiedWeightPercents(scanId: string, quantId: string, quantName: string): Observable<WidgetExportData> {
    return this._cachedDataService.getQuant(QuantGetReq.create({ quantId })).pipe(
      map(quant => {
        const csvs: WidgetExportFile[] = [];

        if (!quant.data || quant.data?.locationSet.length === 0 || quant.data?.locationSet[0].location.length === 0) {
          console.error("Quant data not found for export");
          this._snackService.openError("Error exporting unquantified weight percents", `Quant data for ${quantId} not found for export`);
          return { csvs };
        }

        const data = DataExporterService.makeQuantCSV(quant.data);

        csvs.push({ fileName: `${scanId}-${quant.summary?.params?.userParams?.name || quantName}-unquantified-weight-percents.csv`, data });
        return { csvs };
      })
    );
  }

  public static makeQuantCSV(quantData: Quantification): string {
    const quantifiedLabels = quantData.labels.filter(label => label.endsWith("_%"));

    let data = "PMC";

    // Add detector names
    quantData.locationSet.forEach(locationSet => {
      data += `,${locationSet.detector}`;
    });

    // Iterate over every PMC, then every detector, and calculate the weight percentages not included in the quantification
    quantData.locationSet[0].location.forEach((location, pmcIndex) => {
      data += `\n${location.pmc}`;
      quantData!.locationSet.forEach((_, detectorIndex) => {
        let unquantifiedPercent = 100.0;
        quantifiedLabels.forEach(label => {
          const labelIndex = quantData?.labels.indexOf(label);
          if (labelIndex !== undefined && labelIndex >= 0) {
            unquantifiedPercent -= quantData!.locationSet[detectorIndex].location[pmcIndex].values[labelIndex].fvalue;
          }
        });

        const roundedUnquantifiedPercent = Math.round(unquantifiedPercent * 1e7) / 1e7;
        data += `,${roundedUnquantifiedPercent}`;
      });
    });

    return data;
  }

  private makeROIPMCMembershipCSV(scanId: string, roiName: string, pmcs: number[]): WidgetExportFile {
    let data = "ROI,PMC";
    pmcs.forEach(pmc => {
      data += `\n${roiName},${pmc}`;
    });

    return { fileName: `${scanId}-${roiName}-pmc-membership.csv`, data };
  }

  getROIPMCMembershipList(scanId: string, roiIds: string[]): Observable<WidgetExportData> {
    let roiRequests: Observable<RegionOfInterestGetResp | null>[] = roiIds.map(id =>
      PredefinedROIID.isPredefined(id) ? of(null) : this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id }))
    );
    if (roiRequests.length === 0) {
      roiRequests = [of(null)];
    }

    return combineLatest(roiRequests).pipe(
      switchMap(rois => {
        const csvs: WidgetExportFile[] = [];

        return this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId })).pipe(
          map((resp: ScanEntryResp) => {
            if (resp.entries === undefined) {
              this._snackService.openError("Error exporting pmc membership data", "Scan entries not returned for " + scanId);
              throw new Error("ScanEntryResp indexes not returned for " + scanId);
            }

            // Get all PMCs for the scan
            const allPMCs: number[] = [];
            resp.entries.forEach(entry => {
              if (entry?.normalSpectra || entry?.dwellSpectra || entry?.bulkSpectra || entry?.maxSpectra) {
                allPMCs.push(entry.id);
              }
            });
            csvs.push(this.makeROIPMCMembershipCSV(scanId, "All Points", allPMCs));

            rois.forEach((roi, i) => {
              if (roi) {
                const roiPMCs = decodeIndexList(roi.regionOfInterest?.scanEntryIndexesEncoded || []);
                const roiName = roi.regionOfInterest?.name || roiIds[i];
                csvs.push(this.makeROIPMCMembershipCSV(scanId, roiName.replace("/", "_"), roiPMCs));
              }
            });

            return { csvs };
          })
        );
      })
    );
  }

  private makeExpressionValuesCSV(scanId: string, roiName: string, expressionName: string, pmcs: number[], expressionValues: PMCDataValues): WidgetExportFile {
    let data = "ROI,Expression,PMC,Value,Undefined";
    pmcs.forEach(pmc => {
      const pmcDataValue = expressionValues.values.find(value => value.pmc === pmc);
      const value = pmcDataValue?.value ?? "";
      const isUndefined = pmcDataValue?.isUndefined ?? true;
      data += `\n"${roiName}","${expressionName}",${pmc},${value},${isUndefined}`;
    });

    return { fileName: `${scanId}-${roiName}-${expressionName}-expression-values.csv`, data };
  }

  private makeAggregatedExpressionValuesCSV(scanId: string, roiName: string, pmcs: number[], expressions: Record<string, PMCDataValues>): WidgetExportFile {
    const expressionHeaders = Object.keys(expressions);
    let data = `"ROI","PMC",${expressionHeaders.map(expressionName => `"${expressionName}"`).join(",")}`;

    pmcs.forEach(pmc => {
      data += `\n${roiName},${pmc}`;
      expressionHeaders.forEach(expressionName => {
        const pmcDataValue = expressions[expressionName].values.find(value => value.pmc === pmc);
        const value = pmcDataValue?.value ?? "";
        data += `,${value}`;
      });
    });

    return { fileName: `${scanId}-${roiName}-expression-values.csv`, data };
  }

  getROIExpressionValues(
    scanId: string,
    quantId: string,
    roiIds: string[],
    expressionIds: string[],
    singleCSVPerRegion: boolean = false
  ): Observable<WidgetExportData> {
    let roiRequests: Observable<RegionOfInterestGetResp | null>[] = roiIds.map(id =>
      PredefinedROIID.isPredefined(id) ? of(null) : this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id }))
    );
    if (roiRequests.length === 0) {
      roiRequests = [of(null)];
    }

    return combineLatest(roiRequests).pipe(
      switchMap(rois => {
        let expressionRequests: Observable<ExpressionGetResp | null>[] = expressionIds.map(id =>
          DataExpressionId.isPredefinedExpression(id) ? of(null) : this._cachedDataService.getExpression(ExpressionGetReq.create({ id }))
        );

        if (expressionRequests.length === 0) {
          expressionRequests = [of(null)];
        }

        return combineLatest(expressionRequests).pipe(
          switchMap(expressions => {
            const expressionRunResults = expressions.map(expressionResp => {
              let expression = expressionResp?.expression;
              if (!expression) {
                return of(null);
              }

              return this._widgetDataService.runExpression(expression, scanId, quantId, PredefinedROIID.getAllPointsForScan(scanId), false);
            });

            return combineLatest(expressionRunResults).pipe(
              switchMap(results => {
                const csvs: WidgetExportFile[] = [];

                const expressions: Record<string, PMCDataValues> = {};
                results.forEach((result, i) => {
                  if (!result?.expression) {
                    return;
                  }

                  const expressionName = result.expression?.name || expressionIds[i];
                  const expressionValues: PMCDataValues = result.resultValues;

                  if (singleCSVPerRegion) {
                    expressions[expressionName] = expressionValues;
                  } else {
                    // Make an all points CSV
                    const allPMCs = expressionValues.values.map(value => value.pmc);
                    const allPointsCSV = this.makeExpressionValuesCSV(scanId, "All Points", expressionName, allPMCs, expressionValues);
                    csvs.push(allPointsCSV);

                    // Make a CSV for each ROI
                    rois.forEach((roi, j) => {
                      if (!roi?.regionOfInterest) {
                        return;
                      }
                      const roiName = roi.regionOfInterest?.name || roiIds[j];
                      const roiPMCs = decodeIndexList(roi.regionOfInterest.scanEntryIndexesEncoded);

                      const expressionValuesCSV = this.makeExpressionValuesCSV(scanId, roiName.replace("/", "_"), expressionName, roiPMCs, expressionValues);
                      csvs.push(expressionValuesCSV);
                    });
                  }
                });

                if (singleCSVPerRegion && Object.keys(expressions).length > 0) {
                  // Make a CSV with all expressions for each PMC
                  const allPMCs = Object.values(expressions)[0].values.map(value => value.pmc);
                  const aggregatedCSV = this.makeAggregatedExpressionValuesCSV(scanId, "All Points", allPMCs, expressions);
                  csvs.push(aggregatedCSV);

                  // Make a CSV for each ROI
                  rois.forEach((roi, j) => {
                    if (!roi?.regionOfInterest) {
                      return;
                    }
                    const roiName = roi.regionOfInterest?.name || roiIds[j];
                    const roiPMCs = decodeIndexList(roi.regionOfInterest.scanEntryIndexesEncoded);

                    const aggregatedCSV = this.makeAggregatedExpressionValuesCSV(scanId, roiName.replace("/", "_"), roiPMCs, expressions);
                    csvs.push(aggregatedCSV);
                  });
                }

                return of({ csvs });
              })
            );
          })
        );
      })
    );
  }

  private checkIsTIFF(imagePath: string): boolean {
    return imagePath.endsWith(".tif") || imagePath.endsWith(".tiff");
  }

  private loadDisplayImageForPath(imagePath: string): Observable<HTMLImageElement> {
    if (this.checkIsTIFF(imagePath)) {
      return this._endpointsService.loadRGBTIFFDisplayImage(imagePath);
    } else {
      return this._endpointsService.loadImageForPath(imagePath);
    }
  }

  getContextImages(imagePaths: string[], includeRawTIFFs: boolean = false): Observable<WidgetExportData> {
    const imageRequests: Observable<HTMLImageElement | ArrayBuffer>[] = imagePaths.map(imagePath => this.loadDisplayImageForPath(imagePath));
    const fileNames = imagePaths.map((imagePath, i) => imagePath.split("/").pop() || imagePath || `image-${i}`);
    const rawRequestStartIndex = imagePaths.length;

    if (includeRawTIFFs) {
      const rawTIFFRequests: Observable<ArrayBuffer>[] = [];
      imagePaths
        .filter(imagePath => this.checkIsTIFF(imagePath))
        .forEach((imagePath, i) => {
          rawTIFFRequests.push(this._endpointsService.loadRawImageFromURL(imagePath));
          fileNames.push(imagePath.split("/").pop() || imagePath || `raw-image-${i}`);
        });

      imageRequests.push(...rawTIFFRequests);
    }

    return combineLatest(imageRequests).pipe(
      map(imageResponses => {
        const images: WidgetExportFile[] = [];
        const tiffImages: WidgetExportFile[] = [];
        imageResponses.forEach((imageResponse, i) => {
          const fileName = fileNames[i];
          if (i >= rawRequestStartIndex) {
            imageResponse = imageResponse as ArrayBuffer;
            tiffImages.push({ fileName, data: imageResponse });
            return;
          } else {
            imageResponse = imageResponse as HTMLImageElement;
            if (!imageResponse?.src) {
              this._snackService.openError("Error exporting context image", `Failed to load image for ${fileName}`);
              return;
            }

            const data = imageResponse.src.split(",")[1];
            images.push({ fileName, data });
          }
        });

        return { images, tiffImages };
      })
    );
  }
}
