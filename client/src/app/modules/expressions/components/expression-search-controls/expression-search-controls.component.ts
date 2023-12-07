import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { Subscription } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { UserInfo } from "src/app/generated-protos/user";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { ExpressionSearchFilter } from "../../models/expression-search";
import { ExpressionsService } from "../../services/expressions.service";
import { DataExpression } from "src/app/generated-protos/expressions";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ExpressionGroup } from "src/app/generated-protos/expression-group";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { getPredefinedExpression } from "src/app/expression-language/predefined-expressions";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { ExpressionGroupListReq, ExpressionGroupListResp } from "src/app/generated-protos/expression-group-msgs";

@Component({
  selector: "expression-search-controls",
  templateUrl: "./expression-search-controls.component.html",
  styleUrls: ["./expression-search-controls.component.scss"],
})
export class ExpressionSearchControlsComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _loadedExpressions: DataExpression[] = [];
  private _pseudoIntensities: DataExpression[] = [];
  private _quantifiedExpressions: DataExpression[] = [];
  private _expressionGroups: ExpressionGroup[] = [];
  filteredExpressions: (DataExpression | ExpressionGroup)[] = [];

  @Output() onFilterChanged = new EventEmitter<ExpressionSearchFilter>();

  searchString: string = "";

  private _authors: UserInfo[] = [];
  private _filteredAuthors: string[] = [];

  filteredTagIDs: string[] = [];

  allScans: ScanItem[] = [];
  private _visibleScanId: string = "";

  private _defaultQuantsForScans: Record<string, string> = {};
  private _availableQuants: Record<string, QuantificationSummary[]> = {};
  filteredQuants: QuantificationSummary[] = [];
  private _selectedQuantId: string = "";

  private _currentUserId: string = "";

  private _et_Expression = "Expressions";
  private _et_ExpressionGroups = "Expression Groups";
  private _et_QuantifiedElements = "Quantified Elements";
  private _et_PseudoIntensities = "Pseudo-Intensities";
  expressionListTypes = [this._et_Expression, this._et_ExpressionGroups, this._et_QuantifiedElements, this._et_PseudoIntensities];
  expressionListType = this.expressionListTypes[0];

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _expressionsService: ExpressionsService,
    private _userOptionsService: UserOptionsService,
    private _cachedDataSerivce: APICachedDataService
  ) {
    const quants = this._analysisLayoutService.availableScanQuants$.value?.[this.visibleScanId];
    if (this.visibleScanId && quants && quants.length > 0) {
      this.selectedQuantId = quants[0].id;
      this.filteredQuants = quants;
    } else {
      // this.selectedQuantId = "";
      // this.filteredQuants = [];

      // Only request if we have a scan ID!
      if (this.visibleScanId) {
        this._analysisLayoutService.fetchQuantsForScan(this.visibleScanId);
        this.refreshPseudointensities(this.visibleScanId);
      }
    }
  }

  ngOnInit(): void {
    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this._currentUserId = this._userOptionsService.userDetails.info?.id || "";
      })
    );

    // Get a list of groups
    this._cachedDataSerivce.getExpressionGroupList(ExpressionGroupListReq.create({})).subscribe((resp: ExpressionGroupListResp) => {
      this._expressionGroups = [];
      for (const group of Object.values(resp.groups)) {
        this._expressionGroups.push(group);
      }
    });

    this._subs.add(
      this._expressionsService.expressions$.subscribe(expressions => {
        this._loadedExpressions = Object.values(expressions);
        this.filterExpressionsForDisplay();
      })
    );

    if (!this.visibleScanId) {
      this.visibleScanId = this._analysisLayoutService.defaultScanId;
    }

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScanQuants$.subscribe(quants => {
        this._availableQuants = quants;
        this.filteredQuants = quants[this.visibleScanId] || [];
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        if (screenConfiguration) {
          this._defaultQuantsForScans = {};
          Object.entries(screenConfiguration.scanConfigurations).map(([scanId, scanConfig]) => {
            this._defaultQuantsForScans[scanId] = scanConfig.quantId;
          });

          if (this.visibleScanId && !this.selectedQuantId) {
            this.selectedQuantId = this._defaultQuantsForScans[this.visibleScanId] || "";
          }
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }
  /*
  @Input() set expressions(expressions: DataExpression[]) {
    this._expressions = expressions;
    this.filterExpressionsForDisplay();
  }
*/
  @Input() set manualFilters(filters: Partial<ExpressionSearchFilter> | null) {
    if (filters !== null) {
      let { searchString, tagIDs, authors } = filters;
      this.searchString = searchString ?? this.searchString;
      this.filteredTagIDs = tagIDs ?? this.filteredTagIDs;
      this.filteredAuthors = authors ?? this.filteredAuthors;
      this.filterExpressionsForDisplay();
    }
  }

  private refreshPseudointensities(scanId: string) {
    this._cachedDataSerivce.getPseudoIntensity(PseudoIntensityReq.create({ scanId: scanId })).subscribe((resp: PseudoIntensityResp) => {
      this._pseudoIntensities = [];
      for (const label of resp.intensityLabels) {
        const id = DataExpressionId.makePredefinedPseudoIntensityExpression(label);
        const expr = getPredefinedExpression(id);
        if (expr) {
          this._pseudoIntensities.push(expr);
        }
      }
    });
  }

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    this._visibleScanId = scanId;
    this._analysisLayoutService.fetchQuantsForScan(scanId);
    this.refreshPseudointensities(scanId);
    this.filteredQuants = this._availableQuants[scanId] || [];
    this.selectedQuantId = this._defaultQuantsForScans[this.visibleScanId] || "";
    this.emitFilters();
  }

  // This allows the parent component to set the scan ID without triggering a fetch of the quants
  @Input() set scanId(scanId: string) {
    if (scanId && this._visibleScanId !== scanId) {
      this._visibleScanId = scanId;
      this._analysisLayoutService.fetchQuantsForScan(scanId);
      this.filteredQuants = this._availableQuants[scanId] || [];
      this.selectedQuantId = this._defaultQuantsForScans[this.visibleScanId] || "";
    }
  }

  get selectedQuantId(): string {
    return this._selectedQuantId;
  }

  set selectedQuantId(quantId: string) {
    this._selectedQuantId = quantId;

    // Build the list of expressions for the quantified elements
    this._quantifiedExpressions = [];
    for (const quant of this.filteredQuants) {
      if (quant.id == this._selectedQuantId) {
        for (const elem of quant.elements) {
          let det = quant.params?.userParams?.quantMode || "";
          if (det.length > 0 && det != "Combined") {
            det = det.substring(0, 1);
          }

          const id = DataExpressionId.makePredefinedQuantElementExpression(elem, "%", det);
          const expr = getPredefinedExpression(id);
          if (expr) {
            this._quantifiedExpressions.push(expr);
          }
        }
      }
    }
    this.emitFilters();
  }

  // This allows the parent component to set the quant ID without emitting a filter change
  @Input() set quantId(quantId: string) {
    if (quantId && this._selectedQuantId !== quantId) {
      this._selectedQuantId = quantId;
    }
  }

  get canCreateExpressions(): boolean {
    return this._userOptionsService.hasFeatureAccess("editExpression");
  }

  emitFilters(): void {
    this.onFilterChanged.emit({
      scanId: this.visibleScanId,
      quantId: this.selectedQuantId,
      filteredExpressions: this.filteredExpressions,
      searchString: this.searchString,
      tagIDs: this.filteredTagIDs,
      authors: this.filteredAuthors,
    });
  }

  extractAuthors() {
    let authorIDs = new Set<string>();
    let authors: UserInfo[] = [];
    this._loadedExpressions.forEach(expression => {
      if (expression.owner?.creatorUser?.id === "builtin") {
        return;
      }

      if (expression.owner?.creatorUser?.id && !authorIDs.has(expression.owner.creatorUser.id)) {
        authors.push(expression.owner.creatorUser);
        authorIDs.add(expression.owner.creatorUser.id);
      }
    });

    this.authors = authors.sort((a, b) => {
      if (a.id === this._currentUserId) {
        return -1;
      } else if (b.id === this._currentUserId) {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });
  }

  private filterExpressionsForDisplay(valueChanged: boolean = false): void {
    // Find the source data depending on what list type is requested...
    let expressions: (DataExpression | ExpressionGroup)[] = [];
    if (this.expressionListType == this._et_Expression) {
      expressions = this._loadedExpressions;
    } else if (this.expressionListType == this._et_QuantifiedElements) {
      expressions = this._quantifiedExpressions;
    } else if (this.expressionListType == this._et_PseudoIntensities) {
      expressions = this._pseudoIntensities;
    } else if (this.expressionListType == this._et_ExpressionGroups) {
      expressions = this._expressionGroups;
    }

    let filteredExpressions: (DataExpression | ExpressionGroup)[] = [];
    let searchString = this.searchString.toLowerCase();
    for (let expression of expressions) {
      let expressionNameLower = expression.name.toLowerCase();
      if (
        (searchString.length <= 0 || expressionNameLower.indexOf(searchString) >= 0) && // No search string or search string matches
        (this.filteredTagIDs.length <= 0 || this.filteredTagIDs.some(tagID => expression.tags.includes(tagID))) && // No selected tags or expression has selected tag
        (this.filteredAuthors.length <= 0 || this.filteredAuthors.some(author => expression.owner?.creatorUser?.id === author)) // No selected authors or expression has selected author
      ) {
        filteredExpressions.push(expression);
      }
    }

    this.filteredExpressions = filteredExpressions.sort((a, b) => a.name.localeCompare(b.name));
    this.onFilterChanged.emit({
      scanId: this.visibleScanId,
      quantId: this.selectedQuantId,
      filteredExpressions,
      searchString,
      tagIDs: this.filteredTagIDs,
      authors: this.filteredAuthors,
      valueChanged,
    });
    this.extractAuthors();
  }

  get authors(): UserInfo[] {
    return this._authors;
  }

  set authors(authors: UserInfo[]) {
    this._authors = authors;
  }

  get authorsTooltip(): string {
    const authorNames = this._authors.filter(author => this._filteredAuthors.includes(author.id)).map(author => author.name);
    return this._filteredAuthors.length > 0 ? `Authors:\n${authorNames.join("\n")}` : "No Authors Selected";
  }

  get filteredAuthors(): string[] {
    return this._filteredAuthors;
  }

  set filteredAuthors(authors: string[]) {
    this._filteredAuthors = authors;
    this.filterExpressionsForDisplay(true);
  }

  onTagFilterChanged(tagIDs: string[]): void {
    this.filteredTagIDs = tagIDs;
    this.filterExpressionsForDisplay(true);
  }

  onFilterText(filterText: string): void {
    this.searchString = filterText || "";
    this.filterExpressionsForDisplay(true);
  }

  onChangeExpressionListType(expressionListType: string) {
    this.expressionListType = expressionListType;
    this.filterExpressionsForDisplay();
  }
}
