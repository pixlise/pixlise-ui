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
import { Component, Injector, Input, OnDestroy, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, NavigationEnd, Params, ResolveEnd, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { EnvConfigurationInitService } from "src/app/services/env-configuration-init.service";
import { OverlayHost } from "src/app/utils/overlay-host";
import { UserMenuPanelComponent } from "./user-menu-panel/user-menu-panel.component";
import { PIXLISECoreModule } from "src/app/modules/pixlisecore/pixlisecore.module";
import { CommonModule } from "@angular/common";
import { SettingsModule } from "src/app/modules/settings/settings.module";
import { NotificationsMenuPanelComponent } from "./notifications-menu-panel/notifications-menu-panel.component";
import { HotkeysMenuPanelComponent } from "./hotkeys-menu-panel/hotkeys-menu-panel.component";
import { NotificationsService } from "src/app/modules/settings/services/notifications.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { MatDialog, MatDialogConfig, MatDialogRef } from "@angular/material/dialog";
import {
  ScanConfigurationDialog,
  ScanConfigurationDialogData,
} from "src/app/modules/analysis/components/scan-configuration-dialog/scan-configuration-dialog.component";
import { EnvConfigurationService } from "src/app/services/env-configuration.service";

export type NavigationTab = {
  icon: string;
  label?: string;
  tooltip?: string;
  url: string;
  active?: boolean;
  passQueryParams?: boolean;
};

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
  selector: "app-toolbar",
  templateUrl: "./toolbar.component.html",
  styleUrls: ["./toolbar.component.scss"],
  standalone: true,
  imports: [PIXLISECoreModule, CommonModule, OverlayModule, SettingsModule],
})
export class ToolbarComponent implements OnInit, OnDestroy {
  @Input() titleToShow: string = "";
  @Input() darkBackground: boolean = false;

  @ViewChild(CdkOverlayOrigin) _overlayOrigin!: CdkOverlayOrigin;

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

  public isVisible: boolean = true;

  title = "";
  tabs: TabNav[] = [];
  datasetID: string = "";

  queryParam: Params = {};
  allTabs: NavigationTab[] = [
    { icon: "assets/tab-icons/browse.svg", tooltip: "Browse", url: "/datasets" },
    { icon: "assets/tab-icons/analysis.svg", label: "Analysis", tooltip: "Analysis", url: "/datasets/analysis" },
    { icon: "assets/tab-icons/code-editor.svg", label: "Code Editor", tooltip: "Code Editor", url: "/datasets/code-editor" },
    { icon: "assets/tab-icons/element-maps.svg", label: "Element Maps", tooltip: "Element Maps", url: "/datasets/maps" },
  ];
  openTabs: NavigationTab[] = [{ icon: "assets/tab-icons/browse.svg", tooltip: "Browse", url: "/datasets" }];

  editingAnnotationIndex: number = -1;

  annotationsVisible: boolean = false;
  editAnnotationsOpen: boolean = false;

  isPublicUser: boolean = false;

  uiVersion: string = "";

  constructor(
    private router: Router,
    private _route: ActivatedRoute,

    private overlay: Overlay,
    private viewContainerRef: ViewContainerRef,
    private injector: Injector,
    private titleService: Title, // public dialog: MatDialog,
    private _notificationsSerivce: NotificationsService,
    private _analysisLayoutService: AnalysisLayoutService,
    private envConfigService: EnvConfigurationService,
    private _matDialog: MatDialog
  ) {}

  ngOnInit() {
    this.updateToolbar();

    this._subs.add(
      this.envConfigService.getComponentVersions().subscribe({
        next: versions => {
          this.uiVersion = versions.versions.find(v => v.component === "PIXLISE")?.version || "";
          if (this.uiVersion.length <= 0) {
            this.uiVersion = "(Local build)";
          } else {
            // TODO: Remove this when we're out of beta
            this.uiVersion = `v${this.uiVersion} (beta)`;
          }
        },
        error: err => {
          console.error("Failed to get UI version", err);
        },
      })
    );
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
          if (screenConfig.name) {
            this.titleToShow = screenConfig.name;
          }

          if (this._isAnalysisTab && screenConfig.scanConfigurations && Object.keys(screenConfig.scanConfigurations).length === 0) {
            this.onScanConfiguration();
          }
        }

        this.updateToolbar();
      })
    );

    this._subs.add(
      this._route.queryParams.subscribe(params => {
        this.queryParam = params;
        let scanId = params["scan_id"] || params["scanId"];
        if (scanId) {
          this.datasetID = scanId;
          this._dataSetLoadedName = "Scan " + scanId;
          this.updateToolbar();

          this._subs.add(
            this._analysisLayoutService.availableScans$.subscribe(scans => {
              let scan = scans.find(s => s.id === scanId);
              if (scan) {
                let sol = scan?.meta?.["Sol"] || "N/A";
                this._dataSetLoadedName = `SOL-${sol}: ${scan?.title || "N/A"}`;
                this.updateToolbar();
              }
            })
          );
        }
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

  onOpenTab(tab: NavigationTab): void {
    let strippedURL = this.router.url.split("?")[0];
    this.router.navigateByUrl(`${tab.url}?${this.queryParamString}`);
    this.openTabs.forEach(openTab => {
      openTab.active = strippedURL.endsWith(tab.url);
    });
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

  private updateToolbar(): void {
    // Title to show overrides the dataset name
    this.title = this.titleToShow ? this.titleToShow : this._dataSetLoadedName;

    // Work out what URL we're on
    const url = this.router.url;
    if (url.includes("/public/")) {
      this.isVisible = false;
    }

    // Build list of tabs
    if (this._dataSetLoadedName.length <= 0) {
      this.tabs = [
        //new TabNav('Help', 'help', true),
        new TabNav("Datasets", "datasets", true),
        new TabNav("Code Editor", "datasets/code-editor", true),
      ];
    } else {
      const datasetPrefix = "datasets/";
      const scanQueryParam = this.datasetID ? `?scan_id=${this.datasetID}` : "";

      let quantId = "";
      if (this.datasetID) {
        quantId = this._analysisLayoutService.getQuantIdForScan(this.datasetID);
        this.openTabs = this.allTabs.slice();
      }

      const codeEditorQueryParams = `?scanId=${this.datasetID}&quantId=${quantId}`;

      this.tabs = [
        //new TabNav('Help', 'help', true),
        new TabNav("Datasets", "datasets", true),
        new TabNav("Analysis", `${datasetPrefix}analysis${scanQueryParam}`, true),
        new TabNav("Code Editor", `datasets/code-editor${codeEditorQueryParams}`, true),
      ];
      // Only enabling maps tab if a quant is loaded
      // TODO: Hide maps tap if no quants or whatever... this all changed when multiple quantifications came in, for now just enabling it always
      // this.tabs.push(new TabNav("Element Maps", datasetPrefix + "/maps", true));
      // this.tabs.push(new TabNav("Element Maps", `${datasetPrefix}/maps${scanQueryParam}`, true));
      // if (!this.isPublicUser) {
      //   this.tabs.push(new TabNav("Quant Tracker", `${datasetPrefix}/quant-logs${scanQueryParam}`, true));
      // }
    }

    if (this._userPiquantConfigAllowed) {
      this.tabs.push(new TabNav("Piquant", "piquant", true));
    }

    this.tabs.push(new TabNav("Groups", "settings/groups", true));

    if (this._userUserAdminAllowed || this._userPiquantJobsAllowed) {
      this.tabs.push(new TabNav("Admin", "admin", true));
    }

    // Mark the right tab as being active
    // this._currTab = "";
    // for (let c = 0; c < this.tabs.length; c++) {
    //   // Remove query params
    //   let strippedURL = url.split("?")[0];
    //   this.tabs[c].active = strippedURL.endsWith("/" + this.tabs[c].url.split("?")[0]);

    //   if (this.tabs[c].active) {
    //     this._currTab = this.tabs[c].label;
    //   }
    // }

    let strippedURL = url.split("?")[0];
    this.openTabs.forEach(tab => {
      tab.active = strippedURL.endsWith(tab.url);
    });

    // Set the doc title to show the tab we're on
    this.titleService.setTitle("PIXLISE" + (this._currTab.length > 0 ? " - " + this._currTab : ""));

    // We only show saving of view state on analysis tab
    this._isAnalysisTab = this._currTab == "Analysis";
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

  get isLoggedIn(): boolean {
    return true;
    // return this._authService.loggedIn;
  }

  get showScanConfigurator(): boolean {
    return this.router.url.includes("/datasets/code-editor") || this._isAnalysisTab;
  }

  onScanConfiguration(): void {
    const dialogConfig = new MatDialogConfig<ScanConfigurationDialogData>();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;
    dialogConfig.width = "1200px";

    dialogConfig.data = {
      writeToQueryParams: this.router.url.includes("/datasets/code-editor"),
    };

    this._matDialog.open(ScanConfigurationDialog, dialogConfig);
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

  onExport(): void {
    // let choices = [
    //     new ExportDataChoice("raw-spectra", "Raw Spectral Data Per PMC .csv (and bulk .msa)", true),
    //     new ExportDataChoice("quant-map-csv", "PIQUANT Quantification map .csv", true),
    //     //new ExportDataChoice('quant-map-tif', 'Floating point map images .tif', false),
    //     new ExportDataChoice("beam-locations", "Beam Locations .csv", true),
    //     // new ExportDataChoice("context-image", "All context images with PMCs", false),
    //     new ExportDataChoice("unquantified-weight", "Unquantified Weight Percent .csv", true),
    //     new ExportDataChoice("ui-diffraction-peak", "Anomaly Features .csv", true),
    //     new ExportDataChoice("rois", "ROI PMC Membership List .csv", false, false),
    //     new ExportDataChoice("ui-roi-expressions", "ROI Expression Values .csv", false, false),
    // ];
    // const dialogConfig = new MatDialogConfig();
    // //dialogConfig.disableClose = true;
    // //dialogConfig.autoFocus = true;
    // //dialogConfig.width = '1200px';
    // dialogConfig.data = new ExportDataConfig("PIXLISE Data", "", true, true, true, false, choices, this._exportService);
    // const dialogRef = this.dialog.open(ExportDataDialogComponent, dialogConfig);
    // //dialogRef.afterClosed().subscribe...;
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
    return "https://discuss." + EnvConfigurationInitService.appConfig.appDomain;
  }
}
