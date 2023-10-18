import { Injectable } from "@angular/core";
import { SIDEBAR_ADMIN_SHORTCUTS, SIDEBAR_TABS, SIDEBAR_VIEWS, SidebarTabItem, SidebarViewShortcut } from "../models/sidebar.model";
import { BehaviorSubject, ReplaySubject, timer } from "rxjs";
import { ActivatedRoute } from "@angular/router";
import { APICachedDataService } from "../../pixlisecore/services/apicacheddata.service";
import { ScanListReq } from "src/app/generated-protos/scan-msgs";
import { ScanItem } from "src/app/generated-protos/scan";
import { APIDataService } from "../../pixlisecore/pixlisecore.module";
import { QuantListReq } from "src/app/generated-protos/quantification-retrieval-msgs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ScreenConfigurationGetReq, ScreenConfigurationWriteReq } from "src/app/generated-protos/screen-configuration-msgs";
import { ScreenConfiguration } from "src/app/generated-protos/screen-configuration";
import { DEFAULT_SCREEN_CONFIGURATION, createDefaultScreenConfiguration } from "../models/screen-configuration.model";
import { WidgetData } from "src/app/generated-protos/widget-data";
import { WidgetDataGetReq, WidgetDataWriteReq } from "src/app/generated-protos/widget-data-msgs";

@Injectable({
  providedIn: "root",
})
export class AnalysisLayoutService {
  sidepanelOpen: boolean = false;

  private _resizeCanvas$ = new ReplaySubject<void>(1);

  sidebarTabs: SidebarTabItem[] = SIDEBAR_TABS;
  sidebarViewShortcuts: SidebarViewShortcut[] = SIDEBAR_VIEWS;
  sidebarAdminShortcuts: SidebarViewShortcut[] = SIDEBAR_ADMIN_SHORTCUTS;

  private _activeTab: SidebarTabItem | null = null;
  showSearch = false;

  availableScanQuants$ = new BehaviorSubject<Record<string, QuantificationSummary[]>>({});
  availableScans$ = new BehaviorSubject<ScanItem[]>([]);

  activeScreenConfigurationId$ = new BehaviorSubject<string>("");
  activeScreenConfiguration$ = new BehaviorSubject<ScreenConfiguration>(DEFAULT_SCREEN_CONFIGURATION);

  screenConfigurations$ = new BehaviorSubject<Map<string, ScreenConfiguration>>(new Map());

  widgetData$ = new BehaviorSubject<Map<string, WidgetData>>(new Map());

  constructor(
    private _route: ActivatedRoute,
    private _dataService: APIDataService,
    private _cachedDataService: APICachedDataService
  ) {
    this.fetchAvailableScans();
    if (this.defaultScanId) {
      this.fetchQuantsForScan(this.defaultScanId);
    }
  }

  fetchAvailableScans() {
    this._cachedDataService.getScanList(ScanListReq.create({})).subscribe(resp => {
      this.availableScans$.next(resp.scans);
      if (this.defaultScanId) {
        this.loadScreenConfigurationFromScan(this.defaultScanId);
      }
    });
  }

  fetchQuantsForScan(scanId: string) {
    this._dataService.sendQuantListRequest(QuantListReq.create({ searchParams: { scanId } })).subscribe(res => {
      this.availableScanQuants$.next({ ...this.availableScanQuants$.value, [scanId]: res.quants });
    });
  }

  fetchScreenConfiguration(id: string = "", scanId: string = "", setActive: boolean = true) {
    this._dataService.sendScreenConfigurationGetRequest(ScreenConfigurationGetReq.create({ id, scanId })).subscribe(res => {
      if (res.screenConfiguration) {
        if (setActive) {
          this.activeScreenConfiguration$.next(res.screenConfiguration);
          this.activeScreenConfigurationId$.next(res.screenConfiguration.id);
        }

        // Store the screen configuration
        this.screenConfigurations$.next(this.screenConfigurations$.value.set(res.screenConfiguration.id, res.screenConfiguration));
      } else {
        if (!id && scanId) {
          // No screen configuration found, create a new one for this scan
          let newScreenConfiguration = createDefaultScreenConfiguration();
          let matchedScan = this.availableScans$.value.find(scan => scan.id === scanId);
          if (matchedScan) {
            newScreenConfiguration.name = matchedScan.title;
            newScreenConfiguration.description = matchedScan.description;
          }

          this.writeScreenConfiguration(newScreenConfiguration, scanId);
        }
      }
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

  updateActiveLayoutWidgetType(widgetId: string, layoutIndex: number, widgetType: string) {
    let screenConfiguration = this.activeScreenConfiguration$.value;
    if (screenConfiguration.id && screenConfiguration.layouts.length > layoutIndex) {
      let widget = screenConfiguration.layouts[layoutIndex].widgets.find(widget => widget.id === widgetId);
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
    this.showSearch = false;
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

  toggleSidePanel() {
    this.sidepanelOpen = !this.sidepanelOpen;
    if (this.sidepanelOpen && !this.activeTab) {
      this.activeTab = this.sidebarTabs[0];
    }

    // We need to wait 100 ms before notifying resize because this is how long the transition is set for
    this.delayNotifyCanvasResize(100);
  }

  get isWindows(): boolean {
    return navigator.userAgent.search("Windows") !== -1;
  }

  get isFirefox(): boolean {
    return !!navigator.userAgent.match(/firefox|fxios/i);
  }

  get defaultScanId(): string {
    return this._route?.snapshot?.queryParams["scan_id"] || "";
  }
}
