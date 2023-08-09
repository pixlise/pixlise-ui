import { Component, EventEmitter, Output, TemplateRef, ViewChild } from "@angular/core";
import { WidgetControlConfiguration } from "./widgets.model";

@Component({
    selector: "base-widget",
    template: "",
})
export class BaseWidgetModel {
    _widgetControlConfiguration: WidgetControlConfiguration = {};

    @Output() public onUpdateWidgetControlConfiguration: EventEmitter<any> = new EventEmitter<any>();
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