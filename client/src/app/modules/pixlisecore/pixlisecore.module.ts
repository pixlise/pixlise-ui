import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { OverlayModule } from "@angular/cdk/overlay";

import { FormsModule } from "@angular/forms";
import { MatSnackBarModule } from "@angular/material/snack-bar";

import { WaitSpinnerComponent } from "./components/atoms/wait-spinner/wait-spinner.component";
import { MultiStateButtonComponent } from "./components/atoms/buttons/multi-state-button/multi-state-button.component";
// import { PanelFoldoutButtonComponent } from "./components/atoms/buttons/panel-foldout-button/panel-foldout-button.component";
import { PushButtonComponent } from "./components/atoms/buttons/push-button/push-button.component";
// import { TwoStateEditButtonComponent } from "./components/atoms/buttons/two-state-edit-button/two-state-edit-button.component";
import { IconButtonComponent } from "./components/atoms/buttons/icon-button/icon-button.component";
import { TwoStateButtonComponent } from "./components/atoms/buttons/two-state-button/two-state-button.component";
// import { BulkSelectionSwitchComponent } from "./components/atoms/buttons/two-state-button/bulk-selection-switch.component";
// import { PlusMinusSwitchComponent } from "./components/atoms/buttons/two-state-button/plus-minus-switch.component";
import { SwitchButtonComponent } from "./components/atoms/buttons/switch-button/switch-button.component";
import { MultiSwitchButtonComponent } from "./components/atoms/buttons/multi-switch-button/multi-switch-button.component";
import { TwoStateIconButton } from "./components/atoms/buttons/two-state-button/two-state-icon-button.component";
// import { TwoStateIconPushButton } from "./components/atoms/buttons/two-state-button/two-state-icon-push-button.component";
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
import { SectionedSelectDialogComponent } from './components/atoms/sectioned-select-dialog/sectioned-select-dialog.component';

export { RouteNotFoundComponent } from "./components/pages/route-not-found/route-not-found.component";
export { WidgetSettingsMenuComponent } from "./components/atoms/widget-settings-menu/widget-settings-menu.component";
export { APICommService } from "./services/apicomm.service";
export { APIDataService } from "./services/apidata.service";
export { HttpInterceptorService } from "./services/http-interceptor.service";
export { SnackbarService } from "./services/snackbar.service";
export { WidgetDataService, DataSourceParams, RegionDataResults, RegionDataResultItem, DataUnit } from "./services/widget-data.service";
export { WidgetKeyItem } from "./models/widget-key-item";
export { SelectionService } from "./services/selection.service";
export { ExpressionValue, ExpressionReference, ExpressionReferences } from "./models/expression-references";
export { SliderComponent } from "./components/atoms/slider/slider.component";

@NgModule({
  declarations: [
    WaitSpinnerComponent,
    BadgeComponent,
    ActionButtonComponent,
    PushButtonComponent,
    TwoStateButtonComponent,
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
    FilterBoxComponent,
    SliderComponent,
    RangeSliderComponent,
    MultiStateButtonComponent,
    PeriodicTableComponent,
    ElementTileComponent,
    SelectionChangerComponent,
    SelectionOptionsComponent,
    SectionedSelectDialogComponent,
  ],
  imports: [CommonModule, OverlayModule, MaterialModule, FormsModule],
  exports: [
    WaitSpinnerComponent,
    BadgeComponent,
    ActionButtonComponent,
    PushButtonComponent,
    TwoStateButtonComponent,
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
  ],
  providers: [/*APICommService, APIDataService, HttpInterceptorService*/], // Don't register them so they don't duplicate due to lazy load
})
export class PIXLISECoreModule {}
