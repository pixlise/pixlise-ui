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

import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { ScanItem } from "src/app/generated-protos/scan";
import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { PushButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/push-button/push-button.component";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { NewROIDialogComponent, NewROIDialogData } from "src/app/modules/roi/components/new-roi-dialog/new-roi-dialog.component";
import { ROIDisplaySettings } from "src/app/modules/roi/models/roi-region";
import { ROISearchFilter } from "src/app/modules/roi/models/roi-search";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { WIDGETS } from "src/app/modules/widget/models/widgets.model";
import { Colours } from "src/app/utils/colours";

export type HighlightedROI = {
  widgetId: string;
  roiId: string;
  scanId: string;
};

@Component({
  selector: "roi-tab",
  templateUrl: "./roi-tab.component.html",
  styleUrls: ["./roi-tab.component.scss"],
})
export class ROITabComponent implements OnInit {
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

  layoutWidgets: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
  allContextImages: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
  private _selectedContextImage: string = "";

  constructor(
    private _roiService: ROIService,
    private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
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
      this._analysisLayoutService.activeScreenConfiguration$.subscribe(config => {
        if (config) {
          let widgetReferences: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
          config.layouts.forEach((layout, i) => {
            let widgetCounts: Record<string, number> = {};
            layout.widgets.forEach((widget, widgetIndex) => {
              if (widgetCounts[widget.type]) {
                widgetCounts[widget.type]++;
              } else {
                widgetCounts[widget.type] = 1;
              }

              let widgetTypeName = WIDGETS[widget.type as keyof typeof WIDGETS].name;
              let widgetName = `${widgetTypeName} ${widgetCounts[widget.type]}${i > 0 ? ` (page ${i + 1})` : ""}`;

              widgetReferences.push({ widget, name: widgetName, type: widget.type });
            });
          });

          this.layoutWidgets = widgetReferences;

          this.allContextImages = this.layoutWidgets.filter(widget => widget.type === "context-image");
          this.selectedContextImage = this.allContextImages[0].widget.id;
        }
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  get selectedContextImage(): string {
    return this._selectedContextImage;
  }

  set selectedContextImage(widgetId: string) {
    // If the ROI is highlighted, update the widgetId
    if (this._analysisLayoutService.highlightedROI$.value?.widgetId === this._selectedContextImage) {
      this._analysisLayoutService.highlightedROI$.next({
        widgetId,
        roiId: this._analysisLayoutService.highlightedROI$.value?.roiId,
        scanId: this.visibleScanId,
      });
    }
    this._selectedContextImage = widgetId;
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
    return true;
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

  get highlightedROIId(): string {
    return this._analysisLayoutService.highlightedROI$.value?.roiId || "";
  }

  onROIVisibleToggle(roi: ROIItemSummary) {
    if (
      roi.id === this._analysisLayoutService.highlightedROI$.value?.roiId &&
      this.selectedContextImage === this._analysisLayoutService.highlightedROI$.value?.widgetId
    ) {
      this._analysisLayoutService.highlightedROI$.next({
        widgetId: this.selectedContextImage,
        roiId: "", // Clear the highlighted ROI
        scanId: this.visibleScanId,
      });
    } else {
      this._analysisLayoutService.highlightedROI$.next({
        widgetId: this.selectedContextImage,
        roiId: roi.id,
        scanId: this.visibleScanId,
      });
    }
  }

  onNewROI() {
    const dialogConfig = new MatDialogConfig<NewROIDialogData>();
    dialogConfig.data = {
      defaultScanId: this._visibleScanId,
    };

    let dialogRef = this.dialog.open(NewROIDialogComponent, dialogConfig);
    dialogRef.afterClosed().subscribe((created: boolean) => {
      if (created) {
        this._selectionService.clearSelection();
      }
    });
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
}
