import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { ROIItemSummary } from "src/app/generated-protos/roi";
import { Subscription } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { UserInfo } from "src/app/generated-protos/user";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { ExpressionSearchFilter } from "../../models/expression-search";
import { ExpressionsService } from "../../services/expressions.service";
import { DataExpression } from "src/app/generated-protos/expressions";
import { QuantificationSummary } from "src/app/generated-protos/quantification-meta";

@Component({
  selector: "expression-search-controls",
  templateUrl: "./expression-search-controls.component.html",
  styleUrls: ["./expression-search-controls.component.scss"],
})
export class ExpressionSearchControlsComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _expressions: DataExpression[] = [];
  filteredExpressions: DataExpression[] = [];

  @Output() onFilterChanged = new EventEmitter<ExpressionSearchFilter>();

  searchString: string = "";

  private _authors: UserInfo[] = [];
  private _filteredAuthors: string[] = [];

  filteredTagIDs: string[] = [];

  allScans: ScanItem[] = [];
  _visibleScanId: string = "";

  private _defaultQuantsForScans: Record<string, string> = {};
  private _availableQuants: Record<string, QuantificationSummary[]> = {};
  filteredQuants: QuantificationSummary[] = [];
  _selectedQuantId: string = "";

  _currentUserId: string = "";

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _expressionsService: ExpressionsService,
    private _userOptionsService: UserOptionsService
  ) {}

  ngOnInit(): void {
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
      }
    }

    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this._currentUserId = this._userOptionsService.userDetails.info?.id || "";
      })
    );

    this._subs.add(
      this._expressionsService.expressions$.subscribe(expressions => {
        this.expressions = Object.values(expressions);
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

  get expressions(): DataExpression[] {
    return this._expressions;
  }

  @Input() set expressions(expressions: DataExpression[]) {
    this._expressions = expressions;
    this.filterExpressionsForDisplay();
  }

  @Input() set manualFilters(filters: Partial<ExpressionSearchFilter> | null) {
    if (filters !== null) {
      let { searchString, tagIDs, authors } = filters;
      this.searchString = searchString ?? this.searchString;
      this.filteredTagIDs = tagIDs ?? this.filteredTagIDs;
      this.filteredAuthors = authors ?? this.filteredAuthors;
      this.filterExpressionsForDisplay();
    }
  }

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    this._visibleScanId = scanId;
    this._analysisLayoutService.fetchQuantsForScan(scanId);
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
    this.expressions.forEach(expression => {
      if (expression.owner?.creatorUser?.id === "builtin") {
        return;
      }

      if (expression.owner?.creatorUser?.id && !authorIDs.has(expression.owner.creatorUser.id)) {
        authors.push(expression.owner.creatorUser);
        authorIDs.add(expression.owner.creatorUser.id);
      }
    });

    this.authors = authors;
  }

  private filterExpressionsForDisplay(valueChanged: boolean = false): void {
    let filteredExpressions: DataExpression[] = [];
    let searchString = this.searchString.toLowerCase();
    for (let expression of this.expressions) {
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
    let authorNames = this._authors.filter(author => this._filteredAuthors.includes(author.id)).map(author => author.name);
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
}
