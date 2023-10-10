import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CanvasInteractionHandler, CanvasDrawer } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { DataSourceParams, DataUnit, RegionDataResults, SelectionService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ChordDiagramModel, ChordDrawMode } from "./chord-model";
import { ChordDiagramDrawer } from "./chord-drawer";
import { ChordDiagramInteraction } from "./chord-interaction";
import { PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { Colours } from "src/app/utils/colours";
import { SliderValue } from "src/app/modules/pixlisecore/components/atoms/slider/slider.component";
import { DataExpressionId } from "src/app/expression-language/expression-id";

@Component({
  selector: "app-chord-diagram-widget",
  templateUrl: "./chord-diagram-widget.component.html",
  styleUrls: ["./chord-diagram-widget.component.scss", "../../base/widget-common.scss"],
})
export class ChordDiagramWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new ChordDiagramModel();
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;

  // Just a dummy, we don't pan/zoom
  transform: PanZoom = new PanZoom();

  private _subs = new Subscription();

  // For settings menu items:
  stateNames = [ChordDrawMode.NEGATIVE, ChordDrawMode.BOTH, ChordDrawMode.POSITIVE];
  sliderTrackColourYellow = Colours.GRAY_50.asString();
  sliderTrackColourGray = Colours.GRAY_50.asString();

  constructor(
    public dialog: MatDialog,
    private _widgetData: WidgetDataService,
    private _selectionService: SelectionService
  ) {
    super();

    this.setInitialConfig();

    this.drawer = new ChordDiagramDrawer(this.mdl);
    const toolHost = new ChordDiagramInteraction(this.mdl, this._selectionService);

    this.toolhost = toolHost;

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "nodes",
          type: "button",
          title: "Nodes",
          tooltip: "Choose expressions to calculate nodes from",
          onClick: () => this.onNodes(),
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
    };
  }

  private setInitialConfig() {
    this.mdl.expressionIds.push("lpqtfd5lva7t2046"); // Si (mmol) (PIXLANG)
    this.mdl.expressionIds.push("fhb5x0qbx6lz9uec"); // Dip (deg, B to A)
    //this.mdl.expressionIds.push("vge9tz6fkbi2ha1p"); // CaTi
    this.mdl.expressionIds.push(DataExpressionId.makePredefinedQuantElementExpression("Ca", "%", "Combined"));

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

  private update() {
    if (this.mdl.expressionIds.length != 3) {
      throw new Error("Expected 3 expression ids for Ternary");
    }

    const query: DataSourceParams[] = [];

    // NOTE: processQueryResult depends on the order of the following for loops...
    for (const [scanId, ids] of this.mdl.dataSourceIds) {
      for (const roiId of ids.roiIds) {
        for (const exprId of this.mdl.expressionIds) {
          query.push(new DataSourceParams(scanId, exprId, ids.quantId, roiId, DataUnit.UNIT_DEFAULT));

          // If we just added a request for an element expression, also add one for the corresponding error column value
          const elem = DataExpressionId.getPredefinedQuantExpressionElement(exprId);
          if (elem.length) {
            const detector = DataExpressionId.getPredefinedQuantExpressionDetector(exprId);

            const errExprId = DataExpressionId.makePredefinedQuantElementExpression(elem, "err", detector);
            query.push(new DataSourceParams(scanId, errExprId, ids.quantId, roiId, DataUnit.UNIT_DEFAULT));
          }
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
    this.reDraw();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  reDraw() {
    //this.mdl.needsDraw$.next();
  }

  get interactionHandler() {
    return this.toolhost;
  }

  onNodes() {}
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

  get threshold(): number {
    return this.mdl.threshold;
  }

  onChangeThreshold(value: SliderValue) {
    this.mdl.threshold = value.value;

    if (value.finish) {
      this.reDraw();
    }
  }

  get correlationDisplayMode(): ChordDrawMode {
    return this.mdl.drawMode;
  }

  onToggleCorrelationDisplayMode(mode: ChordDrawMode) {
    this.mdl.drawMode = mode;
    this.reDraw();
  }

  get showSelectionOnly(): boolean {
    return this.mdl.drawForSelection;
  }

  onToggleShowSelectionOnly() {
    this.mdl.drawForSelection = !this.mdl.drawForSelection;
  }
}
