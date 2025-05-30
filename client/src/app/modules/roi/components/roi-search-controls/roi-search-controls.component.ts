import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { ROIItemSummary } from "src/app/generated-protos/roi";
import { ROIService } from "../../services/roi.service";
import { Subscription } from "rxjs";
import { ScanItem } from "src/app/generated-protos/scan";
import { UserInfo } from "src/app/generated-protos/user";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { SearchParams } from "src/app/generated-protos/search-params";
import { ROISearchFilter, ROIType, ROITypeInfo, ROI_TYPES, checkMistFullyIdentified, checkROITypeIsMIST } from "../../models/roi-search";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";

@Component({
  selector: "roi-search-controls",
  templateUrl: "./roi-search-controls.component.html",
  styleUrls: ["./roi-search-controls.component.scss"],
})
export class ROISearchControlsComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _summaries: ROIItemSummary[] = [];
  filteredSummaries: ROIItemSummary[] = [];

  @Output() onFilterChanged = new EventEmitter<ROISearchFilter>();

  roiSearchString: string = "";

  private _authors: UserInfo[] = [];
  private _filteredAuthors: string[] = [];

  filteredTagIDs: string[] = [];

  @Input() showBuiltin: boolean = true;
  @Input() showSelectedPoints: boolean = false;
  @Input() limitToConfiguredScans: boolean = true;

  configuredScans: ScanItem[] = [];
  allScans: ScanItem[] = [];
  _visibleScanId: string = "";

  roiTypeOptions: ROITypeInfo[] = ROI_TYPES;
  _selectedROITypes: ROIType[] = ["builtin", "user-created", "shared"];

  _currentUserId: string = "";

  constructor(
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _userOptionsService: UserOptionsService
  ) {}

  ngOnInit(): void {
    if (!this.showBuiltin) {
      this._selectedROITypes.splice(this._selectedROITypes.indexOf("builtin"), 1);
      this.filterROIsForDisplay();
    }

    if (!this._visibleScanId) {
      this.visibleScanId = this._analysisLayoutService.defaultScanId;
    }

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
        if (this.limitToConfiguredScans && this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
        } else if (!this.limitToConfiguredScans) {
          this.configuredScans = scans;
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        if (this.limitToConfiguredScans && screenConfiguration) {
          this.configuredScans = this.allScans.filter(scan => screenConfiguration.scanConfigurations[scan.id]);
        }
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

    this.restoreSelectedROITypes();
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  cacheSelectedROITypes() {
    localStorage.setItem("selectedROITypes", JSON.stringify(this._selectedROITypes));
  }

  restoreSelectedROITypes() {
    const selectedROITypes = localStorage.getItem("selectedROITypes");
    if (selectedROITypes) {
      this.selectedROITypes = JSON.parse(selectedROITypes);
    }
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
      const { searchString, scanId, tagIDs, authors, types } = filters;
      this.roiSearchString = searchString ?? this.roiSearchString;
      this.visibleScanId = scanId ?? this.visibleScanId;
      this.filteredTagIDs = tagIDs ?? this.filteredTagIDs;
      this.filteredAuthors = authors ?? this.filteredAuthors;
      this.selectedROITypes = types ?? this.selectedROITypes;
      this.filterROIsForDisplay();
    }
  }

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    this._visibleScanId = scanId;
    this._roiService.searchROIs(SearchParams.create({ scanId }), false);
    this.filterROIsForDisplay();
  }

  @Input() set scanId(scanId: string) {
    this.visibleScanId = scanId;
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
    this.cacheSelectedROITypes();
  }

  get canCreateROIs(): boolean {
    return true;
  }

  extractAuthors() {
    const authorIDs = new Set<string>();
    const authors: UserInfo[] = [];
    this.summaries.forEach(roi => {
      if (roi.owner?.creatorUser?.id === "builtin") {
        return;
      }

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

  private filterROIsForDisplay(updateSelection: boolean = true): void {
    const filteredSummaries: ROIItemSummary[] = [];
    const searchString = this.roiSearchString.toLowerCase();
    for (const summary of this.summaries) {
      if (PredefinedROIID.isSelectedPointsROI(summary.id) && !this.showSelectedPoints) {
        continue;
      }

      const summaryNameLower = summary.name.toLowerCase();
      if (this.visibleScanId.length > 0 && summary.scanId !== this.visibleScanId) {
        continue;
      }

      if (searchString.length > 0 && summaryNameLower.indexOf(searchString) < 0 && this.roiSearchString != summary.id) {
        continue;
      }

      if (this.filteredTagIDs.length > 0 && !this.filteredTagIDs.some(tagID => summary.tags.includes(tagID))) {
        continue;
      }

      if (this.filteredAuthors.length > 0 && !this.filteredAuthors.some(author => summary.owner?.creatorUser?.id === author)) {
        continue;
      }

      if (this.selectedROITypes.includes("builtin") && PredefinedROIID.isPredefined(summary.id)) {
        filteredSummaries.push(summary);
      } else if (this.selectedROITypes.includes("user-created") && this.checkUserIsAuthor(summary) && !summary.isMIST) {
        filteredSummaries.push(summary);
      } else if (this.selectedROITypes.includes("shared") && !this.checkUserIsAuthor(summary) && !PredefinedROIID.isPredefined(summary.id) && !summary.isMIST) {
        filteredSummaries.push(summary);
      } else if (this.selectedROITypes.includes("mist-species") && summary.isMIST && checkMistFullyIdentified(summary)) {
        filteredSummaries.push(summary);
      } else if (this.selectedROITypes.includes("mist-group") && summary.isMIST && !checkMistFullyIdentified(summary)) {
        filteredSummaries.push(summary);
      }
    }
    // Sort by name, but make sure built-in ROIs are at the top
    // this.filteredSummaries = filteredSummaries.sort((a, b) => a.name.localeCompare(b.name));
    this.filteredSummaries = filteredSummaries.sort((a, b) => {
      if (PredefinedROIID.isPredefined(a.id) && !PredefinedROIID.isPredefined(b.id)) {
        return -1;
      } else if (!PredefinedROIID.isPredefined(a.id) && PredefinedROIID.isPredefined(b.id)) {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    this.onFilterChanged.emit({
      filteredSummaries,
      searchString,
      scanId: this.visibleScanId,
      tagIDs: this.filteredTagIDs,
      authors: this.filteredAuthors,
      updateSelection,
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
