import { Component, HostListener } from "@angular/core";
import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import {
  ANALYSIS_TEMPLATES,
  createDefaultAnalysisTemplates,
  createDefaultOtherTabTemplates,
  createDefaultScreenConfiguration,
} from "../../models/screen-configuration.model";
import { Subscription } from "rxjs";
import { FullScreenLayout } from "../../../../generated-protos/screen-configuration";

export type ScreenConfigurationCSS = {
  templateColumns: string;
  templateRows: string;
};

@Component({
  selector: "app-new-tab-page",
  templateUrl: "./new-tab-page.component.html",
  styleUrls: ["./new-tab-page.component.scss"],
})
export class NewTabPageComponent {
  private _subs: Subscription = new Subscription();
  private _keyPresses = new Set<string>();

  public analysisTemplates: FullScreenLayout[] = createDefaultAnalysisTemplates();
  public otherTabs: FullScreenLayout[] = createDefaultOtherTabTemplates();

  constructor(private _analysisLayoutService: AnalysisLayoutService) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this._subs.unsubscribe();
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
