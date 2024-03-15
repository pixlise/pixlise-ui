import { Component, ComponentRef, EventEmitter, Output, TemplateRef, ViewChild } from "@angular/core";
import { WidgetControlConfiguration } from "./widgets.model";
import { WidgetData } from "src/app/generated-protos/widget-data";
import { BehaviorSubject } from "rxjs";

@Component({
  selector: "base-widget",
  template: "",
})
export class BaseWidgetModel {
  _ref: ComponentRef<any> | null = null;
  _widgetControlConfiguration: WidgetControlConfiguration = {};

  _isWidgetHighlighted: boolean = false;

  _widgetId: string = "";
  widgetData$ = new BehaviorSubject({});

  _isWidgetDataLoading: boolean = false;
  _isWidgetDataError: boolean = false;
  _widgetDataErrorMessage: string = "";

  onWidgetDataChange(widgetData: WidgetData): void {}

  @Output() public onWidgetHighlight: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() public onWidgetLoading: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() public onWidgetDataErrorMessage: EventEmitter<string> = new EventEmitter<string>();

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

  get widgetErrorMessage(): string {
    return this._widgetDataErrorMessage;
  }

  set widgetErrorMessage(widgetErrorMessage: string) {
    this._widgetDataErrorMessage = widgetErrorMessage;
    this._isWidgetDataError = !!widgetErrorMessage;
    this._isWidgetDataLoading = false;
    this.onWidgetDataErrorMessage.emit(widgetErrorMessage);
  }

  get isWidgetDataLoading(): boolean {
    return this._isWidgetDataLoading;
  }

  set isWidgetDataLoading(isWidgetDataLoading) {
    this._isWidgetDataLoading = isWidgetDataLoading;
    this._isWidgetDataError = false;
    this._isWidgetDataLoading = false;
    this.onWidgetLoading.emit(isWidgetDataLoading);
  }

  ngAfterViewInit(): void {
    this.onUpdateWidgetControlConfiguration.emit(this.widgetControlConfiguration);
  }
}
