import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { EXPR_LANGUAGE_LUA } from "src/app/expression-language/expression-language";
import { DataExpression } from "src/app/generated-protos/expressions";
import { DataModule } from "src/app/generated-protos/modules";

@Component({
  selector: "expression-layer",
  templateUrl: "./expression-layer.component.html",
  styleUrls: ["./expression-layer.component.scss"],
})
export class ExpressionLayerComponent {
  private _module: DataModule | null = null;
  @Input() expression: DataExpression | null = null;

  private _name: string = "";
  private _description: string = "";

  @Input() selected: boolean = false;
  @Input() isSelectable: boolean = true;

  @Input() showCreatorIcon: boolean = true;
  @Input() selectAuthorToFilter: boolean = true;

  @Input() showVisibilityButton: boolean = false;

  isVisible: boolean = false; // Part of response

  @Output() onFilterAuthor = new EventEmitter<string>();
  @Output() onSelect = new EventEmitter();

  constructor(
    private _route: ActivatedRoute,
    private _router: Router
  ) {}

  get isModule(): boolean {
    return this._module !== null;
  }

  @Input() set module(module: DataModule) {
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

  get creatorName(): string {
    return this.expression?.owner?.creatorUser?.name || "";
  }

  get creatorIcon(): string {
    return this.expression?.owner?.creatorUser?.iconURL || "";
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
    return this._description || this.expression?.comments || "";
  }

  set description(value: string) {
    this._description = value;
  }

  get createdDate(): number {
    let modifiedTime = this.expression?.modifiedUnixSec;
    let createdTime = this.expression?.owner?.createdUnixSec;

    let latestTime = modifiedTime || createdTime || 0;
    return latestTime * 1000;
  }

  get dateCreatedString(): string {
    return this.createdDate > 0 ? new Date(this.createdDate).toLocaleDateString() : "Unknown";
  }

  get selectedTagIDs(): string[] {
    return this.expression?.tags || [];
  }

  set selectedTagIDs(tagIDs: string[]) {
    this.expression!.tags = tagIDs;
  }

  get showSplitScreenButton(): boolean {
    if (this.isModule) {
      // Only split screen a module if a top expression is open
      return !!this._route.snapshot.queryParams["topExpressionId"];
    } else {
      // Only split screen an expression if a bottom module is open
      return !!this._route.snapshot.queryParams["bottomExpressionId"];
    }
  }

  onSplitScreenCodeEditor() {
    let queryParams = { ...this._route.snapshot.queryParams };
    if (this.isModule) {
      delete queryParams["topModuleVersion"];
      delete queryParams["bottomModuleVersion"];
      queryParams["bottomExpressionId"] = this.expression?.id;
    } else {
      delete queryParams["topModuleId"];
      queryParams["topExpressionId"] = this.expression?.id;
    }
    this._router.navigate(["/datasets/code-editor"], { queryParams });
  }
  onPreviewCode() {
    let queryParams = { ...this._route.snapshot.queryParams };
    if (this.isModule) {
      delete queryParams["topExpressionId"];
      delete queryParams["topModuleVersion"];
      queryParams["topModuleId"] = this.expression?.id;
    } else {
      delete queryParams["topModuleId"];
      queryParams["topExpressionId"] = this.expression?.id;
    }
    this._router.navigate(["/datasets/code-editor"], { queryParams });
  }
  onFullScreenCodeEditor() {
    let queryParams = { ...this._route.snapshot.queryParams };
    if (this.isModule) {
      delete queryParams["topExpressionId"];
      delete queryParams["topModuleVersion"];
      delete queryParams["bottomExpressionId"];
      delete queryParams["bottomModuleVersion"];
      queryParams["topModuleId"] = this.expression?.id;
    } else {
      delete queryParams["topModuleId"];
      queryParams["topExpressionId"] = this.expression?.id;
    }
    this._router.navigate(["/datasets/code-editor"], { queryParams });
  }

  onVisibility(): void {
    this.isVisible = !this.isVisible;
  }

  onTagSelectionChanged(tagIDs: string[]): void {
    console.log("Tag selection changed", tagIDs);
    // this._expressionService.updateExpressionTags(this.expression.id, tagIDs);
  }

  onCheckboxClick(event: Event): void {
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