import { Component, ElementRef, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { DataExpression } from "src/app/generated-protos/expressions";
import { DataModule } from "src/app/generated-protos/modules";
import { ExpressionsService } from "../services/expressions.service";
import { ObjectType } from "src/app/generated-protos/ownership-access";
import { Subscription } from "rxjs";
import { AnalysisLayoutService } from "../../analysis/analysis.module";
import { ScanConfiguration } from "src/app/generated-protos/screen-configuration";
import { ScanItem } from "src/app/generated-protos/scan";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "../../pixlisecore/components/atoms/buttons/action-button/confirm-dialog/confirm-dialog.component";
import { WidgetSettingsMenuComponent } from "../../pixlisecore/pixlisecore.module";
import { ExpressionGroup } from "src/app/generated-protos/expression-group";
import {
  BINARY_WIDGET_OPTIONS,
  RGB_MIX_MODE_OPTIONS,
  TERNARY_WIDGET_OPTIONS,
  WidgetLayerPositionConfig,
  WidgetLayerPositionConfigMap,
  widgetLayerPositions,
} from "../models/expression-widget-layer-configs";
import { WidgetType } from "../../widget/models/widgets.model";
import EditorConfig from "src/app/modules/code-editor/models/editor-config";
import { UsersService } from "src/app/modules/settings/services/users.service";
import { UserInfo } from "src/app/generated-protos/user";
@Component({
  selector: "expression-layer",
  templateUrl: "./expression-layer.component.html",
  styleUrls: ["./expression-layer.component.scss"],
})
export class ExpressionLayerComponent implements OnInit {
  @ViewChild("moreOptionsButton") moreOptionsButton!: ElementRef;

  private _subs = new Subscription();

  private _module: DataModule | null = null;
  private _expression: DataExpression | ExpressionGroup | null = null;
  @Input() isExpressionGroup: boolean = false;

  private _name: string = "";
  private _description: string = "";

  @Input() selected: boolean = false;
  @Input() isSelectable: boolean = true;

  @Input() selectionDisabledMessage: string = "";
  @Input() isSingleSelect: boolean = false;

  @Input() showCreatorIcon: boolean = true;
  @Input() selectAuthorToFilter: boolean = true;

  @Input() showVisibilityButton: boolean = false;
  @Input() isWidgetExpression?: boolean = false;

  @Input() selectIfValidPosition: boolean = false;
  @Input() isTriggerPosition: boolean = false;

  @Input() showActiveExpressionConfiguration: boolean = false;
  @Input() showColourPicker: boolean = false;
  @Input() monoSelectIcon: boolean = false;

  private _showRGBMixMode: boolean = false;

  @Output() onCloseModal = new EventEmitter();

  creatorUser: UserInfo = UserInfo.create();

  private _widgetType: WidgetType | "" = "" as WidgetType;
  widgetOptions: string[] = [];
  widgetOptionIcons: string[] = [];
  widgetSelectionState: string = "Off";
  private _widgetPosition = 0;

  triggerTagPickerOpen: boolean = false;
  isShareDialogOpen: boolean = false;

  isVisible: boolean = false; // Part of response

  @Output() onFilterAuthor = new EventEmitter<string>();
  @Output() onSelect = new EventEmitter();
  @Output() onChangeWidgetPosition = new EventEmitter<number>();

  private _objectType: ObjectType = ObjectType.OT_EXPRESSION;

  configuredScan: string = "";
  idToName: Record<string, string> = {};
  availableScans: ScanConfiguration[] = [];

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _expressionsService: ExpressionsService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _usersService: UsersService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.updateUser();

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(config => {
        this.availableScans = Object.values(config.scanConfigurations);
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.idToName = {};
        scans.forEach(scan => {
          this.idToName[scan.id] = scan.title;
        });
      })
    );

    this._subs.add(
      this._usersService.searchedUsers$.subscribe(() => {
        this.updateUser();
      })
    );
  }

  updateUser() {
    let cachedUsers = this._usersService?.cachedUsers;
    let userId = this.expression?.owner?.creatorUser?.id || "";
    if (cachedUsers && userId && this.expression?.owner && cachedUsers[userId]) {
      this.creatorUser = UserInfo.create(cachedUsers[userId]);
    } else if (this.expression?.owner?.creatorUser) {
      this.creatorUser = UserInfo.create(this.expression.owner.creatorUser);
    }
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get objectType(): ObjectType {
    return this._objectType;
  }

  @Input() set objectType(type: ObjectType) {
    this._objectType = type;
  }

  get isModule(): boolean {
    return this._module !== null;
  }

  get hasTopExpression(): boolean {
    return !!this._route.snapshot.queryParams[EditorConfig.topExpressionId];
  }

  get expression(): DataExpression | ExpressionGroup | null {
    return this._expression;
  }

  get isSharedWithOthers(): boolean {
    return this._expression?.owner?.sharedWithOthers || false;
  }

  @Input() set expression(expression: DataExpression | ExpressionGroup | null) {
    if (!expression) {
      return;
    }

    this._expression = expression;
    this.updateUser();
  }

  @Input() set module(module: DataModule | null) {
    if (!module) {
      return;
    }

    this._module = module;
    this.expression = DataExpression.create({
      id: module.id,
      name: module.name,
      comments: module.comments,
      owner: module.creator,
      sourceCode: module.versions[module.versions.length - 1].sourceCode,
      sourceLanguage: EXPR_LANGUAGE_LUA,
      tags: [],
      modifiedUnixSec: module.modifiedUnixSec,
    });
  }

  get isLayerSelected(): boolean {
    return this.selected || (this.selectIfValidPosition && !!this.widgetSelectionState && this.widgetSelectionState !== "Off");
  }

  get showRGBMixMode(): boolean {
    return this._showRGBMixMode;
  }

  @Input() set showRGBMixMode(show: boolean) {
    this._showRGBMixMode = show;
    this.widgetType = this._widgetType;
  }

  private _getWidgetLayerConfig(): WidgetLayerPositionConfigMap | null {
    if (this.showRGBMixMode) {
      return RGB_MIX_MODE_OPTIONS;
    } else {
      return widgetLayerPositions[this._widgetType] || null;
    }
  }

  @Input() set widgetType(type: string) {
    this._widgetType = type as WidgetType;
    this.widgetOptions = [];
    this.widgetOptionIcons = [];

    let widgetLayerConfig = this._getWidgetLayerConfig();
    if (widgetLayerConfig) {
      this.widgetOptions = Object.keys(widgetLayerConfig);
      this.widgetOptionIcons = Object.values(widgetLayerConfig).map(option => option.icon);
    }

    // Selection states have changed, so we need to update the widget position
    this.widgetPosition = this._widgetPosition;
  }

  get widgetType(): WidgetType | "" {
    return this._widgetType;
  }

  @Input() set widgetPosition(position: number) {
    this._widgetPosition = position;
    if (position > this.widgetOptions.length || position < 0 || !this.widgetOptions[position]) {
      this.widgetSelectionState = "Off";
    } else {
      this.widgetSelectionState = this.widgetOptions[position];
    }
  }

  onWidgetSelectionStateChange(state: string) {
    this.widgetSelectionState = state;
    let widgetPosition: number = -1;

    let widgetLayerConfig = this._getWidgetLayerConfig();
    if (widgetLayerConfig) {
      widgetPosition = widgetLayerConfig[state].position;
    }

    this.onChangeWidgetPosition.emit(widgetPosition);
  }

  get canEdit(): boolean {
    return this.expression?.owner?.canEdit || false;
  }

  get creatorName(): string {
    return this.creatorUser?.name || "";
  }

  get creatorIcon(): string {
    return this.creatorUser?.iconURL || "";
  }

  get creatorAbbreviation(): string {
    return this.creatorName && this.creatorName.length > 0 ? this.creatorName[0] : "N/A";
  }

  get name(): string {
    return this._name || this.expression?.name || "Unnamed";
  }

  set name(value: string) {
    this._name = value;
  }

  get description(): string {
    return this._description || (this.expression as DataExpression)?.comments || (this.expression as ExpressionGroup)?.description || "";
  }

  set description(value: string) {
    this._description = value;
  }

  get summaryTooltip(): string {
    let descriptionLine = this.description ? "\n\n" + this.description : "";
    let createdLine = this.createdDate > 0 ? "\n\nCreated: " + this.dateCreatedString : "";
    let modifiedLine = this.modifiedDate > 0 && this.createdDate !== this.modifiedDate ? "\nModified: " + this.dateModifiedString : "";
    return `${this.name}${descriptionLine}${createdLine}${modifiedLine}`;
  }

  get createdDate(): number {
    let latestTime = this.expression?.owner?.createdUnixSec || 0;
    return latestTime * 1000;
  }

  get modifiedDate(): number {
    let latestTime = this.expression?.modifiedUnixSec || 0;
    return latestTime * 1000;
  }

  get dateModifiedString(): string {
    return this.modifiedDate > 0 ? new Date(this.modifiedDate).toLocaleDateString() : "Unknown";
  }

  get dateCreatedString(): string {
    return this.createdDate > 0 ? new Date(this.createdDate).toLocaleDateString() : "Unknown";
  }

  get selectedTagIDs(): string[] {
    return this.expression?.tags || [];
  }

  set selectedTagIDs(tagIDs: string[]) {
    if (this.expression) {
      this.expression.tags = tagIDs;
    }
  }

  get showSplitScreenButton(): boolean {
    if (this.isModule) {
      // Only split screen a module if a top expression is open
      return !!this._route.snapshot.queryParams[EditorConfig.topExpressionId];
    } else {
      // Only split screen an expression if a bottom module is open
      return !!this._route.snapshot.queryParams[EditorConfig.bottomExpressionId];
    }
  }

  onTriggerTagPicker(): void {
    // Bit of a hack, but we need to have the tag picker tell the widget settings menu to be visible on external click
    // and we don't have full control of the state
    this.triggerTagPickerOpen = !this.triggerTagPickerOpen;
  }

  onToggleShareDialog(open: boolean): void {
    this.isShareDialogOpen = open;
  }

  getClearedExpressionQueryParams() {
    let queryParams = { ...this._route.snapshot.queryParams };
    delete queryParams[EditorConfig.topExpressionId];
    delete queryParams[EditorConfig.bottomExpressionId];
    delete queryParams[EditorConfig.topModuleId];
    delete queryParams[EditorConfig.bottomModuleId];
    delete queryParams[EditorConfig.topModuleVersion];
    delete queryParams[EditorConfig.bottomModuleVersion];

    return queryParams;
  }

  onSplitScreenCodeEditor() {
    let queryParams = { ...this._route.snapshot.queryParams };
    if (this.isModule) {
      delete queryParams[EditorConfig.topModuleVersion];
      delete queryParams[EditorConfig.bottomModuleVersion];
      queryParams[EditorConfig.bottomExpressionId] = this.expression?.id;
    } else {
      delete queryParams[EditorConfig.topModuleId];
      queryParams[EditorConfig.topExpressionId] = this.expression?.id;
    }
    this.onCloseModal.emit();
    this._router.navigate(["/datasets/code-editor"], { queryParams });
  }

  onPreviewCode() {
    let queryParams = { ...this._route.snapshot.queryParams };
    if (this.isModule) {
      delete queryParams[EditorConfig.topExpressionId];
      delete queryParams[EditorConfig.topModuleVersion];
      queryParams[EditorConfig.topModuleId] = this.expression?.id;
    } else {
      delete queryParams[EditorConfig.topModuleId];
      queryParams[EditorConfig.topExpressionId] = this.expression?.id;
    }
    this.onCloseModal.emit();
    this._router.navigate(["/datasets/code-editor"], { queryParams });
  }

  onFullScreenCodeEditor() {
    let queryParams: Record<string, string> = this.getClearedExpressionQueryParams();

    if (this.isModule) {
      queryParams[EditorConfig.topModuleId] = this.expression?.id || "";
    } else {
      queryParams[EditorConfig.topExpressionId] = this.expression?.id || "";
    }
    this._router.navigate(["/datasets/code-editor"], { queryParams });
  }

  onVisibility(): void {
    this.isVisible = !this.isVisible;
  }

  private closeMoreOptionsMenu(): void {
    if (this.moreOptionsButton && this.moreOptionsButton instanceof WidgetSettingsMenuComponent) {
      (this.moreOptionsButton as WidgetSettingsMenuComponent).close();
    }
  }

  onDelete(): void {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = { confirmText: `Are you sure you want to delete this expression (${this.expression?.name || this.expression?.id})?` };
    let dialogRef = this.dialog.open(ConfirmDialogComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && this.expression) {
        if (this.isExpressionGroup) {
          this._expressionsService.deleteExpressionGroup(this.expression.id);
        } else {
          this._expressionsService.deleteExpression(this.expression.id);
        }
        this.closeMoreOptionsMenu();
      }
    });
  }

  onTagSelectionChanged(tagIDs: string[]): void {
    if (this.expression) {
      this.expression.tags = tagIDs;
      if (this.isExpressionGroup) {
        this._expressionsService.writeExpressionGroup(this.expression as ExpressionGroup);
      } else {
        this._expressionsService.writeExpression(this.expression as DataExpression);
      }
    }
  }

  onCheckboxClick(): void {
    if (this.onSelect) {
      this.onSelect.emit();
    }
  }

  filterToAuthor(): void {
    if (this.selectAuthorToFilter && this.expression?.owner?.creatorUser?.id) {
      this.onFilterAuthor.emit(this.expression.owner.creatorUser.id);
    }
  }
}
