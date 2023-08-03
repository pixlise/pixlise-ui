import { Injectable } from '@angular/core';
import { SIDEBAR_ADMIN_SHORTCUTS, SIDEBAR_TABS, SIDEBAR_VIEWS, SidebarTabItem, SidebarViewShortcut } from '../models/sidebar.model';

@Injectable({
  providedIn: 'root'
})
export class AnalysisLayoutService {
  sidepanelOpen: boolean = false;

  sidebarTabs: SidebarTabItem[] = SIDEBAR_TABS;
  sidebarViewShortcuts: SidebarViewShortcut[] = SIDEBAR_VIEWS;
  sidebarAdminShortcuts: SidebarViewShortcut[] = SIDEBAR_ADMIN_SHORTCUTS;

  activeTab: SidebarTabItem | null = null;

  constructor() { }

  toggleSidePanel() {
    this.sidepanelOpen = !this.sidepanelOpen;
    if (this.sidepanelOpen && !this.activeTab) {
      this.activeTab = this.sidebarTabs[0];
    }
  }

  get isWindows(): boolean {
    return navigator.userAgent.search("Windows") !== -1;
  }

  get isFirefox(): boolean {
    return !!navigator.userAgent.match(/firefox|fxios/i);
  }

}
