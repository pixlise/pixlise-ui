import { Component, HostListener, OnDestroy, OnInit } from "@angular/core";
import {
  FullScreenLayout,
  ScanConfiguration,
  ScreenConfiguration,
  ScreenConfigurationCSS,
  WidgetLayoutConfiguration,
} from "src/app/generated-protos/screen-configuration";
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
export class MapBrowserPageComponent implements OnInit, OnDestroy {
  public static defaultWidgetsPerPageOptions = [4, 9, 12, 16];

  private _subs: Subscription = new Subscription();

  computedLayouts: ScreenConfigurationCSS[] = [];

  layout: FullScreenLayout = FullScreenLayout.create({});
  loadedScreenConfiguration: ScreenConfiguration | null = null;

  availableScanQuants: Record<string, QuantificationSummary[]> = {};
  allScans: ScanItem[] = [];
  configuredScans: ScanConfiguration[] = [];
  scanToTitleMap: Record<string, string> = {};

  idToTitleMap: Record<string, string> = {};
  private _quantifiedExpressions: Record<string, DataExpression> = {};

  widgetsPerPageOptions = MapBrowserPageComponent.defaultWidgetsPerPageOptions.slice();
  private _widgetsPerPage = 4;
  public currentPage = 0;
  public pageCount = 0;

  scanId: string = "";
  quantId: string = "";

  liveExpressionMap: Record<string, LiveExpression> = {};

  soloViewWidgetId: string | null = null;
  soloViewWidget: WidgetLayoutConfiguration | null = null;

  _showScanPoints = false;
  _showScanFootprint = true;

  constructor(private _analysisLayoutService: AnalysisLayoutService) {}

  ngOnInit(): void {
    this._subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(availableScanQuants => {
        this.availableScanQuants = availableScanQuants;
        this.loadQuantifiedExpressions();
        this.injectNewExpressions();
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

    this._subs.add(
      this._analysisLayoutService.soloViewWidgetId$.subscribe(soloViewWidgetId => {
        this.soloViewWidgetId = soloViewWidgetId;

        if (soloViewWidgetId) {
          let widget = (this.layout?.widgets || []).find(widget => widget?.id === soloViewWidgetId);
          this.soloViewWidget = widget || null;
          this._analysisLayoutService.delayNotifyCanvasResize(500);
        } else {
          this.soloViewWidget = null;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get showScanPoints(): boolean {
    return this._showScanPoints;
  }

  set showScanPoints(value: boolean) {
    this._showScanPoints = value;
    this.injectNewExpressions();
  }

  get showScanFootprint(): boolean {
    return this._showScanFootprint;
  }

  set showScanFootprint(value: boolean) {
    this._showScanFootprint = value;
    this.injectNewExpressions();
  }

  get widgetsPerPage(): number {
    return this._widgetsPerPage;
  }

  set widgetsPerPage(value: number) {
    this._widgetsPerPage = value;
    this.pageCount = Math.ceil(Object.keys(this._quantifiedExpressions).length / this.widgetsPerPage);
    this.currentPage = 0;
    this.injectNewExpressions();
    this._analysisLayoutService.delayNotifyCanvasResize(500);
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

        this.widgetsPerPageOptions = [...MapBrowserPageComponent.defaultWidgetsPerPageOptions, currentQuant.elements.length].filter(
          count => count <= currentQuant.elements.length
        );
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
    this._analysisLayoutService.soloViewWidgetId$.next("");
  }

  onPreviousPage() {
    if (this.currentPage <= 0) {
      return;
    }

    this.currentPage--;
    this.injectNewExpressions();
    this._analysisLayoutService.soloViewWidgetId$.next("");
  }

  injectNewExpressions() {
    this.createElementMapScreenConfiguration();
  }

  getCurrentPageExpressions() {
    return Object.entries(this._quantifiedExpressions).slice(this.widgetsPerPage * this.currentPage, this.widgetsPerPage * (this.currentPage + 1));
  }

  trackByWidget(index: number, widget: WidgetLayoutConfiguration) {
    return widget.id;
  }

  createElementMapScreenConfiguration() {
    let layout: FullScreenLayout = FullScreenLayout.create({});

    // Automatically adjust based on total widgetsPerPage
    let columnCount = Math.min(Math.ceil(Math.sqrt(this.widgetsPerPage)), 4);
    let rowCount = Math.ceil(this.widgetsPerPage / columnCount);

    let templateColumns = Array(columnCount).fill("1fr").join(" ");
    let templateRows = Array(rowCount).fill("1fr").join(" ");

    this.computedLayouts = [{ templateColumns, templateRows }];
    this.getCurrentPageExpressions().forEach(([id, expression], i) => {
      let startRow = Math.floor(i / columnCount) + 1;
      let startColumn = (i % columnCount) + 1;

      let widgetId = `element-map-${id}-${this.scanId}`;
      this.idToTitleMap[widgetId] = expression.name;
      this.liveExpressionMap[widgetId] = {
        expressionId: expression.id,
        scanId: this.scanId,
        quantId: this.quantId,
        expression,
        mapsMode: true,
      };

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
            hideFootprintsForScans: !this.showScanFootprint ? [this.scanId] : [],
            hidePointsForScans: !this.showScanPoints ? [this.scanId] : [],
            hideImage: true,
          }),
        }),
      });
    });

    this.layout = layout;
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Window resized, notify all canvases
    this._analysisLayoutService.notifyWindowResize();
  }
}
