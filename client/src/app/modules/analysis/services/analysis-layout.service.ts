import { Injectable, OnDestroy } from "@angular/core";
import { SIDEBAR_ADMIN_SHORTCUTS, SIDEBAR_TABS, SIDEBAR_VIEWS, SidebarTabItem, SidebarViewShortcut } from "../models/sidebar.model";
import { BehaviorSubject, Observable, ReplaySubject, Subscription, map, of, timer } from "rxjs";
import { ActivatedRoute, Router } from "@angular/router";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanListReq } from "src/app/generated-protos/scan-msgs";
import { ScanItem } from "src/app/generated-protos/scan";
import { APIDataService, SnackbarService } from "../../pixlisecore/pixlisecore.module";
import { QuantGetReq, QuantGetResp, QuantListReq } from "src/app/generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ScreenConfigurationGetReq, ScreenConfigurationWriteReq } from "src/app/generated-protos/screen-configuration-msgs";
import { ScreenConfiguration } from "src/app/generated-protos/screen-configuration";
import { createDefaultScreenConfiguration } from "../models/screen-configuration.model";
import { WidgetData } from "src/app/generated-protos/widget-data";
import { WidgetDataGetReq, WidgetDataWriteReq } from "src/app/generated-protos/widget-data-msgs";
import { WSError } from "../../pixlisecore/services/wsMessageHandler";
import { ResponseStatus } from "src/app/generated-protos/websocket";
import { ExpressionPickerResponse } from "../../expressions/components/expression-picker/expression-picker.component";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { HighlightedContextImageDiffraction, HighlightedDiffraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/model";
import EditorConfig from "src/app/modules/code-editor/models/editor-config";
import { HighlightedROI } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/roi-tab/roi-tab.component";

export class DefaultExpressions {
  constructor(
    public exprIds: string[],
    public quantId: string
  ) {}
}

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

  screenConfigurations$ = new BehaviorSubject<Map<string, ScreenConfiguration>>(new Map());

  soloViewWidgetId$ = new BehaviorSubject<string>("");

  targetWidgetIds$ = new BehaviorSubject<Set<string>>(new Set());
  highlightedWidgetId$ = new BehaviorSubject<string>("");
  expressionPickerResponse$ = new BehaviorSubject<ExpressionPickerResponse | null>(null);

  highlightedDiffractionWidget$ = new BehaviorSubject<HighlightedDiffraction | null>(null);
  highlightedContextImageDiffractionWidget$ = new BehaviorSubject<HighlightedContextImageDiffraction | null>(null);

  // For now this will just be for the context image, but we may want to expand it to other widgets
  highlightedROI$ = new BehaviorSubject<HighlightedROI | null>(null);

  widgetData$ = new BehaviorSubject<Map<string, WidgetData>>(new Map());

  lastLoadedScreenConfigurationId: string = "";

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService,
    private _snackService: SnackbarService
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
            this.fetchScreenConfiguration(this.lastLoadedScreenConfigurationId);
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
  }

  get isMapsPage(): boolean {
    let strippedURL = this._router.url.split("?")[0];
    return strippedURL.endsWith("/datasets/maps");
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  fetchAvailableScans() {
    this._cachedDataService.getScanList(ScanListReq.create({})).subscribe(resp => {
      this.availableScans$.next(resp.scans);
      // Causes multiple calls to loadScreenConfigurationFromScan, probably best to reduce them so we don't
      // reconfigure stuff multiple times on startup
      // if (this.defaultScanId) {
      //   this.loadScreenConfigurationFromScan(this.defaultScanId);
      // }
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

  fetchScreenConfiguration(id: string = "", scanId: string = "", setActive: boolean = true) {
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
        }
      },
      error: err => {
        // If we got a not found error, it may be because we're requesting a "default" screen config with blank ids
        // in this case we should write out a default one
        if (err instanceof WSError && (err as WSError).status == ResponseStatus.WS_NOT_FOUND && !id && scanId) {
          // No screen configuration found, create a new one for this scan
          const newScreenConfiguration = createDefaultScreenConfiguration();
          const matchedScan = this.availableScans$.value.find(scan => scan.id === scanId);
          if (matchedScan) {
            newScreenConfiguration.description = `Default Workspace for ${matchedScan.title}. ${matchedScan.description}`;
          }

          this.writeScreenConfiguration(newScreenConfiguration, scanId);
        } else {
          this._snackService.openError(err);
        }
      },
    });
  }

  loadScreenConfigurationFromScan(scanId: string) {
    this.fetchScreenConfiguration("", scanId, true);
  }

  writeScreenConfiguration(screenConfiguration: ScreenConfiguration, scanId: string = "") {
    if (!screenConfiguration || screenConfiguration.layouts.length === 0) {
      return;
    }

    let updateId = this.activeScreenConfigurationId$.value;
    if (!updateId && screenConfiguration.id !== updateId) {
      // Update the active screen configuration ID
      this.activeScreenConfigurationId$.next(screenConfiguration.id);
      this.cacheScreenConfigurationId(screenConfiguration.id);
      updateId = screenConfiguration.id;
    }

    screenConfiguration.id = updateId;

    this._dataService.sendScreenConfigurationWriteRequest(ScreenConfigurationWriteReq.create({ scanId, screenConfiguration })).subscribe(res => {
      if (res.screenConfiguration) {
        this.activeScreenConfiguration$.next(res.screenConfiguration);

        // Store the screen configuration
        this.screenConfigurations$.next(this.screenConfigurations$.value.set(res.screenConfiguration.id, res.screenConfiguration));
      }
    });
  }

  deleteScreenConfiguration(id: string) {
    this._dataService.sendScreenConfigurationDeleteRequest({ id }).subscribe(res => {
      if (res.id) {
        this.screenConfigurations$.value.delete(id);
        this.screenConfigurations$.next(this.screenConfigurations$.value);

        if (this.activeScreenConfigurationId$.value === id) {
          this.activeScreenConfigurationId$.next("");
          this.cacheScreenConfigurationId("");
          this.activeScreenConfiguration$.next(createDefaultScreenConfiguration());
        }
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
    return !!navigator.userAgent.match(/firefox|fxios/i);
  }

  get defaultScanId(): string {
    return this._route?.snapshot?.queryParams[EditorConfig.scanIdParam] || "";
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
}
