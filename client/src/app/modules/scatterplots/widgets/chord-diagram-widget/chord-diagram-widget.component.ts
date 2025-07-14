import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { CanvasInteractionHandler, CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BaseWidgetModel, LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import {
  DefaultExpressions,
  AnalysisLayoutService,
  DataSourceParams,
  DataUnit,
  RegionDataResults,
  SelectionService,
  SnackbarService,
  WidgetDataService,
} from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
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
import { ROIService } from "src/app/modules/roi/services/roi.service";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportRequest,
  WidgetExportFile,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { Observable } from "rxjs";

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

  scanId: string = "";
  quantId: string = "";

  private _subs = new Subscription();

  correlationDisplayModes = [ChordDrawMode.NEGATIVE, ChordDrawMode.BOTH, ChordDrawMode.POSITIVE];

  // For settings menu items:
  stateNames = [ChordDrawMode.NEGATIVE, ChordDrawMode.BOTH, ChordDrawMode.POSITIVE];
  sliderTrackColourYellow = Colours.YELLOW.asString();
  sliderTrackColourGray = Colours.GRAY_50.asString();

  constructor(
    public dialog: MatDialog,
    private _widgetData: WidgetDataService,
    private _selectionService: SelectionService,
    private _snackService: SnackbarService,
    private _roiService: ROIService,
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
          settingTitle: "Nodes",
          settingGroupTitle: "Data",
          settingIcon: "assets/chart-placeholders/chord-diagram.svg",
        },
        {
          id: "regions",
          type: "button",
          title: "Regions",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
          settingTitle: "Regions",
          settingGroupTitle: "Data",
          settingIcon: "assets/button-icons/roi.svg",
        },
        {
          id: "divider",
          type: "divider",
          onClick: () => null,
        },
        {
          id: "solo",
          type: "button",
          icon: "assets/button-icons/widget-solo.svg",
          tooltip: "Toggle Solo View",
          onClick: () => this.onSoloView(),
          settingTitle: "Solo",
          settingGroupTitle: "Actions",
        },
        {
          id: "export",
          type: "button",
          icon: "assets/button-icons/export.svg",
          tooltip: "Export Data",
          onClick: () => this.onExportWidgetData.emit(),
          settingTitle: "Export / Download",
          settingGroupTitle: "Actions",
        },
      ],
    };
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
            this._roiService.loadROI(chordData.displayROI, true).subscribe({
              next: roiItem => {
                if (roiItem) {
                  this.scanId = roiItem.scanId;
                  let quantId = this._analysisLayoutService.getQuantIdForScan(this.scanId);
                  this.mdl.dataSourceIds.set(this.scanId, new ScanDataIds(quantId, [chordData.displayROI]));
                  this.update();
                }
              },
              error: err => {
                console.error("Error getting ROI", err);
              },
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

  private setInitialConfig() {
    this.scanId = this.scanId || this._analysisLayoutService.defaultScanId || "";
    this.quantId = this.quantId || this._analysisLayoutService.getQuantIdForScan(this.scanId) || "";
    this._analysisLayoutService.makeExpressionList(this.scanId, 8).subscribe((exprs: DefaultExpressions) => {
      this.mdl.expressionIds = exprs.exprIds;

      this.mdl.dataSourceIds.set(this.scanId, new ScanDataIds(exprs.quantId, [PredefinedROIID.getAllPointsForScan(this.scanId)]));
      this.update();
    });
  }

  override injectExpression(liveExpression: LiveExpression) {
    this.scanId = liveExpression.scanId;
    this.quantId = liveExpression.quantId;

    this._analysisLayoutService.makeExpressionList(this.scanId, 8, this.quantId).subscribe((exprs: DefaultExpressions) => {
      if (exprs.exprIds.length > 0) {
        this.mdl.expressionIds = [liveExpression.expressionId, ...exprs.exprIds.slice(0, 7)];
      }

      this.mdl.dataSourceIds.set(this.scanId, new ScanDataIds(exprs.quantId, [PredefinedROIID.getAllPointsForScan(this.scanId)]));
      this.update();
    });
  }

  private update() {
    this.isWidgetDataLoading = true;
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

        this.isWidgetDataLoading = false;
      },
      error: err => {
        this.setData(new RegionDataResults([], err));

        this.isWidgetDataLoading = false;
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

  reDraw() {
    //this.mdl.needsDraw$.next();
  }

  get interactionHandler() {
    return this.toolhost;
  }

  onNodes() {
    const dialogConfig = new MatDialogConfig<ExpressionPickerData>();
    dialogConfig.hasBackdrop = false;

    let scanId = this._analysisLayoutService.defaultScanId;

    dialogConfig.data = {
      widgetType: "chord-diagram",
      widgetId: this._widgetId,
      scanId: scanId,
      quantId: this._analysisLayoutService.getQuantIdForScan(scanId) || "",
      selectedIds: this.mdl.expressionIds || [],
    };

    this.isWidgetHighlighted = true;
    this.dialog.open(ExpressionPickerComponent, dialogConfig);
  }

  onSoloView() {
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  private saveState(): void {
    const visibleROIs: VisibleROI[] = [];

    for (const [scanId, item] of this.mdl.dataSourceIds.entries()) {
      for (const roiId of item.roiIds) {
        visibleROIs.push(VisibleROI.create({ id: roiId, scanId: scanId }));
      }
    }

    let roiId = visibleROIs[0]?.id;
    if (!roiId && this.scanId) {
      roiId = PredefinedROIID.getAllPointsForScan(this.scanId);
    }

    this.onSaveWidgetData.emit(
      ChordState.create({
        expressionIDs: this.mdl.expressionIds,
        displayROI: roiId,
        threshold: this.mdl.threshold,
        drawMode: this.mdl.drawMode,
        showForSelection: this.mdl.drawForSelection,
      })
    );
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();

    let selectedIds: string[] = [];
    this.mdl.dataSourceIds.forEach((ids, scanId) => {
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
          if (this.scanId !== roi.scanId) {
            this.scanId = roi.scanId;
          }
        }

        // Now fill in the data source ids using the above
        for (const [scanId, roiIds] of roisPerScan) {
          let quantId = this._analysisLayoutService.getQuantIdForScan(scanId);
          this.mdl.dataSourceIds.set(scanId, new ScanDataIds(quantId, roiIds));
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

    this.reDraw();
    this.update();

    if (value.finish) {
      this.saveState();
    }
  }

  get correlationDisplayMode(): ChordDrawMode {
    return this.mdl.drawMode;
  }

  onToggleCorrelationDisplayMode(mode: ChordDrawMode) {
    this.mdl.drawMode = mode;
    this.reDraw();
    this.update();
    this.saveState();
  }

  get showSelectionOnly(): boolean {
    return this.mdl.drawForSelection;
  }

  onToggleShowSelectionOnly() {
    this.mdl.drawForSelection = !this.mdl.drawForSelection;
    this.update();
    this.saveState();
  }

  override getExportOptions(): WidgetExportDialogData {
    return {
      title: "Export Chord Diagram",
      defaultZipName: "Chord Diagram Data",
      options: [],
      dataProducts: [
        {
          id: "chordData",
          name: "Chord Diagram Data .csv",
          type: "checkbox",
          description: "Export the chord diagram data as CSV",
          selected: true,
        },
      ],
      showPreview: false,
    };
  }

  override onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
    return new Observable<WidgetExportData>(observer => {
      const csvs: WidgetExportFile[] = [];
      if (request.dataProducts) {
        if (request.dataProducts["chordData"]?.selected) {
          csvs.push({
            fileName: `Chord Diagram Data.csv`,
            data: this.exportChordData(),
          });
        }
      }

      observer.next({ csvs });
      observer.complete();
    });
  }

  private exportChordData(): string {
    if (!this.mdl.raw || this.mdl.raw.length === 0) {
      return "No data available for export";
    }

    let csvData = "";

    // Create header row with node names
    const headerRow = ["Node", "Expression ID", "Value (%)", "Display Value", "Error Value", "Error Message"];
    // Add correlation columns for each node
    for (const node of this.mdl.raw) {
      headerRow.push(`Correlation with ${node.label}`);
    }
    csvData += headerRow.map(h => `"${h}"`).join(",") + "\n";

    // Add data rows
    for (const node of this.mdl.raw) {
      const rowData = [node.label, node.exprId, node.value.toFixed(6), node.displayValue.toFixed(6), node.errorValue.toFixed(6), node.errorMsg || ""];

      // Add correlation values for each node
      for (const chordValue of node.chords) {
        rowData.push(chordValue.toFixed(6));
      }

      csvData += rowData.map(cell => `"${cell}"`).join(",") + "\n";
    }

    return csvData;
  }
}
