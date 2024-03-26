import { Component, HostListener } from "@angular/core";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { FullScreenLayout, ScreenConfiguration, WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { createDefaultScreenConfiguration } from "../../models/screen-configuration.model";
import { Subscription } from "rxjs";
import { UsersService } from "src/app/modules/settings/services/users.service";

export type ScreenConfigurationCSS = {
  templateColumns: string;
  templateRows: string;
};

@Component({
  selector: "app-analysis-page",
  templateUrl: "./analysis-page.component.html",
  styleUrls: ["./analysis-page.component.scss"],
})
export class AnalysisPageComponent {
  private _subs: Subscription = new Subscription();
  private _keyPresses = new Set<string>();

  computedLayouts: ScreenConfigurationCSS[] = [];
  loadedScreenConfiguration: ScreenConfiguration | null = null;

  soloViewWidgetId: string | null = null;
  soloViewWidget: WidgetLayoutConfiguration | null = null;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _usersService: UsersService
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screen => {
        this.loadedScreenConfiguration = screen;
        this.computeLayouts();
      })
    );

    this._subs.add(
      this._analysisLayoutService.soloViewWidgetId$.subscribe(soloViewWidgetId => {
        this.soloViewWidgetId = soloViewWidgetId;

        if (soloViewWidgetId) {
          let widget = (this.loadedScreenConfiguration?.layouts || [])
            .map(layout => layout.widgets.find(widget => widget.id === soloViewWidgetId))
            .find(widget => widget !== undefined);
          this.soloViewWidget = widget || null;
          this._analysisLayoutService.delayNotifyCanvasResize(500);
        } else {
          this.soloViewWidget = null;
        }
      })
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

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }
}
