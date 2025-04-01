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

  getExportOptions(mdl: ContextImageModel, scanId: string, widgetName: string = "Context Image"): WidgetExportDialogData {
    const imageShortName = this.getImageShortName(mdl.imageName);

    return {
      title: `Export ${widgetName}`,
      defaultZipName: `${scanId} - ${imageShortName} - ${widgetName}`,
      dataProducts: [
        {
          id: "rawImage",
          name: "Raw Image",
          type: "checkbox",
          description: "Export the raw image as a PNG",
          selected: true,
        },
        {
          id: "plotImage",
          name: "Plot Image",
          type: "checkbox",
          description: "Export the shown context image as a PNG",
          selected: true,
        },
        {
          id: "expressionData",
          name: "Expression Data .csv",
          type: "checkbox",
          description: "Export the expression data as a CSV",
          selected: true,
        },
        {
          id: "roiMembership",
          name: "ROI Membership .csv",
          type: "checkbox",
          description: "Export the ROI membership as a CSV",
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
      chartOptions: [],
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

  loadExpressionData(mdl: ContextImageModel): Observable<string> {
    let expressionData = "Scan Id,Expression Name,PMC,Value\n";
    for (const [scanId, scanModel] of mdl.raw?.scanModels || []) {
      for (const map of scanModel.maps) {
        // RGB Mix Case
        if (map.subExpressionNames.length > 1) {
          const points = map.mapPoints;
          for (const point of points) {
            for (let i = 0; i < map.subExpressionNames.length; i++) {
              expressionData += `${scanId},${map.subExpressionNames[i]},${point.scanEntryId},${point.values[i]}\n`;
            }
          }
        } else {
          const expressionName = map.expressionName;
          const points = map.mapPoints;

          for (const point of points) {
            expressionData += `${scanId},${expressionName},${point.scanEntryId},${point.values[0]}\n`;
          }
        }
      }
    }

    return of(expressionData);
  }

  loadROIMembership(mdl: ContextImageModel): Observable<string> {
    let roiMembership = "Scan ID,ROI Name,PMC\n";

    const regions = mdl.getRegions();

    for (const region of regions) {
      const pmcs = region.roi?.scanEntryIndexesEncoded || [];
      for (const pmc of pmcs) {
        roiMembership += `${region.roi.scanId},${region.roi.name},${pmc}\n`;
      }
    }

    return of(roiMembership);
  }

  onExport(mdl: ContextImageModel, scanId: string, drawMdl: ContextImageDrawModel, request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (request.dataProducts) {
        const imageShortName = this.getImageShortName(mdl.imageName);
        const showKey = request.options["key"]?.selected || false;

        const requestRawImage = request.dataProducts["rawImage"]?.selected;
        const requestPlotImage = request.dataProducts["plotImage"]?.selected;
        const roiMembership = request.dataProducts["roiMembership"]?.selected;
        const requestExpressionData = request.dataProducts["expressionData"]?.selected;

        const rawImageRequest = mdl.imageName.endsWith(".tif")
          ? this._endpointsService.loadRGBUImageTIFPreview(mdl.imageName)
          : this._endpointsService.loadImagePreviewForPath(mdl.imageName);

        const requests = [
          requestRawImage ? rawImageRequest : of(null),
          requestExpressionData ? this.loadExpressionData(mdl) : of(null),
          roiMembership ? this.loadROIMembership(mdl) : of(null),
        ];

        forkJoin(requests).subscribe({
          next: ([rawImage, expressionData, roiMembership]) => {
            const images: WidgetExportFile[] = [];
            const csvs: WidgetExportFile[] = [];

            if (rawImage) {
              const imageFromDataURL = rawImage?.split(",")[1];
              const imageName = getPathBase(mdl.imageName);
              images.push({
                fileName: imageName,
                data: imageFromDataURL,
              });
            }

            if (expressionData) {
              const expressionDataName = `${scanId} - ${imageShortName} - Expression Data`;
              csvs.push({
                fileName: expressionDataName,
                data: expressionData,
              });
            }

            if (roiMembership) {
              const roiMembershipName = `${scanId} - ${imageShortName} - ROI Membership`;
              csvs.push({
                fileName: roiMembershipName,
                data: roiMembership,
              });
            }

            observer.next({ images, csvs, interactiveCanvas: requestPlotImage, interactiveKey: showKey });
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
