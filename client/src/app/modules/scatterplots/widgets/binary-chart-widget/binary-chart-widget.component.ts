import { Component, Input, OnInit, OnDestroy } from "@angular/core";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { DataSourceParams, DataUnit, RegionDataResults, SelectionService, SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Subscription } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { BinaryChartDrawer } from "./binary-drawer";
import {
  CanvasDrawNotifier,
  CanvasDrawer,
  CanvasInteractionHandler,
  CanvasWorldTransform,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BinaryChartModel, BinaryDrawModel } from "./binary-model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { Point } from "src/app/models/Geometry";
import { InteractionWithLassoHover } from "../../base/interaction-with-lasso-hover";
import {
  ExpressionPickerData,
  ExpressionPickerComponent,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { VisibleROI, BinaryState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";

class BinaryChartToolHost extends InteractionWithLassoHover {
  constructor(
    private _binMdl: BinaryChartModel,
    selectionService: SelectionService
  ) {
    super(_binMdl, selectionService);
  }

  protected resetHover(): void {
    this._binMdl.hoverPoint = null;
    this._binMdl.hoverPointData = null;
    this._binMdl.mouseLassoPoints = [];
  }

  protected isOverDataArea(canvasPt: Point): boolean {
    return this._binMdl.drawModel.axisBorder.containsPoint(canvasPt);
  }
}

@Component({
  selector: "binary-chart-widget",
  templateUrl: "./binary-chart-widget.component.html",
  styleUrls: ["./binary-chart-widget.component.scss"],
})
export class BinaryChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new BinaryChartModel(new BinaryDrawModel());
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;

  scanId: string = "";
  private _subs = new Subscription();

  constructor(
    public dialog: MatDialog,
    private _selectionService: SelectionService,
    private _widgetData: WidgetDataService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService
  ) {
    super();

    this.drawer = new BinaryChartDrawer(this.mdl);
    this.toolhost = new BinaryChartToolHost(this.mdl, this._selectionService);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "refs",
          type: "button",
          title: "Refs",
          tooltip: "Choose reference areas to display",
          onClick: () => this.onReferences(),
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
          tooltip: "Export",
          onClick: () => this.onExport(),
        },
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          onClick: () => this.onSoloView(),
        },
      ],
      topLeftInsetButton: {
        id: "selection",
        type: "selection-changer",
        tooltip: "Selection changer",
        onClick: () => {},
      },
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
    this.scanId = this._analysisLayoutService.defaultScanId;
    if (this.scanId.length > 0) {
      this._analysisLayoutService.activeScreenConfiguration$.getValue();
      let quantId = this._analysisLayoutService.getQuantIdForScan(this.scanId);

      if (quantId.length <= 0) {
        // default to pseudo intensities
        this.mdl.expressionIds = [DataExpressionId.makePredefinedPseudoIntensityExpression("Mg"), DataExpressionId.makePredefinedPseudoIntensityExpression("Na")];
      } else {
        let quantElements = this._analysisLayoutService.getQuantElementIdsForScan(this.scanId);
        this.mdl.expressionIds = quantElements.slice(0, 2);
      }

      this.mdl.dataSourceIds.set(this.scanId, new ScanDataIds(quantId, [PredefinedROIID.getAllPointsForScan(this.scanId)]));
      this.update();
    }
  }

  get xAxisSwitcher(): ScatterPlotAxisInfo | null {
    return this.mdl.raw?.xAxisInfo || null;
  }

  get yAxisSwitcher(): ScatterPlotAxisInfo | null {
    return this.mdl.raw?.yAxisInfo || null;
  }

  private update() {
    if (this.mdl.expressionIds.length != 2) {
      throw new Error("Expected 2 expression ids for Binary");
    }

    const unit = this.mdl.showMmol ? DataUnit.UNIT_MMOL : DataUnit.UNIT_DEFAULT;
    const query: DataSourceParams[] = [];

    // NOTE: setData depends on the order of the following for loops...
    for (const [scanId, ids] of this.mdl.dataSourceIds) {
      for (const roiId of ids.roiIds) {
        for (const exprId of this.mdl.expressionIds) {
          query.push(new DataSourceParams(scanId, exprId, ids.quantId, roiId, unit));
        }
      }
    }

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
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        this.mdl.handleHoverPointChanged(this._selectionService.hoverScanId, this._selectionService.hoverEntryPMC);
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe((sel: SelectionHistoryItem) => {
        this.mdl.handleSelectionChange(sel.beamSelection);
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        let updated = false;
        if (screenConfiguration) {
          if (screenConfiguration.scanConfigurations) {
            // Update all existing data source ids with the new quant id for the scan
            Object.entries(screenConfiguration.scanConfigurations).forEach(([scanId, scanConfig]) => {
              if (this.mdl.dataSourceIds.has(scanId)) {
                const dataSource = this.mdl.dataSourceIds.get(scanId);
                this.scanId = scanId;
                if (dataSource?.quantId !== scanConfig.quantId) {
                  this.mdl.dataSourceIds.set(scanId, new ScanDataIds(scanConfig.quantId, dataSource?.roiIds || []));
                  updated = true;
                }
              }
            });
          }
        }

        if (updated) {
          this.update();
        }
      })
    );

    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const binaryData: BinaryState = data as BinaryState;

        if (binaryData) {
          if (binaryData.expressionIDs) {
            this.mdl.expressionIds = binaryData.expressionIDs;
          }

          this.mdl.showMmol = binaryData.showMmol;

          if (binaryData.visibleROIs) {
            this.mdl.dataSourceIds.clear();
            binaryData.visibleROIs.forEach(roi => {
              if (!roi.scanId) {
                return;
              }

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
      this._analysisLayoutService.expressionPickerResponse$.subscribe((result: ExpressionPickerResponse | null) => {
        if (!result || this._analysisLayoutService.highlightedWidgetId$.value !== this._widgetId) {
          return;
        }

        if (result && result.selectedExpressions?.length > 0) {
          // If there are 1-3, set them all
          const last = Math.min(2, result.selectedExpressions.length);
          for (let i = 0; i < last; i++) {
            this.mdl.expressionIds[i % 2] = result.selectedExpressions[i].id;
          }

          // let roiIds = [PredefinedROIID.getAllPointsForScan(this._analysisLayoutService.defaultScanId)];

          // // If we already have a data source for this scan, keep the ROI ids
          // const existingSource = this.mdl.dataSourceIds.get(result.scanId);
          // if (existingSource && existingSource.roiIds && existingSource.roiIds.length > 0) {
          //   roiIds = existingSource.roiIds;
          // }
          // this.mdl.dataSourceIds.set(result.scanId, new ScanDataIds(result.quantId, roiIds));

          this.update();
          this.saveState();
        }

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

  get transform() {
    return this.mdl.transform;
  }

  get interactionHandler() {
    return this.toolhost;
  }

  onExport() {}
  onSoloView() {}
  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();

    let selectedIds: string[] = [];
    this.mdl.dataSourceIds.forEach(rois => {
      selectedIds.push(...rois.roiIds);
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
          let quantId = this._analysisLayoutService.getQuantIdForScan(scanId);
          this.mdl.dataSourceIds.set(scanId, new ScanDataIds(quantId, roiIds));

          if (scanId && this.scanId !== scanId) {
            this.scanId = scanId;
          }
        }

        this.update();
        this.saveState();
      }
    });
  }

  onReferences() {}
  onToggleKey() {}

  private saveState(): void {
    const visibleROIs: VisibleROI[] = [];

    for (const [scanId, item] of this.mdl.dataSourceIds.entries()) {
      for (const roiId of item.roiIds) {
        visibleROIs.push(VisibleROI.create({ id: roiId, scanId: scanId }));
      }
    }

    this.onSaveWidgetData.emit(
      BinaryState.create({
        expressionIDs: this.mdl.expressionIds,
        visibleROIs: visibleROIs,
        showMmol: this.mdl.showMmol,
      })
    );
  }

  onAxisClick(axis: string): void {
    const axisExpressionIndex = ["X", "Y"].indexOf(axis);

    if (axisExpressionIndex < 0) {
      this._snackService.openError(`Invalid axis "${axis}"`);
      return;
    }

    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;
    dialogConfig.data = {
      widgetType: "binary-plot",
      widgetId: this._widgetId,
      scanId: this.scanId,
      quantId: this._analysisLayoutService.getQuantIdForScan(this.scanId) || "",
      selectedIds: this.mdl.expressionIds || [],
    };

    if (this.mdl.expressionIds.length > axisExpressionIndex) {
      dialogConfig.data.expressionTriggerPosition = axisExpressionIndex;
    }

    this.isWidgetHighlighted = true;
    this.dialog.open(ExpressionPickerComponent, dialogConfig);
  }

  get showMmol(): boolean {
    return this.mdl.showMmol;
  }

  setShowMmol() {
    this.mdl.showMmol = !this.mdl.showMmol;
    this.saveState();
  }

  get selectModeExcludeROI(): boolean {
    return this.mdl.selectModeExcludeROI;
  }

  onToggleSelectModeExcludeROI() {
    this.mdl.selectModeExcludeROI = !this.mdl.selectModeExcludeROI;
  }
}
