import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CanvasDrawer, CanvasInteractionHandler } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { DataSourceParams, DataUnit, RegionDataResults, SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { HistogramModel } from "./histogram-model";
import { HistogramDrawer } from "./histogram-drawer";
import { HistogramToolHost } from "./histogram-interaction";
import { PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { ExpressionPickerData, ExpressionPickerComponent, ExpressionPickerResponse } from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { HistogramState, VisibleROI } from "src/app/generated-protos/widget-data";

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

  private _subs = new Subscription();

  constructor(
    public dialog: MatDialog,
    private _widgetData: WidgetDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService
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
      ],
      topRightInsetButton: {
        id: "key",
        type: "button",
        title: "Key",
        tooltip: "Toggle key for plot",
        onClick: () => this.onToggleKey(),
      },
    };
  }

  private setInitialConfig() {
    const scanId = this._analysisLayoutService.defaultScanId;
    if (scanId.length > 0) {
      let quantId = ""; // TODO: get this!

      if (quantId.length <= 0) {
        // default to pseudo intensities
        this.mdl.expressionIds = [
          DataExpressionId.makePredefinedPseudoIntensityExpression("Mg"),
          DataExpressionId.makePredefinedPseudoIntensityExpression("Na"),
          DataExpressionId.makePredefinedPseudoIntensityExpression("Ca")
        ];
      } else {
        // default to showing some quantified data... TODO: get this from the quant!
      }

      this.mdl.dataSourceIds.set(scanId, new ScanDataIds(quantId, [PredefinedROIID.getAllPointsForScan(scanId)]));
      this.update();
    }
  }

  private update() {
    const query: DataSourceParams[] = [];

    // NOTE: processQueryResult depends on the order of the following for loops...
    for (const [scanId, ids] of this.mdl.dataSourceIds) {
      for (const roiId of ids.roiIds) {
        for (const exprId of this.mdl.expressionIds) {
          query.push(new DataSourceParams(scanId, exprId, ids.quantId, roiId, DataUnit.UNIT_DEFAULT));
        }
      }
    }

    /* ALSO INCLUDE ERROR BARS:
  protected getErrorColForExpression(exprId: string, roiId: string): Observable<PMCDataValues | null> {
    // If we've got a corresponding error column, use that, otherwise return null
    const elem = DataExpressionId.getPredefinedQuantExpressionElement(exprId);
    if (elem.length <= 0) {
      return of(null);
    }

    // Get the detector too. If not specified, it will be '' which will mean some defaulting will happen
    const detector = DataExpressionId.getPredefinedQuantExpressionDetector(exprId);

    // Try query it
    const errExprId = DataExpressionId.makePredefinedQuantElementExpression(elem, "err", detector);
    const query: DataSourceParams[] = [new DataSourceParams(errExprId, roiId, "")];
    return this._widgetDataService.getData(query, false).pipe(
      map(queryData => {
        if (queryData.error || queryData.hasQueryErrors() || queryData.queryResults.length != 1) {
          return null;
        }

        return queryData.queryResults[0].values;
      })
    );
  }
*/

    this._widgetData.getData(query).subscribe({
      next: data => {
        this.setData(data);
      },
      error: err => {
        this.setData(new RegionDataResults([], err));
      },
    });
  }

  private setData(data: RegionDataResults) {
    const errs = this.mdl.setData(data);
    if (errs.length > 0) {
      for (const err of errs) {
        this._snackService.openError(err.message, err.description);
      }
    }
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
                const quantId = this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[roi.scanId]?.quantId || "";
                this.mdl.dataSourceIds.set(roi.scanId, new ScanDataIds(quantId, [roi.id]));
              }
            });

            this.update();
          }
        } else {
          this.setInitialConfig();
        }
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
    dialogConfig.data = {
      selectedIds: this.mdl.expressionIds,
    };

    const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ExpressionPickerResponse) => {
      this.mdl.expressionIds = [];

      if (result && result.selectedExpressions?.length > 0) {
        for (const expr of result.selectedExpressions) {
          this.mdl.expressionIds.push(expr.id);
        }

        let roiIds = [PredefinedROIID.getAllPointsForScan(this._analysisLayoutService.defaultScanId)];

        // If we already have a data source for this scan, keep the ROI ids
        const existingSource = this.mdl.dataSourceIds.get(result.scanId);
        if (existingSource && existingSource.roiIds && existingSource.roiIds.length > 0) {
          roiIds = existingSource.roiIds;
        }
        this.mdl.dataSourceIds.set(result.scanId, new ScanDataIds(result.quantId, roiIds));
      }

      this.update();
      this.saveState();
    });
  }
  onRegions() {
    const dialogConfig = new MatDialogConfig();
    // Pass data to dialog
    dialogConfig.data = {
      requestFullROIs: true,
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
          this.mdl.dataSourceIds.set(scanId, new ScanDataIds("" /* No quant yet? */, roiIds));
        }

        this.update();
        this.saveState();
      }
    });
  }
  onToggleKey() {}

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
    this.saveState();
  }

  get showStdError(): boolean {
    return !this.mdl.showStdDeviation;
  }
  toggleShowStdError() {
    this.mdl.showStdDeviation = !this.mdl.showStdDeviation;
    this.saveState();
  }

  get logScale(): boolean {
    return this.mdl.logScale;
  }
  onToggleLogScale() {
    this.mdl.logScale = !this.mdl.logScale;
    this.saveState();
  }
}
