import { Injectable } from "@angular/core";
import { SIDEBAR_ADMIN_SHORTCUTS, SIDEBAR_TABS, SIDEBAR_VIEWS, SidebarTabItem, SidebarViewShortcut } from "../models/sidebar.model";
import { ReplaySubject, timer } from "rxjs";
import { ActivatedRoute } from "@angular/router";

@Injectable({
  providedIn: "root",
})
export class AnalysisLayoutService {
  sidepanelOpen: boolean = false;

  private _resizeCanvas$ = new ReplaySubject<void>(1);

  sidebarTabs: SidebarTabItem[] = SIDEBAR_TABS;
  sidebarViewShortcuts: SidebarViewShortcut[] = SIDEBAR_VIEWS;
  sidebarAdminShortcuts: SidebarViewShortcut[] = SIDEBAR_ADMIN_SHORTCUTS;

  activeTab: SidebarTabItem | null = null;

  constructor(private _route: ActivatedRoute) {}

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
    const source = timer(delayMS);
    const abc = source.subscribe(val => {
      this._resizeCanvas$.next();
    });
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
