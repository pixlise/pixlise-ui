import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ROIItemSummary } from "src/app/generated-protos/roi";
import { ROIService } from "../../services/roi.service";
import { Subscription } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { UserInfo } from "src/app/generated-protos/user";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { SearchParams } from "src/app/generated-protos/search-params";
import { ROISearchFilter, ROIType, ROITypeInfo, ROI_TYPES, checkMistFullyIdentified, checkROITypeIsMIST } from "../../models/roi-search";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";

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

  roiTypeOptions: ROITypeInfo[] = ROI_TYPES;
  _selectedROITypes: ROIType[] = ["user-created", "shared"];

  _currentUserId: string = "";

  constructor(
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _userOptionsService: UserOptionsService
  ) {}

  ngOnInit(): void {
    this.visibleScanId = this._analysisLayoutService.defaultScanId;

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
      })
    );

    this._subs.add(
      this._roiService.roiSummaries$.subscribe(summaries => {
        this._summaries = Object.values(summaries);
        this.filterROIsForDisplay();
      })
    );

    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this._currentUserId = this._userOptionsService.userDetails.info?.id || "";
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get summaries(): ROIItemSummary[] {
    return this._summaries;
  }

  @Input() set summaries(summaries: ROIItemSummary[]) {
    this._summaries = summaries;
    this.filterROIsForDisplay();
  }

  @Input() set manualFilters(filters: Partial<ROISearchFilter> | null) {
    if (filters !== null) {
      let { searchString, scanId, tagIDs, authors } = filters;
      this.roiSearchString = searchString ?? this.roiSearchString;
      this.visibleScanId = scanId ?? this.visibleScanId;
      this.filteredTagIDs = tagIDs ?? this.filteredTagIDs;
      this.filteredAuthors = authors ?? this.filteredAuthors;
      this.filterROIsForDisplay();
    }
  }

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    this._visibleScanId = scanId;
    this._roiService.searchROIs(SearchParams.create({ scanId }), false);
  }

  get selectedROITypes(): ROIType[] {
    return this._selectedROITypes;
  }

  set selectedROITypes(roiTypes: ROIType[]) {
    this._selectedROITypes = roiTypes;
    if (checkROITypeIsMIST(this.selectedROITypes)) {
      this._roiService.searchROIs(SearchParams.create({ scanId: this.visibleScanId }), true);
    }
    this.filterROIsForDisplay();
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

  private checkUserIsAuthor(roi: ROIItemSummary): boolean {
    return roi.owner?.creatorUser?.id === this._currentUserId;
  }

  private filterROIsForDisplay(): void {
    let filteredSummaries: ROIItemSummary[] = [];
    let searchString = this.roiSearchString.toLowerCase();
    for (let summary of this.summaries) {
      let summaryNameLower = summary.name.toLowerCase();
      if (
        (this.visibleScanId.length <= 0 || summary.scanId === this.visibleScanId) && // No selected scan or scan matches
        (searchString.length <= 0 || summaryNameLower.indexOf(searchString) >= 0) && // No search string or search string matches
        (this.filteredTagIDs.length <= 0 || this.filteredTagIDs.some(tagID => summary.tags.includes(tagID))) && // No selected tags or summary has selected tag
        (this.filteredAuthors.length <= 0 || this.filteredAuthors.some(author => summary.owner?.creatorUser?.id === author)) && // No selected authors or summary has selected author
        ((!summary.isMIST && // Not MIST
          ((this.selectedROITypes.includes("user-created") && this.checkUserIsAuthor(summary)) || // Not MIST and was created by user
            (this.selectedROITypes.includes("shared") && !this.checkUserIsAuthor(summary)))) || // Not MIST and was shared, but not created by user
          (summary.isMIST && // MIST
            ((this.selectedROITypes.includes("mist-species") && checkMistFullyIdentified(summary)) || // MIST and fully identified
              (this.selectedROITypes.includes("mist-group") && !checkMistFullyIdentified(summary))))) // MIST and not fully identified
      ) {
        filteredSummaries.push(summary);
      }
    }

    this.filteredSummaries = filteredSummaries.sort((a, b) => a.name.localeCompare(b.name));
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