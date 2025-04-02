// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, Subscription, combineLatest, of } from "rxjs";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { SelectionService, SnackbarService, WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CanvasInteractionHandler, CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { RGBUPlotDrawer } from "./rgbu-plot-drawer";
import { RGBUPlotInteraction } from "./rgbu-plot-interaction";
import { RGBUPlotModel } from "./rgbu-plot-model";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { RGBUPlotWidgetState } from "src/app/generated-protos/widget-data";
import { RGBUImage } from "src/app/models/RGBUImage";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { MinMax } from "src/app/models/BasicTypes";
import { RGBUAxisUnit } from "./rgbu-plot-data";
import { RGBUAxisRatioPickerComponent, RatioPickerData } from "./rgbuaxis-ratio-picker/rgbuaxis-ratio-picker.component";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { RegionSettings } from "src/app/modules/roi/models/roi-region";
import { selectMinerals } from "../../base/mineral-selection";
import {
  ImagePickerDialogComponent,
  ImagePickerDialogData,
  ImagePickerDialogResponse,
} from "src/app/modules/pixlisecore/components/atoms/image-picker-dialog/image-picker-dialog.component";
import { getScanIdFromImagePath } from "src/app/utils/utils";
import { WidgetExportData, WidgetExportDialogData, WidgetExportRequest } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { RGBUPlotExporter } from "src/app/modules/scatterplots/widgets/rgbu-plot-widget/rgbu-plot-exporter";

@Component({
  selector: "rgbu-plot",
  templateUrl: "./rgbu-plot-widget.component.html",
  styleUrls: ["./rgbu-plot-widget.component.scss"],
})
export class RGBUPlotWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  @ViewChild("interactiveCanvas") interactiveCanvas!: ElementRef;

  mdl = new RGBUPlotModel();
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;
  exporter: RGBUPlotExporter;

  // Just a dummy, we don't pan/zoom
  transform: PanZoom = new PanZoom();

  private _subs = new Subscription();

  private _selectionModes: string[] = [RGBUPlotModel.SELECT_SUBTRACT, RGBUPlotModel.SELECT_RESET, RGBUPlotModel.SELECT_ADD];
  private _selectionMode: string = RGBUPlotModel.SELECT_RESET;

  yAxisSliderLength: number = 150;
  xAxisSliderLength: number = 250;

  errorMsg: string = "";

  purpose: ScanImagePurpose = ScanImagePurpose.SIP_MULTICHANNEL;

  public scanIds: string[] = [];
  public scanIdAssociatedWithImage: string = "";

  constructor(
    public dialog: MatDialog,
    private _selectionService: SelectionService,
    private _endpointsService: APIEndpointsService,
    private _cachedDataService: APICachedDataService,
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService
  ) {
    super();

    this.drawer = new RGBUPlotDrawer(this.mdl);
    this.toolhost = new RGBUPlotInteraction(this.mdl, this._selectionService);
    this.exporter = new RGBUPlotExporter(this._endpointsService, this._snackService, this.drawer, this.transform);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "minerals",
          type: "button",
          title: "Minerals",
          tooltip: "Choose mineral areas to display",
          onClick: trigger => this.onMinerals(trigger),
        },
        {
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
        },
        {
          id: "image-picker",
          type: "button",
          title: "Image",
          tooltip: "Choose image",
          onClick: () => this.onImagePicker(),
        },
        {
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export Data",
          onClick: () => this.onExportWidgetData.emit(),
        },
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          onClick: () => this.onSoloView(),
        },
      ],
      topRightInsetButton: {
        id: "key",
        type: "widget-key",
        onClick: () => {},
        onUpdateKeyItems: (keyItems: WidgetKeyItem[]) => {
          this.mdl.keyItems = keyItems;
          this.mdl.rebuild();
        },
      },
    };
  }

  ngOnInit() {
    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const state = data as RGBUPlotWidgetState;
        if (state && state.imageName) {
          this.mdl.drawMonochrome = state.drawMonochrome;
          this.mdl.mineralsShown = state.minerals || [];
          this.mdl.selectedMinXValue = state.selectedMinXValue ?? null;
          this.mdl.selectedMaxXValue = state.selectedMaxXValue ?? null;
          this.mdl.selectedMinYValue = state.selectedMinYValue ?? null;
          this.mdl.selectedMaxYValue = state.selectedMaxYValue ?? null;
          this.mdl.visibleRegionIds = state.roiIds || [];

          this.mdl.xAxisUnit = new RGBUAxisUnit(RGBUPlotModel.channelToIdx(state.xChannelA || "R"), RGBUPlotModel.channelToIdx(state.xChannelB ?? "G"));
          this.mdl.yAxisUnit = new RGBUAxisUnit(RGBUPlotModel.channelToIdx(state.yChannelA || "B"), RGBUPlotModel.channelToIdx(state.yChannelB ?? "U"));

          this.loadData(state.imageName, this.mdl.visibleRegionIds);
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe((sel: SelectionHistoryItem) => {
        this.mdl.handleSelectionChange(sel);
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        if (screenConfiguration && screenConfiguration.scanConfigurations) {
          this.scanIds = Object.entries(screenConfiguration.scanConfigurations).map(([scanId]) => scanId);
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private setInitialConfig() {
    // If we don't have anything showing yet, just show the first one...
    if (!this._analysisLayoutService.defaultScanId && (!this.scanIds || this.scanIds.length === 0)) {
      return;
    }

    const scanIds = this.scanIds && this.scanIds.length > 0 ? this.scanIds : [this._analysisLayoutService.defaultScanId];
    this._cachedDataService.getImageList(ImageListReq.create({ scanIds })).subscribe((resp: ImageListResp) => {
      let rgbuImages = resp.images.filter(img => img.imagePath && img.purpose === ScanImagePurpose.SIP_MULTICHANNEL);

      // Use the MSA image as the default if it exists, else use the first RGBU image
      let msaImage = rgbuImages.find(img => img.imagePath.includes("MSA_"));
      if (msaImage) {
        this.loadData(msaImage.imagePath, []);
      } else if (rgbuImages.length > 0) {
        this.loadData(rgbuImages[0].imagePath, []);
      }
    });
  }

  private saveState(): void {
    this.onSaveWidgetData.emit(
      RGBUPlotWidgetState.create({
        drawMonochrome: this.mdl.drawMonochrome,
        imageName: this.mdl.imageName,
        minerals: this.mdl.mineralsShown,
        selectedMinXValue: this.mdl.selectedMinXValue ?? undefined,
        selectedMaxXValue: this.mdl.selectedMaxXValue ?? undefined,
        selectedMinYValue: this.mdl.selectedMinYValue ?? undefined,
        selectedMaxYValue: this.mdl.selectedMaxYValue ?? undefined,
        xChannelA: RGBUPlotModel.idxToChannel(this.mdl.xAxisUnit.numeratorChannelIdx),
        xChannelB: RGBUPlotModel.idxToChannel(this.mdl.xAxisUnit.denominatorChannelIdx),
        yChannelA: RGBUPlotModel.idxToChannel(this.mdl.yAxisUnit.numeratorChannelIdx),
        yChannelB: RGBUPlotModel.idxToChannel(this.mdl.yAxisUnit.denominatorChannelIdx),
        roiIds: this.mdl.visibleRegionIds,
      })
    );
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  onMinerals(trigger: Element | undefined) {
    selectMinerals(this.dialog, trigger, this.mdl.mineralsShown, mineralsShown => {
      if (mineralsShown) {
        this.mdl.mineralsShown = mineralsShown;
        this.loadData(this.mdl.imageName, this.mdl.visibleRegionIds);
      }
    });
  }

  onToggleMineralLabels() {
    this.mdl.showAllMineralLabels = !this.mdl.showAllMineralLabels;
    this.mdl.rebuild();
    this.saveState();
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();
    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: false,
      scanId: this.scanIdAssociatedWithImage ? this.scanIdAssociatedWithImage : this.scanIds ? this.scanIds[0] : this._analysisLayoutService.defaultScanId,
      selectedIds: this.mdl.visibleRegionIds,
    };

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ROIPickerResponse) => {
      if (result) {
        this.mdl.visibleRegionIds = [];

        // Create entries for each scan
        const roisPerScan = new Map<string, string[]>();
        for (const roi of result.selectedROISummaries) {
          let existing = roisPerScan.get(roi.scanId);
          if (existing === undefined) {
            existing = [];
          }

          existing.push(roi.id);
          roisPerScan.set(roi.scanId, existing);

          if (!this.scanIdAssociatedWithImage) {
            this.scanIdAssociatedWithImage = roi.scanId;
          }
        }

        // Now fill in the data source ids using the above
        for (const roiIds of roisPerScan.values()) {
          this.mdl.visibleRegionIds.push(...roiIds);
        }

        this.loadData(this.mdl.imageName, this.mdl.visibleRegionIds);
      }
    });
  }

  get drawMonochrome(): boolean {
    return this.mdl.drawMonochrome;
  }

  onImagePicker() {
    const dialogConfig = new MatDialogConfig<ImagePickerDialogData>();
    // Pass data to dialog
    dialogConfig.data = {
      scanIds: this.scanIds,
      defaultScanId: this.scanIdAssociatedWithImage,
      purpose: this.purpose,
      selectedImagePath: this.mdl?.imageName || "",
      liveUpdate: false,
      selectedImageDetails: "",
    };

    const dialogRef = this.dialog.open(ImagePickerDialogComponent, dialogConfig);
    dialogRef.afterClosed().subscribe(({ selectedImagePath, selectedImageScanId }: ImagePickerDialogResponse) => {
      if (selectedImagePath) {
        this.onImageChanged(selectedImagePath);
      }
      if (selectedImageScanId) {
        this.scanIdAssociatedWithImage = selectedImageScanId;
      }
    });
  }

  onToggleDrawMonochrome(): void {
    this.mdl.drawMonochrome = !this.mdl.drawMonochrome;
    this.mdl.rebuild();
    this.saveState();
  }

  get selectionModes(): string[] {
    return this._selectionModes;
  }

  get currentSelectionMode(): string {
    return this._selectionMode;
  }

  onChangeSelectionMode(mode: string): void {
    // Check that it's one of the selected ones
    if (this._selectionModes.indexOf(mode) >= 0) {
      this._selectionMode = mode;

      // Set on our model too so interaction class can see it
      this.mdl.selectionMode = mode;
    }
  }

  onSelectionExclude(): void {
    //this.mdl.excludeSelection(this._selectionService, this._datasetService.datasetLoaded);
  }

  onSelectionClear(): void {
    const allScanIds = [];
    for (const scan of Object.values(this._analysisLayoutService.activeScreenConfiguration$.value.scanConfigurations)) {
      allScanIds.push(scan.id);
    }

    this._selectionService.clearSelection(allScanIds);
  }

  onImageChanged(imagePath: string) {
    if (this.mdl.imageName === imagePath) {
      //   // No change, stop here
      return;
    }

    this.loadData(imagePath, this.mdl.visibleRegionIds);
  }

  // Range slider details
  get xRangeMin(): number {
    return this.mdl.xAxisMinMax.min || 0;
  }
  get xRangeMax(): number {
    return this.mdl.xAxisMinMax.max || 0;
  }
  get xRangeSelectedMin(): number {
    if (this.mdl.selectedMinXValue !== null) {
      return this.mdl.selectedMinXValue;
    }
    return this.mdl.xAxis?.minValue || this.xRangeMin;
  }
  get xRangeSelectedMax(): number {
    if (this.mdl.selectedMaxXValue !== null) {
      return this.mdl.selectedMaxXValue;
    }

    return this.mdl.xAxis?.maxValue || this.xRangeMax;
  }

  get yRangeMin(): number {
    return this.mdl.yAxisMinMax.min || 0;
  }
  get yRangeMax(): number {
    return this.mdl.yAxisMinMax.max || 0;
  }
  get yRangeSelectedMin(): number {
    if (this.mdl.selectedMinYValue !== null) {
      return this.mdl.selectedMinYValue;
    }

    return this.mdl.yAxis?.minValue || this.yRangeMin;
  }
  get yRangeSelectedMax(): number {
    if (this.mdl.selectedMaxYValue !== null) {
      return this.mdl.selectedMaxYValue;
    }

    return this.mdl.yAxis?.maxValue || this.yRangeMax;
  }

  onChangeXAxis(event: any): void {
    this.mdl.selectedMinXValue = event.minValue;
    this.mdl.selectedMaxXValue = event.maxValue;
    // if (event.finish) {
    this.mdl.rebuild();
    this.saveState();
    // }
  }

  onChangeYAxis(event: any): void {
    this.mdl.selectedMinYValue = event.minValue;
    this.mdl.selectedMaxYValue = event.maxValue;
    // if (event.finish) {
    this.mdl.rebuild();
    this.saveState();
    // }
  }

  onAxisClick(axis: string): void {
    const dialogConfig = new MatDialogConfig();

    if (axis == "X") {
      dialogConfig.data = {
        axis: new RGBUAxisUnit(this.mdl.xAxisUnit.numeratorChannelIdx, this.mdl.xAxisUnit.denominatorChannelIdx),
        range: new MinMax(this.mdl.selectedMinXValue, this.mdl.selectedMaxXValue),
      };
    } else if (axis == "Y") {
      dialogConfig.data = {
        axis: new RGBUAxisUnit(this.mdl.yAxisUnit.numeratorChannelIdx, this.mdl.yAxisUnit.denominatorChannelIdx),
        range: new MinMax(this.mdl.selectedMinYValue, this.mdl.selectedMaxYValue),
      };
    } else {
      console.error("Unknown axis for rgbu plot axis setting: " + axis);
      return;
    }

    const dialogRef = this.dialog.open(RGBUAxisRatioPickerComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: RatioPickerData) => {
      if (result) {
        if (result.axis) {
          const resultCopy = new RGBUAxisUnit(result.axis.numeratorChannelIdx, result.axis.denominatorChannelIdx);
          if (axis == "X") {
            this.mdl.xAxisUnit = resultCopy;
          } else if (axis == "Y") {
            this.mdl.yAxisUnit = resultCopy;
          } else {
            console.error("Unknown axis for rgbu plot axis setting: " + axis);
            return;
          }
        }
        if (result.range) {
          if (axis == "X") {
            this.mdl.selectedMinXValue = result.range.min;
            this.mdl.selectedMaxXValue = result.range.max;
          } else if (axis == "Y") {
            this.mdl.selectedMinYValue = result.range.min;
            this.mdl.selectedMaxYValue = result.range.max;
          } else {
            console.error("Unknown axis for rgbu plot axis setting: " + axis);
            return;
          }
        }

        this.mdl.rebuild();
      }
    });
  }

  override getExportOptions(): WidgetExportDialogData {
    return this.exporter.getExportOptions(this.mdl, this.scanIdAssociatedWithImage);
  }

  override onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
    return this.exporter.onExport(this.mdl, this.scanIdAssociatedWithImage, request);
  }

  private loadData(imagePath: string, roiIDs: string[]) {
    this.isWidgetDataLoading = true;

    const request: Observable<RGBUImage | RegionSettings>[] = [this._endpointsService.loadRGBUImageTIF(imagePath)];
    for (const roiId of roiIDs) {
      request.push(this._roiService.getRegionSettings(roiId));
    }

    combineLatest(request).subscribe({
      next: results => {
        const image = results[0] as RGBUImage;
        const rois: RegionSettings[] = [];
        for (let c = 1; c < results.length; c++) {
          rois.push(results[c] as RegionSettings);
        }

        this.scanIdAssociatedWithImage = getScanIdFromImagePath(imagePath);

        // Now we can set this
        this.mdl.imageName = imagePath;
        this.mdl.setData(image, rois);
        this.errorMsg = "";
        this.isWidgetDataLoading = false;

        this.saveState();

        setTimeout(() => {
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
          }
        }, 0);
      },
      error: err => {
        this.isWidgetDataLoading = false;
        this.errorMsg = "Error loading image: " + err;
        console.error("Error loading image: ", err);
      },
    });
  }
}
