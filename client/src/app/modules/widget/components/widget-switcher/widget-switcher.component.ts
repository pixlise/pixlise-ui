import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit, OnDestroy } from "@angular/core";
import { WidgetConfiguration, WidgetType } from "../../models/widgets.model";
import { getWidgetIconUrl } from "../../../pixlisecore/components/atoms/layout-preview-box/layout-preview-box.component";
import { Overlay, OverlayRef, PositionStrategy } from "@angular/cdk/overlay";
import { ComponentPortal } from "@angular/cdk/portal";
import { Subscription } from "rxjs";
import { WidgetSwitcherOverlayComponent } from "./widget-switcher-overlay/widget-switcher-overlay.component";
import { AnalysisLayoutService } from "../../../analysis/services/analysis-layout.service";
import { WidgetData } from "../../../../generated-protos/widget-data";
import { WidgetMetadataGetResp } from "../../../../generated-protos/widget-data-msgs";

@Component({
  selector: "widget-switcher",
  templateUrl: "./widget-switcher.component.html",
  styleUrls: ["./widget-switcher.component.scss"],
})
export class WidgetSwitcherComponent implements OnInit, OnDestroy {
  @ViewChild("trigger") trigger!: ElementRef;
  @Input() widgetId: string = "";
  @Input() widgetOptions: WidgetConfiguration[] = [];
  @Input() disableSwitch: boolean = false;
  @Input() description?: string;

  private _activeWidget: WidgetConfiguration | null = null;
  private _activeWidgetType: WidgetType = "ternary-plot";

  @Output() widgetChange = new EventEmitter<WidgetType>();

  private overlayRef: OverlayRef | null = null;
  private subscription = new Subscription();
  isOpen = false;

  private _subs = new Subscription();

  widgetName: string = "";
  widgetDescription: string = "";

  constructor(
    private overlay: Overlay,
    private _analysisLayoutService: AnalysisLayoutService
  ) {}

  ngOnInit() {
    // Small request to just get the widget name and description
    this._subs.add(
      this._analysisLayoutService.fetchWidgetMetadataAsync(this.widgetId).subscribe((widgetMetadata: WidgetMetadataGetResp | undefined) => {
        if (widgetMetadata) {
          this.widgetName = widgetMetadata.widgetName || "";
          this.widgetDescription = widgetMetadata.widgetDescription || "";
        }
      })
    );

    // If something else updates the widget data, update the widget name and description
    this._subs.add(
      this._analysisLayoutService.widgetData$.subscribe((widgetData: Map<string, WidgetData>) => {
        if (widgetData) {
          this.widgetName = widgetData.get(this.widgetId)?.widgetName || "";
          this.widgetDescription = widgetData.get(this.widgetId)?.widgetDescription || "";
        }
      })
    );
  }

  ngOnDestroy() {
    this.closeOverlay();
    this.subscription.unsubscribe();
  }

  @Input() set activeWidgetType(widget: WidgetType) {
    this._activeWidgetType = widget;
    this._activeWidget = this.widgetOptions.find(w => w.id === widget) || null;
  }

  get activeWidgetType(): WidgetType {
    return this._activeWidgetType;
  }

  get activeWidget(): WidgetConfiguration | null {
    return this._activeWidget;
  }

  getWidgetIconUrl(widgetType: string): string {
    return getWidgetIconUrl(widgetType);
  }

  openOverlay() {
    if (this.isOpen || this.disableSwitch) return;

    const positionStrategy = this.getPositionStrategy();
    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.close(),
      hasBackdrop: true,
      backdropClass: "widget-switcher-backdrop",
    });

    const portal = new ComponentPortal(WidgetSwitcherOverlayComponent);
    const componentRef = this.overlayRef.attach(portal);

    componentRef.instance.widgetId = this.widgetId;
    componentRef.instance.widgetOptions = this.widgetOptions;
    componentRef.instance.activeWidgetType = this.activeWidgetType;
    componentRef.instance.activeWidget = this.activeWidget;

    this.subscription.add(
      componentRef.instance.widgetSelected.subscribe((widget: WidgetType) => {
        this.onWidgetChange(widget);
        this.closeOverlay();
      })
    );

    this.subscription.add(
      this.overlayRef.backdropClick().subscribe(() => {
        this.closeOverlay();
      })
    );

    this.isOpen = true;
  }

  closeOverlay() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.isOpen = false;
    }
  }

  private getPositionStrategy(): PositionStrategy {
    return this.overlay
      .position()
      .flexibleConnectedTo(this.trigger)
      .withPositions([
        {
          originX: "start",
          originY: "bottom",
          overlayX: "start",
          overlayY: "top",
          offsetY: 8,
        },
        {
          originX: "start",
          originY: "top",
          overlayX: "start",
          overlayY: "bottom",
          offsetY: -8,
        },
      ]);
  }

  onWidgetChange(widget: WidgetType) {
    this.widgetChange.emit(widget);
  }
}
