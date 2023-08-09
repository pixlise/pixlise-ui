import { Component, ComponentRef, ElementRef, HostListener, ViewChild, ViewContainerRef } from "@angular/core";
import { WIDGETS, WidgetConfiguration, WidgetControlConfiguration, WidgetToolbarButtonConfiguration } from "./models/widgets.model";
import { Observable, debounceTime, first, fromEvent, map, startWith } from "rxjs";

@Component({
  selector: "widget",
  templateUrl: "./widget.component.html",
  styleUrls: ["./widget.component.scss"]
})
export class WidgetComponent {
  @ViewChild("currentWidget", { read: ViewContainerRef }) currentWidget!: ViewContainerRef;
  private _currentWidgetRef: ComponentRef<any> | null = null;

  @ViewChild("buttonsContainer") buttonsContainer!: ElementRef;
  @ViewChild("topToolbar") topToolbar!: ElementRef;

  visibleTopToolbarCount: number = 0;

  allWidgetOptions = Object.entries(WIDGETS).map(([id, value]) => ({ id, ...value }));
  _activeWidget: keyof typeof WIDGETS = "spectrum-chart";

  widgetConfiguration?: WidgetConfiguration;

  constructor(
  ) {
  }

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
        if (buttonsContainerWidth - topToolbarWidth > (firstOverflowed?.maxWidth || 100) && this.visibleTopToolbarCount < this.widgetConfiguration?.controlConfiguration?.topToolbar?.length) {
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

  copyConfiguration() {
    return {
      ...WIDGETS[this.activeWidget],
    }
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
