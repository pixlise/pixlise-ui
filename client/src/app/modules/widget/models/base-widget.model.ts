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

  _widgetId: string = "";
  widgetData$ = new BehaviorSubject({});

  onWidgetDataChange(widgetData: WidgetData): void {}

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

  ngAfterViewInit(): void {
    this.onUpdateWidgetControlConfiguration.emit(this.widgetControlConfiguration);
  }
}
