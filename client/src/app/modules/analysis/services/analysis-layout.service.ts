import { Injectable, OnDestroy } from "@angular/core";
import { SIDEBAR_ADMIN_SHORTCUTS, SIDEBAR_TABS, SIDEBAR_VIEWS, SidebarTabItem, SidebarViewShortcut } from "../models/sidebar.model";
import { BehaviorSubject, Observable, ReplaySubject, Subscription, catchError, map, of, timer } from "rxjs";
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
import { MapLayerVisibility, ROILayerVisibility, SpectrumLines, VisibleROI, WidgetData } from "src/app/generated-protos/widget-data";
import { WidgetDataGetReq, WidgetDataWriteReq } from "src/app/generated-protos/widget-data-msgs";
import { WSError } from "../../pixlisecore/services/wsMessageHandler";
import { ResponseStatus } from "src/app/generated-protos/websocket";
import { ExpressionPickerResponse } from "../../expressions/components/expression-picker/expression-picker.component";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { HighlightedContextImageDiffraction, HighlightedDiffraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/model";
import EditorConfig from "src/app/modules/code-editor/models/editor-config";
import { HighlightedROIs } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/roi-tab/roi-tab.component";
import { WIDGETS, WidgetType } from "src/app/modules/widget/models/widgets.model";
import { decodeUrlSafeBase64, getScanIdFromWorkspaceId, isFirefox } from "src/app/utils/utils";
import { QuantDeleteReq } from "../../../generated-protos/quantification-management-msgs";
import { TabLinks } from "../../../models/TabLinks";
import { PredefinedROIID } from "../../../models/RegionOfInterest";
import { ScanImage } from "../../../generated-protos/image";
import { EnvConfigurationInitService } from "../../../services/env-configuration-init.service";
import { ReviewerMagicLinkLoginReq } from "../../../generated-protos/user-management-msgs";
import { APIEndpointsService } from "../../pixlisecore/services/apiendpoints.service";
import { HttpClient } from "@angular/common/http";
import { UserOptionsService } from "../../settings/settings.module";

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

  spectrumSelectionWidgetTargetId$ = new BehaviorSubject<string>("");

  activeScreenConfigurationId$ = new BehaviorSubject<string>("");
  activeScreenConfiguration$ = new BehaviorSubject<ScreenConfiguration>(createDefaultScreenConfiguration());
  activeScreenConfigurationTabs$ = new BehaviorSubject<NavigationTab[]>([]);
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

  // Track if the user can edit (any) screen configuration
  readOnlyMode = true;
  magicLinkStatus$ = new BehaviorSubject<string>("");

  constructor(
    private http: HttpClient,
    private _route: ActivatedRoute,
    private _router: Router,
    private _dataService: APIDataService,
    private _apiEndpointsService: APIEndpointsService,
    private _cachedDataService: APICachedDataService,
    private _snackService: SnackbarService,
    private _selectionService: SelectionService,
    private _userOptionsService: UserOptionsService
  ) {
    this.fetchAvailableScans();
    this.fetchLastLoadedScreenConfigurationId();
    if (this.defaultScanId) {
      this.fetchQuantsForScan(this.defaultScanId);
    }

    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this.readOnlyMode = !this._userOptionsService.hasFeatureAccess("editViewState");
      })
    );

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
            let defaultScanId = getScanIdFromWorkspaceId(this.lastLoadedScreenConfigurationId);
            if (defaultScanId) {
              queryParams["scan_id"] = defaultScanId;
            } else {
              queryParams["id"] = this.lastLoadedScreenConfigurationId;
            }
            if ((queryParams["id"] || queryParams["scan_id"]) && (this._route?.snapshot?.url || []).length > 0) {
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

  getCurrentTabId(): number {
    let index = this.activeScreenConfigurationTabs$.value.findIndex(tab => tab.active);
    return index >= 0 ? index : 0;
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

  getLayoutIndexFromTab(tab: NavigationTab): number | null {
    if (!this.activeScreenConfiguration$.value) {
      return null;
    }

    let tabIndex = tab?.params?.["tab"];
    if (tabIndex !== undefined) {
      let index = parseInt(tabIndex);
      return index;
    }

    return null;
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

      let tabs = [...analysisTabs];
      this.activeScreenConfigurationTabs$.next(tabs);
    } else {
      this.activeScreenConfigurationTabs$.next([]);
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

  getScanName(scan: ScanItem): string {
    return scan?.meta && scan?.title ? `Sol ${scan.meta["Sol"]}: ${scan.title}` : scan?.title;
  }

  getImageName(image: ScanImage) {
    return image.imagePath.split("/").pop() || "";
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

  fetchQuantsForScan(scanId: string, callback: (quants: QuantificationSummary[]) => void = () => {}) {
    this._dataService.sendQuantListRequest(QuantListReq.create({ searchParams: { scanId } })).subscribe(res => {
      this.availableScanQuants$.next({ ...this.availableScanQuants$.value, [scanId]: res.quants });
      if (callback) {
        callback(res.quants);
      }
    });
  }

  fetchQuantsForScanAsync(scanId: string): Observable<QuantificationSummary[]> {
    return new Observable<QuantificationSummary[]>(observer => {
      this.fetchQuantsForScan(scanId, quants => {
        observer.next(quants);
        observer.complete();
      });
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

  clearActiveScreenConfiguration() {
    this.clearScreenConfigurationCache();
    // Remove from query params
    let queryParams = { ...this._route.snapshot.queryParams };
    delete queryParams["id"];
    delete queryParams["scan_id"];

    this._router.navigate([TabLinks.analysis], { queryParams });
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
            newScreenConfiguration.description = `Default Workspace for ${matchedScan.title}`; //. ${matchedScan.description}`;
          }

          this.writeScreenConfiguration(newScreenConfiguration, scanId, true);
        } else if (showSnackOnError) {
          this._snackService.openError(err);
        }
      },
    });
  }

  createNewScreenConfiguration(
    scanId: string = "",
    defaultScreenConfig: ScreenConfiguration | null = null,
    callback: (screenConfig: ScreenConfiguration) => void = () => {}
  ) {
    const newScreenConfiguration = createDefaultScreenConfiguration();
    if (scanId) {
      newScreenConfiguration.scanConfigurations = { [scanId]: { id: scanId, quantId: "", calibrations: [], colour: "" } };
    }

    if (defaultScreenConfig) {
      newScreenConfiguration.name = defaultScreenConfig.name;
      newScreenConfiguration.description = defaultScreenConfig.description || "";
      newScreenConfiguration.tags = defaultScreenConfig.tags || [];
      newScreenConfiguration.scanConfigurations = defaultScreenConfig.scanConfigurations;
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

    if (this.readOnlyMode) {
      console.warn("User does not have permission to edit screen configurations");
      // If user is attempting to update screen config in read only mode, just update locally
      if (screenConfiguration.id) {
        if (setActive) {
          this.activeScreenConfiguration$.next(screenConfiguration);
          this.activeScreenConfigurationId$.next(screenConfiguration.id);
        }
        callback(screenConfiguration);
        this.screenConfigurations$.next(this.screenConfigurations$.value.set(screenConfiguration.id, screenConfiguration));
      }
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

  deleteScreenConfiguration(id: string, callback: () => void = () => {}, preserveDanglingWidgetReferences: boolean = false) {
    if (this.readOnlyMode) {
      console.warn("User does not have permission to edit screen configurations");
      return;
    }

    this._dataService.sendScreenConfigurationDeleteRequest({ id, preserveDanglingWidgetReferences }).subscribe(res => {
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
    if (this.readOnlyMode) {
      console.warn("User does not have permission to edit screen configurations");
      return;
    }

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
    if (this.readOnlyMode) {
      console.warn("User does not have permission to edit screen configurations");
      return;
    }

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

  get defaultScanIdFromRoute(): string {
    return this._route?.snapshot?.queryParams[EditorConfig.scanIdParam] || "";
  }

  get defaultScanId(): string {
    let scanId = this.defaultScanIdFromRoute;

    let scanConfigs = this.activeScreenConfiguration$.value?.scanConfigurations;
    if (!scanId && scanConfigs && Object.keys(scanConfigs).length > 0) {
      scanId = Object.keys(scanConfigs)[0];
    }

    return scanId || "";
  }

  makeExpressionList(scanId: string, count: number, scanQuantId: string = ""): Observable<DefaultExpressions> {
    if (scanId && scanId.length > 0) {
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

  removeIdFromScreenConfiguration(screenConfiguration: ScreenConfiguration, id: string): ScreenConfiguration {
    let newScreenConfiguration = ScreenConfiguration.create(screenConfiguration);
    Object.entries(newScreenConfiguration.scanConfigurations).forEach(([scanId, scanConfig]) => {
      if (scanId === id) {
        delete newScreenConfiguration.scanConfigurations[scanId];
        return;
      }

      if (scanConfig.quantId === id) {
        scanConfig.quantId = "";
      }
    });

    newScreenConfiguration.layouts = screenConfiguration.layouts.map(layout => {
      layout.widgets.forEach(widget => {
        if (widget?.data && widget?.type) {
          let widgetKey = WIDGETS[widget.type as WidgetType].dataKey;
          let widgetData = (widget.data as any)[widgetKey];
          if (!widgetData) {
            console.error(`Could not find widget data for widget: ${widget.type} in tab: ${layout.tabName}`);
            return;
          }

          if (widgetData?.scanId === id) {
            widgetData.scanId = "";
          }

          if (widgetData?.visibleROIs) {
            let visibleROIs = widgetData.visibleROIs as VisibleROI[];
            widgetData.visibleROIs = visibleROIs.filter(roi => roi.id !== id);
          }

          if (widgetData?.roi) {
            if (widgetData.roi === id) {
              widgetData.roi = "";
            }
          }

          if (widgetData?.roiLayers) {
            let roiLayers = widgetData.roiLayers as ROILayerVisibility[];
            widgetData.roiLayers = roiLayers.filter(roiLayer => roiLayer.id !== id);
          }

          if (widgetData?.roiIds) {
            let roiIds = widgetData.roiIds as string[];
            widgetData.roiIds = roiIds.filter(roiId => roiId !== id);
          }

          if (widgetData?.spectrumLines) {
            let spectrumLines = widgetData.spectrumLines as SpectrumLines[];
            widgetData.spectrumLines = spectrumLines.filter(spectrumLines => spectrumLines.roiID !== id);
          }

          if (widgetData?.imageName === id) {
            widgetData.imageName = "";
          }

          if (widgetData?.contextImage?.contextImage === id) {
            widgetData.contextImage.contextImage = "";
          }
        }
      });

      return layout;
    });

    // Convert workspace to JSON, do a final ID strip, then convert back to object
    let newScreenConfigurationStr = JSON.stringify(newScreenConfiguration).replace(new RegExp(id, "g"), "");
    if (newScreenConfigurationStr) {
      newScreenConfiguration = ScreenConfiguration.create(JSON.parse(newScreenConfigurationStr));
    }

    return newScreenConfiguration;
  }

  private _replaceIDInStringFields = (json: any, oldId: string, newId: string) => {
    if (typeof json === "object" && json !== null) {
      for (let key in json) {
        if (typeof json[key] === "object") {
          this._replaceIDInStringFields(json[key], oldId, newId);
        } else if (json[key] === oldId) {
          json[key] = newId;
        } else if (
          typeof json[key] === "string" &&
          json[key].includes(oldId) &&
          (PredefinedROIID.isPredefined(json[key]) || DataExpressionId.isPredefinedExpression(json[key]))
        ) {
          // Replace scan id in predefined ids
          json[key] = json[key].replace(new RegExp(oldId, "g"), newId);
        }
      }
    }
  };

  replaceIdInScreenConfiguration(screenConfiguration: ScreenConfiguration, oldId: string, newId: string): ScreenConfiguration {
    let newScreenConfiguration = ScreenConfiguration.create(screenConfiguration);
    Object.entries(newScreenConfiguration.scanConfigurations).forEach(([scanId, scanConfig]) => {
      if (scanId === oldId) {
        delete newScreenConfiguration.scanConfigurations[scanId];
        newScreenConfiguration.scanConfigurations[newId] = {
          id: newId,
          colour: scanConfig.colour,
          quantId: scanConfig.quantId,
          calibrations: [],
        };
      }
    });

    // Have to loop through again to update the quantIds
    Object.entries(newScreenConfiguration.scanConfigurations).forEach(([scanId, scanConfig]) => {
      if (scanConfig.quantId === oldId) {
        scanConfig.quantId = newId;
      }
    });

    newScreenConfiguration.layouts = screenConfiguration.layouts.map(layout => {
      layout.widgets.forEach(widget => {
        if (widget?.data && widget?.type) {
          let widgetKey = WIDGETS[widget.type as WidgetType].dataKey;
          let widgetData = (widget.data as any)[widgetKey];
          if (!widgetData) {
            console.warn(`Could not find widget data for widget: ${widget.type} in tab: ${layout.tabName}`);
            return;
          }

          if (widgetData?.visibleROIs) {
            let visibleROIs = widgetData.visibleROIs as VisibleROI[];
            widgetData.visibleROIs = visibleROIs.map(roi => {
              if (roi.id === oldId) {
                roi.id = newId;
              } else if (roi.scanId === oldId) {
                roi.scanId = newId;
              }

              return roi;
            });
          }

          if (widgetData?.roi) {
            if (widgetData.roi === oldId) {
              widgetData.roi = newId;
            }
          }

          if (widgetData?.roiLayers) {
            let roiLayers = widgetData.roiLayers as ROILayerVisibility[];
            widgetData.roiLayers = roiLayers.map(roiLayer => {
              if (roiLayer.id === oldId) {
                roiLayer.id = newId;
              } else if (roiLayer.scanId === oldId) {
                roiLayer.scanId = newId;
              }

              return roiLayer;
            });
          }

          if (widgetData?.roiIds) {
            let roiIds = widgetData.roiIds as string[];
            widgetData.roiIds = roiIds.map(roiId => {
              if (roiId === oldId) {
                return newId;
              }

              return roiId;
            });
          }

          if (widgetData?.spectrumLines) {
            let spectrumLines = widgetData.spectrumLines as SpectrumLines[];
            widgetData.spectrumLines = spectrumLines.map(spectrumLines => {
              if (spectrumLines.roiID === oldId) {
                spectrumLines.roiID = newId;
              }

              return spectrumLines;
            });
          }
        }
      });
      return layout;
    });

    // More broad replace of the ID in the JSON
    this._replaceIDInStringFields(newScreenConfiguration, oldId, newId);
    return newScreenConfiguration;
  }

  getImageIDsFromScreenConfiguration(screenConfiguration: ScreenConfiguration): string[] {
    let imageIDs: string[] = [];

    screenConfiguration.layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        if (widget?.data && widget?.type) {
          let widgetKey = WIDGETS[widget.type as WidgetType].dataKey;
          let widgetData = (widget.data as any)[widgetKey];
          if (!widgetData) {
            console.error(`Could not find widget data for widget: ${widget.type} in tab: ${layout.tabName}`);
            return;
          }

          if (widgetKey === "contextImage") {
            let contextImage = widget.data.contextImage;
            if (contextImage) {
              imageIDs.push(contextImage.contextImage);
            }
          } else if (widgetKey === "rgbuPlot") {
            let rgbuPlot = widget.data.rgbuPlot;
            if (rgbuPlot) {
              imageIDs.push(rgbuPlot.imageName);
            }
          } else if (widgetKey === "singleAxisRGBU") {
            let singleAxisRGBU = widget.data.singleAxisRGBU;
            if (singleAxisRGBU) {
              imageIDs.push(singleAxisRGBU.imageName);
            }
          } else if (widgetKey === "rgbuImage") {
            let rgbuImage = widget.data.rgbuImage;
            if (rgbuImage) {
              imageIDs.push(rgbuImage.imageName);
            }
          }
        }
      });
    });

    imageIDs = Array.from(new Set(imageIDs));

    return imageIDs;
  }

  getROIIDsFromScreenConfiguration(screenConfiguration: ScreenConfiguration): string[] {
    let rois: string[] = [];

    screenConfiguration.layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        if (widget?.data && widget?.type) {
          let widgetKey = WIDGETS[widget.type as WidgetType].dataKey;
          let widgetData = (widget.data as any)[widgetKey];
          if (!widgetData) {
            console.error(`Could not find widget data for widget: ${widget.type} in tab: ${layout.tabName}`);
            return;
          }

          if (widgetData?.visibleROIs) {
            let visibleROIs = widgetData.visibleROIs as VisibleROI[];
            visibleROIs.forEach(roi => {
              rois.push(roi.id);
            });
          }

          if (widgetData?.roi) {
            rois.push(widgetData.roi);
          }

          if (widgetData?.roiLayers) {
            let roiLayers = widgetData.roiLayers as ROILayerVisibility[];
            roiLayers.forEach(roiLayer => {
              rois.push(roiLayer.id);
            });
          }

          if (widgetData?.roiIds) {
            let roiIds = widgetData.roiIds as string[];
            roiIds.forEach(roiId => {
              rois.push(roiId);
            });
          }

          if (widgetData?.spectrumLines) {
            let spectrumLines = widgetData.spectrumLines as SpectrumLines[];
            spectrumLines.forEach(spectrumLines => {
              rois.push(spectrumLines.roiID);
            });
          }
        }
      });
    });

    rois = rois.filter((roi, i) => !PredefinedROIID.isPredefined(roi));
    rois = Array.from(new Set(rois));

    return rois;
  }

  getLoadedROIIDsFromActiveScreenConfiguration(): string[] {
    if (!this.activeScreenConfiguration$.value) {
      return [];
    }

    return this.getROIIDsFromScreenConfiguration(this.activeScreenConfiguration$.value);
  }

  private _getAllLoadedExpressionIdsFromActiveScreenConfiguration(): string[] {
    let expressionIds: string[] = [];

    this.activeScreenConfiguration$.value?.layouts.forEach(layout => {
      layout.widgets.forEach(widget => {
        if (widget?.data && widget?.type) {
          let widgetKey = WIDGETS[widget.type as WidgetType].dataKey;
          let widgetData = (widget.data as any)[widgetKey];
          if (!widgetData) {
            console.warn(`Could not find widget data for widget: ${widget.type} in tab: ${layout.tabName}`);
            return;
          }

          if (widgetData?.expressionIDs) {
            widgetData.expressionIDs.forEach((expressionId: string) => {
              expressionIds.push(expressionId);
            });
          }

          if (widgetData?.mapLayers) {
            let mapLayers = widgetData.mapLayers as MapLayerVisibility[];
            mapLayers.forEach(mapLayer => {
              expressionIds.push(mapLayer.expressionID);
            });
          }
        }
      });
    });
    expressionIds = expressionIds.filter((expressionId, i) => !DataExpressionId.isPredefinedExpression(expressionId));
    expressionIds = Array.from(new Set(expressionIds));

    return expressionIds;
  }

  getLoadedExpressionIDsFromActiveScreenConfiguration(): string[] {
    let expressionIds = this._getAllLoadedExpressionIdsFromActiveScreenConfiguration();
    return expressionIds.filter((expressionId, i) => !DataExpressionId.isExpressionGroupId(expressionId));
  }

  getLoadedExpressionGroupIDsFromActiveScreenConfiguration(): string[] {
    let expressionIds = this._getAllLoadedExpressionIdsFromActiveScreenConfiguration();
    return expressionIds.filter((expressionId, i) => DataExpressionId.isExpressionGroupId(expressionId));
  }

  getDefaultQuant(quants: QuantificationSummary[]): QuantificationSummary | null {
    if (!quants || quants.length === 0) {
      return null;
    }

    let importedQuants = quants.filter(quant => quant.params?.requestorUserId === "PIXLISEImport");

    // Find auto quant A/B (PIXL), if no A/B, find combined (PIXL), if no combined, find PDS (A/B then Combined),
    // if no PDS, find any (A/B first, then Combined), if none, don't add quant
    const quantPriorities = ["AutoQuant-PIXL (AB)", "AutoQuant-PIXL (Combined)", "AutoQuant-PDS (AB)", "AutoQuant-PDS (Combined)"];
    for (let quantName of quantPriorities) {
      let foundQuant = importedQuants.find(quant => quant.params?.userParams?.name === quantName);
      if (foundQuant) {
        return foundQuant;
      }
    }

    if (importedQuants.length > 0) {
      return importedQuants[0];
    }

    let abQuant = quants.find(quant => quant.params?.userParams?.quantMode === "AB");
    return abQuant || quants[0] || null;
  }

  getDefaultQuantForScan(scanId: string): Observable<QuantificationSummary | null> {
    let quants = this.availableScanQuants$.value[scanId];
    if (!quants || quants.length === 0) {
      return this.fetchQuantsForScanAsync(scanId).pipe(map(quants => this.getDefaultQuant(quants)));
    } else {
      return of(this.getDefaultQuant(quants));
    }
  }

  getLoadedQuantificationIDsFromActiveScreenConfiguration(): string[] {
    let quantificationIDs: string[] = [];

    if (!this.activeScreenConfiguration$.value?.scanConfigurations) {
      return [];
    }

    for (const scanId in this.activeScreenConfiguration$.value.scanConfigurations) {
      const quantId = this.activeScreenConfiguration$.value.scanConfigurations[scanId].quantId;
      if (quantId) {
        quantificationIDs.push(quantId);
      }
    }

    return quantificationIDs;
  }

  loginWithMagicLink(magicLink: string) {
    let decodedWorkspaceId = decodeUrlSafeBase64(magicLink);
    let appConfig = EnvConfigurationInitService.appConfig;
    this._apiEndpointsService
      .magicLinkLogin(
        ReviewerMagicLinkLoginReq.create({
          magicLink: decodedWorkspaceId,
          clientId: appConfig.auth0_client,
          domain: appConfig.auth0_domain,
          audience: appConfig.auth0_audience,
          redirectURI: `${window.location.origin}/authenticate`,
        })
      )
      .subscribe({
        next: res => {
          const loginUrl = `https://${appConfig.auth0_domain}/oauth/token`;

          this.http
            .post(loginUrl, {
              grant_type: "password",
              username: res.email,
              password: res.nonSecretPassword,
              client_id: appConfig.auth0_client,
              audience: appConfig.auth0_audience,
              scope: "openid profile email",
            })
            .subscribe({
              next: (loginResponse: any) => {
                sessionStorage.setItem("reviewer_access_token", loginResponse.access_token);
                sessionStorage.setItem("reviewer_id_token", loginResponse.id_token);
                this.readOnlyMode = true;
                this.magicLinkStatus$.next("success");

                this._router.navigate([TabLinks.analysis], { queryParams: { id: decodedWorkspaceId } });
              },
              error: err => {
                console.error("Login failed: ", err);
                this._snackService.openError("Error logging in with magic link", err?.error || err);
                this.magicLinkStatus$.next("failed");
              },
            });
        },
        error: err => {
          console.error("Error logging in with magic link: ", err);
          this._snackService.openError("Error logging in with magic link", err?.error || err);
          this.magicLinkStatus$.next("failed");
        },
      });
  }
}
