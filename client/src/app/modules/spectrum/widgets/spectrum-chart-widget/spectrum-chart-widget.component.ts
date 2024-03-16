import { Component, ElementRef, OnDestroy, OnInit, ViewContainerRef } from "@angular/core";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SpectrumService } from "../../services/spectrum.service";
import { Subscription, combineLatest } from "rxjs";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import { Clipboard } from "@angular/cdk/clipboard";
import { SpectrumChartDrawer } from "./spectrum-drawer";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { SpectrumChartModel } from "./spectrum-model";
import { SpectrumChartToolHost } from "./tools/tool-host";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { SpectrumExpressionDataSource, SpectrumExpressionParser, SpectrumValues } from "../../models/Spectrum";
import { SpectrumReq, SpectrumResp } from "src/app/generated-protos/spectrum-msgs";
import { Spectrum, SpectrumType, spectrumTypeToJSON } from "src/app/generated-protos/spectrum";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { RegionSettings } from "src/app/modules/roi/models/roi-region";
import { Point, Rect } from "src/app/models/Geometry";
import { SpectrumEnergyCalibrationComponent, SpectrumEnergyCalibrationResult } from "./spectrum-energy-calibration/spectrum-energy-calibration.component";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { SpectrumToolId } from "./tools/base-tool";
import { PeakIdentificationData, SpectrumPeakIdentificationComponent } from "./spectrum-peak-identification/spectrum-peak-identification.component";
import { getInitialModalPositionRelativeToTrigger } from "src/app/utils/overlay-host";
import { SpectrumLines, SpectrumWidgetState } from "src/app/generated-protos/widget-data";
import { ScanEntryRange } from "src/app/generated-protos/scan";
import { HighlightedDiffraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/model";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { ZoomMap } from "src/app/modules/spectrum/widgets/spectrum-chart-widget/ui-elements/zoom-map";

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

  private _shownDisplaySpectra: MatDialogRef<ROIPickerComponent> | null = null;
  private _shownPiquant: MatDialogRef<SpectrumPeakIdentificationComponent> | null = null;

  scanId: string = "";

  selection: SelectionHistoryItem | null = null;

  private _subs = new Subscription();

  constructor(
    private _chartRef: ElementRef,
    private _viewRef: ViewContainerRef,
    private _analysisLayoutService: AnalysisLayoutService,
    private _spectrumService: SpectrumService,
    private _snackService: SnackbarService,
    private _cachedDataService: APICachedDataService,
    private _roiService: ROIService,
    private _energyCalibrationService: EnergyCalibrationService,
    private _selectionService: SelectionService,
    public dialog: MatDialog,
    public clipboard: Clipboard
  ) {
    super();

    this.mdl = this._spectrumService.mdl;
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
          type: "selectable-button",
          icon: "assets/button-icons/xray-tube-element.svg",
          tooltip: "Show XRF Lines for X-ray Tube Element",
          value: false,
          onClick: () => this.onShowXRayTubeLines(),
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
          disabled: true,
          tooltip: "Not implemented yet",
          onClick: () => {},
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
      },
    };
  }

  ngOnInit() {
    this.onToolSelected("pan");

    if (!this.scanId) {
      this.scanId = this._analysisLayoutService.defaultScanId;
    }

    this._subs.add(
      this._analysisLayoutService.resizeCanvas$.subscribe(() => {
        // Reposition the key so it's always under the mini-zoom menu
        if (this.widgetControlConfiguration.topRightInsetButton) {
          let clientHeight = this._ref?.location.nativeElement.clientHeight || 0;
          let offset = Math.min(ZoomMap.maxHeight + 12, clientHeight / 3 + 12);
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
          let selectionROI = PredefinedROIID.getSelectedPointsForScan(this.scanId);
          lines.delete(selectionROI);

          // If new widgetData is coming in, we need to update the calibration
          this._subs.add(
            this._energyCalibrationService.getCurrentCalibration(this.scanId).subscribe((cal: SpectrumEnergyCalibration[]) => {
              if (cal.length >= 0) {
                this._energyCalibrationService.setCurrentCalibration(this.scanId, cal);
                this.mdl.setEnergyCalibration(this.scanId, cal);
                this.mdl.xAxisEnergyScale = true;
                this.updateLines();
              }
            })
          );

          this.mdl.setLineList(lines);

          this.updateLines();

          if (this.widgetControlConfiguration.topRightInsetButton) {
            let clientHeight = this._ref?.location.nativeElement.clientHeight || 0;
            let offset = Math.min(ZoomMap.maxHeight + 12, clientHeight / 3 + 2);
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
        let hasSelection = selection.beamSelection.getSelectedEntryCount() > 0;

        // If we have a selection, and the selection ROI doesn't have a line, add it, otherwise remove it
        // updateLines will grab the actual selection data and update the display
        let selectionROI = PredefinedROIID.getSelectedPointsForScan(this.scanId);
        if (!this.mdl.spectrumLines.find(line => line.roiId === selectionROI) && hasSelection) {
          let existingLines = this.mdl.getLineList();
          this.mdl.setLineList(existingLines.set(selectionROI, [SpectrumChartModel.lineExpressionBulkA, SpectrumChartModel.lineExpressionBulkB]));
        } else if (!hasSelection) {
          let existingLines = this.mdl.getLineList();
          existingLines.delete(selectionROI);
          this.mdl.setLineList(existingLines);
        }

        this.selection = selection;
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

    this.reDraw();
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

  onToolSelected(tool: string) {
    this.activeTool = tool;

    if (this._widgetControlConfiguration.topToolbar) {
      let setCount = 0;
      for (const button of this._widgetControlConfiguration.topToolbar) {
        if (button.id === "pan" || button.id === "zoom") {
          button.value = button.id === tool;
          setCount++;

          if (setCount > 1) {
            break;
          }
        }
      }
    }

    this.toolhost.setTool(tool == "pan" ? SpectrumToolId.PAN : SpectrumToolId.ZOOM);
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

        let button = this._widgetControlConfiguration.bottomToolbar?.find(btn => btn.id === "calibration");
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
      this.updateLines();
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
      if (roiID === PredefinedROIID.getSelectedPointsForScan(this.scanId)) {
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

  private ensureNotBelowScreen(y: number): number {
    if (y > window.innerHeight * 0.8) {
      return window.innerHeight * 0.5;
    }
    return y;
  }

  private updateLines() {
    // TODO: should we hard code this? Probably not... how does user ask for something else?
    const readType = SpectrumType.SPECTRUM_NORMAL;
    const scanIds = new Set<string>();

    for (const [roiId, options] of this.mdl.getLineList()) {
      this._subs.add(
        this._roiService.getRegionSettings(roiId).subscribe((roi: RegionSettings) => {
          if (roi.region.id === PredefinedROIID.getSelectedPointsForScan(this.scanId)) {
            // Inject the selection data into the ROI
            roi.region.scanEntryIndexesEncoded = Array.from(this.selection?.beamSelection.getSelectedScanEntryPMCs(this.scanId) || []) || [];
          }

          if (!scanIds.has(roi.region.scanId)) {
            scanIds.add(roi.region.scanId);

            // For any scans coming in that are not yet calibrated, set them to
            // dataset calibration
            if (this.mdl.xAxisEnergyScale) {
              this._energyCalibrationService.getCurrentCalibration(roi.region.scanId).subscribe((cals: SpectrumEnergyCalibration[]) => {
                // If any are empty...
                let emptyCount = 0;
                for (const cal of cals) {
                  if (cal.isEmpty()) {
                    emptyCount++;
                  }
                }

                if (cals.length <= 0 || emptyCount > 0) {
                  this._energyCalibrationService.getScanCalibration(roi.region.scanId).subscribe((scanCals: SpectrumEnergyCalibration[]) => {
                    this._energyCalibrationService.setCurrentCalibration(roi.region.scanId, scanCals);
                    this.mdl.setEnergyCalibration(roi.region.scanId, scanCals);
                  });
                }
              });
            }
          }

          // Now we know the scan Id for this one, request spectra and find the scan name
          // KNOWN ISSUE: this downloads all spectra along with bulk+max, so for only displaying say bulk A+B this is a huuuuge extra download. To
          // mitigate this, if the ROI has no members, we set an empty entries array, but if there is anything in the ROI, we have to download them all
          // anyway (so location indexes can access the returned spectra!). Caching is also going to be better if we download all or nothing...
          // THIS MAY have issues with scans that don't have a stored bulk+max though. Maybe we should always just download all :(
          const spectrumReq = SpectrumReq.create({
            scanId: roi.region.scanId,
            bulkSum: true,
            maxValue: true,
          });
          if (roi.region.scanEntryIndexesEncoded.length <= 0) {
            spectrumReq.entries = ScanEntryRange.create({ indexes: [] });
          }

          combineLatest([
            this._cachedDataService.getSpectrum(spectrumReq),
            this._cachedDataService.getScanList(
              ScanListReq.create({
                searchFilters: { scanId: roi.region.scanId },
              })
            ),
          ]).subscribe({
            next: loadedItems => {
              const spectrumResp = loadedItems[0] as SpectrumResp;
              const scanListResp = loadedItems[1] as ScanListResp;
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

              this.mdl.updateRangesAndKey();
              if (this.widgetControlConfiguration.topRightInsetButton) {
                this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
              }

              this.mdl.clearDisplayData(); // This should trigger a redraw
            },
            error: err => {
              console.error("Failed to load spectra for ROI: ", roiId, err);
            },
          });
        })
      );
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

      if (this._spectraResp.spectraPerLocation[locationIndex]) {
        for (const spectrum of this._spectraResp.spectraPerLocation[locationIndex].spectra) {
          if (spectrum.detector == detectorId && spectrum.type == readType) {
            return this.convertSpectrum(spectrum);
          }
        }
      } else {
        console.warn("No spectra found for location idx: " + locationIndex + ", so no spectrum line will be contributed to display for this location.");
      }
    }

    throw new Error(`No ${spectrumTypeToJSON(readType)} spectrum found for detector: ${detectorId} and location ${locationIndex}`);
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
