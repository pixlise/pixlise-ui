import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ROIItemSummary } from "src/app/generated-protos/roi";
import { ROIService } from "../../services/roi.service";
import { Subscription } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { UserInfo } from "src/app/generated-protos/user";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { SearchParams } from "src/app/generated-protos/search-params";

export type ROISearchFilter = {
  filteredSummaries: ROIItemSummary[];

  scanId: string;
  searchString: string;
  tagIDs: string[];
  authors: string[];
};

@Component({
  selector: "roi-search-controls",
  templateUrl: "./roi-search-controls.component.html",
  styleUrls: ["./roi-search-controls.component.scss"],
})
export class ROISearchControlsComponent {
  private _subs = new Subscription();

  private _summaries: ROIItemSummary[] = [];
  filteredSummaries: ROIItemSummary[] = [];

  @Output() onFilterChanged = new EventEmitter<ROISearchFilter>();

  roiSearchString: string = "";

  private _authors: UserInfo[] = [];
  private _filteredAuthors: string[] = [];

  filteredTagIDs: string[] = [];

  allScans: ScanItem[] = [];
  _visibleScanId: string = "";

  constructor(
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService
  ) {}

  get summaries(): ROIItemSummary[] {
    return this._summaries;
  }

  @Input() set summaries(summaries: ROIItemSummary[]) {
    this._summaries = summaries;
    this.filterROIsForDisplay();
  }

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    this._visibleScanId = scanId;
    this._roiService.searchROIs(SearchParams.create({ scanId }), false);
  }

  ngOnInit(): void {
    this.visibleScanId = this._analysisLayoutService.defaultScanId;

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get canCreateROIs(): boolean {
    return true;
  }

  extractAuthors() {
    let authorIDs = new Set<string>();
    let authors: UserInfo[] = [];
    this.summaries.forEach(roi => {
      if (roi.owner?.creatorUser?.id && !authorIDs.has(roi.owner.creatorUser.id)) {
        authors.push(roi.owner.creatorUser);
        authorIDs.add(roi.owner.creatorUser.id);
      }
    });

    this.authors = authors;
  }

  private filterROIsForDisplay(): void {
    let filteredSummaries: ROIItemSummary[] = [];
    let searchString = this.roiSearchString.toLowerCase();
    for (let summary of this.summaries) {
      let summaryNameLower = summary.name.toLowerCase();
      if (
        (this.visibleScanId.length <= 0 || summary.scanId === this.visibleScanId) &&
        (searchString.length <= 0 || summaryNameLower.indexOf(searchString) >= 0) &&
        (this.filteredTagIDs.length <= 0 || this.filteredTagIDs.some(tagID => summary.tags.includes(tagID))) &&
        (this.filteredAuthors.length <= 0 || this.filteredAuthors.some(author => summary.owner?.creatorUser?.id === author))
      ) {
        filteredSummaries.push(summary);
      }
    }

    this.filteredSummaries = filteredSummaries;
    this.onFilterChanged.emit({ filteredSummaries, searchString, scanId: this.visibleScanId, tagIDs: this.filteredTagIDs, authors: this.filteredAuthors });
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
    this.filterROIsForDisplay();
  }

  onTagFilterChanged(tagIDs: string[]): void {
    this.filteredTagIDs = tagIDs;
    this.filterROIsForDisplay();
  }

  onFilterText(filterText: string): void {
    this.roiSearchString = filterText || "";
    this.filterROIsForDisplay();
  }
}
