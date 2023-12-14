import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild } from "@angular/core";
import { WidgetControlConfiguration } from "./widgets.model";
import { WidgetData } from "src/app/generated-protos/widget-data";
import { BehaviorSubject } from "rxjs";

@Component({
  selector: "base-widget",
  template: "",
})
export class BaseWidgetModel {
  _widgetControlConfiguration: WidgetControlConfiguration = {};

  _isWidgetHighlighted: boolean = false;

  _widgetId: string = "";
  widgetData$ = new BehaviorSubject({});

  onWidgetDataChange(widgetData: WidgetData): void {}

  @Output() public onWidgetHighlight: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() public onUpdateWidgetControlConfiguration: EventEmitter<any> = new EventEmitter<any>();
  @Output() public onSaveWidgetData: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild("settingsMenu") settingsMenu!: TemplateRef<any>;

  get widgetControlConfiguration(): WidgetControlConfiguration {
    return this._widgetControlConfiguration;
  }

  set widgetControlConfiguration(widgetControlConfiguration: WidgetControlConfiguration) {
    this._widgetControlConfiguration = widgetControlConfiguration;
    this.onUpdateWidgetControlConfiguration.emit(this._widgetControlConfiguration);
  }

  get isWidgetHighlighted(): boolean {
    return this._isWidgetHighlighted;
  }

  set isWidgetHighlighted(isWidgetHighlighted) {
    this._isWidgetHighlighted = isWidgetHighlighted;
    this.onWidgetHighlight.emit(isWidgetHighlighted);
  }

  ngAfterViewInit(): void {
    this.onUpdateWidgetControlConfiguration.emit(this.widgetControlConfiguration);
  }
}
