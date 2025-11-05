// Copyright (c) 2018-2022 California Institute of Technology (“Caltech”). U.S.
// Government sponsorship acknowledged.
// All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
// * Neither the name of Caltech nor its operating division, the Jet Propulsion
//   Laboratory, nor the names of its contributors may be used to endorse or
//   promote products derived from this software without specific prior written
//   permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";

import { Subscription } from "rxjs";

import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ScanItem } from "src/app/generated-protos/scan";
import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";

import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";
import { AnalysisLayoutService, SelectionService, SnackbarService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIDisplaySettings } from "src/app/modules/roi/models/roi-region";
import { ROISearchFilter } from "src/app/modules/roi/models/roi-search";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { Colours } from "src/app/utils/colours";

export type HighlightedROIs = {
  widgetId: string;
  roiIds: string[];
  scanId: string;
};

@Component({
  standalone: false,
  selector: "roi-tab",
  templateUrl: "./roi-tab.component.html",
  styleUrls: ["./roi-tab.component.scss"],
})
export class ROITabComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  @ViewChild("newROIButton") newROIButton!: ElementRef;

  allPointsColour = Colours.GRAY_10.asString();

  private _selectionEmpty: boolean = false;

  newROIName: string = "";
  newROIDescription: string = "";
  newROITags: string[] = [];

  summaries: ROIItemSummary[] = [];
  filteredSummaries: ROIItemSummary[] = [];

  manualFilters: Partial<ROISearchFilter> | null = null;

  displaySettingsMap: Record<string, ROIDisplaySettings> = {};

  allScans: ScanItem[] = [];
  _visibleScanId: string = "";

  pixelCount: number = 0;
  entryCount: number = 0;
  selectedScanIds: string[] = [];

  currentROIIds: string[] = [];

  layoutWidgets: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
  allContextImages: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
  private _selectedContextImage: string = "";

  showDetailsForROIId = "";

  constructor(
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    private _userOptionsService: UserOptionsService,
    private _snackBarService: SnackbarService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._roiService.roiSummaries$.subscribe(summaries => {
        this.summaries = Object.values(summaries);
      })
    );

    this._subs.add(
      this._roiService.displaySettingsMap$.subscribe(displaySettingsMap => {
        this.displaySettingsMap = displaySettingsMap;
      })
    );

    this._subs.add(
      this._selectionService.selection$.subscribe(selection => {
        this.selectedScanIds = selection.beamSelection.getScanIds();
        this.pixelCount = selection.pixelSelection.selectedPixels.size;
        this.entryCount = selection.beamSelection.getSelectedEntryCount();
      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfigWidgetReferences$.subscribe(widgetReferences => {
        this.layoutWidgets = widgetReferences;
        this.allContextImages = this.layoutWidgets.filter(widget => widget.type === "context-image");
        this.selectedContextImage = this.allContextImages?.[0]?.widget?.id || "";
        // Update highlightedROIs if the selected context image has changed
          const widget = this.layoutWidgets.find(widget => widget.widget.id === this.selectedContextImage);
        if (widget) {
          this.currentROIIds = widget?.widget.data?.contextImage?.roiLayers?.map(layer => layer.id) || [];
          this._analysisLayoutService.highlightedROIs$.next({
            widgetId: this.selectedContextImage,
            roiIds: this.currentROIIds,
            scanId: this._visibleScanId,
          });
        } else {
          this._analysisLayoutService.highlightedROIs$.next(null);
          this.currentROIIds = [];
        }

      })
    );

    this._subs.add(
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(screenConfiguration => {
        const widget = this.findWidgetInScreenConfiguration(this.selectedContextImage);
        if (widget) {
          this.currentROIIds = widget.data?.contextImage?.roiLayers?.map(layer => layer.id) || [];
          this._analysisLayoutService.highlightedROIs$.next({
            widgetId: this.selectedContextImage,
            roiIds: this.currentROIIds,
            scanId: this._visibleScanId,
          });
        } else {
          this._analysisLayoutService.highlightedROIs$.next(null);
          this.currentROIIds = [];
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  // This is called by the sidepanel component
  onTabClose() {
    this._analysisLayoutService.targetWidgetIds$.next(new Set());
  }

  // This is called by the sidepanel component
  onTabOpen() {
    this._analysisLayoutService.targetWidgetIds$.next(new Set([this.selectedContextImage]));
  }

  findWidgetInScreenConfiguration(widgetId: string): WidgetLayoutConfiguration | undefined {
    const activeScreenConfiguration = this._analysisLayoutService.activeScreenConfiguration$.value;
    let matchedWidget: WidgetLayoutConfiguration | undefined = undefined;
    activeScreenConfiguration.layouts.forEach(layout => {
      let widgetInLayout = layout.widgets.find(widget => widget.id === widgetId);
      if (widgetInLayout) {
        matchedWidget = widgetInLayout;
      }
    });
    return matchedWidget;
  }

  get selectedContextImage(): string {
    return this._selectedContextImage;
  }

  set selectedContextImage(widgetId: string) {
    this._selectedContextImage = widgetId;
    // If the ROI is highlighted, update the widgetId
    const widget = this.findWidgetInScreenConfiguration(widgetId);
    if (widget) {
      const roiIds = widget.data?.contextImage?.roiLayers?.map(layer => layer.id) || [];
      this._analysisLayoutService.highlightedROIs$.next({
        widgetId,
        roiIds,
        scanId: this._visibleScanId,
      });
      this.currentROIIds = roiIds;
    } else {
      this._analysisLayoutService.highlightedROIs$.next(null);
      this.currentROIIds = [];
    }
    this._analysisLayoutService.targetWidgetIds$.next(new Set([this.selectedContextImage]));
  }

  trackBySummaryId(index: number, summary: ROIItemSummary) {
    return summary.id;
  }

  onFilterAuthor(author: string) {
    this.manualFilters = { authors: [author] };
  }

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    this._visibleScanId = scanId;
  }

  get canCreateROIs(): boolean {
    return this._userOptionsService.hasFeatureAccess("editROI");
  }

  get showSearch(): boolean {
    return this._analysisLayoutService.showSearch;
  }

  onFilterChanged({ filteredSummaries, scanId }: ROISearchFilter) {
    this.filteredSummaries = filteredSummaries;
    this.visibleScanId = scanId;
  }

  get selectionEmpty(): boolean {
    return this._selectionEmpty;
  }

  onCancelCreateROI() {
    this.closeCreateROIMenu();
  }

  get highlightedROIIds(): string[] {
    return this._analysisLayoutService.highlightedROIs$.value?.roiIds || [];
  }

  onToggleAllVisible() {
    if (this.highlightedROIIds.length > 0) {
      this._analysisLayoutService.highlightedROIs$.next({
        widgetId: this.selectedContextImage,
        roiIds: [],
        scanId: this.visibleScanId,
      });
      this.currentROIIds = [];
    } else {
      this.currentROIIds = this.filteredSummaries.map(summary => summary.id);
      this._analysisLayoutService.highlightedROIs$.next({
        widgetId: this.selectedContextImage,
        roiIds: this.currentROIIds,
        scanId: this.visibleScanId,
      });
    }
  }

  onROIVisibleToggle(roi: ROIItemSummary) {
    if (this.highlightedROIIds.includes(roi.id) && this.selectedContextImage === this._analysisLayoutService.highlightedROIs$.value?.widgetId) {
      this.currentROIIds = this.currentROIIds.filter(id => id !== roi.id);
      this._analysisLayoutService.highlightedROIs$.next({
        widgetId: this.selectedContextImage,
        roiIds: this.currentROIIds,
        scanId: this.visibleScanId,
      });
    } else {
      this.currentROIIds = [roi.id, ...this.currentROIIds];
      this._analysisLayoutService.highlightedROIs$.next({
        widgetId: this.selectedContextImage,
        roiIds: this.currentROIIds,
        scanId: this.visibleScanId,
      });
    }
  }

  onNewROI() {
    this._selectionService.newROIFromSelection();
  }

  onSaveNewROI() {
    let selection = this._selectionService.getCurrentSelection();
    let scanIds = selection.beamSelection.getScanIds();

    scanIds.forEach(scanId => {
      this._roiService.createROI(
        ROIItem.create({
          name: this.newROIName,
          description: this.newROIDescription,
          tags: this.newROITags,
          scanId,
          pixelIndexesEncoded: Array.from(selection.pixelSelection.selectedPixels),
          imageName: selection.pixelSelection.imageName,
          // NOTE: this field changed over time so it's badly named, but we store
          // PMCs in ROIs, not location indexes!!!
          scanEntryIndexesEncoded: Array.from(selection.beamSelection.getSelectedScanEntryPMCs(scanId)),
        })
      );
    });

    this.closeCreateROIMenu();
  }

  onNewTagSelectionChanged(tagIDs: string[]) {
    this.newROITags = tagIDs;
  }

  private closeCreateROIMenu(): void {
    if (this.newROIButton && this.newROIButton instanceof PushButtonComponent) {
      (this.newROIButton as PushButtonComponent).closeDialog();

      this.newROIName = "";
      this.newROIDescription = "";
      this.newROITags = [];
    }
  }

  onROIDetails(roiId: string) {
    this.showDetailsForROIId = roiId;
  }

  onCloseROIDetails() {
    this.showDetailsForROIId = "";
  }
}
