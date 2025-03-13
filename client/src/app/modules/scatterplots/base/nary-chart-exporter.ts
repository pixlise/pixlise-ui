import { combineLatest, forkJoin, Observable, of } from "rxjs";
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

export type NaryModelType = TernaryChartModel | BinaryChartModel;

export class NaryChartExporter {
  constructor(
    private _snackService: SnackbarService,
    private drawer: CanvasDrawer,
    private transform: PanZoom,
    private widgetId: string
  ) {}

  exportPlotData(mdl: NaryModelType): Observable<string> {
    return of("");
  }

  getJoinedScanIds(mdl: NaryModelType): string {
    let scanIds = [];
    for (let scanId of mdl.dataSourceIds.keys()) {
      scanIds.push(scanId);
    }

    return scanIds.join(" - ") || "No Scan";
  }

  getNaryExportOptions(mdl: NaryModelType, widgetTypeName: string = "Chart"): WidgetExportDialogData {
    let joinedScanIds = this.getJoinedScanIds(mdl);

    return {
      title: `Export ${widgetTypeName}`,
      defaultZipName: `${joinedScanIds} - ${widgetTypeName}`,
      // options: [
      //   {
      //     id: "darkMode",
      //     name: "Dark Mode",
      //     type: "checkbox",
      //     description: "Export the plots in dark mode",
      //     selected: true,
      //   },
      //   {
      //     id: "key",
      //     name: "Visible Key",
      //     type: "checkbox",
      //     description: "Include the key for the visible regions",
      //     selected: mdl?.keyItems && mdl.keyItems.length > 0,
      //     disabled: mdl?.keyItems && mdl.keyItems.length === 0,
      //     disabledText: "No visible regions to show",
      //   },
      // ],
      // dataProducts: [
      //   {
      //     id: "plotImage",
      //     name: "Plot Image",
      //     type: "checkbox",
      //     description: "Export the plot image as a PNG",
      //     selected: true,
      //   },
      //   {
      //     id: "largePlotImage",
      //     name: "Large Plot Image",
      //     type: "checkbox",
      //     description: "Export a large version of the plot image as a PNG",
      //     selected: true,
      //   },
      //   {
      //     id: "csvData",
      //     name: "Plot Data .csv",
      //     type: "checkbox",
      //     description: "Export the plot data as a CSV",
      //     selected: true,
      //   },
      // ],
      options: [
        {
          id: "aspectRatio",
          name: "Aspect Ratio",
          type: "dropdown",
          description: "Select the aspect ratio of the exported image",
          dropdownOptions: [
            { id: "square", name: "Square" },
            { id: "4:3", name: "4:3" },
            { id: "16:9", name: "16:9" },
          ],
          selectedOption: "square",
          selected: true,
        },
        {
          id: "background",
          name: "Background",
          type: "dropdown",
          description: "Select the background color of the exported image",
          dropdownOptions: [
            { id: "transparent", name: "Transparent" },
            { id: "white", name: "White" },
            { id: "black", name: "Black" },
          ],
          selectedOption: "black",
          selected: true,
        },
        {
          id: "resolution",
          name: "Resolution",
          type: "dropdown",
          description: "Select the resolution of the exported image",
          dropdownOptions: [
            { id: "max", name: "Max" },
            { id: "med", name: "Standard" },
            { id: "low", name: "Low" },
          ],
          selectedOption: "med",
          selected: true,
        },
      ],
      dataControls: [
        //  ROIs
      ],
      chartOptions: [
        {
          id: "labels",
          name: "Labels",
          type: "number",
          unitIcon: "assets/button-icons/font-size.svg",
          description: "Select the font size of the labels",
          value: 12,
          selected: true,
        },
        {
          id: "borderWidth",
          name: "Borders",
          type: "number",
          unitIcon: "assets/button-icons/border-width.svg",
          description: "Select the width of the borders",
          value: 2,
          selected: true,
        },
        {
          id: "referenceLines",
          name: "Reference Lines",
          type: "number",
          unitIcon: "assets/button-icons/border-width.svg",
          description: "Select the width of the reference lines",
          value: 1,
          selected: true,
        },
      ],
      keyOptions: [
        {
          id: "keyText",
          name: "Key text",
          type: "number",
          unitIcon: "assets/button-icons/font-size.svg",
          description: "Select the font size of the key text",
          value: 12,
          selected: true,
        },
        {
          id: "keyBackground",
          name: "Key Background",
          type: "dropdown",
          description: "Select the background color of the key",
          dropdownOptions: [
            { id: "transparent", name: "Transparent" },
            { id: "white", name: "White" },
            { id: "black", name: "Black" },
          ],
          selectedOption: "transparent",
          selected: true,
        },
      ],
      showPreview: true,
      widgetId: this.widgetId,
    };
  }

  onNaryExport(mdl: NaryModelType, widgetTypeName: string = "Chart", request: WidgetExportRequest): Observable<WidgetExportData> {
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
          requestPlotImage ? exportPlotImage(this.drawer, this.transform, mdl.keyItems, showKey, darkMode, 1200, 800, 1) : of(null),
          requestLargePlotImage ? exportPlotImage(this.drawer, this.transform, mdl.keyItems, showKey, darkMode, 1200, 800, 4) : of(null),
        ];
        forkJoin(requests).subscribe({
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
