import { Observable, of, forkJoin } from "rxjs";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { MultiChannelViewerModel } from "./multi-channel-viewer-model";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportFile,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { getPathBase } from "src/app/utils/utils";

export class MultiChannelViewerExporter {
  constructor(
    private _endpointsService: APIEndpointsService,
    private _snackService: SnackbarService,
    private drawer: CanvasDrawer,
    private transform: PanZoom,
    private widgetId: string
  ) {}

  private getImageShortName(imageName: string): string {
    let imageShortName = getPathBase(imageName);
    if (imageName?.includes("MSA_")) {
      imageShortName = "MSA";
    } else if (imageName?.includes("VIS_")) {
      imageShortName = "VIS";
    }

    return imageShortName;
  }

  getExportOptions(mdl: MultiChannelViewerModel, scanId: string, widgetName: string = "Multi-Channel Viewer"): WidgetExportDialogData {
    const imageShortName = this.getImageShortName(mdl.imageName);

    return {
      title: `Export ${widgetName}`,
      defaultZipName: `${scanId} - ${imageShortName} - ${widgetName}`,
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
      dataProducts: [
        {
          id: "rawImage",
          name: "TIF Image as PNG",
          type: "checkbox",
          description: "Export the TIF image used in the viewer as a PNG",
          selected: true,
        },
        {
          id: "viewerImage",
          name: "Viewer Image",
          type: "checkbox",
          description: "Export the multi-channel viewer as a PNG",
          selected: true,
        },
      ],
      dataControls: [],
      chartOptions: [],
      keyOptions: [],
      showPreview: true,
      widgetId: this.widgetId,
    };
  }

  onExport(mdl: MultiChannelViewerModel, scanId: string, request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (request.dataProducts) {
        const imageShortName = this.getImageShortName(mdl.imageName);

        const requestRawImage = request.dataProducts["rawImage"]?.selected;
        const requestViewerImage = request.dataProducts["viewerImage"]?.selected;

        const rawImageRequest = this._endpointsService.loadRGBUImageTIFPreview(mdl.imageName);

        const requests = [requestRawImage ? rawImageRequest : of(null)];

        forkJoin(requests).subscribe({
          next: ([rawImage]) => {
            const images: WidgetExportFile[] = [];

            if (rawImage) {
              const imageFromDataURL = rawImage?.split(",")[1];
              const imageName = getPathBase(mdl.imageName);
              images.push({
                fileName: imageName,
                data: imageFromDataURL,
              });
            }

            observer.next({
              images,
              interactiveCanvas: requestViewerImage,
            });
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
