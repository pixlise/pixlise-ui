import { AfterViewInit, Component, ComponentRef, ViewChild, ViewContainerRef } from "@angular/core";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { SidebarTabItem, SidebarViewShortcut } from "../../models/sidebar.model";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { ROIService } from "src/app/modules/roi/services/roi.service";

@Component({
  selector: "analysis-sidepanel",
  templateUrl: "./analysis-sidepanel.component.html",
  styleUrls: ["./analysis-sidepanel.component.scss"]
})
export class AnalysisSidepanelComponent implements AfterViewInit {
  showSearch = false;

  @ViewChild("openTab", { read: ViewContainerRef }) openTab?: ViewContainerRef;
  private _openTabRef: ComponentRef<any> | null = null;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _userOptionsService: UserOptionsService
  ) { }

  ngAfterViewInit(): void {
    this.activeTab = this.tabs[0];
  }

  ngAfterViewChecked(): void {
    // Reset in case it was never shown
    if (this.sidepanelOpen && !this._openTabRef) {
      if (!this.activeTab) {
        this.onOpenTab(this.tabs[0]);
      } else {
        this.onOpenTab(this.activeTab);
      }
    }
  }

  ngOnDestroy() {
    this.clearTab();
  }

  private clearTab(): void {
    if (this._openTabRef) {
      this._openTabRef.changeDetectorRef.detach();
      this._openTabRef.destroy();
      this._openTabRef = null;
    }
  }

  set activeTab(tab: SidebarTabItem | null) {
    this._analysisLayoutService.activeTab = tab;
  }

  get activeTab() {
    return this._analysisLayoutService.activeTab;
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

  onOpenTab(tab: SidebarTabItem) {
    this._analysisLayoutService.activeTab = tab;
    this._analysisLayoutService.sidepanelOpen = true;
    if (this.openTab) {
      this._openTabRef = this.openTab.createComponent(tab.component);
    }
  }

  onOpenView(view: SidebarViewShortcut) {

  }

  onToggleSidePanel() {
    this._analysisLayoutService.toggleSidePanel();
  }

  onToggleSearch() {
    this.showSearch = !this.showSearch;
  }
}
