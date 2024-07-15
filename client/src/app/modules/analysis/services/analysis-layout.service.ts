import { Injectable, OnDestroy } from "@angular/core";
import { SIDEBAR_ADMIN_SHORTCUTS, SIDEBAR_TABS, SIDEBAR_VIEWS, SidebarTabItem, SidebarViewShortcut } from "../models/sidebar.model";
import { BehaviorSubject, Observable, ReplaySubject, Subscription, map, of, timer } from "rxjs";
import { ActivatedRoute, Router } from "@angular/router";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanListReq } from "src/app/generated-protos/scan-msgs";
import { ScanItem } from "src/app/generated-protos/scan";
import { APIDataService, SelectionService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { QuantGetReq, QuantGetResp, QuantListReq } from "src/app/generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ScreenConfigurationGetReq, ScreenConfigurationWriteReq } from "src/app/generated-protos/screen-configuration-msgs";
import { FullScreenLayout, ScreenConfiguration } from "src/app/generated-protos/screen-configuration";
import { createDefaultScreenConfiguration, WidgetReference } from "../models/screen-configuration.model";
import { WidgetData } from "src/app/generated-protos/widget-data";
import { WidgetDataGetReq, WidgetDataWriteReq } from "src/app/generated-protos/widget-data-msgs";
import { WSError } from "../../pixlisecore/services/wsMessageHandler";
import { ResponseStatus } from "src/app/generated-protos/websocket";
import { ExpressionPickerResponse } from "../../expressions/components/expression-picker/expression-picker.component";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { HighlightedContextImageDiffraction, HighlightedDiffraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/model";
import EditorConfig from "src/app/modules/code-editor/models/editor-config";
import { HighlightedROIs } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/roi-tab/roi-tab.component";
import { WIDGETS } from "src/app/modules/widget/models/widgets.model";
import { isFirefox } from "src/app/utils/utils";
import { QuantDeleteReq } from "../../../generated-protos/quantification-management-msgs";
import { TabLinks } from "../../../models/TabLinks";

export class DefaultExpressions {
  constructor(
    public exprIds: string[],
    public quantId: string
  ) {}
}

export type NavigationTab = {
  icon: string;
  label?: string;
  tooltip?: string;
  url: string;
  params?: Record<string, string>;
  active?: boolean;
  passQueryParams?: boolean;
};

@Injectable({
  providedIn: "root",
})
export class AnalysisLayoutService implements OnDestroy {
  private _subs = new Subscription();
  private _resizeCanvas$ = new ReplaySubject<void>(1);

  sidepanelOpen$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  sidebarTabs: SidebarTabItem[] = SIDEBAR_TABS;
  sidebarViewShortcuts: SidebarViewShortcut[] = SIDEBAR_VIEWS;
  sidebarAdminShortcuts: SidebarViewShortcut[] = SIDEBAR_ADMIN_SHORTCUTS;

  private _activeTab: SidebarTabItem | null = null;
  showSearch = true;

  availableScanQuants$ = new BehaviorSubject<Record<string, QuantificationSummary[]>>({});
  availableScans$ = new BehaviorSubject<ScanItem[]>([]);

  activeScreenConfigurationId$ = new BehaviorSubject<string>("");
  activeScreenConfiguration$ = new BehaviorSubject<ScreenConfiguration>(createDefaultScreenConfiguration());
  activeScreenConfigurationTabs$ = new BehaviorSubject<NavigationTab[]>([
    { icon: "assets/tab-icons/browse.svg", label: "Browse", tooltip: "Browse", url: TabLinks.browse },
    { icon: "assets/tab-icons/analysis.svg", label: "Analysis", tooltip: "Analysis", url: TabLinks.analysis, params: { tab: "0" } },
    { icon: "assets/tab-icons/code-editor.svg", label: "Code Editor", tooltip: "Code Editor", url: TabLinks.codeEditor },
    { icon: "assets/tab-icons/element-maps.svg", label: "Element Maps", tooltip: "Element Maps", url: TabLinks.maps },
  ]);
  activeScreenConfigWidgetReferences$ = new BehaviorSubject<WidgetReference[]>([]);

  screenConfigurations$ = new BehaviorSubject<Map<string, ScreenConfiguration>>(new Map());

  soloViewWidgetId$ = new BehaviorSubject<string>("");

  targetWidgetIds$ = new BehaviorSubject<Set<string>>(new Set());
  highlightedWidgetId$ = new BehaviorSubject<string>("");
  expressionPickerResponse$ = new BehaviorSubject<ExpressionPickerResponse | null>(null);

  highlightedDiffractionWidget$ = new BehaviorSubject<HighlightedDiffraction | null>(null);
  highlightedContextImageDiffractionWidget$ = new BehaviorSubject<HighlightedContextImageDiffraction | null>(null);

  // For now this will just be for the context image, but we may want to expand it to other widgets
  highlightedROIs$ = new BehaviorSubject<HighlightedROIs | null>(null);

  widgetData$ = new BehaviorSubject<Map<string, WidgetData>>(new Map());

  lastLoadedScreenConfigurationId: string = "";

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService,
    private _snackService: SnackbarService,
    private _selectionService: SelectionService
  ) {
    this.fetchAvailableScans();
    this.fetchLastLoadedScreenConfigurationId();
    if (this.defaultScanId) {
      this.fetchQuantsForScan(this.defaultScanId);
    }

    // Subscribe to query params - has to be done from the constructor here since OnInit doesn't fire on Injectables
    this._subs.add(
      this._route.queryParams.subscribe(params => {
        if (params["id"]) {
          this.fetchScreenConfiguration(params["id"]);
        } else if (params["scan_id"]) {
          this.loadScreenConfigurationFromScan(params["scan_id"]);
          this.fetchQuantsForScan(params["scan_id"]);
        } else {
          if (this.lastLoadedScreenConfigurationId) {
            this.fetchScreenConfiguration(this.lastLoadedScreenConfigurationId, "", true, false); // Don't show snack for fail in this case, the last loaded screen config might not make sense any more
            // Add id back to query params
            const queryParams = { ...this._route.snapshot.queryParams };
            queryParams["id"] = this.lastLoadedScreenConfigurationId;
            if (queryParams["id"] && (this._route?.snapshot?.url || []).length > 0) {
              this._router.navigate([this._route.snapshot.url], { queryParams });
            }
          }
          this.activeScreenConfigurationId$.next("");
          this.activeScreenConfiguration$.next(createDefaultScreenConfiguration());
        }
      })
    );

    this._subs.add(
      this.activeScreenConfiguration$.subscribe(config => {
        if (config) {
          let widgetCounts = new Map<string, number>();
          let widgetReferences: WidgetReference[] = [];

          config.layouts.forEach((layout, i) => {
            layout.widgets.forEach(widget => {
              const count = (widgetCounts.get(widget.type) || 0) + 1;
              widgetCounts.set(widget.type, count);

              const widgetTypeName = WIDGETS[widget.type as keyof typeof WIDGETS].name;
              const pageSuffix = config.layouts.length > 1 ? ` (page ${i + 1})` : "";
              let widgetName = `${widgetTypeName} ${count}${pageSuffix}`;
              widgetReferences.push({ widget, name: widgetName, type: widget.type, page: i });
            });
          });

          widgetReferences = widgetReferences.map(widgetReference => {
            const instanceCount = widgetCounts.get(widgetReference.widget.type);
            if (instanceCount !== 1) {
              return widgetReference;
            }

            // If there's only one instance of this widget type, don't include the count in the name
            const widgetTypeName = WIDGETS[widgetReference.widget.type as keyof typeof WIDGETS].name;
            const pageSuffix = config.layouts.length > 1 ? ` (page ${widgetReference.page + 1})` : "";
            const widgetName = `${widgetTypeName}${pageSuffix}`;
            return { ...widgetReference, name: widgetName };
          });

          const currentReferences = this.activeScreenConfigWidgetReferences$.value;
          if (!currentReferences || JSON.stringify(widgetReferences) !== JSON.stringify(currentReferences)) {
            this.activeScreenConfigWidgetReferences$.next(widgetReferences);
          }

          this.loadActiveLayoutAnalysisTabs();
        }
      })
    );
  }

  get isMapsPage(): boolean {
    let strippedURL = this._router.url.split("?")[0];
    return strippedURL.endsWith("/datasets/maps");
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  setActiveScreenConfigurationTabIndex(tabIndex: number): void {
    if (tabIndex < 0 || tabIndex >= this.activeScreenConfigurationTabs$.value.length) {
      return;
    }

    let tabs = this.activeScreenConfigurationTabs$.value.map((tab, index) => {
      tab.active = index === tabIndex;
      return tab;
    });

    this.activeScreenConfigurationTabs$.next(tabs);

    let queryParams = { ...this._route.snapshot.queryParams };
    queryParams["tab"] = tabIndex.toString();
    this._router.navigate([TabLinks.analysis], { queryParams });
  }

  getLayoutFromTab(tab: NavigationTab): FullScreenLayout | null {
    if (!this.activeScreenConfiguration$.value) {
      return null;
    }

    let tabIndex = tab?.params?.["tab"];
    if (tabIndex !== undefined) {
      let index = parseInt(tabIndex);
      return this.activeScreenConfiguration$.value?.layouts[index];
    }

    return null;
  }

  loadActiveLayoutAnalysisTabs(): void {
    if (this.activeScreenConfiguration$.value && this.activeScreenConfiguration$.value.layouts.length > 0) {
      let analysisTabs: NavigationTab[] = this.activeScreenConfiguration$.value.layouts.map((layout, index) => {
        let label = layout.tabName || "Analysis " + (index + 1);
        let tooltip = `${label}`;
        if (layout.tabDescription) {
          tooltip += `:\n${layout.tabDescription}`;
        }

        let tab: NavigationTab = {
          icon: "assets/tab-icons/analysis.svg",
          label,
          tooltip,
          url: TabLinks.analysis,
          params: { tab: index.toString() },
        };

        return tab;
      });

      let tabs = [
        { icon: "assets/tab-icons/browse.svg", label: "Browse", tooltip: "Browse", url: TabLinks.browse },
        ...analysisTabs,
        { icon: "assets/tab-icons/code-editor.svg", label: "Code Editor", tooltip: "Code Editor", url: TabLinks.codeEditor },
        { icon: "assets/tab-icons/element-maps.svg", label: "Element Maps", tooltip: "Element Maps", url: TabLinks.maps },
      ];
      this.activeScreenConfigurationTabs$.next(tabs);
    } else {
      this.activeScreenConfigurationTabs$.next([
        { icon: "assets/tab-icons/browse.svg", label: "Browse", tooltip: "Browse", url: TabLinks.browse },
        { icon: "assets/tab-icons/code-editor.svg", label: "Code Editor", tooltip: "Code Editor", url: TabLinks.codeEditor },
        { icon: "assets/tab-icons/element-maps.svg", label: "Element Maps", tooltip: "Element Maps", url: TabLinks.maps },
      ]);
    }
  }

  addScreenConfigurationLayout(layout: FullScreenLayout): ScreenConfiguration | undefined {
    if (!layout) {
      return undefined;
    }

    let screenConfiguration = this.activeScreenConfiguration$.value;
    if (!screenConfiguration) {
      screenConfiguration = createDefaultScreenConfiguration();
    }

    screenConfiguration.layouts.push(layout);
    this.activeScreenConfiguration$.next(screenConfiguration);

    this.writeScreenConfiguration(screenConfiguration);

    return screenConfiguration;
  }

  fetchAvailableScans() {
    this._cachedDataService.getScanList(ScanListReq.create({})).subscribe(resp => {
      this.availableScans$.next(resp.scans);
    });
  }

  deleteQuant(quantId: string) {
    this._dataService.sendQuantDeleteRequest(QuantDeleteReq.create({ quantId })).subscribe(res => {
      // Remove the quant from the available quants
      const availableScanQuants = this.availableScanQuants$.value;
      for (const scanId in availableScanQuants) {
        const quants = availableScanQuants[scanId].filter(quant => quant.id !== quantId);
        availableScanQuants[scanId] = quants;
      }

      this.availableScanQuants$.next(availableScanQuants);
    });
  }

  fetchQuantsForScan(scanId: string) {
    this._dataService.sendQuantListRequest(QuantListReq.create({ searchParams: { scanId } })).subscribe(res => {
      this.availableScanQuants$.next({ ...this.availableScanQuants$.value, [scanId]: res.quants });
    });
  }

  fetchLastLoadedScreenConfigurationId() {
    const id = localStorage?.getItem("lastLoadedScreenConfigurationId");
    if (id) {
      this.lastLoadedScreenConfigurationId = id;
    }
  }

  cacheScreenConfigurationId(id: string) {
    this.lastLoadedScreenConfigurationId = id;
    localStorage?.setItem("lastLoadedScreenConfigurationId", id);
  }

  clearScreenConfigurationCache() {
    this.lastLoadedScreenConfigurationId = "";
    localStorage?.removeItem("lastLoadedScreenConfigurationId");
    this.activeScreenConfiguration$.next(createDefaultScreenConfiguration());
    this.activeScreenConfigurationId$.next("");
  }

  fetchScreenConfiguration(id: string = "", scanId: string = "", setActive: boolean = true, showSnackOnError: boolean = true) {
    this._dataService.sendScreenConfigurationGetRequest(ScreenConfigurationGetReq.create({ id, scanId })).subscribe({
      next: res => {
        if (res.screenConfiguration) {
          if (setActive) {
            this.activeScreenConfiguration$.next(res.screenConfiguration);
            this.activeScreenConfigurationId$.next(res.screenConfiguration.id);
            this.cacheScreenConfigurationId(res.screenConfiguration.id);
          }

          // Store the screen configuration
          this.screenConfigurations$.next(this.screenConfigurations$.value.set(res.screenConfiguration.id, res.screenConfiguration));

          // Restore selections for each of the scans
          const scanIds = Object.keys(res.screenConfiguration.scanConfigurations);
          this._selectionService.restoreSavedSelection(scanIds, "" /* TODO: Get the image name!! */);
        }
      },
      error: err => {
        // If we got a not found error, it may be because we're requesting a "default" screen config with blank ids
        // in this case we should write out a default one
        if (err instanceof WSError && (err as WSError).status == ResponseStatus.WS_NOT_FOUND && !id && scanId) {
          // No screen configuration found, create a new one for this scan
          const newScreenConfiguration = createDefaultScreenConfiguration();
          const matchedScan = this.availableScans$.value.find(scan => scan.id === scanId);
          if (scanId && matchedScan) {
            newScreenConfiguration.description = `Default Workspace for ${matchedScan.title}. ${matchedScan.description}`;
          }

          this.writeScreenConfiguration(newScreenConfiguration, scanId, true);
        } else if (showSnackOnError) {
          this._snackService.openError(err);
        }
      },
    });
  }

  createNewScreenConfiguration(scanId: string = "", callback: (screenConfig: ScreenConfiguration) => void = () => {}) {
    const newScreenConfiguration = createDefaultScreenConfiguration();
    if (scanId) {
      newScreenConfiguration.scanConfigurations = { [scanId]: { id: scanId, quantId: "", calibrations: [], colour: "" } };
    }

    this.writeScreenConfiguration(newScreenConfiguration, undefined, true, callback);
  }

  loadScreenConfigurationFromScan(scanId: string) {
    this.fetchScreenConfiguration("", scanId, true);
  }

  writeScreenConfiguration(
    screenConfiguration: ScreenConfiguration,
    scanId: string = "",
    setActive: boolean = false,
    callback: (screenConfig: ScreenConfiguration) => void = () => {}
  ) {
    if (!screenConfiguration || screenConfiguration.layouts.length === 0) {
      return;
    }

    this._dataService.sendScreenConfigurationWriteRequest(ScreenConfigurationWriteReq.create({ scanId, screenConfiguration })).subscribe({
      next: res => {
        if (res.screenConfiguration) {
          if (this.activeScreenConfigurationId$.value === res.screenConfiguration.id || setActive) {
            this.activeScreenConfiguration$.next(res.screenConfiguration);
          }

          if (setActive) {
            this.activeScreenConfigurationId$.next(res.screenConfiguration.id);
            this.cacheScreenConfigurationId(res.screenConfiguration.id);
          }

          callback(res.screenConfiguration);

          // Store the screen configuration
          this.screenConfigurations$.next(this.screenConfigurations$.value.set(res.screenConfiguration.id, res.screenConfiguration));
        }
      },
      error: err => {
        this._snackService.openError("Error saving workspace!", err);
      },
    });
  }

  deleteScreenConfiguration(id: string, callback: () => void = () => {}) {
    this._dataService.sendScreenConfigurationDeleteRequest({ id }).subscribe(res => {
      if (res.id) {
        this.screenConfigurations$.value.delete(id);
        this.screenConfigurations$.next(this.screenConfigurations$.value);

        if (this.activeScreenConfigurationId$.value === id) {
          this.activeScreenConfigurationId$.next("");
          this.cacheScreenConfigurationId("");
          this.activeScreenConfiguration$.next(createDefaultScreenConfiguration());
        }

        callback();
      }
    });
  }

  updateActiveLayoutWidgetType(widgetId: string, layoutIndex: number, widgetType: string) {
    const screenConfiguration = this.activeScreenConfiguration$.value;
    if (screenConfiguration.id && screenConfiguration.layouts.length > layoutIndex) {
      const widget = screenConfiguration.layouts[layoutIndex].widgets.find(widget => widget.id === widgetId);
      if (widget) {
        widget.type = widgetType;
        this.writeScreenConfiguration(screenConfiguration);
      }
    }
  }

  writeWidgetData(widgetData: WidgetData) {
    this._dataService.sendWidgetDataWriteRequest(WidgetDataWriteReq.create({ widgetData })).subscribe(res => {
      if (res.widgetData) {
        this.widgetData$.next(this.widgetData$.value.set(res.widgetData.id, res.widgetData));
      }
    });
  }

  fetchWidgetData(id: string) {
    this._dataService.sendWidgetDataGetRequest(WidgetDataGetReq.create({ id })).subscribe(res => {
      if (res.widgetData) {
        this.widgetData$.next(this.widgetData$.value.set(res.widgetData.id, res.widgetData));
      }
    });
  }

  changeActiveScreenConfiguration(id: string) {
    this.activeScreenConfigurationId$.next(id);
  }

  get activeTab(): SidebarTabItem | null {
    return this._activeTab;
  }

  set activeTab(tab: SidebarTabItem | null) {
    this._activeTab = tab;
    this.showSearch = true;
  }

  get resizeCanvas$(): ReplaySubject<void> {
    // Something just subscribed, schedule a notification in a second
    // This should fix some chord/ternary/binary diagram issues where they reset and
    // are too small until a window resize or data reset.
    // TODO: Remove this hack!
    this.delayNotifyCanvasResize(10);

    return this._resizeCanvas$;
  }

  notifyWindowResize(): void {
    // Window resized, notify all canvases
    this._resizeCanvas$.next();
  }

  delayNotifyCanvasResize(delayMS: number): void {
    // Wait a bit & then notify canvases to recalculate their size
    setTimeout(() => {
      this._resizeCanvas$.next();
    }, delayMS);
  }

  get sidepanelOpen(): boolean {
    return this.sidepanelOpen$.value;
  }

  set sidepanelOpen(value: boolean) {
    this.sidepanelOpen$.next(value);
  }

  toggleSidePanel() {
    if (!this.sidepanelOpen && !this.activeTab) {
      this.activeTab = this.sidebarTabs[0];
    }

    this.sidepanelOpen = !this.sidepanelOpen;

    // We need to wait 100 ms before notifying resize because this is how long the transition is set for
    // this.delayNotifyCanvasResize(100);
  }

  get isWindows(): boolean {
    return navigator.userAgent.search("Windows") !== -1;
  }

  get isFirefox(): boolean {
    return isFirefox(navigator?.userAgent || "");
  }

  get defaultScanId(): string {
    let scanId = this._route?.snapshot?.queryParams[EditorConfig.scanIdParam];
    if (!scanId && this.activeScreenConfiguration$.value?.scanConfigurations) {
      scanId = Object.keys(this.activeScreenConfiguration$.value.scanConfigurations)[0];
    }

    return scanId;
  }

  makeExpressionList(scanId: string, count: number, scanQuantId: string = ""): Observable<DefaultExpressions> {
    if (scanId.length > 0) {
      // If there's a quant, use elements from that, otherwise use pseudo-intensities (if they exist)
      const quantId = scanQuantId || this.getQuantIdForScan(scanId);
      if (quantId.length <= 0) {
        // default to pseudo intensities
        return this._cachedDataService.getPseudoIntensity(PseudoIntensityReq.create({ scanId: scanId })).pipe(
          map((resp: PseudoIntensityResp) => {
            const pseudoElems = resp.intensityLabels.slice(0, count);
            const exprs: string[] = [];
            for (const p of pseudoElems) {
              exprs.push(DataExpressionId.makePredefinedPseudoIntensityExpression(p));
            }

            return new DefaultExpressions(exprs, "");
          })
        );
      } else {
        // default to showing some quantified data...
        const result = new DefaultExpressions([], quantId);
        return this._cachedDataService.getQuant(QuantGetReq.create({ quantId: quantId, summaryOnly: true })).pipe(
          map((resp: QuantGetResp) => {
            if (resp.summary) {
              for (const e of resp.summary.elements) {
                let det = resp.summary.params?.userParams?.quantMode || "";
                if (det.length > 0 && det != "Combined") {
                  det = det.substring(0, 1);
                }

                result.exprIds.push(DataExpressionId.makePredefinedQuantElementExpression(e, "%", det));

                if (result.exprIds.length >= count) {
                  break;
                }
              }
            }

            return result;
          })
        );
      }
    }
    return of();
  }

  getQuantIdForScan(scanId: string): string {
    const quantId = this.activeScreenConfiguration$.value?.scanConfigurations[scanId]?.quantId || "";
    return quantId;
  }

  getLoadedScan(scanId: string): ScanItem | undefined {
    return this.availableScans$.value.find(scan => scan.id === scanId);
  }

  getLoadedQuant(scanId: string, quantId: string): QuantificationSummary | undefined {
    return this.availableScanQuants$.value[scanId]?.find(quant => quant.id === quantId);
  }
}
