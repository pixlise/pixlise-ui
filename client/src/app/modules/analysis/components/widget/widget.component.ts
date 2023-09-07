import { Component, ComponentRef, ElementRef, HostListener, ViewChild, ViewContainerRef, AfterViewChecked } from "@angular/core";
import { WIDGETS, WidgetConfiguration, WidgetControlConfiguration, WidgetToolbarButtonConfiguration } from "./models/widgets.model";

@Component({
  selector: "widget",
  templateUrl: "./widget.component.html",
  styleUrls: ["./widget.component.scss"],
})
export class WidgetComponent implements AfterViewChecked {
  @ViewChild("currentWidget", { read: ViewContainerRef }) currentWidget!: ViewContainerRef;
  private _currentWidgetRef: ComponentRef<any> | null = null;

  @ViewChild("buttonsContainer") buttonsContainer!: ElementRef;

  @ViewChild("topToolbar") topToolbar!: ElementRef;
  @ViewChild("bottomToolbar") bottomToolbar!: ElementRef;

  @ViewChild("topLeftInset") topLeftInset!: ElementRef;
  @ViewChild("topCenterInset") topCenterInset!: ElementRef;
  @ViewChild("topRightInset") topRightInset!: ElementRef;

  @ViewChild("bottomLeftInset") bottomLeftInset!: ElementRef;
  @ViewChild("bottomRightInset") bottomRightInset!: ElementRef;

  visibleTopToolbarCount: number = 0;

  allWidgetOptions = Object.entries(WIDGETS).map(([id, value]) => ({ id, ...value }));
  _activeWidget: keyof typeof WIDGETS = /*Object.keys(WIDGETS)[Math.random() * (Object.keys(WIDGETS).length-1)] as keyof typeof WIDGETS; */ "ternary-plot"; //"spectrum-chart";

  widgetConfiguration?: WidgetConfiguration;

  constructor() {}

  @HostListener("window:resize", [])
  onResize() {
    this.hideOverflowedButtons();
  }

  initOverflowState() {
    let buttonsContainerWidth = this.buttonsContainer.nativeElement.offsetWidth;
    let topToolbarWidth = 0;
    if (this.widgetConfiguration?.controlConfiguration?.topToolbar) {
      this.widgetConfiguration.controlConfiguration.topToolbar.forEach((button, index) => {
        let buttonWidth = button.maxWidth || 60;
        if (topToolbarWidth + buttonWidth < buttonsContainerWidth) {
          topToolbarWidth += buttonWidth;
          button._overflowed = false;
        } else {
          button._overflowed = true;
          this.visibleTopToolbarCount = index;
        }
      });
    }
  }

  hideOverflowedButtons() {
    let buttonsContainerWidth = this.buttonsContainer.nativeElement.offsetWidth;
    let topToolbarWidth = this.topToolbar.nativeElement.offsetWidth;

    if (this.widgetConfiguration?.controlConfiguration?.topToolbar) {
      if (buttonsContainerWidth - topToolbarWidth <= 60 && this.visibleTopToolbarCount > 0) {
        this.visibleTopToolbarCount -= 1;
      } else {
        let firstOverflowed = this.widgetConfiguration.controlConfiguration.topToolbar[this.visibleTopToolbarCount];
        if (
          buttonsContainerWidth - topToolbarWidth > (firstOverflowed?.maxWidth || 100) &&
          this.visibleTopToolbarCount < this.widgetConfiguration?.controlConfiguration?.topToolbar?.length
        ) {
          {
            this.visibleTopToolbarCount += 1;
          }
        }
      }

      this.widgetConfiguration.controlConfiguration.topToolbar.forEach((button, index) => {
        if (index < this.visibleTopToolbarCount) {
          button._overflowed = false;
        } else {
          button._overflowed = true;
        }
      });
    }
  }

  get settingsMenu() {
    return this._currentWidgetRef?.instance?.settingsMenu;
  }

  get activeWidget() {
    return this._activeWidget;
  }

  set activeWidget(widget: keyof typeof WIDGETS) {
    this._activeWidget = widget;
    this.loadWidget();
  }

  get topToolbarButtons() {
    return this.widgetConfiguration?.controlConfiguration?.topToolbar || [];
  }

  get bottomToolbarButtons() {
    return this.widgetConfiguration?.controlConfiguration?.bottomToolbar || [];
  }

  get topLeftInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.topLeftInsetButton;
  }

  get topCenterInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.topCenterInsetButton;
  }

  get topRightInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.topRightInsetButton;
  }

  get bottomLeftInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.bottomLeftInsetButton;
  }

  get bottomRightInsetButton() {
    return this.widgetConfiguration?.controlConfiguration?.bottomRightInsetButton;
  }

  copyConfiguration() {
    return {
      ...WIDGETS[this.activeWidget],
    };
  }

  loadWidget() {
    if (this._currentWidgetRef) {
      this._currentWidgetRef.destroy();
      this._currentWidgetRef = null;
    }

    this.widgetConfiguration = this.copyConfiguration();
    this._currentWidgetRef = this.currentWidget.createComponent(this.widgetConfiguration!.component);

    if (this._currentWidgetRef.instance.onUpdateWidgetControlConfiguration) {
      this._currentWidgetRef.instance.onUpdateWidgetControlConfiguration.subscribe((config: WidgetControlConfiguration) => {
        this.widgetConfiguration!.controlConfiguration = config;
        this.initOverflowState();
      });
    }
  }

  ngAfterViewChecked(): void {
    if (!this._currentWidgetRef) {
      this.loadWidget();
    }
  }
}
