import { Component, ComponentRef, OnDestroy, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { SidebarTabItem, SidebarViewShortcut } from "../../models/sidebar.model";
import { UserOptionsService } from "src/app/modules/settings/settings.module";
import { Subscription } from "rxjs";

@Component({
  selector: "analysis-sidepanel",
  templateUrl: "./analysis-sidepanel.component.html",
  styleUrls: ["./analysis-sidepanel.component.scss"],
})
export class AnalysisSidepanelComponent implements OnInit, OnDestroy {
  @ViewChild("openTab", { read: ViewContainerRef }) openTab?: ViewContainerRef;

  private _subs: Subscription = new Subscription();

  private _openTabRef: ComponentRef<any> | null = null;

  sidepanelOpen: boolean = false;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _userOptionsService: UserOptionsService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.sidepanelOpen$.subscribe(open => {
        this.sidepanelOpen = open;

        if (!this.sidepanelOpen && this._openTabRef?.instance?.onTabClose) {
          this._openTabRef.instance.onTabClose();
        } else if (this.sidepanelOpen && this._openTabRef?.instance?.onTabOpen) {
          this._openTabRef.instance.onTabOpen();
        }

        if (this.sidepanelOpen && !this.activeTab) {
          this.onOpenTab(this.tabs[0], true);
        } else if (this.sidepanelOpen && !this._openTabRef && this.activeTab) {
          this.onOpenTab(this.activeTab, true);
        }
      })
    );
  }

  ngOnDestroy() {
    this.clearTab();

    this.openTab?.clear();
    this.openTab = undefined;
  }

  private clearTab(): void {
    if (this._openTabRef) {
      if (this._openTabRef?.instance?.onTabClose) {
        this._openTabRef.instance.onTabClose();
      }

      this._openTabRef.destroy();
      this._openTabRef = null;
    }

    this.openTab?.clear();
  }

  set activeTab(tab: SidebarTabItem | null) {
    this.clearTab();

    this._analysisLayoutService.activeTab = tab;
    if (tab) {
      this.onOpenTab(tab, true);
    }
  }

  get activeTab() {
    return this._analysisLayoutService.activeTab;
  }

  get showSearch() {
    return this._analysisLayoutService.showSearch;
  }

  get tabs() {
    return this._analysisLayoutService.sidebarTabs;
  }

  get views() {
    return this._analysisLayoutService.sidebarViewShortcuts;
  }

  get adminShortcuts() {
    return this._analysisLayoutService.sidebarAdminShortcuts;
  }

  get isAdmin() {
    return this._userOptionsService.hasFeatureAccess("admin");
  }

  onOpenTab(tab: SidebarTabItem, clear = false) {
    if (tab) {
      if (clear || this.activeTab?.title !== tab.title) {
        this.clearTab();
      }

      this._analysisLayoutService.activeTab = tab;
      if (!this._analysisLayoutService.sidepanelOpen) {
        this._analysisLayoutService.sidepanelOpen = true;
      }

      if (this.openTab && tab.component) {
        this._openTabRef = this.openTab.createComponent(tab.component);
      }

      if (this._openTabRef?.instance?.onTabOpen) {
        this._openTabRef.instance.onTabOpen();
      }
    }
  }

  toggleAnalysisSidePanel() {
    this._analysisLayoutService.toggleSidePanel();
  }

  onToggleTab(tab: SidebarTabItem) {
    if (this.activeTab?.title && this.activeTab?.title === tab.title) {
      this.toggleAnalysisSidePanel();
    } else if (!this._openTabRef) {
      this._analysisLayoutService.activeTab = tab;
      this.toggleAnalysisSidePanel();
    } else if (!this.sidepanelOpen) {
      // The sidepanelOpen$ subscription will open the tab,
      // so we just need to make sure the old one is cleared and the active tab updated
      this.clearTab();
      this._analysisLayoutService.activeTab = tab;
      this.toggleAnalysisSidePanel();
    } else {
      this.onOpenTab(tab, true);
    }
  }

  onOpenView(view: SidebarViewShortcut) {}

  onToggleSidePanel() {
    this.toggleAnalysisSidePanel();
    if (this.sidepanelOpen && this.activeTab && !this._openTabRef) {
      this.onOpenTab(this.activeTab, true);
    }
  }

  onToggleSearch() {
    this._analysisLayoutService.showSearch = !this._analysisLayoutService.showSearch;
  }
}
