import { Component, HostListener } from "@angular/core";
// import { AnalysisLayoutService } from "../../services/analysis-layout.service";
import { ScanConfiguration, ScreenConfiguration, ScreenConfigurationCSS } from "src/app/generated-protos/screen-configuration";
// import { createDefaultScreenConfiguration } from "../../models/screen-configuration.model";
import { Subscription } from "rxjs";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { getPredefinedExpression } from "src/app/expression-language/predefined-expressions";
import { DataExpression } from "src/app/generated-protos/expressions";
import { ContextImageState, MapLayerVisibility, WidgetData } from "src/app/generated-protos/widget-data";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { ScanItem } from "src/app/generated-protos/scan";
import { MatSelectChange } from "@angular/material/select";
import { LiveExpression } from "src/app/modules/widget/models/base-widget.model";

@Component({
  selector: "app-map-browser-page",
  templateUrl: "./map-browser-page.component.html",
  styleUrls: ["./map-browser-page.component.scss"],
})
export class MapBrowserPageComponent {
  private _subs: Subscription = new Subscription();

  computedLayouts: ScreenConfigurationCSS[] = [];
  loadedScreenConfiguration: ScreenConfiguration | null = null;

  availableScanQuants: Record<string, QuantificationSummary[]> = {};
  allScans: ScanItem[] = [];
  configuredScans: ScanConfiguration[] = [];
  scanToTitleMap: Record<string, string> = {};

  idToTitleMap: Record<string, string> = {};
  private _quantifiedExpressions: Record<string, DataExpression> = {};

  widgetsPerPage = 4;
  public currentPage = 0;
  public pageCount = 0;

  scanId: string = "";
  quantId: string = "";

  liveExpressionMap: Record<string, LiveExpression> = {};

  constructor(private _analysisLayoutService: AnalysisLayoutService) {}

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(availableScanQuants => {
        this.availableScanQuants = availableScanQuants;
        this.loadQuantifiedExpressions();
        this.createElementMapScreenConfiguration();
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        this.configuredScans = [];
        Object.entries(screenConfiguration.scanConfigurations).forEach(([scanId, scanConfig]) => {
          this.configuredScans.push(ScanConfiguration.create(scanConfig));
        });
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(allScans => {
        this.allScans = allScans;
        this.scanToTitleMap = {};
        allScans.forEach(scan => {
          this.scanToTitleMap[scan.id] = scan.title;
        });
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  onScanChange(evt: MatSelectChange) {
    this.scanId = evt.value;
    this.quantId = this._analysisLayoutService.getQuantIdForScan(this.scanId);
    this.loadQuantifiedExpressions();
    this.createElementMapScreenConfiguration();
  }

  onSelectQuantForScan(quantId: string) {
    this.quantId = quantId;
    this.loadQuantifiedExpressions();
    this.createElementMapScreenConfiguration();
  }

  loadQuantifiedExpressions(): void {
    if (!this.scanId) {
      this.scanId = this._analysisLayoutService.defaultScanId;
    }

    if (!this.quantId) {
      this.quantId = this._analysisLayoutService.getQuantIdForScan(this.scanId);
    }

    this._quantifiedExpressions = {};

    let quants = this.availableScanQuants[this.scanId];
    if (quants) {
      let currentQuant = quants.find(quant => quant.id === this.quantId);
      if (currentQuant) {
        currentQuant.elements.forEach(quantElement => {
          let det = currentQuant?.params?.userParams?.quantMode || "";
          if (det.length > 0 && det != "Combined") {
            det = det.substring(0, 1);
          }

          const id = DataExpressionId.makePredefinedQuantElementExpression(quantElement, "%", det);
          const expr = getPredefinedExpression(id);
          if (expr) {
            this._quantifiedExpressions[id] = expr;
          }
        });

        this.pageCount = Math.ceil(Object.keys(this._quantifiedExpressions).length / this.widgetsPerPage);
        this.currentPage = 0;
      }
    }
  }

  get quantifiedExpressionCount(): number {
    return Object.keys(this._quantifiedExpressions).length;
  }

  onNextPage() {
    if (this.currentPage + 1 >= this.pageCount) {
      return;
    }

    this.currentPage++;
    this.injectNewExpressions();
  }

  onPreviousPage() {
    if (this.currentPage <= 0) {
      return;
    }

    this.currentPage--;
    this.injectNewExpressions();
  }

  injectNewExpressions() {
    if (!this.loadedScreenConfiguration) {
      this.createElementMapScreenConfiguration();
      return;
    }

    let currentPage = this.getCurrentPageExpressions();
    if (this.loadedScreenConfiguration.layouts.length !== currentPage.length) {
      this.createElementMapScreenConfiguration();
      return;
    }

    let layout = this.loadedScreenConfiguration.layouts[0];
    currentPage.forEach(([id, expression], i) => {
      let widgetId = `element-map-${id}-${this.scanId}`;
      this.idToTitleMap[widgetId] = expression.name;
      layout.widgets[i].id = widgetId;
      this.liveExpressionMap[widgetId] = { expressionId: expression.id, scanId: this.scanId, quantId: this.quantId, expression, mapsMode: true };

      layout.widgets[i].data = WidgetData.create({
        contextImage: ContextImageState.create({
          mapLayers: [MapLayerVisibility.create({ expressionID: expression.id })],
        }),
      });
    });
  }

  getCurrentPageExpressions() {
    return Object.entries(this._quantifiedExpressions).slice(this.widgetsPerPage * this.currentPage, this.widgetsPerPage * (this.currentPage + 1));
  }

  createElementMapScreenConfiguration() {
    this.loadedScreenConfiguration = ScreenConfiguration.create({
      id: `element-map-${this.scanId}`,
      name: "Element Map",
      layouts: [
        {
          rows: [],
          columns: [],
          widgets: [],
        },
      ],
    });

    let layout = this.loadedScreenConfiguration.layouts[0];

    this.computedLayouts = [{ templateColumns: "auto", templateRows: "auto" }];
    this.getCurrentPageExpressions().forEach(([id, expression], i) => {
      let startRow = Math.floor(i / 2) + 1;
      let startColumn = (i % 2) + 1;

      let widgetId = `element-map-${id}-${this.scanId}`;
      this.idToTitleMap[widgetId] = expression.name;
      this.liveExpressionMap[widgetId] = { expressionId: expression.id, scanId: this.scanId, quantId: this.quantId, expression };

      layout.widgets.push({
        id: widgetId,
        type: "context-image",
        startRow,
        startColumn,
        endRow: startRow + 1,
        endColumn: startColumn + 1,
        data: WidgetData.create({
          contextImage: ContextImageState.create({
            mapLayers: [MapLayerVisibility.create({ expressionID: expression.id })],
          }),
        }),
      });
    });
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }
}
