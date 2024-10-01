import { Injectable } from "@angular/core";
import { catchError, combineLatest, forkJoin, map, mergeMap, Observable, of, switchMap } from "rxjs";
import { ExportDataType, ExportFilesReq } from "src/app/generated-protos/export-msgs";
import { APIDataService, SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { WidgetExportData, WidgetExportFile } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "../../../generated-protos/scan-beam-location-msgs";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanEntryReq, ScanEntryResp } from "../../../generated-protos/scan-entry-msgs";
import { ImageListReq } from "../../../generated-protos/image-msgs";
import { Coordinate2D } from "../../../generated-protos/image-beam-location";
import {
  ImageBeamLocationsReq,
  ImageBeamLocationsResp,
  ImageBeamLocationVersionsReq,
  ImageBeamLocationVersionsResp,
} from "../../../generated-protos/image-beam-location-msgs";
import { SpectrumResp } from "../../../generated-protos/spectrum-msgs";
import { Spectrum, SpectrumType } from "../../../generated-protos/spectrum";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "../../../generated-protos/roi-msgs";
import { decodeIndexList, getPathBase, SDSFields } from "../../../utils/utils";
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
import { SpectrumExpressionDataSourceImpl } from "../../spectrum/models/SpectrumRespDataSource";
import { SpectrumExpressionParser, SpectrumValues } from "../../spectrum/models/Spectrum";
import { ScanMetaDataItem } from "src/app/generated-protos/scan";
import { ImageMatchTransform, ScanImage } from "src/app/generated-protos/image";
import { ExpressionExporter } from "src/app/expression-language/expression-export";
import { loadCodeForExpression } from "src/app/expression-language/expression-code-load";
import { LoadedSources } from "../../pixlisecore/services/widget-data.service";
import { DataExpression } from "src/app/generated-protos/expressions";

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
    dwells: boolean, // dwells or normals
    roiName: string,
    roiPMCs: Set<number> = new Set()
  ): WidgetExportFile | null {
    // This outputs the same format as the GDS spectra CSVs we import! At this point we don't have access to the same CSV any more, but we need to make sure
    // the formats match for less confusion. There should be 4 tables exported:
    // 1. Spectrum parameters table:
    let table1 = "SCLK_A,SCLK_B,PMC,real_time_A,real_time_B,live_time_A,live_time_B,XPERCHAN_A,XPERCHAN_B,OFFSET_A,OFFSET_B\n";
    // 2. Beam locations:
    let table2 = "PMC,x,y,z\n";
    // 3. A-detector spectra:
    // A_1,A_2,A_3 ... A_4096
    let table3 = "A_1";
    // 4. B-detector spectra:
    // B_1,B_2,B_3 ... B_4096
    let table4 = "B_1";
    for (let i = 2; i <= spectrumResp.channelCount; i++) {
      table3 += `,A_${i}`;
      table4 += `,B_${i}`;
    }
    table3 += "\n";
    table4 += "\n";

    const metaLabels = ["SCLK", "REALTIME", "LIVETIME", "XPERCHAN", "OFFSET"];
    const DetectorOrder = ["A", "B"];
    const SpectrumTypeOrder = [dwells ? SpectrumType.SPECTRUM_DWELL : SpectrumType.SPECTRUM_NORMAL]; // Could have an array of both...

    for (let c = 0; c < scanEntries.entries.length; c++) {
      const entry = scanEntries.entries[c];
      if (entry.location && (entry.normalSpectra || entry.dwellSpectra)) {
        // If it's not in the ROI, skip
        if (roiPMCs.size > 0 && !roiPMCs.has(entry.id)) {
          continue;
        }

        for (const specType of SpectrumTypeOrder) {
          const meta: Map<string, Record<string, any>> = new Map<string, Record<string, any>>();

          for (const detector of DetectorOrder) {
            if (!spectrumResp.spectraPerLocation[c]) {
              continue;
            }

            for (const spectrum of spectrumResp.spectraPerLocation[c].spectra) {
              if (spectrum.detector == detector && spectrum.type == specType) {
                meta.set(detector, this.getSpectrumPMCMetadata(spectrum, scanMeta, metaLabels));

                // TABLE 3
                if (detector == DetectorOrder[0]) {
                  let table3Line = "";
                  spectrum.counts.forEach(count => {
                    table3Line += `,${count ?? ""}`;
                  });

                  table3 += table3Line.slice(1) + "\n";
                }

                // TABLE 4
                if (detector == DetectorOrder[1]) {
                  let table4Line = "";
                  spectrum.counts.forEach(count => {
                    table4Line += `,${count ?? ""}`;
                  });

                  table4 += table4Line.slice(1) + "\n";
                }
              }
            }
          }

          let line = "";
          for (const metaField of metaLabels) {
            for (const detector of DetectorOrder) {
              let writeField = "";

              const vals = meta.get(detector);
              if (vals) {
                writeField = vals[metaField];
              }

              if (line.length > 0) {
                line += ",";
              }
              line += writeField;
            }

            // NOTE: if we're just past the first ones (SCLK), we write PMC
            if (metaField === "SCLK") {
              line += "," + entry.id;
            }
          }

          // TABLE 1
          table1 += line + "\n";
        }

        // TABLE 2
        const location = beamLocations.beamLocations[c];
        const [x, y, z] = [location.x, location.y, location.z].map(coord => Math.round(coord * 1e5) / 1e5);
        table2 += `${entry.id},${x},${y},${z}\n`;
      }
    }

    return {
      fileName: `${scanId}-raw-spectra-${roiName}-${dwells ? "Dwell" : "Normal"}.csv`,
      data: `${table1}${table2}${table3}${table4}`,
    };
  }

  getRawSpectralDataPerPMC(scanId: string, roiIds: string[]): Observable<WidgetExportData> {
    const requests: [Observable<ScanBeamLocationsResp>, Observable<ScanEntryResp>, Observable<SpectrumResp>, Observable<ScanMetaLabelsAndTypesResp>] = [
      this._cachedDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId: scanId })),
      this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId: scanId })),
      this._spectrumDataService.getSpectra(scanId, null, true, true),
      this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({ scanId })),
    ];

    return combineLatest(requests).pipe(
      switchMap(([beamLocations, scanEntries, spectrumResp, scanMeta]) => {
        const csvs: WidgetExportFile[] = [];

        const rawSpectraPerPMC = this.makeExportForRawSpectraPerPMC(scanId, scanEntries, beamLocations, spectrumResp, scanMeta, false, "All Points");
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
                false,
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

  /** Get current date and time in UTC in the format MM-DD-YYYY and HH:MM:SS. */
  private _getMSADateTime(): [string, string] {
    const currentTime = new Date();
    const dateNow = ("0" + (currentTime.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + currentTime.getUTCDate()).slice(-2) + "-" + currentTime.getUTCFullYear();
    const timeNow =
      ("0" + currentTime.getUTCHours()).slice(-2) + ":" + ("0" + currentTime.getUTCMinutes()).slice(-2) + ":" + ("0" + currentTime.getUTCSeconds()).slice(-2);

    return [dateNow, timeNow];
  }

  // Forms one MSA file that contains data from all detectors.
  // Assumes the input spectra are actually for the same location/x-ray integration event for all  detectors
  private makeMSAFileWithAllDetectors(title: string, detectorSpectra: Spectrum[], scanMeta: ScanMetaLabelsAndTypesResp): string {
    if (detectorSpectra.length <= 0) {
      throw new Error("No spectra specified to convert to MSA file");
    }

    // Some more validation, while extracting some useful stats...
    let dataType = "";
    const metaLabels = ["XPERCHAN", "OFFSET", "LIVETIME", "REALTIME"];
    const metaIdxs: number[] = [];

    for (const label of metaLabels) {
      const idx = scanMeta.metaLabels.indexOf(label);
      if (idx < 0) {
        throw new Error(`Failed to find meta label index for: ${label}`);
      }

      metaIdxs.push(idx);
    }

    const meta: Map<string, number[]> = new Map<string, number[]>();

    for (let c = 0; c < detectorSpectra.length; c++) {
      dataType += "Y";

      const spectrum = detectorSpectra[c];
      if (c > 0 && spectrum.counts.length != detectorSpectra[0].counts.length) {
        throw new Error("Spectra had different counts when creating MSA file");
      }

      for (let i = 0; i < metaIdxs.length; i++) {
        const metaLabel = metaLabels[i];
        const metaIdx = metaIdxs[i];

        const variant = spectrum.meta[metaIdx];
        if (variant !== undefined) {
          let value = variant.fvalue ?? variant.ivalue ?? 0;

          // If number, round to 7 decimal places
          if (!isNaN(Number(value))) {
            value = Math.round(Number(value) * 1e7) / 1e7;
          }

          let vals = meta.get(metaLabel);
          if (vals === undefined) {
            vals = [];
          }

          vals.push(value);
          meta.set(metaLabel, vals);
        }
      }
    }

    const [dateNow, timeNow] = this._getMSADateTime();
    let msa = `#FORMAT      : EMSA/MAS spectral data file
#VERSION     : TC202v2.0 PIXL
#TITLE       : ${title}
#OWNER       : PIXLISE v4 Exporter
#DATE        : ${dateNow}
#TIME        : ${timeNow}
#NPOINTS     : ${detectorSpectra[0].counts.length}
#NCOLUMNS    : ${detectorSpectra.length}
#XUNITS      : eV
#YUNITS      : COUNTS
#DATATYPE    : ${dataType}\n`;

    if (meta.get("XPERCHAN") !== undefined) {
      msa += `#XPERCHAN    : ${meta.get("XPERCHAN")?.join(", ")}    eV per channel\n`;
    }

    if (meta.get("OFFSET") !== undefined) {
      msa += `#OFFSET      : ${meta.get("OFFSET")?.join(", ")}    eV of first channel\n`;
    }

    msa += `#SIGNALTYPE  : XRF
#COMMENT     : Exported bulk sum MSA from PIXLISE\n`;
    /* can't provide a position really... we may be bulk summing many points!
msa += `#XPOSITION   : 0.000
#YPOSITION   : 0.000
#ZPOSITION   : 0.000\n`;
*/
    if (meta.get("LIVETIME") !== undefined) {
      msa += `#LIVETIME    : ${meta.get("LIVETIME")?.join(", ")}\n`;
    }
    if (meta.get("REALTIME") !== undefined) {
      msa += `#REALTIME    : ${meta.get("REALTIME")?.join(", ")}\n`;
    }
    msa += "#SPECTRUM    :";

    for (let ch = 0; ch < detectorSpectra[0].counts.length; ch++) {
      const row: number[] = [];
      for (const s of detectorSpectra) {
        let value = s.counts[ch];
        if (!isNaN(Number(value))) {
          value = Math.round(Number(value) * 1e7) / 1e7;
        }
        row.push(value);
      }

      msa += `\n${row.join(", ")}`;
    }

    msa += "\n#ENDOFDATA     end of spectrum data\n";

    return msa;
  }

  getBulkSumMaxSpectra(scanId: string, roiIds: string[]): Observable<WidgetExportData> {
    const requests: Observable<ScanMetaLabelsAndTypesResp | SpectrumResp | RegionOfInterestGetResp>[] = [
      this._cachedDataService.getScanMetaLabelsAndTypes(ScanMetaLabelsAndTypesReq.create({ scanId })),
      this._spectrumDataService.getSpectra(scanId, roiIds.length > 0 ? null : [], true, true),
    ];

    for (const roiId of roiIds) {
      if (!PredefinedROIID.isPredefined(roiId)) {
        requests.push(this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: roiId })));
      }
    }

    return combineLatest(requests).pipe(
      map((resps: any[]) => {
        const scanMeta = resps[0] as ScanMetaLabelsAndTypesResp;
        const spectrumResp = resps[1] as SpectrumResp;

        const metaLiveTimeIdx = scanMeta.metaLabels.indexOf("LIVETIME");
        if (metaLiveTimeIdx < 0) {
          throw new Error("Failed to get LIVETIME meta index from scan: " + scanId);
        }

        const msas: WidgetExportFile[] = [];
        if (scanMeta && spectrumResp) {
          // For any ROIs, we bulk and max the spectra
          for (let c = 0; c < roiIds.length; c++) {
            const roiResp = resps[c + 2] as RegionOfInterestGetResp;
            if (roiResp.regionOfInterest && roiResp.regionOfInterest.scanEntryIndexesEncoded.length > 0) {
              const dataSrc = new SpectrumExpressionDataSourceImpl(spectrumResp);
              const parser = new SpectrumExpressionParser();

              const specExprs = ["bulk(A)", "bulk(B)", "max(A)", "max(B)"];
              const spectraMap = new Map<string, SpectrumValues>();

              for (const e of specExprs) {
                const spectrumVals = parser.getSpectrumValues(
                  dataSrc,
                  roiResp.regionOfInterest.scanEntryIndexesEncoded,
                  e,
                  e,
                  SpectrumType.SPECTRUM_NORMAL,
                  false,
                  false
                );

                for (const [k, v] of spectrumVals.entries()) {
                  spectraMap.set(k, v);
                }
              }

              // If we have enough for a bulk
              if (spectraMap.get("bulk(A)") !== undefined && spectraMap.get("bulk(B)") !== undefined) {
                const spectra = [this.makeSpectrum(spectraMap!.get("bulk(A)"), metaLiveTimeIdx), this.makeSpectrum(spectraMap!.get("bulk(B)"), metaLiveTimeIdx)];

                const roiBulkMSA = this.makeMSAFileWithAllDetectors(`Scan: ${scanId}, ROI: ${roiResp.regionOfInterest.name} bulk sum`, spectra, scanMeta);
                if (roiBulkMSA) {
                  msas.push({ fileName: `${scanId}-bulk-sum-${roiResp.regionOfInterest.name}.msa`, data: roiBulkMSA });
                }
              }

              if (spectraMap.get("max(A)") !== undefined && spectraMap.get("max(B)") !== undefined) {
                const spectra = [this.makeSpectrum(spectraMap!.get("max(A)"), metaLiveTimeIdx), this.makeSpectrum(spectraMap!.get("max(B)"), metaLiveTimeIdx)];

                const roiMaxMSA = this.makeMSAFileWithAllDetectors(`Scan: ${scanId}, ROI: ${roiResp.regionOfInterest.name} max value`, spectra, scanMeta);
                if (roiMaxMSA) {
                  msas.push({ fileName: `${scanId}-max-value-${roiResp.regionOfInterest.name}.msa`, data: roiMaxMSA });
                }
              }
            }
          }

          // All Points bulk sum
          const allPointsBulkMSA = this.makeMSAFileWithAllDetectors(`Scan: ${scanId}, All Points bulk sum`, spectrumResp.bulkSpectra, scanMeta);
          if (allPointsBulkMSA) {
            msas.push({ fileName: `${scanId}-bulk-sum-AllPoints.msa`, data: allPointsBulkMSA });
          }

          // All Points max value
          const allPointsMaxMSA = this.makeMSAFileWithAllDetectors(`Scan: ${scanId}, All Points max value`, spectrumResp.maxSpectra, scanMeta);
          if (allPointsMaxMSA) {
            msas.push({ fileName: `${scanId}-max-value-AllPoints.msa`, data: allPointsMaxMSA });
          }
        } else {
          console.error("Missing data for spectra metadata export");
          this._snackService.openError("Error exporting spectra metadata", "Failed to get metadata for the scan");
        }

        return { msas };
      })
    );
  }

  private makeSpectrum(from: SpectrumValues, LIVETIMEidx: number): Spectrum {
    const meta: {
      [key: number]: ScanMetaDataItem;
    } = {
      [LIVETIMEidx]: ScanMetaDataItem.create({ fvalue: from.liveTimeSec }),
    };

    return {
      detector: from.sourceDetectorID,
      meta: meta,
      type: SpectrumType.SPECTRUM_NORMAL,
      counts: Array.from(from.values),
      maxCount: from.maxValue,
    };
  }

  getBeamLocationsForScan(scanId: string): Observable<WidgetExportData> {
    const requests: [Observable<ScanBeamLocationsResp>, Observable<ScanEntryResp>, Observable<Map<string, Map<number, Coordinate2D[]>>>] = [
      this._cachedDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId })),
      this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId })),
      this.getAllImagesIJ(scanId),
    ];
    return combineLatest(requests).pipe(
      map(([beamLocations, scanEntries, imageIJs]) => {
        const csvs: WidgetExportFile[] = [];
        if (beamLocations.beamLocations && scanEntries.entries && imageIJs.size > 0) {
          if (scanEntries.entries.length !== beamLocations.beamLocations.length) {
            console.error("Beam locations and scan entries do not match");
            this._snackService.openError("Error exporting data", "Beam locations and scan entries do not match");
            return { csvs };
          }

          for (const imageKey of imageIJs.keys()) {
            const imageName = getPathBase(imageKey);

            // Export all coordinates for this image name
            let data = "PMC,X,Y,Z";

            const verMap = imageIJs.get(imageKey);
            if (verMap) {
              for (const ver of verMap.keys()) {
                data += `,${imageName}_v${ver}_i,${imageName}_v${ver}_j`;
              }
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
              const verMap = imageIJs.get(imageKey);
              let wrote = false;
              if (verMap) {
                for (const coords of verMap.values()) {
                  if (coords) {
                    const [roundedI, roundedJ] = [coords[i].i, coords[i].j].map(coord => Math.round(coord * 1e5) / 1e5);
                    data += `,${roundedI},${roundedJ}`;
                    wrote = true;
                  }
                }

                if (!wrote) {
                  data += ",,";
                }
              }
            }

            csvs.push({ fileName: `${scanId}-${imageName}-beam-locations.csv`, data });
          }
        } else {
          console.error("Missing data for beam locations export");
          this._snackService.openError("Error exporting data", "Missing data for beam locations export");
        }

        return { csvs };
      })
    );
  }

  getAllImagesIJ(scanId: string): Observable<Map<string, Map<number, Coordinate2D[]>>> {
    return this._cachedDataService.getImageList(ImageListReq.create({ scanIds: [scanId] })).pipe(
      switchMap(images => {
        const imagesIJ: Map<string, Map<number, Coordinate2D[]>> = new Map();
        const matchedImages = new Map<string, ImageMatchTransform>();
        if (images.images) {
          // Filter out all matched images because these don't have beam locations
          const imagePaths = images.images
            .filter((img: ScanImage) => {
              const hasMatchInfo = img.matchInfo && img.matchInfo.beamImageFileName.length > 0;
              if (img.matchInfo && /* <-- this is to shut the linter up */ hasMatchInfo) {
                matchedImages.set(img.imagePath, img.matchInfo);
              }

              const fields = SDSFields.makeFromFileName(getPathBase(img.imagePath));
              return (img.originScanId === scanId && (fields?.producer || "") === "J") || hasMatchInfo;
            })
            .map(image => image.imagePath);

          const imageBeamVersions$ = imagePaths.map(imagePath =>
            this._apiService.sendImageBeamLocationVersionsRequest(ImageBeamLocationVersionsReq.create({ imageName: imagePath })).asObservable()
          );

          return forkJoin(imageBeamVersions$).pipe(
            switchMap((imageBeamVersions: ImageBeamLocationVersionsResp[]) => {
              const beamRequests$: Observable<ImageBeamLocationsResp | null>[] = [];

              for (let i = 0; i < imageBeamVersions.length; i++) {
                const beamVers = imageBeamVersions[i];
                if (beamVers && beamVers.beamVersionPerScan[scanId]) {
                  for (const ver of beamVers.beamVersionPerScan[scanId].versions) {
                    const sendVer: { [x: string]: number } = {};
                    sendVer[scanId] = ver;

                    beamRequests$.push(
                      this._cachedDataService.getImageBeamLocations(ImageBeamLocationsReq.create({ imageName: imagePaths[i], scanBeamVersions: sendVer })).pipe(
                        catchError(err => {
                          console.error("Failed to get beam locations for image", imagePaths[i], err);
                          return of(null);
                        })
                      )
                    );
                  }
                }
              }

              return forkJoin(beamRequests$).pipe(
                map(beamResponses => {
                  beamResponses.forEach((beamResponse, i) => {
                    if (beamResponse) {
                      // Find the beam locations for the requested scan
                      const locations = beamResponse.locations?.locationPerScan.find(loc => loc.scanId === scanId);
                      if (locations) {
                        const imageName = beamResponse.locations?.imageName || "";
                        if (imageName) {
                          const version = locations.beamVersion;

                          // If it's a new one, create a map for it
                          let verMap = imagesIJ.get(imageName);
                          if (verMap === undefined) {
                            verMap = new Map<number, Coordinate2D[]>();
                          }

                          // If this one is "matched", we have to apply the transform to the ijs
                          // NOTE: This transform is applied differently to the one in the context image - there we're transforming the image to match
                          // the same ij locations, but here we're transforming the ijs to fit the image!
                          const matchedInfo = matchedImages.get(imageName);
                          if (matchedInfo) {
                            const transformedLocations: Coordinate2D[] = [];
                            for (const loc of locations.locations) {
                              transformedLocations.push(
                                Coordinate2D.create({ i: loc.i * matchedInfo.xScale - matchedInfo.xOffset, j: loc.j * matchedInfo.yScale - matchedInfo.yOffset })
                              );
                            }
                            verMap.set(version, transformedLocations);
                          } else {
                            // Just store as is
                            verMap.set(version, locations.locations);
                          }

                          imagesIJ.set(imageName, verMap);
                        }
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
                fileName: `${scanId}-Diffraction Peaks and Roughness`,
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

    return { fileName: `${scanId}-pmc-membership-${roiName}.csv`, data };
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
            /*
            // Get all PMCs for the scan
            const allPMCs: number[] = [];
            resp.entries.forEach(entry => {
              if (entry?.normalSpectra || entry?.dwellSpectra || entry?.bulkSpectra || entry?.maxSpectra) {
                allPMCs.push(entry.id);
              }
            });
            csvs.push(this.makeROIPMCMembershipCSV(scanId, "All Points", allPMCs));
*/
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

  exportExpressionCode(scanId: string, quantId: string, expressionIds: string[]): Observable<WidgetExportData> {
    // For now, we only export the first expression...
    if (expressionIds.length < 1) {
      throw new Error("At least one expression must be selected when exporting expression code");
    }

    return this._cachedDataService.getExpression(ExpressionGetReq.create({ id: expressionIds[0] })).pipe(
      switchMap((resp: ExpressionGetResp) => {
        if (!resp.expression) {
          throw new Error(`Expression ${expressionIds[0]} failed to load`);
        }

        const expExp = new ExpressionExporter();
        return expExp.exportExpressionCode(
          resp.expression as DataExpression,
          scanId,
          quantId,
          this._cachedDataService,
          this._spectrumDataService,
          this._energyCalibrationService
        );
      })
    );
  }
}
