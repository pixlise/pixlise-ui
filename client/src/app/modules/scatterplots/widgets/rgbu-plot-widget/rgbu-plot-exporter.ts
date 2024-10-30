import { combineLatest, forkJoin, Observable, of } from "rxjs";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { RGBUPlotModel } from "src/app/modules/scatterplots/widgets/rgbu-plot-widget/rgbu-plot-model";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import {
  exportPlotImage,
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportFile,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { getPathBase } from "src/app/utils/utils";

export class RGBUPlotExporter {
  constructor(
    private _endpointsService: APIEndpointsService,
    private _snackService: SnackbarService,
    private drawer: CanvasDrawer,
    private transform: PanZoom
  ) {}

  private exportRGBUPlotImage(mdl: RGBUPlotModel, includeKey: boolean, darkMode: boolean, exportWidth: number, dpi: number): Observable<string> {
    const canvasParams = mdl.lastCalcCanvasParams;
    const width = canvasParams?.width ?? 1;
    const height = canvasParams?.height || 1;

    const ratio = width / height;
    const exportHeight = exportWidth / ratio;

    return exportPlotImage(this.drawer, this.transform, mdl.keyItems, includeKey, darkMode, exportWidth, exportHeight, dpi);
  }

  private getImageShortName(imageName: string): string {
    let imageShortName = getPathBase(imageName);
    if (imageName?.includes("MSA_")) {
      imageShortName = "MSA";
    } else if (imageName?.includes("VIS_")) {
      imageShortName = "VIS";
    }

    return imageShortName;
  }

  getExportOptions(mdl: RGBUPlotModel, scanId: string, widgetName: string = "RGBU Plot"): WidgetExportDialogData {
    const imageShortName = this.getImageShortName(mdl.imageName);

    return {
      title: `Export ${widgetName}`,
      defaultZipName: `${scanId} - ${imageShortName} - ${widgetName}`,
      options: [
        /*{
          id: "darkMode",
          name: "Dark Mode",
          type: "checkbox",
          description: "Export the plots in dark mode",
          selected: true,
        },*/
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
          id: "rawImage",
          name: "TIF Image as PNG",
          type: "checkbox",
          description: "Export the TIF image used to generate the plot as a PNG",
          selected: true,
        },
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
      ],
      showPreview: false,
    };
  }

  onExport(mdl: RGBUPlotModel, scanId: string, request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (request.dataProducts) {
        let imageShortName = this.getImageShortName(mdl.imageName);

        let darkMode = false; //request.options["darkMode"]?.selected || false;
        let showKey = request.options["key"]?.selected || false;

        let requestRawImage = request.dataProducts["rawImage"]?.selected;
        let requestPlotImage = request.dataProducts["plotImage"]?.selected;
        let requestLargePlotImage = request.dataProducts["largePlotImage"]?.selected;

        let requests = [
          requestRawImage ? this._endpointsService.loadRGBUImageTIFPreview(mdl.imageName) : of(null),
          requestPlotImage ? this.exportRGBUPlotImage(mdl, showKey, darkMode, 800, 1) : of(null),
          requestLargePlotImage ? this.exportRGBUPlotImage(mdl, showKey, darkMode, 800, 4) : of(null),
        ];
        forkJoin(requests).subscribe({
          next: ([rawImage, plotImage, largePlotImage]) => {
            let images: WidgetExportFile[] = [];

            if (rawImage) {
              let imageFromDataURL = rawImage?.split(",")[1];
              let imageName = getPathBase(mdl.imageName);
              images.push({
                fileName: imageName,
                data: imageFromDataURL,
              });
            }
            if (plotImage) {
              images.push({
                fileName: `${scanId} - ${imageShortName} - Plot Image`,
                data: plotImage,
              });
            }
            if (largePlotImage) {
              images.push({
                fileName: `${scanId} - ${imageShortName} - Large Plot Image`,
                data: largePlotImage,
              });
            }

            observer.next({ images });
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
