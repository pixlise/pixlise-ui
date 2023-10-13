import { Component, OnDestroy, OnInit } from "@angular/core";
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
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";

@Component({
  selector: "app-spectrum-chart-widget",
  templateUrl: "./spectrum-chart-widget.component.html",
  styleUrls: ["./spectrum-chart-widget.component.scss"],
})
export class SpectrumChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  activeTool: string = "pan";

  resizeSpectraY = false;
  yAxislogScale = false;
  countsPerMin = false;
  countsPerPMC = true;

  mdl: SpectrumChartModel;
  drawer: CanvasDrawer;
  toolhost: SpectrumChartToolHost;

  private _subs = new Subscription();
  constructor(
    private _spectrumService: SpectrumService,
    private _snackService: SnackbarService,
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
          onClick: () => {},
        },
      ],
    };
  }

  ngOnInit() {
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

  onToggleResizeSpectraY() {}

  onToggleYAxislogScale() {
    this.yAxislogScale = !this.yAxislogScale;
  }

  onToggleCountsPerMin() {
    this.countsPerMin = !this.countsPerMin;
  }

  onToggleCountsPerPMC() {
    this.countsPerPMC = !this.countsPerPMC;
  }

  onShowXRayTubeLines() {}

  onResetZoom() {}

  onZoomIn() {
    this.reDraw();
  }

  onZoomOut() {}

  onToolSelected(tool: string) {
    this.activeTool = tool;
    /*this._widgetControlConfiguration["topToolbar"]!.forEach((button: any) => {
      button.value = button.id === tool;
    });
    console.log("Tool selected: ", this.activeTool);*/
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
      // selectedItems: new Map(selectedIds.map(id => [id, []])), // TODO: Need to hook this up somewhere
    };

    dialogConfig.hasBackdrop = false;
    dialogConfig.disableClose = true;

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    // dialogRef.afterClosed().subscribe((result: ROIPickerResponse) => {
    //   if (result) {
    //     // Create entries for each scan
    //     const roisPerScan = new Map<string, string[]>();
    //     for (const roi of result.selectedROISummaries) {
    //       let existing = roisPerScan.get(roi.scanId);
    //       if (existing === undefined) {
    //         existing = [];
    //       }

    //       existing.push(roi.id);
    //       roisPerScan.set(roi.scanId, existing);
    //     }
    //   }
    // });

    dialogRef.componentInstance.onChange.subscribe((result: ROIPickerResponse) => {
      // TODO: Use new result.selectedItems. This is a map of roiId to selected spectrum line options (from SpectrumChartModel.allLineChoiceOptions)
      // It uses the expression as the unique id.
      console.log("LIVE UPDATE FROM SPECTRUM ROI PICKER", result);
    });
  }
}
