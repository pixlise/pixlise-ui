import { Observable, of } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { NaryChartExporter } from "src/app/modules/scatterplots/base/nary-chart-exporter";
import { BinaryChartModel } from "src/app/modules/scatterplots/widgets/binary-chart-widget/binary-model";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { WidgetExportData, WidgetExportDialogData, WidgetExportRequest } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";

export class BinaryChartExporter extends NaryChartExporter {
  constructor(snackService: SnackbarService, drawer: CanvasDrawer, transform: PanZoom, widgetId: string) {
    super(snackService, drawer, transform, widgetId);
  }

  override exportPlotData(mdl: BinaryChartModel): Observable<string> {
    let rawData = mdl?.raw;
    if (!rawData) {
      return of("");
    }

    let xLabel = rawData.xAxisInfo.label;
    let yLabel = rawData.yAxisInfo.label;

    let data = `"Scan ID","ROI","PMC","${xLabel}","${yLabel}"\n`;
    rawData.pointGroups.forEach(pointGroup => {
      let roiName = pointGroup.roiId;
      let matchingLabel = mdl.keyItems.find(keyItem => keyItem.id === pointGroup.roiId)?.label;
      if (matchingLabel) {
        roiName = matchingLabel;
      } else if (PredefinedROIID.isAllPointsROI(pointGroup.roiId)) {
        roiName = "All Points";
      } else if (PredefinedROIID.isSelectedPointsROI(pointGroup.roiId)) {
        roiName = "Selected Points";
      }

      let scanId = pointGroup.scanId;
      pointGroup.valuesPerScanEntry.forEach(valuesPerScanEntry => {
        let pmc = valuesPerScanEntry.scanEntryId;
        let [xValue, yValue] = valuesPerScanEntry.values;
        data += `${scanId},"${roiName}",${pmc},${xValue ?? ""},${yValue ?? ""}\n`;
      });
    });

    return of(data);
  }

  getExportOptions(mdl: BinaryChartModel): WidgetExportDialogData {
    return this.getNaryExportOptions(mdl, "Binary Chart");
  }

  onExport(mdl: BinaryChartModel, request: WidgetExportRequest): Observable<WidgetExportData> {
    return this.onNaryExport(mdl, "Binary Chart", request);
  }
}
