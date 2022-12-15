// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { BrowserModule, Title } from "@angular/platform-browser";
import { NgModule, ErrorHandler, Injectable, APP_INITIALIZER } from "@angular/core";
import { HTTP_INTERCEPTORS, HttpErrorResponse, HttpClientModule } from "@angular/common/http";
import { FormsModule } from "@angular/forms";
import { MAT_DIALOG_DEFAULT_OPTIONS,  MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatTooltipModule } from "@angular/material/tooltip";
import { OverlayModule } from "@angular/cdk/overlay";
import { CdkAccordionModule } from "@angular/cdk/accordion";
import { DragDropModule } from "@angular/cdk/drag-drop";

import * as Sentry from "@sentry/browser";

import { CodemirrorModule } from "@ctrl/ngx-codemirror";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";

import { AboutComponent } from "./routes/about/about.component";
import { DatasetsComponent } from "./routes/datasets/datasets.component";
import { PageNotFoundComponent } from "./routes/page-not-found/page-not-found.component";
import { AuthenticateComponent } from "./routes/authenticate/authenticate.component";
import { DatasetComponent } from "./routes/dataset/dataset.component";

import { AnalysisComponent } from "./routes/dataset/analysis/analysis.component";
import { QuantificationsComponent } from "./routes/dataset/quantifications/quantifications.component";
import { MapBrowserComponent } from "./routes/dataset/map-browser/map-browser.component";

import { ToolbarComponent } from "./UI/toolbar/toolbar.component";

import { DataSetSummaryComponent } from "./routes/datasets/data-set-summary/data-set-summary.component";
import { HttpInterceptorService } from "src/app/services/http-interceptor.service";

import { ContextImageToolbarComponent } from "./UI/context-image-view-widget/context-image-toolbar/context-image-toolbar.component";
import { ContextImageViewWidgetComponent } from "./UI/context-image-view-widget/context-image-view-widget.component";
import { LayerControlComponent } from "./UI/context-image-view-widget/layer-control/layer-control.component";
import { ContextImagePickerComponent } from "./UI/context-image-view-widget/context-image-picker/context-image-picker.component";

import { QuantResultSummaryComponent } from "./routes/dataset/quantifications/quant-result-summary/quant-result-summary.component";
import { QuantResultListComponent } from "./routes/dataset/quantifications/quant-result-list/quant-result-list.component";
import { InteractiveCanvasComponent } from "./UI/atoms/interactive-canvas/interactive-canvas.component";
import { ChordViewWidgetComponent } from "./UI/chord-view-widget/chord-view-widget.component";
import { BinaryPlotWidgetComponent } from "./UI/binary-plot-widget/binary-plot-widget.component";
import { TernaryPlotWidgetComponent } from "./UI/ternary-plot-widget/ternary-plot-widget.component";
import { ScatterPlotViewComponent } from "./UI/scatter-plot-view/scatter-plot-view.component";

import { MaterialModule } from "./modules/material.module";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { FlexLayoutModule } from "@angular/flex-layout";

import { PanelComponent } from "./UI/atoms/panel/panel.component";

import { ElementTileComponent } from "./UI/periodic-table/element-tile/element-tile.component";
import { PeriodicTableComponent } from "./UI/periodic-table/periodic-table.component";
import { QuantificationTableComponent } from "./UI/quantification-table/quantification-table.component";
import { HistogramViewComponent } from "./UI/histogram-view/histogram-view.component";
import { QuantificationSelectorComponent } from "./UI/quantification-selector/quantification-selector.component";

import { WidgetDisplayMessageComponent } from "./UI/atoms/widget-display-message/widget-display-message.component";
import { UserMenuPanelComponent } from "./UI/user-menu-panel/user-menu-panel.component";

import { QuantificationStartOptionsComponent } from "./UI/quantification-start-options/quantification-start-options.component";
import { VersionDisplayComponent } from "./routes/about/version-display/version-display.component";

import { QuantSelectorPanelComponent } from "./UI/quantification-selector/quant-selector-panel/quant-selector-panel.component";
import { ExpressionEditorComponent } from "./UI/expression-editor/expression-editor.component";

import { Base64ImagePipe } from "./utils/base64-image.pipe";
import { AddBearerPipe } from "./utils/add-bearer-header.pipe";

import { DatasetLoadingProgressComponent } from "./routes/dataset/dataset-loading-progress/dataset-loading-progress.component";
import { SelectedQuantificationViewComponent } from "./routes/dataset/quantifications/selected-quantification-view/selected-quantification-view.component";

import { AdminComponent } from "./routes/admin/admin.component";
import { UsersComponent } from "./routes/admin/users/users.component";

import { PiquantComponent } from "./routes/piquant/piquant.component";
import { PiquantConfigComponent } from "./routes/piquant/piquant-config/piquant-config.component";
import { PiquantDownloadsComponent } from "./routes/piquant/piquant-downloads/piquant-downloads.component";
import { RolesComponent } from "./routes/admin/roles/roles.component";
import { UserListItemComponent } from "./routes/admin/user-list-item/user-list-item.component";
import { SnackBarComponent } from "./UI/atoms/snack-bar/snack-bar.component";
import { SnackComponent } from "./UI/atoms/snack-bar/snack/snack.component";
import { SliderComponent } from "./UI/atoms/slider/slider.component";
import { ClosableListComponent } from "./UI/atoms/closable-list/closable-list.component";
import { PickerDialogComponent } from "./UI/atoms/picker-dialog/picker-dialog.component";
import { MapViewComponent } from "./UI/context-image-view-widget/map-view/map-view.component";

import { MultiStateButtonComponent } from "./UI/atoms/buttons/multi-state-button/multi-state-button.component";
import { PanelFoldoutButtonComponent } from "./UI/atoms/buttons/panel-foldout-button/panel-foldout-button.component";
import { PushButtonComponent } from "./UI/atoms/buttons/push-button/push-button.component";
import { TwoStateEditButtonComponent } from "./UI/atoms/buttons/two-state-edit-button/two-state-edit-button.component";
import { IconButtonComponent } from "./UI/atoms/buttons/icon-button/icon-button.component";
import { TwoStateButtonComponent } from "./UI/atoms/buttons/two-state-button/two-state-button.component";
import { BulkSelectionSwitchComponent } from "./UI/atoms/buttons/two-state-button/bulk-selection-switch.component";
import { PlusMinusSwitchComponent } from "./UI/atoms/buttons/two-state-button/plus-minus-switch.component";
import { SwitchButtonComponent } from "./UI/atoms/buttons/switch-button/switch-button.component";
import { MultiSwitchButtonComponent } from "./UI/atoms/buttons/multi-switch-button/multi-switch-button.component";
import { TwoStateIconButton } from "./UI/atoms/buttons/two-state-button/two-state-icon-button.component";
import { TwoStateIconPushButton } from "./UI/atoms/buttons/two-state-button/two-state-icon-push-button.component";
import { TwoStatePushButton } from "./UI/atoms/buttons/two-state-button/two-state-push-button.component";
import { TwoStateIconSwitchComponent } from "./UI/atoms/buttons/two-state-button/two-state-icon-switch.component";

import { SpectrumToolbarComponent } from "./UI/spectrum-chart-widget/spectrum-toolbar/spectrum-toolbar.component";
import { SpectrumChartWidgetComponent } from "./UI/spectrum-chart-widget/spectrum-chart-widget.component";
import { SpectrumEnergyCalibrationComponent } from "./UI/spectrum-chart-widget/spectrum-energy-calibration/spectrum-energy-calibration.component";
import { SpectrumPeakIdentificationComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/spectrum-peak-identification.component";
import { AnnotationOptionsComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/annotations/annotation-options/annotation-options.component";
import { ElementSetsComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/tabs/element-sets.component";
import { AnnotationsComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/annotations/annotations.component";
import { BrowseOnChartComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/tabs/browse-on-chart.component";
import { PeriodicTableTabComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/tabs/periodic-table-tab.component";
import { ExpressionPickerComponent } from "./UI/expression-picker/expression-picker.component";
import { TagPickerComponent } from "./UI/tag-picker/tag-picker.component";
import { ROIPickerComponent } from "./UI/roipicker/roipicker.component";
import { RegionItemSettingsComponent } from "./UI/roipicker/region-item-settings/region-item-settings.component";
import { SpectrumRegionPickerComponent } from "./UI/spectrum-chart-widget/spectrum-region-picker/spectrum-region-picker.component";
import { SpectrumRegionSettingsComponent } from "./UI/spectrum-chart-widget/spectrum-region-picker/spectrum-region-settings/spectrum-region-settings.component";
import { WidgetSwitcherComponent } from "./UI/atoms/widget-switcher/widget-switcher.component";
import { WidgetKeyDisplayComponent } from "./UI/atoms/widget-key-display/widget-key-display.component";
import { SelectionChangerComponent } from "./UI/atoms/selection-changer/selection-changer.component";
import { SelectionOptionsComponent } from "./UI/atoms/selection-changer/selection-options/selection-options.component";
import { FilterDialogComponent } from "./routes/datasets/filter-dialog/filter-dialog.component";
import { BadgeComponent } from "./UI/atoms/badge/badge.component";
import { NotificationBannerComponent } from "./UI/notification-banner/notification-banner.component";
import { PickedElementsComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/picked-elements/picked-elements.component";
import { ElementListItemComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/element-list-item/element-list-item.component";
import { ElementSetRowComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/tabs/element-set-row/element-set-row.component";
import { BrowseOnChartTableComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/tabs/browse-on-chart-table/browse-on-chart-table.component";
import { AnnotationItemComponent } from "./UI/spectrum-chart-widget/spectrum-peak-identification/annotations/annotation-item/annotation-item.component";
import { DataCollectionDialogComponent } from "./UI/data-collection-dialog/data-collection-dialog.component";
import { WidgetSettingsMenuComponent } from "./UI/atoms/widget-settings-menu/widget-settings-menu.component";
import { MenuPanelHostComponent } from "./UI/atoms/widget-settings-menu/menu-panel-host/menu-panel-host.component";
import { VERSION } from "src/environments/version";
import { ExpressionHelpDropdownComponent } from "./UI/expression-editor/expression-help-dropdown/expression-help-dropdown.component";
import { FullScreenDisplayComponent } from "./UI/atoms/full-screen-display/full-screen-display.component";
import { TestUtilitiesComponent } from "./routes/admin/test-utilities/test-utilities.component";
import { QuantificationLogViewComponent } from "./routes/dataset/quantifications/quantification-log-view/quantification-log-view.component";
import { GlobalNotificationsComponent } from "./routes/admin/global-notifications/global-notifications.component";
import { SpectrumPeakLabelPickerComponent } from "./UI/spectrum-chart-widget/spectrum-peak-label-picker/spectrum-peak-label-picker.component";
import { RangeSliderComponent } from "./UI/atoms/range-slider/range-slider.component";
import { VariogramWidgetComponent } from "./UI/variogram-widget/variogram-widget.component";
import { ExportDataDialogComponent } from "./UI/export-data-dialog/export-data-dialog.component";
import { RGBUViewerComponent } from "./UI/rgbuviewer/rgbuviewer.component";
import { RGBUPlotComponent } from "./UI/rgbuplot/rgbuplot.component";
import { RGBUAxisRatioPickerComponent } from "./UI/rgbuplot/rgbuaxis-ratio-picker/rgbuaxis-ratio-picker.component";
import { DatasetCustomisationComponent } from "./routes/dataset-customisation/dataset-customisation.component";
import { AddCustomImageComponent } from "./routes/dataset-customisation/add-custom-image/add-custom-image.component";

import { NgxDropzoneModule } from "ngx-dropzone";
import { MissingDataIndicatorComponent } from "./UI/atoms/missing-data-indicator/missing-data-indicator.component";
import { ParallelCoordinatesPlotWidgetComponent } from "./UI/parallel-coordinates-plot-widget/parallel-coordinates-plot-widget.component";
import { QuantificationUploadDialogComponent } from "./UI/quantification-upload-dialog/quantification-upload-dialog.component";
import { PiquantVersionComponent } from "./routes/piquant/piquant-version/piquant-version.component";
import { SidePanelComponent } from "./UI/side-panel/side-panel.component";
import { WorkspacesComponent } from "./UI/side-panel/tabs/workspaces/workspaces.component";
import { ROIComponent } from "./UI/side-panel/tabs/roi/roi.component";
import { MistROIComponent } from "./UI/side-panel/tabs/mist-roi/mist-roi.component";
import { MistRoiUploadComponent } from "./UI/side-panel/tabs/mist-roi/mist-roi-upload/mist-roi-upload.component";
import { MistRoiConvertComponent } from "./UI/side-panel/tabs/mist-roi/mist-roi-convert/mist-roi-convert.component";
import { SelectionComponent } from "./UI/side-panel/tabs/selection/selection.component";
import { ViewStateCollectionsComponent } from "./UI/side-panel/tabs/view-state-collections/view-state-collections.component";
import { ROIItemComponent } from "./UI/side-panel/tabs/roi/roiitem/roiitem.component";
import { AddToCollectionDialogComponent } from "./UI/side-panel/tabs/workspaces/add-to-collection-dialog/add-to-collection-dialog.component";
import { DiffractionComponent } from "./UI/side-panel/tabs/diffraction/diffraction.component";
import { RoughnessComponent } from "./UI/side-panel/tabs/roughness/roughness.component";
import { ImageOptionsComponent } from "./UI/context-image-view-widget/image-options/image-options.component";
import { ROIQuantCompareTableComponent } from "./UI/roiquant-compare-table/roiquant-compare-table.component";
import { QuantificationCombineComponent } from "./UI/side-panel/tabs/quantification-combine/quantification-combine.component";
import { ZStackComponent } from "./UI/side-panel/tabs/quantification-combine/zstack/zstack.component";
import { ZStackItemComponent } from "./UI/side-panel/tabs/quantification-combine/zstack/zstack-item/zstack-item.component";
import { QuantificationListComponent } from "./UI/quantification-selector/quant-selector-panel/quantification-list/quantification-list.component";
import { QuantificationItemComponent } from "./UI/quantification-selector/quant-selector-panel/quantification-list/quantification-item/quantification-item.component";
import { UserPromptDialogComponent } from "./UI/atoms/user-prompt-dialog/user-prompt-dialog.component";
import { TableComponent } from "./UI/atoms/table/table.component";
import { CurrentQuantificationComponent } from "./UI/toolbar/current-quantification/current-quantification.component";
import { ScreenCaptureButtonComponent } from "./UI/toolbar/screen-capture-button/screen-capture-button.component";
import { SentryHelper } from "src/app/utils/utils";
import { ExpressionListComponent } from "./UI/atoms/expression-list/expression-list.component";
import { LayerSettingsComponent } from "./UI/atoms/expression-list/layer-settings/layer-settings.component";
import { VisibilitySettingsComponent } from "./UI/atoms/expression-list/layer-settings/visibility-settings.component";
import { VisibilitySettingsHeaderComponent } from "./UI/atoms/expression-list/layer-settings/header.component";
import { VisibilitySettingsEmptyComponent } from "./UI/atoms/expression-list/layer-settings/empty.component";
import { ElementColumnPickerComponent } from "./UI/atoms/expression-list/layer-settings/element-column-picker/element-column-picker.component";
import { RGBMixSelectorComponent } from "./UI/atoms/expression-list/rgbmix-selector/rgbmix-selector.component";
import { RGBMixLayerSettingsComponent } from "./UI/atoms/expression-list/layer-settings/rgbmix-layer-settings.component";
import { FilterBoxComponent } from "./UI/atoms/expression-list/filter-box/filter-box.component";
import { SingleAxisRGBUComponent } from "./UI/single-axis-rgbu/single-axis-rgbu.component";
import { SpectrumFitContainerComponent } from "./UI/spectrum-chart-widget/spectrum-fit-container/spectrum-fit-container.component";
import { FitLineConfigComponent } from "./UI/spectrum-chart-widget/spectrum-fit-container/fit-line-config/fit-line-config.component";
import { FitElementsComponent } from "./UI/spectrum-chart-widget/spectrum-fit-container/fit-elements/fit-elements.component";
import { FitElementSelectionComponent } from "./UI/spectrum-chart-widget/spectrum-fit-container/fit-element-selection/fit-element-selection.component";
import { EnvConfigurationInitService, AppConfig } from "./services/env-configuration-init.service";
import { AddDatasetDialogComponent } from "./routes/datasets/add-dataset-dialog/add-dataset-dialog.component";
import { LogViewerComponent } from "./UI/log-viewer/log-viewer.component";
import { AnnotationEditorComponent } from "./UI/annotation-editor/annotation-editor.component";
import { AnnotationDisplayComponent } from "./UI/annotation-editor/annotation-display/annotation-display.component";
import { PlotExporterDialogComponent } from "./UI/atoms/plot-exporter-dialog/plot-exporter-dialog.component";


@Injectable()
export class SentryErrorHandler implements ErrorHandler
{
    constructor()
    {
    }

    handleError(error)
    {
        if(error instanceof HttpErrorResponse)
        {
            console.log("Not reporting HttpErrorResponse to Sentry...");
            return;
        }

        const eventId = SentryHelper.logException(error, "SentryErrorHandler");

        // NOTE: this may stack multiple dialogs on top of each other, we have no way of knowing when the user has dismissed
        // a sentry error dialog so we can't implement some kind of ref counting here :(
        Sentry.showReportDialog({ eventId });
    }
}

const appInitializerFn = (configService: EnvConfigurationInitService)=>
{
    return ()=>
    {
        let config = configService.readAppConfig();

        config.then((config: AppConfig)=>
        {
            // Init sentry now that we have the config
            if(config.sentry_dsn.length > 0)
            {
                //console.log("Setting up sentry");
                Sentry.init({
                    dsn: config.sentry_dsn,
                    environment: config.name,
                    // Added to stop all logs coming from instrument.js, see:
                    // https://github.com/getsentry/sentry-react-native/issues/794
                    integrations: [
                        new Sentry.Integrations.Breadcrumbs({
                            console: false
                        })
                    ],
                    // The below came from: https://github.com/getsentry/sentry-javascript/issues/2292
                    beforeSend(event, hint)
                    {
                        // Note: issue with double entries during http exceptions: https://github.com/getsentry/sentry-javascript/issues/2169
                        // Note: issue with a second entry not being set correctly (as a non-error): https://github.com/getsentry/sentry-javascript/issues/2292#issuecomment-554932519
                        const isNonErrorException = event.exception.values[0].value.startsWith("Non-Error exception captured");
                        if(isNonErrorException)
                        {
                            if(!event.extra.__serialized__)
                            {
                                return null;
                            }
                            let realErrMsg = event.extra.__serialized__["error"] ? event.extra.__serialized__["error"].message : null;
                            realErrMsg = realErrMsg || event.extra.__serialized__["message"];
                            // this is a useless error message that masks the actual error.  Lets try to set it properly
                            event.exception.values[0].value = realErrMsg;
                            event.message = realErrMsg;
                        }
                        return event;
                    }
                });

                const version = VERSION["raw"];
                console.log("Sentry Initialised, adding version tag: " + version);
                Sentry.setTag("version", version);
            }
            else
            {
                console.log("No Sentry DNS, Sentry error reporting disabled");
            }
        });

        return config;
    };
};

@NgModule({
    declarations: [
        AppComponent,
        AnalysisComponent,
        QuantificationsComponent,
        DatasetsComponent,
        PageNotFoundComponent,
        DataSetSummaryComponent,
        ToolbarComponent,
        ContextImageToolbarComponent,
        QuantResultSummaryComponent,
        QuantResultListComponent,
        InteractiveCanvasComponent,
        ContextImageViewWidgetComponent,
        ChordViewWidgetComponent,
        ScatterPlotViewComponent,
        PanelComponent,
        ElementTileComponent,
        PeriodicTableComponent,
        LayerControlComponent,
        AboutComponent,
        ContextImagePickerComponent,
        QuantificationTableComponent,
        HistogramViewComponent,
        QuantificationSelectorComponent,
        PanelFoldoutButtonComponent,
        WidgetDisplayMessageComponent,
        AuthenticateComponent,
        UserMenuPanelComponent,
        AnnotationOptionsComponent,
        QuantificationStartOptionsComponent,
        VersionDisplayComponent,
        ElementSetsComponent,
        AnnotationsComponent,
        BrowseOnChartComponent,
        PeriodicTableTabComponent,
        QuantSelectorPanelComponent,
        ExpressionEditorComponent,
        Base64ImagePipe,
        MapBrowserComponent,
        DatasetLoadingProgressComponent,
        DatasetComponent,
        PiquantConfigComponent,
        SelectedQuantificationViewComponent,
        AdminComponent,
        UsersComponent,
        TestUtilitiesComponent,
        PiquantDownloadsComponent,
        PiquantComponent,
        RolesComponent,
        UserListItemComponent,
        IconButtonComponent,
        TwoStateButtonComponent,
        BulkSelectionSwitchComponent,
        PlusMinusSwitchComponent,
        SwitchButtonComponent,
        MultiSwitchButtonComponent,
        TwoStateIconButton,
        TwoStatePushButton,
        TwoStateIconPushButton,
        SnackBarComponent,
        SnackComponent,
        PushButtonComponent,
        TwoStateEditButtonComponent,
        LayerSettingsComponent,
        VisibilitySettingsComponent,
        VisibilitySettingsHeaderComponent,
        VisibilitySettingsEmptyComponent,
        SliderComponent,
        ClosableListComponent,
        PickerDialogComponent,
        MapViewComponent,
        MultiStateButtonComponent,
        SpectrumToolbarComponent,
        SpectrumChartWidgetComponent,
        SpectrumEnergyCalibrationComponent,
        SpectrumPeakIdentificationComponent,
        ExpressionPickerComponent,
        TagPickerComponent,
        BinaryPlotWidgetComponent,
        TernaryPlotWidgetComponent,
        ROIPickerComponent,
        AnnotationEditorComponent,
        AnnotationDisplayComponent,
        RegionItemSettingsComponent,
        SpectrumRegionPickerComponent,
        SpectrumRegionSettingsComponent,
        WidgetSwitcherComponent,
        WidgetKeyDisplayComponent,
        SelectionChangerComponent,
        SelectionOptionsComponent,
        GlobalNotificationsComponent,
        FilterDialogComponent,
        BadgeComponent,
        NotificationBannerComponent,
        PickedElementsComponent,
        ElementListItemComponent,
        ElementSetRowComponent,
        BrowseOnChartTableComponent,
        AnnotationItemComponent,
        ElementColumnPickerComponent,
        DataCollectionDialogComponent,
        WidgetSettingsMenuComponent,
        MenuPanelHostComponent,
        ExpressionHelpDropdownComponent,
        FullScreenDisplayComponent,
        QuantificationLogViewComponent,
        SpectrumPeakLabelPickerComponent,
        RangeSliderComponent,
        VariogramWidgetComponent,
        RGBMixSelectorComponent,
        RGBMixLayerSettingsComponent,
        ExportDataDialogComponent,
        RGBUViewerComponent,
        RGBUPlotComponent,
        RGBUAxisRatioPickerComponent,
        DatasetCustomisationComponent,
        AddCustomImageComponent,
        MissingDataIndicatorComponent,
        ParallelCoordinatesPlotWidgetComponent,
        QuantificationUploadDialogComponent,
        PiquantVersionComponent,
        SidePanelComponent,
        WorkspacesComponent,
        ROIComponent,
        MistROIComponent,
        SelectionComponent,
        ViewStateCollectionsComponent,
        ROIItemComponent,
        AddToCollectionDialogComponent,
        DiffractionComponent,
        RoughnessComponent,
        ImageOptionsComponent,
        TwoStateIconSwitchComponent,
        ROIQuantCompareTableComponent,
        QuantificationCombineComponent,
        ZStackComponent,
        ZStackItemComponent,
        QuantificationListComponent,
        QuantificationItemComponent,
        UserPromptDialogComponent,
        TableComponent,
        CurrentQuantificationComponent,
        ScreenCaptureButtonComponent,
        ExpressionListComponent,
        FilterBoxComponent,
        SingleAxisRGBUComponent,
        SpectrumFitContainerComponent,
        FitLineConfigComponent,
        FitElementsComponent,
        FitElementSelectionComponent,
        MistRoiUploadComponent,
        MistRoiConvertComponent,
        AddBearerPipe,
        AddDatasetDialogComponent,
        LogViewerComponent,
        PlotExporterDialogComponent,
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        HttpClientModule,
        FormsModule,
        //ReactiveFormsModule,
        BrowserAnimationsModule,
        MaterialModule,
        FlexLayoutModule,
        OverlayModule,
        CdkAccordionModule,
        CodemirrorModule,
        NgxDropzoneModule,
        DragDropModule,
        MatTooltipModule,
    ],
    providers: [
        EnvConfigurationInitService,
        {
            provide: APP_INITIALIZER,
            useFactory: appInitializerFn,
            multi: true,
            deps: [EnvConfigurationInitService]
        },
        Title,
        {
            provide: MAT_DIALOG_DEFAULT_OPTIONS,
            useValue: { hasBackdrop: true }
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: HttpInterceptorService,
            multi: true
        },
        // Added due to: https://stackoverflow.com/questions/47270324/nullinjectorerror-no-provider-for-matdialogref
        {
            provide: MAT_DIALOG_DATA,
            useValue: {}
        },
        {
            provide: MatDialogRef,
            useValue: {}
        },
        {
            provide: ErrorHandler,
            useClass: SentryErrorHandler
        }
    ],
    entryComponents: [
        LayerControlComponent,
        ExpressionPickerComponent,
        ExpressionEditorComponent,
        QuantSelectorPanelComponent,
        UserMenuPanelComponent,
        AnnotationOptionsComponent,
        QuantificationStartOptionsComponent,
        PickerDialogComponent,
        SpectrumEnergyCalibrationComponent,
        SpectrumPeakIdentificationComponent,
        AnnotationsComponent,
        ROIPickerComponent,
        BinaryPlotWidgetComponent,
        TernaryPlotWidgetComponent,
        ChordViewWidgetComponent,
        SelectionOptionsComponent,
        ElementColumnPickerComponent,
        DataCollectionDialogComponent,
        MenuPanelHostComponent,
        FullScreenDisplayComponent
    ],
    bootstrap: [AppComponent]
})
export class AppModule
{
    constructor()
    {
    }
}
