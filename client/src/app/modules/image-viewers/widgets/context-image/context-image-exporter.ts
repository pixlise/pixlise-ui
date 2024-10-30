import { floor } from "mathjs";
import { combineLatest, forkJoin, Observable, of, tap } from "rxjs";
import { ContextImageModel } from "src/app/modules/image-viewers/image-viewers.module";
import { ContextImageDrawModel } from "src/app/modules/image-viewers/widgets/context-image/context-image-model";
import { SnackbarService, WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { CanvasDrawer, CanvasParams } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import {
  exportPlotImage,
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportFile,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { getPathBase } from "src/app/utils/utils";

export class ContextImageExporter {
  constructor(
    private _endpointsService: APIEndpointsService,
    private _snackService: SnackbarService,
    private drawer: CanvasDrawer,
    private transform: PanZoom
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

  getExportOptions(mdl: ContextImageModel, scanId: string, widgetName: string = "Context Image"): WidgetExportDialogData {
    const imageShortName = this.getImageShortName(mdl.imageName);

    return {
      title: `Export ${widgetName}`,
      defaultZipName: `${scanId} - ${imageShortName} - ${widgetName}`,
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
          id: "rawImage",
          name: "Background Image",
          type: "checkbox",
          description: "Export the background image as a PNG",
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

  onExport(mdl: ContextImageModel, scanId: string, drawMdl: ContextImageDrawModel, request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (request.dataProducts) {
        let imageShortName = this.getImageShortName(mdl.imageName);

        let darkMode = request.options["darkMode"]?.selected || false;
        let showKey = request.options["key"]?.selected || false;

        let requestRawImage = request.dataProducts["rawImage"]?.selected;
        let requestPlotImage = request.dataProducts["plotImage"]?.selected;
        let requestLargePlotImage = request.dataProducts["largePlotImage"]?.selected;

        const rawImageRequest = mdl.imageName.endsWith(".tif")
          ? this._endpointsService.loadRGBUImageTIFPreview(mdl.imageName)
          : this._endpointsService.loadImagePreviewForPath(mdl.imageName);

        // Default to some size resembling the MCC image aspect
        const width = 752; //drawMdl.image?.width || 1200;
        let height = 580;

        // If we have a current aspect ratio, preserve it!
        if (drawMdl.image && drawMdl.image.width > 0 && drawMdl.image.height > 0) {
          const ratio = drawMdl.image.width / drawMdl.image.height;
          height = floor(width / ratio);
        }

        const requests = [
          requestRawImage ? rawImageRequest : of(null),
          requestPlotImage ? exportPlotImage(this.drawer, this.transform, [], showKey, darkMode, width, height, 1) : of(null),
          requestLargePlotImage ? exportPlotImage(this.drawer, this.transform, [], showKey, darkMode, width, height, 5) : of(null),
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
