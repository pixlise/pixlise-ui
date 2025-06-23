import { Observable, of, forkJoin } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportRequest,
  WidgetExportFile,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { SpectrumChartModel } from "./spectrum-model";

export class SpectrumChartExporter {
  constructor(
    private snackService: SnackbarService,
    private drawer: CanvasDrawer,
    private transform: PanZoom,
    private widgetId: string
  ) {}

  exportPlotData(mdl: SpectrumChartModel): Observable<string> {
    if (!mdl || mdl.spectrumLines.length === 0) {
      return of("");
    }

    // Get x-axis label based on whether we're showing energy or channel
    const xAxisLabel = mdl.xAxisEnergyScale ? "Energy (keV)" : "Channel";

    // Get y-axis label based on settings
    let yAxisLabel = "Counts";
    if (mdl.yAxisCountsPerMin) {
      yAxisLabel += "/min";
    }
    if (mdl.yAxisCountsPerPMC) {
      yAxisLabel += "/PMC";
    }

    // Start building CSV header
    let data = `"Scan ID","ROI","Expression","${xAxisLabel}","${yAxisLabel}"\n`;

    // For each spectrum line, export its data
    mdl.spectrumLines.forEach(line => {
      const roiName = PredefinedROIID.isAllPointsROI(line.roiId) ? `${line.scanName} - All Points` : `${line.scanName} - ${line.roiName}`;

      // Export each point in the spectrum
      for (let i = 0; i < line.values.length; i++) {
        data += `${line.scanId},"${roiName}","${line.expressionLabel}","${line.xValues[i]}","${line.values[i]}"\n`;
      }
    });

    return of(data);
  }

  getExportOptions(mdl: SpectrumChartModel): WidgetExportDialogData {
    const scanIds = mdl.spectrumLines.map(line => line.scanId).filter((id, index, self) => self.indexOf(id) === index);
    const joinedScanIds = scanIds.join(" - ") || "No Scan";

    return {
      title: "Export Spectrum Chart",
      defaultZipName: `${joinedScanIds} - Spectrum Chart`,
      dataProducts: [
        {
          id: "plotImage",
          name: "Plot Image",
          type: "checkbox",
          description: "Export the spectrum chart as a PNG",
          selected: true,
        },
        {
          id: "csvData",
          name: "Plot Data .csv",
          type: "checkbox",
          description: "Export the spectrum data as a CSV",
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

  onExport(mdl: SpectrumChartModel, request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (request.dataProducts) {
        const scanIds = mdl.spectrumLines.map(line => line.scanId).filter((id, index, self) => self.indexOf(id) === index);
        const joinedScanIds = scanIds.join(" - ") || "No Scan";

        const requestCSVData = request.dataProducts["csvData"]?.selected;
        const requestPlotImage = request.dataProducts["plotImage"]?.selected;
        const showKey = request.options["key"]?.selected || false;

        // Apply chart options
        const backgroundColorOption = request.options["background"];
        const backgroundColor = backgroundColorOption ? backgroundColorOption.selectedOption : null;
        if (backgroundColor) {
          this.drawer.lightMode = ["white"].includes(backgroundColor);
          this.drawer.transparentBackground = backgroundColor === "transparent";
        }

        const borderWidthOption = request.options["borderWidth"];
        if (borderWidthOption) {
          this.drawer.borderWidth = isNaN(Number(borderWidthOption.value)) ? 1 : Number(borderWidthOption.value);
          mdl.borderWidth$.next(this.drawer.borderWidth);
          mdl.borderColor = borderWidthOption.colorPickerValue || "";
        }

        const aspectRatioOption = request.options["aspectRatio"];
        if (aspectRatioOption) {
          setTimeout(() => {
            mdl.needsCanvasResize$.next();
          }, 0);
        }

        const resolutionOption = request.options["resolution"];
        if (resolutionOption) {
          const resolutionMapping = {
            high: 3,
            med: 1.5,
            low: 1,
          };

          const newResolution = resolutionOption.selectedOption;
          if (newResolution && resolutionMapping[newResolution as keyof typeof resolutionMapping]) {
            mdl.resolution$.next(resolutionMapping[newResolution as keyof typeof resolutionMapping]);
          }
        }

        const labelsOption = request.options["labels"];
        if (labelsOption) {
          mdl.axisLabelFontSize = isNaN(Number(labelsOption.value)) ? 14 : Number(labelsOption.value);
        }

        const fontOption = request.options["font"];
        if (fontOption) {
          mdl.axisLabelFontFamily = fontOption.selectedOption || "Arial";
          mdl.axisLabelFontColor = fontOption.colorPickerValue || "";
        }

        const requests = [requestCSVData ? this.exportPlotData(mdl) : of(null)];

        forkJoin(requests).subscribe({
          next: ([csvData]) => {
            const images: WidgetExportFile[] = [];
            const csvs: WidgetExportFile[] = [];

            if (csvData) {
              csvs.push({
                fileName: `${joinedScanIds} - Spectrum Chart Data`,
                data: csvData,
              });
            }

            observer.next({
              images,
              csvs,
              interactiveCanvas: requestPlotImage,
              interactiveKey: showKey,
            });
            observer.complete();
          },
          error: err => {
            observer.error(err);
            this.snackService.openError("Error exporting data", err);
            observer.complete();
          },
        });
      }
    });
  }
}
