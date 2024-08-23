import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription, combineLatest, map } from "rxjs";
import { ContextImageDataService, ContextImageItem, ContextImageModelLoadedData } from "src/app/modules/image-viewers/image-viewers.module";
import { BeamSelection } from "src/app/modules/pixlisecore/models/beam-selection";
import { SelectionService } from "src/app/modules/pixlisecore/pixlisecore.module";
import { ROIService } from "src/app/modules/roi/services/roi.service";
import { AverageRGBURatio, SelectionTabModel } from "./model";
import { SelectionHistoryItem } from "src/app/modules/pixlisecore/services/selection.service";
import { AnalysisLayoutService } from "src/app/modules/analysis/analysis.module";
import { APICachedDataService } from "src/app/modules/pixlisecore/services/apicacheddata.service";
import { ScanListReq, ScanListResp } from "src/app/generated-protos/scan-msgs";
import { APIEndpointsService } from "src/app/modules/pixlisecore/services/apiendpoints.service";
import { RGBUImage } from "src/app/models/RGBUImage";
import { ImageListReq, ImageListResp } from "src/app/generated-protos/image-msgs";
import { ScanImagePurpose, ScanImageSource } from "src/app/generated-protos/image";
import { getPathBase, SDSFields } from "src/app/utils/utils";
import { UserOptionsService } from "src/app/modules/settings/settings.module";

const emptySelectionDescription = "Empty";

class DisplayPMC {
  constructor(
    public scanId: string,
    public pmc: number
  ) {}
}

@Component({
  selector: "app-selection",
  templateUrl: "./selection.component.html",
  styleUrls: ["./selection.component.scss"],
})
export class SelectionComponent implements OnInit, OnDestroy {
  private _subs = new Subscription();

  private _selectedPMCs: Map<string, number[]> = new Map<string, number[]>();
  private _displayPMCs: DisplayPMC[] = [];

  private _summary: string = emptySelectionDescription;
  private _averageRGBURatios: AverageRGBURatio[] = [];
  hoverPMC: number = -1;
  hoverScanId: string = "";
  expandedIndices: number[] = [0, 1];
  subDataSetIDs: string[] = [];
  hasEditAccess: boolean = false;

  constructor(
    private _analysisLayoutService: AnalysisLayoutService,
    private _cacheDataService: APICachedDataService,
    protected _endpointsService: APIEndpointsService,
    private _userOptionsService: UserOptionsService,
    private _selectionService: SelectionService,
    private _contextImageDataService: ContextImageDataService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this._subs.add(
      this._selectionService.selection$.subscribe((selection: SelectionHistoryItem) => {
        this._selectedPMCs.clear();
        this._averageRGBURatios = [];
        for (const scanId of selection.beamSelection.getScanIds()) {
          this._selectedPMCs.set(
            scanId,
            Array.from(selection.beamSelection.getSelectedScanEntryPMCs(scanId)).sort((pmc1: number, pmc2: number) => {
              if (pmc1 == pmc2) {
                return 0;
              }
              return pmc2 < pmc1 ? 1 : -1;
            })
          );
        }

        // Now that we have them sorted, save them in the display list
        this._displayPMCs = [];
        for (const [scanId, pmcs] of this._selectedPMCs) {
          // Insert a title
          this._displayPMCs.push(new DisplayPMC(scanId, -1));

          for (const pmc of pmcs) {
            // Insert PMCs
            this._displayPMCs.push(new DisplayPMC(scanId, pmc));
          }
        }

        // Now we can update our summary text
        this.updateSummary(selection);
      })
    );

    this._subs.add(
      this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
        this.hoverPMC = this._selectionService.hoverEntryPMC;
        this.hoverScanId = this._selectionService.hoverScanId;
      })
    );

    this._subs.add(
      this._userOptionsService.userOptionsChanged$.subscribe(() => {
        this.hasEditAccess = this._userOptionsService.hasFeatureAccess("editROI");
      })
    );
  }

  ngOnDestroy() {
    this._subs.unsubscribe();
  }

  private updateSummary(selection: SelectionHistoryItem) {
    this._summary = "";

    // Retrieve the normal spectra count of each scan we're dealing with
    const req$ = [];
    for (const scanId of selection.beamSelection.getScanIds()) {
      req$.push(
        this._cacheDataService.getScanList(ScanListReq.create({ searchFilters: { scanId } })).pipe(
          map((resp: ScanListResp) => {
            if (resp.scans && resp.scans.length == 1) {
              return resp.scans[0].contentCounts["NormalSpectra"];
            }
            return 0;
          })
        )
      );
    }

    if (req$.length === 0) {
      this._summary = emptySelectionDescription;
      return;
    }

    combineLatest(req$).subscribe((perScanNormalCount: number[]) => {
      let locationsWithNormalSpectra = 0;
      for (const count of perScanNormalCount) {
        locationsWithNormalSpectra += count;
      }

      const percentSelected = Math.round((selection.beamSelection.getSelectedEntryCount() / locationsWithNormalSpectra) * 10000) / 100;
      this._summary += `${selection.beamSelection.getSelectedEntryCount().toLocaleString()} PMCs (${percentSelected}%)`;

      // Also do some pixel selection calculations
      if (selection.pixelSelection.selectedPixels.size > 0) {
        if (this._summary.length > 0) {
          this._summary += ",\n";
        }
        this._summary += selection.pixelSelection.selectedPixels.size.toLocaleString() + " pixels";
      }
      if (this.summary.length <= 0) {
        this._summary = emptySelectionDescription;
      }
    });

    // If there are pixels selected, respond to those too
    if (selection.pixelSelection.imageName) {
      this._endpointsService.loadRGBUImageTIF(selection.pixelSelection.imageName).subscribe((img: RGBUImage) => {
        this._averageRGBURatios = SelectionTabModel.calculateAverageRGBURatios(selection, img);
      });
    }
  }

  get beamSelection(): BeamSelection {
    return this._selectionService.getCurrentSelection().beamSelection;
  }

  get summary(): string {
    return this._summary;
  }

  get displaySelectedPMCs(): DisplayPMC[] {
    return this._displayPMCs;
  }

  get averageRGBURatios(): AverageRGBURatio[] {
    return this._averageRGBURatios;
  }

  onToggleExpand(index: number) {
    if (this.expandedIndices.includes(index)) {
      this.expandedIndices = this.expandedIndices.filter(i => i !== index);
    } else {
      this.expandedIndices.push(index);
    }
  }

  onSelectAll(): void {
    this._selectionService.selectAllPMCs(this.getSelectionScanIds());
  }

  onUndo() {
    if (!this._selectionService.undoSelection()) {
      alert("Nothing to undo");
    }
  }

  onRedo() {
    if (!this._selectionService.redoSelection()) {
      alert("Nothing to redo");
    }
  }

  onPMCEnter(item: DisplayPMC) {
    // Show this PMC as the "hovered" one, which will highlight it in views
    this._selectionService.setHoverEntryPMC(item.scanId, item.pmc);
  }

  onPMCLeave(item: DisplayPMC) {
    this._selectionService.setHoverEntryPMC(item.scanId, item.pmc);
  }

  onClearSelection() {
    const allScanIds = [];
    for (const scan of Object.values(this._analysisLayoutService.activeScreenConfiguration$.value.scanConfigurations)) {
      allScanIds.push(scan.id);
    }
    this._selectionService.clearSelection(allScanIds);
    this._averageRGBURatios = [];
  }

  onNewROI() {
    this._selectionService.newROIFromSelection();
  }

  onAddNearbyPixels() {
    const allScanIds = [];
    for (const scan of Object.values(this._analysisLayoutService.activeScreenConfiguration$.value.scanConfigurations)) {
      allScanIds.push(scan.id);
    }

    this._selectionService.selectNearbyPixels(allScanIds, this._contextImageDataService);
  }

  onEnterSelection(): void {
    this._selectionService.selectUserSpecifiedPMCs();
  }

  onUnselectPMC(item: DisplayPMC) {
    this._selectionService.unselectPMC(item.scanId, item.pmc);
  }

  onSelectDwellPMCs(): void {
    this._selectionService.selectDwellPMCs(this.getSelectionScanIds());
  }

  get canUndo(): boolean {
    return this._selectionService.canUndo();
  }

  get canRedo(): boolean {
    return this._selectionService.canRedo();
  }

  onDriftCorrection(): void {
    alert("Not implemented yet");
  }

  onSelectForSubDataset(id: string): void {
    this._selectionService.selectAllPMCs([id]);
  }
/*
  private getRGBUContextImageItemShowing(): ContextImageItem | null {
    // Make sure there's a valid context image before proceeding
    if (!this._contextImageService || !this._contextImageService.mdl || !this._contextImageService.mdl.contextImageItemShowing) {
      return null;
    }

    let contextImage = this._contextImageService.mdl.contextImageItemShowing;

    // Verify there's a valid RGBU Source Image
    if (!contextImage.rgbuSourceImage || contextImage.rgbuSourceImage.r.values.length <= 0) {
      return null;
    }

    return contextImage;
  }*/

  private getSelectionScanIds(): string[] {
    const sel = this._selectionService.getCurrentSelection().beamSelection;
    let selScanIds = sel.getScanIds();
    if (selScanIds.length == 0) {
      selScanIds = [this._analysisLayoutService.defaultScanId];
    }
    return selScanIds;
  }
}
