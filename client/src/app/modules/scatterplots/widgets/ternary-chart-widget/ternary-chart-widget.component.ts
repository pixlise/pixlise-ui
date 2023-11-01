import { Component, OnInit, OnDestroy } from "@angular/core";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { Subscription } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { TernaryChartDrawer } from "./ternary-drawer";
import { CanvasDrawer, CanvasInteractionHandler } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { TernaryChartModel, TernaryDrawModel } from "./ternary-model";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { DataSourceParams, SelectionService, WidgetDataService, DataUnit, RegionDataResults, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { Point, Rect, ptWithinPolygon } from "src/app/models/Geometry";
import { InteractionWithLassoHover } from "../../base/interaction-with-lasso-hover";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { TernaryState, VisibleROI } from "src/app/generated-protos/widget-data";
import { DataExpressionId } from "src/app/expression-language/expression-id";

class TernaryChartToolHost extends InteractionWithLassoHover {
  constructor(
    private _terMdl: TernaryChartModel,
    selectionService: SelectionService
  ) {
    super(_terMdl, selectionService);
  }

  protected resetHover(): void {
    this._terMdl.hoverPoint = null;
    this._terMdl.hoverPointData = null;
    this._terMdl.mouseLassoPoints = [];
  }

  protected isOverDataArea(canvasPt: Point): boolean {
    // If the mouse is over the triangle area, show a lasso cursor
    const triPts = [this._terMdl.drawModel.triangleA, this._terMdl.drawModel.triangleB, this._terMdl.drawModel.triangleC];
    const triBox: Rect = Rect.makeRect(this._terMdl.drawModel.triangleA, 0, 0);
    triBox.expandToFitPoints(triPts);

    return ptWithinPolygon(canvasPt, triPts, triBox);
  }
}

@Component({
  selector: "ternary-chart-widget",
  templateUrl: "./ternary-chart-widget.component.html",
  styleUrls: ["./ternary-chart-widget.component.scss"],
})
export class TernaryChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new TernaryChartModel(new TernaryDrawModel());
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;

  private _subs = new Subscription();

  constructor(
    public dialog: MatDialog,
    private _selectionService: SelectionService,
    //private _route: ActivatedRoute,
    private _analysisLayoutService: AnalysisLayoutService,
    private _widgetData: WidgetDataService,
    private _snackService: SnackbarService
  ) {
    super();

    this.drawer = new TernaryChartDrawer(this.mdl);
    this.toolhost = new TernaryChartToolHost(this.mdl, this._selectionService);

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
    const scanId = this._analysisLayoutService.defaultScanId;
    if (scanId.length > 0) {
      let quantId = ""; // TODO: get this!

      if (quantId.length <= 0) {
        // default to pseudo intensities
        this.mdl.expressionIds = [
          DataExpressionId.makePredefinedPseudoIntensityExpression("Mg"),
          DataExpressionId.makePredefinedPseudoIntensityExpression("Na"),
          DataExpressionId.makePredefinedPseudoIntensityExpression("Al"),
        ];
      } else {
        // default to showing some quantified data... TODO: get this from the quant!
      }

      this.mdl.dataSourceIds.set(scanId, new ScanDataIds(quantId, [PredefinedROIID.getAllPointsForScan(scanId)]));
      this.update();
    }
  }

  get topAxisSwitcher(): ScatterPlotAxisInfo | null {
    return this.mdl.raw?.cornerC || null;
  }

  get bottomLeftAxisSwitcher(): ScatterPlotAxisInfo | null {
    return this.mdl.raw?.cornerA || null;
  }

  get bottomRightAxisSwitcher(): ScatterPlotAxisInfo | null {
    return this.mdl.raw?.cornerB || null;
  }

  private update() {
    if (this.mdl.expressionIds.length != 3) {
      throw new Error("Expected 3 expression ids for Ternary");
    }

    const unit = this.mdl.showMmol ? DataUnit.UNIT_MMOL : DataUnit.UNIT_DEFAULT;
    const query: DataSourceParams[] = [];

    // NOTE: processQueryResult depends on the order of the following for loops...
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
        this.mdl.handleHoverPointChanged(this._selectionService.hoverScanId, this._selectionService.hoverEntryId);
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
        const ternaryData: TernaryState = data as TernaryState;

        if (ternaryData) {
          if (ternaryData.expressionIDs) {
            this.mdl.expressionIds = ternaryData.expressionIDs;
          }

          this.mdl.showMmol = ternaryData.showMmol;

          if (ternaryData.visibleROIs) {
            this.mdl.dataSourceIds.clear();
            ternaryData.visibleROIs.forEach(roi => {
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
    /*this._subs.add(
      this._selectionService.selection$.subscribe(() => {
        this.mdl.handleSelection;
      })
    );*/
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
          let quantId = "";

          // If we already have a data source for this scan, keep the quant id
          const existingSource = this.mdl.dataSourceIds.get(scanId);
          if (existingSource && existingSource.quantId) {
            quantId = existingSource.quantId;
          }
          this.mdl.dataSourceIds.set(scanId, new ScanDataIds(quantId, roiIds));
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
      TernaryState.create({
        expressionIDs: this.mdl.expressionIds,
        visibleROIs: visibleROIs,
        showMmol: this.mdl.showMmol,
      })
    );
  }

  openExpressionPicker(corner: string) {
    const axisExpressionIndex = ["A", "B", "C"].indexOf(corner);

    if (axisExpressionIndex < 0) {
      this._snackService.openError(`Invalid corner "${corner}"`);
      return;
    }

    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.data = {};

    if (this.mdl.expressionIds.length > axisExpressionIndex) {
      dialogConfig.data.selectedIds = [this.mdl.expressionIds[axisExpressionIndex]];
    }

    const dialogRef = this.dialog.open(ExpressionPickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ExpressionPickerResponse) => {
      if (result && result.selectedExpressions?.length > 0) {
        // If there are 1-3, set them all
        const last = Math.min(3, result.selectedExpressions.length);
        for (let i = 0; i < last; i++) {
          this.mdl.expressionIds[(axisExpressionIndex + i) % 3] = result.selectedExpressions[i].id;
        }

        let roiIds = [PredefinedROIID.getAllPointsForScan(this._analysisLayoutService.defaultScanId)];

        // If we already have a data source for this scan, keep the ROI ids
        const existingSource = this.mdl.dataSourceIds.get(result.scanId);
        if (existingSource && existingSource.roiIds && existingSource.roiIds.length > 0) {
          roiIds = existingSource.roiIds;
        }
        this.mdl.dataSourceIds.set(result.scanId, new ScanDataIds(result.quantId, roiIds));

        this.update();
        this.saveState();
      }
    });
  }

  onCornerClick(corner: string): void {
    this.openExpressionPicker(corner);
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
