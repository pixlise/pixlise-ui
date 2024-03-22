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

import { Component, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { Colours } from "src/app/utils/colours";
import { MistRoiConvertComponent, MistROIConvertData } from "./mist-roi-convert/mist-roi-convert.component";
import { MistRoiUploadComponent, MistROIUploadData } from "./mist-roi-upload/mist-roi-upload.component";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { ROIItem, ROIItemSummary } from "src/app/generated-protos/roi";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { ROIDisplaySettings } from "src/app/modules/roi/models/roi-region";
import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { WIDGETS } from "src/app/modules/widget/models/widgets.model";
import { ScanItem } from "src/app/generated-protos/scan";

@Component({
  selector: "app-mist-roi",
  templateUrl: "./mist-roi.component.html",
  styleUrls: ["./mist-roi.component.scss"],
})
export class MistROIComponent implements OnInit {
  private _subs = new Subscription();

  private _selectedROIs: ROIItemSummary[] = [];

  mistROIs: ROIItemSummary[] = [];

  displaySettingsMap: Record<string, ROIDisplaySettings> = {};

  allPointsColour = Colours.GRAY_10.asString();

  public expandedIndices: number[] = [];

  private _selectionEmpty: boolean = true;
  roiSearchString: string = "";

  mistROIByScanId: Record<string, Record<string, ROIItemSummary>> = {};

  isAllFullyIdentifiedMistROIsChecked: boolean = false;
  fullyIdentifiedMistROIs: ROIItemSummary[] = [];

  isAllGroupIdentifiedMistROIsChecked: boolean = false;
  groupIdentifiedMistROIs: ROIItemSummary[] = [];

  configuredScans: ScanItem[] = [];
  allScans: ScanItem[] = [];
  private _visibleScanId: string = "";

  layoutWidgets: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
  allContextImages: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
  private _selectedContextImage: string = "";

  constructor(
    private _roiService: ROIService,
    private _userOptionsService: UserOptionsService,
    private _analysisLayoutService: AnalysisLayoutService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.defaultScanId && !this.visibleScanId) {
      this.visibleScanId = this.defaultScanId;
    }

    this._subs.add(
      this._roiService.mistROIsByScanId$.subscribe(mistROIByScanId => {
        this.mistROIByScanId = mistROIByScanId;

        if (this.visibleScanId && mistROIByScanId[this.visibleScanId]) {
          this.filterMistROIs();
        }
      })
    );

    this._subs.add(
      this._roiService.displaySettingsMap$.subscribe(displaySettingsMap => {
        this.displaySettingsMap = displaySettingsMap;
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        if (!this.visibleScanId) {
          this.visibleScanId = this.defaultScanId;
        }
        this.allScans = scans;
        if (this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
        }
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

  get visibleScanId(): string {
    return this._visibleScanId;
  }

  set visibleScanId(scanId: string) {
    this._visibleScanId = scanId;
    this._roiService.listMistROIs(scanId);
    this.filterMistROIs();
  }

  // This is called by the sidepanel component
  onTabClose() {
    this._analysisLayoutService.targetWidgetIds$.next(new Set());
  }

  // This is called by the sidepanel component
  onTabOpen() {
    this._analysisLayoutService.targetWidgetIds$.next(new Set([this.selectedContextImage]));
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
    this._analysisLayoutService.targetWidgetIds$.next(new Set([this.selectedContextImage]));
  }

  get defaultScanId(): string {
    return this._analysisLayoutService.defaultScanId;
  }

  get isPublicUser(): boolean {
    return !this._userOptionsService.hasFeatureAccess("uploadROIs");
  }

  get selectionCount(): number {
    return this._selectedROIs.length;
  }

  get highlightedROIId(): string {
    return this._analysisLayoutService.highlightedROI$.value?.roiId || "";
  }

  onROIVisibleToggle(roi: ROIItemSummary) {
    if (this.highlightedROIId === roi.id) {
      this._analysisLayoutService.highlightedROI$.next({
        widgetId: this.selectedContextImage,
        roiId: "",
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

  filterMistROIs() {
    if (!this.mistROIByScanId[this.visibleScanId]) {
      this.mistROIs = [];
      this.fullyIdentifiedMistROIs = [];
      this.groupIdentifiedMistROIs = [];
      return;
    }

    this.mistROIs = Object.values(this.mistROIByScanId[this.visibleScanId]).sort((roiA, roiB) => roiA.name.localeCompare(roiB.name));

    this.fullyIdentifiedMistROIs = this.mistROIs
      .filter(roi => roi.mistROIItem?.idDepth !== undefined && roi.mistROIItem.idDepth >= 5)
      .sort((roiA, roiB) => (roiB.mistROIItem?.idDepth || 0) - (roiA.mistROIItem?.idDepth || 0));

    this.groupIdentifiedMistROIs = this.mistROIs
      .filter(roi => roi.mistROIItem?.idDepth !== undefined && roi.mistROIItem?.idDepth < 5)
      .sort((roiA, roiB) => (roiB.mistROIItem?.idDepth || 0) - (roiA.mistROIItem?.idDepth || 0));
  }

  onUploadROIs(event: any): void {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.data = new MistROIUploadData(this.visibleScanId, this.configuredScans, this.allScans);
    const dialogRef = this.dialog.open(MistRoiUploadComponent, dialogConfig);

    dialogRef
      .afterClosed()
      .subscribe(
        (response: {
          mistROIs: ROIItem[];
          deleteExisting: boolean;
          overwrite: boolean;
          skipDuplicates: boolean;
          mistROIsByDatasetID: Map<string, ROIItem[]>;
          includesMultipleDatasets: boolean;
          uploadToSubDatasets: boolean;
        }) => {
          if (!response || !response?.mistROIs) {
            return;
          }
        }
      );
  }

  onConvertSelected(): void {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.data = new MistROIConvertData(this._selectedROIs);
    const dialogRef = this.dialog.open(MistRoiConvertComponent, dialogConfig);

    dialogRef.afterClosed().subscribe((response: { ids: string[] }) => {
      if (!response || !response?.ids || response.ids.length === 0) {
        return;
      }

      // Duplicate MIST ROIs as non-ROIs
      this._roiService.duplicateROIs(response.ids, false);
      this.clearSelection();
    });
  }

  onToggleExpand(index: number) {
    if (this.expandedIndices.includes(index)) {
      this.expandedIndices = this.expandedIndices.filter(i => i !== index);
    } else {
      this.expandedIndices.push(index);
    }
  }

  get selectionEmpty(): boolean {
    return this._selectionEmpty;
  }

  get roiSelectionEmpty(): boolean {
    return this._selectedROIs.length === 0;
  }

  toggleFullyIdentifiedMistROIs(event: any) {
    if (this.isAllFullyIdentifiedMistROIsChecked) {
      // Filter out all MIST ROIs with id depth of 5
      this._selectedROIs = this._selectedROIs.filter(roi => roi.mistROIItem?.idDepth !== undefined && roi.mistROIItem.idDepth < 5);
      this.isAllFullyIdentifiedMistROIsChecked = false;
    } else {
      let allFullMistROIs = this.fullyIdentifiedMistROIs.filter(roi => !this._selectedROIs.find(selected => selected.id === roi.id));
      this._selectedROIs = [...this._selectedROIs, ...allFullMistROIs];
      this.isAllFullyIdentifiedMistROIsChecked = true;
    }
  }

  toggleGroupIdentifiedMistROIs(event: any) {
    if (this.isAllGroupIdentifiedMistROIsChecked) {
      this._selectedROIs = this._selectedROIs.filter(roi => (roi.mistROIItem?.idDepth || 0) >= 5);
      this.isAllGroupIdentifiedMistROIsChecked = false;
    } else {
      let allPartialMistROIs = this.groupIdentifiedMistROIs.filter(roi => !this._selectedROIs.find(selected => selected.id === roi.id));
      this._selectedROIs = [...this._selectedROIs, ...allPartialMistROIs];
      this.isAllGroupIdentifiedMistROIsChecked = true;
    }
  }

  checkSelected(region: ROIItemSummary): boolean {
    return this._selectedROIs.findIndex(roi => roi.id === region.id) >= 0;
  }

  onROISelectToggle(region: ROIItemSummary) {
    let isFullyIdentified = region?.mistROIItem?.idDepth || 0 >= 5;
    let isGroupIdentified = region?.mistROIItem?.idDepth != undefined && region?.mistROIItem?.idDepth < 5;

    let existingIndex = this._selectedROIs.findIndex(roi => roi.id === region.id);
    if (existingIndex >= 0) {
      this._selectedROIs = this._selectedROIs.filter((_, i) => i !== existingIndex);
      if (isFullyIdentified) {
        this.isAllFullyIdentifiedMistROIsChecked = false;
      } else if (isGroupIdentified) {
        this.isAllGroupIdentifiedMistROIsChecked = false;
      }
    } else {
      this._selectedROIs = [...this._selectedROIs, region];

      if (isFullyIdentified && this._selectedROIs.length >= this.fullyIdentifiedMistROIs.length) {
        this.isAllFullyIdentifiedMistROIsChecked = this.fullyIdentifiedMistROIs.every(roi => this._selectedROIs.findIndex(selected => selected.id === roi.id) >= 0);
      } else if (isGroupIdentified && this._selectedROIs.length >= this.groupIdentifiedMistROIs.length) {
        this.isAllGroupIdentifiedMistROIsChecked = this.groupIdentifiedMistROIs.every(roi => this._selectedROIs.findIndex(selected => selected.id === roi.id) >= 0);
      }
    }
  }

  clearSelection() {
    this._selectedROIs = [];
    this.isAllFullyIdentifiedMistROIsChecked = false;
    this.isAllGroupIdentifiedMistROIsChecked = false;
  }

  onDeleteSelected() {
    let roiIDs = this.mistROIs.filter(roi => this._selectedROIs.findIndex(selected => selected.id === roi.id) >= 0).map(roi => roi.id);
    roiIDs.forEach(roiID => {
      this._roiService.deleteROI(roiID, true);
    });
    this.mistROIs = this.mistROIs.filter(roi => this._selectedROIs.findIndex(selected => selected.id === roi.id) < 0);
    this.clearSelection();
  }
}
