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
import { combineLatest, map, Observable, of, Subscription, switchMap } from "rxjs";
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
import { RegionSettings } from "src/app/modules/roi/models/roi-region";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { ParallelogramWidgetState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { decodeIndexList, getScanIdFromImagePath } from "src/app/utils/utils";
import {
  Dimension,
  PCPAxis,
  RGBUPoint,
  SIGMA_LEVEL,
  AVERAGE_MODE,
  PCPLine,
} from "src/app/modules/scatterplots/widgets/parallel-coordinates-plot-widget/parallel-coordinates-plot-model";
import { ScanItem } from "src/app/generated-protos/scan";
import { ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportFile,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";

@Component({
  selector: "app-parallel-coordinates-plot-widget",
  templateUrl: "./parallel-coordinates-plot-widget.component.html",
  styleUrls: ["./parallel-coordinates-plot-widget.component.scss"],
})
export class ParallelCoordinatesPlotWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _rois: RegionSettings[] = [];
  private _visibleROIs: string[] = [];
  private _data: RGBUPoint[] = [];

  public dimensions: Partial<Record<keyof RGBUPoint, Dimension>> = {};
  public axes: PCPAxis[] = [];
  public yScale: MinMax = new MinMax(0, 0);
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

  public xAxisWavelengthStart = 350;
  public xAxisWavelengthEnd = 790;
  public axisTickIntervals = 20;
  public axisTicks: { value: number; visible: boolean }[] = [];

  public _excludeZero: boolean = true;
  public _averageMode: AVERAGE_MODE = AVERAGE_MODE.MEAN;
  public _sigmaLevel: SIGMA_LEVEL = SIGMA_LEVEL.NONE;

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
        style: { "margin-top": "30px" },
        onUpdateKeyItems: (keyItems: WidgetKeyItem[]) => {
          this.keyItems = keyItems;
          this.keyItems.forEach(item => {
            this.data.forEach(dataItem => {
              if (dataItem.id === item.id) {
                dataItem.visible = item.isVisible;
              }
            });
          });
        },
      },
      bottomToolbar: [
        {
          id: "sigma-level",
          type: "multi-state-button",
          options: [SIGMA_LEVEL.NONE, SIGMA_LEVEL.ONE, SIGMA_LEVEL.TWO],
          tooltip: "Set the sigma level for the data",
          value: SIGMA_LEVEL.NONE,
          onClick: value => {
            this.sigmaLevel = value;

            let button = this._widgetControlConfiguration.bottomToolbar?.find(btn => btn.id === "sigma-level");
            if (button) {
              button.value = this.sigmaLevel;
            }

            this.recalculateLines();
            this.saveState();
          },
        },
        {
          id: "mean-median",
          type: "multi-state-button",
          tooltip: "Toggle between mean and median",
          value: AVERAGE_MODE.MEAN,
          options: [AVERAGE_MODE.MEAN, AVERAGE_MODE.MEDIAN],
          onClick: value => {
            this.averageMode = value;
            this.recalculateLines();
            this.saveState();
          },
        },
        {
          id: "exclude-zero",
          type: "toggle-button",
          tooltip: "Toggle exclude zero",
          title: "Exclude Zero",
          value: this.excludeZero,
          onClick: () => {
            this.excludeZero = !this.excludeZero;
            let button = this._widgetControlConfiguration.bottomToolbar?.find(btn => btn.id === "exclude-zero");
            if (button) {
              button.value = this.excludeZero;
            }
            this._prepareData();
            this.recalculateLines();
            this.saveState();
          },
        },
      ],
    };
  }

  ngOnInit(): void {
    this._initAxes();

    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const state = data as ParallelogramWidgetState;
        if (state) {
          this.axes.forEach(axis => (axis.visible = state.channels.includes(axis.key)));
          this.excludeZero = state.excludeZero;
          this.averageMode = (state.averageMode as AVERAGE_MODE) || AVERAGE_MODE.MEAN;
          this.sigmaLevel = (state.sigmaLevel as SIGMA_LEVEL) || SIGMA_LEVEL.NONE;
          this.loadData(state.regions);
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe((sel: SelectionHistoryItem) => {
        if (this.configuredScans.length > 0) {
          this._prepareData();
          this.recalculateLines();
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        if (screenConfiguration && screenConfiguration.scanConfigurations) {
          this.scanIds = Object.entries(screenConfiguration.scanConfigurations).map(([scanId]) => scanId);
          this.scanConfigurations = screenConfiguration.scanConfigurations;

          if (this._rois.length > 0 && this.configuredScans.length > 0) {
            this._prepareData();
            this.recalculateLines();
          }
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
        if (this._rois.length > 0) {
          this._prepareData();
          this.recalculateLines();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  generateAxisTicks(): void {
    this.axisTicks = [];
    for (let tickNm = this.xAxisWavelengthStart; tickNm <= this.xAxisWavelengthEnd; tickNm += this.axisTickIntervals) {
      this.axisTicks.push({ value: tickNm, visible: this.axisTicks.length % 5 === 0 });
    }
  }

  private setInitialConfig() {
    // If we don't have anything showing yet, just show the first one...
    if (!this._analysisLayoutService.defaultScanId && (!this.scanIds || this.scanIds.length === 0)) {
      return;
    }

    this.excludeZero = true;
    this.averageMode = AVERAGE_MODE.MEAN;
    this.sigmaLevel = SIGMA_LEVEL.NONE;

    const scanIds = this.scanIds && this.scanIds.length > 0 ? this.scanIds : [this._analysisLayoutService.defaultScanId];
    this._cachedDataService.getImageList(ImageListReq.create({ scanIds })).subscribe((resp: ImageListResp) => {
      let allPointsROI = PredefinedROIID.getAllPointsForScan(this._analysisLayoutService.defaultScanId);
      this.loadData([allPointsROI]);
    });
  }

  get excludeZero(): boolean {
    return this._excludeZero;
  }

  set excludeZero(value: boolean) {
    this._excludeZero = value;
    let excludeButton = this._widgetControlConfiguration.bottomToolbar?.find(btn => btn.id === "exclude-zero");
    if (excludeButton) {
      excludeButton.value = value;
    }
  }

  get averageMode(): AVERAGE_MODE {
    return this._averageMode;
  }

  set averageMode(value: AVERAGE_MODE) {
    this._averageMode = value;
    let meanMedianButton = this._widgetControlConfiguration.bottomToolbar?.find(btn => btn.id === "mean-median");
    if (meanMedianButton) {
      meanMedianButton.value = value;
    }
  }

  get sigmaLevel(): SIGMA_LEVEL {
    return this._sigmaLevel;
  }

  set sigmaLevel(value: SIGMA_LEVEL) {
    this._sigmaLevel = value;
    let sigmaButton = this._widgetControlConfiguration.bottomToolbar?.find(btn => btn.id === "sigma-level");
    if (sigmaButton) {
      sigmaButton.value = value;
    }
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  get visibleROIs(): string[] {
    return this._visibleROIs;
  }

  set visibleROIs(value: string[]) {
    this._visibleROIs = value;
  }

  getPolygonPoints(line: PCPLine): string {
    const y1 = Number(line.yStart) - line.widthStart;
    const y2 = Number(line.yStart) + line.widthStart;
    const y3 = Number(line.yEnd) + line.widthEnd;
    const y4 = Number(line.yEnd) - line.widthEnd;

    return `${line.xStart},${y1} ${line.xStart},${y2} ${line.xEnd},${y3} ${line.xEnd},${y4}`;
  }

  getValueOnPlot(point: RGBUPoint, axis: PCPAxis): number {
    if (!point || !axis || !this._elementRef) {
      return 0;
    }

    let plotContainer: Element = this._elementRef?.nativeElement?.querySelector(`.${this.plotID}`);
    let svgContainer = plotContainer.querySelector("svg");
    if (!svgContainer) {
      return 0;
    }

    let percentage = axis.getValueAsPercentage(Number(point[axis.key]));
    let plotHeight = svgContainer?.getBoundingClientRect().height;
    let yValue = Math.round(percentage * plotHeight) - 7;

    return yValue;
  }

  getFormattedValueAsPercentage(point: RGBUPoint, axis: PCPAxis): string {
    let percentage = axis.getValueAsPercentage(Number(point[axis.key]));
    return `${Math.round(percentage * 100)}%`;
  }

  getXAxisDistance(wavelength: number, axisIndex: number): number {
    let containerWidth = this._elementRef?.nativeElement?.querySelector(`.${this.plotID}`)?.clientWidth;
    let xAxisWavelengthRange = this.xAxisWavelengthEnd - this.xAxisWavelengthStart;

    if (!containerWidth || !xAxisWavelengthRange) {
      return 0;
    }

    if (wavelength === 0) {
      let firstZeroAxisWavelengthIndex = this.visibleAxes.findIndex(axis => axis.wavelength === 0);
      if (firstZeroAxisWavelengthIndex === -1) {
        return 0;
      }
      let offsetFromZero = axisIndex - firstZeroAxisWavelengthIndex;
      let lastDefinedAxisWavelength = this.visibleAxes[firstZeroAxisWavelengthIndex - 1]?.wavelength ?? 0;

      let xAxisWavelengthRemainingRange = this.xAxisWavelengthEnd - lastDefinedAxisWavelength;
      let axesRemaining = this.visibleAxes.length - axisIndex;

      let interpolatedWavelength = ((offsetFromZero + 1) / axesRemaining) * xAxisWavelengthRemainingRange + lastDefinedAxisWavelength;
      let distancePercent = (interpolatedWavelength - this.xAxisWavelengthStart) / xAxisWavelengthRange;

      return Math.round(distancePercent * 1000) / 10;
    }

    let xAxisWavelengthOffset = wavelength - this.xAxisWavelengthStart;

    let distancePercent = xAxisWavelengthOffset / xAxisWavelengthRange;

    return Math.round(distancePercent * 1000) / 10;
  }

  private _initAxes(): void {
    this.axes = [
      new PCPAxis("u", "Ultraviolet", "UV", 385, true),
      new PCPAxis("b", "Blue", "B", 450, true),
      new PCPAxis("g", "Green", "G", 530, true),
      new PCPAxis("r", "Red", "NIR", 735, true),
      new PCPAxis("rg", "Red/Green", "R/G", Math.round((735 / 530) * 100) / 100, false),
      new PCPAxis("rb", "Red/Blue", "R/B", Math.round((735 / 450) * 100) / 100, false),
      new PCPAxis("ru", "Red/Ultraviolet", "R/UV", Math.round((735 / 385) * 100) / 100, false),
      new PCPAxis("gb", "Green/Blue", "G/B", Math.round((530 / 450) * 100) / 100, false),
      new PCPAxis("gu", "Green/Ultraviolet", "G/UV", Math.round((530 / 385) * 100) / 100, false),
      new PCPAxis("bu", "Blue/Ultraviolet", "B/UV", Math.round((450 / 385) * 100) / 100, false),
    ].sort((a, b) => a.wavelength - b.wavelength);

    this.generateAxisTicks();

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
      this.recalculateBounds();
      setTimeout(() => this.recalculateLines(), 50);
      this.saveState();
    }
  }

  toggleAll(visible: boolean): void {
    this.axes.forEach(axis => (axis.visible = visible));
    this.recalculateBounds();
    setTimeout(() => this.recalculateLines(), 50);
    this.saveState();
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();
    let firstScanIdFromROIs = this._rois.length > 0 ? this._rois[0].region.scanId : "";
    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: false,
      scanId: firstScanIdFromROIs ? firstScanIdFromROIs : this.scanIds ? this.scanIds[0] : this._analysisLayoutService.defaultScanId,
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
        }

        // Now fill in the data source ids using the above
        for (const roiIds of roisPerScan.values()) {
          this.visibleROIs.push(...roiIds);
        }

        this.saveState();

        this.loadROIs(this.visibleROIs).subscribe({
          next: rois => {
            this._rois = rois;
            this._prepareData();
            this.recalculateLines();
            this.saveState();
          },
          error: err => {
            console.error("Error loading ROIs: ", err);
          },
        });
      }
    });
  }

  private saveState(): void {
    this.onSaveWidgetData.emit(
      ParallelogramWidgetState.create({
        regions: this._visibleROIs,
        channels: this.axes.filter(axis => axis.visible).map(axis => axis.key),
        excludeZero: this.excludeZero,
        averageMode: this.averageMode,
        sigmaLevel: this.sigmaLevel,
      })
    );
  }

  getLinePath(xStart: number | string, yStart: number | string, xEnd: number | string, yEnd: number | string): string {
    return `M ${xStart} ${yStart} L ${xEnd} ${yEnd}`;
  }

  getStrokeWidth(widthStart: number | string, widthEnd: number | string): string {
    return `${widthStart}px ${widthEnd}px`;
  }

  private _getChannelMedian(channel: Float32Array | number[]): number {
    let sorted = channel.filter(val => val > 0).sort((a, b) => a - b);
    let mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private getROIAveragePoint(
    points: Set<number>,
    color: string,
    name: string,
    fullDataset: boolean = false,
    scanId: string = "",
    imageName: string = ""
  ): Observable<RGBUPoint | null> {
    return this.loadRGBUImageForScan(scanId).pipe(
      switchMap(rgbuImage => {
        return of(this.calculateROIAveragePoint(rgbuImage, points, color, name, fullDataset, scanId, rgbuImage?.path || ""));
      })
    );
  }

  private calculateROIAveragePoint(
    rgbuImage: RGBUImage | null,
    points: Set<number>,
    color: string,
    name: string,
    fullDataset: boolean = false,
    scanId: string = "",
    imageName: string = ""
  ): RGBUPoint | null {
    let avgData = new RGBUPoint();
    avgData.name = name;
    avgData.color = color;
    avgData.scanId = scanId;
    avgData.imageName = imageName;

    if (!rgbuImage || !rgbuImage.r || !rgbuImage.r.values || !scanId || !imageName || (!fullDataset && (!points || points.size <= 0))) {
      return null;
    }

    let datasetLength = fullDataset ? rgbuImage.r.values.length : points.size;

    let redLength = datasetLength;
    let greenLength = datasetLength;
    let blueLength = datasetLength;
    let uvLength = datasetLength;

    let redValues: number[] = [];
    let greenValues: number[] = [];
    let blueValues: number[] = [];
    let uvValues: number[] = [];

    if (fullDataset) {
      redValues = !this.excludeZero ? (rgbuImage.r.values as any as number[]) : (rgbuImage.r.values.filter(val => val) as any as number[]);
      greenValues = !this.excludeZero ? (rgbuImage.g.values as any as number[]) : (rgbuImage.g.values.filter(val => val) as any as number[]);
      blueValues = !this.excludeZero ? (rgbuImage.b.values as any as number[]) : (rgbuImage.b.values.filter(val => val) as any as number[]);
      uvValues = !this.excludeZero ? (rgbuImage.u.values as any as number[]) : (rgbuImage.u.values.filter(val => val) as any as number[]);

      rgbuImage.r.values.forEach((red, i) => {
        let [green, blue, uv] = [rgbuImage.g.values[i], rgbuImage.b.values[i], rgbuImage.u.values[i]];
        avgData.rMean += red;
        avgData.gMean += green;
        avgData.bMean += blue;
        avgData.uMean += uv;

        if (this.excludeZero && red === 0) {
          redLength--;
        }

        if (this.excludeZero && green === 0) {
          greenLength--;
        }

        if (this.excludeZero && blue === 0) {
          blueLength--;
        }

        if (this.excludeZero && uv === 0) {
          uvLength--;
        }
      });

      avgData.rMedian = this._getChannelMedian(rgbuImage.r.values);
      avgData.gMedian = this._getChannelMedian(rgbuImage.g.values);
      avgData.bMedian = this._getChannelMedian(rgbuImage.b.values);
      avgData.uMedian = this._getChannelMedian(rgbuImage.u.values);
    } else {
      points.forEach(i => {
        let [red, green, blue, uv] = [rgbuImage.r.values[i], rgbuImage.g.values[i], rgbuImage.b.values[i], rgbuImage.u.values[i]];
        avgData.rMean += red;
        avgData.gMean += green;
        avgData.bMean += blue;
        avgData.uMean += uv;

        redValues.push(red);
        greenValues.push(green);
        blueValues.push(blue);
        uvValues.push(uv);
      });
      ["r", "g", "b", "u"].forEach(channel => {
        let values: number[] = [];
        points.forEach(i => {
          let pointValue = (rgbuImage as any)[channel].values[i];
          values.push(pointValue);
        });

        (avgData as any)[`${channel}Median`] = this._getChannelMedian(values);
      });
    }

    avgData.rMean = avgData.rMean / redLength;
    avgData.gMean = avgData.gMean / greenLength;
    avgData.bMean = avgData.bMean / blueLength;
    avgData.uMean = avgData.uMean / uvLength;

    if (this.averageMode === AVERAGE_MODE.MEAN) {
      avgData.r = avgData.rMean;
      avgData.g = avgData.gMean;
      avgData.b = avgData.bMean;
      avgData.u = avgData.uMean;
    } else {
      avgData.r = avgData.rMedian;
      avgData.g = avgData.gMedian;
      avgData.b = avgData.bMedian;
      avgData.u = avgData.uMedian;
    }

    // Calculate standard deviations
    avgData.rStdDev = this.calculateStandardDeviation(redValues, avgData.rMean);
    avgData.gStdDev = this.calculateStandardDeviation(greenValues, avgData.gMean);
    avgData.bStdDev = this.calculateStandardDeviation(blueValues, avgData.bMean);
    avgData.uStdDev = this.calculateStandardDeviation(uvValues, avgData.uMean);

    avgData.rSigma1 = avgData.rStdDev;
    avgData.rSigma2 = 2 * avgData.rStdDev;
    avgData.gSigma1 = avgData.gStdDev;
    avgData.gSigma2 = 2 * avgData.gStdDev;
    avgData.bSigma1 = avgData.bStdDev;
    avgData.bSigma2 = 2 * avgData.bStdDev;
    avgData.uSigma1 = avgData.uStdDev;
    avgData.uSigma2 = 2 * avgData.uStdDev;

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

  private calculateStandardDeviation(values: number[], mean: number): number {
    const variance = values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
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

  set data(value: RGBUPoint[]) {
    this._data = value;
  }

  toggleKey(): void {
    this.keyShowing = !this.keyShowing;
  }

  loadROIs(roiIds: string[]): Observable<RegionSettings[]> {
    let roiRequests = roiIds.map(roiId => this._roiService.getRegionSettings(roiId));
    return combineLatest(roiRequests);
  }

  loadRGBUImageForScan(scanId: string): Observable<RGBUImage | null> {
    return this._cachedDataService.getImageList(ImageListReq.create({ scanIds: [scanId] })).pipe(
      map((resp: ImageListResp) => {
        // Find MSA first, if not found, then find VIS, then find any TIF
        let rgbuImages = resp.images.filter(img => img.imagePath && img.purpose === ScanImagePurpose.SIP_MULTICHANNEL);
        let msaImages = rgbuImages.filter(img => img.imagePath.includes("MSA_"));
        if (msaImages.length > 0) {
          return msaImages[0].imagePath;
        } else {
          let visImages = rgbuImages.filter(img => img.imagePath.includes("VIS_"));
          if (visImages.length > 0) {
            return visImages[0].imagePath;
          } else {
            if (rgbuImages.length > 0) {
              return rgbuImages[0].imagePath;
            } else {
              return "";
            }
          }
        }
      }),
      switchMap(imagePath => (imagePath ? this._endpointsService.loadRGBUImageTIF(imagePath) : of(null)))
    );
  }

  loadData(visibleROIs: string[]): void {
    this.isWidgetDataLoading = visibleROIs.length > 0;
    if (visibleROIs.length === 0) {
      this.visibleROIs = [];
      this._rois = [];
      this._data = [];
      this.recalculateLines();
      return;
    }

    this.visibleROIs = visibleROIs;
    this.loadROIs(visibleROIs).subscribe({
      next: rois => {
        this._rois = rois;
        this.isWidgetDataLoading = false;
        if (this.configuredScans.length > 0) {
          this._prepareData();
          this.recalculateLines();
        }
      },
      error: err => {
        this.isWidgetDataLoading = false;
        console.error("Error loading data: ", err);
      },
    });
  }

  private _prepareData(): void {
    // Make sure we're starting with a clean slate
    this._data = [];

    // Add the visible minerals
    this._data = this._data.concat(this.visibleMinerals);

    let currentSelection = this._selectionService.getCurrentSelection();
    let selectedPixels = currentSelection.pixelSelection.selectedPixels;

    let previousKeyItems = this.keyItems.slice();
    this.keyItems = [];

    this.recalculateBounds();

    let roiAveragePointRequests = this._rois.map(roi => {
      if (this.visibleROIs.includes(roi.region.id)) {
        let color = roi.displaySettings.colour;
        let colorStr = `${color.r},${color.g},${color.b}`;

        let isAllPointsROI = PredefinedROIID.isAllPointsROI(roi.region.id);

        return this.getROIAveragePoint(
          isAllPointsROI ? new Set() : new Set(decodeIndexList(roi.region.pixelIndexesEncoded)),
          colorStr,
          isAllPointsROI ? "All Points" : roi.region.name,
          isAllPointsROI,
          roi.region.scanId,
          roi?.region?.imageName || ""
        );
      } else {
        return of(null);
      }
    });

    // Get averages for all selected pixels
    if (selectedPixels.size > 0 && currentSelection?.pixelSelection?.imageName) {
      let selectionColor = "110,239,255";
      let scanIdFromImageName = getScanIdFromImagePath(currentSelection.pixelSelection.imageName);
      let selectionDatasetName = scanIdFromImageName;
      let loadedScan = this.configuredScans.find(scan => scan.id === scanIdFromImageName);
      if (loadedScan) {
        selectionDatasetName = loadedScan.title;
      }

      let averageSelection = this.getROIAveragePoint(
        selectedPixels,
        selectionColor,
        `Selection`,
        false,
        scanIdFromImageName,
        currentSelection.pixelSelection.imageName
      );
      roiAveragePointRequests.push(averageSelection);
    }

    // Get averages for all ROIs
    combineLatest(roiAveragePointRequests).subscribe({
      next: responses => {
        this._data = [];
        this._data = this._data.concat(this.visibleMinerals);
        this.keyItems = [];

        responses.forEach((averagePoint, i) => {
          if (!averagePoint) {
            return;
          }

          let lineName = averagePoint.name;
          let scanId = averagePoint.scanId;
          let lineId = i < this._rois.length ? this._rois[i].region.id : PredefinedROIID.getSelectedPointsForScan(scanId);
          averagePoint.id = lineId;

          let existingKey = previousKeyItems.find(key => key.id && key.id == lineId);
          let isROIVisible = existingKey ? existingKey.isVisible : true;
          if (!isROIVisible) {
            if (existingKey) {
              this.keyItems.push(existingKey);
            }
          }

          let datasetName = scanId;
          let loadedScan = this.configuredScans.find(scan => scan.id === scanId);
          if (loadedScan) {
            datasetName = loadedScan.title;
          }

          if (isROIVisible) {
            this.keyItems.push(new WidgetKeyItem(lineId, lineName, `rgb(${averagePoint.color})`, null, undefined, datasetName, isROIVisible, false, true));
          }
          averagePoint.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID, this.sigmaLevel);
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

        this.yScale = crossRGBUMinMax;

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

        this.recalculateLines();
      },
    });
  }

  get miniMode(): boolean {
    return this.visibleAxes.length > 6 || this.isMiniWidth;
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

      let mineral = new RGBUPoint(
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
      mineral.id = mineralName;

      return mineral;
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

  private recalculateBounds(): void {
    // Recalc bounds based on visible wavelengths. Round to pretty numbers
    let maxVisibleWavelength = Math.ceil(this.visibleAxes.reduce((max, axis) => Math.max(max, axis.wavelength), 0) * 100) / 100;
    let minVisibleWavelength = Math.floor(this.visibleAxes.reduce((min, axis) => Math.min(min, axis.wavelength), Infinity) * 100) / 100;

    let axisTickIntervals = Math.round(((maxVisibleWavelength - minVisibleWavelength) / this.visibleAxes.length) * 1000) / 1000;
    this.axisTickIntervals = Math.round(Math.pow(10, Math.floor(Math.log10(axisTickIntervals))) * 1000) / 1000;

    this.xAxisWavelengthEnd = Math.ceil(Math.ceil(maxVisibleWavelength / this.axisTickIntervals + 1) * this.axisTickIntervals * 100) / 100;
    this.xAxisWavelengthStart = Math.floor(Math.floor(minVisibleWavelength / this.axisTickIntervals - 1) * this.axisTickIntervals * 100) / 100;

    this.generateAxisTicks();
  }

  private recalculateLines(): void {
    let plotWidth = this._elementRef?.nativeElement?.offsetWidth || 0;
    this.isMiniWidth = plotWidth < 400;

    if (this.showLines) {
      this._data.forEach(point => {
        if (this.averageMode === AVERAGE_MODE.MEAN) {
          point.r = point.rMean;
          point.g = point.gMean;
          point.b = point.bMean;
          point.u = point.uMean;
        } else {
          point.r = point.rMedian;
          point.g = point.gMedian;
          point.b = point.bMedian;
          point.u = point.uMedian;
        }
        let miniLines = point.calculateLinesForAxes(this.visibleAxes, this._elementRef, this.plotID, this.sigmaLevel);
        this.isMiniWidth = this.isMiniWidth || miniLines;
      });
    }
  }

  exportPlotData(): string {
    let axisNames: string[] = [];
    let axisKeys: Partial<keyof RGBUPoint>[] = [];
    this.visibleAxes.forEach(axis => {
      axisNames.push(`"${axis.title.replace(/"/g, "'")}"`);
      axisKeys.push(axis.key);
      // If we're showing sigma, add those as well
      if (this.sigmaLevel !== SIGMA_LEVEL.NONE) {
        axisNames.push(`"${axis.title.replace(/"/g, "'")} Std Dev"`);
        axisKeys.push(`${axis.key}Sigma1` as keyof RGBUPoint);
      }
    });

    let data = `"Scan Name", "Scan ID", "Image Name", "ROI",${axisNames.join(",")}\n`;
    this._data.forEach(rgbuPoint => {
      let scanName = this.configuredScans.find(scan => scan.id === rgbuPoint.scanId)?.title ?? "";
      let row = [scanName, rgbuPoint.scanId, rgbuPoint.imageName, rgbuPoint.name, axisKeys.map(key => rgbuPoint[key])];
      data += `${row.join(",")}\n`;
    });

    return data;
  }

  override getExportOptions(): WidgetExportDialogData {
    return {
      title: "Export Parallel Coordinates Plot",
      defaultZipName: `Parallel Coords Plot`,
      options: [],
      dataProducts: [
        {
          id: "plotData",
          name: "Plot Data .csv",
          type: "checkbox",
          description: "Export the data used to generate the plot",
          selected: true,
        },
      ],
      showPreview: false,
    };
  }

  override onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      let csvs: WidgetExportFile[] = [];
      if (request.dataProducts) {
        if (request.dataProducts["plotData"]?.selected) {
          csvs.push({
            fileName: `Plot Data.csv`,
            data: this.exportPlotData(),
          });
        }
      }

      observer.next({ csvs });
      observer.complete();
    });
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    this.recalculateLines();
  }
}
