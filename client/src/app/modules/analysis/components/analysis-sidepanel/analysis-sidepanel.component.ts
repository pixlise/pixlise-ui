import { AfterViewInit, Component, ComponentRef, ViewChild, ViewContainerRef } from "@angular/core";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { SidebarTabItem, SidebarViewShortcut } from "../../models/sidebar.model";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";

@Component({
  selector: "analysis-sidepanel",
  templateUrl: "./analysis-sidepanel.component.html",
  styleUrls: ["./analysis-sidepanel.component.scss"],
})
export class AnalysisSidepanelComponent {
  @ViewChild("openTab", { read: ViewContainerRef }) openTab?: ViewContainerRef;
  private _openTabRef: ComponentRef<any> | null = null;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _userOptionsService: UserOptionsService
  ) {}

  ngOnInit(): void {
    if (this.sidepanelOpen && !this._openTabRef) {
      if (!this.activeTab) {
        this.activeTab = this.tabs[0];
      }

      this.onOpenTab(this.activeTab);
    }
  }

  ngOnDestroy() {
    this.clearTab();
  }

  private clearTab(): void {
    if (this._openTabRef) {
      this._openTabRef.destroy();
      this.openTab?.clear();
      this._openTabRef = null;
    }
  }

  set activeTab(tab: SidebarTabItem | null) {
    this.clearTab();

    // We need to wait 100 ms before notifying resize because this is how long the transition is set for
    if (this._analysisLayoutService.activeTab?.width !== tab?.width) {
      this._analysisLayoutService.delayNotifyCanvasResize(100);
    }

    this._analysisLayoutService.activeTab = tab;
    if (tab) {
      this.onOpenTab(tab);
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

  get sidepanelOpen() {
    return this._analysisLayoutService.sidepanelOpen;
  }

  get isAdmin() {
    return this._userOptionsService.hasFeatureAccess("admin");
  }

  onOpenTab(tab: SidebarTabItem, clear = false) {
    if (tab) {
      if (clear || this.activeTab?.title !== tab.title) {
        this.clearTab();
      }

      // We need to wait 100 ms before notifying resize because this is how long the transition is set for
      if (this._analysisLayoutService.activeTab?.width !== tab?.width) {
        this._analysisLayoutService.delayNotifyCanvasResize(100);
      }

      this._analysisLayoutService.activeTab = tab;
      this._analysisLayoutService.sidepanelOpen = true;
      if (this.openTab && tab.component) {
        this._openTabRef = this.openTab.createComponent(tab.component);
      }
    }
  }

  onOpenView(view: SidebarViewShortcut) {}

  onToggleSidePanel() {
    this._analysisLayoutService.toggleSidePanel();
    if (this.sidepanelOpen && this.activeTab && !this._openTabRef) {
      this.onOpenTab(this.activeTab);
    }
  }

  onToggleSearch() {
    this._analysisLayoutService.showSearch = !this._analysisLayoutService.showSearch;
  }
}
