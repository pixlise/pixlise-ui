import { Observable, of } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { NaryChartExporter } from "src/app/modules/scatterplots/base/nary-chart-exporter";
import { TernaryChartModel } from "src/app/modules/scatterplots/widgets/ternary-chart-widget/ternary-model";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { WidgetExportData, WidgetExportDialogData, WidgetExportRequest } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";

export class TernaryChartExporter extends NaryChartExporter {
  constructor(snackService: SnackbarService, drawer: CanvasDrawer, transform: PanZoom, widgetId: string) {
    super(snackService, drawer, transform, widgetId);
  }

  override exportPlotData(mdl: TernaryChartModel): Observable<string> {
    const rawData = mdl?.raw;
    if (!rawData) {
      return of("");
    }

    const cornerALabel = rawData.cornerA?.label || "";
    const cornerBLabel = rawData.cornerB?.label || "";
    const cornerCLabel = rawData.cornerC?.label || "";

    // NOTE: Selection is not included in the CSV export
    let data = `"Scan ID","ROI","PMC","${cornerALabel}","${cornerBLabel}","${cornerCLabel}"\n`;
    rawData.pointGroups.forEach(pointGroup => {
      let roiName = pointGroup.roiId;
      const matchingLabel = mdl.keyItems.find(keyItem => keyItem.id === pointGroup.roiId)?.label;
      if (matchingLabel) {
        roiName = matchingLabel;
      } else if (PredefinedROIID.isAllPointsROI(pointGroup.roiId)) {
        roiName = "All Points";
      } else if (PredefinedROIID.isSelectedPointsROI(pointGroup.roiId)) {
        roiName = "Selected Points";
      }

      const scanId = pointGroup.scanId;
      pointGroup.valuesPerScanEntry.forEach(valuesPerScanEntry => {
        const pmc = valuesPerScanEntry.scanEntryId;
        const [cornerAValue, cornerBValue, cornerCValue] = valuesPerScanEntry.values;
        data += `${scanId},"${roiName}",${pmc},${cornerAValue ?? ""},${cornerBValue ?? ""},${cornerCValue ?? ""}\n`;
      });
    });
    return of(data);
  }

  getExportOptions(mdl: TernaryChartModel): WidgetExportDialogData {
    return this.getNaryExportOptions(mdl, "Ternary Chart");
  }

  onExport(mdl: TernaryChartModel, request: WidgetExportRequest): Observable<WidgetExportData> {
    return this.onNaryExport(mdl, "Ternary Chart", request);
  }
}
