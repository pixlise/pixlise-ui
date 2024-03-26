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

import { Component, HostListener, OnInit, OnDestroy, ElementRef } from "@angular/core";
import { catchError, combineLatest, Observable, Subscription, switchMap, tap, throwError } from "rxjs";
import { RGBUImage } from "src/app/models/RGBUImage";

import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { SelectionService, SnackbarService, WidgetKeyItem } from "src/app/modules/pixlisecore/pixlisecore.module";
import { MinMax } from "src/app/models/BasicTypes";
import { RGBUMineralRatios } from "src/app/modules/scatterplots/widgets/rgbu-plot-widget/rgbu-plot-data";
import { selectMinerals } from "src/app/modules/scatterplots/base/mineral-selection";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { ScanImagePurpose } from "src/app/generated-protos/image";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import {
  ImagePickerDialogComponent,
  ImagePickerDialogData,
  ImagePickerDialogResponse,
} from "src/app/modules/pixlisecore/components/atoms/image-picker-dialog/image-picker-dialog.component";
import { RegionSettings } from "src/app/modules/roi/models/roi-region";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { ParallelogramWidgetState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { decodeIndexList, getScanIdFromImagePath } from "src/app/utils/utils";
import { Dimension, PCPAxis, RGBUPoint } from "src/app/modules/scatterplots/widgets/parallel-coordinates-plot-widget/parallel-coordinates-plot-model";
import { ScanItem } from "src/app/generated-protos/scan";
import { ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

@Component({
  selector: "app-parallel-coordinates-plot-widget",
  templateUrl: "./parallel-coordinates-plot-widget.component.html",
  styleUrls: ["./parallel-coordinates-plot-widget.component.scss"],
})
export class ParallelCoordinatesPlotWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _rgbuLoaded: RGBUImage | null = null;

  private _rois: RegionSettings[] = [];
  private _visibleROIs: string[] = [];
  private _data: RGBUPoint[] = [];

  public dimensions: Partial<Record<keyof RGBUPoint, Dimension>> = {};
  public axes: PCPAxis[] = [];
  public showLines: boolean = true;
  public showLabels: boolean = true;

  public keyShowing: boolean = false;
  public keyItems: WidgetKeyItem[] = [];

  public minerals: string[] = [];

  public scanIds: string[] = [];

  public scanConfigurations: Record<string, ScanConfiguration> = {};
  public configuredScans: ScanItem[] = [];

  public imageName: string = "";
  public scanIdAssociatedWithImage: string = "";

  purpose: ScanImagePurpose = ScanImagePurpose.SIP_MULTICHANNEL;

  isMiniWidth: boolean = false;

  constructor(
    private _elementRef: ElementRef,
    private _selectionService: SelectionService,
    private _endpointsService: APIEndpointsService,
    private _cachedDataService: APICachedDataService,
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackbarService: SnackbarService,
    public dialog: MatDialog
  ) {
    super();

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
        style: { "margin-top": "30px" },
      },
    };
  }

  ngOnInit(): void {
    this._initAxes();

    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const state = data as ParallelogramWidgetState;
        if (state && state.imageName) {
          this.axes.forEach(axis => (axis.visible = state.channels.includes(axis.key)));
          this.loadData(state.imageName, state.regions);
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe((sel: SelectionHistoryItem) => {
        this._prepareData();
        this.recalculateLines();
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        if (screenConfiguration && screenConfiguration.scanConfigurations) {
          this.scanIds = Object.entries(screenConfiguration.scanConfigurations).map(([scanId]) => scanId);
          this.scanConfigurations = screenConfiguration.scanConfigurations;

          this._prepareData();
          this.recalculateLines();
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        if (this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
        } else {
          this.configuredScans = scans;
        }
      })
    );

    this._prepareData();
    setTimeout(() => this.recalculateLines(), 50);
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

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  onImagePicker() {
    const dialogConfig = new MatDialogConfig<ImagePickerDialogData>();
    // Pass data to dialog
    dialogConfig.data = {
      scanIds: this.scanIds,
      defaultScanId: this.scanIdAssociatedWithImage,
      purpose: this.purpose,
      selectedImagePath: this.imageName || "",
      liveUpdate: false,
      selectedImageDetails: "",
    };

    const dialogRef = this.dialog.open(ImagePickerDialogComponent, dialogConfig);
    dialogRef.afterClosed().subscribe(({ selectedImagePath, selectedImageScanId }: ImagePickerDialogResponse) => {
      if (selectedImagePath) {
        this.onImageChanged(selectedImagePath);
        this.saveState();
      }
      if (selectedImageScanId) {
        this.scanIdAssociatedWithImage = selectedImageScanId;
      }
    });
  }

  get visibleROIs(): string[] {
    return this._visibleROIs;
  }

  set visibleROIs(value: string[]) {
    this._visibleROIs = value;
  }

  onImageChanged(imagePath: string) {
    if (this.imageName === imagePath) {
      //   // No change, stop here
      return;
    }

    this.loadData(imagePath, this.visibleROIs);
  }

  getFormattedValueAsPercentage(point: RGBUPoint, axis: PCPAxis): string {
    let percentage = axis.getValueAsPercentage(Number(point[axis.key]));
    return `${Math.round(percentage * 100)}%`;
  }

  private _initAxes(): void {
    this.axes = [
      new PCPAxis("r", "Red", true),
      new PCPAxis("g", "Green", true),
      new PCPAxis("b", "Blue", true),
      new PCPAxis("u", "Ultraviolet", true),
      new PCPAxis("rg", "Red/Green", false),
      new PCPAxis("rb", "Red/Blue", false),
      new PCPAxis("ru", "Red/Ultraviolet", false),
      new PCPAxis("gb", "Green/Blue", false),
      new PCPAxis("gu", "Green/Ultraviolet", false),
      new PCPAxis("bu", "Blue/Ultraviolet", false),
    ];

    let dimensions: Partial<Record<keyof RGBUPoint, Dimension>> = {};
    this.axes.forEach(axis => {
      dimensions[axis.key] = {
        title: axis.title,
        type: "number",
      };
    });

    this.dimensions = dimensions;
  }

  toggleAxis(axisKey: string): void {
    let axis = this.axes.find(axis => axis.key === axisKey);
    if (axis) {
      axis.visible = !axis.visible;
      setTimeout(() => this.recalculateLines(), 50);
      this.saveState();
    }
  }

  toggleAll(visible: boolean): void {
    this.axes.forEach(axis => (axis.visible = visible));
    setTimeout(() => this.recalculateLines(), 50);
    this.saveState();
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();
    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: false,
      scanId: this.scanIdAssociatedWithImage ? this.scanIdAssociatedWithImage : this.scanIds ? this.scanIds[0] : this._analysisLayoutService.defaultScanId,
      selectedIds: this.visibleROIs,
    };

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ROIPickerResponse) => {
      if (result) {
        this._visibleROIs = [];

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
          this.visibleROIs.push(...roiIds);
        }

        this.saveState();

        if (this._rgbuLoaded) {
          this.loadROIs(this.visibleROIs).subscribe({
            next: rois => {
              if (this._rgbuLoaded) {
                this.setData(this._rgbuLoaded, rois);
                this.saveState();
              } else {
                this.loadData(this.imageName, this.visibleROIs);
              }
            },
            error: err => {
              console.error("Error loading image: ", err);
            },
          });
        } else {
          this.loadData(this.imageName, this.visibleROIs);
        }
      }
    });
  }

  private saveState(): void {
    this.onSaveWidgetData.emit(
      ParallelogramWidgetState.create({
        regions: this._visibleROIs,
        channels: this.axes.filter(axis => axis.visible).map(axis => axis.key),
        imageName: this.imageName,
      })
    );
  }

  private getROIAveragePoint(points: Set<number>, color: string, name: string, fullDataset: boolean = false): RGBUPoint {
    let avgData = new RGBUPoint();
    avgData.name = name;
    avgData.color = color;

    if (!this._rgbuLoaded) {
      return avgData;
    }

    let rgbuImage = this._rgbuLoaded;
    let datasetLength = fullDataset ? rgbuImage.r.values.length : points.size;

    if ((!fullDataset && (!points || points.size <= 0)) || !rgbuImage || !rgbuImage.r || !rgbuImage.r.values) {
      return avgData;
    }

    if (fullDataset) {
      rgbuImage.r.values.forEach((red, i) => {
        let [green, blue, uv] = [rgbuImage.g.values[i], rgbuImage.b.values[i], rgbuImage.u.values[i]];
        avgData.r += red;
        avgData.g += green;
        avgData.b += blue;
        avgData.u += uv;
      });
    } else {
      points.forEach(i => {
        let [red, green, blue, uv] = [rgbuImage.r.values[i], rgbuImage.g.values[i], rgbuImage.b.values[i], rgbuImage.u.values[i]];
        avgData.r += red;
        avgData.g += green;
        avgData.b += blue;
        avgData.u += uv;
      });
    }

    avgData.r = avgData.r / datasetLength;
    avgData.g = avgData.g / datasetLength;
    avgData.b = avgData.b / datasetLength;
    avgData.u = avgData.u / datasetLength;

    if (avgData.g > 0) {
      avgData.rg = avgData.r / avgData.g;
    }
    if (avgData.b > 0) {
      avgData.rb = avgData.r / avgData.b;
      avgData.gb = avgData.g / avgData.b;
    }
    if (avgData.u > 0) {
      avgData.ru = avgData.r / avgData.u;
      avgData.gu = avgData.g / avgData.u;
      avgData.bu = avgData.b / avgData.u;
    }

    return avgData;
  }

  private _getCrossChannelMinMax(pointA: RGBUPoint, pointB: RGBUPoint, channels: Partial<keyof RGBUPoint>[], bufferPercent: number): MinMax {
    let minMax = new MinMax();
    channels.forEach(channel => {
      minMax.expand(Number(pointA[channel]));
      minMax.expand(Number(pointB[channel]));
    });

    if (minMax.min === null || minMax.max === null) {
      return minMax;
    }

    let buffer = (minMax.max - minMax.min) * bufferPercent;
    minMax.expandMin(minMax.min - buffer);
    minMax.expandMax(minMax.max + buffer);

    return minMax;
  }

  private _getMinPoint(pointA: RGBUPoint, pointB: RGBUPoint): RGBUPoint {
    let minPoint = new RGBUPoint();
    minPoint.r = Math.min(pointA.r, pointB.r);
    minPoint.g = Math.min(pointA.g, pointB.g);
    minPoint.b = Math.min(pointA.b, pointB.b);
    minPoint.u = Math.min(pointA.u, pointB.u);
    minPoint.rg = Math.min(pointA.rg, pointB.rg);
    minPoint.rb = Math.min(pointA.rb, pointB.rb);
    minPoint.ru = Math.min(pointA.ru, pointB.ru);
    minPoint.gb = Math.min(pointA.gb, pointB.gb);
    minPoint.gu = Math.min(pointA.gu, pointB.gu);
    minPoint.bu = Math.min(pointA.bu, pointB.bu);
    return minPoint;
  }

  private _getMaxPoint(pointA: RGBUPoint, pointB: RGBUPoint): RGBUPoint {
    let maxPoint = new RGBUPoint();
    maxPoint.r = Math.max(pointA.r, pointB.r);
    maxPoint.g = Math.max(pointA.g, pointB.g);
    maxPoint.b = Math.max(pointA.b, pointB.b);
    maxPoint.u = Math.max(pointA.u, pointB.u);
    maxPoint.rg = Math.max(pointA.rg, pointB.rg);
    maxPoint.rb = Math.max(pointA.rb, pointB.rb);
    maxPoint.ru = Math.max(pointA.ru, pointB.ru);
    maxPoint.gb = Math.max(pointA.gb, pointB.gb);
    maxPoint.gu = Math.max(pointA.gu, pointB.gu);
    maxPoint.bu = Math.max(pointA.bu, pointB.bu);
    return maxPoint;
  }

  get data(): RGBUPoint[] {
    return this._data;
  }

  toggleKey(): void {
    this.keyShowing = !this.keyShowing;
  }

  setData(image: RGBUImage, rois: RegionSettings[]): void {
    this._rgbuLoaded = image;
    this._rois = rois;

    this._prepareData();
    this.recalculateLines();
  }

  loadROIs(roiIds: string[]): Observable<RegionSettings[]> {
    let roiRequests = roiIds.map(roiId => this._roiService.getRegionSettings(roiId));
    return combineLatest(roiRequests);
  }

  loadData(imagePath: string, visibleROIs: string[]): void {
    this.isWidgetDataLoading = true;

    this._endpointsService
      .loadRGBUImageTIF(imagePath)
      .pipe(
        switchMap(image => {
          this.isWidgetDataLoading = false;
          this.imageName = imagePath;
          this.scanIdAssociatedWithImage = getScanIdFromImagePath(imagePath);
          this._rgbuLoaded = image;
          this.setData(image, []);

          return this.loadROIs(visibleROIs).pipe(
            tap(rois => {
              this.isWidgetDataLoading = false;
              this.imageName = imagePath;
              this.setData(image, rois);
              setTimeout(() => {
                if (this.widgetControlConfiguration.topRightInsetButton) {
                  this.widgetControlConfiguration.topRightInsetButton.value = this.keyItems;
                }
              }, 0);
            }),
            catchError(err => {
              this.isWidgetDataLoading = false;
              console.error("Error loading image: ", err);
              return throwError(() => new Error(err));
            })
          );
        }),
        catchError(err => {
          this.isWidgetDataLoading = false;
          console.error("Error loading image: ", err);
          return throwError(() => new Error(err));
        })
      )
      .subscribe({
        next: () => {},
        error: err => {
          console.error("Error loading data: ", err);
          this._rgbuLoaded = null;
          this._data = [];
          this.recalculateLines();
          this._snackbarService.openError("Error loading data", err);
        },
      });
  }

  private _prepareData(): void {
    if (!this._rgbuLoaded) {
      return;
    }

    // Make sure we're starting with a clean slate
    this._data = [];

    // Add the visible minerals
    this._data = this._data.concat(this.visibleMinerals);

    let currentSelection = this._selectionService.getCurrentSelection();
    let selectedPixels = new Set<number>();
    if (currentSelection.pixelSelection.imageName === this.imageName) {
      selectedPixels = currentSelection.pixelSelection.selectedPixels;
    }

    this.keyItems = [];

    let datasetColor = "255,255,255";
    let datasetName = "All Points";
    let loadedScan = this.configuredScans.find(scan => scan.id === this.scanIdAssociatedWithImage);
    if (loadedScan) {
      datasetName = `${loadedScan.title} (All Points)`;
    }

    let loadedScanConfiguration = this.scanConfigurations[this.scanIdAssociatedWithImage];
    if (loadedScanConfiguration) {
      if (loadedScanConfiguration.colour) {
        const match = loadedScanConfiguration.colour.match(/^rgba\((?<r>\d{1,3}),(?<g>\d{1,3}),(?<b>\d{1,3}),\d{1,3}\)$/);
        if (match !== null) {
          const { r, g, b } = match.groups!;
          const colorValues = `${r},${g},${b}`;
          datasetColor = colorValues;
        }
      }
    }

    let datasetAverages = this.getROIAveragePoint(new Set(), datasetColor, datasetName, true);
    datasetAverages.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID);
    this.keyItems.push(new WidgetKeyItem(PredefinedROIID.getAllPointsForScan(this.scanIdAssociatedWithImage), datasetName, `rgba(${datasetColor},255)`));
    this._data.push(datasetAverages);

    // Get averages for all selected pixels
    if (selectedPixels.size > 0) {
      let selectionColor = "110,239,255";
      let averageSelection = this.getROIAveragePoint(selectedPixels, selectionColor, "Selection");
      averageSelection.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID);
      this.keyItems.push(new WidgetKeyItem("SelectedPoints", "Selection", `rgba(${selectionColor},255)`));
      this._data.push(averageSelection);
    }

    // Get averages for all ROIs
    this._rois.forEach(roi => {
      let color = roi.displaySettings.colour;
      let colorStr = `${color.r},${color.g},${color.b}`;
      this.keyItems.push(new WidgetKeyItem(roi.region.id, roi.region.name, color));

      let pixels = new Set(decodeIndexList(roi.region.pixelIndexesEncoded));
      let averagePoint = this.getROIAveragePoint(pixels, colorStr, roi.region.name, false);
      averagePoint.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID);
      this._data.push(averagePoint);
    });

    let minPoint = new RGBUPoint();
    let maxPoint = new RGBUPoint();
    if (this._data.length > 0) {
      minPoint = this._data[0];
      maxPoint = this._data[0];
    }

    this._data.forEach(point => {
      minPoint = this._getMinPoint(minPoint, point);
      maxPoint = this._getMaxPoint(maxPoint, point);
    });

    let rgbuChannels: Partial<keyof RGBUPoint>[] = ["r", "g", "b", "u"] as any as Partial<keyof RGBUPoint>[];
    let ratioChannels: Partial<keyof RGBUPoint>[] = ["rg", "rb", "ru", "gb", "gu", "bu"] as any as Partial<keyof RGBUPoint>[];
    let crossRGBUMinMax = this._getCrossChannelMinMax(minPoint, maxPoint, rgbuChannels, 0.05);
    let crossRatioMinMax = this._getCrossChannelMinMax(minPoint, maxPoint, ratioChannels, 0.05);

    this.axes.forEach(axis => {
      if (rgbuChannels.includes(axis.key)) {
        axis.min = crossRGBUMinMax.min ?? 0;
        axis.max = crossRGBUMinMax.max ?? 0;
      } else {
        axis.min = crossRatioMinMax.min ?? 0;
        axis.max = crossRatioMinMax.max ?? 0;
      }
    });

    setTimeout(() => {
      if (this.widgetControlConfiguration.topRightInsetButton) {
        this.widgetControlConfiguration.topRightInsetButton.value = this.keyItems;
      }
    }, 0);
  }

  get miniMode(): boolean {
    return this.visibleAxes.length > 6 && this.isMiniWidth;
  }

  get plotID(): string {
    let widgetId = this._widgetId.replace(/[^a-zA-Z0-9_\-]/g, "_");
    return `parallel-coords-${widgetId}`;
  }

  get visibleAxes(): PCPAxis[] {
    return this.axes.filter(axis => axis.visible);
  }

  get visibleMinerals(): RGBUPoint[] {
    return this.minerals.map(mineralName => {
      let mineralIndex = RGBUMineralRatios.names.findIndex(mineral => mineral === mineralName);
      let rgbuValues = RGBUMineralRatios.ratioValues[mineralIndex];

      return new RGBUPoint(
        rgbuValues[0] * 255,
        rgbuValues[1] * 255,
        rgbuValues[2] * 255,
        rgbuValues[3] * 255,
        rgbuValues[0] / rgbuValues[1],
        rgbuValues[0] / rgbuValues[2],
        rgbuValues[0] / rgbuValues[3],
        rgbuValues[1] / rgbuValues[2],
        rgbuValues[1] / rgbuValues[3],
        rgbuValues[2] / rgbuValues[3],
        "234,58,238",
        mineralName
      );
    });
  }

  onMinerals(trigger: Element): void {
    selectMinerals(this.dialog, trigger, this.minerals, mineralsShown => {
      if (mineralsShown) {
        this.minerals = mineralsShown;
        this.saveState();
        this._prepareData();
        this.recalculateLines();
      }
    });
  }

  toggleLineVisibility(): void {
    this.showLines = !this.showLines;
    if (this.showLines) {
      this.recalculateLines();
    }
  }

  toggleLabelVisibility(): void {
    this.showLabels = !this.showLabels;
  }

  private recalculateLines(): void {
    let plotWidth = this._elementRef?.nativeElement?.offsetWidth || 0;
    this.isMiniWidth = plotWidth < 400;

    if (this.showLines) {
      this._data.forEach(point => {
        point.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID);
      });
    }
  }

  exportPlotData(): string {
    let axisNames = this.visibleAxes.map(axis => `"${axis.title.replace(/"/g, "'")}"`);
    let axisKeys = this.visibleAxes.map(axis => axis.key);
    let data = `"ROI",${axisNames.join(",")}\n`;
    this._data.forEach(rgbuPoint => {
      let row = [rgbuPoint.name, axisKeys.map(key => rgbuPoint[key])];
      data += `${row.join(",")}\n`;
    });

    return data;
  }

  //   onExport() {
  //     if (this._data) {
  //       let exportOptions = [new PlotExporterDialogOption("Plot Data .csv", true)];

  //       const dialogConfig = new MatDialogConfig();
  //       dialogConfig.data = new PlotExporterDialogData(
  //         `${this._datasetService.datasetLoaded.getId()} - Parallel Coords Plot`,
  //         "Export Parallel Coordinates Plot",
  //         exportOptions
  //       );

  //       const dialogRef = this.dialog.open(PlotExporterDialogComponent, dialogConfig);
  //       dialogRef.componentInstance.onConfirmOptions.subscribe((options: PlotExporterDialogOption[]) => {
  //         let optionLabels = options.map(option => option.label);
  //         let csvs: CSVExportItem[] = [];

  //         if (optionLabels.indexOf("Plot Data .csv") > -1) {
  //           // Export CSV
  //           csvs.push(new CSVExportItem("Parallel Coords Plot Data", this.exportPlotData()));
  //         }

  //         dialogRef.componentInstance.onDownload([], csvs);
  //       });

  //       return dialogRef.afterClosed();
  //     }
  //   }

  @HostListener("window:resize", ["$event"])
  onResize() {
    this.recalculateLines();
  }
}
