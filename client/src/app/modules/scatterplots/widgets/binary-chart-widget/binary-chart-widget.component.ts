import { Component, Input, OnInit, OnDestroy } from "@angular/core";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { DataSourceParams, DataUnit, RegionDataResults, SelectionService, SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { Subscription } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { BinaryChartDrawer } from "./binary-drawer";
import {
  CanvasDrawNotifier,
  CanvasDrawer,
  CanvasInteractionHandler,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { BinaryChartModel, BinaryDrawModel } from "./binary-model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { Point } from "src/app/models/Geometry";
import { InteractionWithLassoHover } from "../../base/interaction-with-lasso-hover";


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

  private _subs = new Subscription();
  constructor(
    public dialog: MatDialog,
    private _selectionService: SelectionService,
    private _widgetData: WidgetDataService
  ) {
    super();

    this.setInitialConfig();

    this.drawer = new BinaryChartDrawer(this.mdl);
    const toolHost = new BinaryChartToolHost(this.mdl, this._selectionService);

    this.toolhost = toolHost;

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
        type: "button",
        title: "Selection",
        tooltip: "Selection changer",
        onClick: () => this.onClearSelection(),
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
    this.mdl.expressionIds.push("vge9tz6fkbi2ha1p"); // CaTi
    this.mdl.expressionIds.push("fhb5x0qbx6lz9uec"); // Dip (deg, B to A)

    // Naltsos
    this.mdl.dataSourceIds.set(
      "048300551",
      new ScanDataIds(
        "ox3psifd719hfo1s", //00125_Naltsos_Heirwegh_det_combined_v7_10_05_2021
        //"2ejylaj1suu6qyj9", // Naltsos 2nd Quant Carbonates Tim
        [PredefinedROIID.AllPoints]
      )
    );

    this.update();
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
        this.mdl.setData(data);
      },
      error: err => {
        this.mdl.setData(new RegionDataResults([], err));
      },
    });
  }

  ngOnInit() {
    // this.drawer = new BinaryChartDrawer(this.mdl, this.mdl?.toolHost);
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
      }
    });
  }

  onReferences() {}
  onClearSelection() {}
  onToggleKey() {}

  onAxisClick(axis: string): void {
    console.log(axis);
  }

  get showMmol(): boolean {
    return this.mdl.showMmol;
  }

  setShowMmol() {
    this.mdl.showMmol = !this.mdl.showMmol;
  }

  get selectModeExcludeROI(): boolean {
    return this.mdl.selectModeExcludeROI;
  }

  onToggleSelectModeExcludeROI() {
    this.mdl.selectModeExcludeROI = !this.mdl.selectModeExcludeROI;
  }
}
