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
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { PMCDataValues } from "src/app/expression-language/data-values";
import { DetectedDiffractionPeakStatuses, DetectedDiffractionPerLocation, ManualDiffractionPeak } from "src/app/generated-protos/diffraction-data";
import { ScanEntryRange, ScanItem } from "src/app/generated-protos/scan";
import { ScanEntryReq } from "src/app/generated-protos/scan-entry-msgs";
import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { MinMax } from "src/app/models/BasicTypes";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
// import { HistogramInteraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction-tab-old/interaction";
// import { HistogramInteraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction-tab-old/interaction";
import { DiffractionHistogramDrawer } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/drawer";
import { HistogramInteraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/interaction";
import { DiffractionHistogramModel, HistogramSelectionOwner } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/model";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { ActionButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/action-button/action-button.component";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { ExpressionDataSource } from "src/app/modules/pixlisecore/models/expression-data-source";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { HistogramDrawer } from "src/app/modules/scatterplots/widgets/histogram-widget/histogram-drawer";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { DiffractionPeakMapPerLocation, DiffractionService } from "src/app/modules/spectrum/services/diffraction.service";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { WIDGETS } from "src/app/modules/widget/models/widgets.model";
import { encodeIndexList } from "src/app/utils/utils";

@Component({
  selector: "diffraction",
  templateUrl: "./diffraction.component.html",
  styleUrls: ["./diffraction.component.scss"],
})
export class DiffractionTabComponent implements OnInit, HistogramSelectionOwner {
  public static readonly tableRowLimit = 100;

  @ViewChild("newPeakDialogBtn") newPeakDialogBtn!: ElementRef;

  private _subs = new Subscription();

  layoutWidgets: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];

  allContextImages: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
  private _selectedContextImage: string = "";

  allSpectrumCharts: { widget: WidgetLayoutConfiguration; name: string; type: string }[] = [];
  private _selectedSpectrumChart: string = "";

  private _selectedScanId: string = "";
  public selectedScan: ScanItem = ScanItem.create();
  allScans: ScanItem[] = [];
  configuredScans: ScanItem[] = [];

  drawer: CanvasDrawer;
  private _histogramMdl: DiffractionHistogramModel;
  transform: PanZoom = new PanZoom();
  interaction: HistogramInteraction;

  isMapShown: boolean = false;

  canSaveExpression: boolean = false;

  newPeakPMC: number = 0;
  newPeakEnergy: number = 0;

  selectedPeakTrackId: string = "";

  peakStatusesPerScan: Map<string, DetectedDiffractionPeakStatuses> = new Map();
  peakStatuses: DetectedDiffractionPeakStatuses = DetectedDiffractionPeakStatuses.create();

  detectedPeaksPerScan: Map<string, DiffractionPeakMapPerLocation> = new Map();
  peaks: DiffractionPeak[] = [];
  filteredPeaks: DiffractionPeak[] = [];

  manualPeaksPerScan: Map<string, ManualDiffractionPeak[]> = new Map();
  userPeaks: ManualDiffractionPeak[] = [];
  filteredUserPeaks: ManualDiffractionPeak[] = [];

  userPeaksListOpen: boolean = false;
  userPeakEditing: boolean = false;

  visiblePeakId: string = "";
  private _barSelected: boolean[] = [];
  private _barSelectedCount: number = 0;

  detectPeaksListOpen: boolean = false;

  detectedPeaksLabel: string = "Detected Peaks";
  userPeaksLabel: string = "User Entered Peaks";

  activeList: string = "Detected Peaks";

  sortModeEffectSize = "Effect Size";
  sortModekeV = "Energy keV";
  sortModePMC = "PMC";

  regularDiffractionPeakLabel = DiffractionPeak.diffractionPeak;
  statusToLabelMap: Record<string, string> = {
    [DiffractionPeak.diffractionPeak]: this.detectedPeaksLabel,
    [DiffractionPeak.statusNotAnomaly]: "Invalid Detection",
    [DiffractionPeak.statusUnspecified]: this.userPeaksLabel,
  };
  allDetectedStatuses: string[] = [DiffractionPeak.statusNotAnomaly, DiffractionPeak.diffractionPeak];
  visibleDetectedStatuses: string[] = [DiffractionPeak.diffractionPeak];

  allUserStatuses: string[] = [DiffractionPeak.statusNotAnomaly, DiffractionPeak.statusUnspecified];
  visibleUserStatuses: string[] = [DiffractionPeak.statusUnspecified];

  private _sortCriteria: string = this.sortModeEffectSize;
  private _sortAscending: boolean = false;

  private _tablePage: number = 0;
  hasMultiPages: boolean = false;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _energyCalibrationService: EnergyCalibrationService,
    private _cachedDataService: APICachedDataService,
    private _selectionService: SelectionService,
    private _diffractionService: DiffractionService,
    private _userOptionsService: UserOptionsService,
    public dialog: MatDialog
  ) {
    this._histogramMdl = new DiffractionHistogramModel(this);
    this.drawer = new DiffractionHistogramDrawer(this._histogramMdl);
    this.interaction = new HistogramInteraction(this._histogramMdl);
  }

  ngOnInit(): void {
    this.userPeakEditing = this._userOptionsService.hasFeatureAccess("editDiffractionPeak");

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

          this.allSpectrumCharts = this.layoutWidgets.filter(widget => widget.type === "spectrum-chart");
          this.selectedSpectrumChart = this.allSpectrumCharts[0].widget.id;
        }
      })
    );

    this._subs.add(
      this._analysisLayoutService.availableScans$.subscribe(scans => {
        this.allScans = scans;
        if (!this.selectedScanId && scans.length > 0) {
          this.selectedScanId = this._analysisLayoutService.defaultScanId || scans[0].id;
        }

        if (this._analysisLayoutService.activeScreenConfiguration$.value) {
          this.configuredScans = scans.filter(scan => this._analysisLayoutService.activeScreenConfiguration$.value?.scanConfigurations[scan.id]);
        } else {
          this.configuredScans = scans;
        }
      })
    );

    this._subs.add(
      this._diffractionService.manualPeaksPerScan$.subscribe(peaksPerScan => {
        this.manualPeaksPerScan = peaksPerScan;
        if (this.selectedScanId) {
          this.userPeaks = peaksPerScan.get(this.selectedScanId) || [];
          this.updateDisplayList();
        }
      })
    );

    this._subs.add(
      this._diffractionService.detectedPeaksPerScan$.subscribe(peaksPerScan => {
        this.detectedPeaksPerScan = peaksPerScan;
        if (this.selectedScanId) {
          this.updateDisplayList();
        }
      })
    );

    this._subs.add(
      this._diffractionService.diffractionPeaksStatuses$.subscribe(peakStatusesPerScan => {
        this.peakStatusesPerScan = peakStatusesPerScan;
        if (this.selectedScanId) {
          this.peakStatuses = peakStatusesPerScan.get(this.selectedScanId) || DetectedDiffractionPeakStatuses.create();
          this.updateDisplayList();
        }
      })
    );
  }

  trackByPeakId(index: number, item: DiffractionPeak): string {
    return `${item.pmc}-${item.id}-${item.keV}-${item.channel}`;
  }

  trackByUserId(index: number, item: ManualDiffractionPeak): string {
    return `${item.energykeV}-${item.pmc}-${item.id}`;
  }

  onSwitchList(list: string) {
    this.activeList = list;
    this.updateDisplayList();
  }

  get selectedContextImage(): string {
    return this._selectedContextImage;
  }

  set selectedContextImage(value: string) {
    this._selectedContextImage = value;
  }

  get selectedSpectrumChart(): string {
    return this._selectedSpectrumChart;
  }

  set selectedSpectrumChart(value: string) {
    this._selectedSpectrumChart = value;
    this._analysisLayoutService.highlightedDiffractionWidget$.next(null);
    this.selectedPeakTrackId = "";
  }

  hoverChartSelection(id: string) {
    this._analysisLayoutService.highlightedWidgetId$.next(id);
  }

  get visiblePeaks(): (DiffractionPeak | ManualDiffractionPeak)[] {
    return this.activeList === "User Entered Peaks" ? this.filteredUserPeaks : this.filteredPeaks;
  }

  get selectedScanId() {
    return this._selectedScanId;
  }

  onToggleDetectedPeakStatus(peak: DiffractionPeak) {
    let status = peak.status === DiffractionPeak.statusNotAnomaly ? DiffractionPeak.diffractionPeak : DiffractionPeak.statusNotAnomaly;
    this._diffractionService.addPeakStatus(this._selectedScanId, peak.id, status);
    let matchedPeak = this.peaks.find(existingPeak => existingPeak.id === peak.id);
    if (matchedPeak) {
      matchedPeak.status = status;
      this.updateDisplayList();
    }
  }

  onToggleDetectedStatus(status: string) {
    if (this.visibleDetectedStatuses.includes(status)) {
      this.visibleDetectedStatuses = this.visibleDetectedStatuses.filter(detectedStatus => detectedStatus !== status);
    } else {
      this.visibleDetectedStatuses.push(status);
    }

    this.updateDisplayList();
  }

  onToggleUserStatus(status: string) {
    if (this.visibleUserStatuses.includes(status)) {
      this.visibleUserStatuses = this.visibleUserStatuses.filter(userStatus => userStatus !== status);
    } else {
      this.visibleUserStatuses.push(status);
    }
  }

  set selectedScanId(value: string) {
    this._selectedScanId = value;
    this.selectedScan = this.allScans.find(scan => scan.id === value) || ScanItem.create();

    this._diffractionService.fetchManualPeaksForScan(this._selectedScanId);
    this._diffractionService.fetchPeakStatusesForScan(this._selectedScanId);

    this._subs.add(
      this._energyCalibrationService.getCurrentCalibration(this.selectedScanId).subscribe(calibration => {
        let dataSource = new ExpressionDataSource();
        dataSource
          .prepare(
            this._cachedDataService,
            this.selectedScanId,
            this._analysisLayoutService.getQuantIdForScan(this.selectedScanId),
            PredefinedROIID.getAllPointsForScan(this.selectedScanId),
            calibration
          )
          .subscribe(() => {
            dataSource.getDiffractionPeakEffectData(-1, -1).then((data: PMCDataValues) => {
              this.peaks = dataSource.allPeaks;
              this.updateDisplayList();
            });
          });
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onResetBarSelection() {}

  onShowMap() {
    this.isMapShown = !this.isMapShown;
  }

  onSelectPMCsWithDiffraction() {}

  onSaveAsExpressionMap() {}

  onToggleUserPeaksListOpen() {
    this.userPeaksListOpen = !this.userPeaksListOpen;
  }

  onCloseNewPeakDialog() {
    if (this.newPeakDialogBtn && this.newPeakDialogBtn instanceof ActionButtonComponent) {
      (this.newPeakDialogBtn as ActionButtonComponent).closeDialog();
      this.newPeakPMC = 0;
      this.newPeakEnergy = 0;
    }
  }

  onAddPeak() {
    if (this.newPeakPMC >= 0 && this.newPeakEnergy > 0) {
      this._diffractionService.addManualPeak(this._selectedScanId, this.newPeakEnergy, this.newPeakPMC);
      this.updateDisplayList();
      this.onCloseNewPeakDialog();
    }
  }

  onClickManualPeakItem(peak: ManualDiffractionPeak) {}

  onClickPeakItem(peak: DiffractionPeak) {}

  onToggleManualPeakVisible(peak: ManualDiffractionPeak) {}

  onTogglePeakVisible(peak: DiffractionPeak) {
    let trackId = this.trackByPeakId(0, peak);
    if (this.selectedPeakTrackId === trackId) {
      this.selectedPeakTrackId = "";
      this._selectionService.setSelection(BeamSelection.makeEmptySelection(), PixelSelection.makeEmptySelection());
      this._selectionService.clearHoverEntry();
      this._analysisLayoutService.highlightedDiffractionWidget$.next(null);
      return;
    }

    let singlePMCSelection = new Map<string, Set<number>>([[this._selectedScanId, new Set([peak.pmc])]]);
    this._selectionService.setSelection(BeamSelection.makeSelectionFromScanEntryPMCSets(singlePMCSelection), PixelSelection.makeEmptySelection());
    this._selectionService.setHoverEntryPMC(this._selectedScanId, peak.pmc);
    this.selectedPeakTrackId = this.trackByPeakId(0, peak);

    this._analysisLayoutService.highlightedDiffractionWidget$.next({
      widgetId: this.selectedSpectrumChart,
      peaks: [peak],
      keVStart: peak.kevStart,
      keVEnd: peak.kevEnd,
    });
  }

  onToggleUserPeakVisible(peak: ManualDiffractionPeak) {
    let trackId = this.trackByUserId(0, peak);
    if (this.selectedPeakTrackId === trackId) {
      this.selectedPeakTrackId = "";
      this._selectionService.setSelection(BeamSelection.makeEmptySelection(), PixelSelection.makeEmptySelection());
      this._selectionService.clearHoverEntry();
      this._analysisLayoutService.highlightedDiffractionWidget$.next(null);
      return;
    }

    let singlePMCSelection = new Map<string, Set<number>>([[this._selectedScanId, new Set([peak.pmc])]]);
    this._selectionService.setSelection(BeamSelection.makeSelectionFromScanEntryPMCSets(singlePMCSelection), PixelSelection.makeEmptySelection());
    this._selectionService.setHoverEntryPMC(this._selectedScanId, peak.pmc);
    this.selectedPeakTrackId = trackId;

    let diffractionPeak = new DiffractionPeak(
      peak.pmc,
      0,
      0,
      0,
      0,
      0,
      "",
      0,
      peak.energykeV,
      peak.energykeV - 0.1,
      peak.energykeV + 0.1,
      DiffractionPeak.statusUnspecified,
      peak.id
    );

    this._analysisLayoutService.highlightedDiffractionWidget$.next({
      widgetId: this.selectedSpectrumChart,
      peaks: [diffractionPeak],
      keVStart: diffractionPeak.kevStart,
      keVEnd: diffractionPeak.kevEnd,
    });
  }

  onDeleteUserPeak(peak: ManualDiffractionPeak) {
    this._diffractionService.deleteManualPeak(this._selectedScanId, peak.id);
  }

  onDeleteDetectedPeak(peak: DiffractionPeak) {}

  onToggleDetectPeaksListOpen() {
    this.detectPeaksListOpen = !this.detectPeaksListOpen;
  }

  get mdl(): DiffractionHistogramModel {
    return this._histogramMdl;
  }

  get isAscending(): boolean {
    return this._sortAscending;
  }

  get sort(): string {
    return this._sortCriteria;
  }

  set sort(criteria: string) {
    if (criteria === this._sortCriteria) {
      // Same column, user is just changing sort order
      this._sortAscending = !this._sortAscending;
    } else {
      this._sortCriteria = criteria;
      this._sortAscending = true;
    }

    this.updateDisplayList();
  }

  get cursorShown(): string {
    if (!this._histogramMdl) {
      return CursorId.defaultPointer;
    }
    return this._histogramMdl.cursorShown;
  }

  sortDetectedPeaks() {
    let peaksCopy = this.peaks.slice().filter(peak => this.visibleDetectedStatuses.includes(peak.status));
    setTimeout(() => {
      this.filteredPeaks = peaksCopy.sort((a: DiffractionPeak, b: DiffractionPeak) => {
        let aValue = a.channel;
        let bValue = b.channel;

        if (this._sortCriteria === this.sortModeEffectSize) {
          aValue = a.effectSize;
          bValue = b.effectSize;
        } else if (this._sortCriteria === this.sortModePMC) {
          aValue = a.pmc;
          bValue = b.pmc;
        } else if (this._sortCriteria === this.sortModekeV) {
          aValue = a.keV;
          bValue = b.keV;
        }

        return this._sortAscending ? aValue - bValue : bValue - aValue;
      });
    }, 0);
  }

  sortUserPeaks() {
    let peaksCopy = this.userPeaks.slice();
    setTimeout(() => {
      this.filteredUserPeaks = peaksCopy.sort((a: ManualDiffractionPeak, b: ManualDiffractionPeak) => {
        let aValue = a.pmc;
        let bValue = b.pmc;

        if (this._sortCriteria === this.sortModekeV) {
          aValue = a.energykeV;
          bValue = b.energykeV;
        }

        return this._sortAscending ? aValue - bValue : bValue - aValue;
      });
    }, 0);
  }

  private updateDisplayList() {
    if (this.activeList === "User Entered Peaks") {
      this.sortUserPeaks();
    } else {
      this.sortDetectedPeaks();
    }
  }

  setkeVRangeSelected(keVRange: MinMax, selected: boolean, complete: boolean) {
    // // If they're ALL selected, unselect them first because the user is doing something specific here
    // if (this._barSelectedCount == this._barSelected.length) {
    //   for (let c = 0; c < this._barSelected.length; c++) {
    //     this._barSelected[c] = false;
    //   }
    //   this._barSelectedCount = 0;
    //   selected = true; // we're forcing it to select this one!
    // }
    // // If we've just unselected the last bar...
    // if (this._barSelectedCount <= 1) {
    //   selected = true; // Force this one to select
    // }
    // let keVMin = keVRange.min || 0;
    // let keVMax = keVRange.max || 0;
    // let mid = (keVMin + keVMax) / 2;
    // let idx = this.getBarIdx(mid);
    // if (idx <= this._barSelected.length) {
    //   this._barSelected[idx] = selected;
    // }
    // // Don't force it to rebuild everything as the user is interacting/dragging, only do this when we are told it's complete!
    // if (complete) {
    //   // Count how many are selected (controls if we have svae as expression map button enabled)
    //   this._barSelectedCount = 0;
    //   for (let sel of this._barSelected) {
    //     if (sel) {
    //       this._barSelectedCount++;
    //     }
    //   }
    //   this.updateDisplayList();
    //   // Also tell the expression service so diffraction count map is up to date with user selection
    //   let exprData = this.formExpressionForSelection();
    //   if (exprData.length == 3) {
    //     // TODO:
    //     // this._exprService.setDiffractionCountExpression(exprData[1], exprData[0]);
    //   }
    // }
    // if (selected) {
    //   // Something was selected, show the list
    //   this.detectPeaksListOpen = true;
    // }
  }

  iskeVRangeSelected(keVMidpoint: number): boolean {
    // // check flags
    // let idx = this.getBarIdx(keVMidpoint);
    // if (idx < this._barSelected.length) {
    //   return this._barSelected[idx];
    // }
    return false;
  }

  selectedRangeCount(): number {
    return this._barSelectedCount;
  }
}
