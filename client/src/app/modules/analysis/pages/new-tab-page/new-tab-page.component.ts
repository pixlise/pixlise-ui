import { Component, HostListener } from "@angular/core";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import {
  ANALYSIS_TEMPLATES,
  createDefaultAnalysisTemplates,
  createDefaultOtherTemplates,
  createDefaultScreenConfiguration,
  ScreenTemplate,
} from "../../models/screen-configuration.model";
import { Subscription } from "rxjs";
import { FullScreenLayout, ScreenConfigurationCSS } from "../../../../generated-protos/screen-configuration";
import { ActivatedRoute, Router } from "@angular/router";
import { TabLinks } from "../../../../models/TabLinks";

@Component({
  selector: "app-new-tab-page",
  templateUrl: "./new-tab-page.component.html",
  styleUrls: ["./new-tab-page.component.scss"],
})
export class NewTabPageComponent {
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

  onAnalysisTemplateClick(tab: ScreenTemplate): void {
    let screenConfig = this._analysisLayoutService.addScreenConfigurationLayout(tab?.layout);
    if (!screenConfig) {
      return;
    }

    let lastTabId = screenConfig.layouts.length - 1;
    this.queryParam["tab"] = lastTabId.toString();

    console.log("this.queryParam", this.queryParam, screenConfig);
    this._router.navigateByUrl(`${TabLinks.analysis}?${this.getQueryParamString()}`);
  }

  onOtherTemplateClick(tab: ScreenTemplate): void {
    if (tab.id === "code-editor") {
      this._router.navigateByUrl(`${TabLinks.codeEditor}?${this.getQueryParamString()}`);
    } else if (tab.id === "element-maps") {
      this._router.navigateByUrl(`${TabLinks.maps}?${this.getQueryParamString()}`);
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
