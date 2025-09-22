import {
  Component,
  OnInit,
  ComponentRef,
  ElementRef,
  HostListener,
  ViewChild,
  ViewContainerRef,
  Input,
  OnDestroy,
  AfterContentInit,
  ChangeDetectorRef,
} from "@angular/core";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";

import { catchError, map, Observable, Subscription, switchMap, tap, throwError } from "rxjs";

import {
  WIDGETS,
  WidgetConfiguration,
  WidgetControlConfiguration,
  WidgetToolbarButtonConfiguration,
  WidgetType,
  getWidgetComponent,
} from "src/app/modules/widget/models/widgets.model";
import { LiveExpression } from "src/app/modules/widget/models/base-widget.model";
import {  WidgetExportData, WidgetExportDialogData, WidgetExportOption } from "src/app/modules/widget/components/widget-export-dialog/widget-export-model";
import { WidgetExportDialogComponent } from "src/app/modules/widget/components/widget-export-dialog/widget-export-dialog.component";

import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { WidgetData } from "src/app/generated-protos/widget-data";

import { PredefinedROIID } from "src/app/models/RegionOfInterest";

import { ScanDataIds } from "src/app/modules/pixlisecore/models/widget-data-source";
import { AnalysisLayoutService, WidgetSettingsMenuComponent } from "src/app/modules/pixlisecore/pixlisecore.module";
import { WidgetError } from "src/app/modules/pixlisecore/models/widget-data-source";

import EditorConfig from "src/app/modules/code-editor/models/editor-config";


const getWidgetOptions = (): WidgetConfiguration[] => {
  return Object.entries(WIDGETS).map(([id, value]) => ({ id: id as WidgetType, ...value }));
};

@Component({
  standalone: false,
  selector: "widget",
  templateUrl: "./widget.component.html",
  styleUrls: ["./widget.component.scss"],
})
export class WidgetComponent implements OnInit, OnDestroy, AfterContentInit {
  private _subs: Subscription = new Subscription();

  @ViewChild("currentWidget", { read: ViewContainerRef }) currentWidget!: ViewContainerRef;
  private _currentWidgetRef: ComponentRef<any> | null = null;
  private _copyConfigActive: boolean = false;

  @ViewChild("buttonsContainer") buttonsContainer!: ElementRef;

  @ViewChild("topToolbar") topToolbar!: ElementRef;
  @ViewChild("bottomToolbar") bottomToolbar!: ElementRef;

  @ViewChild("topLeftInset") topLeftInset!: ElementRef;
  @ViewChild("topCenterInset") topCenterInset!: ElementRef;
  @ViewChild("topRightInset") topRightInset!: ElementRef;

  @ViewChild("bottomLeftInset") bottomLeftInset!: ElementRef;
  @ViewChild("bottomRightInset") bottomRightInset!: ElementRef;

  @ViewChild("contextMenu") contextMenu!: ElementRef;
  @ViewChild("overflowSection") overflowSection!: ElementRef;

  @Input() widgetLayoutConfig!: WidgetLayoutConfiguration;
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

  isWidgetDataLoading: boolean = true;
  isWidgetDataError: boolean = false;
  widgetDataErrorMessage: string = "";

  private _exportDialogOpen: boolean = false;

  showTopToolbar: boolean = false;
  showBottomToolbar: boolean = false;

  settingsGroups: { title: string; buttons: WidgetToolbarButtonConfiguration[] }[] = [];

  contextMenuDialog: MatDialogRef<any> | null = null;

  topToolbarButtons: WidgetToolbarButtonConfiguration[] = [];
  bottomToolbarButtons: WidgetToolbarButtonConfiguration[] = [];
  topLeftInsetButton?: WidgetToolbarButtonConfiguration;
  topCenterInsetButton?: WidgetToolbarButtonConfiguration;
  topRightInsetButton?: WidgetToolbarButtonConfiguration;
  bottomLeftInsetButton?: WidgetToolbarButtonConfiguration;
  bottomRightInsetButton?: WidgetToolbarButtonConfiguration;

  private _exportOptions: WidgetExportOption[] = [];
  private _exportChartOptions: WidgetExportOption[] = [];
  private _exportMode: boolean = false;
  private _liveOptionChanges$ = new Observable<{
    options: WidgetExportOption[];
    dataProducts: WidgetExportOption[];
    chartOptions: WidgetExportOption[];
    keyOptions: WidgetExportOption[];
  }>();

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _dialog: MatDialog,
    private _changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Skip service subscriptions for preview widgets in export mode
    if (!this.exportMode) {
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
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  ngAfterContentInit() {
    if (!this._currentWidgetRef && !this._copyConfigActive) {
      setTimeout(() => this.loadWidget(), 0);
    }
  }

  get exportMode() {
    return this._exportMode;
  }

  @Input() set exportMode(exportMode: boolean) {
    this._exportMode = exportMode;
    if (this._currentWidgetRef?.instance?._exportMode !== undefined) {
      this._currentWidgetRef.instance._exportMode = exportMode;
    }
  }

  @HostListener("window:resize", [])
  onResize() {
    this.hideOverflowedButtons();
  }

  updateShowTopToolbar() {
    const topToolbar = this.widgetConfiguration?.controlConfiguration?.topToolbar;
    this.showTopToolbar = !!(topToolbar && topToolbar.length > 0);
  }

  updateShowBottomToolbar() {
    const bottomToolbar = this.widgetConfiguration?.controlConfiguration?.bottomToolbar;
    this.showBottomToolbar = !!(bottomToolbar && bottomToolbar.length > 0);
  }

  initOverflowState() {
    const buttonsContainerWidth = this.buttonsContainer?.nativeElement?.offsetWidth || 0;
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

    this.updateButtons();
    this._changeDetector.detectChanges();
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

    this.updateButtons();
  }

  get settingsMenu() {
    return this._currentWidgetRef?.instance?.settingsMenu;
  }

  get activeWidget() {
    return this._activeWidget;
  }

  set activeWidget(widget: WidgetType) {
    this._activeWidget = widget;
    // Don't update layout service if this is a preview widget (export mode)
    if (!this.exportMode) {
      this._analysisLayoutService.updateActiveLayoutWidgetType(this.widgetLayoutConfig.id, this.layoutIndex, widget);
    }
    this.loadWidget();
  }

  @Input() set liveOptionChanges$(liveOptionChanges$: Observable<any>) {
    this._liveOptionChanges$ = liveOptionChanges$;
    this._subs.add(
      this._liveOptionChanges$.subscribe(changes => {
        if (changes.options) {
          this._exportOptions = changes.options;
        }

        if (changes.chartOptions) {
          this._exportChartOptions = changes.chartOptions;
        }

        this._updateWidgetExportOptions();
      })
    );
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

  onContextMenu(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Close the context menu dialog if it is open
    if (this.contextMenuDialog) {
      this.contextMenuDialog.close();
    }

    // Create a temporary element to serve as the overlay origin
    const tempElement = document.createElement("div");
    tempElement.style.position = "fixed";
    tempElement.style.top = `${event.clientY}px`;
    tempElement.style.left = `${event.clientX}px`;
    document.body.appendChild(tempElement);

    // Open widget-settings-menu component
    this.contextMenuDialog = this._dialog.open(WidgetSettingsMenuComponent, {
      panelClass: "widget-context-menu-panel",
      backdropClass: "widget-context-menu-backdrop",
      hasBackdrop: false,
      position: {
        top: `${event.clientY}px`,
        left: `${event.clientX + 205}px`,
      },
    });

    // Inject settingsDialog into the dialog
    setTimeout(() => {
      if (this.contextMenuDialog?.componentInstance) {
        this.contextMenuDialog.componentInstance.settingsDialog = this.settingsMenu;
        this.contextMenuDialog.componentInstance.overflowSection = this.overflowSection;
        this.contextMenuDialog.componentInstance.noPadding = true;
        this.contextMenuDialog.componentInstance.triggerOpen = true;
        this.contextMenuDialog.componentInstance._overlayOrigin = { nativeElement: tempElement };
      }
    }, 100);

    // Clean up the temporary element when the dialog closes
    this.contextMenuDialog.afterClosed().subscribe(() => {
      document.body.removeChild(tempElement);
    });
  }

  @Input() set exportOptions(exportOptions: WidgetExportOption[]) {
    this._exportOptions = exportOptions;
    this._updateWidgetExportOptions();
  }

  @Input() set exportChartOptions(exportChartOptions: WidgetExportOption[]) {
    this._exportChartOptions = exportChartOptions;
    this._updateWidgetExportOptions();
  }

  private _updateWidgetExportOptions() {
    if (this._currentWidgetRef?.instance?.updateExportOptions) {
      this._currentWidgetRef.instance.updateExportOptions(this._exportOptions, this._exportChartOptions);
    }
  }

  groupButtonsBySettingGroupTitle(buttons: WidgetToolbarButtonConfiguration[]) {
    const groups: { title: string; buttons: WidgetToolbarButtonConfiguration[] }[] = [];
    buttons.forEach(button => {
      if (button.settingGroupTitle) {
        const group = groups.find(group => group.title === button.settingGroupTitle);
        if (group) {
          group.buttons.push(button);
        } else {
          groups.push({ title: button.settingGroupTitle, buttons: [button] });
        }
      }
    });

    return groups;
  }

  updateButtons() {
    this.updateShowBottomToolbar();
    this.updateShowTopToolbar();

    this.topToolbarButtons = this.widgetConfiguration?.controlConfiguration?.topToolbar || [];
    this.bottomToolbarButtons = this.widgetConfiguration?.controlConfiguration?.bottomToolbar || [];
    this.topLeftInsetButton = this.widgetConfiguration?.controlConfiguration?.topLeftInsetButton;
    this.topCenterInsetButton = this.widgetConfiguration?.controlConfiguration?.topCenterInsetButton;
    this.topRightInsetButton = this.widgetConfiguration?.controlConfiguration?.topRightInsetButton;
    this.bottomLeftInsetButton = this.widgetConfiguration?.controlConfiguration?.bottomLeftInsetButton;
    this.bottomRightInsetButton = this.widgetConfiguration?.controlConfiguration?.bottomRightInsetButton;

    this.settingsGroups = this.groupButtonsBySettingGroupTitle([...this.topToolbarButtons, ...this.bottomToolbarButtons]);
  }

  private copyConfiguration(): Observable<WidgetConfiguration> {
    return getWidgetComponent(this.activeWidget).pipe(
      map(widgetComp => {
        const widgetCfg = WIDGETS[this.activeWidget as WidgetType];
        widgetCfg.widgetComponent = widgetComp;
        return widgetCfg;
      })
    );
  }

  onOpenExport() {
    if (!this._currentWidgetRef?.instance?.getExportOptions || !this._currentWidgetRef?.instance?.onExport || this._exportDialogOpen) {
      return;
    }

    const dialogConfig = new MatDialogConfig<WidgetExportDialogData>();
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
      setTimeout(() => {
        this.loadWidget();
      }, 0);
    });
  }

  get widgetKeyItems() {
    if (!this._currentWidgetRef?.instance) {
      return [];
    }

    if (this._currentWidgetRef.instance.keyItems) {
      return this._currentWidgetRef.instance.keyItems;
    }

    if (this._currentWidgetRef.instance.mdl?.keyItems) {
      return this._currentWidgetRef.instance.mdl.keyItems;
    }

    return [];
  }
  

  loadWidget() {
    if (this._currentWidgetRef) {
      this._currentWidgetRef.destroy();
      this._currentWidgetRef = null;
    }

    this._copyConfigActive = true;
    this.copyConfiguration().subscribe((widgetConfig: WidgetConfiguration) => {
      this.widgetConfiguration = widgetConfig;

      if (!this.widgetConfiguration!.widgetComponent || !this.currentWidget) {
        console.warn("Widget component or container not found");
        this._copyConfigActive = false;
        return;
      }

      this._currentWidgetRef = this.currentWidget?.createComponent(this.widgetConfiguration!.widgetComponent);
      this._copyConfigActive = false;

      if (this._currentWidgetRef?.instance) {
        // Set the widget id
        this._currentWidgetRef.instance._widgetId = this.widgetLayoutConfig.id;
        this._currentWidgetRef.instance._ref = this._currentWidgetRef;
        this._currentWidgetRef.instance._isWidgetHighlighted = this.isWidgetHighlighted;
        this._currentWidgetRef.instance._exportMode = this.exportMode;

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

        if (this._currentWidgetRef.instance.onSaveWidgetData && !this.exportMode) {
          this._subs.add(
            this._currentWidgetRef.instance.onSaveWidgetData.subscribe((widgetData: any) => {
              if (!this.widgetLayoutConfig.id || this.widgetLayoutConfig.id === EditorConfig.previewWidgetId || this.exportMode) {
                // Don't save if the widget id is not set, if it's a preview widget, or if it's in export mode
                return;
              }

              const data = this.widgetLayoutConfig.data || WidgetData.create({ id: this.widgetLayoutConfig.id });
              if (this.widgetConfiguration?.dataKey) {
                data[this.widgetConfiguration.dataKey] = widgetData;
                this._analysisLayoutService.writeWidgetData(data);
              }
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

      this._changeDetector.detectChanges();
    });
  }
}
