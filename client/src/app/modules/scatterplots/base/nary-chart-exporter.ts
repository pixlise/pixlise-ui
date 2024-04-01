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

export class NaryChartExporter {
  constructor(
    private _snackService: SnackbarService,
    private drawer: CanvasDrawer,
    private transform: PanZoom
  ) {}

  exportPlotData(mdl: TernaryChartModel | BinaryChartModel): Observable<string> {
    return of("");
  }

  getJoinedScanIds(mdl: TernaryChartModel | BinaryChartModel): string {
    let scanIds = [];
    for (let scanId of mdl.dataSourceIds.keys()) {
      scanIds.push(scanId);
    }

    return scanIds.join(" - ") || "No Scan";
  }

  getNaryExportOptions(mdl: TernaryChartModel | BinaryChartModel, widgetTypeName: string = "Chart"): WidgetExportDialogData {
    let joinedScanIds = this.getJoinedScanIds(mdl);

    return {
      title: `Export ${widgetTypeName}`,
      defaultZipName: `${joinedScanIds} - ${widgetTypeName}`,
      options: [
        {
          id: "darkMode",
          name: "Dark Mode",
          type: "checkbox",
          description: "Export the plots in dark mode",
          selected: true,
        },
        {
          id: "key",
          name: "Visible Key",
          type: "checkbox",
          description: "Include the key for the visible regions",
          selected: mdl?.keyItems && mdl.keyItems.length > 0,
          disabled: mdl?.keyItems && mdl.keyItems.length === 0,
          disabledText: "No visible regions to show",
        },
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
          id: "csvData",
          name: "Plot Data .csv",
          type: "checkbox",
          description: "Export the plot data as a CSV",
          selected: true,
        },
      ],
      showPreview: false,
    };
  }

  onNaryExport(mdl: TernaryChartModel | BinaryChartModel, widgetTypeName: string = "Chart", request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (request.dataProducts) {
        let joinedScanIds = this.getJoinedScanIds(mdl);

        let darkMode = request.options["darkMode"]?.selected || false;
        let showKey = request.options["key"]?.selected || false;

        let requestCSVData = request.dataProducts["csvData"]?.selected;
        let requestPlotImage = request.dataProducts["plotImage"]?.selected;
        let requestLargePlotImage = request.dataProducts["largePlotImage"]?.selected;

        let requests = [
          requestCSVData ? this.exportPlotData(mdl) : of(null),
          requestPlotImage ? exportPlotImage(this.drawer, this.transform, mdl.keyItems, showKey, darkMode, 1200, 800) : of(null),
          requestLargePlotImage ? exportPlotImage(this.drawer, this.transform, mdl.keyItems, showKey, darkMode, 4096, 2160) : of(null),
        ];
        combineLatest(requests).subscribe({
          next: ([csvData, plotImage, largePlotImage]) => {
            let images: WidgetExportFile[] = [];
            let csvs: WidgetExportFile[] = [];

            if (csvData) {
              csvs.push({
                fileName: `${joinedScanIds} - ${widgetTypeName} Data`,
                data: csvData,
              });
            }
            if (plotImage) {
              images.push({
                fileName: `${joinedScanIds} - ${widgetTypeName}`,
                data: plotImage,
              });
            }
            if (largePlotImage) {
              images.push({
                fileName: `${joinedScanIds} - Large ${widgetTypeName}`,
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
