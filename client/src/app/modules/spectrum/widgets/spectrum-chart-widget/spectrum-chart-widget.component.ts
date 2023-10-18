import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChange, SimpleChanges } from "@angular/core";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SpectrumService } from "../../services/spectrum.service";
import { Subscription } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Clipboard } from "@angular/cdk/clipboard";
import { SpectrumChartDrawer } from "./spectrum-drawer";
import { CanvasDrawer } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { SpectrumChartModel } from "./spectrum-model";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";
import { SpectrumChartToolHost } from "./tools/tool-host";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { SpectrumExpressionDataSource, SpectrumExpressionParser, SpectrumValues } from "../../models/Spectrum";
import { SpectrumReq, SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { Spectrum, SpectrumType } from "src/app/generated-protos/spectrum";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { RegionSettings } from "src/app/modules/roi/models/roi-region";
import { ScanMetaDataType } from "src/app/generated-protos/scan";
import { Point, Rect } from "src/app/models/Geometry";
import { SpectrumEnergyCalibrationComponent, SpectrumEnergyCalibrationResult } from "./spectrum-energy-calibration/spectrum-energy-calibration.component";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { SpectrumLines, SpectrumWidgetState } from "src/app/generated-protos/viewstate";

@Component({
  selector: "app-spectrum-chart-widget",
  templateUrl: "./spectrum-chart-widget.component.html",
  styleUrls: ["./spectrum-chart-widget.component.scss"],
})
export class SpectrumChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  activeTool: string = "pan";

  resizeSpectraY = false;

  mdl: SpectrumChartModel;
  drawer: CanvasDrawer;
  toolhost: SpectrumChartToolHost;

  private _subs = new Subscription();
  constructor(
    private _spectrumService: SpectrumService,
    private _snackService: SnackbarService,
    private _cachedDataService: APICachedDataService,
    private _roiService: ROIService,
    private _energyCalibrationService: EnergyCalibrationService,
    private _envService: EnvConfigurationService,
    public dialog: MatDialog,
    public clipboard: Clipboard
  ) {
    super();

    this.mdl = new SpectrumChartModel(this._envService /*, dialog, clipboard*/);
    this.toolhost = new SpectrumChartToolHost(this.mdl, dialog, clipboard);
    this.drawer = new SpectrumChartDrawer(this.mdl, this.toolhost);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "pan",
          type: "selectable-button",
          icon: "assets/button-icons/tool-pan.svg",
          tooltip: "Pan Tool (Shift)\nClick and drag to move the context image in the viewport",
          value: false,
          onClick: () => this.onToolSelected("pan"),
        },
        {
          id: "zoom",
          type: "selectable-button",
          icon: "assets/button-icons/tool-zoom.svg",
          tooltip: "Zoom Tool (Shift)\nClick to zoom, or draw a box around area of interest",
          value: false,
          onClick: () => this.onToolSelected("zoom"),
        },
        // {
        //   id: "spectrum-range",
        //   type: "selectable-button",
        //   icon: "assets/button-icons/tool-spectrum-range.svg",
        //   tooltip: "Range Selection Tool\nAllows selection of a range of the spectrum for analysis as maps on context image",
        //   value: false,
        //   onClick: () => this.onToolSelected("spectrum-range"),
        // },
        {
          id: "zoom-in",
          type: "button",
          icon: "assets/button-icons/zoom-in.svg",
          tooltip: "Zoom In",
          onClick: () => this.onZoomIn(),
        },
        {
          id: "zoom-out",
          type: "button",
          icon: "assets/button-icons/zoom-out.svg",
          tooltip: "Zoom Out",
          onClick: () => this.onZoomOut(),
        },
        {
          id: "zoom-all",
          type: "button",
          icon: "assets/button-icons/zoom-all-arrows.svg",
          tooltip: "Zoom To Fit Whole Spectrum",
          onClick: () => this.onResetZoom(),
        },
        {
          id: "xray-tube-element",
          type: "button",
          icon: "assets/button-icons/xray-tube-element.svg",
          tooltip: "Show XRF Lines for X-ray Tube Element",
          onClick: () => this.onShowXRayTubeLines(),
        },
      ],
      bottomToolbar: [
        {
          id: "spectra",
          type: "button",
          title: "Display Spectra",
          value: false,
          onClick: () => this.onSelectSpectra(),
        },
        {
          id: "fit",
          type: "button",
          title: "Display Fit",
          value: false,
          onClick: () => {},
        },
        {
          id: "piquant",
          type: "button",
          title: "Run PIQUANT",
          value: false,
          onClick: () => {},
        },
        {
          id: "peakLabels",
          type: "button",
          title: "Peak Labels",
          value: false,
          onClick: () => {},
        },
        {
          id: "calibration",
          type: "button",
          title: "Calibration",
          value: false,
          onClick: () => this.onCalibration(),
        },
      ],
    };
  }

  ngOnInit() {
    this.widgetData$.subscribe((data: any) => {
      if (data?.spectrumLines) {
        let lines = new Map<string, string[]>();
        data.spectrumLines.forEach((line: SpectrumLines) => {
          lines.set(line.roiID, line.lineExpressions);
        });

        this.mdl.setLineList(lines);
        this.updateLines();
      }
    });

    this.reDraw();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  reDraw() {
    this.mdl.needsDraw$.next();
  }

  get transform() {
    return this.mdl.transform;
  }

  get interactionHandler() {
    return this.toolhost;
  }

  get countsPerMin(): boolean {
    return this.mdl.yAxisCountsPerMin;
  }

  get countsPerPMC(): boolean {
    return this.mdl.yAxisCountsPerPMC;
  }

  get yAxislogScale(): boolean {
    return this.mdl.yAxislogScale;
  }

  onToggleResizeSpectraY() {
    this.mdl.chartYResize = !this.mdl.chartYResize;
    this.updateLines();
  }

  onToggleYAxislogScale() {
    this.mdl.yAxislogScale = !this.mdl.yAxislogScale;
    this.updateLines();
  }

  onToggleCountsPerMin() {
    this.mdl.yAxisCountsPerMin = !this.mdl.yAxisCountsPerMin;
    this.updateLines();
  }

  onToggleCountsPerPMC() {
    this.mdl.yAxisCountsPerPMC = !this.mdl.yAxisCountsPerPMC;
    this.updateLines();
  }

  onShowXRayTubeLines() {}

  onResetZoom() {
    const canvasParams = this.mdl.transform.canvasParams;
    if (canvasParams) {
      this.mdl.transform.resetViewToRect(new Rect(0, 0, canvasParams.width, canvasParams.height), false);
      this.reDraw();
    }
  }

  onZoomIn() {
    const newScale = new Point(this.mdl.transform.scale.x * (1 + 4 / 100), this.mdl.transform.scale.y * (1 + 4 / 100));
    this.mdl.transform.setScaleRelativeTo(newScale, this.mdl.transform.calcViewportCentreInWorldspace(), true);
    this.reDraw();
  }

  onZoomOut() {
    const newScale = new Point(this.mdl.transform.scale.x * (1 - 4 / 100), this.mdl.transform.scale.y * (1 - 4 / 100));
    this.mdl.transform.setScaleRelativeTo(newScale, this.mdl.transform.calcViewportCentreInWorldspace(), true);
    this.reDraw();
  }

  onToolSelected(tool: string) {
    this.activeTool = tool;
    this._widgetControlConfiguration["topToolbar"]!.forEach((button: any) => {
      button.value = button.id === tool;
    });
    console.log("Tool selected: ", this.activeTool);
  }

  onCalibration() {
    const dialogConfig = new MatDialogConfig();
    //dialogConfig.backdropClass = 'empty-overlay-backdrop';

    const scanIds = new Set<string>();
    for (const line of this.mdl.spectrumLines) {
      scanIds.add(line.scanId);
    }

    dialogConfig.data = {
      draggable: true,
      scanIds: Array.from(scanIds),
    };

    const dialogRef = this.dialog.open(SpectrumEnergyCalibrationComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: SpectrumEnergyCalibrationResult) => {
      if (result) {
        // Set the overall flag
        this.mdl.xAxisEnergyScale = result.useCalibration;
        if (this.mdl.xAxisEnergyScale) {
          // Set the new values in service, save for all
          for (const [scanId, cal] of result.calibrationForScans.entries()) {
            this._energyCalibrationService.setCurrentCalibration(scanId, cal);
            for (const detCal of cal) {
              this.mdl.setEnergyCalibration(scanId, detCal);
            }
          }
        }
        this.updateLines();
      }
    });
  }

  onSelectSpectra() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();
    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: false,
      draggable: true,
      liveUpdate: true,
      selectableSubItemOptions: SpectrumChartModel.allLineChoiceOptions,
      subItemButtonName: "Select Spectra",
      selectedItems: this.mdl.getLineList(),
      title: "Spectrum Lines To Display",
    };

    dialogConfig.hasBackdrop = false;
    dialogConfig.disableClose = true;

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    dialogRef.componentInstance.onChange.subscribe((result: ROIPickerResponse) => {
      if (!result.selectedItems) {
        return;
      }

      // Get the region/display settings and spectra, then add
      // a line for each to the chart

      this.mdl.setLineList(result.selectedItems);

      let spectrumLines: SpectrumLines[] = [];
      this.mdl.getLineList().forEach((lineExpressions, roiID) => {
        spectrumLines.push(SpectrumLines.create({ roiID, lineExpressions }));
      });

      this.onSaveWidgetData.emit(SpectrumWidgetState.create({ spectrumLines }));

      this.updateLines();
    });
  }

  private updateLines() {
    // TODO: should we hard code this? Probably not... how does user ask for something else?
    const readType = SpectrumType.SPECTRUM_NORMAL;

    for (const [roiId, options] of this.mdl.getLineList()) {
      this._roiService.getRegionSettings(roiId).subscribe((roi: RegionSettings) => {
        // Now we know the scan Id for this one, request spectra
        this._cachedDataService
          .getSpectrum(
            SpectrumReq.create({
              scanId: roi.region.scanId,
              bulkSum: true,
              maxValue: true,
              //entries: ScanEntryRange.create({ indexes: encodedIndexes })
            })
          )
          .subscribe((spectrumResp: SpectrumResp) => {
            // Read what each roi/option entry requires and form a spectrum source that we can use with the spectrum expression parser
            let values = new Map<string, SpectrumValues>();

            const dataSrc = new SpectrumExpressionDataSourceImpl(spectrumResp);
            const parser = new SpectrumExpressionParser();

            for (const lineExpr of options) {
              // Find the title
              const title = SpectrumChartModel.getTitleForLineExpression(lineExpr);

              // Normal line data retrieval
              values = parser.getSpectrumValues(
                dataSrc,
                // TODO: Convert from PMC to location indexes???
                roi.region.scanEntryIndexesEncoded,
                lineExpr,
                title,
                readType,
                this.mdl.yAxisCountsPerMin,
                this.mdl.yAxisCountsPerPMC
              );

              this.mdl.addLineDataForLine(roiId, lineExpr, roi.region.scanId, roi.region.name, roi.displaySettings.colour, values);
              this.mdl.updateRangesAndKey();
              this.mdl.clearDisplayData(); // This should trigger a redraw
            }
          });
      });
    }
  }
}

class SpectrumExpressionDataSourceImpl implements SpectrumExpressionDataSource {
  constructor(private _spectraResp: SpectrumResp) {}

  getSpectrum(locationIndex: number, detectorId: string, readType: SpectrumType): SpectrumValues {
    if (locationIndex < 0) {
      // Must be bulk or max
      if (readType != SpectrumType.SPECTRUM_BULK && readType != SpectrumType.SPECTRUM_MAX) {
        throw new Error("getSpectrum readType must be BulkSum or MaxValue if no locationIndex specified");
      }

      const readList: Spectrum[] = readType == SpectrumType.SPECTRUM_BULK ? this._spectraResp.bulkSpectra : this._spectraResp.maxSpectra;
      for (const spectrum of readList) {
        if (spectrum.detector == detectorId) {
          return this.convertSpectrum(spectrum);
        }
      }
    } else {
      // Must be bulk or max
      if (readType != SpectrumType.SPECTRUM_NORMAL && readType != SpectrumType.SPECTRUM_DWELL) {
        throw new Error("getSpectrum readType must be Normal or Dwell if locationIndex is specified");
      }

      for (const spectrum of this._spectraResp.spectraPerLocation[locationIndex].spectra) {
        if (spectrum.detector == detectorId && spectrum.type == readType) {
          return this.convertSpectrum(spectrum);
        }
      }
    }

    throw new Error(`No ${readType} spectrum found for detector: ${detectorId} and location ${locationIndex}`);
  }

  private convertSpectrum(s: Spectrum): SpectrumValues {
    const vals = new Float32Array(s.counts);

    // Get the live time
    let liveTime = 0;
    let found = false;

    const liveTimeValue = s.meta[this._spectraResp.liveTimeMetaIndex];
    if (liveTimeValue !== undefined) {
      if (liveTimeValue.fvalue !== undefined) {
        liveTime = liveTimeValue.fvalue;
        found = true;
      } else if (liveTimeValue.ivalue !== undefined) {
        liveTime = liveTimeValue.ivalue;
        found = true;
      }
    }

    if (!found) {
      throw new Error("Failed to get live time for spectrum");
    }

    return new SpectrumValues(vals, s.maxCount, s.detector, liveTime);
  }

  get locationsWithNormalSpectra(): number {
    return this._spectraResp.normalSpectraForScan;
  }
}
