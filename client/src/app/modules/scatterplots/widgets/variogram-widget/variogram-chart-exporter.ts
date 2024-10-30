import { combineLatest, Observable, of } from "rxjs";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { BinaryChartModel } from "src/app/modules/scatterplots/widgets/binary-chart-widget/binary-model";
import { TernaryChartModel } from "src/app/modules/scatterplots/widgets/ternary-chart-widget/ternary-model";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import {
  exportPlotImage,
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportFile,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { VariogramModel } from "./model";
import { VariogramExportPoint, VariogramExportRawPoint } from "./vario-data";

export class VariogramChartExporter {
  constructor(
    private _snackService: SnackbarService,
    private drawer: CanvasDrawer,
    private transform: PanZoom
  ) {}

  exportRawPlotData(mdl: VariogramModel, rawPointData: VariogramExportRawPoint[]): Observable<string> {
    let data = `"Current PMC","Comparing PMC","Expressions","Comparison Algorithm","First Expression Comparison Value","Second Expression Comparison Value","Combined Value","Distance","Bin Index"\n`;
    rawPointData.forEach(point => {
      data += `${point.currentPMC},${point.comparingPMC},${point.expressions},${point.comparisonAlgorithms},${point.firstExpressionComparisonValue},${point.secondExpressionComparisonValue},${point.combinedValue},${point.distance},${point.binIdx}\n`;
    });

    return of(data);
  }

  exportBinnedPlotData(mdl: VariogramModel, pointDataForExport: VariogramExportPoint[]): Observable<string> {
    let data = `"ROI","Comparison Algorithm","Variogram Element","Distance","Sum","Count","Mean Value"\n`;
    pointDataForExport.forEach(point => {
      data += `"${point.roiName}","${point.comparisonAlgorithm}","${point.title}",${point.distance},${point.sum},${point.count},${point.meanValue ?? ""}\n`;
    });

    return of(data);
  }

  getJoinedScanIds(mdl: VariogramModel): string {
    let scanIds: string[] = Array.from(new Set(mdl.visibleROIs.map(roi => roi.scanId)));
    return scanIds.join(" - ") || "No Scan";
  }

  getExportOptions(mdl: VariogramModel): WidgetExportDialogData {
    let joinedScanIds = this.getJoinedScanIds(mdl);

    return {
      title: "Export Variogram",
      defaultZipName: `${joinedScanIds} - Variogram`,
      options: [
        {
          id: "darkMode",
          name: "Dark Mode",
          type: "checkbox",
          description: "Export the plots in dark mode",
          selected: true,
        },
        // {
        //   id: "key",
        //   name: "Visible Key",
        //   type: "checkbox",
        //   description: "Include the key for the visible regions",
        //   selected: mdl?.keyItems && mdl.keyItems.length > 0,
        //   disabled: mdl?.keyItems && mdl.keyItems.length === 0,
        //   disabledText: "No visible regions to show",
        // },
      ],
      dataProducts: [
        {
          id: "plotImage",
          name: "Plot Image",
          type: "checkbox",
          description: "Export the plot image as a PNG",
          selected: true,
        },
        {
          id: "largePlotImage",
          name: "Large Plot Image",
          type: "checkbox",
          description: "Export a large version of the plot image as a PNG",
          selected: true,
        },
        {
          id: "binnedCSVData",
          name: "Binned Plot Data .csv",
          type: "checkbox",
          description: "Export the binned plot data (the data plotted) as a CSV",
          selected: true,
        },
        {
          id: "rawCSVData",
          name: "Raw Plot Data .csv",
          type: "checkbox",
          description: "Export the raw plot data (all data points) as a CSV (WARNING: large file)",
          selected: false,
        },
      ],
      showPreview: false,
    };
  }

  onExport(
    mdl: VariogramModel,
    binnedPointDataForExport: VariogramExportPoint[],
    rawPointData: VariogramExportRawPoint[],
    request: WidgetExportRequest
  ): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (request.dataProducts) {
        let joinedScanIds = this.getJoinedScanIds(mdl);

        let darkMode = request.options["darkMode"]?.selected || false;
        // let showKey = request.options["key"]?.selected || false;

        let requestBinnedCSVData = request.dataProducts["binnedCSVData"]?.selected;
        let requestRawCSVData = request.dataProducts["rawCSVData"]?.selected;
        let requestPlotImage = request.dataProducts["plotImage"]?.selected;
        let requestLargePlotImage = request.dataProducts["largePlotImage"]?.selected;

        let requests = [
          requestBinnedCSVData ? this.exportBinnedPlotData(mdl, binnedPointDataForExport) : of(null),
          requestRawCSVData ? this.exportRawPlotData(mdl, rawPointData) : of(null),
          requestPlotImage ? exportPlotImage(this.drawer, this.transform, [], false, darkMode, 1200, 800, 1) : of(null),
          requestLargePlotImage ? exportPlotImage(this.drawer, this.transform, [], false, darkMode, 1200, 800, 4) : of(null),
        ];
        combineLatest(requests).subscribe({
          next: ([binnedCSVData, rawCSVData, plotImage, largePlotImage]) => {
            let images: WidgetExportFile[] = [];
            let csvs: WidgetExportFile[] = [];

            if (binnedCSVData) {
              csvs.push({
                fileName: `${joinedScanIds} - Binned Variogram Data`,
                data: binnedCSVData,
              });
            }

            if (rawCSVData) {
              csvs.push({
                fileName: `${joinedScanIds} - Raw Variogram Data`,
                data: rawCSVData,
              });
            }

            if (plotImage) {
              images.push({
                fileName: `${joinedScanIds} - Variogram`,
                data: plotImage,
              });
            }

            if (largePlotImage) {
              images.push({
                fileName: `${joinedScanIds} - Large Variogram`,
                data: largePlotImage,
              });
            }

            observer.next({ images, csvs });
            observer.complete();
          },
          error: err => {
            observer.error(err);
            this._snackService.openError("Error exporting data", err);
            observer.complete();
          },
        });
      }
    });
  }
}
