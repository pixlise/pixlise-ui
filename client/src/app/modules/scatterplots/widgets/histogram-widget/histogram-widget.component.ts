import { Component, OnInit, OnDestroy } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CanvasDrawer, CanvasInteractionHandler } from "src/app/modules/analysis/components/widget/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel } from "src/app/modules/analysis/components/widget/models/base-widget.model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { DataSourceParams, DataUnit, RegionDataResults, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { HistogramModel } from "./histogram-model";
import { HistogramDrawer } from "./drawer";
import { HistogramToolHost } from "./histogram-interaction";
import { PanZoom } from "src/app/modules/analysis/components/widget/interactive-canvas/pan-zoom";
import { DataExpressionId } from "src/app/expression-language/expression-id";

@Component({
  selector: "histogram-widget",
  templateUrl: "./histogram-widget.component.html",
  styleUrls: ["./histogram-widget.component.scss", "../../base/widget-common.scss"],
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
    private _widgetData: WidgetDataService
  ) {
    super();

    this.setInitialConfig();

    this.drawer = new HistogramDrawer(this.mdl);
    const toolHost = new HistogramToolHost(this.mdl);

    this.toolhost = toolHost;

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
    this.mdl.expressionIds = [
      "vge9tz6fkbi2ha1p", // CaTi
      "fhb5x0qbx6lz9uec", // Dip (deg, B to A)
      DataExpressionId.makePredefinedQuantElementExpression("Ca", "%", "Combined"),
    ];

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

  get interactionHandler() {
    return this.toolhost;
  }

  onBars() {}
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
  onToggleKey() {}

  get showWhiskers(): boolean {
    return this.mdl.showWhiskers;
  }
  onToggleShowWhiskers() {
    this.mdl.showWhiskers = !this.mdl.showWhiskers;
  }

  get showStdError(): boolean {
    return this.mdl.showStdError;
  }
  toggleShowStdError() {
    this.mdl.showStdError = !this.mdl.showStdError;
  }

  get logScale(): boolean {
    return this.mdl.logScale;
  }
  onToggleLogScale() {
    this.mdl.logScale = !this.mdl.logScale;
  }
}