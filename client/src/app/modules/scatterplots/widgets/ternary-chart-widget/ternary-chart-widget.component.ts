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
import { DataSourceParams, SelectionService, WidgetDataService, DataUnit, RegionDataResults } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";

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
    //private _route: ActivatedRoute,
    private _widgetData: WidgetDataService
  ) {
    super();

    this.setInitialConfig();

    this.drawer = new TernaryChartDrawer(this.mdl);
    const toolHost = new TernaryChartToolHost(this.mdl, this._selectionService);

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
    //this.mdl.expressionIdA = "r4zd5s2tfgr8rahy"; // AlFe
    //this.mdl.expressionIdA = "540d6vt1r87kb0v2"; // "Diffraction Similarity (Combined)
    // this.mdl.expressionIdA = "o77tuzf7fpjuezdd"; // lua CaO pow
    this.mdl.expressionIdA = "lpqtfd5lva7t2046"; // Si (mmol) (PIXLANG)

    // this.mdl.expressionIdB = "8pwjbcbldf8gb8sx"; // High-E background (counts/keV)
    // this.mdl.expressionIdB = "d3bogvx0kfrhzpva"; // pixlang FeO pow
    this.mdl.expressionIdB = "fhb5x0qbx6lz9uec"; // Dip (deg, B to A)
    
    //this.mdl.expressionIdC = "3ewfmb3wu2wydydd"; // Lua Beam Wait Test
    //this.mdl.expressionIdC = "vwc45sho1kzxmveb"; // Lua Beam X*2 Test
    //this.mdl.expressionIdC = "ygrmsajfsltvw8gq"; // Lua Beam Await Test (element() call tester now)
    //this.mdl.expressionIdC = "cps70yywg4v4mrih"; // Lua position test
    //this.mdl.expressionIdC = "5kaygc64m9j7adlm"; // LuaTest
    this.mdl.expressionIdC = "vge9tz6fkbi2ha1p"; // CaTi
    //this.mdl.expressionIdC = "8v20yxvqbso7pbje"; // testing (spinels-carb)
    //this.mdl.expressionIdC = "rorp9q1ojy7w1umb"; // Merrillite (mmol/g)
    //this.mdl.expressionIdC = "p38xf02yx3ootnva"; // lua position mul 2
    //this.mdl.expressionIdC = "m55c1qvy031djifv"; // Lua expression
    //this.mdl.expressionIdC = "9psp6aqvxpuf7sp9"; // Mg# (LUA)

    // Peters userid: auth0|5de45d85ca40070f421a3a34

    //const scanId = this._route.snapshot.queryParams["scan_id"];

    // Naltsos
    this.mdl.dataSourceIds.set(
      "048300551",
      new ScanDataIds(
        "ox3psifd719hfo1s", //00125_Naltsos_Heirwegh_det_combined_v7_10_05_2021
        //"2ejylaj1suu6qyj9", // Naltsos 2nd Quant Carbonates Tim
        [
          PredefinedROIID.AllPoints
        ]
      )
    );
    // // Dourbes
    // this.mdl.dataSourceIds.set(
    //   "089063943",
    //   new ScanDataIds(
    //     //"67m8870gtn5qhwr9", // Tice carbonate
    //     "9qntb8w2joq4elti", // Jones_00258_v4
    //     //"gzouymw0k6o7wqay", // Tice base quant
    //     [
    //       PredefinedROIID.AllPoints,
    //       "tzn6stfrmrypzceb", // All Olivine
    //       "7wbn4sqo227d5lkt", // Augite
    //     ]
    //   )
    // );
    // // Quartier
    // this.mdl.dataSourceIds.set(
    //   "101384711",
    //   new ScanDataIds(
    //     "xyvzdae2ftvhgm48", //00294_Quartier_MJones_det_combined_v1_12_22_2021
    //     [
    //       PredefinedROIID.AllPoints,
    //       //"jm5v20zy5ie55s7t", // "All olivine"
    //       //"i63koqmnmkalpcu3", // Phosphates
    //       "5ft0bdn6x7md4o1r", // Olivine
    //       "hf1bh5u9w8flp600", // Sulfates
    //     ]
    //   )
    // );
    // // Novarupta 2
    // this.mdl.dataSourceIds.set(
    //   "198509061",
    //   new ScanDataIds(
    //     "w3wf2yuo74b559mt", // novarupta_2_570_combined_jchristian
    //     [
    //       PredefinedROIID.AllPoints,
    //       "vmy1rlymw6rxzo5p", // Olivine (points w/ CIA < 50)"
    //       "shclx0j3u03gbfia", // Ca-sulfate (approx)
    //     ]
    //   )
    // );

    this.update();
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
    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        this.mdl.handleHoverPointChanged(this._selectionService.hoverScanId, this._selectionService.hoverEntryId);
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

  onCornerClick(corner: string): void {
    console.log(corner);
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
