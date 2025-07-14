import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { catchError, first, map, Observable, Subscription } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CanvasDrawer, CanvasInteractionHandler } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel, LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import {
  DefaultExpressions,
  AnalysisLayoutService,
  DataSourceParams,
  DataUnit,
  RegionDataResults,
  SelectionService,
  SnackbarService,
  WidgetDataService,
  WidgetKeyItem,
} from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { HistogramModel } from "./histogram-model";
import { HistogramDrawer } from "./histogram-drawer";
import { HistogramToolHost } from "./histogram-interaction";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import {
  ExpressionPickerData,
  ExpressionPickerComponent,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { HistogramState, VisibleROI } from "src/app/generated-protos/widget-data";
import { ROIService } from "../../../roi/services/roi.service";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { WidgetError } from "src/app/modules/pixlisecore/services/widget-data.service";
import { httpErrorToString } from "src/app/utils/utils";
import { ObjectChangeMonitor } from "src/app/modules/pixlisecore/models/object-change-monitor";
import { ObjectChange, ObjectChangeMonitorService } from "src/app/modules/pixlisecore/services/object-change-monitor.service";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportRequest,
  WidgetExportFile,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";

@Component({
  selector: "histogram-widget",
  templateUrl: "./histogram-widget.component.html",
  styleUrls: ["./histogram-widget.component.scss"],
})
export class HistogramWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  private _lastBeamSelection: BeamSelection | undefined = undefined;
  mdl = new HistogramModel();
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;

  // Just a dummy, we don't pan/zoom
  transform: PanZoom = new PanZoom();

  scanId: string = "";
  quantId: string = "";

  modelErrors: WidgetError[] = [];

  private _subs = new Subscription();
  private _objChangeMonitor = new ObjectChangeMonitor();

  constructor(
    public dialog: MatDialog,
    private _widgetData: WidgetDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService,
    private _selectionService: SelectionService,
    private _roiService: ROIService,
    private _objChangeService: ObjectChangeMonitorService
  ) {
    super();

    this.drawer = new HistogramDrawer(this.mdl);
    this.toolhost = new HistogramToolHost(this.mdl);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "refs",
          type: "button",
          title: "Bars",
          tooltip: "Choose expressions to calculate bars from",
          onClick: () => this.onBars(),
          settingTitle: "Bars",
          settingGroupTitle: "Data",
          settingIcon: "assets/button-icons/bars.svg",
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
          onClick: () => this.onSoloView(),
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
          settingIcon: "assets/button-icons/export.svg",
        },
      ],
      topRightInsetButton: {
        id: "key",
        value: this.mdl.keyItems,
        type: "widget-key",
        onClick: () => this.onToggleKey(),
        onUpdateKeyItems: (keyItems: WidgetKeyItem[]) => {
          this.mdl.keyItems = keyItems;
          this.update();
        },
      },
    };
  }

  ngOnInit() {
    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const histogramData: HistogramState = data as HistogramState;

        if (histogramData) {
          if (histogramData.expressionIDs) {
            this.mdl.expressionIds = histogramData.expressionIDs;
          }

          this.mdl.logScale = histogramData.logScale;

          // If we have an old style record, try to reinterpret it in the new scheme
          if (!histogramData.zoomMode) {
            this.mdl.zoomMode = HistogramModel.ZoomModeAll;
          } else {
            this.mdl.zoomMode = histogramData.zoomMode;
          }

          if (!histogramData.whiskerDisplayMode) {
            if (histogramData.showWhiskers) {
              this.mdl.whiskerDisplayMode = histogramData.showStdDeviation ? HistogramModel.WhiskersStdDev : HistogramModel.WhiskersStdErr;
            } else {
              this.mdl.whiskerDisplayMode = HistogramModel.WhiskersNone;
            }
          } else {
            this.mdl.whiskerDisplayMode = histogramData.whiskerDisplayMode;
          }

          if (histogramData.visibleROIs) {
            this.mdl.dataSourceIds.clear();
            histogramData.visibleROIs.forEach(roi => {
              if (this.mdl.dataSourceIds.has(roi.scanId)) {
                const dataSource = this.mdl.dataSourceIds.get(roi.scanId);
                dataSource!.roiIds.push(roi.id);
                this.mdl.dataSourceIds.set(roi.scanId, dataSource!);
              } else {
                const quantId = this._analysisLayoutService.getQuantIdForScan(roi.scanId);
                this.mdl.dataSourceIds.set(roi.scanId, new ScanDataIds(quantId, [roi.id]));
              }

              if (this.scanId !== roi.scanId) {
                this.scanId = roi.scanId;
              }
            });

            this.update();
          }
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe(selection => {
        // Ensure no selected points regions are in the list...
        for (const [scanId, ids] of this.mdl.dataSourceIds) {
          let dataSource = this.mdl.dataSourceIds.get(scanId);
          dataSource!.roiIds = dataSource!.roiIds.filter(id => !PredefinedROIID.isSelectedPointsROI(id));
        }

        // Remember the selection because we'll need it
        this._lastBeamSelection = selection.beamSelection;

        // Ensure we have the region settings for the selected points
        this._roiService.getSelectedPointsRegionSettings(this.scanId).subscribe();
        this.update();
      })
    );

    this._subs.add(
      this._analysisLayoutService.expressionPickerResponse$.subscribe((result: ExpressionPickerResponse | null) => {
        if (!result || this._analysisLayoutService.highlightedWidgetId$.value !== this._widgetId) {
          return;
        }

        if (result /*&& result.selectedExpressions?.length > 0*/) {
          this.mdl.expressionIds = [];

          for (const expr of result.selectedExpressions) {
            this.mdl.expressionIds.push(expr.id);
          }

          let roiIds = [PredefinedROIID.getAllPointsForScan(this.scanId)];

          // If we already have a data source for this scan, keep the ROI ids
          const existingSource = this.mdl.dataSourceIds.get(result.scanId);
          if (existingSource && existingSource.roiIds && existingSource.roiIds.length > 0) {
            roiIds = existingSource.roiIds;
          }
          this.mdl.dataSourceIds.set(result.scanId, new ScanDataIds(result.quantId, roiIds));
        }

        this.update();
        this.saveState();

        // Expression picker has closed, so we can stop highlighting this widget
        this._analysisLayoutService.highlightedWidgetId$.next("");
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        // User may have switched quants or something, update our view
        this.update();
      })
    );

    this._subs.add(
      this._objChangeService.objectChanged$.subscribe((change: ObjectChange) => {
        // If we're interested in any of these, call update!
        if ((change.mapName && this._objChangeMonitor.isMapUsed(change.mapName)) || (change.roiId && this._objChangeMonitor.isROIUsed(change.roiId))) {
          console.log("Histogram: Updating due to change " + change.toString());
          this.update();
        }
      })
    );

    this.reDraw();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private setInitialConfig() {
    this.scanId = this.scanId || this._analysisLayoutService.defaultScanId || "";
    this.quantId = this.quantId || this._analysisLayoutService.getQuantIdForScan(this.scanId) || "";
    this._analysisLayoutService.makeExpressionList(this.scanId, 10).subscribe((exprs: DefaultExpressions) => {
      this.mdl.expressionIds = exprs.exprIds;

      this.mdl.dataSourceIds.set(this.scanId, new ScanDataIds(exprs.quantId, [PredefinedROIID.getAllPointsForScan(this.scanId)]));
      this.update();
    });
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  override injectExpression(liveExpression: LiveExpression) {
    this.scanId = liveExpression.scanId;
    this.quantId = liveExpression.quantId;

    this._analysisLayoutService.makeExpressionList(this.scanId, 10, this.quantId).subscribe((exprs: DefaultExpressions) => {
      if (exprs.exprIds.length > 0) {
        this.mdl.expressionIds = [liveExpression.expressionId, ...exprs.exprIds.slice(0, 9)];
      }

      this.mdl.dataSourceIds.set(this.scanId, new ScanDataIds(exprs.quantId, [PredefinedROIID.getAllPointsForScan(this.scanId)]));
      this.update();
    });
  }

  private update() {
    this.isWidgetDataLoading = true;
    const query: DataSourceParams[] = [];

    // NOTE: processQueryResult depends on the order of the following for loops...
    for (const exprId of this.mdl.expressionIds) {
      for (const [scanId, ids] of this.mdl.dataSourceIds) {
        for (const roiId of ids.roiIds) {
          let roiIdRequested = roiId;
          // NOTE: If we're requesting the selected points ROI, we actually want ALL points!
          if (PredefinedROIID.isSelectedPointsROI(roiId)) {
            roiIdRequested = PredefinedROIID.getAllPointsForScan(scanId);
          }

          query.push(new DataSourceParams(scanId, exprId, ids.quantId, roiIdRequested, DataUnit.UNIT_DEFAULT));

          // Get the error column if this was a predefined expression
          const elem = DataExpressionId.getPredefinedQuantExpressionElement(exprId);
          if (elem.length > 0) {
            // Get the detector too. If not specified, it will be '' which will mean some defaulting will happen
            const detector = DataExpressionId.getPredefinedQuantExpressionDetector(exprId);

            // Try query it
            const errExprId = DataExpressionId.makePredefinedQuantElementExpression(elem, "err", detector);
            query.push(new DataSourceParams(scanId, errExprId, ids.quantId, roiIdRequested, DataUnit.UNIT_DEFAULT));
          }
        }
      }
    }

    if (query.length <= 0) {
      // We're probably partially initialised, don't do anything crazy here...
      this.setData(new RegionDataResults([], "Select bars to display")).pipe(first()).subscribe();
      return;
    }

    try {
      this._widgetData
        .getData(query)
        .pipe(first())
        .subscribe({
          next: data => {
            // If we've got maps we're subscribed for, listen to the memo service for changes to those
            this._objChangeMonitor.checkExpressionResultObjectsUsed(data);

            this.setData(data).pipe(first()).subscribe();
          },
          error: err => {
            this.setData(new RegionDataResults([], err)).pipe(first()).subscribe();
          },
        });
    } catch (err) {
      if (err instanceof WidgetError) {
        const werr = err as WidgetError;
        werr.message = "Histogram: " + werr.message;
        this._snackService.openError(werr);
      } else {
        this.setData(new RegionDataResults([], httpErrorToString(err, "Histogram")))
          .pipe(first())
          .subscribe();
      }
    }
  }

  private setData(data: RegionDataResults): Observable<void> {
    this.modelErrors = [];
    return this._analysisLayoutService.availableScans$.pipe(
      map(scans => {
        this.modelErrors = this.mdl.setData(data, scans, this._lastBeamSelection);
        if (this.widgetControlConfiguration.topRightInsetButton) {
          this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
        }

        this.isWidgetDataLoading = false;
      }),
      catchError(err => {
        this._snackService.openError("Failed to set data", `${err}`);
        return [];
      })
    );
  }

  reDraw() {
    this.mdl.needsDraw$.next();
  }

  get interactionHandler() {
    return this.toolhost;
  }

  onBars() {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;
    dialogConfig.data = {
      widgetType: "histogram",
      widgetId: this._widgetId,
      scanId: this.scanId,
      quantId: this._analysisLayoutService.getQuantIdForScan(this.scanId) || "",
      selectedIds: this.mdl.expressionIds || [],
    };

    this.isWidgetHighlighted = true;
    const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);
    // NOTE: result returned by AnalysisLayoutService.expressionPickerResponse$
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();

    let selectedIds: string[] = [];
    this.mdl.dataSourceIds.forEach((ids, key) => {
      selectedIds.push(...ids.roiIds);
    });

    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: true,
      selectedIds,
      scanId: this.scanId,
    };

    const dialogRef = this.dialog.open(ROIPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ROIPickerResponse) => {
      if (result) {
        this.mdl.dataSourceIds.clear();

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
        for (const [scanId, roiIds] of roisPerScan) {
          this.mdl.dataSourceIds.set(scanId, new ScanDataIds(this._analysisLayoutService.getQuantIdForScan(scanId), roiIds));

          if (this.scanId !== scanId) {
            this.scanId = scanId;
          }
        }

        this.update();
        this.saveState();
      }
    });
  }

  onToggleKey() {
    if (this.widgetControlConfiguration.topRightInsetButton) {
      this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
    }
  }

  private saveState(): void {
    const visibleROIs: VisibleROI[] = [];

    for (const [scanId, item] of this.mdl.dataSourceIds.entries()) {
      for (const roiId of item.roiIds) {
        visibleROIs.push(VisibleROI.create({ id: roiId, scanId: scanId }));
      }
    }

    this.onSaveWidgetData.emit(
      HistogramState.create({
        expressionIDs: this.mdl.expressionIds,
        visibleROIs: visibleROIs,
        logScale: this.mdl.logScale,
        whiskerDisplayMode: this.mdl.whiskerDisplayMode,
        zoomMode: this.mdl.zoomMode,
      })
    );
  }

  get isWhiskerDisplayModeNone(): boolean {
    return this.mdl.whiskerDisplayMode === HistogramModel.WhiskersNone;
  }

  onToggleWhiskerDisplayMode(): void {
    this.mdl.whiskerDisplayMode = this.mdl.whiskerDisplayMode === HistogramModel.WhiskersNone ? HistogramModel.WhiskersStdDev : HistogramModel.WhiskersNone;
    this.update();
    this.saveState();
  }

  get whiskerDisplayModes(): string[] {
    return [HistogramModel.WhiskersStdDev, HistogramModel.WhiskersStdErr];
  }

  get whiskerDisplayMode(): string {
    return this.mdl.whiskerDisplayMode;
  }

  onChangeWhiskerDisplayMode(mode: string): void {
    this.mdl.whiskerDisplayMode = mode;
    this.update();
    this.saveState();
  }

  get zoomModes(): string[] {
    return [HistogramModel.ZoomModeAll, HistogramModel.ZoomModeWhisker];
  }

  get zoomMode(): string {
    return this.mdl.zoomMode;
  }

  onChangeZoomMode(mode: string): void {
    this.mdl.zoomMode = mode;
    this.update();
    this.saveState();
  }

  get logScale(): boolean {
    return this.mdl.logScale;
  }

  onToggleLogScale() {
    this.mdl.logScale = !this.mdl.logScale;
    this.update();
    this.saveState();
  }

  override getExportOptions(): WidgetExportDialogData {
    return {
      title: "Export Histogram",
      defaultZipName: "Histogram Data",
      options: [],
      dataProducts: [
        {
          id: "histogramData",
          name: "Histogram Data .csv",
          type: "checkbox",
          description: "Export the histogram data as CSV",
          selected: true,
        },
      ],
      showPreview: false,
    };
  }

  override onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      const csvs: WidgetExportFile[] = [];
      if (request.dataProducts) {
        if (request.dataProducts["histogramData"]?.selected) {
          csvs.push({
            fileName: `Histogram Data.csv`,
            data: this.exportHistogramData(),
          });
        }
      }

      observer.next({ csvs });
      observer.complete();
    });
  }

  private exportHistogramData(): string {
    if (!this.mdl.raw || this.mdl.raw.barGroups.length === 0) {
      return "No data available for export";
    }

    let csvData = "";

    const headerRow = [
      "Expression",
      "Region",
      "Mean Value",
      "Standard Deviation",
      "Standard Error",
      "Min Value",
      "Max Value",
      "Whisker Min",
      "Whisker Max",
      "Error Value",
      "Count",
    ];
    csvData += headerRow.map(h => `"${h}"`).join(",") + "\n";

    for (const barGroup of this.mdl.raw.barGroups) {
      for (const bar of barGroup.bars) {
        let stdErr = bar.stdErr;
        if (stdErr === 0 && bar.concentrationBands.count > 1) {
          stdErr = bar.stdDev / Math.sqrt(bar.concentrationBands.count);
        }

        let whiskerMin = bar.whiskerRange.min;
        let whiskerMax = bar.whiskerRange.max;
        if ((whiskerMin === null || whiskerMax === null) && bar.stdDev > 0) {
          const stdDevWhiskerMin = bar.meanValue - bar.stdDev;
          const stdDevWhiskerMax = bar.meanValue + bar.stdDev;

          whiskerMin = stdDevWhiskerMin;
          whiskerMax = stdDevWhiskerMax;
        }

        const rowData = [
          barGroup.shortLabel,
          bar.colourInfo,
          bar.meanValue.toFixed(6),
          bar.stdDev.toFixed(6),
          stdErr.toFixed(6),
          (bar.valueRange.min ?? 0).toFixed(6),
          (bar.valueRange.max ?? 0).toFixed(6),
          (whiskerMin ?? 0).toFixed(6),
          (whiskerMax ?? 0).toFixed(6),
          bar.errorValue.toFixed(6),
          bar.concentrationBands.count,
        ];
        csvData += rowData.map(cell => `"${cell}"`).join(",") + "\n";
      }
    }

    return csvData;
  }
}
