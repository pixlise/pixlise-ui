import { combineLatest, Observable, of } from "rxjs";
import { ManualDiffractionPeak } from "src/app/generated-protos/diffraction-data";
import { DiffractionPeak, RoughnessItem } from "src/app/modules/pixlisecore/models/diffraction";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportFile,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";

export class DiffractionExporter {
  constructor(
    private _snackService: SnackbarService,
    private exportName: string = "Diffraction"
  ) {}

  exportPeaks(
    peaks: DiffractionPeak[],
    manualPeaks: ManualDiffractionPeak[],
    singleCSV: boolean,
    roughnessPeaks?: RoughnessItem[]
  ): Observable<{ detected: string; manual: string; combined: string; roughness: string }> {
    let exportedData = { detected: "", manual: "", combined: "", roughness: "" };

    let headersToLabels: Record<string, string> = {
      id: "ID",
      pmc: "PMC",
      keV: "Energy (keV)",
      kevStart: "Energy Start (keV)",
      kevEnd: "Energy End (keV)",
      effectSize: "Effect Size",
      baselineVariation: "Baseline Variation",
      globalDifference: "Global Difference",
      differenceSigma: "Difference Sigma",
      peakHeight: "Peak Height",
      detector: "Detector",
      channel: "Channel",
      status: "Status",
    };

    let headerRow = Object.values(headersToLabels)
      .map(label => `"${label}"`)
      .join(",");
    let data = `${headerRow}\n`;
    peaks.forEach(peak => {
      let peakObj = peak as any;
      let dataRow = Object.keys(headersToLabels)
        .map(key => {
          let value = `"${peakObj[key] || ""}"`;
          if (key === "status") {
            value = `"${DiffractionPeak.statusToLabelMap.get(peakObj[key]) || ""}"`;
          }

          return value;
        })
        .join(",");
      data += `${dataRow}\n`;
    });

    // Write detected, start roughness
    if (!singleCSV) {
      exportedData.detected = data;

      data = `"PMC","Global Difference","Status"\n`;
    }

    if (roughnessPeaks) {
      roughnessPeaks.forEach(peak => {
        let dataRow = "";
        if (singleCSV) {
          let peakObj = peak as any;
          dataRow = Object.keys(headersToLabels)
            .map(key => {
              let value = `"${peakObj[key] || ""}"`;
              if (key === "status") {
                value = "Roughness";
              }

              return value;
            })
            .join(",");
        } else {
          let status = peak.deleted ? "Deleted" : "Roughness";
          dataRow = `"${peak.pmc}","${peak.globalDifference}","${status}"`;
        }
        data += `${dataRow}\n`;
      });
    }

    // Write roughess (if exists), start manual
    if (!singleCSV) {
      if (roughnessPeaks) {
        exportedData.roughness = data;
      }

      data = `"PMC","Energy (keV)"\n`;
    }

    manualPeaks.forEach(peak => {
      let dataRow = "";
      if (singleCSV) {
        let peakObj = ManualDiffractionPeak.create(peak) as any;
        peakObj.status = "User Specified";
        dataRow = Object.keys(headersToLabels)
          .map(key => `"${peakObj[key] || ""}"`)
          .join(",");
      } else {
        dataRow = `"${peak.pmc}","${peak.energykeV}"`;
      }
      data += `${dataRow}\n`;
    });

    if (!singleCSV) {
      exportedData.manual = data;
    } else {
      exportedData.combined = data;
    }

    return of(exportedData);
  }

  getExportOptions(scanId: string): WidgetExportDialogData {
    return {
      title: `Export ${this.exportName}`,
      defaultZipName: `${scanId} - ${this.exportName}`,
      options: [
        {
          id: "singleCSV",
          name: "Export As A Single CSV",
          type: "checkbox",
          description: "Export the data as a single CSV",
          selected: true,
          updateCounts: (selection, selected) => {
            let countMap: Record<string, number> = {};

            // If we're exporting as a single CSV, we only want to count 1 data product
            if (selected) {
              countMap["detectedPeaks"] = 0.5;
              countMap["manualPeaks"] = 0.5;
            } else {
              countMap["detectedPeaks"] = 1;
              countMap["manualPeaks"] = 1;
            }
            return countMap;
          },
        },
      ],
      dataProducts: [
        {
          id: "detectedPeaks",
          name: "Detected Peaks .csv",
          type: "checkbox",
          description: "Export the detected peaks as a CSV",
          selected: true,
          updateCounts: (selection, selected) => {
            let countMap: Record<string, number> = { detectedPeaks: 1 };

            // If we're exporting as a single CSV, we only want to count 1 data product
            if (selection.options["singleCSV"].selected) {
              countMap["manualPeaks"] = 0.5;
              countMap["detectedPeaks"] = 0.5;
            }
            return countMap;
          },
        },
        {
          id: "manualPeaks",
          name: "User Entered Peaks .csv",
          type: "checkbox",
          description: "Export the user peaks as a CSV",
          selected: true,
          updateCounts: (selection, selected) => {
            let countMap: Record<string, number> = { manualPeaks: 1 };

            // If we're exporting as a single CSV, we only want to count 1 data product
            if (selection.options["singleCSV"].selected) {
              countMap["manualPeaks"] = 0.5;
              countMap["detectedPeaks"] = 0.5;
            }
            return countMap;
          },
        },
      ],
      showPreview: false,
    };
  }

  onExport(diffractionPeaks: DiffractionPeak[], manualPeaks: ManualDiffractionPeak[], scanId: string, request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      if (request.dataProducts) {
        let singleCSV = request.options["singleCSV"]?.selected || false;

        let requestDetectedPeaks = request.dataProducts["detectedPeaks"]?.selected;
        let requestManualPeaks = request.dataProducts["manualPeaks"]?.selected;

        let requestedPeaks = requestDetectedPeaks ? diffractionPeaks : [];
        let requestedManualPeaks = requestManualPeaks ? manualPeaks : [];

        let requests = [this.exportPeaks(requestedPeaks, requestedManualPeaks, singleCSV)];
        combineLatest(requests).subscribe({
          next: ([peaks]) => {
            let csvs: WidgetExportFile[] = [];

            if (peaks.combined) {
              csvs.push({
                fileName: `${scanId} - ${this.exportName} Detected and Manual Peaks`,
                data: peaks.combined,
              });
            } else {
              if (peaks.detected) {
                csvs.push({
                  fileName: `${scanId} - ${this.exportName} Detected Peaks`,
                  data: peaks.detected,
                });
              }
              if (peaks.manual) {
                csvs.push({
                  fileName: `${scanId} - ${this.exportName} Manual Peaks`,
                  data: peaks.manual,
                });
              }
            }

            observer.next({ csvs });
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
