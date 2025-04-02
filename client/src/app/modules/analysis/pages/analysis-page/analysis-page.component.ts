import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { FullScreenLayout, ScreenConfiguration, WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { createDefaultScreenConfiguration } from "../../models/screen-configuration.model";
import { combineLatest, distinctUntilChanged, map, of, Subscription, switchMap } from "rxjs";
import { UsersService } from "src/app/modules/settings/services/users.service";
import { ActivatedRoute } from "@angular/router";

export type ScreenConfigurationCSS = {
  templateColumns: string;
  templateRows: string;
};

@Component({
  selector: "app-analysis-page",
  templateUrl: "./analysis-page.component.html",
  styleUrls: ["./analysis-page.component.scss"],
})
export class AnalysisPageComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();
  private _keyPresses = new Set<string>();

  computedLayouts: ScreenConfigurationCSS[] = [];
  loadedScreenConfiguration: ScreenConfiguration | null = null;

  activeLayout: FullScreenLayout | null = null;
  activeLayoutIndex: number = 0;

  soloViewWidgetId: string | null = null;
  soloViewWidget: WidgetLayoutConfiguration | null = null;

  activeMagicLink: string | null = null;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _usersService: UsersService,
    private _route: ActivatedRoute
  ) {}

  decodeUrlSafeBase64 = (input: string): string => {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    return atob(base64 + padding);
  };

  ngOnInit(): void {
    this._subs.add(
      combineLatest([
        this._analysisLayoutService.activeScreenConfiguration$.pipe(distinctUntilChanged()),
        this._analysisLayoutService.activeScreenConfigurationId$.pipe(distinctUntilChanged()),
        this._analysisLayoutService.soloViewWidgetId$.pipe(distinctUntilChanged()),
        this._route.queryParams.pipe(
          map(params => parseInt(params?.["tab"] || "0")),
          distinctUntilChanged()
        ),
        this._route.queryParams.pipe(
          map(params => String(params?.["ml"] || "")),
          distinctUntilChanged()
        ),
      ])
        .pipe(
          switchMap(([screen, id, soloViewWidgetId, tabNumber, magicLink]) => {
            if (magicLink && magicLink !== this.activeMagicLink) {
              this.activeMagicLink = magicLink;
              this._analysisLayoutService.loginWithMagicLink(magicLink);
            } else if (!screen || !id || screen.id !== id) {
              this.loadedScreenConfiguration = createDefaultScreenConfiguration();
              return of(null);
            }

            this.loadedScreenConfiguration = screen;
            this.computeLayouts();
            this.soloViewWidgetId = soloViewWidgetId;

            if (soloViewWidgetId) {
              let widget = (screen?.layouts || []).map(layout => layout.widgets.find(widget => widget.id === soloViewWidgetId)).find(widget => widget !== undefined);
              this.soloViewWidget = widget || null;
              this._analysisLayoutService.delayNotifyCanvasResize(500);
            } else {
              this.soloViewWidget = null;
            }

            this.activeLayoutIndex = !isNaN(tabNumber) ? tabNumber : 0;
            if (screen && screen.layouts.length > this.activeLayoutIndex) {
              this.activeLayout = screen.layouts[this.activeLayoutIndex];
            }

            return of(null);
          })
        )
        .subscribe()
    );

    this._usersService.searchUsers("");
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  trackByWidgetId(index: number, widget: WidgetLayoutConfiguration): string {
    return widget.id;
  }

  trackByLayoutId(index: number, layout: FullScreenLayout): string {
    return `${index}-${this.loadedScreenConfiguration?.id}`;
  }

  computeLayouts() {
    if (!this.loadedScreenConfiguration) {
      this.loadedScreenConfiguration = createDefaultScreenConfiguration();
    }

    let newLayout = this.loadedScreenConfiguration.layouts.map(layout => {
      let templateRows = layout.rows.map(row => `${row.height}fr`).join(" ");
      let templateColumns = layout.columns.map(column => `${column.width}fr`).join(" ");
      return { templateColumns, templateRows };
    });

    // Only update layout if there's a difference
    if (
      newLayout.length !== this.computedLayouts.length ||
      newLayout.some(
        (layout, i) => layout.templateColumns !== this.computedLayouts[i].templateColumns || layout.templateRows !== this.computedLayouts[i].templateRows
      )
    ) {
      this.computedLayouts = newLayout;
    }

    if (this.loadedScreenConfiguration.layouts.length > this.activeLayoutIndex) {
      this.activeLayout = this.loadedScreenConfiguration.layouts[this.activeLayoutIndex];
    } else {
      console.log("Active layout index is out of bounds, ", this.activeLayoutIndex, this.loadedScreenConfiguration.layouts);
      this.activeLayout = null;
    }
  }

  @HostListener("window:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    let cmdOrCtrl = this._analysisLayoutService.isWindows ? "Control" : "Meta";
    let bOrAltB = this._analysisLayoutService.isFirefox ? "∫" : "b";

    this._keyPresses.add(event.key);
    if (this._keyPresses.has(cmdOrCtrl) && this._keyPresses.has(bOrAltB)) {
      if (event.key === cmdOrCtrl) {
        this._keyPresses.delete(cmdOrCtrl);
        this._keyPresses.delete(bOrAltB);
      }
      this._keyPresses.delete(event.key);

      this._analysisLayoutService.toggleSidePanel();
    }
  }

  @HostListener("window:keyup", ["$event"])
  onKeyup(event: KeyboardEvent): void {
    this._keyPresses.delete(event.key);
  }

  @HostListener("window:blur")
  onWindowBlur(): void {
    this._keyPresses.clear();
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }
}
