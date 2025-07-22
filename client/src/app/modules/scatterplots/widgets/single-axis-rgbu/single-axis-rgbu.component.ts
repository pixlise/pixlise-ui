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

import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Observable, Subscription, combineLatest } from "rxjs";
import { AnalysisLayoutService, SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CanvasInteractionHandler, CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { SingleAxisRGBUWidgetState } from "src/app/generated-protos/widget-data";
import { RGBUImage } from "src/app/models/RGBUImage";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { MinMax } from "src/app/models/BasicTypes";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { RegionSettings } from "src/app/modules/roi/models/roi-region";
import { selectMinerals } from "../../base/mineral-selection";
import {
  ImagePickerDialogComponent,
  ImagePickerDialogData,
  ImagePickerDialogResponse,
} from "src/app/modules/pixlisecore/components/atoms/image-picker-dialog/image-picker-dialog.component";
import { RGBUPlotModel } from "src/app/modules/scatterplots/widgets/rgbu-plot-widget/rgbu-plot-model";
import {
  RatioPickerData,
  RGBUAxisRatioPickerComponent,
} from "src/app/modules/scatterplots/widgets/rgbu-plot-widget/rgbuaxis-ratio-picker/rgbuaxis-ratio-picker.component";
import { RGBUAxisUnit } from "src/app/modules/scatterplots/widgets/rgbu-plot-widget/rgbu-plot-data";
import { SingleAxisRGBUDrawer } from "src/app/modules/scatterplots/widgets/single-axis-rgbu/drawer";
import { SingleAxisRGBUInteraction } from "src/app/modules/scatterplots/widgets/single-axis-rgbu/single-axis-rgbu-interaction";
import { RGBUPlotExporter } from "src/app/modules/scatterplots/widgets/rgbu-plot-widget/rgbu-plot-exporter";
import { WidgetExportData, WidgetExportDialogData, WidgetExportRequest } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { getScanIdFromImagePath } from "src/app/utils/utils";

@Component({
  standalone: false,
  selector: "single-axis-rgbu",
  templateUrl: "./single-axis-rgbu.component.html",
  styleUrls: ["./single-axis-rgbu.component.scss"],
})
export class SingleAxisRGBUComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new RGBUPlotModel(true, true);
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

    this.drawer = new SingleAxisRGBUDrawer(this.mdl);
    this.toolhost = new SingleAxisRGBUInteraction(this.mdl, this._selectionService);
    this.exporter = new RGBUPlotExporter(this._endpointsService, this._snackService, this.drawer, this.transform);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "minerals",
          type: "button",
          title: "Minerals",
          tooltip: "Choose mineral areas to display",
          onClick: trigger => this.onMinerals(trigger),
          settingTitle: "Minerals",
          settingIcon: "assets/button-icons/elements.svg",
          settingGroupTitle: "Data",
        },
        {
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
          settingTitle: "Regions",
          settingIcon: "assets/button-icons/roi.svg",
          settingGroupTitle: "Data",
        },
        {
          id: "image-picker",
          type: "button",
          title: "Image",
          tooltip: "Choose image",
          onClick: () => this.onImagePicker(),
          settingTitle: "Image",
          settingIcon: "assets/button-icons/image.svg",
          settingGroupTitle: "Data",
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
          settingTitle: "Solo View",
          settingIcon: "assets/button-icons/widget-solo.svg",
          settingGroupTitle: "Actions",
        },
        {
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export Data",
          onClick: () => this.onExportWidgetData.emit(),
          settingTitle: "Export / Download",
          settingIcon: "assets/button-icons/export.svg",
          settingGroupTitle: "Actions",
        },
      ],
      topRightInsetButton: {
        id: "key",
        type: "widget-key",
        value: this.mdl.keyItems,
        onClick: () => {
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
          }
        },
      },
    };
  }

  ngOnInit() {
    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const state = data as SingleAxisRGBUWidgetState;
        if (state && state.imageName) {
          this.mdl.roiStackedOverlap = state.roiStackedOverlap || false;
          this.mdl.mineralsShown = state.minerals || [];
          this.mdl.selectedMinXValue = state.selectedMinValue ?? null;
          this.mdl.selectedMaxXValue = state.selectedMaxValue ?? null;
          this.mdl.showAllMineralLabels = state.showAllMineralLabels ?? true;

          let channelA = RGBUPlotModel.channelToIdx(state.channelA || "R");
          let channelB = RGBUPlotModel.channelToIdx(state.channelB ?? "G");

          this.mdl.xAxisUnit = new RGBUAxisUnit(channelA, channelB);

          this.loadData(state.imageName, state.roiIds);
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
      SingleAxisRGBUWidgetState.create({
        imageName: this.mdl.imageName,
        minerals: this.mdl.mineralsShown,
        roiStackedOverlap: this.mdl.roiStackedOverlap,
        selectedMinValue: this.mdl.selectedMinXValue || undefined,
        selectedMaxValue: this.mdl.selectedMaxXValue || undefined,
        channelA: RGBUPlotModel.idxToChannel(this.mdl.xAxisUnit.numeratorChannelIdx),
        channelB: RGBUPlotModel.idxToChannel(this.mdl.xAxisUnit.denominatorChannelIdx),
        roiIds: this.mdl.visibleRegionIds,
        showAllMineralLabels: this.mdl.showAllMineralLabels,
      })
    );
  }

  get roiStackedOverlap(): boolean {
    return this.mdl.roiStackedOverlap;
  }

  onToggleROIStackedOverlap(): void {
    this.mdl.roiStackedOverlap = !this.mdl.roiStackedOverlap;
    this.mdl.rebuild();
    this.saveState();

    setTimeout(() => {
      if (this.widgetControlConfiguration.topRightInsetButton) {
        this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
      }
    }, 200);
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
        this.mdl.rebuild();
        this.saveState();
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
        this.saveState();
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
    this.saveState();
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

  onChangeXAxis(event: any): void {
    this.mdl.selectedMinXValue = event.minValue;
    this.mdl.selectedMaxXValue = event.maxValue;
    this.mdl.rebuild();
    this.saveState();
  }

  onAxisClick(): void {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.data = {
      axis: new RGBUAxisUnit(this.mdl.xAxisUnit.numeratorChannelIdx, this.mdl.xAxisUnit.denominatorChannelIdx),
      range: new MinMax(this.mdl.selectedMinXValue, this.mdl.selectedMaxXValue),
    };

    const dialogRef = this.dialog.open(RGBUAxisRatioPickerComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((result: RatioPickerData) => {
      if (result) {
        if (result.axis) {
          this.mdl.xAxisUnit = new RGBUAxisUnit(result.axis.numeratorChannelIdx, result.axis.denominatorChannelIdx);
        }
        if (result.range) {
          this.mdl.selectedMinXValue = result.range.min;
          this.mdl.selectedMaxXValue = result.range.max;
        }

        this.mdl.rebuild();
        this.saveState();
      }
    });
  }

  override getExportOptions(): WidgetExportDialogData {
    return this.exporter.getExportOptions(this.mdl, this.scanIdAssociatedWithImage, "Single Axis RGBU");
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

    if (request.length === 0) {
      this.isWidgetDataLoading = false;
    }

    combineLatest(request).subscribe({
      next: results => {
        const image = results[0] as RGBUImage;
        const rois: RegionSettings[] = [];
        for (let c = 1; c < results.length; c++) {
          rois.push(results[c] as RegionSettings);
        }

        // Now we can set this
        this.mdl.imageName = imagePath;
        this.scanIdAssociatedWithImage = getScanIdFromImagePath(imagePath);

        this.mdl.setData(image, rois);
        this.mdl.visibleRegionIds = roiIDs;
        this.errorMsg = "";
        this.isWidgetDataLoading = false;

        this.saveState();

        setTimeout(() => {
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
          }
        }, 200);
      },
      error: err => {
        this.isWidgetDataLoading = false;
        this.errorMsg = "Error loading image: " + err;
        console.error("Error loading image: ", err);
      },
    });
  }
}
