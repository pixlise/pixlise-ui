import { Component, OnInit, OnDestroy } from "@angular/core";
import {
  BaseWidgetModel,
  LiveExpression,
} from "src/app/modules/widget/models/base-widget.model";
import {
  DefaultExpressions,
  AnalysisLayoutService,
  DataSourceParams,
  DataUnit,
  RegionDataResults,
  SelectionService,
  SimpleReferencePickerComponent,
  SnackbarService,
  WidgetDataService,
  WidgetKeyItem,
} from "src/app/modules/pixlisecore/pixlisecore.module";
import { catchError, first, Observable, Subscription, tap } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { BinaryChartDrawer } from "./binary-drawer";
import {
  CanvasDrawer,
  CanvasInteractionHandler,
} from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { BinaryChartModel, BinaryDrawModel } from "./binary-model";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import {
  ROIPickerComponent,
  ROIPickerData,
  ROIPickerResponse,
} from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { Point } from "src/app/models/Geometry";
import { InteractionWithLassoHover } from "../../base/interaction-with-lasso-hover";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasMouseEventId } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import {
  ExpressionPickerData,
  ExpressionPickerComponent,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { VisibleROI, BinaryState } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import {
  APIDataService,
  ReferencePickerData,
  ReferencePickerResponse,
} from "src/app/modules/pixlisecore/pixlisecore.module";
import { BinaryChartExporter } from "src/app/modules/scatterplots/widgets/binary-chart-widget/binary-chart-exporter";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { NaryChartModel } from "../../base/model";
import { RGBA } from "../../../../utils/colours";
import { DataExpressionId } from "../../../../expression-language/expression-id";
import { ScanItem } from "src/app/generated-protos/scan";
import { WidgetExportOption } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { ObjectChangeMonitor } from "src/app/modules/pixlisecore/models/object-change-monitor";
import {
  ObjectChange,
  ObjectChangeMonitorService,
} from "src/app/modules/pixlisecore/services/object-change-monitor.service";
import {
  ReferenceDataListReq,
  ReferenceDataListResp,
} from "../../../../generated-protos/references-msgs";
import { ReferenceData } from "src/app/generated-protos/references";

class BinaryChartToolHost extends InteractionWithLassoHover {
  private _activeTool: string = "lasso";
  private _temporaryTool: string | null = null;
  private _lastPanPoint: Point | null = null;

  constructor(
    private _binMdl: BinaryChartModel,
    selectionService: SelectionService
  ) {
    super(_binMdl, selectionService);
  }

  setActiveTool(tool: string): void {
    this._activeTool = tool;
  }

  getCurrentTool(): string {
    return this._temporaryTool || this._activeTool;
  }

  protected resetHover(): void {
    this._binMdl.hoverPoint = null;
    this._binMdl.hoverPointData = null;
    this._binMdl.hoverReferenceData = null;
    this._binMdl.mouseLassoPoints = [];
  }

  protected isOverDataArea(canvasPt: Point): boolean {
    return this._binMdl.drawModel.axisBorder.containsPoint(canvasPt);
  }

  override keyEvent(event: any): any {
    // Handle Shift key for temporary pan activation
    if (event.key === "Shift") {
      if (event.down) {
        this._temporaryTool = "pan";
      } else {
        this._temporaryTool = null;
      }
      return 1; // CanvasInteractionResult.redrawAndCatch
    }

    return super.keyEvent(event);
  }

  override mouseEvent(event: any): any {
    const currentTool = this.getCurrentTool();

    // Handle scroll wheel zoom
    if (event.eventId == CanvasMouseEventId.MOUSE_WHEEL) {
      return this.handleScrollZoom(event);
    }

    // Handle panning for pan tool
    if (currentTool === "pan" && this.isOverDataArea(event.canvasPoint)) {
      const panResult = this.handlePanning(event);
      if (panResult !== 0) {
        // If panning handled the event
        return panResult;
      }
    }

    // Handle mouse move events to check for reference hover and set cursor
    if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      // First check if we're hovering over a reference point
      const hoverReference = this._binMdl.getReferenceAtPoint(
        event.canvasPoint
      );

      if (hoverReference) {
        // Set reference hover state
        this._binMdl.hoverReferenceData = hoverReference;
        this._binMdl.hoverPoint = null;
        this._binMdl.hoverPointData = null;
        this._binMdl.needsDraw$.next();
        return 1; // CanvasInteractionResult.redrawAndCatch equivalent
      } else {
        // Clear reference hover and use default behavior
        this._binMdl.hoverReferenceData = null;
      }
    }

    // For non-pan tools, use the base class behavior first
    let result;
    if (currentTool !== "pan") {
      result = super.mouseEvent(event);
    } else {
      result = 0; // CanvasInteractionResult.neither for pan tool
    }

    // Set cursor based on mouse position AFTER base class to prevent override
    if (event.eventId == CanvasMouseEventId.MOUSE_MOVE) {
      this.updateCursorForPosition(event.canvasPoint);
    }

    return result;
  }

  private handleScrollZoom(event: any): number {
    if (!this._binMdl.drawModel.xAxis || !this._binMdl.drawModel.yAxis) {
      return 0; // CanvasInteractionResult.neither
    }

    const zoomFactor = 1 - event.deltaY / 100;
    const mousePoint = event.canvasPoint;

    // Determine if we're zooming X or Y axis based on mouse position
    const axisBorder = this._binMdl.drawModel.axisBorder;

    // If mouse is over the Y axis area (left of data area), zoom Y only
    if (mousePoint.x < axisBorder.x) {
      this.zoomYAxis(zoomFactor, mousePoint);
    }
    // If mouse is over the X axis area (below data area), zoom X only
    else if (mousePoint.y > axisBorder.y + axisBorder.h) {
      this.zoomXAxis(zoomFactor, mousePoint);
    }
    // If mouse is over the data area, zoom both axes
    else if (this.isOverDataArea(mousePoint)) {
      this.zoomXAxis(zoomFactor, mousePoint);
      this.zoomYAxis(zoomFactor, mousePoint);
    }

    return 1; // CanvasInteractionResult.redrawAndCatch
  }

  private zoomXAxis(zoomFactor: number, mousePoint: Point): void {
    const xAxis = this._binMdl.drawModel.xAxis;
    if (!xAxis) return;

    const currentRange = this._binMdl.xAxisZoomRange;
    const currentMin = currentRange.min || this._binMdl.xAxisMinMax.min || 0;
    const currentMax = currentRange.max || this._binMdl.xAxisMinMax.max || 1;
    const currentSpan = currentMax - currentMin;

    // Calculate the mouse position as a percentage of the current range
    const mouseValue = xAxis.canvasToValue(mousePoint.x);
    const mousePct = (mouseValue - currentMin) / currentSpan;

    // Calculate new range
    const newSpan = currentSpan / zoomFactor;
    const newMin = mouseValue - newSpan * mousePct;
    const newMax = mouseValue + newSpan * (1 - mousePct);

    // Clamp to original data bounds
    const dataMin = this._binMdl.xAxisMinMax.min || 0;
    const dataMax = this._binMdl.xAxisMinMax.max || 1;

    this._binMdl.selectedMinXValue = Math.max(newMin, dataMin);
    this._binMdl.selectedMaxXValue = Math.min(newMax, dataMax);

    this._binMdl.recalculate();
    this._binMdl.needsCanvasResize$.next();
  }

  private zoomYAxis(zoomFactor: number, mousePoint: Point): void {
    const yAxis = this._binMdl.drawModel.yAxis;
    if (!yAxis) return;

    const currentRange = this._binMdl.yAxisZoomRange;
    const currentMin = currentRange.min || this._binMdl.yAxisMinMax.min || 0;
    const currentMax = currentRange.max || this._binMdl.yAxisMinMax.max || 1;
    const currentSpan = currentMax - currentMin;

    // Calculate the mouse position as a percentage of the current range
    const mouseValue = yAxis.canvasToValue(mousePoint.y);
    const mousePct = (mouseValue - currentMin) / currentSpan;

    // Calculate new range
    const newSpan = currentSpan / zoomFactor;
    const newMin = mouseValue - newSpan * mousePct;
    const newMax = mouseValue + newSpan * (1 - mousePct);

    // Clamp to original data bounds
    const dataMin = this._binMdl.yAxisMinMax.min || 0;
    const dataMax = this._binMdl.yAxisMinMax.max || 1;

    this._binMdl.selectedMinYValue = Math.max(newMin, dataMin);
    this._binMdl.selectedMaxYValue = Math.min(newMax, dataMax);

    this._binMdl.recalculate();
    this._binMdl.needsCanvasResize$.next();
  }

  private handlePanning(event: any): number {
    // Start tracking on mouse down
    if (event.eventId == CanvasMouseEventId.MOUSE_DOWN) {
      this._lastPanPoint = new Point(event.canvasPoint.x, event.canvasPoint.y);
      return 1; // CanvasInteractionResult.redrawAndCatch
    }

    // Handle dragging - adjust zoom ranges directly
    if (event.eventId == CanvasMouseEventId.MOUSE_DRAG && this._lastPanPoint) {
      const currentPoint = new Point(event.canvasPoint.x, event.canvasPoint.y);
      const dragX = currentPoint.x - this._lastPanPoint.x;
      const dragY = currentPoint.y - this._lastPanPoint.y;

      this.panByPixels(dragX, dragY);

      // Update our tracking point
      this._lastPanPoint = currentPoint;
      return 1; // CanvasInteractionResult.redrawAndCatch
    }

    // Finish panning on mouse up
    if (event.eventId == CanvasMouseEventId.MOUSE_UP && this._lastPanPoint) {
      this._lastPanPoint = null;
      return 1; // CanvasInteractionResult.redrawAndCatch
    }

    return 0; // CanvasInteractionResult.neither
  }

  private panByPixels(dragX: number, dragY: number): void {
    const xAxis = this._binMdl.drawModel.xAxis;
    const yAxis = this._binMdl.drawModel.yAxis;
    if (!xAxis || !yAxis) return;

    // Convert pixel drag to value changes
    const xValueDrag = xAxis.canvasToValue(dragX) - xAxis.canvasToValue(0);
    const yValueDrag = yAxis.canvasToValue(dragY) - yAxis.canvasToValue(0);

    // Get current zoom ranges
    const currentXRange = this._binMdl.xAxisZoomRange;
    const currentYRange = this._binMdl.yAxisZoomRange;

    // Calculate new ranges by shifting by the drag amount
    const newMinX = (currentXRange.min || 0) - xValueDrag;
    const newMaxX = (currentXRange.max || 1) - xValueDrag;
    const newMinY = (currentYRange.min || 0) - yValueDrag;
    const newMaxY = (currentYRange.max || 1) - yValueDrag;

    // Clamp to original data bounds
    const dataMinX = this._binMdl.xAxisMinMax.min || 0;
    const dataMaxX = this._binMdl.xAxisMinMax.max || 1;
    const dataMinY = this._binMdl.yAxisMinMax.min || 0;
    const dataMaxY = this._binMdl.yAxisMinMax.max || 1;

    // Apply clamping while maintaining range size
    const xRangeSize = newMaxX - newMinX;
    const yRangeSize = newMaxY - newMinY;

    let clampedMinX = Math.max(newMinX, dataMinX);
    let clampedMaxX = Math.min(newMaxX, dataMaxX);
    if (clampedMaxX - clampedMinX < xRangeSize) {
      if (clampedMinX === dataMinX) {
        clampedMaxX = Math.min(clampedMinX + xRangeSize, dataMaxX);
      } else {
        clampedMinX = Math.max(clampedMaxX - xRangeSize, dataMinX);
      }
    }

    let clampedMinY = Math.max(newMinY, dataMinY);
    let clampedMaxY = Math.min(newMaxY, dataMaxY);
    if (clampedMaxY - clampedMinY < yRangeSize) {
      if (clampedMinY === dataMinY) {
        clampedMaxY = Math.min(clampedMinY + yRangeSize, dataMaxY);
      } else {
        clampedMinY = Math.max(clampedMaxY - yRangeSize, dataMinY);
      }
    }

    // Update the zoom ranges
    this._binMdl.selectedMinXValue = clampedMinX;
    this._binMdl.selectedMaxXValue = clampedMaxX;
    this._binMdl.selectedMinYValue = clampedMinY;
    this._binMdl.selectedMaxYValue = clampedMaxY;

    this._binMdl.recalculate();
    this._binMdl.needsCanvasResize$.next();
  }

  private updateCursorForPosition(mousePoint: Point): void {
    if (!this._binMdl.drawModel.xAxis || !this._binMdl.drawModel.yAxis) {
      this._binMdl.cursorShown = CursorId.defaultPointer;
      return;
    }

    const currentTool = this.getCurrentTool();
    const axisBorder = this._binMdl.drawModel.axisBorder;

    const yAxisZone =
      mousePoint.x >= 0 &&
      mousePoint.x < axisBorder.x &&
      mousePoint.y >= axisBorder.y &&
      mousePoint.y <= axisBorder.y + axisBorder.h;

    const xAxisZone =
      mousePoint.y > axisBorder.y + axisBorder.h &&
      mousePoint.x >= axisBorder.x &&
      mousePoint.x <= axisBorder.x + axisBorder.w;

    // If pan tool is active and we're over data area, show pan cursor
    if (currentTool === "pan" && this.isOverDataArea(mousePoint)) {
      this._binMdl.cursorShown = CursorId.panCursor;
    }
    // Show axis scaling cursors over axis areas
    else if (yAxisZone) {
      this._binMdl.cursorShown = CursorId.resizeVerticalCursor;
    } else if (xAxisZone) {
      this._binMdl.cursorShown = CursorId.resizeHorizontalCursor;
    }
    // Show lasso cursor over data area for lasso tool
    else if (this.isOverDataArea(mousePoint)) {
      this._binMdl.cursorShown = CursorId.lassoCursor;
    } else {
      this._binMdl.cursorShown = CursorId.defaultPointer;
    }
  }
}

@Component({
  standalone: false,
  selector: "binary-chart-widget",
  templateUrl: "./binary-chart-widget.component.html",
  styleUrls: ["./binary-chart-widget.component.scss"],
})
export class BinaryChartWidgetComponent
  extends BaseWidgetModel
  implements OnInit, OnDestroy
{
  mdl = new BinaryChartModel(new BinaryDrawModel());
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;
  exporter: BinaryChartExporter;

  scanId: string = "";
  quantId: string = "";
  activeTool: string = "lasso"; // Default tool is lasso selection

  private _subs = new Subscription();

  private _selectionModes: string[] = [
    NaryChartModel.SELECT_SUBTRACT,
    NaryChartModel.SELECT_RESET,
    NaryChartModel.SELECT_ADD,
  ];
  private _selectionMode: string = NaryChartModel.SELECT_RESET;

  private _objChangeMonitor = new ObjectChangeMonitor();

  private _allReferences: ReferenceData[] = [];
  private _referenceIds: string[] = [];

  axisLabelFontSize = 14;

  // Slider properties
  yAxisSliderLength: number = 120;
  xAxisSliderLength: number = 200;

  constructor(
    public dialog: MatDialog,
    private _selectionService: SelectionService,
    private _widgetData: WidgetDataService,
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService,
    private _objChangeService: ObjectChangeMonitorService,
    private _apiDataService: APIDataService
  ) {
    super();

    this.drawer = new BinaryChartDrawer(this.mdl);
    this.toolhost = new BinaryChartToolHost(this.mdl, this._selectionService);
    this.exporter = new BinaryChartExporter(
      this._snackService,
      this.drawer,
      this.transform,
      this._widgetId
    );

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
          settingTitle: "Regions",
          settingGroupTitle: "Data",
          settingIcon: "assets/button-icons/roi.svg",
        },
        {
          id: "zoom-reset",
          type: "button",
          icon: "assets/button-icons/zoom-all-arrows.svg",
          tooltip: "Reset Zoom",
          onClick: () => this.onResetZoom(),
          settingTitle: "Reset Zoom",
          settingGroupTitle: "Zoom",
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
      topLeftInsetButton: {
        id: "selection",
        type: "selection-changer",
        tooltip: "Selection changer",
        onClick: () => {},
      },
      topRightInsetButton: {
        id: "key",
        value: this.mdl.keyItems,
        type: "widget-key",
        onClick: () => this.onToggleKey(),
        onUpdateKeyItems: (keyItems: WidgetKeyItem[]) => {
          this.mdl.keyItems = keyItems;
          this.update();
        },
      },
    };
  }

  private setInitialConfig() {
    this.scanId =
      this.scanId || this._analysisLayoutService.defaultScanId || "";
    this.quantId =
      this.quantId ||
      this._analysisLayoutService.getQuantIdForScan(this.scanId) ||
      "";

    if (this.scanId.length > 0 && this.quantId.length > 0) {
      this._analysisLayoutService
        .makeExpressionList(this.scanId, 2)
        .subscribe((exprs: DefaultExpressions) => {
          this.mdl.expressionIds = exprs.exprIds;

          this.mdl.dataSourceIds.set(
            this.scanId,
            new ScanDataIds(exprs.quantId, [
              PredefinedROIID.getAllPointsForScan(this.scanId),
            ])
          );
          this.update();
        });
    }
  }

  get xAxisSwitcher(): ScatterPlotAxisInfo | null {
    return this.mdl.raw?.xAxisInfo || null;
  }

  get yAxisSwitcher(): ScatterPlotAxisInfo | null {
    return this.mdl.raw?.yAxisInfo || null;
  }

  override injectExpression(liveExpression: LiveExpression) {
    this.scanId = liveExpression.scanId;
    this.quantId = liveExpression.quantId;

    this._analysisLayoutService
      .makeExpressionList(this.scanId, 2, this.quantId)
      .subscribe((exprs: DefaultExpressions) => {
        if (exprs.exprIds.length > 0) {
          this.mdl.expressionIds = [
            liveExpression.expressionId,
            exprs.exprIds[0],
          ];
        }

        this.mdl.dataSourceIds.set(
          this.scanId,
          new ScanDataIds(exprs.quantId, [
            PredefinedROIID.getAllPointsForScan(this.scanId),
          ])
        );
        this.update();
      });
  }

  private update() {
    this.isWidgetDataLoading = true;
    if (this.mdl.expressionIds.length !== 2) {
      this._snackService.openError(
        "Expected 2 expression ids for Binary, got " +
          this.mdl.expressionIds.length
      );
      this.isWidgetDataLoading = false;
      return;
    }

    const unit = this.mdl.showMmol ? DataUnit.UNIT_MMOL : DataUnit.UNIT_DEFAULT;
    const query: DataSourceParams[] = [];

    // NOTE: setData depends on the order of the following for loops...
    for (const [scanId, ids] of this.mdl.dataSourceIds) {
      for (const roiId of ids.roiIds) {
        for (const exprId of this.mdl.expressionIds) {
          query.push(
            new DataSourceParams(scanId, exprId, ids.quantId, roiId, unit)
          );
        }
      }
    }

    this._widgetData
      .getData(query)
      .pipe(first())
      .subscribe({
        next: (data) => {
          // If we've got maps we're subscribed for, listen to the memo service for changes to those
          this._objChangeMonitor.checkExpressionResultObjectsUsed(data);

          this.setData(data).pipe(first()).subscribe();
        },
        error: (err) => {
          this.setData(new RegionDataResults([], err))
            .pipe(first())
            .subscribe();
        },
      });
  }

  private setData(data: RegionDataResults): Observable<ScanItem[]> {
    return this._analysisLayoutService.availableScans$.pipe(
      tap((scans) => {
        const errs = this.mdl.setData(data, scans);
        if (errs.length > 0) {
          for (const err of errs) {
            this._snackService.openError(err.message, err.description);
          }
        }

        if (this.widgetControlConfiguration.topRightInsetButton) {
          this.widgetControlConfiguration.topRightInsetButton.value =
            this.mdl.keyItems;
        }

        this.isWidgetDataLoading = false;
      }),
      catchError((err) => {
        this._snackService.openError("Failed to set data", `${err}`);
        return [];
      })
    );
  }

  ngOnInit() {
    if (this.mdl) {
      this.mdl.exportMode = this._exportMode;
    }

    this.exporter = new BinaryChartExporter(
      this._snackService,
      this.drawer,
      this.transform,
      this._widgetId
    );

    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        this.mdl.handleHoverPointChanged(
          this._selectionService.hoverScanId,
          this._selectionService.hoverEntryPMC
        );
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe(
        (sel: SelectionHistoryItem) => {
          this.mdl.handleSelectionChange(sel.beamSelection);
        }
      )
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(
        (screenConfiguration) => {
          let updated = false;
          if (screenConfiguration) {
            if (screenConfiguration.scanConfigurations) {
              // Update all existing data source ids with the new quant id for the scan
              Object.entries(screenConfiguration.scanConfigurations).forEach(
                ([scanId, scanConfig]) => {
                  if (this.mdl.dataSourceIds.has(scanId)) {
                    const dataSource = this.mdl.dataSourceIds.get(scanId);
                    this.scanId = scanId;
                    if (dataSource?.quantId !== scanConfig.quantId) {
                      this.mdl.dataSourceIds.set(
                        scanId,
                        new ScanDataIds(
                          scanConfig.quantId,
                          dataSource?.roiIds || []
                        )
                      );
                      updated = true;
                    }
                  }
                }
              );
            }

            this.mdl.dataSourceIds.forEach((config, scanId) => {
              if (screenConfiguration?.scanConfigurations?.[scanId]?.colour) {
                if (this._roiService.displaySettingsMap$.value[scanId]) {
                  const newColour = RGBA.fromString(
                    screenConfiguration.scanConfigurations[scanId].colour
                  );
                  if (
                    this._roiService.displaySettingsMap$.value[scanId]
                      .colour !== newColour
                  ) {
                    updated = true;
                  }

                  this._roiService.displaySettingsMap$.value[scanId].colour =
                    newColour;
                } else {
                  this._roiService.displaySettingsMap$.value[scanId] = {
                    colour: RGBA.fromString(
                      screenConfiguration.scanConfigurations[scanId].colour
                    ),
                    shape: "circle",
                  };

                  updated = true;
                }

                this._roiService.displaySettingsMap$.next(
                  this._roiService.displaySettingsMap$.value
                );
              }
            });
          }

          if (updated) {
            this.update();
          }
        }
      )
    );

    this._apiDataService
      .sendReferenceDataListRequest(ReferenceDataListReq.create({}))
      .subscribe({
        next: (response: ReferenceDataListResp) => {
          if (response?.referenceData) {
            this._allReferences = response.referenceData;
            if (this._referenceIds.length > 0) {
              this.mdl.references = this._referenceIds
                .map((id) => this._allReferences.find((ref) => ref.id === id))
                .filter((ref) => ref !== undefined) as ReferenceData[];
              this.update();
            }
          }
        },
      });

    this._subs.add(
      this.widgetData$.subscribe((data: any) => {
        const binaryData: BinaryState = data as BinaryState;

        if (binaryData) {
          if (binaryData.expressionIDs) {
            this.mdl.expressionIds = binaryData.expressionIDs;
          }

          this.mdl.showMmol = binaryData.showMmol;

          // Load zoom ranges
          this.mdl.selectedMinXValue = binaryData.selectedMinXValue ?? null;
          this.mdl.selectedMaxXValue = binaryData.selectedMaxXValue ?? null;
          this.mdl.selectedMinYValue = binaryData.selectedMinYValue ?? null;
          this.mdl.selectedMaxYValue = binaryData.selectedMaxYValue ?? null;

          if (binaryData.referenceIds) {
            this._referenceIds = binaryData.referenceIds;
            if (this._allReferences.length > 0) {
              this.mdl.references = this._referenceIds
                .map((id) => this._allReferences.find((ref) => ref.id === id))
                .filter((ref) => ref !== undefined) as ReferenceData[];
            }
          }

          if (binaryData.visibleROIs) {
            this.mdl.dataSourceIds.clear();
            binaryData.visibleROIs.forEach((roi) => {
              if (!roi.scanId) {
                return;
              }

              if (this.mdl.dataSourceIds.has(roi.scanId)) {
                const dataSource = this.mdl.dataSourceIds.get(roi.scanId);
                dataSource!.roiIds.push(roi.id);
                this.mdl.dataSourceIds.set(roi.scanId, dataSource!);
              } else {
                const quantId = this._analysisLayoutService.getQuantIdForScan(
                  roi.scanId
                );
                this.mdl.dataSourceIds.set(
                  roi.scanId,
                  new ScanDataIds(quantId, [roi.id])
                );
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
      this._analysisLayoutService.expressionPickerResponse$.subscribe(
        (result: ExpressionPickerResponse | null) => {
          if (
            !result ||
            this._analysisLayoutService.highlightedWidgetId$.value !==
              this._widgetId
          ) {
            return;
          }

          if (result.selectedExpressions?.length > 0) {
            // If there are 1-3, set them all
            const last = Math.min(2, result.selectedExpressions.length);
            for (let i = 0; i < last; i++) {
              this.mdl.expressionIds[i % 2] = result.selectedExpressions[i].id;
            }
          } else if (result.selectedGroup?.groupItems?.length || 0 > 0) {
            const last = Math.min(2, result!.selectedGroup!.groupItems.length);
            for (let i = 0; i < last; i++) {
              this.mdl.expressionIds[i % 2] =
                result!.selectedGroup!.groupItems[i].expressionId;
            }
          } else {
            this._snackService.openError("No expressions to apply");
            return;
          }

          this.update();
          this.saveState();

          // Expression picker has closed, so we can stop highlighting this widget
          this._analysisLayoutService.highlightedWidgetId$.next("");
        }
      )
    );

    this._subs.add(
      this._roiService.displaySettingsMap$.subscribe((displaySettings) => {
        // Only update if we have the right expression count otherwise this will just trigger an error
        if (this.mdl.expressionIds.length === 2) {
          this.update();
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.spectrumSelectionWidgetTargetId$.subscribe(
        (targetId) => {
          // Add spectrum selection to expressions list and redraw
          if (
            targetId === this._widgetId &&
            this.mdl.expressionIds.length >= 2
          ) {
            this.mdl.expressionIds[1] =
              DataExpressionId.SpectrumSelectionExpression;
            this.update();
          }
        }
      )
    );

    this._subs.add(
      this._selectionService.chordClicks$.subscribe((exprIds: string[]) => {
        // Only update if we have the right expression count otherwise this will just trigger an error
        this.mdl.expressionIds = exprIds;
        this.update();
      })
    );

    this._subs.add(
      this._objChangeService.objectChanged$.subscribe(
        (change: ObjectChange) => {
          // If we're interested in any of these, call update!
          if (
            (change.mapName &&
              this._objChangeMonitor.isMapUsed(change.mapName)) ||
            (change.roiId && this._objChangeMonitor.isROIUsed(change.roiId))
          ) {
            console.log(
              "Binary Chart: Updating due to change " + change.toString()
            );
            this.update();
          }
        }
      )
    );

    // Set default tool to lasso selection
    this.onToolSelected("lasso");

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

  override getExportOptions(): WidgetExportDialogData {
    return this.exporter.getExportOptions(this.mdl);
  }

  override onExport(
    request: WidgetExportRequest
  ): Observable<WidgetExportData> {
    return this.exporter.onExport(this.mdl, request);
  }

  get selectionModes(): string[] {
    return this._selectionModes;
  }

  get currentSelectionMode(): string {
    return this._selectionMode;
  }

  onChangeSelectionMode(mode: string): void {
    // Check that it's one of the selected ones
    if (this._selectionModes.indexOf(mode) >= 0) {
      this._selectionMode = mode;

      // Set on our model too so interaction class can see it
      this.mdl.selectionMode = mode;
    }
  }

  onSoloView() {
    if (
      this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId
    ) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();

    let selectedIds: string[] = [];
    this.mdl.dataSourceIds.forEach((rois) => {
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

  onReferences() {
    const dialogConfig = new MatDialogConfig<ReferencePickerData>();
    dialogConfig.data = {
      widgetType: "binary-plot",
      widgetId: this._widgetId,
      allowEdit: true,
      requiredExpressions: this.mdl.expressionIds,
      selectedReferences: this.mdl.references,
    };

    const dialogRef = this.dialog.open(
      SimpleReferencePickerComponent,
      dialogConfig
    );
    dialogRef.afterClosed().subscribe((result: ReferencePickerResponse) => {
      if (result) {
        this.mdl.references = result.selectedReferences;
        this.update();
        this.saveState();
      }
    });
  }
  onToggleKey() {
    if (this.widgetControlConfiguration.topRightInsetButton) {
      this.widgetControlConfiguration.topRightInsetButton.value =
        this.mdl.keyItems;
    }
  }

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
        referenceIds: this.mdl.references.map((ref) => ref.id),
        selectedMinXValue: this.mdl.selectedMinXValue ?? undefined,
        selectedMaxXValue: this.mdl.selectedMaxXValue ?? undefined,
        selectedMinYValue: this.mdl.selectedMinYValue ?? undefined,
        selectedMaxYValue: this.mdl.selectedMaxYValue ?? undefined,
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
    this.update();
    this.saveState();
  }

  get selectModeExcludeROI(): boolean {
    return this.mdl.selectModeExcludeROI;
  }

  onToggleSelectModeExcludeROI() {
    this.mdl.selectModeExcludeROI = !this.mdl.selectModeExcludeROI;
  }

  // Range slider details for X axis
  get xRangeMin(): number {
    return this.mdl.xAxisMinMax.min || 0;
  }

  get xRangeMax(): number {
    return this.mdl.xAxisMinMax.max || 0;
  }

  get xRangeSelectedMin(): number {
    if (this.mdl.selectedMinXValue !== null) {
      return this.mdl.selectedMinXValue;
    }
    return this.xRangeMin;
  }

  get xRangeSelectedMax(): number {
    if (this.mdl.selectedMaxXValue !== null) {
      return this.mdl.selectedMaxXValue;
    }
    return this.xRangeMax;
  }

  // Range slider details for Y axis
  get yRangeMin(): number {
    return this.mdl.yAxisMinMax.min || 0;
  }

  get yRangeMax(): number {
    return this.mdl.yAxisMinMax.max || 0;
  }

  get yRangeSelectedMin(): number {
    if (
      this.mdl.selectedMinYValue !== null &&
      this.mdl.selectedMaxYValue !== null
    ) {
      return this.mdl.selectedMinYValue;
    }
    return this.yRangeMin;
  }

  get yRangeSelectedMax(): number {
    if (
      this.mdl.selectedMinYValue !== null &&
      this.mdl.selectedMaxYValue !== null
    ) {
      return this.mdl.selectedMaxYValue;
    }
    return this.yRangeMax;
  }

  onChangeXAxis(event: any): void {
    this.mdl.selectedMinXValue = event.minValue;
    this.mdl.selectedMaxXValue = event.maxValue;
    this.mdl.recalculate();
    this.mdl.needsCanvasResize$.next();
    this.saveState();
  }

  onChangeYAxis(event: any): void {
    // Invert Y axis values since chart Y axis increases upwards but slider works in screen coordinates
    // this.mdl.selectedMinYValue =
    //   this.yRangeMax - (event.maxValue - this.yRangeMin);
    // this.mdl.selectedMaxYValue =
    //   this.yRangeMax - (event.minValue - this.yRangeMin);
    this.mdl.selectedMinYValue = event.minValue;
    this.mdl.selectedMaxYValue = event.maxValue;
    this.mdl.recalculate();
    this.mdl.needsCanvasResize$.next();
    this.saveState();
  }

  onResetZoom(): void {
    this.mdl.resetZoom();
    this.saveState();
  }

  onToolSelected(tool: string): void {
    this.activeTool = tool;

    // Update toolbar button states
    if (this._widgetControlConfiguration.topToolbar) {
      this._widgetControlConfiguration.topToolbar.forEach((button) => {
        if (button.id === "pan") {
          button.value = button.id === tool;
        }
      });
    }

    // Update the tool host with the new active tool
    (this.toolhost as BinaryChartToolHost).setActiveTool(tool);
  }

  updateExportOptions(
    exportOptions: WidgetExportOption[],
    exportChartOptions: WidgetExportOption[]
  ) {
    const backgroundColorOption = exportOptions.find(
      (opt) => opt.id === "background"
    );
    const backgroundColor = backgroundColorOption
      ? backgroundColorOption.selectedOption
      : null;
    if (backgroundColor) {
      this.drawer.lightMode = ["white"].includes(backgroundColor);
      this.drawer.transparentBackground = backgroundColor === "transparent";
      this.mdl.recalculate();
    }

    const borderWidthOption = exportChartOptions.find(
      (opt) => opt.id === "borderWidth"
    );
    if (borderWidthOption) {
      this.drawer.borderWidth = isNaN(Number(borderWidthOption.value))
        ? 1
        : Number(borderWidthOption.value);
      this.mdl.borderWidth$.next(this.drawer.borderWidth);
      this.mdl.borderColor = borderWidthOption.colorPickerValue || "";
      this.mdl.drawModel.axisLineWidth = this.drawer.borderWidth;
      this.mdl.drawModel.axisLineColour = this.mdl.borderColor || "";
      this.reDraw();
    }

    const aspectRatioOption = exportOptions.find(
      (opt) => opt.id === "aspectRatio"
    );

    // If the aspect ratio option is set, we need to trigger a canvas resize on next frame render
    if (aspectRatioOption) {
      setTimeout(() => {
        this.mdl.needsCanvasResize$.next();
        this.reDraw();
      }, 0);
    }

    const resolutionOption = exportOptions.find(
      (opt) => opt.id === "resolution"
    );
    if (resolutionOption) {
      const resolutionMapping = {
        high: 3,
        med: 1.5,
        low: 1,
      };

      const newResolution = resolutionOption.selectedOption;
      if (
        newResolution &&
        resolutionMapping[newResolution as keyof typeof resolutionMapping]
      ) {
        this.mdl.resolution$.next(
          resolutionMapping[newResolution as keyof typeof resolutionMapping]
        );
      }
    }

    const labelsOption = exportChartOptions.find((opt) => opt.id === "labels");
    if (labelsOption) {
      this.axisLabelFontSize = isNaN(Number(labelsOption.value))
        ? 14
        : Number(labelsOption.value);
      this.mdl.axisLabelFontSize = this.axisLabelFontSize;
      this.mdl.drawModel.fontSize = Math.max(this.axisLabelFontSize - 2, 0);
    }

    const fontOption = exportChartOptions.find((opt) => opt.id === "font");
    if (fontOption) {
      this.mdl.axisLabelFontFamily = fontOption.selectedOption || "Arial";
      this.mdl.axisLabelFontColor = fontOption.colorPickerValue || "";
      this.mdl.drawModel.axisTextColour = this.mdl.axisLabelFontColor || "";
      this.mdl.drawModel.fontFamily = this.mdl.axisLabelFontFamily;
    }

    if (resolutionOption && aspectRatioOption) {
      if (aspectRatioOption.selectedOption === "square") {
        resolutionOption.dropdownOptions = [
          { id: "low", name: "500px x 500px" },
          { id: "med", name: "750px x 750px" },
          { id: "high", name: "1500px x 1500px" },
        ];
      } else if (aspectRatioOption.selectedOption === "4:3") {
        resolutionOption.dropdownOptions = [
          { id: "low", name: "666px x 500px" },
          { id: "med", name: "1000px x 750px" },
          { id: "high", name: "2000px x 1500px" },
        ];
      } else if (aspectRatioOption.selectedOption === "16:9") {
        resolutionOption.dropdownOptions = [
          { id: "low", name: "700px x 393px" },
          { id: "med", name: "750px x 422px" },
          { id: "high", name: "1500px x 844px" },
        ];
      }
    }

    this.reDraw();
  }
}
