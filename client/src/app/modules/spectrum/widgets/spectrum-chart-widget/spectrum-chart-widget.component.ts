import { Component, ElementRef, OnDestroy, OnInit, ViewContainerRef } from "@angular/core";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { SelectionService, SnackbarService, WidgetDataService, WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SpectrumService } from "../../services/spectrum.service";
import { Observable, Subscription, catchError, combineLatest, forkJoin, map, of, switchMap } from "rxjs";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { Clipboard } from "@angular/cdk/clipboard";
import { SpectrumChartDrawer } from "./spectrum-drawer";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { SpectrumChartModel } from "./spectrum-model";
import { SpectrumChartToolHost } from "./tools/tool-host";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { SpectrumExpressionParser, SpectrumValues } from "../../models/Spectrum";
import { SpectrumType } from "src/app/generated-protos/spectrum";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { RegionSettings } from "src/app/modules/roi/models/roi-region";
import { Point, Rect } from "src/app/models/Geometry";
import { SpectrumEnergyCalibrationComponent, SpectrumEnergyCalibrationResult } from "./spectrum-energy-calibration/spectrum-energy-calibration.component";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { ScanListReq } from "src/app/generated-protos/scan-msgs";
import { SpectrumToolId } from "./tools/base-tool";
import { PeakIdentificationData, SpectrumPeakIdentificationComponent } from "./spectrum-peak-identification/spectrum-peak-identification.component";
import { getInitialModalPositionRelativeToTrigger } from "src/app/utils/overlay-host";
import { SpectrumLines, SpectrumWidgetState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { ZoomMap } from "src/app/modules/spectrum/widgets/spectrum-chart-widget/ui-elements/zoom-map";
import { SpectrumFitContainerComponent, SpectrumFitData } from "./spectrum-fit-container/spectrum-fit-container.component";
import { SpectrumDataService } from "src/app/modules/pixlisecore/services/spectrum-data.service";
import { SpectrumExpressionDataSourceImpl } from "../../models/SpectrumRespDataSource";
import { RGBA } from "../../../../utils/colours";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportRequest,
  WidgetExportOption,
} from "../../../widget/components/widget-export-dialog/widget-export-model";
import { SpectrumChartExporter } from "./spectrum-chart-exporter";

@Component({
  selector: "app-spectrum-chart-widget",
  templateUrl: "./spectrum-chart-widget.component.html",
  styleUrls: ["./spectrum-chart-widget.component.scss"],
  providers: [SpectrumService],
})
export class SpectrumChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  activeTool: string = "pan";

  mdl: SpectrumChartModel;
  drawer: CanvasDrawer;
  toolhost: SpectrumChartToolHost;
  exporter: SpectrumChartExporter;

  private _shownDisplaySpectra: MatDialogRef<ROIPickerComponent> | null = null;
  private _shownPiquant: MatDialogRef<SpectrumPeakIdentificationComponent> | null = null;
  private _shownFit: MatDialogRef<SpectrumFitContainerComponent> | null = null;

  scanId: string = "";

  selection: SelectionHistoryItem | null = null;

  private _subs = new Subscription();

  constructor(
    private _chartRef: ElementRef,
    private _viewRef: ViewContainerRef,
    private _analysisLayoutService: AnalysisLayoutService,
    private _spectrumService: SpectrumService,
    private _spectrumDataService: SpectrumDataService,
    private _snackService: SnackbarService,
    private _cachedDataService: APICachedDataService,
    private _roiService: ROIService,
    private _energyCalibrationService: EnergyCalibrationService,
    private _selectionService: SelectionService,
    public _widgetDataService: WidgetDataService,
    public dialog: MatDialog,
    public clipboard: Clipboard
  ) {
    super();

    this.mdl = this._spectrumService.mdl;
    this.toolhost = new SpectrumChartToolHost(this.mdl, dialog, clipboard, _snackService, _widgetDataService, _analysisLayoutService);
    this.drawer = new SpectrumChartDrawer(this.mdl, this.toolhost);
    this.exporter = new SpectrumChartExporter(_snackService, this.drawer, this.mdl.transform, this._widgetId);

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
        {
          id: "divider",
          type: "divider",
          onClick: () => null,
        },
        {
          id: "spectrum-range",
          type: "selectable-button",
          icon: "assets/button-icons/tool-spectrum-range.svg",
          tooltip: "Range Selection Tool\nAllows selection of a range of the spectrum for analysis as maps on context image",
          value: false,
          onClick: () => this.onToolSelected("spectrum-range"),
        },
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
          type: "selectable-button",
          icon: "assets/button-icons/xray-tube-element.svg",
          tooltip: "Show XRF Lines for X-ray Tube Element",
          value: false,
          onClick: () => this.onShowXRayTubeLines(),
        },
        {
          id: "divider",
          type: "divider",
          onClick: () => null,
        },
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          onClick: () => this.onSoloView(),
        },
        {
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export Data",
          settingTitle: "Export / Download",
          settingGroupTitle: "Actions",
          onClick: () => this.onExportWidgetData.emit(),
        },
      ],
      bottomToolbar: [
        {
          id: "spectra",
          type: "button",
          title: "Display Spectra",
          tooltip: "Choose what spectra to display",
          value: false,
          onClick: (value, trigger) => this.onSelectSpectra(trigger),
        },
        {
          id: "fit",
          type: "button",
          title: "Display Fit",
          value: false,
          tooltip: "Use PIQUANTs fit feature to see components that make up the modelled spectrum line",
          onClick: (value, trigger) => this.onFit(trigger),
        },
        {
          id: "piquant",
          type: "button",
          title: "Run PIQUANT",
          //disabled: !this._showingPiquant,
          value: false,
          disabled: !this.mdl.xAxisEnergyScale,
          tooltip: "Allows choosing elements and run PIQUANT. Only available if x-axis is calibrated.",
          onClick: (value, trigger) => this.onPiquant(trigger),
        },
        {
          id: "calibration",
          type: "button",
          title: "Calibration",
          tooltip: "Allows calibration of x-axis",
          value: this.mdl.xAxisEnergyScale,
          inactiveIcon: "assets/button-icons/disabled-gray.svg",
          activeIcon: "assets/button-icons/yellow-tick.svg",
          onClick: () => this.onCalibration(),
        },
      ],
      topRightInsetButton: {
        id: "key",
        type: "widget-key",
        style: { "margin-top": "152px" },
        onClick: () => this.onToggleKey(),
        onUpdateKeyItems: (keyItems: WidgetKeyItem[]) => {
          this.mdl.keyItems = keyItems;
          this.mdl.updateRangesAndKey();
        },
      },
    };
  }

  ngOnInit() {
    if (this.mdl) {
      this.mdl.exportMode = this._exportMode;
    }

    this.onToolSelected("pan");

    this.exporter = new SpectrumChartExporter(this._snackService, this.drawer, this.transform, this._widgetId);

    if (!this.scanId) {
      this.scanId = this._analysisLayoutService.defaultScanId;
    }

    this._subs.add(
      this._analysisLayoutService.resizeCanvas$.subscribe(() => {
        // Reposition the key so it's always under the mini-zoom menu
        if (this.widgetControlConfiguration.topRightInsetButton) {
          const clientHeight = this._ref?.location.nativeElement.clientHeight || 0;
          const offset = Math.min(ZoomMap.maxHeight + 12, clientHeight / 3 + 12);
          this.widgetControlConfiguration.topRightInsetButton.style = { "margin-top": `${offset}px` };
        }
      })
    );

    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const spectrumData = data as SpectrumWidgetState;
        if (spectrumData) {
          this.mdl.xAxisEnergyScale = spectrumData.showXAsEnergy;
          this.mdl.yAxisCountsPerMin = spectrumData.yCountsPerMin;
          this.mdl.yAxisCountsPerPMC = spectrumData.yCountsPerPMC;
          this.mdl.yAxislogScale = spectrumData.logScale;
          this.mdl.transform.pan.x = spectrumData.panX;
          this.mdl.transform.pan.y = spectrumData.panY;
          this.mdl.transform.scale.x = spectrumData.zoomX;
          this.mdl.transform.scale.y = spectrumData.zoomY;

          if (this.mdl.transform.scale.x <= 0) {
            this.mdl.transform.scale.x = 1;
          }

          if (this.mdl.transform.scale.y <= 0) {
            this.mdl.transform.scale.y = 1;
          }

          const lines = new Map<string, string[]>();
          spectrumData.spectrumLines.forEach((line: SpectrumLines) => {
            lines.set(line.roiID, line.lineExpressions);
          });

          // Remove any selection ROI from the list
          const selectionROI = PredefinedROIID.getSelectedPointsForScan(this.scanId);
          lines.delete(selectionROI);

          this.mdl.setLineList(lines);

          this.updateLines();

          if (this.widgetControlConfiguration.topRightInsetButton) {
            const clientHeight = this._ref?.location.nativeElement.clientHeight || 0;
            const offset = Math.min(ZoomMap.maxHeight + 12, clientHeight / 3 + 2);
            this.widgetControlConfiguration.topRightInsetButton.style = { "margin-top": `${offset}px` };
            this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
          }
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this.mdl.xAxisEnergyScale$.subscribe((xAxisEnergyScale: boolean) => {
        // Update our button too
        if (this._widgetControlConfiguration.bottomToolbar) {
          for (const cfg of this._widgetControlConfiguration.bottomToolbar) {
            if (cfg.id == "piquant") {
              cfg.disabled = !xAxisEnergyScale;
            } else if (cfg.id == "calibration") {
              cfg.value = xAxisEnergyScale;
            }
          }
        }

        // let scanIds = new Set<string>();
        // this.mdl.spectrumLines.forEach(line => {
        //   scanIds.add(line.scanId);
        // });

        // this.reloadScanCalibrations(Array.from(scanIds), true);
      })
    );

    this._subs.add(
      this.mdl.xrfLinesChanged$.subscribe(() => {
        const tubeZ = this.mdl?.activeXRFDB?.configDetector.tubeElement || 0;
        if (tubeZ) {
          // Check if the xray tube characteristic element is enabled, if so, enable the toolbar button
          let foundZ = false;
          for (const line of this.mdl.xrfLinesPicked) {
            if (line.atomicNumber == tubeZ) {
              foundZ = true;
              break;
            }
          }

          // Set the button state
          for (const button of this._widgetControlConfiguration?.topToolbar || []) {
            if (button.id === "xray-tube-element") {
              button.value = foundZ;
            }
          }
        }
      })
    );

    this._subs.add(
      this.mdl.transform.transformChangeComplete$.subscribe((complete: boolean) => {
        if (complete) {
          this.saveState();
        }
        this.reDraw();
      })
    );

    this._subs.add(
      this.mdl.fitLineSources$.subscribe(() => {
        this.updateLines();
      })
    );

    this._subs.add(
      this._roiService.displaySettingsMap$.subscribe(displaySettings => {
        this.mdl.spectrumLines.forEach(chartLine => {
          if (displaySettings[chartLine.roiId]) {
            chartLine.color = displaySettings[chartLine.roiId].colour.asString();
          }
        });
        this.updateLines();
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe(selection => {
        const hasSelection = selection.beamSelection.getSelectedEntryCount() > 0;
        this.selection = selection;

        // If we have a selection, and the selection ROI doesn't have a line, add it, otherwise remove it
        // updateLines will grab the actual selection data and update the display
        const selectionROI = PredefinedROIID.getSelectedPointsForScan(this.scanId);
        if (!this.mdl.spectrumLines.find(line => line.roiId === selectionROI) && hasSelection) {
          const existingLines = this.mdl.getLineList();
          this.mdl.setLineList(existingLines.set(selectionROI, [SpectrumChartModel.lineExpressionBulkA, SpectrumChartModel.lineExpressionBulkB]));
        } else if (!hasSelection) {
          const existingLines = this.mdl.getLineList();
          existingLines.delete(selectionROI);
          this.mdl.setLineList(existingLines);
          this.mdl.clearDisplayData();
        }

        this.updateLines();
      })
    );

    this._subs.add(
      this._analysisLayoutService.highlightedDiffractionWidget$.subscribe(highlightedDiffraction => {
        if (highlightedDiffraction) {
          if (highlightedDiffraction.widgetId === this._widgetId) {
            this.mdl.showDiffractionPeaks(highlightedDiffraction.peaks);
            this.mdl.zoomToPeak(highlightedDiffraction.keVStart, highlightedDiffraction.keVEnd);
            this.reDraw();
          }
        } else if (this.mdl.diffractionPeaksShown.length > 0) {
          this.mdl.showDiffractionPeaks([]);
          this.reDraw();
        }
      })
    );

    this._subs.add(
      this.toolhost.toolStateChanged$.subscribe(() => {
        const activeToolId = this.getToolId(this.activeTool);
        if (this.toolhost.activeTool.id !== activeToolId) {
          const toolName = this.getToolName(this.toolhost.activeTool.id);
          this.onToolSelected(toolName);
          this.reDraw();
        }
      })
    );

    // Listen to screen configuration changes
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        let updated = false;

        const scanIds = new Set<string>();
        for (const line of this.mdl.spectrumLines) {
          scanIds.add(line.scanId);
        }

        if (screenConfiguration) {
          scanIds.forEach(scanId => {
            if (screenConfiguration?.scanConfigurations?.[scanId]?.colour) {
              if (this._roiService.displaySettingsMap$.value[scanId]) {
                const newColour = RGBA.fromString(screenConfiguration.scanConfigurations[scanId].colour);
                if (this._roiService.displaySettingsMap$.value[scanId].colour !== newColour) {
                  updated = true;
                }

                this._roiService.displaySettingsMap$.value[scanId].colour = newColour;
              } else {
                this._roiService.displaySettingsMap$.value[scanId] = {
                  colour: RGBA.fromString(screenConfiguration.scanConfigurations[scanId].colour),
                  shape: "circle",
                };

                updated = true;
              }

              this._roiService.displaySettingsMap$.next(this._roiService.displaySettingsMap$.value);
            }
          });
        }

        if (updated) {
          this.updateLines();
        }
      })
    );

    this.reDraw();
  }
  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private setInitialConfig() {
    // Show allpoints A/B and selection A/B from the default scan
    this.scanId = this._analysisLayoutService.defaultScanId;

    if (this.scanId.length > 0) {
      const items = new Map<string, string[]>();
      items.set(PredefinedROIID.getAllPointsForScan(this.scanId), [SpectrumChartModel.lineExpressionBulkA, SpectrumChartModel.lineExpressionBulkB]);
      // items.set(PredefinedROIID.getSelectedPointsForScan(this.scanId), [SpectrumChartModel.lineExpressionBulkA, SpectrumChartModel.lineExpressionBulkB]);

      // Set the calibration
      this._subs.add(
        this._energyCalibrationService.getScanCalibration(this.scanId).subscribe((cal: SpectrumEnergyCalibration[]) => {
          this._energyCalibrationService.setCurrentCalibration(this.scanId, cal);
          this.mdl.setEnergyCalibration(this.scanId, cal);
          this.mdl.xAxisEnergyScale = true;
          this.updateLines();
        })
      );

      this.mdl.setLineList(items);
      this.updateLines();
    }
  }

  override getExportOptions(): WidgetExportDialogData {
    return this.exporter.getExportOptions(this.mdl);
  }

  override onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
    return this.exporter.onExport(this.mdl, request);
  }

  updateExportOptions(exportOptions: WidgetExportOption[], exportChartOptions: WidgetExportOption[]) {
    const backgroundColorOption = exportOptions.find(opt => opt.id === "background");
    const backgroundColor = backgroundColorOption ? backgroundColorOption.selectedOption : null;
    if (backgroundColor) {
      (this.drawer as SpectrumChartDrawer).lightMode = ["white"].includes(backgroundColor);
      (this.drawer as SpectrumChartDrawer).transparentBackground = backgroundColor === "transparent";
    }

    const borderWidthOption = exportChartOptions.find(opt => opt.id === "borderWidth");
    if (borderWidthOption) {
      (this.drawer as SpectrumChartDrawer).borderWidth = isNaN(Number(borderWidthOption.value)) ? 1 : Number(borderWidthOption.value);
      (this.drawer as SpectrumChartDrawer).borderColor = borderWidthOption.colorPickerValue || "";
      this.reDraw();
    }

    const aspectRatioOption = exportOptions.find(opt => opt.id === "aspectRatio");

    // If the aspect ratio option is set, we need to trigger a canvas resize on next frame render
    if (aspectRatioOption) {
      setTimeout(() => {
        this.mdl.needsDraw$.next();
        this.mdl.needsCanvasResize$.next();
        this.reDraw();
      }, 0);
    }

    const resolutionOption = exportOptions.find(opt => opt.id === "resolution");
    if (resolutionOption) {
      const resolutionMapping = {
        high: 3,
        med: 1.5,
        low: 1,
      };

      const newResolution = resolutionOption.selectedOption;
      if (newResolution && resolutionMapping[newResolution as keyof typeof resolutionMapping]) {
        this.mdl.resolution$.next(resolutionMapping[newResolution as keyof typeof resolutionMapping]);
      }
    }

    const labelsOption = exportChartOptions.find(opt => opt.id === "labels");
    if (labelsOption) {
      (this.drawer as SpectrumChartDrawer).axisLabelFontSize = isNaN(Number(labelsOption.value)) ? 14 : Number(labelsOption.value);
      this.reDraw();
    }

    const fontOption = exportChartOptions.find(opt => opt.id === "font");
    if (fontOption) {
      (this.drawer as SpectrumChartDrawer).axisLabelFontFamily = fontOption.selectedOption || "Arial";
      (this.drawer as SpectrumChartDrawer).axisLabelFontColor = fontOption.colorPickerValue || "";
      this.reDraw();
    }

    if (resolutionOption && aspectRatioOption) {
      if (aspectRatioOption.selectedOption === "square") {
        resolutionOption.dropdownOptions = [
          { id: "low", name: "500px x 500px" },
          { id: "med", name: "750px x 750px" },
          { id: "high", name: "1500px x 1500px" },
        ];
      } else if (aspectRatioOption.selectedOption === "4:3") {
        resolutionOption.dropdownOptions = [
          { id: "low", name: "666px x 500px" },
          { id: "med", name: "1000px x 750px" },
          { id: "high", name: "2000px x 1500px" },
        ];
      } else if (aspectRatioOption.selectedOption === "16:9") {
        resolutionOption.dropdownOptions = [
          { id: "low", name: "700px x 393px" },
          { id: "med", name: "750px x 422px" },
          { id: "high", name: "1500px x 844px" },
        ];
      }
    }

    this.reDraw();
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
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

  get resizeSpectraY(): boolean {
    return this.mdl.chartYResize;
  }

  onToggleResizeSpectraY() {
    this.mdl.chartYResize = !this.mdl.chartYResize;
    this.updateLines();
    this.saveState();
  }

  onToggleYAxislogScale() {
    this.mdl.yAxislogScale = !this.mdl.yAxislogScale;
    this.updateLines();
    this.saveState();
  }

  onToggleCountsPerMin() {
    this.mdl.yAxisCountsPerMin = !this.mdl.yAxisCountsPerMin;
    this.updateLines();
    this.saveState();
  }

  onToggleCountsPerPMC() {
    this.mdl.yAxisCountsPerPMC = !this.mdl.yAxisCountsPerPMC;
    this.updateLines();
    this.saveState();
  }

  onToggleKey() {}

  onShowXRayTubeLines() {
    // Can't do anything if X axis isn't calibrated, so complain if this is the case
    if (!this.mdl.xAxisEnergyScale) {
      this._snackService.openError("X axis needs to be energy-calibrated for this to show");
      return;
    }

    if (!this.mdl.xrfDBService.tubeElementZ) {
      this._snackService.openError("X-ray tube element unknown, did you add any spectrum lines (from scans) so a detector configuration can be loaded?");
      return;
    }

    if (this._widgetControlConfiguration.topToolbar) {
      for (const button of this._widgetControlConfiguration.topToolbar) {
        if (button.id === "xray-tube-element") {
          // This is the button we're dealing with. If it's active, we disable, otherwise enable
          if (button.value) {
            this.mdl.unpickXRFLine(this.mdl.xrfDBService.tubeElementZ);
          } else {
            this.mdl.pickXRFLine(this.mdl.xrfDBService.tubeElementZ);
          }
          break;
        }
      }
    }
  }

  onResetZoom() {
    const canvasParams = this.mdl.transform.canvasParams;
    if (canvasParams) {
      this.mdl.transform.resetViewToRect(new Rect(0, 0, canvasParams.width, canvasParams.height), false);
      this.reDraw();
      this.saveState();
    }
  }

  onZoomIn() {
    const newScale = new Point(this.mdl.transform.scale.x * (1 + 4 / 100), this.mdl.transform.scale.y * (1 + 4 / 100));
    this.mdl.transform.setScaleRelativeTo(newScale, this.mdl.transform.calcViewportCentreInWorldspace(), true);
    this.reDraw();
    this.saveState();
  }

  onZoomOut() {
    const newScale = new Point(this.mdl.transform.scale.x * (1 - 4 / 100), this.mdl.transform.scale.y * (1 - 4 / 100));
    this.mdl.transform.setScaleRelativeTo(newScale, this.mdl.transform.calcViewportCentreInWorldspace(), true);
    this.reDraw();
    this.saveState();
  }

  getChangeableToolOptions() {
    const toolOptions: Record<string, SpectrumToolId> = {
      pan: SpectrumToolId.PAN,
      zoom: SpectrumToolId.ZOOM,
      "spectrum-range": SpectrumToolId.RANGE_SELECT,
    };
    return toolOptions;
  }

  getToolId(tool: string): SpectrumToolId {
    const toolOptions = this.getChangeableToolOptions();
    return toolOptions[tool] ?? SpectrumToolId.PAN;
  }

  getToolName(tool: SpectrumToolId): string {
    const toolOptions = this.getChangeableToolOptions();
    return Object.keys(toolOptions).find(key => toolOptions[key] === tool) ?? "pan";
  }

  onToolSelected(tool: string) {
    this.activeTool = tool;

    const toolOptions = this.getChangeableToolOptions();
    if (this._widgetControlConfiguration.topToolbar) {
      this._widgetControlConfiguration.topToolbar.forEach(button => {
        if (Object.keys(toolOptions).includes(button.id)) {
          button.value = button.id === tool;
        }
      });
    }

    this.toolhost.setTool(this.getToolId(tool));
  }

  onCalibration() {
    const dialogConfig = new MatDialogConfig();
    //dialogConfig.backdropClass = 'empty-overlay-backdrop';

    const scanIds = new Set<string>();
    for (const line of this.mdl.spectrumLines) {
      scanIds.add(line.scanId);
    }

    const scanQuants = new Map<string, string>();
    for (const scanId of scanIds) {
      const cfg = this._analysisLayoutService.activeScreenConfiguration$.value.scanConfigurations[scanId];
      if (cfg !== undefined) {
        scanQuants.set(scanId, cfg.quantId);
      }
    }

    dialogConfig.data = {
      draggable: true,
      scanIds: Array.from(scanIds),
      scanQuants: scanQuants,
      xAxisEnergyScale: this.mdl.xAxisEnergyScale,
    };

    //dialogConfig.hasBackdrop = false;

    if (this._chartRef && this._chartRef.nativeElement) {
      const rect = this._chartRef.nativeElement.getBoundingClientRect();
      dialogConfig.position = { left: Math.floor(rect.left) + "px", top: this.ensureNotBelowScreen(Math.floor(rect.top + rect.height)) + "px" };
    }

    const dialogRef = this.dialog.open(SpectrumEnergyCalibrationComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: SpectrumEnergyCalibrationResult) => {
      if (result) {
        // Set the overall flag
        this.mdl.xAxisEnergyScale = result.useCalibration;

        const button = this._widgetControlConfiguration.bottomToolbar?.find(btn => btn.id === "calibration");
        if (button) {
          button.value = result.useCalibration;
        }

        // Set the calibration in service and in our model
        for (const [scanId, cal] of result.calibrationForScans.entries()) {
          this._energyCalibrationService.setCurrentCalibration(scanId, cal);
          this.mdl.setEnergyCalibration(scanId, cal);
        }
        this.updateLines();
        this.saveState();
      }
    });
  }

  onSelectSpectra(trigger: Element | undefined) {
    if (this._shownDisplaySpectra) {
      // Hide it
      this._shownDisplaySpectra.close();
      return;
    }

    const dialogConfig = new MatDialogConfig<ROIPickerData>();
    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: false,
      draggable: true,
      liveUpdate: true,
      selectableSubItemOptions: SpectrumChartModel.allLineChoiceOptions,
      subItemButtonName: "Select Spectra",
      selectedItems: this.mdl.getLineList(),
      scanId: this.scanId,
      title: "Spectrum Lines To Display",
      showSelectedPoints: true,
    };

    dialogConfig.hasBackdrop = false;
    dialogConfig.disableClose = true;
    dialogConfig.position = getInitialModalPositionRelativeToTrigger(trigger, ROIPickerComponent.HEIGHT, ROIPickerComponent.WIDTH);

    this._shownDisplaySpectra = this.dialog.open(ROIPickerComponent, dialogConfig);
    this._shownDisplaySpectra.componentInstance.onChange.subscribe((result: ROIPickerResponse) => {
      if (result?.selectedItems === undefined) {
        return;
      }

      // Get the region/display settings and spectra, then add
      // a line for each to the chart.
      this.mdl.setLineList(result.selectedItems);
      if (result.selectedItems.size === 0) {
        this.mdl.clearDisplayData();
      }
      this.updateLines(true);
      this.saveState();
    });

    this._shownDisplaySpectra.afterClosed().subscribe(() => {
      this._shownDisplaySpectra = null;
    });
  }

  private saveState(): void {
    const spectrumLines: SpectrumLines[] = [];
    this.mdl.getLineList().forEach((lineExpressions, roiID) => {
      // If the selection ROI, we don't save it
      if (PredefinedROIID.isSelectedPointsROI(roiID)) {
        return;
      }

      spectrumLines.push(SpectrumLines.create({ roiID, lineExpressions }));
    });

    const spectrumData = SpectrumWidgetState.create({
      showXAsEnergy: this.mdl.xAxisEnergyScale,
      yCountsPerMin: this.mdl.yAxisCountsPerMin,
      yCountsPerPMC: this.mdl.yAxisCountsPerPMC,
      logScale: this.mdl.yAxislogScale,
      panX: this.mdl.transform.pan.x,
      panY: this.mdl.transform.pan.y,
      zoomX: this.mdl.transform.scale.x,
      zoomY: this.mdl.transform.scale.y,
      spectrumLines: spectrumLines,
    });

    this.onSaveWidgetData.emit(spectrumData);
  }

  onPiquant(trigger: Element | undefined) {
    if (this._shownPiquant) {
      // Hide it
      this._shownPiquant.close();
      return;
    }

    const dialogConfig = new MatDialogConfig();
    //dialogConfig.backdropClass = 'empty-overlay-backdrop';

    dialogConfig.data = {
      mdl: this.mdl,
      draggable: true,
    };

    dialogConfig.viewContainerRef = this._viewRef; // Ensure our spectrum service can be injected...
    dialogConfig.hasBackdrop = false;

    if (this._chartRef && this._chartRef.nativeElement && trigger) {
      const widgetRect = this._chartRef.nativeElement.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      dialogConfig.position = { left: Math.floor(widgetRect.left) + "px", top: this.ensureNotBelowScreen(Math.floor(triggerRect.bottom + 12)) + "px" };
    }

    this._shownPiquant = this.dialog.open(SpectrumPeakIdentificationComponent, dialogConfig);
    this._shownPiquant.componentInstance.onChange.subscribe((result: PeakIdentificationData) => {});

    this._shownPiquant.afterClosed().subscribe((result: PeakIdentificationData) => {
      this._shownPiquant = null;
    });
  }

  onFit(trigger: Element | undefined) {
    if (this._shownFit) {
      // Hide it
      this._shownFit.close();
      return;
    }

    const dialogConfig = new MatDialogConfig();
    //dialogConfig.backdropClass = 'empty-overlay-backdrop';

    dialogConfig.data = {
      mdl: this.mdl,
      draggable: true,
    };

    dialogConfig.viewContainerRef = this._viewRef; // Ensure our spectrum service can be injected...
    dialogConfig.hasBackdrop = false;

    if (this._chartRef && this._chartRef.nativeElement && trigger) {
      const widgetRect = this._chartRef.nativeElement.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      dialogConfig.position = { left: Math.floor(widgetRect.left) + "px", top: this.ensureNotBelowScreen(Math.floor(triggerRect.bottom + 12)) + "px" };
    }

    this._shownFit = this.dialog.open(SpectrumFitContainerComponent, dialogConfig);
    //this._shownFit.componentInstance.onChange.subscribe((result: SpectrumFitData) => {});

    this._shownFit.afterClosed().subscribe((result: SpectrumFitData) => {
      this._shownFit = null;
    });
  }

  private ensureNotBelowScreen(y: number): number {
    if (y > window.innerHeight * 0.8) {
      return window.innerHeight * 0.5;
    }
    return y;
  }

  private reloadScanCalibrationsAsync(
    scanIds: string[],
    refreshCalibrationData: boolean = false
  ): Observable<{ scanId: string; scanCalibrations: SpectrumEnergyCalibration[] }[]> {
    if (this.mdl.xAxisEnergyScale) {
      const currentCalibrationRequests = scanIds.map(scanId =>
        this._energyCalibrationService.getCurrentCalibration(scanId).pipe(
          map((cals: SpectrumEnergyCalibration[]) => ({ scanId, cals })),
          catchError(() => of({ scanId, cals: [] }))
        )
      );

      return forkJoin(currentCalibrationRequests).pipe(
        switchMap(results => {
          const calibrationRequests = results.map(({ scanId, cals }) => {
            let emptyCount = cals.filter(cal => cal.isEmpty()).length;
            let hasEnergyCalibration = this.mdl.checkHasEnergyCalibrationForScanIds(scanIds);

            if (refreshCalibrationData || !hasEnergyCalibration || cals.length <= 0 || emptyCount > 0) {
              return this._energyCalibrationService.getScanCalibration(scanId).pipe(
                map((scanCalibrations: SpectrumEnergyCalibration[]) => ({ scanId, scanCalibrations })),
                catchError(() => of({ scanId, scanCalibrations: [] }))
              );
            } else {
              return of({ scanId, scanCalibrations: cals });
            }
          });

          return forkJoin(calibrationRequests).pipe(
            map(calibrationResults => {
              calibrationResults.forEach(({ scanId, scanCalibrations }) => {
                this._energyCalibrationService.setCurrentCalibration(scanId, scanCalibrations);
                this.mdl.setEnergyCalibration(scanId, scanCalibrations);
              });

              return calibrationResults;
            })
          );
        })
      );
    } else {
      return of([]);
    }
  }

  reloadScanCalibrations(scanIds: string[], refreshCalibrationData: boolean = false) {
    return this.reloadScanCalibrationsAsync(scanIds, refreshCalibrationData).subscribe();
  }

  private updateLines(refreshCalibrationData: boolean = false) {
    const lineMap = this.mdl.getLineList();

    if (lineMap.size <= 0) {
      this.isWidgetDataLoading = false;
      return;
    }

    this.isWidgetDataLoading = true;

    const roiIds = Array.from(lineMap.keys());
    this._subs.add(
      this._roiService.getScanIdsFromROIs(roiIds).subscribe(scanIds => {
        // For any scans coming in that are not yet calibrated, set them to
        // dataset calibration
        this.reloadScanCalibrationsAsync(scanIds, refreshCalibrationData).subscribe(() => {
          this.generateLines();
        });
      })
    );
  }

  generateLines() {
    // TODO: should we hard code this? Probably not... how does user ask for something else?
    const readType = SpectrumType.SPECTRUM_NORMAL;

    for (const [roiId, options] of this.mdl.getLineList()) {
      this._subs.add(
        this._roiService.getRegionSettings(roiId).subscribe((roi: RegionSettings) => {
          if (roi.region.id === PredefinedROIID.getSelectedPointsForScan(roi.region.scanId)) {
            roi.region.scanEntryIndexesEncoded = Array.from(this.selection?.beamSelection.getSelectedScanEntryPMCs(roi.region.scanId) || []) || [];
          }

          let idxs: number[] | null = [];

          // If it's not allpoints, we want actual spectra, so make sure we download them
          if (!PredefinedROIID.isAllPointsROI(roi.region.id)) {
            // If the ROI is empty, still download all
            if (roi.region.scanEntryIndexesEncoded.length <= 0) {
              idxs = null; // null means get ALL
            } else {
              // Don't JUST request the ones needed, request all!
              //idxs = roi.region.scanEntryIndexesEncoded;
              idxs = null;
            }
          }

          combineLatest([
            this._spectrumDataService.getSpectra(roi.region.scanId, idxs, true, true),
            this._cachedDataService.getScanList(
              ScanListReq.create({
                searchFilters: { scanId: roi.region.scanId },
              })
            ),
          ]).subscribe({
            next: ([spectrumResp, scanListResp]) => {
              let scanName = roi.region.scanId;
              if (scanListResp.scans.length > 0) {
                scanName = scanListResp.scans[0].title;
              }

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

                this.mdl.addLineDataForLine(roiId, lineExpr, roi.region.scanId, scanName, roi.region.name, roi.displaySettings.colour, values);
              }

              // Add any fit lines we may need
              this.mdl.clearLines(true);
              if (this.mdl.showFitLines) {
                this.addFitLines();
              }

              this.mdl.updateRangesAndKey();
              if (this.widgetControlConfiguration.topRightInsetButton) {
                this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
              }

              this.mdl.clearDisplayData(); // This should trigger a redraw
              this.isWidgetDataLoading = false;
            },
            error: err => {
              console.error("Failed to load spectra for ROI: ", roiId, err);
              this.isWidgetDataLoading = false;
            },
          });
        })
      );
    }
  }

  private addFitLines() {
    this.mdl.clearLines(false);
    /*const t0 = performance.now();

    // Get min/max data values
    let maxX = SpectrumChannels;
    if (this.mdl.xAxisEnergyScale) {
      const aEnergy = this.mdl.channelTokeV(maxX, "A");
      const bEnergy = this.mdl.channelTokeV(maxX, "B");
      if (aEnergy === null || bEnergy === null) {
        console.error("addFitLines: Failed to convert channel to energy");
        return;
      }

      maxX = Math.max(aEnergy, bEnergy);
    }

    const lineRangeX = new MinMax(0, maxX);
    const lineRangeY = new MinMax(0, 0);
*/
    //const lineSources = this.mdl.showFitLines ? this.mdl.fitLineSources : []; //this._spectrumSources;

    for (const source of this.mdl.fitLineSources) {
      for (const line of source.lineChoices) {
        // If there are no location indexes, we allow this if it's AllPoints ROI, but for any others (eg selection)
        // we don't want to add a line as that would default to looking like the all points ROI
        if (line.enabled && source.colourRGBA && (PredefinedROIID.isAllPointsROI(source.roiId) || source.locationIndexes.length > 0) && line.values !== null) {
          this.mdl.addLineDataForLine(
            source.roiId,
            line.lineExpression,
            source.scanId,
            "scanName",
            "roi.region.name",
            source.colourRGBA,
            new Map<string, SpectrumValues>([[line.label, line.values]]),
            line.lineWidth,
            line.opacity,
            line.drawFilled
          );
          /*
          // Update the max value
          const idx = this._spectrumLines.length - 1;
          if (idx >= 0) {
            this._lineRangeY.expand(this._spectrumLines[idx].maxValue);
          }*/
        }
      }
    }
    /*
    this._keyItems = [];

    // Run through and regenerate key items from all lines
    let lastROI = "";
    for (const line of this._spectrumLines) {
      if (lastROI != line.roiId) {
        this._keyItems.push(new WidgetKeyItem("", line.roiName, line.color));
        lastROI = line.roiId;
      }
      this._keyItems.push(new WidgetKeyItem("", line.expressionLabel, line.color, line.dashPattern));
    }

    const t1 = performance.now();

    this.needsDraw$.next();

    const t2 = performance.now();

    console.log(
      "  Spectrum recalcSpectrumLines for " +
        this._spectrumLines.length +
        " lines took: " +
        (t1 - t0).toLocaleString() +
        "ms, needsDraw$ took: " +
        (t2 - t1).toLocaleString() +
        "ms"
    );*/
  }
}
