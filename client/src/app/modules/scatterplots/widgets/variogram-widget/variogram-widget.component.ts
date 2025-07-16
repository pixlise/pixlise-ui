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

import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { catchError, combineLatest, forkJoin, map, Observable, of, shareReplay, Subject, Subscription, switchMap, take } from "rxjs";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { MinMax } from "src/app/models/BasicTypes";
import { distanceBetweenPoints, distanceSquaredBetweenPoints, Point } from "src/app/models/Geometry";
import { RGBA } from "src/app/utils/colours";
import { xor_sum } from "src/app/utils/utils";
import { VariogramDrawer } from "./drawer";
import { VariogramInteraction } from "./interaction";
import { VariogramModel } from "./model";
import { VariogramData, VariogramExportPoint, VariogramExportRawPoint, VariogramPoint, VariogramPointGroup, VariogramScanMetadata } from "./vario-data";
import { PanZoom } from "../../../widget/components/interactive-canvas/pan-zoom";
import { CanvasDrawer, CanvasDrawParameters, CanvasInteractionHandler } from "../../../widget/components/interactive-canvas/interactive-canvas.component";
import { SliderValue } from "../../../pixlisecore/components/atoms/slider/slider.component";
import {
  DataSourceParams,
  DataUnit,
  RegionDataResults,
  SelectionService,
  SnackbarService,
  WidgetDataService,
  WidgetKeyItem,
} from "../../../pixlisecore/pixlisecore.module";
import { BaseWidgetModel } from "../../../widget/models/base-widget.model";
import { AnalysisLayoutService } from "../../../analysis/analysis.module";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "../../../roi/components/roi-picker/roi-picker.component";
import { VariogramState, VisibleROI } from "../../../../generated-protos/widget-data";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "../../../expressions/components/expression-picker/expression-picker.component";
import { ROIService } from "../../../roi/services/roi.service";
import { ExpressionsService } from "../../../expressions/services/expressions.service";
import { DataExpression } from "../../../../generated-protos/expressions";
import { getExpressionShortDisplayName } from "../../../../expression-language/expression-short-name";
import { APICachedDataService } from "../../../pixlisecore/services/apicacheddata.service";
import { ScanBeamLocationsReq, ScanBeamLocationsResp } from "../../../../generated-protos/scan-beam-location-msgs";
import { ScanEntryReq, ScanEntryResp } from "../../../../generated-protos/scan-entry-msgs";
import { DetectorConfigReq, DetectorConfigResp } from "../../../../generated-protos/detector-config-msgs";
import { ImageBeamLocationsResp } from "../../../../generated-protos/image-beam-location-msgs";
import { ScanListReq, ScanListResp } from "../../../../generated-protos/scan-msgs";
import { ScanItem } from "../../../../generated-protos/scan";
import { ScanEntry } from "../../../../generated-protos/scan-entry";
import { Coordinate3D } from "../../../../generated-protos/scan-beam-location";
import { PredefinedROIID } from "../../../../models/RegionOfInterest";
import { DefaultExpressions } from "../../../analysis/services/analysis-layout.service";
import { ContextImageScanModelGenerator } from "../../../image-viewers/widgets/context-image/context-image-scan-model-generator";
import { BuiltInTags } from "../../../tags/models/tag.model";
import { WidgetExportData, WidgetExportDialogData, WidgetExportRequest } from "../../../widget/components/widget-export-dialog/widget-export-model";
import { VariogramChartExporter } from "./variogram-chart-exporter";

export type ScanLocation = {
  id: number;
  entry: ScanEntry;
  location: Coordinate3D | null;
};

@Component({
  selector: "app-variogram-widget",
  templateUrl: "./variogram-widget.component.html",
  styleUrls: ["./variogram-widget.component.scss"],
})
export class VariogramWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  @Input() widgetPosition: string = "";

  private _variogramModel: VariogramModel = new VariogramModel();

  private _subs = new Subscription();
  private _expressionIds: string[] = [];

  private _lastRunExpressionIds: string[] = [];
  private _lastRunTitle: string = "";
  private _lastRunFullTitle: string = "";

  private _binnedPointDataForExport: VariogramExportPoint[] = [];
  private _rawPointDataForExport: VariogramExportRawPoint[] = [];

  expressions: DataExpression[] = [];

  drawModeVector: boolean = false;

  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom();
  interaction: CanvasInteractionHandler;
  drawer: CanvasDrawer;
  exporter: VariogramChartExporter;

  keyItems: WidgetKeyItem[] = [];

  distanceSliderMin: number = 0;
  distanceSliderMax: number = 0;

  binSliderMin: number = 1;
  binSliderMax: number = 1;

  xorLeft: boolean = false;
  xorRight: boolean = false;

  activeDrawMode: string = "Vector";
  drawingModes: string[] = ["Isotropic", "Vector"];

  activeLeftCrossCombiningAlgorithm: string = "Subtract";
  activeRightCrossCombiningAlgorithm: string = "Subtract";
  crossCombiningAlgorithms: string[] = ["Subtract", "XOR-Sum", "Custom"];

  customLeftAlgorithm: DataExpression | null = null;
  customRightAlgorithm: DataExpression | null = null;

  scanLocations: Map<number, ScanLocation> = new Map<number, ScanLocation>();
  variogramMetadata: VariogramScanMetadata | null = null;

  liveUpdate: boolean = true;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    private _roiService: ROIService,
    private _expressionsService: ExpressionsService,
    private _cachedDataService: APICachedDataService,
    private _widgetDataService: WidgetDataService,
    private _snackService: SnackbarService,
    public dialog: MatDialog
  ) {
    super();

    this.interaction = new VariogramInteraction(this._variogramModel, this._selectionService);
    this.drawer = new VariogramDrawer(this._variogramModel);
    this.exporter = new VariogramChartExporter(this._snackService, this.drawer, this.transform);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "expressions",
          type: "button",
          title: "Elements",
          tooltip: "Choose regions to display",
          onClick: () => this.onExpressions(),
          settingTitle: "Elements",
          settingGroupTitle: "Data",
          settingIcon: "assets/button-icons/elements.svg",
        },
        {
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
          settingTitle: "Regions",
          settingGroupTitle: "Data",
          settingIcon: "assets/button-icons/roi.svg",
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
          onClick: () => this.onToggleSolo(),
          settingTitle: "Solo",
          settingGroupTitle: "Actions",
        },
        {
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export Data",
          onClick: () => this.onExportWidgetData.emit(),
          settingTitle: "Export / Download",
          settingGroupTitle: "Actions",
        },
      ],
      topRightInsetButton: {
        id: "key",
        type: "widget-key",
        style: { "margin-top": "24px" },
        value: this.keyItems,
        onClick: () => {
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.keyItems;
          }
        },
        onUpdateKeyItems: (keyItems: WidgetKeyItem[]) => {
          this.keyItems = keyItems;
          this.update();
        },
      },
    };
  }

  ngOnInit(): void {
    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const variogramData: VariogramState = data as VariogramState;

        if (variogramData) {
          if (variogramData.expressionIDs) {
            this._expressionIds = variogramData.expressionIDs;
          }

          if (variogramData.comparisonAlgorithms) {
            this.loadComparisonAlgorithms(variogramData.comparisonAlgorithms);
          }

          if (variogramData.liveUpdate !== undefined) {
            this.liveUpdate = variogramData.liveUpdate;
          }

          if (variogramData.visibleROIs) {
            this._variogramModel.visibleROIs = [];
            variogramData.visibleROIs.forEach(roi => {
              if (!roi.scanId) {
                return;
              }

              this._variogramModel.visibleROIs.push(roi);
            });
          }

          if (variogramData.varioModel) {
            this._variogramModel.varioModel = variogramData.varioModel;
          }

          this.distanceSliderMin = variogramData?.distanceSliderMin || 0;
          this.distanceSliderMax = variogramData?.distanceSliderMax || 0;
          this.binSliderMin = variogramData?.binSliderMin || 1;
          this.binSliderMax = variogramData?.binSliderMax || 1;

          if (variogramData.maxDistance) {
            this._variogramModel.maxDistance = variogramData.maxDistance;
          }

          if (variogramData.binCount) {
            this._variogramModel.binCount = variogramData.binCount;
          }

          if (variogramData.drawModeVector !== undefined) {
            this.drawModeVector = variogramData.drawModeVector;
          }

          if (variogramData.drawBestFit !== undefined) {
            this._variogramModel.drawBestFit = variogramData.drawBestFit;
          }

          this.setDrawMode(this.drawModeVector ? "Vector" : "Isotropic");
          this.rebuildScanModel().subscribe(metadata => {
            this.update();
          });
        } else {
          this.setInitialConfig();
          this.rebuildScanModel().subscribe(metadata => {
            this.update();
          });
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.expressionPickerResponse$.subscribe((result: ExpressionPickerResponse | null) => {
        if (!result || this._analysisLayoutService.highlightedWidgetId$.value !== this._widgetId) {
          return;
        }

        if (result.subId === "elements") {
          if (result && result.selectedExpressions?.length > 0) {
            this._expressionIds = result.selectedExpressions.map(expr => expr.id);
            if (this.liveUpdate) {
              this.saveAndUpdate();
            }
          }
        } else if (result.subId === "left-algorithm") {
          if (result.selectedExpressions.length > 0) {
            this.customLeftAlgorithm = result.selectedExpressions[0];
            if (this.liveUpdate) {
              this.saveAndUpdate();
            }
          }
        } else if (result.subId === "right-algorithm") {
          if (result.selectedExpressions.length > 0) {
            this.customRightAlgorithm = result.selectedExpressions[0];
            if (this.liveUpdate) {
              this.saveAndUpdate();
            }
          }
        }

        // Expression picker has closed, so we can stop highlighting this widget
        this._analysisLayoutService.highlightedWidgetId$.next("");
      })
    );

    this._subs.add(
      this._roiService.displaySettingsMap$.subscribe(displaySettings => {
        // Only update if we have the right expression count otherwise this will just trigger an error
        if (this._expressionIds.length > 0) {
          this.update();
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  setInitialConfig(): void {
    let scanId = this._analysisLayoutService.defaultScanId;
    let allPointsId = PredefinedROIID.getAllPointsForScan(scanId);
    this._analysisLayoutService.makeExpressionList(scanId, 1).subscribe((exprs: DefaultExpressions) => {
      this._expressionIds = exprs.exprIds;
      this._variogramModel.visibleROIs = [VisibleROI.create({ scanId, id: allPointsId })];
      this.update();
    });
  }

  onToggleSolo(): void {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  get cursorShown(): string {
    let cursor = "";
    if (this._variogramModel) {
      cursor = this._variogramModel.cursorShown;
    }
    return cursor;
  }

  get varioModelIsExponential(): boolean {
    return this._variogramModel.varioModel == VariogramModel.varioModelExponential;
  }

  get varioModelIsSpherical(): boolean {
    return this._variogramModel.varioModel == VariogramModel.varioModelSpherical;
  }

  get varioModelIsGaussian(): boolean {
    return this._variogramModel.varioModel == VariogramModel.varioModelGaussian;
  }

  onModelExponential(): void {
    this._variogramModel.varioModel = VariogramModel.varioModelExponential;
    this.saveAndUpdate();
  }

  onModelSpherical(): void {
    this._variogramModel.varioModel = VariogramModel.varioModelSpherical;
    this.saveAndUpdate();
  }

  onModelGaussian(): void {
    this._variogramModel.varioModel = VariogramModel.varioModelGaussian;
    this.saveAndUpdate();
  }

  get maxDistance(): number {
    return this._variogramModel.maxDistance;
  }

  get binNumber(): number {
    return this._variogramModel.binCount;
  }

  get bestFitLineShowing(): boolean {
    return this._variogramModel.drawBestFit;
  }

  toggleBestFitLine(): void {
    this._variogramModel.drawBestFit = !this._variogramModel.drawBestFit;
    if (this.liveUpdate) {
      this.saveAndUpdate();
    }
  }

  saveAndUpdate(): void {
    this.saveState();
    this.update();
  }

  onChangeDistance(event: SliderValue) {
    this._variogramModel.maxDistance = isNaN(event.value) ? event.value : Math.round(Number(event.value) * 100) / 100;

    if (this.liveUpdate) {
      this.update();
      if (event.finish) {
        this.saveState();
      }
    }
  }

  onChangeBins(event: SliderValue) {
    this._variogramModel.binCount = Math.floor(event.value);

    if (this.liveUpdate) {
      this.update();
      if (event.finish) {
        this.saveState();
      }
    }
  }

  onMaxDistanceInputChange(value: number) {
    this._variogramModel.maxDistance = isNaN(value) ? value : Math.round(Number(value) * 100) / 100;

    if (this.liveUpdate) {
      this.update();
      this.saveState();
    }
  }

  onBinNumberInputChange(value: number) {
    this._variogramModel.binCount = Math.floor(value);

    if (this.liveUpdate) {
      this.update();
      this.saveState();
    }
  }

  get errorMsg(): string {
    if (!this._variogramModel || !this._variogramModel.raw || !this._variogramModel.raw.errorMsg) {
      return "";
    }

    return "Citizen provided bad parameters: " + this._variogramModel.raw.errorMsg;
  }

  setDrawMode(mode: string): void {
    this.activeDrawMode = mode;
    this.setDrawModeVector(mode === "Vector");
  }

  setDrawModeVector(drawVector: boolean): void {
    this.drawModeVector = drawVector;

    if (this.liveUpdate) {
      this.saveAndUpdate();
    }
  }

  setActiveCrossCombiningAlgorithm(left: boolean, algorithm: string): void {
    if (left) {
      this.activeLeftCrossCombiningAlgorithm = algorithm;
    } else {
      this.activeRightCrossCombiningAlgorithm = algorithm;
    }

    if (algorithm === "Custom") {
      this.liveUpdate = false;
    }

    if (this.liveUpdate) {
      this.saveAndUpdate();
    }
  }

  private formComparisonAlgorithms(): string[] {
    let comparisonAlgorithms = [];
    if (this.activeLeftCrossCombiningAlgorithm === "Custom") {
      comparisonAlgorithms.push(this.customLeftAlgorithm?.id || "");
    } else {
      comparisonAlgorithms.push(this.activeLeftCrossCombiningAlgorithm);
    }

    if (this.activeRightCrossCombiningAlgorithm === "Custom") {
      comparisonAlgorithms.push(this.customRightAlgorithm?.id || "");
    } else {
      comparisonAlgorithms.push(this.activeRightCrossCombiningAlgorithm);
    }

    return comparisonAlgorithms;
  }

  private loadComparisonAlgorithms(comparisonAlgorithms: string[]): void {
    let leftAlgorithm = null;
    let rightAlgorithm = null;
    if (comparisonAlgorithms.length >= 1) {
      leftAlgorithm = comparisonAlgorithms[0];
    }

    if (comparisonAlgorithms.length >= 2) {
      rightAlgorithm = comparisonAlgorithms[1];
    }

    if (leftAlgorithm && !this.crossCombiningAlgorithms.includes(leftAlgorithm)) {
      // Algorithm is an expression ID, so we need to fetch it
      const expressionId = leftAlgorithm;
      this.activeLeftCrossCombiningAlgorithm = "Custom";

      this._expressionsService.fetchCachedExpression(expressionId).subscribe(expr => {
        if (expr?.expression) {
          this.customLeftAlgorithm = expr.expression;
        }
      });
    } else if (leftAlgorithm) {
      this.activeLeftCrossCombiningAlgorithm = leftAlgorithm;
    }

    if (rightAlgorithm && !this.crossCombiningAlgorithms.includes(rightAlgorithm)) {
      // Algorithm is an expression ID, so we need to fetch it
      const expressionId = rightAlgorithm;
      this.activeRightCrossCombiningAlgorithm = "Custom";

      this._expressionsService.fetchCachedExpression(expressionId).subscribe(expr => {
        if (expr?.expression) {
          this.customRightAlgorithm = expr.expression;
        }
      });
    } else if (rightAlgorithm) {
      this.activeRightCrossCombiningAlgorithm = rightAlgorithm;
    }
  }

  private saveState(): void {
    this.onSaveWidgetData.emit(
      VariogramState.create({
        expressionIDs: this._expressionIds,
        comparisonAlgorithms: this.formComparisonAlgorithms(),
        liveUpdate: this.liveUpdate,
        visibleROIs: this._variogramModel.visibleROIs,
        varioModel: this._variogramModel.varioModel,
        maxDistance: this._variogramModel.maxDistance,
        binCount: this._variogramModel.binCount,
        drawModeVector: this.drawModeVector,
        distanceSliderMin: this.distanceSliderMin,
        distanceSliderMax: this.distanceSliderMax,
        binSliderMin: this.binSliderMin,
        binSliderMax: this.binSliderMax,
        drawBestFit: this._variogramModel.drawBestFit,
      })
    );
  }

  // CanvasDrawer
  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): Observable<void> {
    if (this.drawer) {
      return this.drawer.draw(screenContext, drawParams);
    }
    return of(void 0);
  }

  onRegions(): void {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();
    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: false,
      scanId: this._analysisLayoutService.defaultScanId,
      selectedIds: this._variogramModel.visibleROIs.map(roi => roi.id),
    };

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ROIPickerResponse) => {
      if (result) {
        this._variogramModel.visibleROIs = [];

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
        for (const [scanId, roiIds] of roisPerScan.entries()) {
          roiIds.forEach(id => {
            this._variogramModel.visibleROIs.push(VisibleROI.create({ scanId, id }));
          });
        }

        if (this.liveUpdate) {
          this.saveAndUpdate();
        }
      }
    });
  }

  onCustomAlgorithm(left: boolean) {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;

    const selectedId = left ? this.customLeftAlgorithm?.id : this.customRightAlgorithm?.id;
    const selectedIds = selectedId ? [selectedId] : [];

    dialogConfig.data = {
      widgetId: this._widgetId,
      scanId: this._analysisLayoutService.defaultScanId,
      quantId: this._analysisLayoutService.getQuantIdForScan(this._analysisLayoutService.defaultScanId) || "",
      selectedIds,
      maxSelection: 1,
      enforceMaxSelectionWhileEditing: true,
      disableWidgetSwitching: true,
      subId: left ? "left-algorithm" : "right-algorithm",
      onlyShowItemsWithTag: [BuiltInTags.variogramComparisonAlgorithm],
    };

    this.isWidgetHighlighted = true;
    this.dialog.open(ExpressionPickerComponent, dialogConfig);
  }

  onExpressions(): void {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;
    dialogConfig.data = {
      widgetType: "variogram",
      widgetId: this._widgetId,
      scanId: this._analysisLayoutService.defaultScanId,
      quantId: this._analysisLayoutService.getQuantIdForScan(this._analysisLayoutService.defaultScanId) || "",
      selectedIds: this._expressionIds || [],
      subId: "elements",
    };

    this.isWidgetHighlighted = true;
    this.dialog.open(ExpressionPickerComponent, dialogConfig);
  }

  update(): void {
    this.updateAsync().subscribe();
  }

  updateAsync(shouldStoreBinnedDataForExport: boolean = false, shouldStoreRawDataForExport: boolean = false): Observable<void> {
    this.isWidgetDataLoading = true;
    const t0 = performance.now();

    const query: DataSourceParams[] = [];

    // Query each region for both expressions if we have any...
    if (this._expressionIds.length > 0) {
      for (const roi of this._variogramModel.visibleROIs) {
        for (const exprId of this._expressionIds) {
          const quantId = this._analysisLayoutService.getQuantIdForScan(roi.scanId) || "";
          query.push(new DataSourceParams(roi.scanId, exprId, quantId, roi.id));
        }
      }

      const allowAnyResponse = this.activeLeftCrossCombiningAlgorithm === "Custom" || this.activeRightCrossCombiningAlgorithm === "Custom";

      return this._widgetDataService.getData(query, allowAnyResponse).pipe(
        map(queryData => {
          this.processQueryResult(t0, queryData, shouldStoreBinnedDataForExport, shouldStoreRawDataForExport);
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.keyItems;
          }
        })
      );
    } else {
      return of(this.processQueryResult(t0, null));
    }
  }

  private checkChartDataCache(): Observable<{ found: boolean; cacheKey: string; varioPoints: VariogramPoint[][] }> {
    // If neither are custom, it's faster to just run
    if (this.activeLeftCrossCombiningAlgorithm !== "Custom" && this.activeRightCrossCombiningAlgorithm !== "Custom") {
      return of({ found: false, cacheKey: "", varioPoints: [] });
    }

    const expressionRequests$ = this._expressionIds.map(exprId => this._expressionsService.fetchCachedExpressionHash(exprId));
    const comparisonRequests$ = this.formComparisonAlgorithms().map(algorithm => {
      if (this.crossCombiningAlgorithms.includes(algorithm)) {
        return of(algorithm);
      } else {
        return this._expressionsService.fetchCachedExpressionHash(algorithm);
      }
    });

    return combineLatest([...expressionRequests$, ...comparisonRequests$]).pipe(
      switchMap(results => {
        const cacheKey = JSON.stringify({
          expressionHashes: results,
          visibleROIs: this._variogramModel.visibleROIs.map(roi => roi.id),
          minDistance: this._variogramModel.maxDistance,
          binCount: this._variogramModel.binCount,
        });

        return this._cachedDataService.getCachedVariogramPoints(cacheKey).pipe(
          map(data => {
            return { ...data, cacheKey };
          })
        );
      })
    );
  }

  private fetchVariogramPointsWithError(
    queryData: RegionDataResults | null,
    shouldStoreRawDataForExport: boolean = false
  ): Observable<{ errorStr: string; varioPoints: VariogramPoint[][] }> {
    let errorStr = "";

    return this.checkChartDataCache().pipe(
      switchMap(cache => {
        if (cache.found && !shouldStoreRawDataForExport) {
          return of({ errorStr, varioPoints: cache.varioPoints });
        }

        if (!this._variogramModel.binCount || this._variogramModel.binCount < this.binSliderMin) {
          errorStr = "Invalid bin count";
        } else {
          if (!queryData) {
            errorStr = "Invalid expressions or ROIs selected";
          } else {
            if (queryData.error) {
              errorStr = "Error: " + queryData.error;
            } else {
              const valsOnly: PMCDataValues[] = [];
              for (const result of queryData.queryResults) {
                if (result.values) {
                  valsOnly.push(result.values);
                } else {
                  errorStr = `Failed to get expression data for ${result.expression?.name || result.expression?.id || "expression"}`;
                  this._snackService.openError(errorStr);
                }
              }

              return this.calcAllVariogramPoints(valsOnly, shouldStoreRawDataForExport).pipe(
                map(varioPoints => {
                  if (varioPoints.length <= 0) {
                    errorStr = "Failed to get expression data";
                  }

                  if (errorStr.length <= 0 && varioPoints.length > 0 && cache.cacheKey) {
                    this._cachedDataService.cacheVariogramPoints(cache.cacheKey, varioPoints);
                  }
                  return { errorStr, varioPoints };
                }),
                catchError(err => {
                  errorStr = "Failed to get expression data: " + err?.message || err || "Unknown error";
                  return of({ errorStr, varioPoints: [] });
                })
              );
            }
          }
        }

        return of({ errorStr, varioPoints: [] });
      })
    );
  }

  private getExportableAlgorithmNames(): string {
    let leftAlgorithm = this._expressionIds.length > 0 ? this.activeLeftCrossCombiningAlgorithm : "";
    let rightAlgorithm = this._expressionIds.length > 1 ? this.activeRightCrossCombiningAlgorithm : "";

    if (leftAlgorithm === "Custom") {
      leftAlgorithm = this.customLeftAlgorithm?.name || "Custom";
    }

    if (rightAlgorithm === "Custom") {
      rightAlgorithm = this.customRightAlgorithm?.name || "Custom";
    }

    return [leftAlgorithm, rightAlgorithm].join(" / ");
  }

  private prepareDrawData(
    queryData: RegionDataResults | null,
    title: string = "",
    t0: number = 0,
    shouldStoreBinnedPointDataForExport: boolean = false,
    shouldStoreRawDataForExport: boolean = false,
    scanItems: ScanItem[] = []
  ): void {
    this.isWidgetDataLoading = true;
    this.fetchVariogramPointsWithError(queryData, shouldStoreRawDataForExport).subscribe({
      next: ({ errorStr, varioPoints }) => {
        // Decide what to draw
        const dispPoints: VariogramPointGroup[] = [];
        const dispMinMax = new MinMax();

        this._binnedPointDataForExport = [];

        const pointsForExport: VariogramExportPoint[] = [];
        const comparisonAlgorithm = this.getExportableAlgorithmNames();

        const previousKeyItems = this.keyItems.slice();
        this.keyItems = [];

        varioPoints.forEach((pts, i) => {
          const region = queryData?.queryResults[i].region;
          if (!region?.displaySettings.colour) {
            return;
          }

          const roiId = region.region.id;
          let roiName = region.region.name;
          if (PredefinedROIID.isAllPointsROI(roiId)) {
            roiName = "All Points";
          }

          const scanId = region.region.scanId;
          const scanName = scanItems.find(scan => scan.id == scanId)?.title || scanId;
          let isROIVisible = true;

          const existingROIKey = previousKeyItems.find(item => item.id === roiId);
          if (existingROIKey) {
            this.keyItems.push(existingROIKey);
            isROIVisible = existingROIKey.isVisible;
          } else {
            const keyItem = new WidgetKeyItem(roiId, roiName, region.displaySettings.colour, null, region.displaySettings.shape, scanName, true, true);
            this.keyItems.push(keyItem);
          }

          if (!isROIVisible) {
            return;
          }

          // Find the minmax
          const ptValueRange = new MinMax();
          for (const pt of pts) {
            if (pt.meanValue !== null) {
              ptValueRange.expand(pt.meanValue);

              if (shouldStoreBinnedPointDataForExport) {
                pointsForExport.push({
                  roiId,
                  roiName,
                  comparisonAlgorithm,
                  title: this._lastRunFullTitle,
                  distance: pt.distance,
                  meanValue: pt.meanValue,
                  sum: pt.sum,
                  count: pt.count,
                });
              }
            }
          }

          const ptGroup = new VariogramPointGroup(RGBA.fromWithA(region.displaySettings.colour, 1), region.displaySettings.shape, pts, ptValueRange, roiId);
          dispPoints.push(ptGroup);
          dispMinMax.expandByMinMax(ptValueRange);
        });

        if (shouldStoreBinnedPointDataForExport) {
          this._binnedPointDataForExport = pointsForExport;
        }

        if (errorStr.length > 0) {
          this.widgetErrorMessage = errorStr;
        } else {
          this.widgetErrorMessage = "";
        }

        // If previousKeyItems were sorted, sort the new ones following the layerOrder
        const sortedPointGroups = dispPoints.sort((a, b) => {
          const keyItemA = previousKeyItems.find(key => key.id == a.roiId);
          const keyItemB = previousKeyItems.find(key => key.id == b.roiId);

          if (keyItemA === undefined && keyItemB === undefined) {
            return 0;
          } else if (keyItemA === undefined) {
            return 1;
          } else if (keyItemB === undefined) {
            return -1;
          } else {
            return keyItemB.layerOrder - keyItemA.layerOrder;
          }
        });

        const variogramData: VariogramData = new VariogramData(title, sortedPointGroups, dispMinMax, errorStr);

        this.interaction = new VariogramInteraction(this._variogramModel, this._selectionService);
        this.drawer = new VariogramDrawer(this._variogramModel);

        this._variogramModel.raw = variogramData;

        const t1 = performance.now();
        this.needsDraw$.next();
        const t2 = performance.now();

        this.isWidgetDataLoading = false;
        console.log("  Variogram update took: " + (t1 - t0).toLocaleString() + "ms, needsDraw$ took: " + (t2 - t1).toLocaleString() + "ms");
      },
      error: err => {
        this.isWidgetDataLoading = false;
        this.widgetErrorMessage = "Failed to form points: " + err?.message || err || "Unknown error";
        this._snackService.openError(err);
      },
    });
  }

  private processQueryResult(
    t0: number,
    queryData: RegionDataResults | null,
    storeBinnedPointDataForExport: boolean = false,
    storeRawDataForExport: boolean = false
  ) {
    if (queryData && !queryData.hasQueryErrors() && this._expressionIds.length > 0) {
      this._analysisLayoutService.availableScans$.pipe(take(1)).subscribe(scanItems => {
        if (this._expressionIds.length !== this._lastRunExpressionIds.length || this._expressionIds.some((id, i) => id !== this._lastRunExpressionIds[i])) {
          this._lastRunExpressionIds = this._expressionIds;

          this.expressions = [];
          const expressionRequests = this._expressionIds.map(exprId => this._expressionsService.fetchCachedExpression(exprId));
          combineLatest(expressionRequests).subscribe(expressions => {
            let title = "";
            let fullTitle = "";
            for (const expr of expressions) {
              if (expr?.expression) {
                this.expressions.push(expr.expression);
                const displayName = getExpressionShortDisplayName(24, expr.expression.id, expr.expression.name);
                if (title.length > 0) {
                  title += " / ";
                  fullTitle += " / ";
                }
                title += displayName.shortName;
                fullTitle += displayName.name;
              }
            }

            this._lastRunTitle = title;
            this._lastRunFullTitle = fullTitle;
            this.prepareDrawData(queryData, title, t0, storeBinnedPointDataForExport, storeRawDataForExport, scanItems);
            this.isWidgetDataLoading = false;
          });
        } else {
          this.prepareDrawData(queryData, this._lastRunTitle, t0, storeBinnedPointDataForExport, storeRawDataForExport, scanItems);
          this.isWidgetDataLoading = false;
        }
      });
    } else {
      this.isWidgetDataLoading = false;
    }
  }

  private calcAllVariogramPoints(queryData: PMCDataValues[], shouldStoreRawDataForExport: boolean = false): Observable<VariogramPoint[][]> {
    if (this.scanLocations.size <= 0) {
      return of([]);
    }

    let minDist: number | null = null;
    let maxDist: number | null = null;

    const allPoints: (Point | null)[][] = [];
    queryData.forEach((data, index) => {
      const pts: (Point | null)[] = [];
      for (const val of data.values) {
        const scanLocation = this.scanLocations.get(val.pmc);
        if (!scanLocation || !scanLocation.location) {
          console.error("Failed to find scan location for PMC: " + val.pmc);
          pts.push(null);
          continue;
        }

        const pt = new Point(scanLocation.location.x, scanLocation.location.y);
        if (this.variogramMetadata?.beamUnitsInMeters) {
          pt.x *= 1000;
          pt.y *= 1000;
        }

        pts.push(pt);
      }

      const bounds = this.calcVariogramPointsDistanceBounds(pts);
      if (!minDist || bounds.minDist < minDist) {
        minDist = bounds.minDist;
      }

      if (!maxDist || bounds.maxDist > maxDist) {
        maxDist = bounds.maxDist;
      }

      allPoints.push(pts);
    });

    const distanceChanged = minDist !== this.distanceSliderMin || maxDist !== this.distanceSliderMax;

    this.distanceSliderMin = minDist || 0;
    this.distanceSliderMax = maxDist ?? 1;

    if (distanceChanged) {
      this._variogramModel.maxDistance = (this.distanceSliderMax - this.distanceSliderMin) / 2;
    }

    const crossVariogramPointsRequests: Observable<VariogramPoint[]>[] = [];
    this._rawPointDataForExport = [];
    for (let c = 0; c < queryData.length; c++) {
      const data = queryData[c];
      if (!data) {
        return of([]);
      }

      const pts: (Point | null)[] = allPoints[c];

      // If we're only showing 1 expression, we use that as elem 1+2, as we're drawing a Variogram
      // If we have 2 expressions, we use those as elem1, elem2 respectively, and drawing a Co-variogram
      let data2 = data;
      if (this._expressionIds.length > 1) {
        data2 = queryData[c + 1];
        c++; // consume the next one!
      }
      crossVariogramPointsRequests.push(this.calcCrossVariogramPoints(data, data2, pts, shouldStoreRawDataForExport));
    }
    return combineLatest(crossVariogramPointsRequests);
  }

  private crossCombiningFunction(left: boolean): ((currentValue1: any, comparisonValue1: any) => number) | null {
    const activeAlgorithm = left ? this.activeLeftCrossCombiningAlgorithm : this.activeRightCrossCombiningAlgorithm;

    if (activeAlgorithm === "XOR-Sum") {
      return xor_sum;
    } else if (activeAlgorithm === "Subtract") {
      return (currentValue1: any, comparisonValue1: any) => currentValue1 - comparisonValue1;
    } else if (activeAlgorithm === "Custom") {
      // We'll handle this externally
      return null;
    } else {
      console.warn(`Unknown algorithm "${activeAlgorithm}", returning 0 function`);
      return (currentValue1: any, comparisonValue1: any) => {
        return 0;
      };
    }
  }

  private runBulkCombiningFunction(left: boolean, values: any[][]): Observable<number[]> {
    const activeAlgorithm = left ? this.activeLeftCrossCombiningAlgorithm : this.activeRightCrossCombiningAlgorithm;

    if (activeAlgorithm !== "Custom") {
      return of(
        values.map(([v1, v2]) => {
          // If v1 and v2 are numbers, we can just pass them in
          const crossCombiningFunction = this.crossCombiningFunction(left);
          if (!isNaN(Number(v1)) && !isNaN(Number(v2)) && crossCombiningFunction) {
            return crossCombiningFunction(v1, v2);
          } else if (crossCombiningFunction && v1 && v2) {
            // Assume they are PMCDataValues
            return crossCombiningFunction(v1.value, v2.value);
          } else {
            return 0;
          }
        })
      );
    }

    const expr = left ? this.customLeftAlgorithm : this.customRightAlgorithm;
    if (!expr) {
      return of([]);
    }

    const query: DataSourceParams[] = [];
    const scanIdsFromROIS: Set<string> = new Set(this._variogramModel.visibleROIs.map(roi => roi.scanId));

    if (scanIdsFromROIS.size <= 0) {
      console.warn("No ROIs selected, custom algorithm not run");
      return of([]);
    } else if (scanIdsFromROIS.size > 1) {
      console.error("Multiple scans selected, not supported for custom algorithm");
      this._snackService.openError("Custom algorithms only supports ROIs from a single scan");
      return of([]);
    }

    const scanId = scanIdsFromROIS.values().next().value;
    if (!scanId) {
      console.error("No scan ID found, custom algorithm not run");
      return of([]);
    }

    const quantId = this._analysisLayoutService.getQuantIdForScan(scanId) || "";
    const allPointsId = PredefinedROIID.getAllPointsForScan(scanId);

    if (!quantId || !allPointsId) {
      console.error("No quant ID or all points ID found, custom algorithm not run");
      return of([]);
    }

    const injectedFunctions: Map<string, number[][]> = new Map<string, number[][]>([["getVariogramInputs", values]]);
    query.push(new DataSourceParams(scanId, expr.id, quantId, allPointsId, DataUnit.UNIT_DEFAULT, injectedFunctions));

    return this._widgetDataService.getData(query, true).pipe(
      take(1),
      map(queryData => {
        if (queryData.error || !queryData.queryResults || queryData.queryResults.length <= 0) {
          console.error("Failed to run custom algorithm: ", queryData.error);
          this._snackService.openError("Failed to run custom algorithm", queryData.error);
          return [];
        }

        let queryValues = queryData?.queryResults?.[0]?.values as any;
        if (!queryValues || queryData?.queryResults?.[0].error) {
          console.error("Failed to run custom algorithm: ", queryData?.queryResults?.[0]?.error);
          this._snackService.openError("Failed to run custom algorithm", queryData?.queryResults?.[0]?.error || "Unknown error");
          return [];
        }

        if (!Array.isArray(queryValues) && queryValues?.values) {
          queryValues = queryValues.values as any[];
        }

        if (queryValues.length !== values.length) {
          console.error(`Custom algorithm response length (${queryValues?.length}) doesn't match input length (${values?.length})`);
          this._snackService.openError(`Custom algorithm response length (${queryValues.length}) doesn't match input length (${values.length})`);
          return [];
        }

        if (!isNaN(Number(queryValues[0]))) {
          return queryValues as any[] as number[];
        } else {
          return queryValues.map((value: PMCDataValue) => value.value);
        }
      }),
      catchError(error => {
        console.error("Failed to run custom algorithm: ", error);
        this._snackService.openError("Failed to run custom algorithm", error?.message || error || "Unknown error");
        return of([]);
      })
    );
  }

  private calcVariogramPointsDistanceBounds(coords: (Point | null)[]): { minDist: number; maxDist: number } {
    let minDist: number = Number.MAX_VALUE;
    let maxDist = 0;

    for (let i = 0; i < coords.length; i++) {
      const coord1 = coords[i];
      if (!coord1) {
        continue;
      }

      for (let j = i + 1; j < coords.length; j++) {
        const coord2 = coords[j];
        if (!coord2) {
          continue;
        }

        const dist = distanceBetweenPoints(coord1, coord2);
        if (dist < minDist) {
          minDist = dist;
        }

        if (dist > maxDist) {
          maxDist = dist;
        }
      }
    }

    return { minDist, maxDist };
  }

  private calcCrossVariogramPoints(
    elem1: PMCDataValues,
    elem2: PMCDataValues,
    coords: (Point | null)[],
    shouldStoreRawDataForExport: boolean = false
  ): Observable<VariogramPoint[]> {
    const result: VariogramPoint[] = [];

    // For small datasets, we might need to adjust the maxDistance to ensure we get some data
    let effectiveMaxDistance = this._variogramModel.maxDistance;
    if (elem1.values.length <= 10) {
      // Calculate the maximum distance between any two points in this region
      let maxDistInRegion = 0;
      for (let i = 0; i < coords.length; i++) {
        for (let j = i + 1; j < coords.length; j++) {
          if (coords[i] && coords[j]) {
            const dist = distanceBetweenPoints(coords[i]!, coords[j]!);
            if (dist > maxDistInRegion) {
              maxDistInRegion = dist;
            }
          }
        }
      }

      // If the region's max distance is greater than our current maxDistance, use the region's max distance
      if (maxDistInRegion > effectiveMaxDistance) {
        effectiveMaxDistance = maxDistInRegion;
      }
    }

    const binWidth = effectiveMaxDistance / this._variogramModel.binCount;
    for (let c = 0; c < this._variogramModel.binCount; c++) {
      result.push(new VariogramPoint(binWidth * (c + 1), 0, 0, 0));
    }

    const maxDistSquared = effectiveMaxDistance * effectiveMaxDistance;

    const leftCombiningFunction = this.crossCombiningFunction(true);
    const rightCombiningFunction = this.crossCombiningFunction(false);

    const leftInputs: PMCDataValue[][] = [];
    const rightInputs: PMCDataValue[][] = [];
    const outputBinIndexes: number[] = [];

    for (let c = 0; c < elem1.values.length; c++) {
      if (elem1.values[c].pmc !== elem2.values[c].pmc) {
        console.error("calcCrossVariogramPoints failed, elem1 PMC order doesn't match elem2");
        return of([]);
      }

      const elem1Coord = coords[c];
      if (!elem1Coord) {
        continue;
      }

      const currentLeftValue = elem1.values[c].value;
      const currentRightValue = elem2.values[c].value;

      for (let i = c + 1; i < elem1.values.length; i++) {
        const elem2Coord = coords[i];
        if (!elem2Coord) {
          continue;
        }

        // Find distance between points
        const distSquared = distanceSquaredBetweenPoints(elem1Coord, elem2Coord);

        if (distSquared < maxDistSquared) {
          // Find the right bin
          const binIdx = Math.floor(Math.sqrt(distSquared) / binWidth);

          if (!leftCombiningFunction || !rightCombiningFunction || shouldStoreRawDataForExport) {
            // We're using a custom function, so we'll handle this externally
            leftInputs.push([elem1.values[c], elem1.values[i]]);
            rightInputs.push([elem2.values[c], elem2.values[i]]);
            outputBinIndexes.push(binIdx);
            continue;
          }

          const comparisonLeftValue = elem1.values[i].value;
          const comparisonRightValue = elem2.values[i].value;

          const lvalue = leftCombiningFunction(currentLeftValue, comparisonLeftValue);
          const rvalue = rightCombiningFunction(currentRightValue, comparisonRightValue);

          result[binIdx].sum += lvalue * rvalue;
          result[binIdx].count++;
        }
      }
    }

    if (!leftCombiningFunction || !rightCombiningFunction || shouldStoreRawDataForExport) {
      return forkJoin([this.runBulkCombiningFunction(true, leftInputs), this.runBulkCombiningFunction(false, rightInputs)]).pipe(
        map(([leftValues, rightValues]) => {
          const comparisonAlgorithmName = this.getExportableAlgorithmNames();
          for (let c = 0; c < leftValues.length; c++) {
            const binIdx = outputBinIndexes[c];
            result[binIdx].sum += leftValues[c] * rightValues[c];
            result[binIdx].count++;

            if (shouldStoreRawDataForExport) {
              this._rawPointDataForExport.push({
                currentPMC: leftInputs[c][0].pmc,
                comparingPMC: leftInputs[c][1].pmc,
                expressions: this._lastRunFullTitle,
                comparisonAlgorithms: comparisonAlgorithmName,
                firstExpressionComparisonValue: leftValues[c],
                secondExpressionComparisonValue: rightValues[c],
                combinedValue: leftValues[c] * rightValues[c],
                distance: result[binIdx].distance,
                binIdx,
              });
            }
          }

          for (let c = 0; c < result.length; c++) {
            if (result[c].count > 0) {
              result[c].meanValue = (0.5 * result[c].sum) / result[c].count;
            } else {
              result[c].meanValue = null;
            }
          }

          return result;
        })
      );
    } else {
      // Calculate all the means
      for (let c = 0; c < result.length; c++) {
        if (result[c].count > 0) {
          result[c].meanValue = (0.5 * result[c].sum) / result[c].count;
        } else {
          result[c].meanValue = null;
        }
      }

      return of(result);
    }
  }

  private buildScanModel(scanId: string): Observable<VariogramScanMetadata> {
    this.scanLocations.clear();

    // First request the scan summary so we have the detector to use
    return this._cachedDataService
      .getScanList(
        ScanListReq.create({
          searchFilters: { scanId },
        })
      )
      .pipe(
        switchMap((scanListResp: ScanListResp) => {
          if (!scanListResp.scans || scanListResp.scans.length <= 0) {
            throw new Error(`Failed to retrieve scan: ${scanId}`);
          }
          // Now that we know the scan's detector, we can request the rest of the stuff we want
          const requests = [
            this._cachedDataService.getScanBeamLocations(ScanBeamLocationsReq.create({ scanId })),
            this._cachedDataService.getScanEntry(ScanEntryReq.create({ scanId })),
            this._cachedDataService.getDetectorConfig(DetectorConfigReq.create({ id: scanListResp.scans[0].instrumentConfig })),
          ];

          return combineLatest(requests).pipe(
            map((results: (ScanBeamLocationsResp | ScanEntryResp | DetectorConfigResp | HTMLImageElement | ImageBeamLocationsResp)[]) => {
              const beamResp: ScanBeamLocationsResp = results[0] as ScanBeamLocationsResp;
              const scanEntryResp: ScanEntryResp = results[1] as ScanEntryResp;
              const detConfResp: DetectorConfigResp = results[2] as DetectorConfigResp;

              if (!scanListResp.scans || scanListResp.scans.length != 1 || !scanListResp.scans[0]) {
                throw new Error(`Failed to get scan summary for ${scanId}`);
              }

              if (!detConfResp.config) {
                throw new Error(`Failed to get detector config: ${scanListResp.scans[0].instrumentConfig}`);
              }

              this.scanLocations = new Map<number, ScanLocation>();
              scanEntryResp.entries.forEach((scanEntry, i) => {
                const beamLocation = beamResp.beamLocations[i] || null;
                this.scanLocations.set(scanEntry.id, {
                  id: scanEntry.id,
                  entry: scanEntry,
                  location: beamLocation,
                });
              });

              return this.generateScanMetadata(scanListResp.scans[0], scanEntryResp.entries, beamResp.beamLocations, detConfResp);
            })
          );
        })
      );
  }

  generateScanMetadata(scan: ScanItem, entries: ScanEntry[], beamLocations: Coordinate3D[], detConf: DetectorConfigResp): VariogramScanMetadata {
    const gen = new ContextImageScanModelGenerator();
    gen.processBeamData("", scan, entries, beamLocations, 0, null, detConf);
    const metadata = new VariogramScanMetadata(gen.minXYDistance_mm, gen.locationPointXSize, gen.locationPointYSize, gen.beamUnitsInMeters, gen.locationCount);
    return metadata;
  }

  rebuildScanModel(): Observable<VariogramScanMetadata> {
    return this.buildScanModel(this._analysisLayoutService.defaultScanId).pipe(
      map(metadata => {
        // If slider values were invalid, we reset it here to 1/2
        let valuesWereDefaults = false;
        if (this.distanceSliderMin === 0 && this.distanceSliderMax === 0 && this.binSliderMin === 1 && this.binSliderMax === 1) {
          valuesWereDefaults = true;
        }

        this.binSliderMax = metadata.locationCount;
        if (valuesWereDefaults || this._variogramModel.maxDistance > this.distanceSliderMax || this._variogramModel.maxDistance < this.distanceSliderMin) {
          // Start off with some reasonable defaults
          this._variogramModel.maxDistance = Math.round(((this.distanceSliderMin + this.distanceSliderMax) / 2) * 100) / 100;
          this._variogramModel.binCount = Math.floor((this.binSliderMin + this.binSliderMax) / 2);
        }

        this.variogramMetadata = metadata;
        return metadata;
      })
    );
  }

  override getExportOptions(): WidgetExportDialogData {
    return this.exporter.getExportOptions(this._variogramModel);
  }

  override onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
    const requestBinnedCSVData = request.dataProducts["binnedCSVData"]?.selected;
    const requestRawCSVData = request.dataProducts["rawCSVData"]?.selected;

    return this.updateAsync(requestBinnedCSVData, requestRawCSVData).pipe(
      switchMap(() => {
        return this.exporter.onExport(this._variogramModel, this._binnedPointDataForExport, this._rawPointDataForExport, request);
      })
    );
  }
}
