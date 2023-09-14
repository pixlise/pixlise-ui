import { Component, Input, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { Subscription } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { TernaryChartDrawer } from "./drawer";
import {
  CanvasDrawNotifier,
  CanvasDrawer,
  CanvasInteractionHandler,
  CanvasWorldTransform,
} from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { TernaryChartModel } from "./model";
import { TernaryChartToolHost } from "./interaction";
import { PredefinedROIID, orderVisibleROIs } from "src/app/models/RegionOfInterest";
import { DataSourceParams, SelectionService, WidgetDataService, DataUnit } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";

@Component({
  selector: "ternary-chart-widget",
  templateUrl: "./ternary-chart-widget.component.html",
  styleUrls: ["./ternary-chart-widget.component.scss"],
})
export class TernaryChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new TernaryChartModel();
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;

  private _subs = new Subscription();

  constructor(
    public dialog: MatDialog,
    private _selectionService: SelectionService,
    private _route: ActivatedRoute,
    private _widgetData: WidgetDataService
  ) {
    super();

    this.mdl.expressionIdA = "r4zd5s2tfgr8rahy"; // AlFe
    this.mdl.expressionIdB = "rlqqh3wz9xball3w"; // Ca/100
    this.mdl.expressionIdC = "vge9tz6fkbi2ha1p"; // CaTi

    //const scanId = this._route.snapshot.queryParams["scan_id"];

    // Naltsos
    this.mdl.dataSourceIds.set("048300551", new ScanDataIds("9k8wgfzi02a9h6f8", [PredefinedROIID.AllPoints, "048300551_xo98frdyibinpjn3"]));
    // Dourbes
    //this.mdl.dataSourceIds.set("089063943", new ScanDataIds("9qntb8w2joq4elti", [PredefinedROIID.AllPoints, "048300551_xo98frdyibinpjn3"]));

    const exprIds = [this.mdl.expressionIdA, this.mdl.expressionIdB, this.mdl.expressionIdC];

    const unit = this.mdl.showMmol ? DataUnit.UNIT_MMOL : DataUnit.UNIT_DEFAULT;
    const query: DataSourceParams[] = [];

    // NOTE: processQueryResult depends on the order of the following for loops...
    for (const [scanId, ids] of this.mdl.dataSourceIds) {
      for (const roiId of ids.roiIds) {
        for (const exprId of exprIds) {
          query.push(new DataSourceParams(scanId, exprId, ids.quantId, roiId, unit));
        }
      }
    }

    this._widgetData.getData(query).subscribe(data => {
      this.mdl.setData(data);
    });

    this.drawer = new TernaryChartDrawer(this.mdl);
    const toolHost = new TernaryChartToolHost(this.mdl, this._selectionService);
    this._subs.add(
      toolHost.cornerClick.subscribe((corner: string) => {
        this.onCornerSwap(corner);
      })
    );

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

  ngOnInit() {
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
  onRegions() {}
  onReferences() {}
  onClearSelection() {}
  onToggleKey() {}
  onCornerSwap(corner: string): void {}

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
