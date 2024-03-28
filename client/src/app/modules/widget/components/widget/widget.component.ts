import { Component, OnInit, ComponentRef, ElementRef, HostListener, ViewChild, ViewContainerRef, AfterViewChecked, Input, OnDestroy } from "@angular/core";
import { WIDGETS, WidgetConfiguration, WidgetControlConfiguration, WidgetType } from "../../models/widgets.model";
import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { WidgetData } from "src/app/generated-protos/widget-data";
import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { catchError, Observable, Subscription, switchMap, tap, throwError } from "rxjs";
import { LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import EditorConfig from "src/app/modules/code-editor/models/editor-config";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import {
  WidgetExportData,
  WidgetExportDialogComponent,
  WidgetExportDialogData,
  WidgetExportRequest,
} from "src/app/modules/widget/components/widget-export-dialog/widget-export-dialog.component";
import { WidgetError } from "src/app/modules/pixlisecore/services/widget-data.service";

const getWidgetOptions = (): WidgetConfiguration[] => {
  return Object.entries(WIDGETS).map(([id, value]) => ({ id: id as WidgetType, ...value }));
};

@Component({
  selector: "widget",
  templateUrl: "./widget.component.html",
  styleUrls: ["./widget.component.scss"],
})
export class WidgetComponent implements OnInit, OnDestroy, AfterViewChecked {
  private _subs: Subscription = new Subscription();

  @ViewChild("currentWidget", { read: ViewContainerRef }) currentWidget!: ViewContainerRef;
  private _currentWidgetRef: ComponentRef<any> | null = null;

  @ViewChild("buttonsContainer") buttonsContainer!: ElementRef;

  @ViewChild("topToolbar") topToolbar!: ElementRef;
  @ViewChild("bottomToolbar") bottomToolbar!: ElementRef;

  @ViewChild("topLeftInset") topLeftInset!: ElementRef;
  @ViewChild("topCenterInset") topCenterInset!: ElementRef;
  @ViewChild("topRightInset") topRightInset!: ElementRef;

  @ViewChild("bottomLeftInset") bottomLeftInset!: ElementRef;
  @ViewChild("bottomRightInset") bottomRightInset!: ElementRef;

  @Input() widgetLayoutConfig: WidgetLayoutConfiguration = WidgetLayoutConfiguration.create();
  @Input() layoutIndex: number = 0;
  @Input() disableSwitch: boolean = false;
  @Input() title: string = "";

  visibleTopToolbarCount: number = 0;

  isOverflowed: boolean = false;

  allWidgetOptions: WidgetConfiguration[] = getWidgetOptions();
  _activeWidget: WidgetType = "ternary-plot";

  widgetConfiguration?: WidgetConfiguration;

  isWidgetTargeted: boolean = false;

  isWidgetHighlighted: boolean = false;

  isWidgetDataLoading: boolean = false;
  isWidgetDataError: boolean = false;
  widgetDataErrorMessage: string = "";

  private _exportDialogOpen: boolean = false;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.resizeCanvas$.subscribe(() => {
        this.hideOverflowedButtons();
      })
    );

    this._subs.add(
      this._analysisLayoutService.highlightedWidgetId$.subscribe(highlightedWidgetId => {
        if (highlightedWidgetId && this.widgetLayoutConfig.id === highlightedWidgetId) {
          this.isWidgetHighlighted = true;
        } else if (this.isWidgetHighlighted) {
          this.isWidgetHighlighted = false;
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.targetWidgetIds$.subscribe(targetWidgetIds => {
        this.isWidgetTargeted = targetWidgetIds.has(this.widgetLayoutConfig.id);
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (!this._currentWidgetRef) {
      this.loadWidget();
    }
  }

  @HostListener("window:resize", [])
  onResize() {
    this.hideOverflowedButtons();
  }

  initOverflowState() {
    const buttonsContainerWidth = this.buttonsContainer.nativeElement.offsetWidth;
    let topToolbarWidth = 0;
    if (this.widgetConfiguration?.controlConfiguration?.topToolbar) {
      let overflowed = false;
      this.widgetConfiguration.controlConfiguration.topToolbar.forEach((button, index) => {
        const buttonWidth = button.maxWidth || 60;
        if (topToolbarWidth + buttonWidth < buttonsContainerWidth) {
          topToolbarWidth += buttonWidth;
          button._overflowed = false;
        } else {
          button._overflowed = true;
          overflowed = true;
          this.visibleTopToolbarCount = index;
        }
      });

      this.isOverflowed = overflowed;
    }
  }

  hideOverflowedButtons() {
    const buttonsContainerWidth = this.buttonsContainer?.nativeElement?.offsetWidth;
    const topToolbarWidth = this.topToolbar?.nativeElement?.offsetWidth;
    if (buttonsContainerWidth === undefined || topToolbarWidth === undefined) {
      return;
    }

    if (this.widgetConfiguration?.controlConfiguration?.topToolbar) {
      if (buttonsContainerWidth - topToolbarWidth <= 60 && this.visibleTopToolbarCount > 0) {
        this.visibleTopToolbarCount -= 1;
      } else {
        const firstOverflowed = this.widgetConfiguration.controlConfiguration.topToolbar[this.visibleTopToolbarCount];
        if (
          buttonsContainerWidth - topToolbarWidth > (firstOverflowed?.maxWidth || 100) &&
          this.visibleTopToolbarCount < this.widgetConfiguration?.controlConfiguration?.topToolbar?.length
        ) {
          {
            this.visibleTopToolbarCount += 1;
          }
        }
      }

      let overflowed = false;
      this.widgetConfiguration.controlConfiguration.topToolbar.forEach((button, index) => {
        if (index < this.visibleTopToolbarCount) {
          button._overflowed = false;
        } else {
          button._overflowed = true;
          overflowed = true;
        }
      });

      this.isOverflowed = overflowed;
    }
  }

  get settingsMenu() {
    return this._currentWidgetRef?.instance?.settingsMenu;
  }

  get activeWidget() {
    return this._activeWidget;
  }

  set activeWidget(widget: WidgetType) {
    this._activeWidget = widget;
    this._analysisLayoutService.updateActiveLayoutWidgetType(this.widgetLayoutConfig.id, this.layoutIndex, widget);
    this.loadWidget();
  }

  @Input() set widgetTypes(widgetTypes: WidgetType[]) {
    if (widgetTypes.length > 0) {
      this.allWidgetOptions = getWidgetOptions().filter(widgetOption => widgetTypes.includes(widgetOption.id as WidgetType));
    }
  }

  @Input() set initWidget(initWidget: string) {
    this._activeWidget = initWidget as WidgetType;
    this.loadWidget();
  }

  @Input() set liveExpression(liveExpression: LiveExpression) {
    if (!liveExpression) {
      return;
    }

    if (this._currentWidgetRef?.instance) {
      this._injectLiveExpression(liveExpression);
    } else {
      setTimeout(() => {
        this._injectLiveExpression(liveExpression);
      }, 1000);
    }
  }

  private _injectLiveExpression({ expressionId, scanId, quantId, expression }: LiveExpression) {
    if (this._currentWidgetRef?.instance?.injectExpression) {
      this._currentWidgetRef.instance.injectExpression({ expressionId, scanId, quantId, expression });
    } else {
      if (this._currentWidgetRef?.instance?.mdl?.expressionIds && this._currentWidgetRef?.instance?.mdl.dataSourceIds) {
        if (this._currentWidgetRef?.instance?.mdl.expressionIds.length > 0) {
          this._currentWidgetRef.instance.mdl.expressionIds[0] = expressionId;
        } else {
          this._currentWidgetRef.instance.mdl.expressionIds = [expressionId];
        }
        this._currentWidgetRef?.instance?.mdl.dataSourceIds.set(scanId, new ScanDataIds(quantId, [PredefinedROIID.getAllPointsForScan(scanId)]));
      }
      if (this._currentWidgetRef?.instance?.update) {
        this._currentWidgetRef?.instance?.update();
      }
    }
  }

  get topToolbarButtons() {
    return this.widgetConfiguration?.controlConfiguration?.topToolbar || [];
  }

  get bottomToolbarButtons() {
    return this.widgetConfiguration?.controlConfiguration?.bottomToolbar || [];
  }

  get topLeftInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.topLeftInsetButton;
  }

  get topCenterInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.topCenterInsetButton;
  }

  get topRightInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.topRightInsetButton;
  }

  get bottomLeftInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.bottomLeftInsetButton;
  }

  get bottomRightInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.bottomRightInsetButton;
  }

  copyConfiguration() {
    return {
      ...WIDGETS[this.activeWidget],
    };
  }

  onOpenExport() {
    if (!this._currentWidgetRef?.instance?.getExportOptions || !this._currentWidgetRef?.instance?.onExport || this._exportDialogOpen) {
      return;
    }

    let dialogConfig = new MatDialogConfig<WidgetExportDialogData>();
    dialogConfig.data = this._currentWidgetRef?.instance?.getExportOptions();
    const dialogRef = this._dialog.open(WidgetExportDialogComponent, dialogConfig);
    this._subs.add(
      dialogRef.componentInstance.requestExportData
        .pipe(
          switchMap(response => this._currentWidgetRef?.instance?.onExport(response)),
          tap(exportData => dialogRef.componentInstance.onDownload(exportData as WidgetExportData)),
          catchError(err => {
            if (dialogRef?.componentInstance?.onExportError) {
              dialogRef.componentInstance.onExportError(err);
            }
            return throwError(() => new WidgetError("Failed to export", err));
          })
        )
        .subscribe()
    );

    dialogRef.afterClosed().subscribe(() => {
      this._exportDialogOpen = false;
    });
  }

  loadWidget() {
    if (this._currentWidgetRef) {
      this._currentWidgetRef.destroy();
      this._currentWidgetRef = null;
    }

    this.widgetConfiguration = this.copyConfiguration();
    this._currentWidgetRef = this.currentWidget?.createComponent(this.widgetConfiguration!.component);

    if (this._currentWidgetRef?.instance) {
      // Set the widget id
      this._currentWidgetRef.instance._widgetId = this.widgetLayoutConfig.id;
      this._currentWidgetRef.instance._ref = this._currentWidgetRef;
      this._currentWidgetRef.instance._isWidgetHighlighted = this.isWidgetHighlighted;

      if (this._currentWidgetRef.instance.onUpdateWidgetControlConfiguration) {
        this._subs.add(
          this._currentWidgetRef.instance.onUpdateWidgetControlConfiguration.subscribe((config: WidgetControlConfiguration) => {
            this.widgetConfiguration!.controlConfiguration = config;
            this.initOverflowState();
          })
        );
      }

      if (this._currentWidgetRef.instance.onWidgetHighlight) {
        this._subs.add(
          this._currentWidgetRef.instance.onWidgetHighlight.subscribe((isWidgetHighlighted: boolean) => {
            this.isWidgetHighlighted = isWidgetHighlighted;
          })
        );
      }

      if (this._currentWidgetRef.instance.onWidgetLoading) {
        this._subs.add(
          this._currentWidgetRef.instance.onWidgetLoading.subscribe((isWidgetDataLoading: boolean) => {
            this.isWidgetDataError = false;
            this.widgetDataErrorMessage = "";
            this.isWidgetDataLoading = isWidgetDataLoading;
          })
        );
      }

      if (this._currentWidgetRef.instance.onWidgetDataErrorMessage) {
        this._subs.add(
          this._currentWidgetRef.instance.onWidgetDataErrorMessage.subscribe((widgetDataErrorMessage: string) => {
            this.isWidgetDataLoading = false;
            this.isWidgetDataError = !!widgetDataErrorMessage;
            this.widgetDataErrorMessage = widgetDataErrorMessage;
          })
        );
      }

      if (this._currentWidgetRef.instance.widgetData$) {
        // Set the widget data stored for this location
        this._currentWidgetRef.instance.widgetData$.next(this.widgetLayoutConfig.data?.[this.widgetConfiguration.dataKey]);
      }

      if (this._currentWidgetRef.instance.onSaveWidgetData) {
        this._subs.add(
          this._currentWidgetRef.instance.onSaveWidgetData.subscribe((widgetData: any) => {
            if (!this.widgetLayoutConfig.id || this.widgetLayoutConfig.id === EditorConfig.previewWidgetId) {
              // Don't save if the widget id is not set or if it's a preview widget
              return;
            }

            const data = this.widgetLayoutConfig.data || WidgetData.create({ id: this.widgetLayoutConfig.id });
            data[this.widgetConfiguration!.dataKey] = widgetData;
            this._analysisLayoutService.writeWidgetData(data);
          })
        );
      }

      if (this._currentWidgetRef.instance.onExportWidgetData) {
        this._subs.add(
          this._currentWidgetRef.instance.onExportWidgetData.subscribe(() => {
            this.onOpenExport();
          })
        );
      }
    }
  }
}
