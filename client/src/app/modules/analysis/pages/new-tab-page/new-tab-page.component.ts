import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";

import { AnalysisLayoutService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { createDefaultAnalysisTemplates, createDefaultOtherTemplates, ScreenTemplate } from "../../models/screen-configuration.model";
import { TabLinks } from "src/app/models/TabLinks";

@Component({
  standalone: false,
  selector: "app-new-tab-page",
  templateUrl: "./new-tab-page.component.html",
  styleUrls: ["./new-tab-page.component.scss"],
})
export class NewTabPageComponent implements OnInit, OnDestroy {
  private _subs: Subscription = new Subscription();
  private _keyPresses = new Set<string>();

  public analysisTemplates: ScreenTemplate[] = createDefaultAnalysisTemplates();
  public otherTemplates: ScreenTemplate[] = createDefaultOtherTemplates();

  queryParam: Record<string, string> = {};

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _router: Router,
    private _route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._route.queryParams.subscribe(params => {
        this.queryParam = { ...params };
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  getQueryParamString(): string {
    return Object.entries(this.queryParam)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  }

  // getWidgetIconUrl(widgetType: string): string {
  //   return `assets/chart-placeholders/${widgetType}.svg` || "";
  // }

  onAnalysisTemplateClick(tab: ScreenTemplate): void {
    const screenConfig = this._analysisLayoutService.addScreenConfigurationLayout(tab?.layout);
    if (!screenConfig) {
      return;
    }

    const lastTabId = screenConfig.layouts.length - 1;
    this.queryParam["tab"] = lastTabId.toString();

    this._router.navigateByUrl(`${TabLinks.analysis}?${this.getQueryParamString()}`);
  }

  onOtherTemplateClick(tab: ScreenTemplate): void {
    const screenConfig = this._analysisLayoutService.activeScreenConfiguration$.value;

    if (tab.id === "browse") {
      if (screenConfig.browseTabHidden) {
        screenConfig.browseTabHidden = false;
        this._analysisLayoutService.writeScreenConfiguration(screenConfig);
      }

      this._router.navigateByUrl(`${TabLinks.browse}?${this.getQueryParamString()}`);
    }

    if (tab.id === "code-editor") {
      if (screenConfig.codeEditorTabHidden) {
        screenConfig.codeEditorTabHidden = false;
        this._analysisLayoutService.writeScreenConfiguration(screenConfig);
      }

      this._router.navigateByUrl(`${TabLinks.codeEditor}?${this.getQueryParamString()}`);
    } else if (tab.id === "element-maps") {
      if (screenConfig.elementMapsTabHidden) {
        screenConfig.elementMapsTabHidden = false;
        this._analysisLayoutService.writeScreenConfiguration(screenConfig);
      }

      this._router.navigateByUrl(`${TabLinks.maps}?${this.getQueryParamString()}`);
    }
  }

  @HostListener("window:keydown", ["$event"])
  onKeydown(event: KeyboardEvent): void {
    const cmdOrCtrl = this._analysisLayoutService.isWindows ? "Control" : "Meta";
    const bOrAltB = this._analysisLayoutService.isFirefox ? "∫" : "b";

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

  @HostListener("window:resize", [])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }
}
