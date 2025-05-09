import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { Subscription } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { UserInfo } from "src/app/generated-protos/user";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { ExpressionSearchFilter, RecentExpression } from "../../models/expression-search";
import { ExpressionsService } from "../../services/expressions.service";
import { DataExpression } from "src/app/generated-protos/expressions";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";
import { ExpressionGroup } from "src/app/generated-protos/expression-group";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { getAnomalyExpressions, getPredefinedExpression } from "src/app/expression-language/predefined-expressions";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { PseudoIntensityReq, PseudoIntensityResp } from "src/app/generated-protos/pseudo-intensities-msgs";
import { ExpressionBrowseSections } from "../../models/expression-browse-sections";
import { periodicTableDB } from "src/app/periodic-table/periodic-table-db";

@Component({
  selector: "expression-search-controls",
  templateUrl: "./expression-search-controls.component.html",
  styleUrls: ["./expression-search-controls.component.scss"],
})
export class ExpressionSearchControlsComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _loadedExpressions: DataExpression[] = [];
  private _anomalyExpressions: DataExpression[] = [];
  private _pseudoIntensities: DataExpression[] = [];
  private _quantifiedExpressions: DataExpression[] = [];
  private _expressionGroups: ExpressionGroup[] = [];
  filteredExpressions: (DataExpression | ExpressionGroup)[] = [];

  onlyShowRecent: boolean = false;
  onlyShowEditable: boolean = false;

  @Input() recentExpressions: RecentExpression[] = [];
  private _selectedDetector: "A" | "B" | "A&B" | "" = "";

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

  private _et_Expression = ExpressionBrowseSections.EXPRESSIONS;
  private _et_ExpressionGroups = ExpressionBrowseSections.EXPRESSION_GROUPS;
  private _et_QuantifiedElements = ExpressionBrowseSections.QUANTIFIED_ELEMENTS;
  private _et_PseudoIntensities = ExpressionBrowseSections.PSEUDO_INTENSITIES;
  private _et_AnomalyMaps = ExpressionBrowseSections.ANOMALY_MAPS;
  expressionListTypes = [this._et_Expression, this._et_ExpressionGroups, this._et_QuantifiedElements, this._et_PseudoIntensities, this._et_AnomalyMaps];
  expressionListType = ExpressionBrowseSections.EXPRESSIONS;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _expressionsService: ExpressionsService,
    private _userOptionsService: UserOptionsService,
    private _cachedDataSerivce: APICachedDataService
  ) {}

  ngOnInit(): void {
    const quants = this._analysisLayoutService.availableScanQuants$.value?.[this.visibleScanId];
    if (this.visibleScanId && quants && quants.length > 0) {
      //this.selectedQuantId = quants[0].id; <-- Took this out, at this point we don't know the selected quant id, so can't just show the first one in the list!
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

    this.refreshAnomalyMaps();

    this._expressionsService.fetchExpressions();
    this._expressionsService.fetchModules();

    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this._currentUserId = this._userOptionsService.userDetails.info?.id || "";
      })
    );

    // Get a list of groups
    this._expressionsService.listExpressionGroups();
    this._expressionsService.expressionGroups$.subscribe(groups => {
      this._expressionGroups = groups;
      this.filterExpressionsForDisplay();
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

          if (this.visibleScanId) {
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
      let { searchString, tagIDs, authors, expressionType } = filters;
      this.searchString = searchString ?? this.searchString;
      this.filteredTagIDs = tagIDs ?? this.filteredTagIDs;
      this.filteredAuthors = authors ?? this.filteredAuthors;
      this.expressionListType = expressionType ?? this.expressionListType;
      this.onlyShowRecent = filters.onlyShowRecent ?? false;
      this.filterExpressionsForDisplay();
    }
  }

  private refreshAnomalyMaps() {
    this._anomalyExpressions = getAnomalyExpressions();
  }

  private refreshPseudointensities(scanId: string) {
    this._cachedDataSerivce.getPseudoIntensity(PseudoIntensityReq.create({ scanId })).subscribe((resp: PseudoIntensityResp) => {
      let newPseudoIntensities = [];
      for (const label of resp.intensityLabels) {
        const id = DataExpressionId.makePredefinedPseudoIntensityExpression(label);
        const expr = getPredefinedExpression(id);
        if (expr) {
          newPseudoIntensities.push(expr);
        }
      }

      // Check if there was a change
      let intensitiesChanged = newPseudoIntensities.length !== this._pseudoIntensities.length;
      if (newPseudoIntensities.length === this._pseudoIntensities.length) {
        for (let i = 0; i < newPseudoIntensities.length; i++) {
          if (newPseudoIntensities[i].id !== this._pseudoIntensities[i].id) {
            intensitiesChanged = true;
            break;
          }
        }
      }

      if (intensitiesChanged) {
        this._pseudoIntensities = newPseudoIntensities;

        this.filterExpressionsForDisplay();
        this.emitFilters();
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
      this.refreshPseudointensities(scanId);
    }
  }

  get selectedQuantId(): string {
    return this._selectedQuantId;
  }

  set selectedQuantId(quantId: string) {
    this._selectedQuantId = quantId;

    this.loadQuantifiedExpressions();
    this.emitFilters();
  }

  get selectedDetector(): "A" | "B" | "A&B" | "" {
    return this._selectedDetector;
  }

  @Input() set selectedDetector(detector: "A" | "B" | "A&B" | "") {
    this._selectedDetector = detector;
    this.loadQuantifiedExpressions();
    this.emitFilters();
  }

  loadQuantifiedExpressions(): void {
    this._quantifiedExpressions = [];

    const currentQuant = this.filteredQuants.find(quant => quant.id === this._selectedQuantId);
    if (!currentQuant) {
      return;
    }

    const quantMode = currentQuant?.params?.userParams?.quantMode || "";
    let defaultDetector = quantMode;
    if (defaultDetector.length > 0 && defaultDetector != "Combined") {
      defaultDetector = defaultDetector.substring(0, 1);
    }

    if (!this.selectedDetector) {
      this.selectedDetector = defaultDetector.replace("Combined", "A&B") as "A" | "B" | "A&B";
    }

    const detector = this.selectedDetector.replace("A&B", "Combined");

    const orderedElems = periodicTableDB.getElementsInAtomicNumberOrder(currentQuant.elements);
    orderedElems.forEach(quantElement => {
      const id = DataExpressionId.makePredefinedQuantElementExpression(quantElement, "%", detector);
      const expr = getPredefinedExpression(id);
      if (expr) {
        this._quantifiedExpressions.push(expr);
      }
    });

    // Add unquantified and chisq
    let unquantWtPctId = DataExpressionId.predefinedUnquantifiedPercentDataExpression;
    if (detector.length > 0) {
      unquantWtPctId += `(${detector})`;
    }
    const unquantWtPct = getPredefinedExpression(unquantWtPctId);
    if (unquantWtPct) {
      this._quantifiedExpressions.push(unquantWtPct);
    }

    const chisqId = DataExpressionId.makePredefinedQuantDataExpression("chisq", detector);
    const chisqExpr = getPredefinedExpression(chisqId);
    if (chisqExpr) {
      this._quantifiedExpressions.push(chisqExpr);
    }

    this.filterExpressionsForDisplay();
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

  checkIsEditable(expression: DataExpression | ExpressionGroup): boolean {
    return expression.owner?.canEdit || false;
  }

  onToggleOnlyShowEditable(): void {
    this.onlyShowEditable = !this.onlyShowEditable;
    this.filterExpressionsForDisplay();
  }

  emitFilters(): void {
    this.onFilterChanged.emit({
      scanId: this.visibleScanId,
      quantId: this.selectedQuantId,
      filteredExpressions: this.filteredExpressions,
      searchString: this.searchString,
      tagIDs: this.filteredTagIDs,
      expressionType: this.expressionListType,
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
    if (this.onlyShowRecent) {
      expressions = this.recentExpressions
        .filter(
          (recent: RecentExpression) => (recent.type === "group" && this.isExpressionGroupList) || (recent.type === "expression" && !this.isExpressionGroupList)
        )
        .map((recentExpression: RecentExpression) => recentExpression.expression);
    } else if (this.expressionListType === this._et_Expression) {
      expressions = this._loadedExpressions;
    } else if (this.expressionListType === this._et_QuantifiedElements) {
      expressions = this._quantifiedExpressions;
    } else if (this.expressionListType === this._et_PseudoIntensities) {
      expressions = this._pseudoIntensities;
    } else if (this.expressionListType === this._et_ExpressionGroups) {
      expressions = this._expressionGroups;
    } else if (this.expressionListType === this._et_AnomalyMaps) {
      expressions = this._anomalyExpressions;
    }

    let filteredExpressions: (DataExpression | ExpressionGroup)[] = [];
    let searchString = this.searchString.toLowerCase();
    for (let expression of expressions) {
      let expressionNameLower = expression.name.toLowerCase();
      if (
        (!this.onlyShowEditable || this.checkIsEditable(expression)) && // Only show editable expressions (if requested
        (searchString.length <= 0 || expressionNameLower.indexOf(searchString) >= 0 || expression.id == this.searchString) && // No search string or search string matches
        (this.filteredTagIDs.length <= 0 || this.filteredTagIDs.some(tagID => expression.tags.includes(tagID))) && // No selected tags or expression has selected tag
        (this.filteredAuthors.length <= 0 || this.filteredAuthors.some(author => expression.owner?.creatorUser?.id === author)) // No selected authors or expression has selected author
      ) {
        filteredExpressions.push(expression);
      }
    }

    // Only sort alphabetically if we're not looking at lists of elements/atomic numbers. They are pre-sorted!
    if (this.expressionListType === this._et_QuantifiedElements || this.expressionListType === this._et_PseudoIntensities) {
      this.filteredExpressions = filteredExpressions;
    } else {
      this.filteredExpressions = filteredExpressions.sort((a, b) => a.name.localeCompare(b.name));
    }

    this.onFilterChanged.emit({
      scanId: this.visibleScanId,
      quantId: this.selectedQuantId,
      filteredExpressions,
      searchString,
      tagIDs: this.filteredTagIDs,
      authors: this.filteredAuthors,
      expressionType: this.expressionListType,
      valueChanged,
    });
    this.extractAuthors();
  }

  get isExpressionGroupList(): boolean {
    return this.expressionListType === this._et_ExpressionGroups;
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
