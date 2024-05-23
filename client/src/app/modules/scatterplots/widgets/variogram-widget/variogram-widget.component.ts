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

import { Component, Input, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { catchError, combineLatest, forkJoin, map, Observable, of, shareReplay, Subject, Subscription, switchMap } from "rxjs";
import { PMCDataValue, PMCDataValues } from "src/app/expression-language/data-values";
import { MinMax } from "src/app/models/BasicTypes";
import { distanceBetweenPoints, distanceSquaredBetweenPoints, Point } from "src/app/models/Geometry";
import { RGBA } from "src/app/utils/colours";
import { xor_sum } from "src/app/utils/utils";
import { VariogramDrawer } from "./drawer";
import { VariogramInteraction } from "./interaction";
import { VariogramModel } from "./model";
import { VariogramData, VariogramPoint, VariogramPointGroup, VariogramScanMetadata } from "./vario-data";
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
export class VariogramWidgetComponent extends BaseWidgetModel implements OnInit {
  @Input() widgetPosition: string = "";

  private _variogramModel: VariogramModel = new VariogramModel();

  private _subs = new Subscription();
  private _expressionIds: string[] = [];

  private _lastRunExpressionIds: string[] = [];

  expressions: DataExpression[] = [];

  drawModeVector: boolean = false;

  needsDraw$: Subject<void> = new Subject<void>();

  transform: PanZoom = new PanZoom();
  interaction: CanvasInteractionHandler;
  drawer: CanvasDrawer;

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

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "expressions",
          type: "button",
          title: "Elements",
          tooltip: "Choose regions to display",
          onClick: () => this.onExpressions(),
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
          onClick: () => this.onToggleSolo(),
        },
      ],
      topRightInsetButton: {
        id: "key",
        type: "widget-key",
        value: this.keyItems,
        onClick: () => {
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.keyItems;
          }
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

          if (variogramData.maxDistance) {
            this._variogramModel.maxDistance = variogramData.maxDistance;
          }

          if (variogramData.binCount) {
            this._variogramModel.binCount = variogramData.binCount;
          }

          if (variogramData.drawModeVector !== undefined) {
            this.drawModeVector = variogramData.drawModeVector;
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

  setInitialConfig(): void {
    let scanId = this._analysisLayoutService.defaultScanId;
    let allPointsId = PredefinedROIID.getAllPointsForScan(scanId);
    this._analysisLayoutService.makeExpressionList(scanId, 1).subscribe((exprs: DefaultExpressions) => {
      this._expressionIds = exprs.exprIds;
      this._variogramModel.visibleROIs = [VisibleROI.create({ scanId, id: allPointsId })];
      this.update();
    });
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
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
    this.update();
  }

  onModelSpherical(): void {
    this._variogramModel.varioModel = VariogramModel.varioModelSpherical;
    this.update();
  }

  onModelGaussian(): void {
    this._variogramModel.varioModel = VariogramModel.varioModelGaussian;
    this.update();
  }

  get maxDistance(): number {
    return this._variogramModel.maxDistance;
  }

  get binNumber(): number {
    return this._variogramModel.binCount;
  }

  saveAndUpdate(): void {
    this.saveState();
    this.update();
  }

  onChangeDistance(event: SliderValue) {
    this._variogramModel.maxDistance = event.value;

    if (this.liveUpdate) {
      this.update();
    }
    // if (event.finish) {
    //   if (!this.liveUpdate) {
    //     this.update();
    //   }

    //   this.saveState();
    // }
  }

  onChangeBins(event: SliderValue) {
    this._variogramModel.binCount = Math.floor(event.value);

    if (this.liveUpdate) {
      this.update();
    }
    // if (event.finish) {
    //   if (!this.liveUpdate) {
    //     this.update();
    //   }
    //   this.saveState();
    // }
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

    this.setCombiningAlgorithm(algorithm === "XOR-Sum", left);
  }

  setCombiningAlgorithm(xor: boolean, left: boolean): void {
    if (left) {
      this.xorLeft = xor;
    } else {
      this.xorRight = xor;
    }

    if (this.liveUpdate) {
      this.saveAndUpdate();
    }
  }

  private saveState(): void {
    this.onSaveWidgetData.emit(
      VariogramState.create({
        expressionIDs: this._expressionIds,
        visibleROIs: this._variogramModel.visibleROIs,
        varioModel: this._variogramModel.varioModel,
        maxDistance: this._variogramModel.maxDistance,
        binCount: this._variogramModel.binCount,
        drawModeVector: this.drawModeVector,
      })
    );
  }

  // CanvasDrawer
  draw(screenContext: CanvasRenderingContext2D, drawParams: CanvasDrawParameters): void {
    if (this.drawer) {
      this.drawer.draw(screenContext, drawParams);
    }
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

    let selectedId = left ? this.customLeftAlgorithm?.id : this.customRightAlgorithm?.id;
    let selectedIds = selectedId ? [selectedId] : [];

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
    // Get the slider bounds, these are dataset dependent
    let t0 = performance.now();

    // Use widget data service to rebuild our data model
    let query: DataSourceParams[] = [];

    // Query each region for both expressions if we have any...
    if (this._expressionIds.length > 0) {
      for (let roi of this._variogramModel.visibleROIs) {
        for (let exprId of this._expressionIds) {
          let quantId = this._analysisLayoutService.getQuantIdForScan(roi.scanId) || "";
          query.push(new DataSourceParams(roi.scanId, exprId, quantId, roi.id));
        }
      }

      let allowAnyResponse = this.activeLeftCrossCombiningAlgorithm === "Custom" || this.activeRightCrossCombiningAlgorithm === "Custom";

      this._widgetDataService.getData(query, allowAnyResponse).subscribe(queryData => {
        this.processQueryResult(t0, queryData);
      });
    } else {
      this.processQueryResult(t0, null);
    }
  }

  private fetchVariogramPointsWithError(queryData: RegionDataResults | null): Observable<{ errorStr: string; varioPoints: VariogramPoint[][] }> {
    let errorStr = "";

    if (!this._variogramModel.binCount || this._variogramModel.binCount < this.binSliderMin) {
      errorStr = "Invalid bin count";
    } else {
      if (!queryData) {
        errorStr = "Invalid expressions or ROIs selected";
      } else {
        if (queryData.error) {
          errorStr = "Error: " + queryData.error;
        } else {
          let valsOnly: PMCDataValues[] = [];
          for (let result of queryData.queryResults) {
            if (result.values) {
              valsOnly.push(result.values);
            } else {
              errorStr = `Failed to get expression data for ${result.expression?.name || result.expression?.id || "expression"}`;
              this._snackService.openError(errorStr);
            }
          }

          return this.calcAllVariogramPoints(valsOnly).pipe(
            map(varioPoints => {
              if (varioPoints.length <= 0) {
                errorStr = "Failed to get expression data";
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
  }

  private prepareDrawData(queryData: RegionDataResults | null, title: string = "", t0: number = 0): void {
    this.isWidgetDataLoading = true;
    this.fetchVariogramPointsWithError(queryData).subscribe({
      next: ({ errorStr, varioPoints }) => {
        // Decide what to draw
        let dispPoints: VariogramPointGroup[] = [];
        let dispMinMax = new MinMax();
        let queryIdx = 0;
        for (let pts of varioPoints) {
          let region = queryData?.queryResults[queryIdx].region;
          if (!region?.displaySettings.colour) {
            continue;
          }

          // Find the minmax
          let ptValueRange = new MinMax();
          for (let pt of pts) {
            if (pt.meanValue !== null) {
              ptValueRange.expand(pt.meanValue);
            }
          }

          let ptGroup = new VariogramPointGroup(RGBA.fromWithA(region.displaySettings.colour, 1), region.displaySettings.shape, pts, ptValueRange);
          dispPoints.push(ptGroup);
          dispMinMax.expandByMinMax(ptValueRange);

          queryIdx++;
        }

        if (errorStr.length > 0) {
          this.widgetErrorMessage = errorStr;
        } else {
          this.widgetErrorMessage = "";
        }

        let variogramData: VariogramData = new VariogramData(title, dispPoints, dispMinMax, errorStr);

        this.interaction = new VariogramInteraction(this._variogramModel, this._selectionService);
        this.drawer = new VariogramDrawer(this._variogramModel);

        this._variogramModel.raw = variogramData;

        let t1 = performance.now();
        this.needsDraw$.next();
        let t2 = performance.now();

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

  private processQueryResult(t0: number, queryData: RegionDataResults | null) {
    let title = "";
    if (queryData && !queryData.hasQueryErrors() && this._expressionIds.length > 0) {
      if (this._expressionIds.length !== this._lastRunExpressionIds.length || this._expressionIds.some((id, i) => id !== this._lastRunExpressionIds[i])) {
        this._lastRunExpressionIds = this._expressionIds;

        this.expressions = [];
        let expressionRequests = this._expressionIds.map(exprId => this._expressionsService.fetchCachedExpression(exprId));
        combineLatest(expressionRequests).subscribe(expressions => {
          for (let expr of expressions) {
            if (expr?.expression) {
              this.expressions.push(expr.expression);
              let label = getExpressionShortDisplayName(12, expr.expression.id, expr.expression.name).shortName;
              if (title.length > 0) {
                title += " / ";
              }
              title += label;
            }
          }

          this.prepareDrawData(queryData, title, t0);
        });
      } else {
        this.prepareDrawData(queryData, title, t0);
      }
    }
  }

  private calcAllVariogramPoints(queryData: PMCDataValues[]): Observable<VariogramPoint[][]> {
    if (this.scanLocations.size <= 0) {
      return of([]);
    }

    let minDist: number | null = null;
    let maxDist: number | null = null;

    let allPoints: (Point | null)[][] = [];
    queryData.forEach(data => {
      let pts: (Point | null)[] = [];
      for (let val of data.values) {
        let scanLocation = this.scanLocations.get(val.pmc);
        if (!scanLocation || !scanLocation.location) {
          console.error("Failed to find scan location for PMC: " + val.pmc);
          pts.push(null);
          continue;
        }

        let pt = new Point(scanLocation.location.x, scanLocation.location.y);
        if (this.variogramMetadata?.beamUnitsInMeters) {
          pt.x *= 1000;
          pt.y *= 1000;
        }

        pts.push(pt);
      }

      let bounds = this.calcVariogramPointsDistanceBounds(pts);
      if (!minDist || bounds.minDist < minDist) {
        minDist = bounds.minDist;
      }

      if (!maxDist || bounds.maxDist > maxDist) {
        maxDist = bounds.maxDist;
      }

      allPoints.push(pts);
    });

    let distanceChanged = minDist !== this.distanceSliderMin || maxDist !== this.distanceSliderMax;

    this.distanceSliderMin = minDist || 0;
    this.distanceSliderMax = maxDist ?? 1;

    if (distanceChanged) {
      this._variogramModel.maxDistance = (this.distanceSliderMax - this.distanceSliderMin) / 2;
    }

    let crossVariogramPointsRequests: Observable<VariogramPoint[]>[] = [];
    for (let c = 0; c < queryData.length; c++) {
      const data = queryData[c];
      if (!data) {
        return of([]);
      }

      let pts: (Point | null)[] = allPoints[c];

      // If we're only showing 1 expression, we use that as elem 1+2, as we're drawing a Variogram
      // If we have 2 expressions, we use those as elem1, elem2 respectively, and drawing a Co-variogram
      let data2 = data;
      if (this._expressionIds.length > 1) {
        data2 = queryData[c + 1];
        c++; // consume the next one!
      }
      crossVariogramPointsRequests.push(this.calcCrossVariogramPoints(data, data2, pts));
    }

    return combineLatest(crossVariogramPointsRequests);
  }

  private crossCombiningFunction(left: boolean): ((currentValue1: any, comparisonValue1: any) => number) | null {
    let activeAlgorithm = left ? this.activeLeftCrossCombiningAlgorithm : this.activeRightCrossCombiningAlgorithm;

    if (activeAlgorithm === "XOR-Sum") {
      return xor_sum;
    } else if (activeAlgorithm === "Subtract") {
      return (currentValue1: any, comparisonValue1: any) => currentValue1 - comparisonValue1;
    } else if (activeAlgorithm === "Custom") {
      // We'll handle this externally
      return null;
    } else {
      return (currentValue1: any, comparisonValue1: any) => {
        return 0;
      };
    }
  }

  private runBulkCombiningFunction(left: boolean, values: any[][]): Observable<number[]> {
    let activeAlgorithm = left ? this.activeLeftCrossCombiningAlgorithm : this.activeRightCrossCombiningAlgorithm;
    if (activeAlgorithm !== "Custom") {
      return of(
        values.map(([v1, v2]) => {
          // If v1 and v2 are numbers, we can just pass them in
          if (!isNaN(Number(v1)) && !isNaN(Number(v2))) {
            return this.crossCombiningFunction(left)!(v1, v2);
          } else {
            // Assume they are PMCDataValues
            return this.crossCombiningFunction(left)!(v1.value, v2.value);
          }
        })
      );
    }

    let expr = left ? this.customLeftAlgorithm : this.customRightAlgorithm;
    if (!expr) {
      return of([]);
    }

    let query: DataSourceParams[] = [];
    let scanIdsFromROIS: Set<string> = new Set(this._variogramModel.visibleROIs.map(roi => roi.scanId));
    if (scanIdsFromROIS.size <= 0) {
      console.warn("No ROIs selected, custom algorithm not run");
      return of([]);
    } else if (scanIdsFromROIS.size > 1) {
      console.error("Multiple scans selected, not supported for custom algorithm");
      this._snackService.openError("Custom algorithms only supports ROIs from a single scan");
      return of([]);
    }

    let scanId = scanIdsFromROIS.values().next().value;

    let quantId = this._analysisLayoutService.getQuantIdForScan(scanId) || "";
    let allPointsId = PredefinedROIID.getAllPointsForScan(scanId);

    let injectedFunctions: Map<string, number[][]> = new Map<string, number[][]>([["getVariogramInputs", values]]);
    query.push(new DataSourceParams(scanId, expr.id, quantId, allPointsId, DataUnit.UNIT_DEFAULT, injectedFunctions));
    return this._widgetDataService.getData(query, true).pipe(
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
      })
    );
  }

  private calcVariogramPointsDistanceBounds(coords: (Point | null)[]): { minDist: number; maxDist: number } {
    let minDist: number = Number.MAX_VALUE;
    let maxDist = 0;

    for (let i = 0; i < coords.length; i++) {
      let coord1 = coords[i];
      if (!coord1) {
        continue;
      }

      for (let j = i + 1; j < coords.length; j++) {
        let coord2 = coords[j];
        if (!coord2) {
          continue;
        }

        let dist = distanceBetweenPoints(coord1, coord2);
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

  private calcCrossVariogramPoints(elem1: PMCDataValues, elem2: PMCDataValues, coords: (Point | null)[]): Observable<VariogramPoint[]> {
    let result: VariogramPoint[] = [];

    const binWidth = this._variogramModel.maxDistance / this._variogramModel.binCount;
    for (let c = 0; c < this._variogramModel.binCount; c++) {
      result.push(new VariogramPoint(binWidth * (c + 1), 0, 0, 0));
    }

    let maxDistSquared = this._variogramModel.maxDistance * this._variogramModel.maxDistance;

    let leftCombiningFunction = this.crossCombiningFunction(true);
    let rightCombiningFunction = this.crossCombiningFunction(false);

    let leftInputs: PMCDataValue[][] = [];
    let rightInputs: PMCDataValue[][] = [];
    let outputBinIndexes: number[] = [];
    for (let c = 0; c < elem1.values.length; c++) {
      if (elem1.values[c].pmc !== elem2.values[c].pmc) {
        console.error("calcCrossVariogramPoints failed, elem1 PMC order doesn't match elem2");
        return of([]);
      }

      let elem1Coord = coords[c];
      if (!elem1Coord) {
        continue;
      }

      let currentLeftValue = elem1.values[c].value;
      let currentRightValue = elem2.values[c].value;

      for (let i = c + 1; i < elem1.values.length; i++) {
        let elem2Coord = coords[i];
        if (!elem2Coord) {
          continue;
        }

        // Find distance between points
        let distSquared = distanceSquaredBetweenPoints(elem1Coord, elem2Coord);

        if (distSquared < maxDistSquared) {
          // Find the right bin
          let binIdx = Math.floor(Math.sqrt(distSquared) / binWidth);

          if (!leftCombiningFunction || !rightCombiningFunction) {
            // We're using a custom function, so we'll handle this externally
            leftInputs.push([elem1.values[c], elem1.values[i]]);
            rightInputs.push([elem2.values[c], elem2.values[i]]);
            outputBinIndexes.push(binIdx);
            continue;
          }

          let comparisonLeftValue = elem1.values[i].value;
          let comparisonRightValue = elem2.values[i].value;

          let lvalue = leftCombiningFunction(currentLeftValue, comparisonLeftValue);
          let rvalue = rightCombiningFunction(currentRightValue, comparisonRightValue);

          result[binIdx].sum += lvalue * rvalue;
          result[binIdx].count++;
        }
      }
    }

    if (!leftCombiningFunction || !rightCombiningFunction) {
      return forkJoin([this.runBulkCombiningFunction(true, leftInputs), this.runBulkCombiningFunction(false, rightInputs)]).pipe(
        map(([leftValues, rightValues]) => {
          for (let c = 0; c < leftValues.length; c++) {
            let binIdx = outputBinIndexes[c];
            result[binIdx].sum += leftValues[c] * rightValues[c];
            result[binIdx].count++;
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
                let beamLocation = beamResp.beamLocations[i] || null;
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
    gen.processBeamData("", scan, entries, beamLocations, null, detConf);
    let metadata = new VariogramScanMetadata(gen.minXYDistance_mm, gen.locationPointXSize, gen.locationPointYSize, gen.beamUnitsInMeters, gen.locationCount);
    return metadata;
  }

  rebuildScanModel(): Observable<VariogramScanMetadata> {
    return this.buildScanModel(this._analysisLayoutService.defaultScanId).pipe(
      map(metadata => {
        // If slider values were invalid, we reset it here to 1/2
        let valuesWereDefaults = false;
        if (this.distanceSliderMin == 0 && this.distanceSliderMax == 0 && this.binSliderMin == 1 && this.binSliderMax == 1) {
          valuesWereDefaults = true;
        }

        // Min distance is actually the point display radius, though we can go a bit smaller

        // this.distanceSliderMin = metadata.minXYDistance_mm;
        // this.distanceSliderMax = Math.max(metadata.locationPointXSize, metadata.locationPointYSize);

        // if (metadata.beamUnitsInMeters) {
        //   this.distanceSliderMax *= 1000.0;
        // }

        this.binSliderMax = metadata.locationCount;
        if (valuesWereDefaults) {
          // Start off with some reasonable defaults
          this._variogramModel.maxDistance = (this.distanceSliderMin + this.distanceSliderMax) / 2;
          this._variogramModel.binCount = Math.floor((this.binSliderMin + this.binSliderMax) / 2);
        }

        this.variogramMetadata = metadata;
        return metadata;
      })
    );
  }
}
