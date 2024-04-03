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
import { forkJoin, mergeMap, Subscription, map, switchMap } from "rxjs";
import { DataExpressionId } from "src/app/expression-language/expression-id";
import { EXPR_LANGUAGE_PIXLANG } from "src/app/expression-language/expression-language";
import { DetectedDiffractionPeakStatuses, ManualDiffractionPeak } from "src/app/generated-protos/diffraction-data";
import { DataExpression } from "src/app/generated-protos/expressions";
import { ScanItem } from "src/app/generated-protos/scan";
import { WidgetLayoutConfiguration } from "src/app/generated-protos/screen-configuration";
import { MinMax, SpectrumEnergyCalibration } from "src/app/models/BasicTypes";
import { PredefinedROIID } from "src/app/models/RegionOfInterest";
import { DiffractionHistogramDrawer } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/drawer";
import { HistogramInteraction } from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/interaction";
import {
  DiffractionHistogramModel,
  HistogramBar,
  HistogramData,
  HistogramSelectionOwner,
} from "src/app/modules/analysis/components/analysis-sidepanel/tabs/diffraction/model";
import { AnalysisLayoutService } from "src/app/modules/analysis/services/analysis-layout.service";
import { ExpressionsService } from "src/app/modules/expressions/services/expressions.service";
import { ActionButtonComponent } from "src/app/modules/pixlisecore/components/atoms/buttons/action-button/action-button.component";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { DiffractionPeak } from "src/app/modules/pixlisecore/models/diffraction";
import { ExpressionDataSource } from "src/app/modules/pixlisecore/models/expression-data-source";
import { PixelSelection } from "src/app/modules/pixlisecore/models/pixel-selection";
import { SelectionService, SnackbarService, WidgetDataService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { EnergyCalibrationService } from "src/app/modules/pixlisecore/services/energy-calibration.service";
import { UserOptionsService } from "src/app/modules/settings/services/user-options.service";
import { DiffractionPeakMapPerLocation, DiffractionService } from "src/app/modules/spectrum/services/diffraction.service";
import { CursorId } from "src/app/modules/widget/components/interactive-canvas/cursor-id";
import { CanvasDrawer } from "src/app/modules/widget/components/interactive-canvas/interactive-canvas.component";
import { PanZoom } from "src/app/modules/widget/components/interactive-canvas/pan-zoom";
import { WIDGETS } from "src/app/modules/widget/models/widgets.model";
import { Colours } from "src/app/utils/colours";

export type DiffractionExpressionResponse = {
  title?: string;
  expression?: string;
  description?: string;
  error?: string;
};

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

  private _allPeakskeVRange: MinMax = new MinMax(0, 0);
  private _currentCalibrations: SpectrumEnergyCalibration[] | null = null;

  detectedPeaksPerScan: Map<string, DiffractionPeakMapPerLocation> = new Map();
  peaks: DiffractionPeak[] = [];
  filteredPeaks: DiffractionPeak[] = [];

  manualPeaksPerScan: Map<string, ManualDiffractionPeak[]> = new Map();
  userPeaks: ManualDiffractionPeak[] = [];
  filteredUserPeaks: ManualDiffractionPeak[] = [];

  userPeaksListOpen: boolean = false;
  userPeakEditing: boolean = false;

  loading: boolean = false;

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

  hasMultiPages: boolean = false;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _energyCalibrationService: EnergyCalibrationService,
    private _cachedDataService: APICachedDataService,
    private _selectionService: SelectionService,
    private _diffractionService: DiffractionService,
    private _userOptionsService: UserOptionsService,
    private _widgetDataService: WidgetDataService,
    private _expressionsService: ExpressionsService,
    private _snackbarService: SnackbarService,
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
          if (this.allContextImages.length > 0) {
            this.selectedContextImage = this.allContextImages[0].widget.id;
          } else {
            this.selectedContextImage = "";
          }

          this.allSpectrumCharts = this.layoutWidgets.filter(widget => widget.type === "spectrum-chart");
          if (this.allSpectrumCharts.length > 0) {
            this.selectedSpectrumChart = this.allSpectrumCharts[0].widget.id;
          } else {
            this.selectedSpectrumChart = "";
          }
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
          this.updateRange();
        }
      })
    );

    this._subs.add(
      this._diffractionService.diffractionPeaksStatuses$.subscribe(peakStatusesPerScan => {
        this.peakStatusesPerScan = peakStatusesPerScan;
        if (this.selectedScanId) {
          this.peakStatuses = peakStatusesPerScan.get(this.selectedScanId) || DetectedDiffractionPeakStatuses.create();
          this.updateDisplayList();
          this.updateRange();
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
    this.updateRange();
  }

  updateRange() {
    this._allPeakskeVRange = new MinMax(0, 0);
    for (let peak of this.peaks) {
      this._allPeakskeVRange.expand(peak.keV);
    }

    for (let peak of this.userPeaks) {
      this._allPeakskeVRange.expand(peak.energykeV);
    }

    let barCount = Math.ceil((this._allPeakskeVRange.max! / DiffractionHistogramModel.keVBinWidth) * 1.1);
    if (this._barSelected.length !== barCount) {
      this._barSelected = Array(barCount).fill(false);
    }

    this.onResetBarSelection();
  }

  // This is called by the sidepanel component
  onTabClose() {
    this._analysisLayoutService.targetWidgetIds$.next(new Set());
  }

  // This is called by the sidepanel component
  onTabOpen() {
    this._analysisLayoutService.targetWidgetIds$.next(new Set([this.selectedContextImage, this.selectedSpectrumChart]));
  }

  get selectedContextImage(): string {
    return this._selectedContextImage;
  }

  set selectedContextImage(value: string) {
    this._selectedContextImage = value;
    this._analysisLayoutService.targetWidgetIds$.next(new Set([this.selectedContextImage, this.selectedSpectrumChart]));
  }

  get selectedSpectrumChart(): string {
    return this._selectedSpectrumChart;
  }

  set selectedSpectrumChart(value: string) {
    this._selectedSpectrumChart = value;
    this._analysisLayoutService.highlightedDiffractionWidget$.next(null);
    this.selectedPeakTrackId = "";
    this._analysisLayoutService.targetWidgetIds$.next(new Set([this.selectedContextImage, this.selectedSpectrumChart]));
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

    this.fetchDiffractionData(this._selectedScanId);
  }

  private fetchDiffractionData(scanId: string) {
    this.loading = true;
    const fetchManualPeaks$ = this._diffractionService.fetchManualPeaksForScanAsync(scanId);
    const fetchPeakStatuses$ = this._diffractionService.fetchPeakStatusesForScanAsync(scanId);
    const getCurrentCalibration$ = this._energyCalibrationService.getCurrentCalibration(scanId);
    forkJoin({
      manualPeaks: fetchManualPeaks$,
      peakStatuses: fetchPeakStatuses$,
      currentCalibrations: getCurrentCalibration$,
    })
      .pipe(
        mergeMap(({ currentCalibrations }) => {
          this._currentCalibrations = currentCalibrations;
          const dataSource = new ExpressionDataSource();
          return dataSource
            .prepare(
              this._cachedDataService,
              scanId,
              this._analysisLayoutService.getQuantIdForScan(scanId),
              PredefinedROIID.getAllPointsForScan(scanId),
              currentCalibrations
            )
            .pipe(
              switchMap(() => dataSource.getDiffractionPeakEffectData(-1, -1)),
              map(() => dataSource)
            );
        })
      )
      .subscribe({
        next: dataSource => {
          this.peaks = dataSource.allPeaks;
          this.loading = false;
          this.updateDisplayList();
          this.updateRange();
        },
        error: err => {
          this._snackbarService.openError("Error fetching diffraction data", err);
          console.error("Error fetching diffraction data", err);
          this.loading = false;
        },
      });
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  onResetBarSelection() {
    this._barSelected.fill(true);
    this._barSelectedCount = this._barSelected.length;

    this.updateDisplayList();
    this.mdl.needsDraw$.next();

    this.runExpression({ title: "All Diffraction Peaks", expression: "diffractionPeaks(0,4096)", description: "All diffraction peaks" }, this.isMapShown);
  }

  runExpression(formedExpression: DiffractionExpressionResponse, updateContextImage: boolean = true) {
    let expression = DataExpression.create({
      id: DataExpressionId.makePredefinedDiffractionCountDataExpression(this._selectedScanId),
      name: formedExpression.title,
      sourceCode: formedExpression.expression,
      sourceLanguage: EXPR_LANGUAGE_PIXLANG,
      comments: formedExpression.description,
    });

    this._widgetDataService
      .runExpression(
        expression,
        this._selectedScanId,
        this._analysisLayoutService.getQuantIdForScan(this._selectedScanId),
        PredefinedROIID.getAllPointsForScan(this._selectedScanId),
        false,
        true
      )
      .subscribe(response => {
        if (updateContextImage) {
          this._analysisLayoutService.highlightedContextImageDiffractionWidget$.next({
            widgetId: this.selectedContextImage,
            result: response,
          });
        }
      });
  }

  onShowMap() {
    this.isMapShown = !this.isMapShown;

    if (this.isMapShown) {
      let exprData = this.formExpressionForSelection();
      if (exprData.error) {
        console.error("Error forming expression for selection: " + exprData.error);
        this.canSaveExpression = false;
      } else {
        this.canSaveExpression = true;
        this.runExpression(exprData);
      }
    } else {
      this._analysisLayoutService.highlightedContextImageDiffractionWidget$.next({
        widgetId: this.selectedContextImage,
        result: null,
      });
    }
  }

  onSelectPMCsWithDiffraction() {
    let detectedPMCs = this.filteredPeaks.map(peak => peak.pmc);
    let userPMCs = this.filteredUserPeaks.map(peak => peak.pmc);

    let pmcSelection = new Map<string, Set<number>>([[this._selectedScanId, new Set([...detectedPMCs, ...userPMCs])]]);
    this._selectionService.setSelection(BeamSelection.makeSelectionFromScanEntryPMCSets(pmcSelection), PixelSelection.makeEmptySelection());
  }

  onSaveAsExpressionMap() {
    let exprData = this.formExpressionForSelection(true);
    if (exprData.error) {
      console.error("Error forming expression for selection: " + exprData.error);
      this.canSaveExpression = false;
    } else {
      this.canSaveExpression = true;
      this.runExpression(exprData, false);

      let expression = DataExpression.create({
        name: exprData.title,
        sourceCode: exprData.expression,
        sourceLanguage: EXPR_LANGUAGE_PIXLANG,
        comments: exprData.description,
        tags: [],
      });

      this._expressionsService.writeExpression(expression);
    }
  }

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
    let peaksCopy = this.peaks.slice().filter(peak => {
      if (!this.visibleDetectedStatuses.includes(peak.status)) {
        return false;
      }

      return this.iskeVRangeSelected(peak.keV);
    });
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
    let peaksCopy = this.userPeaks.slice().filter(peak => peak.energykeV >= 0 && this.iskeVRangeSelected(peak.energykeV));
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

  private updateHistogram() {
    let err = "";
    if (this._allPeakskeVRange.min == this._allPeakskeVRange.max && this._allPeakskeVRange.min == 0) {
      // We didn't get keV values because there is no spectrum calibration available. Complain at this point
      err = "Failed to get calibration from spectrum";
    }

    let binnedBykeV: number[] = [];
    let bars: HistogramBar[] = [];
    let countRange = new MinMax();

    if (!err && this._allPeakskeVRange.max) {
      binnedBykeV = Array(Math.ceil((this._allPeakskeVRange.max / DiffractionHistogramModel.keVBinWidth) * 1.1)).fill(0);
      for (let peak of this.peaks) {
        if (peak.status != DiffractionPeak.statusNotAnomaly) {
          let binIdx = Math.floor(peak.keV / DiffractionHistogramModel.keVBinWidth);
          binnedBykeV[binIdx]++;
        }
      }

      for (let peak of this.userPeaks) {
        let binIdx = Math.floor(peak.energykeV / DiffractionHistogramModel.keVBinWidth);
        binnedBykeV[binIdx]++;
      }

      for (let c = 0; c < binnedBykeV.length; c++) {
        let keVStart = c * DiffractionHistogramModel.keVBinWidth;
        let colour = Colours.GRAY_70;
        bars.push(new HistogramBar(colour, binnedBykeV[c], keVStart));
        countRange.expand(binnedBykeV[c]);
      }
    }

    this._histogramMdl = new DiffractionHistogramModel(this);

    // Make raw data structure
    this._histogramMdl.raw = new HistogramData(bars, countRange, err);

    // Set up the rest
    this.drawer = new DiffractionHistogramDrawer(this.mdl);
    this.interaction = new HistogramInteraction(this.mdl);

    this.mdl.needsDraw$.next();
  }

  private updateDisplayList() {
    this.sortUserPeaks();
    this.sortDetectedPeaks();

    this.updateHistogram();
  }

  setkeVRangeSelected(keVRange: MinMax, selected: boolean, complete: boolean) {
    // If they're ALL selected, unselect them first because the user is doing something specific here
    if (this._barSelectedCount == this._barSelected.length) {
      for (let c = 0; c < this._barSelected.length; c++) {
        this._barSelected[c] = false;
      }
      this._barSelectedCount = 0;
      selected = true; // we're forcing it to select this one!
    }
    // If we've just unselected the last bar...
    if (this._barSelectedCount <= 1) {
      selected = true; // Force this one to select
    }
    let keVMin = keVRange.min || 0;
    let keVMax = keVRange.max || 0;
    let mid = (keVMin + keVMax) / 2;
    let idx = this.getBarIdx(mid);
    if (idx <= this._barSelected.length) {
      this._barSelected[idx] = selected;
    }
    // Don't force it to rebuild everything as the user is interacting/dragging, only do this when we are told it's complete!
    if (complete) {
      // Count how many are selected (controls if we have svae as expression map button enabled)
      this._barSelectedCount = 0;
      for (let sel of this._barSelected) {
        if (sel) {
          this._barSelectedCount++;
        }
      }
      this.updateDisplayList();
      // // Also tell the expression service so diffraction count map is up to date with user selection
      let exprData = this.formExpressionForSelection();
      if (exprData.error) {
        console.error("Error forming expression for selection: " + exprData.error);
        this.canSaveExpression = false;
      } else {
        this.canSaveExpression = true;
        if (this.isMapShown) {
          this.runExpression(exprData);
        }
      }
    }
  }

  private keVToChannel(keV: number, detector: string): number | null {
    if (!this._currentCalibrations) {
      return null;
    }

    const cal = this._currentCalibrations.find(cal => cal.detector === detector);
    if (!cal) {
      return null;
    }

    return cal.keVsToChannel([keV])[0];
  }

  // If success, returns 3 strings: First item is the name, then expression, then description
  // If fail, returns 1 string, which is the error
  private formExpressionForSelection(isBeingSaved: boolean = false): DiffractionExpressionResponse {
    // Take the selected keV values and form an expression map
    if (this._barSelectedCount <= 0) {
      return { error: "No keV ranges selected on diffraction peak histogram!" };
    }

    if (!this._currentCalibrations) {
      return { error: "Failed to get spectrum chart calibration - is it set to show channels?" };
    }

    let expr = "";
    let rangeText = "";
    let rangeMinMax = new MinMax();

    for (let c = 0; c < this._barSelected.length; c++) {
      if (!this._barSelected[c]) {
        continue;
      }

      let range = new MinMax(c * DiffractionHistogramModel.keVBinWidth, (c + 1) * DiffractionHistogramModel.keVBinWidth);

      if (expr.length > 0) {
        expr += "+";
        rangeText += ", ";
      }

      // Here we convert the keV range to channels using the spectrum charts calibration

      expr += "diffractionPeaks(" + this.keVToChannel(range.min!, "A") + "," + this.keVToChannel(range.max!, "A") + ")";

      rangeMinMax.expand(range.min!);
      rangeMinMax.expand(range.max!);

      rangeText += range.min + "-" + range.max;
    }

    let title = "Diffraction peaks (" + rangeMinMax.min + "-" + rangeMinMax.max + " keV in " + this._barSelectedCount + " ranges)";

    let description = "Diffraction peaks in ranges: " + rangeText;
    if (!isBeingSaved) {
      description = `UNSAVED: ${description}.\n\nClick 'Save as Expression Map' from the Diffraction tab to save this selection as an expression map.`;
    }

    return { title, expression: expr, description };
  }

  private getBarIdx(keV: number) {
    return Math.floor(keV / DiffractionHistogramModel.keVBinWidth);
  }

  iskeVRangeSelected(keVMidpoint: number): boolean {
    // // check flags
    let idx = this.getBarIdx(keVMidpoint);
    if (idx < this._barSelected.length) {
      return this._barSelected[idx];
    } else if (this._barSelected.length === 0) {
      return true;
    }

    return false;
  }

  selectedRangeCount(): number {
    return this._barSelectedCount;
  }
}
