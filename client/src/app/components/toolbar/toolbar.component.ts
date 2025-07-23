// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { CdkOverlayOrigin, ConnectionPositionPair, Overlay, OverlayModule } from "@angular/cdk/overlay";
import { Component, ElementRef, Injector, Input, OnDestroy, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, NavigationEnd, ResolveEnd, Router } from "@angular/router";
import { CommonModule } from "@angular/common";

import { Subscription } from "rxjs";
import { MarkdownModule } from "ngx-markdown";

import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { OverlayHost } from "src/app/utils/overlay-host";
import { UserMenuPanelComponent } from "./user-menu-panel/user-menu-panel.component";
import { APIDataService, PIXLISECoreModule, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { SettingsModule } from "src/app/modules/settings/settings.module";
import { NotificationsMenuPanelComponent } from "./notifications-menu-panel/notifications-menu-panel.component";
import { HotkeysMenuPanelComponent } from "./hotkeys-menu-panel/hotkeys-menu-panel.component";
import { NotificationsService } from "src/app/modules/settings/services/notifications.service";
import { AnalysisLayoutService, NavigationTab } from "src/app/modules/pixlisecore/pixlisecore.module";
import { VERSION } from "src/environments/version";
import { PushButtonComponent } from "../../modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";

import { TabLinks } from "src/app/models/TabLinks";
import { CdkDragDrop, DragDropModule, moveItemInArray } from "@angular/cdk/drag-drop";

class TabNav {
  constructor(
    public label: string,
    public url: string,
    public enabled: boolean,
    public active: boolean = false
  ) {}

  get cssClass(): string {
    if (this.active) {
      return "nav-link-active";
    }
    if (!this.enabled) {
      return "nav-link-disabled";
    }
    return "nav-link-normal";
  }
}

@Component({
  standalone: true,
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  styleUrls: ["./toolbar.component.scss"],
  imports: [PIXLISECoreModule, CommonModule, OverlayModule, SettingsModule, MarkdownModule, DragDropModule],
})
export class ToolbarComponent implements OnInit, OnDestroy {
  public static BrowseTabURL: string = TabLinks.browse;
  public static AnalysisTabURL: string = TabLinks.analysis;
  public static CodeEditorTabURL: string = TabLinks.codeEditor;
  public static MapsTabURL: string = TabLinks.maps;
  public static NewTabURL: string = TabLinks.new;

  @Input() titleToShow: string = "";
  @Input() darkBackground: boolean = false;

  @ViewChild(CdkOverlayOrigin) _overlayOrigin!: CdkOverlayOrigin;
  @ViewChild("submitIssue") submitIssueDialog!: ElementRef;
  @ViewChild("changeLogBtn") changeLogBtn!: ElementRef;

  private _userMenuOverlayHost!: OverlayHost;
  private _notificationsMenuOverlayHost!: OverlayHost;
  private _hotKeysMenuOverlayHost!: OverlayHost;

  private _subs = new Subscription();
  private _userPiquantConfigAllowed: boolean = false;
  private _userUserAdminAllowed: boolean = false;
  private _userPiquantJobsAllowed: boolean = false;
  private _userExportAllowed: boolean = false;
  private _isAnalysisTab: boolean = false;

  private _currTab: string = "";
  private _dataSetLoadedName = "";

  public userIssue: string = "";

  public isVisible: boolean = true;
  public hasViewedLatestVersion: boolean = false;

  title = "";
  tabs: TabNav[] = [];
  datasetID: string = "";

  queryParam: Record<string, string> = {};

  builtInTabs: NavigationTab[] = [
    { icon: "assets/tab-icons/browse.svg", label: "Browse", tooltip: "Browse", url: ToolbarComponent.BrowseTabURL },
    { icon: "assets/tab-icons/code-editor.svg", label: "Code Editor", tooltip: "Code Editor", url: ToolbarComponent.CodeEditorTabURL },
    { icon: "assets/tab-icons/element-maps.svg", label: "Element Maps", tooltip: "Element Maps", url: ToolbarComponent.MapsTabURL },
  ];

  allTabs: NavigationTab[] = [];
  openTabs: NavigationTab[] = [];

  editingAnnotationIndex: number = -1;

  annotationsVisible: boolean = false;
  editAnnotationsOpen: boolean = false;

  isPublicUser: boolean = false;

  uiVersion: string = "";
  uiVersionLastCommitDate: number = 0;

  hasQuantConfiguredScan: boolean = false;
  hasScanConfigured: boolean = false;
  screenConfigLoaded: boolean = false;

  isNewTab: boolean = false;
  hasActiveWorkspace: boolean = false;

  currentAnalysisTabIndex: number | null = null;
  editingTabIndex: number | null = null;
  newTabName: string = "";

  outstandingInfo: string = "";

  constructor(
    private router: Router,
    private _route: ActivatedRoute,

    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private titleService: Title, // public dialog: MatDialog,
    private _notificationsSerivce: NotificationsService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _snackService: SnackbarService,
    private _dataService: APIDataService
  ) {}

  ngOnInit() {
    this.updateToolbar();

    this.uiVersion = (VERSION as any)?.raw || "(Local build)";
    this.uiVersionLastCommitDate = (VERSION as any)?.lastCommitDate || 0;
    this.checkHasViewedLatestVersion();

    // // If user changes tabs, etc, we want to know
    this._subs.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd || event instanceof ResolveEnd) {
          this._userMenuOverlayHost.hidePanel();
          this.updateToolbar();
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfig => {
        if (screenConfig && screenConfig.id) {
          this.titleToShow = screenConfig.name || "";

          this.hasQuantConfiguredScan = false;
          this.hasScanConfigured = false;
          if (screenConfig?.scanConfigurations) {
            for (const key in screenConfig.scanConfigurations) {
              this.hasScanConfigured = true;
              if (screenConfig.scanConfigurations[key].quantId) {
                this.hasQuantConfiguredScan = true;
                break;
              }
            }

            this.screenConfigLoaded = true;
          }

          this.openScanConfigurationTabForInvalidQuants();
        }

        this.updateToolbar();
      })
    );

    this._subs.add(
      this._route.queryParams.subscribe(params => {
        this.queryParam = { ...params };
        let scanId = params["scan_id"] || params["scanId"];
        this.hasActiveWorkspace = !!(params["id"] || scanId);

        let strippedUrl = this.router.url.split("?")[0];
        let isAnalysisTab = strippedUrl.endsWith(ToolbarComponent.AnalysisTabURL);
        this.currentAnalysisTabIndex = isAnalysisTab ? parseInt(params["tab"]) || 0 : null;
        // if (this.currentAnalysisTabIndex !== null) {
        //   // Offset by 1 for browse tab
        //   this.currentAnalysisTabIndex += 1;
        // }

        if (scanId) {
          this.datasetID = scanId;
          this._dataSetLoadedName = "Scan " + scanId;
          this.updateToolbar();

          this._subs.add(
            this._analysisLayoutService.availableScans$.subscribe(scans => {
              let scan = scans.find(s => s.id === scanId);
              if (scan) {
                let sol = scan?.meta?.["Sol"] || "N/A";
                this._dataSetLoadedName = `Sol ${sol}: ${scan?.title || "N/A"}`;
                this.updateToolbar();
              }
            })
          );
        }
      })
    );

    this._subs.add(
      this._dataService.outstandingRequests$.subscribe((outstandingInfo: string) => {
        this.outstandingInfo = outstandingInfo;
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  ngAfterViewInit() {
    let userOverlayPos = [
      new ConnectionPositionPair(
        {
          originX: "end",
          originY: "bottom",
        },
        {
          overlayX: "end",
          overlayY: "top",
        },
        0, // Offset X
        0 // Offset Y
      ),
    ];

    this._userMenuOverlayHost = new OverlayHost(
      this.overlay,
      this.viewContainerRef,
      this.injector,
      this._overlayOrigin,
      UserMenuPanelComponent,
      userOverlayPos,
      true
    );

    this._notificationsMenuOverlayHost = new OverlayHost(
      this.overlay,
      this.viewContainerRef,
      this.injector,
      this._overlayOrigin,
      NotificationsMenuPanelComponent,
      userOverlayPos,
      true
    );

    this._hotKeysMenuOverlayHost = new OverlayHost(
      this.overlay,
      this.viewContainerRef,
      this.injector,
      this._overlayOrigin,
      HotkeysMenuPanelComponent,
      userOverlayPos,
      true
    );
  }

  get readOnlyMode(): boolean {
    return this._analysisLayoutService.readOnlyMode;
  }

  onLogoClick(): void {
    this.router.navigateByUrl("/");
  }

  onOpenTab(tab: NavigationTab): void {
    const strippedURL = this.router.url.split("?")[0];

    let isOnTab = strippedURL.endsWith(tab.url);
    if (tab.params && Object.keys(tab.params).length > 0) {
      isOnTab = isOnTab && Object.keys(tab.params).every(key => (this.queryParam[key] || 0) == tab?.params?.[key]);
    }

    if (isOnTab) {
      // Already on this tab
      return;
    }

    // Clear editing
    this.editingTabIndex = null;
    this.newTabName = "";

    if (tab.url === ToolbarComponent.AnalysisTabURL && !this.queryParam["tab"]) {
      // Default to first tab
      this.queryParam["tab"] = "0";
    }

    this.openTabs.forEach(openTab => {
      openTab.active = strippedURL.endsWith(tab.url);
      if (openTab.params && Object.keys(openTab.params).length > 0) {
        openTab.active = openTab.active && Object.keys(openTab.params).every(key => (this.queryParam[key] || 0) == (openTab?.params?.[key] || 0));
      }
    });
    this.isNewTab = strippedURL.endsWith(ToolbarComponent.NewTabURL);

    if (tab.params && Object.keys(tab.params).length > 0) {
      this.queryParam = { ...this.queryParam, ...tab.params };
    }

    if (tab.url !== ToolbarComponent.AnalysisTabURL) {
      // Strip out any tab param
      delete this.queryParam["tab"];
    }

    this.router.navigateByUrl(`${tab.url}?${this.queryParamString}`);
  }

  get queryParamString(): string {
    return Object.entries(this.queryParam)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  }

  get showExport(): boolean {
    // titleToShow being non-empty means we're not on a dataset tab, eg Admin.
    // Title being blank means dataset not yet loaded
    return this.titleToShow.length <= 0 && this.title.length > 0 && this._userExportAllowed && ![""].includes(this._currTab);
  }

  get showTitle(): boolean {
    return this.title.length > 0 && !["", "Datasets"].includes(this._currTab);
  }

  get showViewCapture(): boolean {
    return this._isAnalysisTab;
  }

  get showQuantPicker(): boolean {
    return this._currTab == "Analysis" || this._currTab == "Element Maps";
  }

  get canEditScreenConfig(): boolean {
    return Boolean(this._analysisLayoutService.activeScreenConfiguration$.value.owner?.canEdit);
  }

  getTabIndex(tab: NavigationTab): number | null {
    if (tab.url !== ToolbarComponent.AnalysisTabURL) {
      return null;
    }

    return tab.params?.["tab"] !== undefined ? parseInt(tab.params["tab"]) : 0;
  }

  onEditTab(tab: NavigationTab): void {
    let index = this.getTabIndex(tab) ?? 0;
    if (!this.canEditTab(tab) || this.editingTabIndex === index || index < 0) {
      return;
    }

    this.editingTabIndex = index;
    this.newTabName = tab.label || "";
  }

  saveTabName(tab: NavigationTab): void {
    let index = this.getTabIndex(tab) ?? -1;
    if (this.editingTabIndex !== index || !this.newTabName || !this._analysisLayoutService.activeScreenConfiguration$.value) {
      return;
    }

    tab.label = this.newTabName;

    let screenLayout = this._analysisLayoutService.getLayoutFromTab(tab);
    if (screenLayout) {
      screenLayout.tabName = this.newTabName;
      this._analysisLayoutService.writeScreenConfiguration(this._analysisLayoutService.activeScreenConfiguration$.value);
    }

    this.editingTabIndex = null;
    this.newTabName = "";
  }

  cancelEditTabName(): void {
    this.editingTabIndex = null;
    this.newTabName = "";
  }

  canEditTab(tab: NavigationTab): boolean {
    return ![TabLinks.browse, TabLinks.codeEditor, TabLinks.maps].includes(tab?.url) && this.canEditScreenConfig;
  }

  private loadAnalysisTabs(): void {
    // let beforeAnalysisTabs = [];
    // if (!this._analysisLayoutService.activeScreenConfiguration$.value.browseTabHidden) {
    //   beforeAnalysisTabs.push({ icon: "assets/tab-icons/browse.svg", label: "Browse", tooltip: "Browse", url: ToolbarComponent.BrowseTabURL });
    // }

    // Ensure a workspace was specified before attempting to load analysis tabs
    if (!this.hasActiveWorkspace) {
      // this.openTabs = beforeAnalysisTabs;
      return;
    }

    if (this._analysisLayoutService.activeScreenConfiguration$.value?.layouts.length > 0) {
      // let afterAnalysisTabs = [];
      // if (!this._analysisLayoutService.activeScreenConfiguration$.value.codeEditorTabHidden) {
      //   afterAnalysisTabs.push({ icon: "assets/tab-icons/code-editor.svg", label: "Code Editor", tooltip: "Code Editor", url: ToolbarComponent.CodeEditorTabURL });
      // }

      // if (!this._analysisLayoutService.activeScreenConfiguration$.value.elementMapsTabHidden) {
      //   afterAnalysisTabs.push({ icon: "assets/tab-icons/element-maps.svg", label: "Element Maps", tooltip: "Element Maps", url: ToolbarComponent.MapsTabURL });
      // }

      let analysisTabs: NavigationTab[] = [];

      this._analysisLayoutService.activeScreenConfiguration$.value.layouts.forEach((layout, index) => {
        if (layout.hidden) {
          return;
        }

        let label = layout.tabName || "Analysis " + (index + 1);
        let tooltip = `${label}`;
        if (layout.tabDescription) {
          tooltip += `:\n${layout.tabDescription}`;
        }

        let tab: NavigationTab = {
          icon: "assets/tab-icons/analysis.svg",
          label,
          tooltip,
          url: ToolbarComponent.AnalysisTabURL,
          params: { tab: index.toString() },
        };

        analysisTabs.push(tab);
      });

      this.openTabs = [
        // ...beforeAnalysisTabs,
        ...analysisTabs,
        // ...afterAnalysisTabs
      ];
    }
  }

  private updateToolbar(): void {
    // Title to show overrides the dataset name
    this.title = this.titleToShow ? this.titleToShow : this._dataSetLoadedName;
    this.hasActiveWorkspace = !!(this.queryParam["id"] || this.queryParam["scan_id"]);

    // Work out what URL we're on
    const url = this.router.url;
    if (url.includes("/public/")) {
      this.isVisible = false;
    }

    // Build list of tabs
    if (this._dataSetLoadedName.length <= 0) {
      this.tabs = [new TabNav("Datasets", "datasets", true), new TabNav("Code Editor", "datasets/code-editor", true)];
    } else {
      const datasetPrefix = "datasets/";
      const scanQueryParam = this.datasetID ? `?scan_id=${this.datasetID}` : "";

      let quantId = "";
      if (this.datasetID) {
        quantId = this._analysisLayoutService.getQuantIdForScan(this.datasetID);
        this.openTabs = this.allTabs.slice();
      }

      const codeEditorQueryParams = `?scan_id=${this.datasetID}&quant_id=${quantId}`;

      this.tabs = [
        new TabNav("Datasets", "datasets", true),
        new TabNav("Analysis", `${datasetPrefix}analysis${scanQueryParam}`, true),
        new TabNav("Code Editor", `datasets/code-editor${codeEditorQueryParams}`, true),
      ];
    }

    this.loadAnalysisTabs();

    if (this._userPiquantConfigAllowed) {
      this.tabs.push(new TabNav("Piquant", "piquant", true));
    }

    this.tabs.push(new TabNav("Groups", "settings/groups", true));

    if (this._userUserAdminAllowed || this._userPiquantJobsAllowed) {
      this.tabs.push(new TabNav("Admin", "admin", true));
    }

    let strippedURL = url.split("?")[0];
    this.isNewTab = strippedURL.endsWith(ToolbarComponent.NewTabURL);

    let isAnalysisTab = strippedURL.endsWith(ToolbarComponent.AnalysisTabURL);
    if (isAnalysisTab && !this.queryParam["tab"]) {
      // Default to first tab
      this.queryParam["tab"] = "0";
    }

    this.builtInTabs.forEach(tab => {
      tab.active = strippedURL.endsWith(tab.url);
    });

    this.openTabs.forEach(tab => {
      tab.active = strippedURL.endsWith(tab.url);
      if (tab.params && Object.keys(tab.params).length > 0) {
        tab.active = tab.active && Object.keys(tab.params).every(key => this.queryParam[key] == tab?.params?.[key]);
      }
    });

    // Set the doc title to show the tab we're on
    this.titleService.setTitle("PIXLISE" + (this._currTab.length > 0 ? " - " + this._currTab : ""));

    // We only show saving of view state on analysis tab
    this._isAnalysisTab = isAnalysisTab;
    if (!this._isAnalysisTab && this._analysisLayoutService.sidepanelOpen) {
      this._analysisLayoutService.sidepanelOpen$.next(false);
    } else if (this._isAnalysisTab && !this._analysisLayoutService.sidepanelOpen && this.screenConfigLoaded) {
      setTimeout(() => this.openScanConfigurationTabForInvalidQuants(), 0);
    }
  }

  openScanConfigurationTabForInvalidQuants(): void {
    if (
      this._isAnalysisTab &&
      (!this.hasQuantConfiguredScan || !this.hasScanConfigured) &&
      !this._analysisLayoutService.sidepanelOpen &&
      this._analysisLayoutService.sidebarTabs.length > 0
    ) {
      this._analysisLayoutService.activeTab = this._analysisLayoutService.sidebarTabs[0];
      this._analysisLayoutService.sidepanelOpen$.next(true);

      if (!this.hasScanConfigured) {
        this._snackService.open("No scans configured for this workspace. Please configure scans.");
      } else if (!this.hasQuantConfiguredScan) {
        this._snackService.open("Some scans in your workspace don't have a quantification configured.");
      }
    }
  }

  onUserMenu(): void {
    this._userMenuOverlayHost.showPanel();
  }

  get userMenuOpen(): boolean {
    return this._userMenuOverlayHost?.isOpen;
  }

  get notificationsCount() {
    return this._notificationsSerivce.notifications.length;
  }

  onNotificationsMenu(): void {
    let componentRef = this._notificationsMenuOverlayHost.showPanel();
    if (componentRef?.instance.openHotKeysMenuPanel) {
      componentRef.instance.openHotKeysMenuPanel.subscribe(() => {
        this._hotKeysMenuOverlayHost.showPanel();
      });
    }
  }

  get notificationsMenuOpen(): boolean {
    return this._notificationsMenuOverlayHost?.isOpen;
  }

  onHotkeysMenu(): void {
    this._hotKeysMenuOverlayHost.showPanel();
  }

  get hotKeysMenuOpen(): boolean {
    return this._hotKeysMenuOverlayHost?.isOpen;
  }

  get showScanConfigurator(): boolean {
    return this.router.url.includes(ToolbarComponent.CodeEditorTabURL) || this._isAnalysisTab;
  }

  onNavigate(tab: TabNav, event: any): void {
    event.preventDefault();

    if (!tab.enabled) {
      return;
    }
    this.router.navigateByUrl("/" + tab.url);
  }

  onAbout(): void {
    this.router.navigateByUrl("/public/about-us");
  }

  onToggleAnnotations(active: boolean): void {
    this.annotationsVisible = active;
  }

  onEditAnnotations(): void {
    if (this.editAnnotationsOpen) {
      return;
    }

    this.annotationsVisible = true;
    this.editAnnotationsOpen = true;

    // const dialogConfig = new MatDialogConfig();
    // dialogConfig.hasBackdrop = false;
    // dialogConfig.data = new AnnotationEditorData(this.datasetID);
    // this.annotationEditorDialogRef = this.dialog.open(AnnotationEditorComponent, dialogConfig);

    // this.annotationEditorDialogRef.componentInstance.onActiveTool.subscribe(
    //     (activeTool: AnnotationTool)=>
    //     {
    //         if(this.annotationTool && this.annotationTool.tool !== activeTool.tool)
    //         {
    //             this.editingAnnotationIndex = -1;
    //         }
    //         else if(this.editingAnnotationIndex >= 0)
    //         {
    //             this.savedAnnotations[this.editingAnnotationIndex].colour = activeTool.colour;
    //             this.savedAnnotations[this.editingAnnotationIndex].fontSize = activeTool.fontSize;

    //             this._viewStateService.saveAnnotations(this.savedAnnotations);
    //         }

    //         this.annotationTool = activeTool;
    //     }
    // );

    // this.annotationEditorDialogRef.componentInstance.onBulkAction.subscribe(
    //     (action: string)=>
    //     {
    //         if(action === "clear")
    //         {
    //             this.savedAnnotations = [];
    //             this._viewStateService.saveAnnotations(this.savedAnnotations);
    //             this.editingAnnotationIndex = -1;
    //         }
    //         else if(action === "save-workspace")
    //         {
    //             this.annotationEditorDialogRef.componentInstance.openSaveWorkspaceDialog(this.savedAnnotations);
    //         }
    //     }
    // );

    // this.annotationEditorDialogRef.afterClosed().subscribe(
    //     ()=>
    //     {
    //         this.editAnnotationsOpen = false;
    //         this.editingAnnotationIndex = -1;
    //     }
    // );
  }

  // onNewAnnotation(newAnnotation: FullScreenAnnotationItem)
  // {
  //     this.savedAnnotations.push(newAnnotation);
  //     this._viewStateService.saveAnnotations(this.savedAnnotations);
  // }

  // onEditAnnotation({ id, annotation }: { id: number; annotation: FullScreenAnnotationItem; })
  // {
  //     this.savedAnnotations[id] = annotation;
  //     this._viewStateService.saveAnnotations(this.savedAnnotations);
  // }

  // onDeleteAnnotation(deleteIndex: number)
  // {
  //     this.savedAnnotations = this.savedAnnotations.filter((_, i) => deleteIndex !== i);
  //     this._viewStateService.saveAnnotations(this.savedAnnotations);
  //     this.editingAnnotationIndex = -1;
  // }

  // onAnnotationEditIndex(index: number)
  // {
  //     this.editingAnnotationIndex = index;
  // }

  // onAnnotationToolChange(tool: AnnotationTool): void
  // {
  //     this.annotationTool = tool;
  //     if(this.annotationEditorDialogRef && this.annotationEditorDialogRef.componentInstance)
  //     {
  //         this.annotationEditorDialogRef.componentInstance.selectedTool = tool.tool;
  //         this.annotationEditorDialogRef.componentInstance.selectedColour = tool.colour;
  //         this.annotationEditorDialogRef.componentInstance.fontSize = tool.fontSize;
  //     }
  // }

  get discussLink(): string {
    return "https://discuss." + EnvConfigurationInitService.getConfig$.value!.appDomain;
  }

  closeChangeLogDialog(): void {
    if (this.changeLogBtn && this.changeLogBtn instanceof PushButtonComponent) {
      (this.changeLogBtn as PushButtonComponent).closeDialog();
    }
  }

  checkHasViewedLatestVersion() {
    this.hasViewedLatestVersion = localStorage?.getItem("latestUIVersionViewed") === this.uiVersionLastCommitDate.toString();
  }

  markLatestVersionViewed() {
    localStorage?.setItem("latestUIVersionViewed", this.uiVersionLastCommitDate.toString());
    this.hasViewedLatestVersion = true;
  }

  onNewTab(): void {
    this.onOpenTab({ icon: "", label: "+", tooltip: "New Tab", url: ToolbarComponent.NewTabURL });
  }

  dropTab(event: CdkDragDrop<NavigationTab>) {
    let moveFromIndex = event.previousIndex;
    let moveToIndex = event.currentIndex;

    moveItemInArray(this.openTabs, moveFromIndex, moveToIndex);

    let layouts = this._analysisLayoutService.activeScreenConfiguration$.value.layouts;
    // If current open tab is moveFromLayoutIndex, then move it to moveToLayoutIndex
    let currentTab = parseInt(this.queryParam["tab"] || "0");
    moveItemInArray(layouts, moveFromIndex, moveToIndex);
    this._analysisLayoutService.activeScreenConfiguration$.value.layouts = layouts;
    this._analysisLayoutService.writeScreenConfiguration(this._analysisLayoutService.activeScreenConfiguration$.value, undefined, false, () => {
      if (currentTab === moveFromIndex) {
        this._analysisLayoutService.setActiveScreenConfigurationTabIndex(moveToIndex);
      }

      this._analysisLayoutService.loadActiveLayoutAnalysisTabs();
    });
  }
}
