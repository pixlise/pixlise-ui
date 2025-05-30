import { forkJoin, Observable, of } from "rxjs";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { BinaryChartModel } from "src/app/modules/scatterplots/widgets/binary-chart-widget/binary-model";
import { TernaryChartModel } from "src/app/modules/scatterplots/widgets/ternary-chart-widget/ternary-model";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import {
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
    const joinedScanIds = this.getJoinedScanIds(mdl);

    return {
      title: `Export ${widgetTypeName}`,
      defaultZipName: `${joinedScanIds} - ${widgetTypeName}`,
      dataProducts: [
        {
          id: "plotImage",
          name: "Plot Image",
          type: "checkbox",
          description: "Export the plot image as a PNG",
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
      options: [
        {
          id: "aspectRatio",
          name: "Aspect Ratio",
          type: "dropdown",
          description: "Select the aspect ratio of the exported image",
          optionIcon: "assets/button-icons/aspect-ratio.svg",
          dropdownOptions: [
            { id: "square", name: "Square" },
            { id: "4:3", name: "4:3" },
            { id: "16:9", name: "16:9" },
          ],
          selectedOption: "square",
          selected: true,
        },
        {
          id: "resolution",
          name: "Resolution",
          type: "dropdown",
          description: "Select the resolution of the exported image",
          optionIcon: "assets/button-icons/resolution.svg",
          dropdownOptions: [
            { id: "low", name: "500px x 500px" },
            { id: "med", name: "750px x 750px" },
            { id: "high", name: "1500px x 1500px" },
          ],
          selectedOption: "low",
          selected: true,
        },
        {
          id: "background",
          name: "Background",
          type: "dropdown",
          description: "Select the background color of the exported image",
          optionIcon: "assets/button-icons/background.svg",
          dropdownOptions: [
            { id: "transparent", name: "Transparent" },
            { id: "white", name: "White" },
            { id: "black", name: "Black" },
          ],
          selectedOption: "black",
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
          description: "Enter the font size of the labels",
          value: 14,
          selected: true,
          toggleable: true,
        },
        {
          id: "font",
          name: "Font",
          type: "dropdown",
          description: "Select the font of the labels",
          dropdownOptions: [
            { id: "Arial", name: "Arial" },
            { id: "Roboto", name: "Roboto" },
            { id: "Helvetica", name: "Helvetica" },
            { id: "Times New Roman", name: "Times New Roman" },
            { id: "Courier New", name: "Courier New" },
            { id: "Verdana", name: "Verdana" },
          ],
          selectedOption: "Arial",
          colorPicker: true,
          colorPickerValue: "",
          selected: true,
        },
        {
          id: "borderWidth",
          name: "Borders",
          type: "number",
          unitIcon: "assets/button-icons/border-width.svg",
          description: "Enter the width of the borders",
          value: 1,
          minValue: 0,
          maxValue: 10,
          selected: true,
          colorPicker: true,
          colorPickerValue: "",
          toggleable: true,
          updateCounts: (selection, selected) => {
            const countMap: Record<string, number> = { borderWidth: 1 };
            return countMap;
          },
        },
      ],
      keyOptions: [
        {
          id: "widgetKeyFontSize",
          name: "Key Font Size",
          type: "number",
          unitIcon: "assets/button-icons/font-size.svg",
          description: "Enter the font size of the key text",
          value: 14,
          selected: true,
        },
        {
          id: "widgetKeyBackgroundColor",
          name: "Key Background",
          type: "dropdown",
          description: "Select the background color of the key",
          dropdownOptions: [
            { id: "transparent", name: "Transparent" },
            { id: "light", name: "Light" },
            { id: "dark", name: "Dark" },
          ],
          selectedOption: "dark",
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
        const joinedScanIds = this.getJoinedScanIds(mdl);

        const requestCSVData = request.dataProducts["csvData"]?.selected;

        const requests = [requestCSVData ? this.exportPlotData(mdl) : of(null)];
        forkJoin(requests).subscribe({
          next: ([csvData, plotImage, largePlotImage]) => {
            const images: WidgetExportFile[] = [];
            const csvs: WidgetExportFile[] = [];

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

            observer.next({ images, csvs, interactiveCanvas: request.dataProducts["plotImage"]?.selected, interactiveKey: request.dataProducts["key"]?.selected });
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
