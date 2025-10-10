import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ROIItem } from 'src/app/generated-protos/roi';
import { BeamSelection } from 'src/app/modules/pixlisecore/models/beam-selection';
import { PixelSelection } from 'src/app/modules/pixlisecore/models/pixel-selection';
import { AnalysisLayoutService, SelectionService, SnackbarService } from 'src/app/modules/pixlisecore/pixlisecore.module';
import { UserOptionsService } from 'src/app/modules/settings/settings.module';
import { ROIService } from '../../services/roi.service';
import { ActionButtonComponent } from 'src/app/modules/pixlisecore/components/atoms/buttons/action-button/action-button.component';
import { PredefinedROIID } from 'src/app/models/RegionOfInterest';
import { ObjectType } from 'src/app/generated-protos/ownership-access';
import { COLOUR_MAP, ColourOption, findColourOption, generateDefaultColour } from '../../models/roi-colors';
import { ROIShape, DEFAULT_ROI_SHAPE } from '../roi-shape/roi-shape.component';
import { RGBA } from 'src/app/utils/colours';
import { ROIDisplaySettings } from '../../models/roi-region';
import { Subscription } from 'rxjs';

@Component({
  selector: 'roi-item-details',
  standalone: false,
  templateUrl: './roi-item-details.component.html',
  styleUrl: './roi-item-details.component.scss'
})
export class ROIItemDetails {
  private _subs = new Subscription();

  @Input() roiId: string = "";
  @Input() displaySettings?: ROIDisplaySettings;

  @Output() closeROIDetails = new EventEmitter();
  
  singleSelectedPMC = -1;
  hoverIndex = -1;

  objectType: ObjectType = ObjectType.OT_ROI;

  @ViewChild(CdkVirtualScrollViewport) pmcViewport!: CdkVirtualScrollViewport;
  @ViewChild("editROIButton") editROIButton!: ElementRef;
  @ViewChild("deleteROIConfirmButton") deleteROIConfirmButton!: ElementRef;

  private _name = "";
  private _description = "";
  private _roi?: ROIItem;

  constructor(
    private _roiService: ROIService,
    //private _analysisLayoutService: AnalysisLayoutService,
    private _selectionService: SelectionService,
    //private _userOptionsService: UserOptionsService,
    private _snackBarService: SnackbarService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (!this.roiId) {
      throw new Error("roiId not set on roi-item-display-settings");
    }

    this._subs.add(
      this._selectionService.selection$.subscribe((sel) => {
        if(this._roi) {
          const selPMCs = sel.beamSelection.getSelectedScanEntryPMCs(this._roi?.scanId);
          if (selPMCs.size == 1) {
            this.singleSelectedPMC = selPMCs.values().next().value || -1;
          } else {
            this.singleSelectedPMC = -1;
          }
        }
      })
    );

    this._subs.add(
      this._roiService.loadROI(this.roiId, true).subscribe(
        (roiItem: ROIItem) => {
          this._roi = roiItem;

          this._subs.add(
            this._selectionService.hoverChangedReplaySubject$.subscribe(() => {
              if (this._selectionService.hoverScanId === this._roi?.scanId) {
                this.hoverIndex = this._selectionService.hoverEntryIdx;
              } else {
                this.hoverIndex = -1;
              }
            })
          );
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  get roi(): ROIItem | undefined {
    return this._roi;
  }
  
  get name(): string {
    return this._name || this._roi?.name || "Unnamed";
  }

  set name(value: string) {
    this._name = value;
  }

  get description(): string {
    return this._description || this._roi?.description || "";
  }

  set description(value: string) {
    this._description = value;
  }

  onKeyboardArrow(scanId: string, up: boolean, event: Event) {
    event.preventDefault();

    // See what the next or previous PMC is to select
    if (this.singleSelectedPMC == -1) {
      console.log("Selection is not a single PMC, ignoring arrow key on roi pmc list");
      return;
    }

    if (!this._roi) {
      console.log("onKeyboardArrow ignored: Not showing ROI details now");
      return;
    }

    // Find the PMC in the ROIs list, and walk up or down the list there
    const pmcs = this._roi.scanEntryIndexesEncoded;
    const idx = pmcs.indexOf(this.singleSelectedPMC);
    if (idx == -1) {
      console.log(`Selected PMC: ${this.singleSelectedPMC} is not a member of ROI ${this.roiId}, ignoring arrow key on roi pmc list`);
      return;
    }

    let toSelIdx = up ? idx - 1 : idx + 1;
    if (toSelIdx >= 0 && toSelIdx < pmcs.length) {
      // Select it!
      const newSelectedPMC = pmcs[toSelIdx];
      let pmcSelection = new Map<string, Set<number>>();
      pmcSelection.set(scanId, new Set([newSelectedPMC]));
      this._selectionService.setSelection(new BeamSelection(pmcSelection), PixelSelection.makeEmptySelection());

      // If it's off-screen at top or bottom, keep it visible
      const range = this.pmcViewport.getRenderedRange();
      const offset = 7;
      if (toSelIdx < (range.start+offset)) {
        this.pmcViewport.scrollToIndex(toSelIdx);
      } else if(toSelIdx > (range.end-offset)) {
        this.pmcViewport.scrollToIndex(toSelIdx);
      }

      // In case the round trip is too slow, we save the new PMC here
      this.singleSelectedPMC = newSelectedPMC;
    } else {
      console.log(`Current index ${toSelIdx} is outside ROI list range, ignoring arrow key`);
      //this.singleSelectedPMC = -1;
    }

    //event.preventDefault();
  }

  get canEditROIDetails(): boolean {
    return this._roi?.owner?.canEdit || false;
  }

  onBreakROIApart(roiId: string): void {
    this._roiService.breakROI(roiId);
  }

  onDeleteScanPMC(scanPMC: number) {
    if (!this._roi) {
      this._snackBarService.openError(`ROI ${this.name} (${this.roiId}) not found`);
      return;
    }

    let newROI = this._roi;
    newROI.scanEntryIndexesEncoded = newROI.scanEntryIndexesEncoded.filter(idx => idx !== scanPMC);

    // We don't need to update summaries for changes to scan entry points
    this._roiService.editROI(newROI, false);
  }

  onScanEntryIdxEnter(scanId: string, scanEntryIdx: number) {
    this._selectionService.setHoverEntryIndex(scanId, scanEntryIdx);
  }

  onScanEntryIdxLeave(scanId: string) {
    this._selectionService.clearHoverEntry();
  }

  onScanEntryIdxClick(scanId: string, scanEntryIdx: number) {
    let pmcSelection = new Map<string, Set<number>>();
    pmcSelection.set(scanId, new Set([scanEntryIdx]));
    this._selectionService.setSelection(new BeamSelection(pmcSelection), PixelSelection.makeEmptySelection());
  }

  onSaveSelectionToROI(): void {
    let currentSelection = this._selectionService.getCurrentSelection();
    let scanIds = currentSelection.beamSelection.getScanIds();

    let currentROIScanId = this._roi?.scanId || "";

    if (currentROIScanId && !scanIds.includes(currentROIScanId)) {
      this._snackBarService.openError("Cannot save selection to ROI. Selection is from a different scan.");
      return;
    }

    let pmcSelection = currentSelection.beamSelection.getSelectedScanEntryPMCs(currentROIScanId);
    let pixelSelection = currentSelection.pixelSelection;

    if (pmcSelection.size <= 0 && pixelSelection.selectedPixels.size <= 0) {
      this._snackBarService.openError("Cannot save an empty ROI. Please select something!");
      return;
    }

    if (!this._roi) {
      this._snackBarService.openError("Cannot save selection to ROI. ROI not found.");
      return;
    }

    this._roi.scanEntryIndexesEncoded = Array.from(pmcSelection);
    this._roi.pixelIndexesEncoded = Array.from(pixelSelection.selectedPixels);
    this._roi.imageName = pixelSelection.imageName;

    this._roiService.writeROI(this._roi, false, false);
  }

  onAddRGBUPixelsToROI(): void {
    let currentSelection = this._selectionService.getCurrentSelection();
    let scanIds = currentSelection.beamSelection.getScanIds();

    let currentROIScanId = this._roi?.scanId || "";

    if (currentROIScanId && !scanIds.includes(currentROIScanId)) {
      this._snackBarService.openError("Cannot save selection to ROI. Selection is from a different scan.");
      return;
    }

    let pmcSelection = currentSelection.beamSelection.getSelectedScanEntryPMCs(currentROIScanId);
    let pixelSelection = currentSelection.pixelSelection;

    if (pmcSelection.size <= 0 && pixelSelection.selectedPixels.size <= 0) {
      this._snackBarService.openError("Cannot save an empty ROI. Please select something!");
      return;
    }

    if (!this._roi) {
      this._snackBarService.openError("Cannot save selection to ROI. ROI not found.");
      return;
    }

    // this._selectionService.selectRGBUPixels();

    let joinedPixels = new Set<number>(this._roi.pixelIndexesEncoded);
    pixelSelection.selectedPixels.forEach(pixel => {
      joinedPixels.add(pixel);
    });

    this._roi.pixelIndexesEncoded = Array.from(joinedPixels);
    this._roi.imageName = pixelSelection.imageName;

    this._roiService.writeROI(this._roi, false, false);
  }

  onSelect(): void {
    if (!this._roi) {
      return;
    }

    let pmcSelection = new Map<string, Set<number>>();
    pmcSelection.set(this._roi.scanId, new Set(this._roi.scanEntryIndexesEncoded));

    let pixels = new Set<number>(this._roi.pixelIndexesEncoded);
    let pixelSelection = new PixelSelection(pixels, 0, 0, this._roi.imageName);

    this._selectionService.setSelection(new BeamSelection(pmcSelection), pixelSelection);
  }

  get scanEntryCount(): number {
    return this._roi?.scanEntryIndexesEncoded?.length || 0;
  }

  get pixelCount(): number {
    return this._roi?.pixelIndexesEncoded?.length || 0;
  }

  onCancelEdit() {
    this.closeEditROIMenu();
  }

  onSaveEdit() {
    if (!this._roi) {
      //this._snackBarService.openError(`ROI ${this.name} (${this.summary?.id}) not found`);
      return;
    }

    let newROI = this._roi;
    newROI.name = this.name;
    newROI.description = this.description;

    this._roiService.editROI(newROI);
    this.closeEditROIMenu();
  }

  private closeEditROIMenu(): void {
    if (this.editROIButton && this.editROIButton instanceof ActionButtonComponent) {
      (this.editROIButton as ActionButtonComponent).closeDialog();

      this.name = "";
      this.description = "";
    }
  }

  onCloseDelete() {
    if (this.deleteROIConfirmButton && this.deleteROIConfirmButton instanceof ActionButtonComponent) {
      (this.deleteROIConfirmButton as ActionButtonComponent).closeDialog();
    }
  }

  onConfirmDelete(deleteAll: boolean) {
    if (!this._roi) {
      return;
    }

    this._roiService.deleteROI(deleteAll ? this._roi.associatedROIId : this._roi.id, false, deleteAll);
    //this.closeSettingsMenu();

    this.onCloseDelete();
  }

  onShare() {
    //this.closeSettingsMenu();
  }

  onTagSelectionChanged(tagIDs: string[]) {
    if(!this._roi) {
      return;
    }
 
    this.selectedTagIDs = tagIDs;
    this._roiService.editROISummary(this._roi);
  }

  get selectedTagIDs(): string[] {
    return this._roi?.tags || [];
  }

  set selectedTagIDs(value: string[]) {
    if(this._roi) {
      this._roi.tags = value;
    }
  }

  onCloseROIDetails() {
    this.closeROIDetails.emit();
  }
}
