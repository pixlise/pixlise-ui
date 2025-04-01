import { Component, OnDestroy, OnInit } from "@angular/core";
import { AuthService, User } from "@auth0/auth0-angular";
import { combineLatest, map, Observable, of, Subscription, switchMap } from "rxjs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ScanInstrument, scanInstrumentFromJSON, scanInstrumentToJSON, ScanItem } from "src/app/generated-protos/scan";
import { ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { AnalysisLayoutService, DataExporterService } from "src/app/modules/analysis/analysis.module";
import { WidgetReference } from "src/app/modules/analysis/models/screen-configuration.model";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { WidgetExportDialogComponent } from "src/app/modules/widget/components/widget-export-dialog/widget-export-dialog.component";
import {
  WidgetExportData,
  WIDGET_EXPORT_DATA_KEYS,
  WidgetExportDialogData,
  WidgetExportOption,
  WidgetExportRequest,
  WidgetExportFile,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";

@Component({
  selector: "app-export",
  templateUrl: "/src/app/modules/widget/components/widget-export-dialog/widget-export-dialog.component.html",
  styleUrls: ["./export.component.scss", "/src/app/modules/widget/components/widget-export-dialog/widget-export-dialog.component.scss"],
})
export class ExportTabComponent extends WidgetExportDialogComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();
  selectedScanIds: Set<string> = new Set();

  allScans: ScanItem[] = [];
  configuredScans: ScanConfiguration[] = [];

  scanQuants: Record<string, QuantificationSummary[]> = {};
  selectedQuants: Record<string, string> = {};

  layoutWidgets: WidgetReference[] = [];

  constructor(
    private _snackService: SnackbarService,
    private _exporterService: DataExporterService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _authService: AuthService
  ) {
    let data: WidgetExportDialogData = {
      title: "",
      defaultZipName: "",
      options: [],
      dataProducts: [],
      showPreview: false,
      hideProgressLabels: true,
    };

    super(data, null, _snackService, _analysisLayoutService);
  }

  override ngOnInit(): void {
    super.ngOnInit();

    this.data = this.getExportOptions();
    if (this.data.title) {
      this.title = this.data.title;
    }
    if (this.data.options) {
      this.options = this.data.options;
    }
    if (this.data.dataProducts) {
      this.dataProducts = this.data.dataProducts;
    }

    this.initialOptions = this.copyWidgetExportOptionsDefaultState(this.options);
    this.initialDataProducts = this.copyWidgetExportOptionsDefaultState(this.data?.dataProducts || []);

    this.mapAllCounts();
    this.showPreview = !!this.data.showPreview;

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfigWidgetReferences$.subscribe(widgetReferences => {
        this.layoutWidgets = widgetReferences;
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfig => {
        this.configuredScans = Object.values(screenConfig.scanConfigurations);

        this.selectedScanIds.clear();
        this.configuredScans.forEach(scanConfig => {
          if (scanConfig.quantId) {
            this.selectedQuants[scanConfig.id] = scanConfig.quantId;
            this.selectedScanIds.add(scanConfig.id);
          }

          this._analysisLayoutService.fetchQuantsForScan(scanConfig.id);
        });

        this.loadScanOptions();
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(scanQuants => {
        // Only update if there was a change

        let changed = Object.keys(this.scanQuants).length !== Object.keys(scanQuants).length;
        if (!changed) {
          for (let scanId in scanQuants) {
            // If any quant has a different length or id, then we need to update
            if (this.scanQuants[scanId].length !== scanQuants[scanId].length) {
              changed = true;
              break;
            }

            // We don't care about the order of the quants, just that they are the same
            changed = this.scanQuants[scanId].some(quant => quant.id !== scanQuants[scanId].find(q => q.id === quant.id)?.id);
            if (changed) {
              break;
            }
          }
        }

        if (changed) {
          this.scanQuants = scanQuants;
          this.loadScanOptions();
        }
      })
    );

    this._subs.add(
      this.requestExportData.pipe(switchMap(request => this.onExport(request))).subscribe(data => {
        this.onDownload(data);
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  loadScanOptions(): void {
    let options: WidgetExportOption[] = [];
    this.configuredScans.forEach(scanConfig => {
      let scanSummary = this.allScans.find(scan => scan.id === scanConfig.id);
      let quantSummary = this.scanQuants[scanConfig.id]?.find(quant => quant.id === this.selectedQuants[scanConfig.id]);

      if (!scanSummary || !quantSummary) {
        return;
      }

      options.push({
        id: `scan-${scanConfig.id}`,
        name: scanSummary.title,
        type: "checkbox",
        description: `Include scan in export`,
        selected: true,
        subOptions: [
          {
            id: `${scanConfig.id}_quant`,
            name: `Quantification:`,
            type: "dropdown",
            description: `Include quantification in export`,
            selected: true,
            dropdownOptions: this.scanQuants[scanConfig.id].map(quant => ({ id: quant.id, name: quant.params?.userParams?.name || quant.id })),
            selectedOption: quantSummary.id,
          },
          {
            id: `${scanConfig.id}_rois`,
            name: `Regions:`,
            type: "regions",
            description: `Include regions of interest in export (defaults to All Points)`,
            selected: true,
            scanId: scanConfig.id,
            updateCounts: (selection, selected) => {
              this.mapAllDataProductCounts();
              return {};
            },
          },
          {
            id: `${scanConfig.id}_expressions`,
            name: `Expressions:`,
            type: "expressions",
            description: "Include expressions in export",
            selected: true,
            scanId: scanConfig.id,
            quantId: quantSummary.id,
            updateCounts: (selection, selected) => {
              this.mapAllDataProductCounts();
              return {};
            },
          },
        ],
        updateCounts: (selection, selected) => {
          this.mapAllDataProductCounts();
          return {};
        },
      });
    });

    this.options = options;
    this.loadGlobalConfigOptions();
    this.mapAllCounts();
    this.initialOptions = this.copyWidgetExportOptionsDefaultState(this.options);
  }

  loadGlobalConfigOptions(): void {
    let options: WidgetExportOption[] = [];
    options.push({
      id: "includeTIFF",
      name: "Include Raw TIFF Images",
      type: "checkbox",
      description: "Include the raw TIFF images in addition to converted PNG versions",
      selected: false,
      updateCounts: (selection, selected) => {
        this.mapAllDataProductCounts();
        return {};
      },
    });

    options.push({
      id: "singleROICSV",
      name: "Single CSV for per Region",
      type: "checkbox",
      description: "Combine expression data into a single CSV per region",
      selected: true,
      updateCounts: (selection, selected) => {
        this.mapAllDataProductCounts();
        return {};
      },
    });

    this.options.push(...options);
  }

  getExportOptions(): WidgetExportDialogData {
    let currentDateStr = new Date().toISOString().split("T")[0];

    return {
      title: `Export Data`,
      defaultZipName: `Pixlise Data Export ${currentDateStr}`,
      options: [],
      dataProducts: [
        {
          id: "rawSpectralDataPerPMC",
          name: "Raw Spectral Data per PMC by ROI .csv",
          type: "checkbox",
          description: "Export the raw spectral data per PMC as a CSV for each ROI (WARNING: Large file size)",
          selected: false,
          updateCounts: (selection, selected) => {
            let countMap: Record<string, number> = { rawSpectralDataPerPMC: 0 };

            let scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            scanOptions.forEach(scanOption => {
              let scanId = scanOption.id.replace("scan-", "");
              let roiIds = scanOption.subOptions?.find(subOption => subOption.id === scanId + "_rois")?.selectedRegions?.map(roi => roi.id) || [];
              // Adding 1 for All Points
              countMap["rawSpectralDataPerPMC"] += roiIds.length + 1;
            });

            return countMap;
          },
        },
        {
          id: "bulkSumMaxSpectra",
          name: "Bulk/Max All Points, ROI .msa",
          type: "checkbox",
          description: "Export spectra (bulk, max) for all points and selected ROIs as an MSA file",
          selected: false,
          updateCounts: (selection, selected) => {
            let scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            let countMap: Record<string, number> = { bulkSumMaxSpectra: scanOptions.length };

            return countMap;
          },
        },
        {
          id: "piquantQuantification",
          name: "PIQUANT Quantification map .csv",
          type: "checkbox",
          description: "Export the PIQUANT quantification map as a CSV",
          selected: false,
          updateCounts: (selection, selected) => {
            let scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            let countMap: Record<string, number> = { piquantQuantification: scanOptions.length };

            return countMap;
          },
        },
        {
          id: "beamLocations",
          name: "Beam Locations .csv",
          type: "checkbox",
          description: "Export the beam locations as a CSV",
          selected: false,
          updateCounts: (selection, selected) => {
            let scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            let countMap: Record<string, number> = { beamLocations: scanOptions.length };

            return countMap;
          },
        },
        {
          id: "unquantifiedWeightPercent",
          name: "Unquantified Weight Percent .csv",
          type: "checkbox",
          description: "Export the unquantified weight percent as a CSV",
          selected: false,
          updateCounts: (selection, selected) => {
            let scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            let countMap: Record<string, number> = { unquantifiedWeightPercent: scanOptions.length };

            return countMap;
          },
        },
        {
          id: "diffractionAndRoughness",
          name: "Diffraction and Roughness .csv",
          type: "checkbox",
          description: "Export the Diffraction and Roughness as a CSV",
          selected: false,
          updateCounts: (selection, selected) => {
            let scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            let countMap: Record<string, number> = { diffractionAndRoughness: scanOptions.length };

            return countMap;
          },
        },
        {
          id: "roiPMCMembershipList",
          name: "ROI PMC Membership List .csv",
          type: "checkbox",
          description: "Export the ROI PMC membership list as a CSV",
          selected: false,
          updateCounts: (selection, selected) => {
            let countMap: Record<string, number> = { roiPMCMembershipList: 0 };

            let scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            scanOptions.forEach(scanOption => {
              let scanId = scanOption.id.replace("scan-", "");
              let roiIds = scanOption.subOptions?.find(subOption => subOption.id === scanId + "_rois")?.selectedRegions?.map(roi => roi.id) || [];
              // Adding 1 for All Points
              countMap["roiPMCMembershipList"] += roiIds.length + 1;
            });

            return countMap;
          },
        },
        {
          id: "roiExpressionValues",
          name: "ROI Expression Values .csv",
          type: "checkbox",
          description: "Export the expression values for each PMC in an ROI as a CSV",
          disabledText: "Select ROIs and expressions to enable",
          selected: false,
          count: 0,
          updateCounts: (selection, selected) => {
            let countMap: Record<string, number> = { roiExpressionValues: 0 };

            let scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            scanOptions.forEach(scanOption => {
              let scanId = scanOption.id.replace("scan-", "");
              let roiIds = scanOption.subOptions?.find(subOption => subOption.id === scanId + "_rois")?.selectedRegions?.map(roi => roi.id) || [];
              let expressionIds = scanOption.subOptions?.find(subOption => subOption.id === scanId + "_expressions")?.selectedExpressions?.map(exp => exp.id) || [];
              // Adding 1 for All Points
              countMap["roiExpressionValues"] += (roiIds.length + 1) * expressionIds.length;
            });

            return countMap;
          },
        },
        {
          id: "roiExpressionCode",
          name: "Expression Source Code .lua/.csv/.md",
          type: "checkbox",
          description: "Export the runnable expression source code along with data",
          disabledText: "Select expressions to enable",
          disabled: false,
          selected: false,
          count: 0,
          updateCounts: (selection, selected) => {
            const countMap: Record<string, number> = { roiExpressionCode: 0 };

            const scanOptions = Object.values(selection.options).filter(option => option.id.startsWith("scan-") && option.selected);
            scanOptions.forEach(scanOption => {
              const scanId = scanOption.id.replace("scan-", "");
              const expressionIds = scanOption.subOptions?.find(subOption => subOption.id === scanId + "_expressions")?.selectedExpressions?.map(exp => exp.id) || [];
              // Adding 1 for All Points
              countMap["roiExpressionCode"] += expressionIds.length;
            });

            return countMap;
          },
        },
        {
          id: "images",
          name: "Context Images .png",
          type: "images",
          description: "Export the context images as PNGs",
          selected: false,
          updateCounts: (selection, selected) => {
            let selectedImages = selection?.dataProducts["images"]?.selectedImagePaths || [];

            let includeTIFF = selection.options["includeTIFF"]?.selected || false;
            let selectedCount = selectedImages.reduce((acc, img) => acc + (includeTIFF && img.endsWith(".tif") ? 2 : 1), 0);

            return { images: selectedCount };
          },
        },
      ],
      showPreview: false,
    };
  }

  onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (!request.dataProducts) {
        // TODO: should we do something here?
        return;
      }

      this._authService.user$.subscribe((user: User | null | undefined) => {
        const userId = user?.sub || "";

        let requests = this.options
          .filter(option => {
            if (!option.selected || !option.id.startsWith("scan-")) {
              return false;
            }

            let scanId = option.id.replace("scan-", "");
            let quantId = option.subOptions?.find(subOption => subOption.id === scanId + "_quant")?.selectedOption;
            return scanId && quantId;
          })
          .map(option => this.getExportProductsForScan(userId, option, request));

        if (request.dataProducts["images"]?.selected && request.dataProducts["images"]?.selectedImagePaths) {
          let includeRawTIFFs = request.options["includeTIFF"]?.selected || false;
          requests.push(this._exporterService.getContextImages(request.dataProducts["images"].selectedImagePaths, includeRawTIFFs));
        }

        if (requests.length === 0) {
          this._snackService.openError("No items selected for export", "Please select or configure at least one item to export.");
          observer.complete();
        }

        combineLatest(requests).subscribe({
          next: responses => {
            let data: WidgetExportData = {};
            responses.forEach(response => {
              WIDGET_EXPORT_DATA_KEYS.forEach(key => {
                let dataKey = key as keyof WidgetExportData;

                if (!data[dataKey]) {
                  data[dataKey] = [] as any;
                }

                if (response[dataKey]) {
                  if (typeof response[dataKey] === "boolean" || typeof data[dataKey] === "boolean") {
                    return;
                  }
                  (data[dataKey] as any[]).push(...(response[dataKey] as any[]));
                }
              });
            });

            observer.next(data);
            observer.complete();
          },
          error: err => {
            observer.error(err);
            this._snackService.openError("Error exporting data", err);
            this.onExportError(err);
            observer.complete();
          },
        });
      });
    });
  }

  private getExportProductsForScan(userId: string, scanGroupOption: WidgetExportOption, request: WidgetExportRequest): Observable<WidgetExportData> {
    let scanId = scanGroupOption.id.replace("scan-", "");
    let scanName = this.allScans.find(scan => scan.id === scanId)?.title || scanId;
    let quantId = scanGroupOption.subOptions!.find(subOption => subOption.id === scanId + "_quant")!.selectedOption!;
    let quantName = this.scanQuants[scanId].find(quant => quant.id === quantId)?.params?.userParams?.name || quantId;
    let instrument = scanInstrumentToJSON(scanInstrumentFromJSON(this.allScans.find(scan => scan.id === scanId)?.instrument || ScanInstrument.UNKNOWN_INSTRUMENT));
    let instrumentConfig = this.allScans.find(scan => scan.id === scanId)?.instrumentConfig || "Unknown";

    let roiIds = scanGroupOption.subOptions?.find(subOption => subOption.id === scanId + "_rois")?.selectedRegions?.map(roi => roi.id) || [];
    let expressionIds = scanGroupOption.subOptions?.find(subOption => subOption.id === scanId + "_expressions")?.selectedExpressions?.map(exp => exp.id) || [];

    let exportRequests: Observable<WidgetExportData>[] = [];
    if (request.dataProducts["rawSpectralDataPerPMC"]?.selected) {
      exportRequests.push(this._exporterService.getRawSpectralDataPerPMC(scanId, roiIds));
    }

    if (request.dataProducts["bulkSumMaxSpectra"]?.selected) {
      exportRequests.push(this._exporterService.getBulkSumMaxSpectra(scanId, roiIds));
    }

    if (request.dataProducts["piquantQuantification"]?.selected) {
      exportRequests.push(this._exporterService.getPiquantMapForScan(scanId, quantId, quantName));
    }

    if (request.dataProducts["beamLocations"]?.selected) {
      exportRequests.push(this._exporterService.getBeamLocationsForScan(scanId));
    }

    if (request.dataProducts["unquantifiedWeightPercent"]?.selected) {
      exportRequests.push(this._exporterService.getUnquantifiedWeightPercents(scanId, quantId, quantName));
    }

    if (request.dataProducts["diffractionAndRoughness"]?.selected) {
      exportRequests.push(this._exporterService.getDiffractionAndRoughness(scanId, quantId));
    }

    if (request.dataProducts["roiPMCMembershipList"]?.selected) {
      exportRequests.push(this._exporterService.getROIPMCMembershipList(scanId, roiIds));
    }

    if (request.dataProducts["roiExpressionValues"]?.selected) {
      let singleCSV = request.options["singleROICSV"]?.selected || false;
      exportRequests.push(this._exporterService.getROIExpressionValues(scanId, quantId, roiIds, expressionIds, singleCSV));
    }

    if (request.dataProducts["roiExpressionCode"]?.selected) {
      exportRequests.push(this._exporterService.exportExpressionCode(userId, scanId, quantId, expressionIds, instrument, instrumentConfig));
    }

    if (exportRequests.length === 0) {
      return of({});
    }

    return combineLatest(exportRequests).pipe(
      map(results => {
        let data: WidgetExportData = {};
        results.forEach(result => {
          WIDGET_EXPORT_DATA_KEYS.forEach(key => {
            let dataKey = key as keyof WidgetExportData;
            if (typeof result[dataKey] === "boolean") {
              return;
            }

            if (!data[dataKey]) {
              data[dataKey] = [] as any;
            }

            if (result[dataKey]) {
              (result[dataKey] as any[]).forEach(file => {
                if (typeof data[dataKey] === "boolean") {
                  return;
                }

                (data[dataKey] as any)!.push({
                  ...file,
                  subFolder: file?.subFolder ? `${scanName}/${file.subFolder}` : scanName,
                });
              });
            }
          });
        });

        return data;
      })
    );
  }
}
