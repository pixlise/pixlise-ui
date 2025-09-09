import { Component, OnInit, OnDestroy } from "@angular/core";
import { BaseWidgetModel, LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import { catchError, Observable, Subject, Subscription, switchMap, tap } from "rxjs";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";

import { TernaryChartDrawer } from "./ternary-drawer";
import { CanvasDrawer, CanvasInteractionHandler } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { TernaryChartModel, TernaryDrawModel } from "./ternary-model";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import {
  DefaultExpressions,
  AnalysisLayoutService,
  DataSourceParams,
  SelectionService,
  WidgetDataService,
  DataUnit,
  RegionDataResults,
  SnackbarService,
  WidgetKeyItem,
  ReferencePickerData,
  ReferencePickerResponse,
  SimpleReferencePickerComponent,
  APIDataService,
} from "src/app/modules/pixlisecore/pixlisecore.module";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { ROIPickerComponent, ROIPickerData, ROIPickerResponse } from "src/app/modules/roi/components/roi-picker/roi-picker.component";
import { ScatterPlotAxisInfo } from "../../components/scatter-plot-axis-switcher/scatter-plot-axis-switcher.component";
import { Point, Rect, ptWithinPolygon } from "src/app/models/Geometry";
import { InteractionWithLassoHover } from "../../base/interaction-with-lasso-hover";
import { CanvasMouseEventId, CanvasInteractionResult, CanvasMouseEvent } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import {
  ExpressionPickerComponent,
  ExpressionPickerData,
  ExpressionPickerResponse,
} from "src/app/modules/expressions/components/expression-picker/expression-picker.component";
import { TernaryState, VisibleROI } from "src/app/generated-protos/widget-data";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import {
  WidgetExportData,
  WidgetExportDialogData,
  WidgetExportOption,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { TernaryChartExporter } from "src/app/modules/scatterplots/widgets/ternary-chart-widget/ternary-chart-exporter";
import { NaryChartModel } from "../../base/model";
import { DataExpressionId } from "../../../../expression-language/expression-id";
import { ScanItem } from "src/app/generated-protos/scan";
import { RGBA } from "../../../../utils/colours";
import { ObjectChangeMonitor } from "src/app/modules/pixlisecore/models/object-change-monitor";
import { ObjectChange, ObjectChangeMonitorService } from "src/app/modules/pixlisecore/services/object-change-monitor.service";
import { ReferenceDataListReq, ReferenceDataListResp } from "../../../../generated-protos/references-msgs";
import { ReferenceData } from "src/app/generated-protos/references";

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
    this._terMdl.hoverReferenceData = null;
    this._terMdl.mouseLassoPoints = [];
  }

  protected isOverDataArea(canvasPt: Point): boolean {
    // If the mouse is over the triangle area, show a lasso cursor
    const triPts = [this._terMdl.drawModel.triangleA, this._terMdl.drawModel.triangleB, this._terMdl.drawModel.triangleC];
    const triBox: Rect = Rect.makeRect(this._terMdl.drawModel.triangleA, 0, 0);
    triBox.expandToFitPoints(triPts);

    return ptWithinPolygon(canvasPt, triPts, triBox);
  }

  override mouseEvent(event: CanvasMouseEvent): CanvasInteractionResult {
    if (event.eventId === CanvasMouseEventId.MOUSE_MOVE) {
      // Check for reference hover first
      const ref = this._terMdl.getReferenceAtPoint(event.canvasPoint);
      if (ref) {
        this._terMdl.hoverReferenceData = ref;
        this._terMdl.needsDraw$.next();
        return CanvasInteractionResult.redrawAndCatch;
      } else {
        // Clear reference hover if we had one
        if (this._terMdl.hoverReferenceData) {
          this._terMdl.hoverReferenceData = null;
          this._terMdl.needsDraw$.next();
        }
      }
    }

    // Call parent implementation for normal point handling
    return super.mouseEvent(event);
  }
}

@Component({
  standalone: false,
  selector: "ternary-chart-widget",
  templateUrl: "./ternary-chart-widget.component.html",
  styleUrls: ["./ternary-chart-widget.component.scss"],
})
export class TernaryChartWidgetComponent extends BaseWidgetModel implements OnInit, OnDestroy {
  mdl = new TernaryChartModel(new TernaryDrawModel());
  toolhost: CanvasInteractionHandler;
  drawer: CanvasDrawer;
  exporter: TernaryChartExporter;

  scanId: string = "";
  quantId: string = "";

  private _subs = new Subscription();
  private destroy$ = new Subject<void>();

  private _objChangeMonitor = new ObjectChangeMonitor();

  private _allReferences: ReferenceData[] = [];
  private _referenceIds: string[] = [];

  private _selectionModes: string[] = [NaryChartModel.SELECT_SUBTRACT, NaryChartModel.SELECT_RESET, NaryChartModel.SELECT_ADD];
  private _selectionMode: string = NaryChartModel.SELECT_RESET;

  displayModeOptions: string[] = ["Weight%", "Mmol"];

  axisLabelFontSize = 14;

  constructor(
    public dialog: MatDialog,
    private _selectionService: SelectionService,
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _widgetData: WidgetDataService,
    private _snackService: SnackbarService,
    private _objChangeService: ObjectChangeMonitorService,
    private _apiDataService: APIDataService
  ) {
    super();

    this.drawer = new TernaryChartDrawer(this.mdl);
    this.toolhost = new TernaryChartToolHost(this.mdl, this._selectionService);
    this.exporter = new TernaryChartExporter(this._snackService, this.drawer, this.transform, this._widgetId);

    this._widgetControlConfiguration = {
      topToolbar: [
        {
          id: "refs",
          type: "button",
          title: "Refs",
          tooltip: "Choose reference areas to display",
          onClick: () => this.onReferences(),
          settingTitle: "References",
          settingGroupTitle: "Data",
        },
        {
          id: "regions",
          type: "button",
          // title: "Regions",
          icon: "assets/button-icons/roi.svg",
          tooltip: "Choose regions to display",
          onClick: () => this.onRegions(),
          settingTitle: "Regions",
          settingGroupTitle: "Data",
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
        //style: { "margin-top": "24px" },
        onClick: () => {
          // Empty implementation
        },
      },
      topRightInsetButton: {
        id: "key",
        type: "widget-key",
        style: { "margin-top": "24px" },
        onClick: () => this.onToggleKey(),
        onUpdateKeyItems: (keyItems: WidgetKeyItem[]) => {
          this.mdl.keyItems = keyItems;
          this.update();
        },
      },
    };
  }

  private setInitialConfig() {
    this.scanId = this.scanId || this._analysisLayoutService.defaultScanId;
    this.quantId = this.quantId || this._analysisLayoutService.getQuantIdForScan(this.scanId) || "";

    if (this.scanId.length > 0 && this.quantId.length > 0) {
      this._analysisLayoutService.makeExpressionList(this.scanId, 3).subscribe((exprs: DefaultExpressions) => {
        this.mdl.expressionIds = exprs.exprIds;

        this.mdl.dataSourceIds.set(this.scanId, new ScanDataIds(exprs.quantId, [PredefinedROIID.getAllPointsForScan(this.scanId)]));
        this.update();
      });
    }
  }

  get displayMode(): string {
    return this.mdl.showMmol ? "Mmol" : "Weight%";
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

  updateExportOptions(exportOptions: WidgetExportOption[], exportChartOptions: WidgetExportOption[]) {
    const backgroundColorOption = exportOptions.find(opt => opt.id === "background");
    const backgroundColor = backgroundColorOption ? backgroundColorOption.selectedOption : null;
    if (backgroundColor) {
      this.drawer.lightMode = ["white"].includes(backgroundColor);
      this.drawer.transparentBackground = backgroundColor === "transparent";
    }

    const borderWidthOption = exportChartOptions.find(opt => opt.id === "borderWidth");
    if (borderWidthOption) {
      this.drawer.borderWidth = isNaN(Number(borderWidthOption.value)) ? 1 : Number(borderWidthOption.value);
      this.mdl.borderWidth$.next(this.drawer.borderWidth);
      this.mdl.borderColor = borderWidthOption.colorPickerValue || "";
      this.reDraw();
    }

    const aspectRatioOption = exportOptions.find(opt => opt.id === "aspectRatio");

    // If the aspect ratio option is set, we need to trigger a canvas resize on next frame render
    if (aspectRatioOption) {
      setTimeout(() => {
        this.mdl.needsCanvasResize$.next();
        this.reDraw();
      }, 0);
    }

    const resolutionOption = exportOptions.find(opt => opt.id === "resolution");
    if (resolutionOption) {
      const resolutionMapping = {
        high: 3,
        med: 1.5,
        low: 1,
      };

      const newResolution = resolutionOption.selectedOption;
      if (newResolution && resolutionMapping[newResolution as keyof typeof resolutionMapping]) {
        this.mdl.resolution$.next(resolutionMapping[newResolution as keyof typeof resolutionMapping]);
      }
    }

    const labelsOption = exportChartOptions.find(opt => opt.id === "labels");
    if (labelsOption) {
      this.axisLabelFontSize = isNaN(Number(labelsOption.value)) ? 14 : Number(labelsOption.value);
      this.mdl.axisLabelFontSize = this.axisLabelFontSize;
    }

    const fontOption = exportChartOptions.find(opt => opt.id === "font");
    if (fontOption) {
      this.mdl.axisLabelFontFamily = fontOption.selectedOption || "Arial";
      this.mdl.axisLabelFontColor = fontOption.colorPickerValue || "";
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

  private update() {
    this.isWidgetDataLoading = true;
    if (this.mdl.expressionIds.length !== 3) {
      this._snackService.openError("Expected 3 expression ids for Ternary, got: " + this.mdl.expressionIds.length);
      this.isWidgetDataLoading = false;
      return;
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

    this._widgetData
      .getData(query)
      .pipe(
        switchMap(data => {
          // If we've got maps we're subscribed for, listen to the memo service for changes to those
          this._objChangeMonitor.checkExpressionResultObjectsUsed(data);

          return this.setData(data);
        }),
        catchError(err => this.setData(new RegionDataResults([], err))),
        tap(() => {
          if (this.widgetControlConfiguration.topRightInsetButton) {
            this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
          }
          this.isWidgetDataLoading = false;
        })
      )
      .subscribe();
  }

  private setData(data: RegionDataResults): Observable<ScanItem[]> {
    return this._analysisLayoutService.availableScans$.pipe(
      tap(scans => {
        const errs = this.mdl.setData(data, scans);
        if (errs.length > 0) {
          for (const err of errs) {
            this._snackService.openError(err.message, err.description);
          }
        }

        if (this.widgetControlConfiguration.topRightInsetButton) {
          this.widgetControlConfiguration.topRightInsetButton.value = this.mdl.keyItems;
        }

        this.isWidgetDataLoading = false;
      }),
      catchError(err => {
        this._snackService.openError("Failed to set data", `${err}`);
        this.isWidgetDataLoading = false;
        return [];
      })
    );
  }

  ngOnInit() {
    if (this.mdl) {
      this.mdl.exportMode = this._exportMode;
    }

    this.exporter = new TernaryChartExporter(this._snackService, this.drawer, this.transform, this._widgetId);

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
                if (dataSource?.quantId !== scanConfig.quantId) {
                  this.mdl.dataSourceIds.set(scanId, new ScanDataIds(scanConfig.quantId, dataSource?.roiIds || []));
                  updated = true;
                }
              }
            });
          }

          this.mdl.dataSourceIds.forEach((config, scanId) => {
            if (screenConfiguration?.scanConfigurations?.[scanId]?.colour) {
              if (this._roiService.displaySettingsMap$.value[scanId]) {
                const newColour = RGBA.fromString(screenConfiguration.scanConfigurations[scanId].colour);
                if (this._roiService.displaySettingsMap$.value[scanId].colour !== newColour) {
                  updated = true;
                }

                this._roiService.displaySettingsMap$.value[scanId].colour = newColour;
              } else {
                this._roiService.displaySettingsMap$.value[scanId] = {
                  colour: RGBA.fromString(screenConfiguration.scanConfigurations[scanId].colour),
                  shape: "circle",
                };

                updated = true;
              }

              this._roiService.displaySettingsMap$.next(this._roiService.displaySettingsMap$.value);
            }
          });
        }

        if (updated) {
          this.update();
        }
      })
    );

    this._apiDataService.sendReferenceDataListRequest(ReferenceDataListReq.create({})).subscribe({
      next: (response: ReferenceDataListResp) => {
        if (response?.referenceData) {
          this._allReferences = response.referenceData;
          if (this._referenceIds.length > 0) {
            this.mdl.references = this._referenceIds.map(id => this._allReferences.find(ref => ref.id === id)).filter(ref => ref !== undefined) as ReferenceData[];
            this.update();
          }
        }
      },
    });

    this._subs.add(
      this.widgetData$.subscribe((data: unknown) => {
        const ternaryData: TernaryState = data as TernaryState;

        if (ternaryData) {
          if (ternaryData.expressionIDs) {
            this.mdl.expressionIds = ternaryData.expressionIDs;
          }

          this.mdl.showMmol = ternaryData.showMmol;

          if (ternaryData.referenceIds) {
            this._referenceIds = ternaryData.referenceIds;
            if (this._allReferences.length > 0) {
              this.mdl.references = this._referenceIds.map(id => this._allReferences.find(ref => ref.id === id)).filter(ref => ref !== undefined) as ReferenceData[];
            }
          }

          if (ternaryData.visibleROIs) {
            this.mdl.dataSourceIds.clear();
            ternaryData.visibleROIs.forEach(roi => {
              if (!roi.scanId) {
                return;
              }

              if (this.mdl.dataSourceIds.has(roi.scanId)) {
                const dataSource = this.mdl.dataSourceIds.get(roi.scanId);
                if (dataSource) {
                  dataSource.roiIds.push(roi.id);
                  this.mdl.dataSourceIds.set(roi.scanId, dataSource);
                }
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

        if (result.selectedExpressions?.length > 0) {
          // If there are 1-3, set them all
          const last = Math.min(3, result.selectedExpressions.length);
          for (let i = 0; i < last; i++) {
            this.mdl.expressionIds[i] = result.selectedExpressions[i].id;
          }
        } else if (result.selectedGroup?.groupItems && result.selectedGroup.groupItems.length > 0) {
          const last = Math.min(3, result.selectedGroup.groupItems.length);
          for (let i = 0; i < last; i++) {
            this.mdl.expressionIds[i] = result.selectedGroup.groupItems[i].expressionId;
          }
        } else {
          this._snackService.openError("No expressions to apply");
          return;
        }

        this.update();
        this.saveState();

        // Expression picker has closed, so we can stop highlighting this widget
        this._analysisLayoutService.highlightedWidgetId$.next("");
      })
    );

    this._subs.add(
      this._roiService.displaySettingsMap$.subscribe(() => {
        // Only update if we have the right expression count otherwise this will just trigger an error
        if (this.mdl.expressionIds.length == 3) {
          this.update();
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.spectrumSelectionWidgetTargetId$.subscribe(targetId => {
        // Add spectrum selection to expressions list and redraw
        if (targetId === this._widgetId && this.mdl.expressionIds.length >= 3) {
          this.mdl.expressionIds[2] = DataExpressionId.SpectrumSelectionExpression;
          this.update();
        }
      })
    );

    this._subs.add(
      this._objChangeService.objectChanged$.subscribe((change: ObjectChange) => {
        // If we're interested in any of these, call update!
        if ((change.mapName && this._objChangeMonitor.isMapUsed(change.mapName)) || (change.roiId && this._objChangeMonitor.isROIUsed(change.roiId))) {
          console.log("Ternary Chart: Updating due to change " + change.toString());
          this.update();
        }
      })
    );

    this.reDraw();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this._subs.unsubscribe();
  }

  override injectExpression(liveExpression: LiveExpression) {
    this.scanId = liveExpression.scanId;
    this.quantId = liveExpression.quantId;

    this._analysisLayoutService.makeExpressionList(this.scanId, 3, this.quantId).subscribe((exprs: DefaultExpressions) => {
      if (exprs.exprIds.length > 0) {
        this.mdl.expressionIds = [liveExpression.expressionId, ...exprs.exprIds.slice(0, 2)];
      }

      this.mdl.dataSourceIds.set(this.scanId, new ScanDataIds(exprs.quantId, [PredefinedROIID.getAllPointsForScan(this.scanId)]));
      this.update();
    });
  }

  reDraw() {
    this.mdl.needsDraw$.next();
  }

  get scanConfigurations(): Record<string, ScanConfiguration> {
    return this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations ?? {};
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

  override onExport(request: WidgetExportRequest): Observable<WidgetExportData> {
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
    if (this._analysisLayoutService.soloViewWidgetId$.value === this._widgetId) {
      this._analysisLayoutService.soloViewWidgetId$.next("");
    } else {
      this._analysisLayoutService.soloViewWidgetId$.next(this._widgetId);
    }
  }

  onRegions() {
    const dialogConfig = new MatDialogConfig<ROIPickerData>();

    const selectedIds: string[] = [];
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
          const quantId = this._analysisLayoutService.getQuantIdForScan(scanId);

          // // If we already have a data source for this scan, keep the quant id
          // const existingSource = this.mdl.dataSourceIds.get(scanId);
          // if (existingSource && existingSource.quantId) {
          //   quantId = existingSource.quantId;
          // }
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
      widgetType: "ternary-plot",
      widgetId: this._widgetId,
      allowEdit: true,
      requiredExpressions: this.mdl.expressionIds,
      selectedReferences: this.mdl.references,
    };

    const dialogRef = this.dialog.open(SimpleReferencePickerComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((result: ReferencePickerResponse) => {
      if (result) {
        this.mdl.references = result.selectedReferences;
        this.update();
        this.saveState();
      }
    });
  }
  onToggleKey() {
    // Empty implementation
  }

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
        referenceIds: this.mdl.references.map(ref => ref.id),
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
    dialogConfig.hasBackdrop = false;
    dialogConfig.data = {
      widgetType: "ternary-plot",
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

  onCornerClick(corner: string): void {
    this.openExpressionPicker(corner);
  }

  get showMmol(): boolean {
    return this.mdl.showMmol;
  }

  toggleShowMmol() {
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
}
