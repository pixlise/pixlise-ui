import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CanvasInteractionHandler, CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel } from "src/app/modules/widget/models/base-widget.model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { DataSourceParams, DataUnit, RegionDataResults, SelectionService, SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIPickerComponent, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ChordDiagramModel, ChordDrawMode } from "./chord-model";
import { ChordDiagramDrawer } from "./chord-drawer";
import { ChordDiagramInteraction } from "./chord-interaction";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { Colours } from "src/app/utils/colours";
import { SliderValue } from "src/app/modules/pixlisecore/components/atoms/slider/slider.component";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { ChordState, VisibleROI } from "src/app/generated-protos/widget-data";
import {
  ExpressionPickerData,
  ExpressionPickerComponent,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { RegionOfInterestGetReq, RegionOfInterestGetResp } from "src/app/generated-protos/roi-msgs";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";

@Component({
  selector: "app-chord-diagram-widget",
  templateUrl: "./chord-diagram-widget.component.html",
  styleUrls: ["./chord-diagram-widget.component.scss"],
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
    private _selectionService: SelectionService,
    private _snackService: SnackbarService,
    private _cachedDataService: APICachedDataService,
    private _analysisLayoutService: AnalysisLayoutService
  ) {
    super();

    this.drawer = new ChordDiagramDrawer(this.mdl);
    this.toolhost = new ChordDiagramInteraction(this.mdl, this._selectionService);

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
    const scanId = this._analysisLayoutService.defaultScanId;
    if (scanId.length > 0) {
      let quantId = ""; // TODO: get this!

      if (quantId.length <= 0) {
        // default to pseudo intensities
        this.mdl.expressionIds = [
          DataExpressionId.makePredefinedPseudoIntensityExpression("Mg"),
          DataExpressionId.makePredefinedPseudoIntensityExpression("Na"),
          DataExpressionId.makePredefinedPseudoIntensityExpression("Ca"),
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
        const chordData: ChordState = data as ChordState;

        if (chordData) {
          if (chordData.expressionIDs) {
            this.mdl.expressionIds = chordData.expressionIDs;
          }

          this.mdl.threshold = chordData.threshold;
          this.mdl.drawMode = chordData.drawMode as ChordDrawMode;
          this.mdl.drawForSelection = chordData.showForSelection;

          // Get the ROI to work out the scan id... this will be retrieved soon anyway...
          if (chordData.displayROI) {
            this._cachedDataService.getRegionOfInterest(RegionOfInterestGetReq.create({ id: chordData.displayROI })).subscribe((resp: RegionOfInterestGetResp) => {
              if (resp.regionOfInterest) {
                let quantId = this._analysisLayoutService.getQuantIdForScan(resp.regionOfInterest.scanId);
                this.mdl.dataSourceIds.set(resp.regionOfInterest.scanId, new ScanDataIds(quantId, [chordData.displayROI]));
              }
            });
          } else {
            this.update();
          }
        } else {
          this.setInitialConfig();
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.expressionPickerResponse$.subscribe((result: ExpressionPickerResponse | null) => {
        if (result && result.selectedExpressions && this._analysisLayoutService.highlightedWidgetId$.value === this._widgetId) {
          this.mdl.expressionIds = [];

          for (const expr of result.selectedExpressions) {
            this.mdl.expressionIds.push(expr.id);
          }

          this.update();
          this.saveState();

          // Expression picker has closed, so we can stop highlighting this widget
          this._analysisLayoutService.highlightedWidgetId$.next("");
        }
      })
    );

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

  onNodes() {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;
    dialogConfig.data = {
      widgetType: "chord",
      widgetId: this._widgetId,
      scanId: this._analysisLayoutService.defaultScanId,
      quantId: this.mdl.dataSourceIds.get(this._analysisLayoutService.defaultScanId)?.quantId || "",
      selectedIds: this.mdl.expressionIds || [],
    };

    this.isWidgetHighlighted = true;
    this.dialog.open(ExpressionPickerComponent, dialogConfig);
  }
  onSoloView() {}

  private saveState(): void {
    const visibleROIs: VisibleROI[] = [];

    for (const [scanId, item] of this.mdl.dataSourceIds.entries()) {
      for (const roiId of item.roiIds) {
        visibleROIs.push(VisibleROI.create({ id: roiId, scanId: scanId }));
      }
    }

    this.onSaveWidgetData.emit(
      ChordState.create({
        expressionIDs: this.mdl.expressionIds,
        displayROI: visibleROIs[0].id,
        threshold: this.mdl.threshold,
        drawMode: this.mdl.drawMode,
        showForSelection: this.mdl.drawForSelection,
      })
    );
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

        // Should ONLY be one ROI
        if (result.selectedROISummaries.length > 1) {
          alert("Too many ROIs, must select only one");
          return;
        }

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

  get threshold(): number {
    return this.mdl.threshold;
  }

  onChangeThreshold(value: SliderValue) {
    this.mdl.threshold = value.value;

    if (value.finish) {
      this.reDraw();
      this.saveState();
    }
  }

  get correlationDisplayMode(): ChordDrawMode {
    return this.mdl.drawMode;
  }

  onToggleCorrelationDisplayMode(mode: ChordDrawMode) {
    this.mdl.drawMode = mode;
    this.reDraw();
    this.saveState();
  }

  get showSelectionOnly(): boolean {
    return this.mdl.drawForSelection;
  }

  onToggleShowSelectionOnly() {
    this.mdl.drawForSelection = !this.mdl.drawForSelection;
    this.saveState();
  }
}
