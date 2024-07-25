import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { catchError, map, Observable, Subscription } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CanvasDrawer, CanvasInteractionHandler } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel, LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import {
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
import { AnalysisLayoutService, DefaultExpressions } from "src/app/modules/analysis/services/analysis-layout.service";
import { HistogramState, VisibleROI } from "src/app/generated-protos/widget-data";
import { ROIService } from "../../../roi/services/roi.service";
import { RegionSettings } from "../../../roi/models/roi-region";

@Component({
  selector: "histogram-widget",
  templateUrl: "./histogram-widget.component.html",
  styleUrls: ["./histogram-widget.component.scss"],
})
export class HistogramWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new HistogramModel();
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;

  // Just a dummy, we don't pan/zoom
  transform: PanZoom = new PanZoom();

  scanId: string = "";
  quantId: string = "";

  private _subs = new Subscription();

  constructor(
    public dialog: MatDialog,
    private _widgetData: WidgetDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService,
    private _selectionService: SelectionService,
    private _roiService: ROIService
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
        },
        {
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
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
    const query: DataSourceParams[] = [];

    // NOTE: processQueryResult depends on the order of the following for loops...
    for (const exprId of this.mdl.expressionIds) {
      for (const [scanId, ids] of this.mdl.dataSourceIds) {
        for (const roiId of ids.roiIds) {
          query.push(new DataSourceParams(scanId, exprId, ids.quantId, roiId, DataUnit.UNIT_DEFAULT));

          // Get the error column if this was a predefined expression
          const elem = DataExpressionId.getPredefinedQuantExpressionElement(exprId);
          if (elem.length > 0) {
            // Get the detector too. If not specified, it will be '' which will mean some defaulting will happen
            const detector = DataExpressionId.getPredefinedQuantExpressionDetector(exprId);

            // Try query it
            const errExprId = DataExpressionId.makePredefinedQuantElementExpression(elem, "err", detector);
            query.push(new DataSourceParams(scanId, errExprId, ids.quantId, roiId, DataUnit.UNIT_DEFAULT));
          }
        }
      }
    }

    this._widgetData.getData(query).subscribe({
      next: data => {
        this.setData(data).subscribe(() => {
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
          }
        });
      },
      error: err => {
        this.setData(new RegionDataResults([], err)).subscribe(() => {
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
          }
        });
      },
    });
  }

  private setData(data: RegionDataResults): Observable<void> {
    return this._analysisLayoutService.availableScans$.pipe(
      map(scans => {
        const errs = this.mdl.setData(data, scans);
        if (errs.length > 0) {
          for (const err of errs) {
            this._snackService.openError(err.message, err.description);
          }
        }
      }),
      catchError(err => {
        this._snackService.openError("Failed to set data", `${err}`);
        return [];
      })
    );
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
          this.mdl.showStdDeviation = !histogramData.showStdDeviation;
          this.mdl.showWhiskers = histogramData.showWhiskers;

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
        for (const [scanId, ids] of this.mdl.dataSourceIds) {
          let dataSource = this.mdl.dataSourceIds.get(scanId);
          dataSource!.roiIds = dataSource!.roiIds.filter(id => !PredefinedROIID.isSelectedPointsROI(id));
        }

        let scanIds = selection?.beamSelection?.getScanIds() || [];
        if (selection && scanIds.length > 0) {
          scanIds.forEach(scanId => {
            let pointsSelected = selection.beamSelection.getSelectedScanEntryPMCs(scanId);
            if (pointsSelected.size === 0) {
              return;
            }

            let selectionPoints = PredefinedROIID.getSelectedPointsForScan(scanId);
            let dataSource = this.mdl.dataSourceIds.get(scanId);
            if (dataSource) {
              dataSource.roiIds = Array.from(new Set([...dataSource.roiIds, selectionPoints]));
            } else {
              this.mdl.dataSourceIds.set(scanId, new ScanDataIds(this._analysisLayoutService.getQuantIdForScan(scanId), [selectionPoints]));
            }
          });
        }

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

        if (result && result.selectedExpressions?.length > 0) {
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

    this.reDraw();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
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
        showStdDeviation: this.mdl.showStdDeviation,
      })
    );
  }

  get showWhiskers(): boolean {
    return this.mdl.showWhiskers;
  }

  onToggleShowWhiskers() {
    this.mdl.showWhiskers = !this.mdl.showWhiskers;
    this.update();
    this.saveState();
  }

  get showStdDeviation(): boolean {
    return this.mdl.showStdDeviation;
  }

  toggleShowStdDeviation() {
    this.mdl.showStdDeviation = !this.mdl.showStdDeviation;
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
}
