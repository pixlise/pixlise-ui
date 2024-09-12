import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { OverlayModule } from "@angular/cdk/overlay";

import { FormsModule } from "@angular/forms";
import { MatSnackBarModule } from "@angular/material/snack-bar";

import { WaitSpinnerComponent } from "./components/atoms/wait-spinner/wait-spinner.component";
import { MultiStateButtonComponent } from "./components/atoms/buttons/multi-state-button/multi-state-button.component";
import { PanelFoldoutButtonComponent } from "./components/atoms/buttons/panel-foldout-button/panel-foldout-button.component";
import { PushButtonComponent } from "./components/atoms/buttons/push-button/push-button.component";
import { TwoStateEditButtonComponent } from "./components/atoms/buttons/two-state-edit-button/two-state-edit-button.component";
import { IconButtonComponent } from "./components/atoms/buttons/icon-button/icon-button.component";
import { TwoStateButtonComponent } from "./components/atoms/buttons/two-state-button/two-state-button.component";
import { PlusMinusSwitchComponent } from "./components/atoms/buttons/two-state-button/plus-minus-switch.component";
import { SwitchButtonComponent } from "./components/atoms/buttons/switch-button/switch-button.component";
import { MultiSwitchButtonComponent } from "./components/atoms/buttons/multi-switch-button/multi-switch-button.component";
import { TwoStateIconButton } from "./components/atoms/buttons/two-state-button/two-state-icon-button.component";
import { TwoStatePushButton } from "./components/atoms/buttons/two-state-button/two-state-push-button.component";
import { TwoStateIconSwitchComponent } from "./components/atoms/buttons/two-state-button/two-state-icon-switch.component";

import { SelectionChangerComponent } from "./components/atoms/selection-changer/selection-changer.component";
import { SelectionOptionsComponent } from "./components/atoms/selection-changer/selection-options/selection-options.component";

import { WidgetDisplayMessageComponent } from "./components/atoms/widget-display-message/widget-display-message.component";
import { WidgetSettingsMenuComponent } from "./components/atoms/widget-settings-menu/widget-settings-menu.component";
import { MaterialModule } from "../material.module";
import { BadgeComponent } from "./components/atoms/badge/badge.component";
import { AuthenticateComponent } from "./components/pages/authenticate/authenticate.component";

import { RouteNotFoundComponent } from "./components/pages/route-not-found/route-not-found.component";

import { SnackBarPopupComponent } from "./components/atoms/snackbar-popup/snackbar-popup.component";
import { ActionButtonComponent } from "./components/atoms/buttons/action-button/action-button.component";
import { UserMenuPanelComponent } from "../../components/toolbar/user-menu-panel/user-menu-panel.component";
import { ConfirmDialogComponent } from "./components/atoms/buttons/action-button/confirm-dialog/confirm-dialog.component";
import { TwoStateIconPushButton } from "./components/atoms/buttons/two-state-button/two-state-icon-push-button.component";
import { MenuPanelHostComponent } from "./components/atoms/widget-settings-menu/menu-panel-host/menu-panel-host.component";
import { NotificationsMenuPanelComponent } from "src/app/components/toolbar/notifications-menu-panel/notifications-menu-panel.component";
import { HotkeysMenuPanelComponent } from "src/app/components/toolbar/hotkeys-menu-panel/hotkeys-menu-panel.component";
import { FilterBoxComponent } from "./components/atoms/filter-box/filter-box.component";
import { SliderComponent } from "./components/atoms/slider/slider.component";
import { RangeSliderComponent } from "./components/atoms/range-slider/range-slider.component";
import { PeriodicTableComponent } from "./components/atoms/periodic-table/periodic-table.component";
import { ElementTileComponent } from "./components/atoms/periodic-table/element-tile/element-tile.component";
import { StatusIndicatorComponent } from "./components/atoms/status-indicator/status-indicator.component";
import { SectionedSelectDialogComponent } from "./components/atoms/sectioned-select-dialog/sectioned-select-dialog.component";
import { RGBUPickerDropdownComponent } from "./components/atoms/rgbupicker-dropdown/rgbupicker-dropdown.component";
import { PickerDialogComponent } from "./components/atoms/picker-dialog/picker-dialog.component";

import { QuantificationSelectorComponent } from "./components/atoms/quantification-selector/quantification-selector.component";
import { QuantSelectorPanelComponent } from "./components/atoms/quant-selector-panel/quant-selector-panel.component";
import { QuantificationListComponent } from "./components/atoms/quant-selector-panel/quantification-list/quantification-list.component";
import { QuantificationItemComponent } from "./components/atoms/quant-selector-panel/quantification-list/quantification-item/quantification-item.component";
import { ShareDialogComponent } from "./components/atoms/share-ownership-item/share-dialog/share-dialog.component";
import { ShareOwnershipItemButtonComponent } from "./components/atoms/share-ownership-item/share-ownership-item-button.component";
import { ImagePickerDialogComponent } from "src/app/modules/pixlisecore/components/atoms/image-picker-dialog/image-picker-dialog.component";
import { PMCSelectorDialogComponent } from "src/app/modules/pixlisecore/components/atoms/selection-changer/pmc-selector-dialog/pmc-selector-dialog.component";
import { ClosableListComponent } from "src/app/modules/pixlisecore/components/atoms/closable-list/closable-list.component";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { LayerVisibilityDialogComponent } from "./components/atoms/layer-visibility-dialog/layer-visibility-dialog.component";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { FeedbackDialogComponent } from "./components/feedback-dialog/feedback-dialog.component";
import { TableComponent } from "./components/atoms/table/table.component";
import { TextFileViewingDialogComponent } from "./components/atoms/text-file-viewing-dialog/text-file-viewing-dialog.component";
import { LayoutPreviewBox } from "./components/atoms/layout-preview-box/layout-preview-box.component";
import { UserIconComponent } from "./components/atoms/user-icon/user-icon.component";
import { ConfirmInputDialogComponent } from "./components/atoms/buttons/action-button/confirm-input-dialog/confirm-input-dialog.component";

export { RouteNotFoundComponent } from "./components/pages/route-not-found/route-not-found.component";
export { WidgetSettingsMenuComponent } from "./components/atoms/widget-settings-menu/widget-settings-menu.component";
export { APICommService } from "./services/apicomm.service";
export { APIDataService } from "./services/apidata.service";
export { SnackbarService } from "./services/snackbar.service";
export { ContextImageDataService } from "./services/context-image-data.service";
export { WidgetDataService, DataSourceParams, RegionDataResults, RegionDataResultItem, DataUnit } from "./services/widget-data.service";
export { WidgetKeyItem } from "./models/widget-key-item";
export { SelectionService } from "./services/selection.service";
export { ExpressionValue, ExpressionReference, ExpressionReferences } from "./models/expression-references";
export { SliderComponent } from "./components/atoms/slider/slider.component";
export { PickerDialogComponent } from "./components/atoms/picker-dialog/picker-dialog.component";
export { LayerVisibilityDialogComponent } from "./components/atoms/layer-visibility-dialog/layer-visibility-dialog.component";
export { FeedbackDialogComponent } from "./components/feedback-dialog/feedback-dialog.component";
export { TableComponent } from "./components/atoms/table/table.component";
export { LayoutPreviewBox } from "./components/atoms/layout-preview-box/layout-preview-box.component";
export { UserIconComponent } from "./components/atoms/user-icon/user-icon.component";
export { ConfirmInputDialogComponent } from "./components/atoms/buttons/action-button/confirm-input-dialog/confirm-input-dialog.component";

@NgModule({
  declarations: [
    WaitSpinnerComponent,
    BadgeComponent,
    ActionButtonComponent,
    PushButtonComponent,
    TwoStateButtonComponent,
    PlusMinusSwitchComponent,
    SwitchButtonComponent,
    MultiSwitchButtonComponent,
    TwoStateIconButton,
    TwoStatePushButton,
    TwoStateIconSwitchComponent,
    TwoStateIconPushButton,
    WidgetDisplayMessageComponent,
    WidgetSettingsMenuComponent,
    MenuPanelHostComponent,
    AuthenticateComponent,
    RouteNotFoundComponent,
    SnackBarPopupComponent,
    UserMenuPanelComponent,
    NotificationsMenuPanelComponent,
    HotkeysMenuPanelComponent,
    IconButtonComponent,
    ConfirmDialogComponent,
    ConfirmInputDialogComponent,
    FilterBoxComponent,
    SliderComponent,
    RangeSliderComponent,
    MultiStateButtonComponent,
    PeriodicTableComponent,
    ElementTileComponent,
    SelectionChangerComponent,
    SelectionOptionsComponent,
    StatusIndicatorComponent,
    SectionedSelectDialogComponent,
    PanelFoldoutButtonComponent,
    RGBUPickerDropdownComponent,
    PickerDialogComponent,
    QuantificationSelectorComponent,
    QuantSelectorPanelComponent,
    QuantificationListComponent,
    QuantificationItemComponent,
    ShareDialogComponent,
    ShareOwnershipItemButtonComponent,
    ImagePickerDialogComponent,
    PMCSelectorDialogComponent,
    TwoStateEditButtonComponent,
    ClosableListComponent,
    LayerVisibilityDialogComponent,
    FeedbackDialogComponent,
    TableComponent,
    TextFileViewingDialogComponent,
    LayoutPreviewBox,
    UserIconComponent,
  ],
  imports: [CommonModule, OverlayModule, MaterialModule, FormsModule, MatAutocompleteModule, DragDropModule],
  exports: [
    WaitSpinnerComponent,
    BadgeComponent,
    ActionButtonComponent,
    PushButtonComponent,
    TwoStateButtonComponent,
    PlusMinusSwitchComponent,
    SwitchButtonComponent,
    MultiSwitchButtonComponent,
    TwoStateIconButton,
    TwoStatePushButton,
    TwoStateIconSwitchComponent,
    TwoStateIconPushButton,
    WidgetDisplayMessageComponent,
    WidgetSettingsMenuComponent,
    MenuPanelHostComponent,
    AuthenticateComponent,
    RouteNotFoundComponent,
    IconButtonComponent,
    ConfirmDialogComponent,
    ConfirmInputDialogComponent,
    FormsModule,
    MaterialModule,
    MatSnackBarModule,
    FilterBoxComponent,
    SliderComponent,
    RangeSliderComponent,
    MultiStateButtonComponent,
    PeriodicTableComponent,
    ElementTileComponent,
    SelectionChangerComponent,
    SelectionOptionsComponent,
    StatusIndicatorComponent,
    PanelFoldoutButtonComponent,
    RGBUPickerDropdownComponent,
    PickerDialogComponent,
    QuantificationSelectorComponent,
    ShareDialogComponent,
    ShareOwnershipItemButtonComponent,
    ImagePickerDialogComponent,
    PMCSelectorDialogComponent,
    TwoStateEditButtonComponent,
    ClosableListComponent,
    LayerVisibilityDialogComponent,
    FeedbackDialogComponent,
    TableComponent,
    TextFileViewingDialogComponent,
    LayoutPreviewBox,
    UserIconComponent,
  ],
  providers: [
    /*APICommService, APIDataService*/
  ], // Don't register them so they don't duplicate due to lazy load
})
export class PIXLISECoreModule {}
